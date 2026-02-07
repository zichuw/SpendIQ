// routes/plaid.ts
import { Router } from "express";
import { plaidClient } from "../config/plaid";
import { Products, CountryCode } from "plaid";
import { Pool } from "pg";

const router = Router();

// Setup Postgres connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // must be in your .env
});

// --------------------
// 1. Create Link Token
// --------------------
router.post("/create-link-token", async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) return res.status(400).json({ error: "Missing user_id" });

  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user_id },
      client_name: "Finance App",
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: "en",
    });

    res.json(response.data);
  } catch (err: any) {
    console.error("Error creating link token:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to create link token" });
  }
});

// --------------------
// 2. Exchange Public Token
// --------------------
router.post("/exchange-public-token", async (req, res) => {
  const { public_token, user_id } = req.body;

  if (!public_token || !user_id)
    return res.status(400).json({ error: "Missing public_token or user_id" });

  try {
    const response = await plaidClient.itemPublicTokenExchange({ public_token });
    const access_token = response.data.access_token;
    const item_id = response.data.item_id;

    // Save access_token & item_id to DB
    await pool.query(
      `INSERT INTO user_plaid_tokens (user_id, item_id, access_token, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, item_id) DO UPDATE SET access_token = $3`,
      [user_id, item_id, access_token]
    );

    res.json({ item_id });
  } catch (err: any) {
    console.error("Error exchanging public token:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to exchange public token" });
  }
});

// --------------------
// 3. Fetch Transactions
// --------------------
router.get("/transactions/:user_id/:item_id", async (req, res) => {
  const { user_id, item_id } = req.params;

  try {
    // Fetch access_token from DB
    const tokenResult = await pool.query(
      "SELECT access_token FROM user_plaid_tokens WHERE user_id = $1 AND item_id = $2",
      [user_id, item_id]
    );

    if (tokenResult.rowCount === 0)
      return res.status(404).json({ error: "Access token not found" });

    const access_token = tokenResult.rows[0].access_token;

    // Fetch transactions from Plaid
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const transactionsRes = await plaidClient.transactionsGet({
      access_token,
      start_date: "2026-01-01",
      end_date: today,
    });

    const transactions = transactionsRes.data.transactions;

    for (const tx of transactions) {
      await pool.query(
        `INSERT INTO transactions
          (user_id, item_id, transaction_id, amount, category, date, name, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (transaction_id) DO NOTHING`,
        [user_id, item_id, tx.transaction_id, tx.amount, tx.category, tx.date, tx.name]
      );
    }

    res.json(transactions);
  } catch (err: any) {
    console.error("Error fetching transactions:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// --------------------
// 4. Optional Plaid Webhook
// --------------------
router.post("/webhook", (req, res) => {
  const event = req.body;
  console.log("Received Plaid webhook:", event);
  // TODO: handle events like TRANSACTIONS_REMOVED, INITIAL_UPDATE, etc.
  res.sendStatus(200);
});

export default router;