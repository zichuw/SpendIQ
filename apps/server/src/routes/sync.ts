import { Router } from "express";
import { Pool } from "pg";

const router = Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// --------------------
// Get Plaid sync status
// --------------------
router.get("/status", async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({
      error: "Missing required query parameter: user_id",
    });
  }

  try {
    // Get the most recent transaction sync time
    const syncRes = await pool.query(
      `SELECT MAX(transaction_date) as last_sync
       FROM transactions
       WHERE user_id = $1`,
      [user_id]
    );

    const lastTransactionDate = syncRes.rows[0]?.last_sync;
    const lastTransactionSyncAt = lastTransactionDate
      ? new Date(lastTransactionDate).toISOString()
      : null;

    // Count connected institutions (plaid items)
    const institutionRes = await pool.query(
      `SELECT COUNT(DISTINCT plaid_item_id) as count
       FROM plaid_items
       WHERE user_id = $1 AND status = 'active'`,
      [user_id]
    );

    const institutionCount = institutionRes.rows[0]?.count ?? 0;

    res.json({
      status: "ok",
      lastTransactionSyncAt,
      institutionCount: Number(institutionCount),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error fetching sync status:", message);
    res.status(500).json({ error: "Failed to fetch sync status" });
  }
});

export default router;
