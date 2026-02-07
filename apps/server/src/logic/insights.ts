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

export interface Insight {
  category_id: number;
  category_name: string;
  budget: number;
  spent: number;
  remaining: number;
  percent_used: number;
}

export function computeInsights(
  budgetLines: BudgetLineRow[],
  spentByCategory: CategorySpendRow[]
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

    return {
      category_id: line.category_id,
      category_name: line.category_name,
      budget: budgetAmount,
      spent,
      remaining,
      percent_used,
    };
  });
}
