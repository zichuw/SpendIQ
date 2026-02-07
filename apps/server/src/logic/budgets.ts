// logic/budgets.ts
// Helpers for budget + budget_lines (new schema: period_start/period_end, category_id in lines).

export function parseMonthToBounds(month: string): { period_start: string; period_end: string } {
  const [y, m] = month.split("-").map(Number);
  const period_start = `${month}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const period_end = `${month}-${String(lastDay).padStart(2, "0")}`;
  return { period_start, period_end };
}

export function validateBudgetLines(lines: unknown): lines is Array<{ category_id: number; planned_amount: number }> {
  if (!Array.isArray(lines)) return false;
  return lines.every(
    (l) =>
      l != null &&
      typeof l === "object" &&
      "category_id" in l &&
      "planned_amount" in l &&
      Number(l.planned_amount) >= 0
  );
}
