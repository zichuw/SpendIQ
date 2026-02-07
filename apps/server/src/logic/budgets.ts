// logic/budgets.ts
// Helpers for budget + budget_lines (new schema: period_start/period_end, category_id in lines).

import { BudgetStatus, computeBudgetStatus } from "./insights";

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

/**
 * Compute status for a budget line based on spent vs planned and thresholds
 */
export function getBudgetLineStatus(
  spent: number,
  planned: number,
  statusOnTrackMax: number = 0.85,
  statusTightMax: number = 1.0
): BudgetStatus {
  if (planned === 0) return "on_track";
  const ratio = spent / planned;
  return computeBudgetStatus(ratio, statusOnTrackMax, statusTightMax);
}
