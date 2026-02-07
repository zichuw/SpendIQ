export interface MonthlyHomeData {
  month: string;
  periodStart: string;
  periodEnd: string;
  currency: 'USD';
  budgetId: number;
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
    parentCategoryName?: string;
    planned: number;
    spent: number;
    remaining: number;
    progressPct: number;
  }>;
  sync: {
    lastTransactionSyncAt: string | null;
  };
}

export const monthlyHomePlaceholder: MonthlyHomeData = {
  month: '2026-02',
  periodStart: '2026-02-01',
  periodEnd: '2026-02-28',
  currency: 'USD',
  budgetId: 1,
  summary: {
    budgetTotal: 5000,
    spentTotal: 3750.5,
    remaining: 1249.5,
    spentPct: 75.01,
  },
  chart: [
    { categoryId: 2, categoryName: 'Fixed', spent: 1720, color: '#1A3A2A' },
    { categoryId: 3, categoryName: 'Everyday', spent: 860.5, color: '#8FAE7E' },
    { categoryId: 4, categoryName: 'Lifestyle', spent: 980, color: '#6B7C52' },
    { categoryId: 5, categoryName: 'Miscellaneous', spent: 190, color: '#94A3B8' },
  ],
  lines: [
    {
      categoryId: 6,
      categoryName: 'Housing',
      parentCategoryName: 'Fixed',
      planned: 1600,
      spent: 1550,
      remaining: 50,
      progressPct: 96.88,
    },
    {
      categoryId: 7,
      categoryName: 'Healthcare',
      parentCategoryName: 'Fixed',
      planned: 250,
      spent: 170,
      remaining: 80,
      progressPct: 68,
    },
    {
      categoryId: 8,
      categoryName: 'Grocery',
      parentCategoryName: 'Everyday',
      planned: 600,
      spent: 510.5,
      remaining: 89.5,
      progressPct: 85.08,
    },
    {
      categoryId: 9,
      categoryName: 'Transportation',
      parentCategoryName: 'Everyday',
      planned: 300,
      spent: 230,
      remaining: 70,
      progressPct: 76.67,
    },
    {
      categoryId: 10,
      categoryName: 'Restaurants',
      parentCategoryName: 'Lifestyle',
      planned: 600,
      spent: 420,
      remaining: 180,
      progressPct: 70,
    },
    {
      categoryId: 11,
      categoryName: 'Personal Shopping',
      parentCategoryName: 'Lifestyle',
      planned: 300,
      spent: 240,
      remaining: 60,
      progressPct: 80,
    },
    {
      categoryId: 12,
      categoryName: 'Subscriptions',
      parentCategoryName: 'Lifestyle',
      planned: 120,
      spent: 95.99,
      remaining: 24.01,
      progressPct: 79.99,
    },
    {
      categoryId: 13,
      categoryName: 'Miscellaneous',
      parentCategoryName: 'Miscellaneous',
      planned: 250,
      spent: 190,
      remaining: 60,
      progressPct: 76,
    },
  ],
  sync: {
    lastTransactionSyncAt: '2026-02-07T18:20:00Z',
  },
};
