import { Router } from "express";
import { Pool } from "pg";
import { parseMonthToBounds, validateBudgetLines, getBudgetLineStatus } from "../logic/budgets";

const router = Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// --------------------
// 0. Get available months for selector
// --------------------
router.get("/months/:user_id", async (req, res) => {
  const { user_id } = req.params;

  try {
    const monthsRes = await pool.query(
      `SELECT DISTINCT TO_CHAR(period_start, 'YYYY-MM') as month
       FROM budgets
       WHERE user_id = $1
       ORDER BY month DESC`,
      [user_id]
    );

    const months = monthsRes.rows.map((row) => row.month);
    const defaultMonth = months[0] || null;

    res.json({
      months,
      defaultMonth,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error fetching months:", message);
    res.status(500).json({ error: "Failed to fetch months" });
  }
});

// --------------------
// 0b. Ensure current month budget exists (create if missing)
// --------------------
router.post("/ensure", async (req, res) => {
  const { month, user_id } = req.body;

  if (!month || !user_id) {
    return res.status(400).json({
      error: "Missing required fields: month (YYYY-MM) and user_id",
    });
  }

  // Validate month format
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({
      error: "Invalid month format. Use YYYY-MM",
    });
  }

  const { period_start, period_end } = parseMonthToBounds(month);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check if budget exists for this month
    const existingRes = await client.query(
      `SELECT id FROM budgets WHERE user_id = $1 AND period_start = $2::date`,
      [user_id, period_start]
    );

    if (existingRes.rowCount && existingRes.rowCount > 0) {
      await client.query("COMMIT");
      return res.json({
        message: "Budget already exists for this month",
        budget_id: existingRes.rows[0].id,
      });
    }

    // Create budget header with zero total
    const budgetRes = await client.query(
      `INSERT INTO budgets (user_id, period_start, period_end, total_budget_amount)
       VALUES ($1, $2::date, $3::date, 0)
       RETURNING id, user_id, period_start, period_end, total_budget_amount, created_at`,
      [user_id, period_start, period_end]
    );

    const budget = budgetRes.rows[0];
    const budget_id = budget.id;

    // Fetch all parent categories and create empty lines
    const categoriesRes = await client.query(
      `SELECT id FROM categories WHERE parent_id IS NULL ORDER BY id`
    );

    for (const cat of categoriesRes.rows) {
      await client.query(
        `INSERT INTO budget_lines (budget_id, category_id, planned_amount)
         VALUES ($1, $2, 0)`,
        [budget_id, cat.id]
      );
    }

    await client.query("COMMIT");
    res.status(201).json({
      message: "Budget created for this month",
      budget_id: budget.id,
      ...budget,
    });
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error ensuring budget:", message);
    res.status(500).json({ error: "Failed to ensure budget" });
  } finally {
    client.release();
  }
});

// --------------------
// 1. Get all budgets for a user (with lines, category names, spending, and status)
// --------------------
router.get("/:user_id", async (req, res) => {
  const { user_id } = req.params;

  try {
    // Fetch user settings for status thresholds
    const settingsRes = await pool.query(
      `SELECT status_on_track_max, status_tight_max, include_pending_in_insights
       FROM user_settings
       WHERE user_id = $1`,
      [user_id]
    );

    const settings = settingsRes.rows[0] ?? {
      status_on_track_max: 0.85,
      status_tight_max: 1.0,
      include_pending_in_insights: false,
    };

    const budgetsRes = await pool.query(
      `SELECT id, user_id, period_start, period_end, total_budget_amount, created_at
       FROM budgets
       WHERE user_id = $1
       ORDER BY period_start DESC`,
      [user_id]
    );

    const budgets = budgetsRes.rows;

    const withLines = await Promise.all(
      budgets.map(async (b) => {
        const linesRes = await pool.query(
          `SELECT bl.id, bl.category_id, bl.planned_amount, c.name AS category_name, c.parent_id
           FROM budget_lines bl
           JOIN categories c ON c.id = bl.category_id
           WHERE bl.budget_id = $1`,
          [b.id]
        );

        // Fetch spending per category for this budget period
        const pendingClause = settings.include_pending_in_insights
          ? ""
          : "AND t.pending = FALSE";

        const spentRes = await pool.query(
          `SELECT tc.category_id, SUM(t.amount) AS spent
           FROM transactions t
           JOIN transaction_categories tc ON tc.transaction_id = t.id
           WHERE t.user_id = $1
             AND t.transaction_date >= $2::date
             AND t.transaction_date <= $3::date
             AND t.direction = 'debit'
             ${pendingClause}
           GROUP BY tc.category_id`,
          [user_id, b.period_start, b.period_end]
        );

        const spentMap = new Map<number, number>();
        for (const row of spentRes.rows) {
          spentMap.set(row.category_id, Number(row.spent));
        }

        // Enrich lines with spending and status
        const enrichedLines = linesRes.rows.map((line) => {
          const spent = spentMap.get(line.category_id) ?? 0;
          const planned = Number(line.planned_amount);
          const status = getBudgetLineStatus(
            spent,
            planned,
            settings.status_on_track_max,
            settings.status_tight_max
          );
          return {
            ...line,
            spent,
            status,
          };
        });

        return { ...b, lines: enrichedLines };
      })
    );

    res.json(withLines);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error fetching budgets:", message);
    res.status(500).json({ error: "Failed to fetch budgets" });
  }
});

