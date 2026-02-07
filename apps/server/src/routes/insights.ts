import { Router } from "express";
import { Pool } from "pg";
import { computeInsights } from "../logic/insights";

const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// GET /insights/:user_id
// Optional query: month=YYYY-MM (default: current month)
router.get("/:user_id", async (req, res) => {
  const { user_id } = req.params;
  const month = (req.query.month as string)?.trim();

  try {
    let period_start: string;
    let period_end: string;

    if (month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      const [y, m] = month.split("-").map(Number);
      period_start = `${month}-01`;
      period_end = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
    } else {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      period_start = `${y}-${String(m).padStart(2, "0")}-01`;
      period_end = `${y}-${String(m).padStart(2, "0")}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
    }

    // 1. Budget lines for this period (single budget per user per period_start)
    const budgetRes = await pool.query(
      `SELECT b.id AS budget_id
       FROM budgets b
       WHERE b.user_id = $1 AND b.period_start = $2::date`,
      [user_id, period_start]
    );

    if (budgetRes.rowCount === 0) {
      return res.json([]);
    }

    const budget_id = budgetRes.rows[0].budget_id;

    const linesRes = await pool.query(
      `SELECT bl.category_id, bl.planned_amount, c.name AS category_name
       FROM budget_lines bl
       JOIN categories c ON c.id = bl.category_id
       WHERE bl.budget_id = $1`,
      [budget_id]
    );

    const budgetLines = linesRes.rows.map((r) => ({
      category_id: r.category_id,
      category_name: r.category_name,
      planned_amount: r.planned_amount,
    }));

    // 2. Spent per category in period (debits only, via transaction_categories)
    const spentRes = await pool.query(
      `SELECT tc.category_id, SUM(t.amount) AS spent
       FROM transactions t
       JOIN transaction_categories tc ON tc.transaction_id = t.id
       WHERE t.user_id = $1
         AND t.transaction_date >= $2::date
         AND t.transaction_date <= $3::date
         AND t.direction = 'debit'
       GROUP BY tc.category_id`,
      [user_id, period_start, period_end]
    );

    const spentByCategory = spentRes.rows.map((r) => ({
      category_id: r.category_id,
      spent: Number(r.spent),
    }));

    const insights = computeInsights(budgetLines, spentByCategory);
    res.json(insights);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error fetching insights:", message);
    res.status(500).json({ error: "Failed to compute insights" });
  }
});

export default router;
