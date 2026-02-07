export type TransactionType = 'income' | 'expense';
import { monthlyHomePlaceholder } from '@/src/mocks/monthly-home';

export interface TransactionRecord {
  id: number;
  name: string;
  category: string;
  account: string;
  amount: number;
  type: TransactionType;
  date: string; // YYYY-MM-DD
  notes?: string;
}

interface ListOptions {
  rangeDays: number;
}

interface SaveTransactionInput {
  name: string;
  category: string;
  account: string;
  amount: number;
  type: TransactionType;
  date: string;
  notes?: string;
}

let nextId = 101;

const INITIAL_TRANSACTIONS: TransactionRecord[] = [
  {
    id: 1,
    name: 'Zelle payment to Jordan',
    category: 'Restaurants',
    account: 'Checking',
    amount: 10.08,
    type: 'expense',
    date: '2026-02-07',
  },
  {
    id: 2,
    name: 'Payroll ACME Corp',
    category: 'Income',
    account: 'Checking',
    amount: 2400,
    type: 'income',
    date: '2026-02-05',
  },
  {
    id: 3,
    name: 'Trader Joe\'s groceries',
    category: 'Grocery',
    account: 'Credit Card',
    amount: 86.42,
    type: 'expense',
    date: '2026-02-04',
  },
  {
    id: 4,
    name: 'Shell gas station',
    category: 'Transportation',
    account: 'Credit Card',
    amount: 47.33,
    type: 'expense',
    date: '2026-01-28',
  },
  {
    id: 5,
    name: 'Freelance design payout',
    category: 'Income',
    account: 'Savings',
    amount: 620,
    type: 'income',
    date: '2026-01-20',
  },
];

let transactions: TransactionRecord[] = [...INITIAL_TRANSACTIONS];
const HOME_CATEGORIES = Array.from(
  new Set(monthlyHomePlaceholder.lines.map((line) => line.categoryName))
);
const HOME_CATEGORY_LOOKUP = new Map(HOME_CATEGORIES.map((name) => [name.toLowerCase(), name]));
const CATEGORY_ALIASES: Record<string, string> = {
  groceries: 'Grocery',
};

function parseDate(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

function sortNewestFirst(items: TransactionRecord[]): TransactionRecord[] {
  return [...items].sort((a, b) => {
    if (a.date === b.date) return b.id - a.id;
    return a.date < b.date ? 1 : -1;
  });
}

function cutoffForRange(rangeDays: number): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(today.getDate() - (rangeDays - 1));
  return cutoff;
}

export function getAvailableCategories(): string[] {
  return Array.from(new Set(transactions.map((item) => item.category))).sort((a, b) => a.localeCompare(b));
}

export function getHomeFilterCategories(): string[] {
  return HOME_CATEGORIES;
}

export function normalizeToHomeCategory(category: string): string {
  const trimmed = category.trim();
  if (!trimmed) return trimmed;

  const lowered = trimmed.toLowerCase();
  const aliased = CATEGORY_ALIASES[lowered] ?? trimmed;
  return HOME_CATEGORY_LOOKUP.get(aliased.toLowerCase()) ?? aliased;
}

export function getAvailableAccounts(): string[] {
  return Array.from(new Set(transactions.map((item) => item.account))).sort((a, b) => a.localeCompare(b));
}

export async function listTransactions(options: ListOptions): Promise<TransactionRecord[]> {
  if (options.rangeDays <= 0) {
    throw new Error('Invalid date range');
  }

  const delayMs = options.rangeDays > 7 ? 550 : 280;
  const cutoffDate = cutoffForRange(options.rangeDays);

  const inRange = transactions.filter((item) => parseDate(item.date) >= cutoffDate);

  await new Promise((resolve) => setTimeout(resolve, delayMs));
  return sortNewestFirst(inRange);
}

export function findTransactionById(id: number): TransactionRecord | null {
  const item = transactions.find((tx) => tx.id === id);
  return item ? { ...item } : null;
}

export function createManualTransaction(input: SaveTransactionInput): TransactionRecord {
  const next: TransactionRecord = {
    id: nextId,
    name: input.name,
    category: normalizeToHomeCategory(input.category),
    account: input.account,
    amount: Math.abs(input.amount),
    type: input.type,
    date: input.date,
    notes: input.notes?.trim() ? input.notes.trim() : undefined,
  };

  nextId += 1;
  transactions = sortNewestFirst([next, ...transactions]);
  return next;
}

export function updateTransaction(id: number, updates: SaveTransactionInput): TransactionRecord {
  const index = transactions.findIndex((item) => item.id === id);
  if (index < 0) {
    throw new Error('Transaction not found');
  }

  const updated: TransactionRecord = {
    ...transactions[index],
    name: updates.name,
    category: normalizeToHomeCategory(updates.category),
    account: updates.account,
    amount: Math.abs(updates.amount),
    type: updates.type,
    date: updates.date,
    notes: updates.notes?.trim() ? updates.notes.trim() : undefined,
  };

  transactions[index] = updated;
  transactions = sortNewestFirst(transactions);
  return updated;
}
