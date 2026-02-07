// routes/user-settings.ts
import { Router } from "express";
import { Pool } from "pg";
import {
  UserSettings,
  DEFAULT_USER_SETTINGS,
  validateSettingsUpdate,
} from "../logic/userSettings";

const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * GET /api/v1/user-settings/:user_id
 * Fetch user settings (returns defaults if not found)
 */
router.get("/:user_id", async (req, res) => {
  const { user_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, user_id, timezone, currency_code, week_starts_on,
              status_on_track_max, status_tight_max, baseline_months,
              include_pending_in_insights, insights_enabled,
              encouragement_insights_enabled, spike_alert_threshold_pct,
              created_at, updated_at
       FROM user_settings
       WHERE user_id = $1`,
      [user_id]
    );

    if (result.rowCount === 0) {
      // Return defaults if user hasn't created settings
      return res.json({
        user_id: parseInt(user_id),
        ...DEFAULT_USER_SETTINGS,
        id: null,
        created_at: null,
        updated_at: null,
      });
    }

    res.json(result.rows[0]);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error fetching user settings:", message);
    res.status(500).json({ error: "Failed to fetch user settings" });
  }
});

/**
 * POST /api/v1/user-settings/:user_id
 * Create/initialize user settings (idempotent with ON CONFLICT)
 */
router.post("/:user_id", async (req, res) => {
  const { user_id } = req.params;
  const settings = req.body;

  if (!validateSettingsUpdate(settings)) {
    return res.status(400).json({
      error: "Invalid settings object. Check field names and types.",
    });
  }

  try {
    // Merge with defaults
    const merged = { ...DEFAULT_USER_SETTINGS, ...settings };

    const result = await pool.query(
      `INSERT INTO user_settings (
        user_id, timezone, currency_code, week_starts_on,
        status_on_track_max, status_tight_max, baseline_months,
        include_pending_in_insights, insights_enabled,
        encouragement_insights_enabled, spike_alert_threshold_pct
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (user_id) DO NOTHING
       RETURNING id, user_id, timezone, currency_code, week_starts_on,
                 status_on_track_max, status_tight_max, baseline_months,
                 include_pending_in_insights, insights_enabled,
                 encouragement_insights_enabled, spike_alert_threshold_pct,
                 created_at, updated_at`,
      [
        user_id,
        merged.timezone,
        merged.currency_code,
        merged.week_starts_on,
        merged.status_on_track_max,
        merged.status_tight_max,
        merged.baseline_months,
        merged.include_pending_in_insights,
        merged.insights_enabled,
        merged.encouragement_insights_enabled,
        merged.spike_alert_threshold_pct,
      ]
    );

    if (result.rowCount === 0) {
      // Already exists, fetch and return it
      const fetch = await pool.query(
        `SELECT id, user_id, timezone, currency_code, week_starts_on,
                status_on_track_max, status_tight_max, baseline_months,
                include_pending_in_insights, insights_enabled,
                encouragement_insights_enabled, spike_alert_threshold_pct,
                created_at, updated_at
         FROM user_settings WHERE user_id = $1`,
        [user_id]
      );
      return res.status(200).json(fetch.rows[0]);
    }

    res.status(201).json(result.rows[0]);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error creating user settings:", message);
    res.status(500).json({ error: "Failed to create user settings" });
  }
});

/**
 * PATCH /api/v1/user-settings/:user_id
 * Update user settings (partial update)
 */
router.patch("/:user_id", async (req, res) => {
  const { user_id } = req.params;
  const updates = req.body;

  if (!validateSettingsUpdate(updates) || Object.keys(updates).length === 0) {
    return res.status(400).json({
      error: "No valid settings to update.",
    });
  }

  try {
    // Build dynamic UPDATE query
    const allowedFields = Object.keys(updates);
    const setClause = allowedFields
      .map((field, idx) => `${field} = $${idx + 2}`)
      .join(", ");
    const values = [user_id, ...Object.values(updates)];

    const result = await pool.query(
      `UPDATE user_settings
       SET ${setClause}, updated_at = NOW()
       WHERE user_id = $1
       RETURNING id, user_id, timezone, currency_code, week_starts_on,
                 status_on_track_max, status_tight_max, baseline_months,
                 include_pending_in_insights, insights_enabled,
                 encouragement_insights_enabled, spike_alert_threshold_pct,
                 created_at, updated_at`,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User settings not found" });
    }

    res.json(result.rows[0]);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error updating user settings:", message);
    res.status(500).json({ error: "Failed to update user settings" });
  }
});

/**
 * DELETE /api/v1/user-settings/:user_id
 * Delete user settings (cascade deletes via FK)
 */
router.delete("/:user_id", async (req, res) => {
  const { user_id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM user_settings WHERE user_id = $1 RETURNING id",
      [user_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User settings not found" });
    }

    res.json({ message: "User settings deleted", user_id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error deleting user settings:", message);
    res.status(500).json({ error: "Failed to delete user settings" });
  }
});

export default router;
