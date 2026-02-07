// routes/plaid.ts
import { Router } from "express";
import { plaidClient } from "../config/plaid";
import { Products, CountryCode } from "plaid";
import { Pool } from "pg";

const router = Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// --------------------
// 1. Create Link Token
// --------------------
router.post("/create-link-token", async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) return res.status(400).json({ error: "Missing user_id" });

  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: String(user_id) },
      client_name: "Finance App",
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: "en",
    });

    res.json(response.data);
  } catch (err: unknown) {
    const msg = err && typeof err === "object" && "response" in err
      ? (err as { response?: { data?: unknown } }).response?.data
      : err;
    console.error("Error creating link token:", msg);
    res.status(500).json({ error: "Failed to create link token" });
  }
});

// --------------------
// 2. Exchange Public Token → plaid_items + accounts
// --------------------
router.post("/exchange-public-token", async (req, res) => {
  const { public_token, user_id } = req.body;

  if (!public_token || !user_id)
    return res.status(400).json({ error: "Missing public_token or user_id" });

  try {
    const response = await plaidClient.itemPublicTokenExchange({ public_token });
    const access_token = response.data.access_token;
    const item_id = response.data.item_id; // Plaid's item_id (string)

    // Store in plaid_items (access_token_encrypted: MVP store as plain; add encryption later)
    const insertItem = await pool.query(
      `INSERT INTO plaid_items (user_id, plaid_item_id, access_token_encrypted, status)
       VALUES ($1, $2, $3, 'active')
       ON CONFLICT (user_id, plaid_item_id)
       DO UPDATE SET access_token_encrypted = $3, status = 'active'
       RETURNING id, plaid_item_id`,
      [user_id, item_id, access_token]
    );

    const plaidItemRow = insertItem.rows[0];
    const our_plaid_item_id = plaidItemRow.id;

    // Fetch and store accounts
    const accountsRes = await plaidClient.accountsGet({ access_token });
    const accounts = accountsRes.data.accounts;

    for (const acc of accounts) {
      await pool.query(
        `INSERT INTO accounts (user_id, plaid_item_id, plaid_account_id, name, type, subtype, current_balance, available_balance)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (plaid_account_id) DO UPDATE SET
           name = $4, type = $5, subtype = $6, current_balance = $7, available_balance = $8`,
        [
          user_id,
          our_plaid_item_id,
          acc.account_id,
          acc.name ?? "",
          acc.type ?? "unknown",
          acc.subtype ?? null,
          acc.balances?.current ?? null,
          acc.balances?.available ?? null,
        ]
      );
    }

    res.json({ item_id, plaid_item_id: our_plaid_item_id });
  } catch (err: unknown) {
    const responseData =
      err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: unknown } }).response?.data
        : null;
    const plaidMessage =
      responseData &&
      typeof responseData === "object" &&
      responseData !== null &&
      "error_message" in responseData
        ? String((responseData as { error_message?: unknown }).error_message)
        : null;
    const detail =
      plaidMessage ||
      (err instanceof Error ? err.message : responseData ? String(responseData) : String(err));
    console.error("Error exchanging public token:", responseData ?? err);
    res.status(500).json({
      error: "Failed to exchange token",
      detail,
    });
  }
});

// --------------------
// 3. Fetch Transactions → transactions table, update last_sync_at
// --------------------
router.get("/transactions/:user_id/:item_id", async (req, res) => {
  const { user_id, item_id } = req.params;
  // item_id can be Plaid's plaid_item_id (string) or our numeric id
  const isNumeric = /^\d+$/.test(item_id);

  try {
    const row = await pool.query(
      isNumeric
        ? "SELECT id, access_token_encrypted AS access_token FROM plaid_items WHERE user_id = $1 AND id = $2"
        : "SELECT id, access_token_encrypted AS access_token FROM plaid_items WHERE user_id = $1 AND plaid_item_id = $2",
      [user_id, item_id]
    );

    if (row.rowCount === 0)
      return res.status(404).json({ error: "Plaid item not found" });

    const { id: our_plaid_item_id, access_token } = row.rows[0];

    const today = new Date().toISOString().split("T")[0];
    const transactionsRes = await plaidClient.transactionsGet({
      access_token,
      start_date: "2020-01-01",
      end_date: today,
    });

    const transactions = transactionsRes.data.transactions;

    // Map Plaid account_id → our accounts.id
    const accountRows = await pool.query(
      "SELECT id, plaid_account_id FROM accounts WHERE plaid_item_id = $1",
      [our_plaid_item_id]
    );
    const accountIdByPlaid: Record<string, number> = {};
    for (const r of accountRows.rows) accountIdByPlaid[r.plaid_account_id] = r.id;

    for (const tx of transactions) {
      const our_account_id = accountIdByPlaid[tx.account_id] ?? null;
      const amount = Number(tx.amount);
      const positiveAmount = Math.abs(amount);
      const direction = amount <= 0 ? "debit" : "credit";

      await pool.query(
        `INSERT INTO transactions (
          user_id, account_id, plaid_item_id, plaid_transaction_id,
          amount, direction, name, merchant_name, transaction_date, pending, is_manual
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, FALSE)
         ON CONFLICT (plaid_transaction_id) DO NOTHING`,
        [
          user_id,
          our_account_id,
          our_plaid_item_id,
          tx.transaction_id,
          positiveAmount,
          direction,
          tx.name ?? null,
          tx.merchant_name ?? null,
          tx.date,
          tx.pending ?? false,
        ]
      );
    }

    await pool.query(
      "UPDATE plaid_items SET last_sync_at = NOW() WHERE id = $1",
      [our_plaid_item_id]
    );

    res.json(transactions);
  } catch (err: unknown) {
    const msg = err && typeof err === "object" && "response" in err
      ? (err as { response?: { data?: unknown } }).response?.data
      : err;
    console.error("Error fetching transactions:", msg);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// --------------------
// 4. Optional Plaid Webhook
// --------------------
router.post("/webhook", (req, res) => {
  const event = req.body;
  console.log("Received Plaid webhook:", event);
  res.sendStatus(200);
});

export default router;
