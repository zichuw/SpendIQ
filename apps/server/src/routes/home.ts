import { Router } from "express";
import { Pool } from "pg";
import {
  buildMonthlyHomePayload,
  getMonthBounds,
} from "../logic/homeMonthly";

const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * GET /api/v1/home/monthly?month=2026-02&user_id=1
 * Returns everything needed for the monthly homepage: period, summary, chart, lines, sync.
 * Uses schema: budgets (period_start/period_end), budget_lines (category_id, planned_amount),
 * categories (name, color_hex, parent_id), transaction_categories, plaid_items.last_sync_at.
 */
router.get("/monthly", async (req, res) => {
  const month = (req.query.month as string)?.trim();
  const user_id = (req.query.user_id as string)?.trim();

  if (!month || !MONTH_REGEX.test(month)) {
    return res.status(400).json({
      error: "Invalid or missing month. Use query month=YYYY-MM (e.g. month=2026-02).",
    });
  }

  if (!user_id) {
    return res.status(400).json({
      error: "Missing user_id. Use query user_id=...",
    });
  }

  try {
    const { periodStart, periodEnd } = getMonthBounds(month);

    // Budget for this month (unique on user_id, period_start)
    const budgetRes = await pool.query(
      `SELECT id FROM budgets
       WHERE user_id = $1 AND period_start = $2::date`,
      [user_id, periodStart]
    );

    let budgetLines: Array<{
      category_id: number;
      category_name: string;
      parent_category_name: string | null;
      color_hex: string | null;
      planned_amount: number;
    }> = [];

    if (budgetRes.rowCount !== 0) {
      const budget_id = budgetRes.rows[0].id;
      const linesRes = await pool.query(
        `SELECT bl.category_id, bl.planned_amount,
                c.name AS category_name, c.color_hex,
                p.name AS parent_category_name
         FROM budget_lines bl
         JOIN categories c ON c.id = bl.category_id
         LEFT JOIN categories p ON p.id = c.parent_id
         WHERE bl.budget_id = $1`,
        [budget_id]
      );
      budgetLines = linesRes.rows.map((r) => ({
        category_id: r.category_id,
        category_name: r.category_name,
        parent_category_name: r.parent_category_name,
        color_hex: r.color_hex,
        planned_amount: r.planned_amount,
      }));
    }

    // Spent per category in period (debits, via transaction_categories)
    const spentRes = await pool.query(
      `SELECT tc.category_id, SUM(t.amount) AS spent
       FROM transactions t
       JOIN transaction_categories tc ON tc.transaction_id = t.id
       WHERE t.user_id = $1
         AND t.transaction_date >= $2::date
         AND t.transaction_date <= $3::date
         AND t.direction = 'debit'
       GROUP BY tc.category_id`,
      [user_id, periodStart, periodEnd]
    );

    const spentByCategory = spentRes.rows.map((r) => ({
      category_id: r.category_id,
      spent: Number(r.spent),
    }));

    // Last transaction sync: max last_sync_at across user's plaid_items
    const syncRes = await pool.query(
      `SELECT MAX(last_sync_at) AS last_sync
       FROM plaid_items
       WHERE user_id = $1`,
      [user_id]
    );
    const lastSyncVal = syncRes.rows[0]?.last_sync;
    const lastTransactionSyncAt =
      lastSyncVal != null ? new Date(lastSyncVal).toISOString() : null;

    const payload = buildMonthlyHomePayload(
      month,
      budgetLines,
      spentByCategory,
      lastTransactionSyncAt
    );

    res.json(payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error fetching monthly home:", message);
    res.status(500).json({ error: "Failed to load monthly home" });
  }
});

export default router;
