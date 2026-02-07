import { Router } from "express";
import { Pool } from "pg";
import { callOpenRouter, DEFAULT_LLM_MODEL, LLMMessage } from "../config/openrouter";
import { buildAISystemPrompt, DEFAULT_AI_SETTINGS } from "../logic/aiSettings";
import {
  storeChatMessage,
  getChatHistory,
  getChatHistoryForDisplay,
} from "../logic/chatHistory";
import {
  buildInsightPrompt,
  parseInsights,
  type CategoryData,
  type SpendingPattern,
} from "../logic/aiInsights";

const router = Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * POST /api/v1/ai/chat
 * Send a message to the AI assistant with user's personality settings
 * 
 * Request body:
 * {
 *   "user_id": 123,
 *   "message": "Should I reduce my dining spending?",
 *   "month": "2026-02" (optional, defaults to current month)
 * }
 * 
 * Response:
 * {
 *   "message": "Based on your budget...",
 *   "tokens_used": 150
 * }
 */
router.post("/chat", async (req, res) => {
  const { user_id, message, month } = req.body;

  if (!user_id || !message) {
    return res.status(400).json({
      error: "Missing required fields: user_id, message",
    });
  }

  if (typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({
      error: "Message must be a non-empty string",
    });
  }

  const client = await pool.connect();

  try {
    // 1. Fetch user settings including AI personality preferences
    const settingsRes = await client.query(
      `SELECT timezone, currency_code,
              ai_personalities, ai_frugal_score, ai_advice_score,
              include_pending_in_insights, status_on_track_max, status_tight_max
       FROM user_settings
       WHERE user_id = $1`,
      [user_id]
    );

    const settings = settingsRes.rows[0] ?? {
      timezone: "America/New_York",
      currency_code: "USD",
      ai_personalities: DEFAULT_AI_SETTINGS.personalities,
      ai_frugal_score: DEFAULT_AI_SETTINGS.frugalScore,
      ai_advice_score: DEFAULT_AI_SETTINGS.adviceScore,
      include_pending_in_insights: false,
      status_on_track_max: 0.85,
      status_tight_max: 1.0,
    };

    // Parse ai_personalities if it's a string
    const personalities = typeof settings.ai_personalities === "string"
      ? JSON.parse(settings.ai_personalities)
      : Array.isArray(settings.ai_personalities)
      ? settings.ai_personalities
      : DEFAULT_AI_SETTINGS.personalities;

    // 2. Determine month bounds for budget context
    let periodStart: string;
    let periodEnd: string;

    if (month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      const [y, m] = month.split("-").map(Number);
      periodStart = `${month}-01`;
      periodEnd = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
    } else {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      periodStart = `${y}-${String(m).padStart(2, "0")}-01`;
      periodEnd = `${y}-${String(m).padStart(2, "0")}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
    }

    // 3. Fetch budget and spending context for this month
    const budgetRes = await client.query(
      `SELECT b.id AS budget_id, b.total_budget_amount, b.period_start
       FROM budgets b
       WHERE b.user_id = $1 AND b.period_start = $2::date`,
      [user_id, periodStart]
    );

    let contextInfo = `User's timezone: ${settings.timezone}, Currency: ${settings.currency_code}\n`;

    if (budgetRes.rowCount === 0) {
      contextInfo += `No budget exists for ${month || periodStart}.`;
    } else {
      const budget = budgetRes.rows[0];
      const budget_id = budget.budget_id;

      // Fetch budget lines and category spending
      const linesRes = await client.query(
        `SELECT bl.category_id, bl.planned_amount, c.name AS category_name
         FROM budget_lines bl
         JOIN categories c ON c.id = bl.category_id
         WHERE bl.budget_id = $1
         ORDER BY c.name`,
        [budget_id]
      );

      const pendingClause = settings.include_pending_in_insights
        ? ""
        : "AND t.pending = FALSE";

      const spentRes = await client.query(
        `SELECT tc.category_id, SUM(t.amount) AS spent
         FROM transactions t
         JOIN transaction_categories tc ON tc.transaction_id = t.id
         WHERE t.user_id = $1
           AND t.transaction_date >= $2::date
           AND t.transaction_date <= $3::date
           AND t.direction = 'debit'
           ${pendingClause}
         GROUP BY tc.category_id`,
        [user_id, periodStart, periodEnd]
      );

      const spentMap = new Map<number, number>();
      for (const row of spentRes.rows) {
        spentMap.set(row.category_id, Number(row.spent));
      }

      // Build context
      contextInfo += `\nBudget for ${month}: $${budget.total_budget_amount ?? 0}\n\nCategory Breakdown:\n`;
      let totalSpent = 0;

      for (const line of linesRes.rows) {
        const planned = Number(line.planned_amount);
        const spent = spentMap.get(line.category_id) ?? 0;
        const remaining = Math.max(0, planned - spent);
        const percentUsed = planned === 0 ? 0 : ((spent / planned) * 100).toFixed(1);

        contextInfo += `- ${line.category_name}: $${spent.toFixed(2)} spent of $${planned.toFixed(2)} planned (${percentUsed}%)\n`;
        totalSpent += spent;
      }

      contextInfo += `\nTotal spent: $${totalSpent.toFixed(2)} of $${budget.total_budget_amount ?? 0}`;
    }

    // 4. Fetch chat history (last 10 messages) for context
    const chatHistory = await getChatHistory(client, user_id, 10);

    // 5. Build the system prompt with personality settings
    const aiSettings = {
      personalities,
      frugalScore: settings.ai_frugal_score,
      adviceScore: settings.ai_advice_score,
    };

    const systemPrompt = buildAISystemPrompt(aiSettings);
    const contextPrompt = `\nCURRENT FINANCIAL CONTEXT:\n${contextInfo}`;

    // 6. Build messages array with history
    const messages: LLMMessage[] = [
      {
        role: "system",
        content: systemPrompt + contextPrompt,
      },
      // Add conversation history
      ...chatHistory.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      // Add current user message
      {
        role: "user",
        content: message,
      },
    ];

    // 7. Store user message in database
    await storeChatMessage(client, user_id, "user", message);

    // 8. Call the LLM
    const response = await callOpenRouter({
      model: DEFAULT_LLM_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 300,
      top_p: 0.9,
    });

    // 9. Store AI response in database
    await storeChatMessage(client, user_id, "assistant", response);

    res.json({
      message: response,
      tokens_used: null, // Can be enhanced to return actual token usage from OpenRouter
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error in AI chat:", message);
    res.status(500).json({ error: "Failed to process chat message" });
  } finally {
    client.release();
  }
});

/**
 * GET /api/v1/ai/history/:user_id
 * Retrieve chat history for a user
 * 
 * Query parameters:
 * - limit: number of messages to retrieve (default: 50, max: 100)
 * 
 * Response:
 * [
 *   { id: 1, user_id: 123, role: "user", content: "...", created_at: "2026-02-07T10:00:00Z" },
 *   { id: 2, user_id: 123, role: "assistant", content: "...", created_at: "2026-02-07T10:00:05Z" },
 *   ...
 * ]
 */
router.get("/history/:user_id", async (req, res) => {
  const { user_id } = req.params;
  let limit = parseInt(req.query.limit as string) || 50;

  // Cap the limit for performance
  if (limit > 100) limit = 100;
  if (limit < 1) limit = 1;

  const client = await pool.connect();

  try {
    const history = await getChatHistoryForDisplay(client, parseInt(user_id), limit);
    res.json(history);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error fetching chat history:", message);
    res.status(500).json({ error: "Failed to fetch chat history" });
  } finally {
    client.release();
  }
});

/**
 * POST /api/v1/ai/insights
 * Generate AI-powered insights based on budget and spending data
 * 
 * Request body:
 * {
 *   "user_id": 123,
 *   "month": "2026-02" (optional, defaults to current month)
 * }
 * 
 * Response:
 * [
 *   {
 *     "kind": "alert" | "positive",
 *     "title": "You're spending 15% faster than usual this month",
 *     "body": "At this pace, you'll exceed your budget",
 *     "action": "Action: pause discretionary spending for 3 days"
 *   },
 *   ...
 * ]
 */
router.post("/insights", async (req, res) => {
  const { user_id, month } = req.body;

  if (!user_id) {
    return res.status(400).json({
      error: "Missing required field: user_id",
    });
  }

  const client = await pool.connect();

  try {
    // 1. Determine month bounds
    let periodStart: string;
    let periodEnd: string;

    if (month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      const [y, m] = month.split("-").map(Number);
      periodStart = `${month}-01`;
      periodEnd = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
    } else {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      periodStart = `${y}-${String(m).padStart(2, "0")}-01`;
      periodEnd = `${y}-${String(m).padStart(2, "0")}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
    }

    // 2. Fetch current month's budget and spending
    const budgetRes = await client.query(
      `SELECT b.id AS budget_id, b.total_budget_amount
       FROM budgets b
       WHERE b.user_id = $1 AND b.period_start = $2::date`,
      [user_id, periodStart]
    );

    if (budgetRes.rowCount === 0) {
      return res.json([]);
    }

    const budget = budgetRes.rows[0];
    const budget_id = budget.budget_id;
    const totalBudget = Number(budget.total_budget_amount) || 0;

    // 3. Fetch budget lines and current spending
    const linesRes = await client.query(
      `SELECT bl.category_id, bl.planned_amount, c.name AS category_name
       FROM budget_lines bl
       JOIN categories c ON c.id = bl.category_id
       WHERE bl.budget_id = $1
       ORDER BY bl.planned_amount DESC`,
      [budget_id]
    );

    const spentRes = await client.query(
      `SELECT tc.category_id, SUM(t.amount) AS spent
       FROM transactions t
       JOIN transaction_categories tc ON tc.transaction_id = t.id
       WHERE t.user_id = $1
         AND t.transaction_date >= $2::date
         AND t.transaction_date <= $3::date
         AND t.direction = 'debit'
         AND t.pending = FALSE
       GROUP BY tc.category_id`,
      [user_id, periodStart, periodEnd]
    );

    const spentMap = new Map<number, number>();
    let totalSpent = 0;
    for (const row of spentRes.rows) {
      const spent = Number(row.spent);
      spentMap.set(row.category_id, spent);
      totalSpent += spent;
    }

    // 4. Build category data for insight generation
    const categories: CategoryData[] = linesRes.rows.map((line) => {
      const planned = Number(line.planned_amount);
      const spent = spentMap.get(line.category_id) ?? 0;
      return {
        name: line.category_name,
        spent,
        planned,
        percentUsed: planned === 0 ? 0 : (spent / planned) * 100,
        isOver: spent > planned,
      };
    });

    const topCategory = categories.length > 0 ? categories[0] : null;

    // 5. Fetch previous month data for comparison
    const prevMonthStart = new Date(periodStart);
    prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
    const prevPeriodStart = `${prevMonthStart.getFullYear()}-${String(prevMonthStart.getMonth() + 1).padStart(2, "0")}-01`;
    const prevPeriodEnd = `${prevMonthStart.getFullYear()}-${String(prevMonthStart.getMonth() + 1).padStart(2, "0")}-${String(new Date(prevMonthStart.getFullYear(), prevMonthStart.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;

    const prevSpentRes = await client.query(
      `SELECT COALESCE(SUM(t.amount), 0) AS total
       FROM transactions t
       WHERE t.user_id = $1
         AND t.transaction_date >= $2::date
         AND t.transaction_date <= $3::date
         AND t.direction = 'debit'
         AND t.pending = FALSE`,
      [user_id, prevPeriodStart, prevPeriodEnd]
    );

    const prevMonthSpent = Number(prevSpentRes.rows[0]?.total) || 0;
    const compareToLastMonthPct = prevMonthSpent === 0 ? 0 : ((totalSpent - prevMonthSpent) / prevMonthSpent) * 100;

    // 6. Fetch 3-month average for trend comparison
    const avgSpentRes = await client.query(
      `SELECT AVG(monthly_spent) as avg_spent
       FROM (
         SELECT DATE_TRUNC('month', t.transaction_date) as month, SUM(t.amount) as monthly_spent
         FROM transactions t
         WHERE t.user_id = $1
           AND t.direction = 'debit'
           AND t.pending = FALSE
           AND t.transaction_date >= NOW() - INTERVAL '3 months'
         GROUP BY DATE_TRUNC('month', t.transaction_date)
       ) monthly_totals`,
      [user_id]
    );

    const avgMonthSpent = Number(avgSpentRes.rows[0]?.avg_spent) || 0;
    const compareToAveragePct = avgMonthSpent === 0 ? 0 : ((totalSpent - avgMonthSpent) / avgMonthSpent) * 100;

    // 7. Calculate spending pace delta
    const daysElapsed = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const dailyRate = totalSpent / daysElapsed;
    const averageDailyRate = totalBudget / daysInMonth;
    const paceDeltaPct = averageDailyRate === 0 ? 0 : ((dailyRate - averageDailyRate) / averageDailyRate) * 100;

    // 8. Build spending pattern for insight generation
    const spendingPattern: SpendingPattern = {
      spent: totalSpent,
      budget: totalBudget,
      remaining: Math.max(0, totalBudget - totalSpent),
      percentUsed: totalBudget === 0 ? 0 : (totalSpent / totalBudget) * 100,
      compareToLastMonthPct,
      compareToAveragePct,
      paceDeltaPct,
    };

    // 9. Build insight prompt and call LLM
    const insightPrompt = buildInsightPrompt(
      month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
      spendingPattern,
      topCategory || null,
      categories
    );

    const response = await callOpenRouter({
      model: DEFAULT_LLM_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a financial insights generator. Generate exactly 4 specific, actionable insights based on the provided budget data. Return ONLY valid JSON, no other text.",
        },
        {
          role: "user",
          content: insightPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 800,
      top_p: 0.9,
    });

    // 10. Parse and return insights
    const insights = parseInsights(response);
    res.json(insights.length > 0 ? insights : []);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error generating insights:", message);
    res.status(500).json({ error: "Failed to generate insights" });
  } finally {
    client.release();
  }
});

export default router;
