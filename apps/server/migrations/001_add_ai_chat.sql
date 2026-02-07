-- Migration: 001_add_ai_chat.sql
-- Adds AI settings to user_settings and creates chat_messages table

BEGIN;

-- Step 1: Add AI personality settings columns
ALTER TABLE IF EXISTS user_settings
  ADD COLUMN IF NOT EXISTS ai_personalities VARCHAR DEFAULT '["nice"]',
  ADD COLUMN IF NOT EXISTS ai_frugal_score INTEGER DEFAULT 55,
  ADD COLUMN IF NOT EXISTS ai_advice_score INTEGER DEFAULT 60;

-- Step 2: Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(user_id, created_at DESC);

COMMIT;
