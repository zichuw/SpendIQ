// logic/homeMonthly.ts
// Builds the monthly homepage payload from budget_lines, categories, and transaction_categories.

export interface BudgetLineWithCategory {
  category_id: number;
  category_name: string;
  parent_category_name: string | null;
  color_hex: string | null;
  planned_amount: number;
}

export interface CategorySpend {
  category_id: number;
  spent: number;
}

export interface MonthlyHomePayload {
  month: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  summary: {
    budgetTotal: number;
    spentTotal: number;
    remaining: number;
    spentPct: number;
  };
  chart: Array<{
    categoryId: number;
    categoryName: string;
    spent: number;
    color: string;
  }>;
  lines: Array<{
    categoryId: number;
    categoryName: string;
    parentCategoryName: string;
    planned: number;
    spent: number;
    remaining: number;
    progressPct: number;
  }>;
  sync: {
    lastTransactionSyncAt: string | null;
  };
}

const CHART_COLORS = [
  "#9FC5A8",
  "#6FA8DC",
  "#E8B4BC",
  "#F4D35E",
  "#A67DB8",
  "#7FDBDA",
  "#E07A5F",
  "#81B29A",
];

/**
 * Get first and last day of month in YYYY-MM-DD.
 */
export function getMonthBounds(month: string): { periodStart: string; periodEnd: string } {
  const [y, m] = month.split("-").map(Number);
  const periodStart = `${month}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const periodEnd = `${month}-${String(lastDay).padStart(2, "0")}`;
  return { periodStart, periodEnd };
}

/**
 * Build the monthly home payload from budget lines (with category info) and spent by category.
 */
export function buildMonthlyHomePayload(
  month: string,
  budgetLines: BudgetLineWithCategory[],
  spentByCategory: CategorySpend[],
  lastTransactionSyncAt: string | null,
  currency: string = "USD"
): MonthlyHomePayload {
  const { periodStart, periodEnd } = getMonthBounds(month);

  const spentMap = new Map<number, number>();
  for (const row of spentByCategory) {
    spentMap.set(row.category_id, (spentMap.get(row.category_id) ?? 0) + row.spent);
  }

  const budgetTotal = budgetLines.reduce((sum, b) => sum + Number(b.planned_amount), 0);

  const lines = budgetLines.map((line, index) => {
    const planned = Number(line.planned_amount);
    const spent = spentMap.get(line.category_id) ?? 0;
    const remaining = Math.max(0, planned - spent);
    const progressPct = planned === 0 ? 0 : Number(((spent / planned) * 100).toFixed(2));

    return {
      categoryId: line.category_id,
      categoryName: line.category_name,
      parentCategoryName: line.parent_category_name ?? line.category_name,
      planned,
      spent,
      remaining,
      progressPct,
    };
  });

  const spentTotal = lines.reduce((sum, l) => sum + l.spent, 0);
  const remaining = Math.max(0, budgetTotal - spentTotal);
  const spentPct = budgetTotal === 0 ? 0 : Number(((spentTotal / budgetTotal) * 100).toFixed(2));

  const chart = lines
    .filter((l) => l.spent > 0)
    .map((l, i) => {
      const lineMeta = budgetLines.find((bl) => bl.category_id === l.categoryId);
      const color = lineMeta?.color_hex ?? CHART_COLORS[i % CHART_COLORS.length];
      return {
        categoryId: l.categoryId,
        categoryName: l.categoryName,
        spent: l.spent,
        color,
      };
    });

  return {
    month,
    periodStart,
    periodEnd,
    currency,
    summary: {
      budgetTotal,
      spentTotal,
      remaining,
      spentPct,
    },
    chart,
    lines,
    sync: {
      lastTransactionSyncAt,
    },
  };
}
