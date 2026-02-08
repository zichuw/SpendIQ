import { NativeModules, Platform } from 'react-native';
import { monthlyHomePlaceholder } from '../mocks/monthly-home';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface ApiRequestOptions {
  method?: HttpMethod;
  body?: unknown;
}

export interface InsightCard {
  kind: 'alert' | 'positive';
  title: string;
  body: string;
  action: string;
}

export interface ChatMessage {
  id: number;
  user_id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
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

export type ProfileAccountStatus = 'connected' | 'needs re-auth' | 'sync issue';

export interface ApiProfileAccount {
  id: string;
  institution: string;
  nickname: string;
  type: 'checking' | 'credit' | 'savings';
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
  if (!scriptURL) return null;

  try {
    return new URL(scriptURL).hostname;
  } catch {
    return null;
  }
}

function resolveApiBaseUrl(): string {
  const envBase = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (envBase) return envBase.replace(/\/+$/, '');

  const devHost = detectDevHost();
  if (devHost) {
    if (Platform.OS === 'android' && devHost === 'localhost') {
      return 'http://10.0.2.2:3001';
    }
    return `http://${devHost}:3001`;
  }

  if (Platform.OS === 'android') return 'http://10.0.2.2:3001';
  return 'http://localhost:3001';
}

const API_BASE_URL = resolveApiBaseUrl();
const USE_DUMMY_DATA = process.env.EXPO_PUBLIC_USE_DUMMY_DATA !== 'false';

const DUMMY_PROFILE: ApiProfileResponse = {
  accounts: [
    {
      id: 'acc_demo_chk',
      institution: 'Chase',
      nickname: 'Everyday Checking',
      type: 'checking',
      maskedNumber: '••••1234',
      balance: 3240.55,
      status: 'connected',
    },
    {
      id: 'acc_demo_cc',
      institution: 'Chase',
      nickname: 'Freedom Card',
      type: 'credit',
      maskedNumber: '••••9912',
      balance: -815.42,
      status: 'connected',
    },
  ],
  settings: {
    timezone: 'America/New_York',
    currencyCode: 'USD',
  },
};

const DUMMY_INSIGHTS: InsightCard[] = [
  {
    kind: 'alert',
    title: 'Dining spend is trending high',
    body: 'Restaurant spending is running above your weekly pace.',
    action: 'Set a temporary dining cap and shift 1-2 meals to groceries.',
  },
  {
    kind: 'positive',
    title: 'Core categories are stable',
    body: 'Housing and transportation are within expected range this month.',
    action: 'Keep recurring bills on autopay and avoid late fees.',
  },
];

function getMonthBounds(month: string): { periodStart: string; periodEnd: string } {
  const [year, mon] = month.split('-').map(Number);
  const lastDay = new Date(year, mon, 0).getDate();
  return {
    periodStart: `${month}-01`,
    periodEnd: `${month}-${String(lastDay).padStart(2, '0')}`,
  };
}

function cloneDummyHomeForMonth(month: string): ApiMonthlyHome {
  const { periodStart, periodEnd } = getMonthBounds(month);
  return {
    ...monthlyHomePlaceholder,
    month,
    periodStart,
    periodEnd,
    lines: monthlyHomePlaceholder.lines.map((line) => ({
      ...line,
      parentCategoryName: line.parentCategoryName ?? line.categoryName,
    })),
    chart: monthlyHomePlaceholder.chart.map((slice) => ({ ...slice })),
  };
}

const dummyHomeByMonth = new Map<string, ApiMonthlyHome>([
  [monthlyHomePlaceholder.month, cloneDummyHomeForMonth(monthlyHomePlaceholder.month)],
]);

function getOrCreateDummyHome(month: string): ApiMonthlyHome {
  const existing = dummyHomeByMonth.get(month);
  if (existing) return existing;
  const created = cloneDummyHomeForMonth(month);
  dummyHomeByMonth.set(month, created);
  return created;
}

function findDummyHomeByBudgetId(budgetId: number): ApiMonthlyHome | undefined {
  return Array.from(dummyHomeByMonth.values()).find((item) => item.budgetId === budgetId);
}

function getErrorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === 'object') {
    const maybeError = (payload as { error?: unknown }).error;
    if (typeof maybeError === 'string' && maybeError.trim()) return maybeError;
    if (maybeError && typeof maybeError === 'object') {
      const message = (maybeError as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) return message;
    }
  }
  return `Request failed (${status})`;
}

