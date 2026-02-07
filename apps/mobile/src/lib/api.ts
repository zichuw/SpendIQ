import { NativeModules, Platform } from "react-native";
type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

interface ApiRequestOptions {
  method?: HttpMethod;
  body?: unknown;
}

export interface ApiBudgetLine {
  categoryId: number;
  categoryName: string;
  parentCategoryName: string;
  planned: number;
  spent: number;
  remaining: number;
  progressPct: number;
}

export interface ApiHomeChartSlice {
  categoryId: number;
  categoryName: string;
  spent: number;
  color: string;
}

export interface ApiMonthlyHome {
  month: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  budgetId: number | null;
  summary: {
    budgetTotal: number;
    spentTotal: number;
    remaining: number;
    spentPct: number;
  };
  chart: ApiHomeChartSlice[];
  lines: ApiBudgetLine[];
  sync: {
    lastTransactionSyncAt: string | null;
  };
}

export type ProfileAccountStatus = "connected" | "needs re-auth" | "sync issue";

export interface ApiProfileAccount {
  id: string;
  institution: string;
  nickname: string;
  type: "checking" | "credit" | "savings";
  maskedNumber: string;
  balance: number;
  status: ProfileAccountStatus;
}

export interface ApiProfileResponse {
  accounts: ApiProfileAccount[];
  settings: {
    timezone: string;
    currencyCode: string;
  };
}

function detectDevHost(): string | null {
  const scriptURL = NativeModules?.SourceCode?.scriptURL as string | undefined;
  if (scriptURL) {
    try {
      return new URL(scriptURL).hostname;
    } catch {
      return null;
    }
  }
  return null;
}

function resolveApiBaseUrl(): string {
  const envBase = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (envBase) return envBase.replace(/\/+$/, "");

  const devHost = detectDevHost();
  if (devHost) {
    if (Platform.OS === "android" && devHost === "localhost") {
      return "http://10.0.2.2:3001";
    }
    return `http://${devHost}:3001`;
  }

  if (Platform.OS === "android") return "http://10.0.2.2:3001";
  return "http://localhost:3001";
}

const API_BASE_URL = resolveApiBaseUrl();

function getErrorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === "object") {
    const maybeError = (payload as { error?: unknown }).error;
    if (typeof maybeError === "string" && maybeError.trim()) return maybeError;
    if (maybeError && typeof maybeError === "object") {
      const message = (maybeError as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) return message;
    }
  }
  return `Request failed (${status})`;
}

async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, response.status));
  }

  return payload as T;
}

export function getDefaultUserId(): number {
  const parsed = Number(process.env.EXPO_PUBLIC_USER_ID ?? "1");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function getCurrentMonthKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export async function ensureBudgetForMonth(userId: number, month: string): Promise<void> {
  await request("/api/v1/budgets/ensure", {
    method: "POST",
    body: { user_id: userId, month },
  });
}

export async function getMonthlyHome(userId: number, month: string): Promise<ApiMonthlyHome> {
  const query = `month=${encodeURIComponent(month)}&user_id=${encodeURIComponent(String(userId))}`;
  return request<ApiMonthlyHome>(`/api/v1/home/monthly?${query}`);
}

export async function updateBudgetTotal(budgetId: number, totalBudgetAmount: number): Promise<void> {
  await request(`/api/v1/budgets/${budgetId}`, {
    method: "PATCH",
    body: { totalBudgetAmount },
  });
}

export async function updateBudgetLine(
  budgetId: number,
  categoryId: number,
  plannedAmount: number
): Promise<void> {
  await request(`/api/v1/budgets/${budgetId}/lines/${categoryId}`, {
    method: "PUT",
    body: { plannedAmount },
  });
}

export async function getProfile(userId: number): Promise<ApiProfileResponse> {
  return request<ApiProfileResponse>(`/api/v1/profile/${encodeURIComponent(String(userId))}`);
}
