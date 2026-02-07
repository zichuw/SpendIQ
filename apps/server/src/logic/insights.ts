// logic/insights.ts

interface Budget {
  id: number;
  category: string;
  limit_amount: number;
  period: string;
}

interface Transaction {
  id: number;
  amount: number;
  category: string[];
}

interface Insight {
  category: string;
  budget: number;
  spent: number;
  remaining: number;
  percent_used: number;
}

export function computeInsights(budgets: any[], transactions: any[]) {
  return budgets.map(budget => {
    const budgetAmount = Number(budget.limit_amount);

    const spent = transactions
      .filter(tx => tx.category?.includes(budget.category))
      .reduce((acc, tx) => acc + Number(tx.amount), 0);

    const remaining = budgetAmount - spent;
    const percent_used = budgetAmount === 0 ? 0 : Number(((spent / budgetAmount) * 100).toFixed(2));

    return {
      category: budget.category,
      budget: budgetAmount,
      spent,
      remaining,
      percent_used
    };
  });
}