// Default user ID for API calls
// In a real app, this would come from authentication context
const DEFAULT_USER_ID = 1;

// API base URL - update this to match your backend (server listens on 3001)
const API_BASE_URL = 'http://localhost:3001/api/v1';

export interface InsightCard {
  kind: 'alert' | 'positive';
  title: string;
  body: string;
  action: string;
}

export interface ChatMessage {
  id: number;
  user_id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

/**
 * Fetch AI insights for a given month
 */
export async function fetchInsights(month?: string): Promise<InsightCard[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: DEFAULT_USER_ID,
        month,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const insights = await response.json();
    // Ensure we have an array of InsightCard objects
    if (!Array.isArray(insights)) {
      return [];
    }
    return insights;
  } catch (error) {
    console.error('Failed to fetch insights:', error);
    return [];
  }
}

/**
 * Send a chat message and get a response
 */
export async function sendChatMessage(message: string, month?: string): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: DEFAULT_USER_ID,
        message,
        month,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    // Backend returns { message: string, tokens_used: number }
    return data.message || '';
  } catch (error) {
    console.error('Failed to send chat message:', error);
    throw error;
  }
}

/**
 * Fetch chat history for the user
 */
export async function fetchChatHistory(limit: number = 50): Promise<ChatMessage[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/history/${DEFAULT_USER_ID}?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const history = await response.json();
    // Ensure we have an array of ChatMessage objects
    if (!Array.isArray(history)) {
      return [];
    }
    return history;
  } catch (error) {
    console.error('Failed to fetch chat history:', error);
    return [];
  }
}
