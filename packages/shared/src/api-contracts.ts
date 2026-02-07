export type CurrencyCode = "USD";
export type Direction = "debit" | "credit";

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/* 1) GET /api/v1/home/monthly?month=YYYY-MM */

export interface GetMonthlyHomeQuery {
  month: string; // "2026-02"
}

export interface MonthlySummary {
  budgetTotal: number;
  spentTotal: number;
  remaining: number;
  spentPct: number; // 0..100
}

export interface MonthlyChartSlice {
  categoryId: number;
  categoryName: string;
  spent: number;
  color: string; // hex
}

export interface MonthlyBudgetLine {
  categoryId: number; // can represent subcategory id in your taxonomy
  categoryName: string;
  parentCategoryName?: string;
  planned: number;
  spent: number;
  remaining: number;
  progressPct: number; // 0..100
}

export interface GetMonthlyHomeResponse {
  month: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  currency: CurrencyCode;
  budgetId: number;
  summary: MonthlySummary;
  chart: MonthlyChartSlice[];
  lines: MonthlyBudgetLine[];
  sync: {
    lastTransactionSyncAt: string | null; // ISO timestamp
  };
}

/* 2) PATCH /api/v1/budgets/:budgetId */

export interface PatchBudgetParams {
  budgetId: number;
}

export interface PatchBudgetRequest {
  totalBudgetAmount: number;
}

export interface PatchBudgetResponse {
  budgetId: number;
  totalBudgetAmount: number;
  updatedAt: string; // ISO timestamp
}

/* 3) PUT /api/v1/budgets/:budgetId/lines/:categoryId */

export interface PutBudgetLineParams {
  budgetId: number;
  categoryId: number;
}

export interface PutBudgetLineRequest {
  plannedAmount: number;
}

export interface PutBudgetLineResponse {
  id: number;
  budgetId: number;
  categoryId: number;
  plannedAmount: number;
  updatedAt: string; // ISO timestamp
}

/* 4) POST /api/v1/transactions/manual */

export interface PostManualTransactionRequest {
  amount: number;
  direction: Direction;
  name: string;
  merchantName?: string;
  transactionDate: string; // YYYY-MM-DD
  categoryId?: number;
  notes?: string;
}

export interface PostManualTransactionResponse {
  id: number;
  userId: number;
  amount: number;
  direction: Direction;
  name: string;
  merchantName?: string;
  transactionDate: string; // YYYY-MM-DD
  isManual: true;
  createdAt: string; // ISO timestamp
}

/* 5) GET /api/v1/categories/:categoryId/monthly-detail?month=YYYY-MM */

export interface GetCategoryMonthlyDetailParams {
  categoryId: number;
}

export interface GetCategoryMonthlyDetailQuery {
  month: string; // "2026-02"
}

export interface CategoryTxnItem {
  transactionId: number;
  date: string; // YYYY-MM-DD
  name: string;
  merchantName?: string;
  amount: number;
  direction: Direction;
}

export interface GetCategoryMonthlyDetailResponse {
  month: string;
  categoryId: number;
  categoryName: string;
  parentCategoryName?: string;
  planned: number;
  spent: number;
  remaining: number;
  progressPct: number;
  changeVsPreviousMonthPct?: number;
  transactions: CategoryTxnItem[];
}

/* 6) GET /api/v1/budgets/months */

export interface GetBudgetMonthsResponse {
  months: string[]; // ["2026-02","2026-01",...]
  defaultMonth: string; // "2026-02"
}

/* 7) POST /api/v1/budgets/ensure */

export interface PostEnsureBudgetRequest {
  month: string; // "2026-02"
}

export interface PostEnsureBudgetResponse {
  budgetId: number;
  month: string;
  created: boolean;
}

/* 8) GET /api/v1/sync/status */

export interface GetSyncStatusResponse {
  status: "ok" | "degraded" | "error";
  lastTransactionSyncAt: string | null; // ISO timestamp
  institutionCount: number;
}
