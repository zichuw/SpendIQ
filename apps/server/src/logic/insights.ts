// logic/insights.ts
// Computes per-category budget vs spent from budget_lines and transaction_categories.

export interface BudgetLineRow {
  category_id: number;
  category_name: string;
  planned_amount: number;
}

export interface CategorySpendRow {
  category_id: number;
  spent: number;
}

export type BudgetStatus = "on_track" | "tight" | "over";

export interface Insight {
  category_id: number;
  category_name: string;
  budget: number;
  spent: number;
  remaining: number;
  percent_used: number;
  status: BudgetStatus;
}

/**
 * Compute budget health status based on spent ratio and thresholds
 * @param ratio spent / budget (e.g., 0.75 means 75% spent)
 * @param statusOnTrackMax threshold for "on_track" (default 0.85)
 * @param statusTightMax threshold for "tight" (default 1.0)
 */
export function computeBudgetStatus(
  ratio: number,
  statusOnTrackMax: number = 0.85,
  statusTightMax: number = 1.0
): BudgetStatus {
  if (ratio <= statusOnTrackMax) return "on_track";
  if (ratio <= statusTightMax) return "tight";
  return "over";
}

export function computeInsights(
  budgetLines: BudgetLineRow[],
  spentByCategory: CategorySpendRow[],
  statusOnTrackMax: number = 0.85,
  statusTightMax: number = 1.0
): Insight[] {
  const spentMap = new Map<number, number>();
  for (const row of spentByCategory) {
    spentMap.set(row.category_id, (spentMap.get(row.category_id) ?? 0) + row.spent);
  }

  return budgetLines.map((line) => {
    const budgetAmount = Number(line.planned_amount);
    const spent = spentMap.get(line.category_id) ?? 0;
    const remaining = Math.max(0, budgetAmount - spent);
    const percent_used =
      budgetAmount === 0 ? 0 : Number(((spent / budgetAmount) * 100).toFixed(2));
    
    const ratio = budgetAmount === 0 ? 0 : spent / budgetAmount;
    const status = computeBudgetStatus(ratio, statusOnTrackMax, statusTightMax);

    return {
      category_id: line.category_id,
      category_name: line.category_name,
      budget: budgetAmount,
      spent,
      remaining,
      percent_used,
      status,
    };
  });
}
