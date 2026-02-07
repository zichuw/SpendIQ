// logic/chatHistory.ts
// Helpers for managing chat conversation history

export interface ChatMessage {
  id?: number;
  user_id: number;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

const MAX_HISTORY_MESSAGES = 10;

/**
 * Store a chat message in the database
 */
export async function storeChatMessage(
  client: any,
  user_id: number,
  role: "user" | "assistant",
  content: string
): Promise<ChatMessage> {
  const result = await client.query(
    `INSERT INTO chat_messages (user_id, role, content)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, role, content, created_at`,
    [user_id, role, content]
  );

  return result.rows[0];
}

/**
 * Retrieve the last N messages for a user (default: 10)
 * Returns messages in chronological order (oldest first)
 */
export async function getChatHistory(
  client: any,
  user_id: number,
  limit: number = MAX_HISTORY_MESSAGES
): Promise<ChatMessage[]> {
  const result = await client.query(
    `SELECT id, user_id, role, content, created_at
     FROM chat_messages
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [user_id, limit]
  );

  // Return in chronological order (oldest first)
  return result.rows.reverse();
}

/**
 * Get chat history for display/export (most recent first)
 */
export async function getChatHistoryForDisplay(
  client: any,
  user_id: number,
  limit: number = MAX_HISTORY_MESSAGES * 5 // Allow fetching more for display
): Promise<ChatMessage[]> {
  const result = await client.query(
    `SELECT id, user_id, role, content, created_at
     FROM chat_messages
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [user_id, limit]
  );

  return result.rows;
}

/**
 * Delete old messages, keeping only the most recent ones
 * This helps manage database growth for users with lots of history
 */
export async function pruneOldMessages(
  client: any,
  user_id: number,
  keepCount: number = 100
): Promise<number> {
  const result = await client.query(
    `DELETE FROM chat_messages
     WHERE user_id = $1
     AND id NOT IN (
       SELECT id FROM chat_messages
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2
     )`,
    [user_id, keepCount]
  );

  return result.rowCount ?? 0;
}
