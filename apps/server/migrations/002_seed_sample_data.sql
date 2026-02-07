-- Seed sample data for testing AI endpoints
-- NOTE: Adjust IDs and values if your schema differs.

BEGIN;

-- Ensure a test user exists
INSERT INTO users (id, email, name)
VALUES (1, 'test@example.com', 'Test User')
ON CONFLICT (id) DO NOTHING;

-- Ensure user_settings exists for user 1
INSERT INTO user_settings (user_id, timezone, currency_code, include_pending_in_insights, ai_personalities, ai_frugal_score, ai_advice_score)
VALUES (1, 'America/New_York', 'USD', FALSE, '["nice"]', 55, 60)
ON CONFLICT (user_id) DO UPDATE
  SET timezone = EXCLUDED.timezone
    , currency_code = EXCLUDED.currency_code
    , include_pending_in_insights = EXCLUDED.include_pending_in_insights
    , ai_personalities = EXCLUDED.ai_personalities
    , ai_frugal_score = EXCLUDED.ai_frugal_score
    , ai_advice_score = EXCLUDED.ai_advice_score;

-- Sample categories (if your app already inserts categories, these will conflict by name and can be skipped)
INSERT INTO categories (id, name) VALUES
  (100, 'Dining'),
  (101, 'Groceries'),
  (102, 'Transport')
ON CONFLICT (id) DO NOTHING;

-- Create a sample budget for current month
WITH now_dt AS (SELECT CURRENT_DATE AS d)
INSERT INTO budgets (user_id, period_start, period_end, total_budget_amount)
SELECT 1, date_trunc('month', d)::date, (date_trunc('month', d)::date + INTERVAL '1 month' - INTERVAL '1 day')::date, 2000
FROM now_dt
ON CONFLICT DO NOTHING;

-- Link budget lines to categories (if budget exists)
INSERT INTO budget_lines (budget_id, category_id, planned_amount)
SELECT b.id, c.id, planned
FROM budgets b
JOIN (VALUES (100, 300), (101, 500), (102, 150)) AS plan(category_id, planned) ON TRUE
JOIN categories c ON c.id = plan.category_id
WHERE b.user_id = 1 AND b.period_start = date_trunc('month', CURRENT_DATE)::date
ON CONFLICT DO NOTHING;

-- Sample transactions for current month
-- Note: omit `description` column (may not exist in your schema)
INSERT INTO transactions (user_id, transaction_date, amount, direction, pending)
VALUES
  (1, CURRENT_DATE - INTERVAL '5 days', 45.5, 'debit', FALSE),
  (1, CURRENT_DATE - INTERVAL '10 days', 120.0, 'debit', FALSE),
  (1, CURRENT_DATE - INTERVAL '2 days', 15.0, 'debit', FALSE)
ON CONFLICT DO NOTHING;

-- Link transactions to categories (assumes transactions.id serial)
-- This block attempts to link the last 3 inserted transactions to categories above.
WITH latest_tx AS (
  SELECT id FROM transactions WHERE user_id = 1 ORDER BY created_at DESC LIMIT 3
), cats AS (
  SELECT id, name FROM categories WHERE id IN (100,101,102) ORDER BY id
)
INSERT INTO transaction_categories (transaction_id, category_id)
SELECT lt.id, c.id
FROM (SELECT id, row_number() OVER () rn FROM latest_tx) lt
JOIN (SELECT id, row_number() OVER () rn FROM cats) c ON lt.rn = c.rn
ON CONFLICT DO NOTHING;

COMMIT;
