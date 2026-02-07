// logic/aiInsights.ts
// Generate AI-powered insights based on budget and spending data

export interface InsightCard {
  kind: "alert" | "positive";
  title: string;
  body: string;
  action: string;
}

export interface SpendingPattern {
  spent: number;
  budget: number;
  remaining: number;
  percentUsed: number;
  compareToLastMonthPct: number;
  compareToAveragePct: number;
  paceDeltaPct: number;
}

export interface CategoryData {
  name: string;
  spent: number;
  planned: number;
  percentUsed: number;
  isOver: boolean;
}

/**
 * Build a prompt for generating insights based on spending data
 */
export function buildInsightPrompt(
  month: string,
  spending: SpendingPattern,
  topCategory: CategoryData | null,
  categories: CategoryData[]
): string {
  const remainingDays = getRemainingDaysInMonth(month);
  const projectedTotal = spending.spent + (spending.spent / getDaysElapsed(month)) * remainingDays;
  const overage = Math.max(0, projectedTotal - spending.budget);

  let prompt = `Generate 4 specific, actionable financial insights based on this budget data for ${month}:\n\n`;
  prompt += `CURRENT STATUS:\n`;
  prompt += `- Total spent: $${spending.spent.toFixed(2)} of $${spending.budget.toFixed(2)} (${spending.percentUsed.toFixed(1)}%)\n`;
  prompt += `- Remaining: $${spending.remaining.toFixed(2)}\n`;
  prompt += `- Spending pace: ${spending.paceDeltaPct.toFixed(1)}% ${spending.paceDeltaPct > 0 ? "faster" : "slower"} than usual\n`;
  prompt += `- Days elapsed: ${getDaysElapsed(month)} days\n`;
  prompt += `- If pace continues, will be ${overage > 0 ? `$${overage.toFixed(2)} over budget` : "under budget"}\n\n`;

  if (topCategory) {
    prompt += `TOP SPENDING CATEGORY:\n`;
    prompt += `- ${topCategory.name}: $${topCategory.spent.toFixed(2)} of $${topCategory.planned.toFixed(2)} planned (${topCategory.percentUsed.toFixed(1)}%)\n\n`;
  }

  prompt += `MONTH-TO-MONTH COMPARISON:\n`;
  prompt += `- vs last month: ${spending.compareToLastMonthPct >= 0 ? "+" : ""}${spending.compareToLastMonthPct.toFixed(1)}%\n`;
  prompt += `- vs 3-month average: ${spending.compareToAveragePct >= 0 ? "+" : ""}${spending.compareToAveragePct.toFixed(1)}%\n\n`;

  prompt += `Generate exactly 4 insights in JSON format:\n`;
  prompt += `[\n`;
  prompt += `  { "kind": "alert" | "positive", "title": "...", "body": "...", "action": "Action: ..." },\n`;
  prompt += `]\n\n`;
  prompt += `Requirements:\n`;
  prompt += `1. One insight should focus on spending pace and budget projection\n`;
  prompt += `2. One should compare current spending to previous month\n`;
  prompt += `3. One should highlight the biggest spending category\n`;
  prompt += `4. One should be either about category trends, savings potential, or spending patterns\n`;
  prompt += `- Each insight should be 1 sentence for title, 1-2 for body, 1 for action\n`;
  prompt += `- Use "alert" for concerning trends, "positive" for good behavior or opportunities\n`;
  prompt += `- Actions should be specific and achievable within days (not months)\n`;
  prompt += `- Be encouraging but direct about budget issues\n`;
  prompt += `- Return ONLY valid JSON, no other text`;

  return prompt;
}

/**
 * Parse AI-generated insights from LLM response
 */
export function parseInsights(response: string): InsightCard[] {
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonString = response.trim();
    if (jsonString.includes("```")) {
      jsonString = jsonString.split("```")[1];
      if (jsonString.includes("json")) {
        jsonString = jsonString.split("json")[1];
      }
    }

    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((insight: unknown) => isValidInsight(insight))
      .slice(0, 4) // Return at most 4 insights
      .map((insight: unknown) => insight as InsightCard);
  } catch (err) {
    console.error("Failed to parse insights:", err);
    return [];
  }
}

/**
 * Validate insight object structure
 */
function isValidInsight(obj: unknown): obj is InsightCard {
  if (!obj || typeof obj !== "object") return false;

  const insight = obj as Record<string, unknown>;
  return (
    (insight.kind === "alert" || insight.kind === "positive") &&
    typeof insight.title === "string" &&
    typeof insight.body === "string" &&
    typeof insight.action === "string" &&
    insight.title.length > 0 &&
    insight.body.length > 0 &&
    insight.action.length > 0
  );
}

/**
 * Get remaining days in the given month
 */
function getRemainingDaysInMonth(monthStr: string): number {
  const [y, m] = monthStr.split("-").map(Number);
  const now = new Date();
  const currentMonth = now.getFullYear() === y && now.getMonth() + 1 === m;

  if (!currentMonth) {
    // For past months, return 0
    return 0;
  }

  const lastDay = new Date(y, m, 0).getDate();
  return lastDay - now.getDate();
}

/**
 * Get number of days elapsed in the given month
 */
function getDaysElapsed(monthStr: string): number {
  const [y, m] = monthStr.split("-").map(Number);
  const now = new Date();
  const currentMonth = now.getFullYear() === y && now.getMonth() + 1 === m;

  if (!currentMonth) {
    // For past months, return full month days
    return new Date(y, m, 0).getDate();
  }

  return now.getDate();
}
