import { Router } from "express";
import { Pool } from "pg";

const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

type ProfileStatus = "connected" | "needs re-auth" | "sync issue";

interface AccountRow {
  id: number;
  name: string;
  type: string | null;
  subtype: string | null;
  plaid_account_id: string | null;
  current_balance: number | string | null;
  item_status: string | null;
}

function toTitleCase(value: string): string {
  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

function mapType(value: string | null): "checking" | "credit" | "savings" {
  const normalized = (value ?? "").toLowerCase();
  if (normalized === "credit") return "credit";
  if (normalized === "savings") return "savings";
  return "checking";
}

function mapStatus(value: string | null): ProfileStatus {
  if (value === "active") return "connected";
  if (value === "needs_reauth" || value === "needs re-auth") return "needs re-auth";
  return "sync issue";
}

router.get("/:user_id", async (req, res) => {
  const { user_id } = req.params;

  try {
    const [accountsRes, settingsRes] = await Promise.all([
      pool.query(
        `SELECT a.id, a.name, a.type, a.subtype, a.plaid_account_id, a.current_balance,
                pi.status AS item_status
         FROM accounts a
         LEFT JOIN plaid_items pi ON pi.id = a.plaid_item_id
         WHERE a.user_id = $1
         ORDER BY a.id DESC`,
        [user_id]
      ),
      pool.query(
        `SELECT timezone, currency_code
         FROM user_settings
         WHERE user_id = $1`,
        [user_id]
      ),
    ]);

    const accounts = (accountsRes.rows as AccountRow[]).map((row) => {
      const displayType = row.subtype ?? row.type ?? "Account";
      const suffix = row.plaid_account_id?.slice(-4) ?? "0000";

      return {
        id: String(row.id),
        institution: toTitleCase(displayType),
        nickname: row.name || "Linked Account",
        type: mapType(row.type),
        maskedNumber: `**** ${suffix}`,
        balance: Number(row.current_balance ?? 0),
        status: mapStatus(row.item_status),
      };
    });

    const settingsRow = settingsRes.rows[0] as { timezone?: string; currency_code?: string } | undefined;
    const settings = {
      timezone: settingsRow?.timezone ?? "America/New_York",
      currencyCode: settingsRow?.currency_code ?? "USD",
    };

    res.json({ accounts, settings });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error fetching profile data:", message);
    res.status(500).json({ error: "Failed to fetch profile data" });
  }
});

export default router;
