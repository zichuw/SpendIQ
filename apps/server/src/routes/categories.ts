import { Router } from "express";
import { Pool } from "pg";
import { getMonthBounds } from "../logic/homeMonthly";

const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

function previousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, "0")}`;
}

/**
 * GET /api/v1/categories/:categoryId/monthly-detail?month=2026-02&user_id=1&comparePrevious=true
 * Returns planned/spent/remaining for the subcategory, transaction list, daily breakdown,
 * and optional previous-month comparison.
 */
router.get("/:categoryId/monthly-detail", async (req, res) => {
  const { categoryId } = req.params;
  const month = (req.query.month as string)?.trim();
  const user_id = (req.query.user_id as string)?.trim();
  const comparePrevious = String(req.query.comparePrevious ?? "").toLowerCase() === "true";

  if (!month || !MONTH_REGEX.test(month)) {
    return res.status(400).json({
      error: "Invalid or missing month. Use query month=YYYY-MM (e.g. month=2026-02).",
    });
  }

  if (!user_id) {
    return res.status(400).json({ error: "Missing user_id. Use query user_id=..." });
  }

  try {
    const { periodStart, periodEnd } = getMonthBounds(month);

    // Category info
    const catRes = await pool.query(
      `SELECT c.id, c.name, c.parent_id, p.name AS parent_name
       FROM categories c
       LEFT JOIN categories p ON p.id = c.parent_id
       WHERE c.id = $1`,
      [categoryId]
    );
    if (catRes.rowCount === 0) {
      return res.status(404).json({ error: "Category not found" });
    }
    const category = catRes.rows[0];

    // Planned: from budget for this month + budget_lines for this category
    const budgetRes = await pool.query(
      `SELECT b.id FROM budgets b
       WHERE b.user_id = $1 AND b.period_start = $2::date`,
      [user_id, periodStart]
    );
    let planned = 0;
    if (budgetRes.rowCount !== 0) {
      const lineRes = await pool.query(
        `SELECT planned_amount FROM budget_lines
         WHERE budget_id = $1 AND category_id = $2`,
        [budgetRes.rows[0].id, categoryId]
      );
      if (lineRes.rowCount !== 0) {
        planned = Number(lineRes.rows[0].planned_amount);
      }
    }

    // Transactions in month for this category (debits)
    const txRes = await pool.query(
      `SELECT t.id, t.amount, t.direction, t.name, t.merchant_name, t.transaction_date, t.is_manual, t.created_at
       FROM transactions t
       JOIN transaction_categories tc ON tc.transaction_id = t.id
       WHERE t.user_id = $1
         AND tc.category_id = $2
         AND t.transaction_date >= $3::date
         AND t.transaction_date <= $4::date
         AND t.direction = 'debit'
       ORDER BY t.transaction_date ASC, t.id ASC`,
      [user_id, categoryId, periodStart, periodEnd]
    );

    const transactions = txRes.rows.map((r) => ({
      id: r.id,
      amount: Number(r.amount),
      direction: r.direction,
      name: r.name,
      merchant_name: r.merchant_name,
      transaction_date: r.transaction_date,
      is_manual: r.is_manual,
      created_at: r.created_at,
    }));

    const spent = transactions.reduce((sum, t) => sum + t.amount, 0);
    const remaining = Math.max(0, planned - spent);

    // Daily breakdown (spent per day)
    const byDay: Record<string, number> = {};
    for (const t of transactions) {
      const d = String(t.transaction_date);
      byDay[d] = (byDay[d] ?? 0) + t.amount;
    }
    const daily = Object.entries(byDay)
      .map(([date, spentAmount]) => ({ date, spent: spentAmount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const payload: {
      categoryId: number;
      categoryName: string;
      parentCategoryName: string | null;
      month: string;
      periodStart: string;
      periodEnd: string;
      planned: number;
      spent: number;
      remaining: number;
      transactions: typeof transactions;
      daily: Array<{ date: string; spent: number }>;
      previousMonth?: {
        month: string;
        planned: number;
        spent: number;
        remaining: number;
      };
    } = {
      categoryId: Number(categoryId),
      categoryName: category.name,
      parentCategoryName: category.parent_name ?? null,
      month,
      periodStart,
      periodEnd,
      planned,
      spent,
      remaining,
      transactions,
      daily,
    };

    if (comparePrevious) {
      const prevMonth = previousMonth(month);
      const { periodStart: prevStart, periodEnd: prevEnd } = getMonthBounds(prevMonth);

      let prevPlanned = 0;
      const prevBudgetRes = await pool.query(
        `SELECT b.id FROM budgets b
         WHERE b.user_id = $1 AND b.period_start = $2::date`,
        [user_id, prevStart]
      );
      if (prevBudgetRes.rowCount !== 0) {
        const prevLineRes = await pool.query(
          `SELECT planned_amount FROM budget_lines
           WHERE budget_id = $1 AND category_id = $2`,
          [prevBudgetRes.rows[0].id, categoryId]
        );
        if (prevLineRes.rowCount !== 0) {
          prevPlanned = Number(prevLineRes.rows[0].planned_amount);
        }
      }

      const prevSpentRes = await pool.query(
        `SELECT COALESCE(SUM(t.amount), 0) AS spent
         FROM transactions t
         JOIN transaction_categories tc ON tc.transaction_id = t.id
         WHERE t.user_id = $1
           AND tc.category_id = $2
           AND t.transaction_date >= $3::date
           AND t.transaction_date <= $4::date
           AND t.direction = 'debit'`,
        [user_id, categoryId, prevStart, prevEnd]
      );
      const prevSpent = Number(prevSpentRes.rows[0]?.spent ?? 0);
      payload.previousMonth = {
        month: prevMonth,
        planned: prevPlanned,
        spent: prevSpent,
        remaining: Math.max(0, prevPlanned - prevSpent),
      };
    }

    res.json(payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error fetching category monthly detail:", message);
    res.status(500).json({ error: "Failed to load category monthly detail" });
  }
});

export default router;
