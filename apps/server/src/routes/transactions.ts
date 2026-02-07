import { Router } from "express";
import { Pool } from "pg";

const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * POST /api/v1/transactions/manual
 * Body: { user_id, amount, direction, name, transactionDate, categoryId }
 * Creates a manual transaction and assigns it to the given category.
 */
router.post("/manual", async (req, res) => {
  const {
    user_id,
    amount,
    direction,
    name,
    transactionDate,
    categoryId,
  } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: "Missing user_id" });
  }
  if (amount === undefined || amount === null) {
    return res.status(400).json({ error: "Missing amount" });
  }
  const amountNum = Number(amount);
  if (Number.isNaN(amountNum) || amountNum <= 0) {
    return res.status(400).json({ error: "amount must be a positive number" });
  }
  if (!direction || !["debit", "credit"].includes(direction)) {
    return res.status(400).json({ error: "direction must be 'debit' or 'credit'" });
  }
  if (!transactionDate || !DATE_REGEX.test(String(transactionDate).trim())) {
    return res.status(400).json({
      error: "transactionDate is required and must be YYYY-MM-DD",
    });
  }
  if (categoryId === undefined || categoryId === null) {
    return res.status(400).json({ error: "Missing categoryId" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const txRes = await client.query(
      `INSERT INTO transactions (
        user_id, account_id, plaid_item_id, plaid_transaction_id,
        amount, direction, name, merchant_name, transaction_date, pending, is_manual
      )
       VALUES ($1, NULL, NULL, NULL, $2, $3, $4, NULL, $5::date, FALSE, TRUE)
       RETURNING id, user_id, amount, direction, name, transaction_date, is_manual, created_at`,
      [
        user_id,
        amountNum,
        direction,
        name ?? null,
        String(transactionDate).trim(),
      ]
    );

    const transaction = txRes.rows[0];

    await client.query(
      `INSERT INTO transaction_categories (transaction_id, category_id, source)
       VALUES ($1, $2, 'user')`,
      [transaction.id, categoryId]
    );

    await client.query("COMMIT");

    res.status(201).json(transaction);
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error creating manual transaction:", message);
    res.status(500).json({ error: "Failed to create manual transaction" });
  } finally {
    client.release();
  }
});

export default router;