async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
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
  const parsed = Number(process.env.EXPO_PUBLIC_USER_ID ?? '1');
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function getCurrentMonthKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export async function fetchInsights(month?: string): Promise<InsightCard[]> {
  if (USE_DUMMY_DATA) return DUMMY_INSIGHTS;

  try {
    const payload = await request<unknown>('/api/v1/ai/insights', {
      method: 'POST',
      body: {
        user_id: getDefaultUserId(),
        month,
      },
    });

    return Array.isArray(payload) ? (payload as InsightCard[]) : [];
  } catch (error) {
    console.error('Failed to fetch insights:', error);
    return [];
  }
}

export async function sendChatMessage(message: string, month?: string): Promise<string> {
  try {
    const payload = await request<{ message?: string }>('/api/v1/ai/chat', {
      method: 'POST',
      body: {
        user_id: getDefaultUserId(),
        message,
        month,
      },
    });

    return payload.message ?? '';
  } catch (error) {
    console.error('Failed to send chat message:', error);
    throw error;
  }
}

export async function fetchChatHistory(limit = 50): Promise<ChatMessage[]> {
  try {
    const userId = getDefaultUserId();
    const payload = await request<unknown>(
      `/api/v1/ai/history/${encodeURIComponent(String(userId))}?limit=${encodeURIComponent(String(limit))}`
    );

    return Array.isArray(payload) ? (payload as ChatMessage[]) : [];
  } catch (error) {
    console.error('Failed to fetch chat history:', error);
    return [];
  }
}

export async function ensureBudgetForMonth(userId: number, month: string): Promise<void> {
  if (USE_DUMMY_DATA) {
    getOrCreateDummyHome(month);
    return;
  }

  await request('/api/v1/budgets/ensure', {
    method: 'POST',
    body: { user_id: userId, month },
  });
}

export async function getMonthlyHome(userId: number, month: string): Promise<ApiMonthlyHome> {
  if (USE_DUMMY_DATA) return getOrCreateDummyHome(month);

  const query = `month=${encodeURIComponent(month)}&user_id=${encodeURIComponent(String(userId))}`;
  return request<ApiMonthlyHome>(`/api/v1/home/monthly?${query}`);
}

export async function updateBudgetTotal(budgetId: number, totalBudgetAmount: number): Promise<void> {
  if (USE_DUMMY_DATA) {
    const home = findDummyHomeByBudgetId(budgetId);
    if (!home) return;
    home.summary.budgetTotal = totalBudgetAmount;
    home.summary.remaining = Math.max(0, totalBudgetAmount - home.summary.spentTotal);
    home.summary.spentPct =
      totalBudgetAmount <= 0 ? 0 : Number(((home.summary.spentTotal / totalBudgetAmount) * 100).toFixed(2));
    return;
  }

  await request(`/api/v1/budgets/${budgetId}`, {
    method: 'PATCH',
    body: { totalBudgetAmount },
  });
}

export async function updateBudgetLine(
  budgetId: number,
  categoryId: number,
  plannedAmount: number
): Promise<void> {
  if (USE_DUMMY_DATA) {
    const home = findDummyHomeByBudgetId(budgetId);
    if (!home) return;
    const line = home.lines.find((item) => item.categoryId === categoryId);
    if (!line) return;
    line.planned = plannedAmount;
    line.remaining = Math.max(0, plannedAmount - line.spent);
    line.progressPct = plannedAmount <= 0 ? 0 : Number(((line.spent / plannedAmount) * 100).toFixed(2));
    const nextBudgetTotal = home.lines.reduce((sum, item) => sum + item.planned, 0);
    home.summary.budgetTotal = nextBudgetTotal;
    home.summary.remaining = Math.max(0, nextBudgetTotal - home.summary.spentTotal);
    home.summary.spentPct =
      nextBudgetTotal <= 0 ? 0 : Number(((home.summary.spentTotal / nextBudgetTotal) * 100).toFixed(2));
    return;
  }

  await request(`/api/v1/budgets/${budgetId}/lines/${categoryId}`, {
    method: 'PUT',
    body: { plannedAmount },
  });
}

export async function getProfile(userId: number): Promise<ApiProfileResponse> {
  if (USE_DUMMY_DATA) return DUMMY_PROFILE;

  return request<ApiProfileResponse>(`/api/v1/profile/${encodeURIComponent(String(userId))}`);
}
