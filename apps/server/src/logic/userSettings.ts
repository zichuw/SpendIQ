// logic/userSettings.ts
// Helpers for user_settings table operations

export interface UserSettings {
  id: number;
  user_id: number;
  timezone: string;
  currency_code: string;
  week_starts_on: 0 | 1; // 0=Sunday, 1=Monday
  status_on_track_max: number;
  status_tight_max: number;
  baseline_months: number;
  include_pending_in_insights: boolean;
  insights_enabled: boolean;
  encouragement_insights_enabled: boolean;
  spike_alert_threshold_pct: number;
  ai_personalities: string[]; // JSON array stored as string "[]"
  ai_frugal_score: number;
  ai_advice_score: number;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_USER_SETTINGS = {
  timezone: "America/New_York",
  currency_code: "USD",
  week_starts_on: 0,
  status_on_track_max: 0.85,
  status_tight_max: 1.0,
  baseline_months: 6,
  include_pending_in_insights: false,
  insights_enabled: true,
  encouragement_insights_enabled: true,
  spike_alert_threshold_pct: 0.25,
  ai_personalities: ["nice"],
  ai_frugal_score: 55,
  ai_advice_score: 60,
};

/**
 * Validates that settings updates contain only valid fields and values
 */
export function validateSettingsUpdate(
  update: unknown
): update is Partial<
  Omit<UserSettings, "id" | "user_id" | "created_at" | "updated_at">
> {
  if (!update || typeof update !== "object") return false;

  const allowed = [
    "timezone",
    "currency_code",
    "week_starts_on",
    "status_on_track_max",
    "status_tight_max",
    "baseline_months",
    "include_pending_in_insights",
    "insights_enabled",
    "encouragement_insights_enabled",
    "spike_alert_threshold_pct",
    "ai_personalities",
    "ai_frugal_score",
    "ai_advice_score",
  ];

  const keys = Object.keys(update);
  return keys.every((k) => allowed.includes(k));
}

