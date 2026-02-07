// logic/budgets.ts

export function createBudget({ user_id, category, limit_amount, period }: any) {
  // For now, just return the input
  return { user_id, category, limit_amount, period };
}

export function updateBudgetLogic({ id, category, limit_amount, period }: any) {
  // No-op for now
  return { id, category, limit_amount, period };
}