// --------------------
// 2. Create a budget (header + lines)
// --------------------
router.post("/", async (req, res) => {
  const { user_id, period_start, period_end, total_budget_amount, lines } = req.body;

  if (!user_id || !period_start || !period_end) {
    return res.status(400).json({
      error: "Missing required fields: user_id, period_start, period_end (YYYY-MM-DD).",
    });
  }

  if (!validateBudgetLines(lines)) {
    return res.status(400).json({
      error: "lines must be an array of { category_id, planned_amount }.",
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const budgetRes = await client.query(
      `INSERT INTO budgets (user_id, period_start, period_end, total_budget_amount)
       VALUES ($1, $2::date, $3::date, $4)
       ON CONFLICT (user_id, period_start) DO UPDATE SET period_end = $3::date, total_budget_amount = $4
       RETURNING id, user_id, period_start, period_end, total_budget_amount, created_at`,
      [user_id, period_start, period_end, total_budget_amount ?? null]
    );
    const budget = budgetRes.rows[0];
    const budget_id = budget.id;

    for (const line of lines as Array<{ category_id: number; planned_amount: number }>) {
      await client.query(
        `INSERT INTO budget_lines (budget_id, category_id, planned_amount)
         VALUES ($1, $2, $3)
         ON CONFLICT (budget_id, category_id) DO UPDATE SET planned_amount = $3`,
        [budget_id, line.category_id, line.planned_amount]
      );
    }

    await client.query("COMMIT");
    res.status(201).json(budget);
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error creating budget:", message);
    res.status(500).json({ error: "Failed to create budget" });
  } finally {
    client.release();
  }
});

// --------------------
// 3. Create or update a single budget line (subcategory plan)
// PUT /api/v1/budgets/:budgetId/lines/:categoryId  body: { "plannedAmount": 700 }
// --------------------
router.put("/:budgetId/lines/:categoryId", async (req, res) => {
  const { budgetId, categoryId } = req.params;
  const { plannedAmount } = req.body;

  if (plannedAmount === undefined || plannedAmount === null) {
    return res.status(400).json({ error: "Missing plannedAmount in body" });
  }

  const amount = Number(plannedAmount);
  if (Number.isNaN(amount) || amount < 0) {
    return res.status(400).json({ error: "plannedAmount must be a non-negative number" });
  }

  try {
    const budgetCheck = await pool.query(
      "SELECT id FROM budgets WHERE id = $1",
      [budgetId]
    );
    if (budgetCheck.rowCount === 0) {
      return res.status(404).json({ error: "Budget not found" });
    }

    const result = await pool.query(
      `INSERT INTO budget_lines (budget_id, category_id, planned_amount)
       VALUES ($1, $2, $3)
       ON CONFLICT (budget_id, category_id) DO UPDATE SET planned_amount = $3
       RETURNING id, budget_id, category_id, planned_amount, created_at`,
      [budgetId, categoryId, amount]
    );

    res.json(result.rows[0]);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error upserting budget line:", message);
    res.status(500).json({ error: "Failed to save budget line" });
  }
});

// --------------------
// 4. Update a budget (header and/or replace lines)
// PATCH body: totalBudgetAmount (camelCase) or period_start, period_end, total_budget_amount, lines (snake_case)
// --------------------
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    period_start,
    period_end,
    total_budget_amount,
    totalBudgetAmount,
    lines,
  } = req.body;

  const totalAmount =
    total_budget_amount !== undefined ? total_budget_amount : totalBudgetAmount;

  if (!period_start && !period_end && totalAmount === undefined && !lines) {
    return res.status(400).json({ error: "No fields to update" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (period_start || period_end || totalAmount !== undefined) {
      const updates: string[] = [];
      const values: unknown[] = [];
      let idx = 1;
      if (period_start) {
        updates.push(`period_start = $${idx++}::date`);
        values.push(period_start);
      }
      if (period_end) {
        updates.push(`period_end = $${idx++}::date`);
        values.push(period_end);
      }
      if (totalAmount !== undefined) {
        updates.push(`total_budget_amount = $${idx++}`);
        values.push(totalAmount);
      }
      values.push(id);
      await client.query(
        `UPDATE budgets SET ${updates.join(", ")} WHERE id = $${idx} RETURNING id`,
        values
      );
    }

    if (Array.isArray(lines)) {
      if (!validateBudgetLines(lines)) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "lines must be an array of { category_id, planned_amount }.",
        });
      }
      // Replace lines: delete existing, insert new
      await client.query("DELETE FROM budget_lines WHERE budget_id = $1", [id]);
      for (const line of lines as Array<{ category_id: number; planned_amount: number }>) {
        await client.query(
          `INSERT INTO budget_lines (budget_id, category_id, planned_amount) VALUES ($1, $2, $3)`,
          [id, line.category_id, line.planned_amount]
        );
      }
    }

    await client.query("COMMIT");

    const result = await pool.query(
      "SELECT id, user_id, period_start, period_end, total_budget_amount, created_at FROM budgets WHERE id = $1",
      [id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Budget not found" });
    res.json(result.rows[0]);
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error updating budget:", message);
    res.status(500).json({ error: "Failed to update budget" });
  } finally {
    client.release();
  }
});

// --------------------
// 5. Delete a budget (cascade deletes budget_lines)
// --------------------
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query("DELETE FROM budgets WHERE id = $1 RETURNING id", [id]);

    if (result.rowCount === 0) return res.status(404).json({ error: "Budget not found" });

    res.json({ message: "Budget deleted", id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error deleting budget:", message);
    res.status(500).json({ error: "Failed to delete budget" });
  }
});

export default router;
