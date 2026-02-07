import { Router } from "express";
import { Pool } from "pg";
import { computeInsights } from "../logic/insights";

const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// GET /insights/:user_id
router.get("/:user_id", async (req, res) => {
  const { user_id } = req.params;

  try {
    // 1. Fetch user budgets
    const budgetsRes = await pool.query(
      "SELECT id, category, limit_amount, period FROM budgets WHERE user_id=$1",
      [user_id]
    );
    const budgets = budgetsRes.rows;

    // 2. Fetch user transactions
    const transactionsRes = await pool.query(
        `
        SELECT amount, category
        FROM transactions
        WHERE user_id = $1
            AND date >= date_trunc('month', NOW())
        `,
    [user_id]
    );
    const transactions = transactionsRes.rows.map(tx => ({
      ...tx,
      category: tx.category || [],
    }));

    // 3. Compute insights
    const insights = computeInsights(budgets, transactions);

    res.json(insights);
  } catch (err: any) {
    console.error("Error fetching insights:", err.message);
    res.status(500).json({ error: "Failed to compute insights" });
  }
});

export default router;
