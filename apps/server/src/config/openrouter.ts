import axios from "axios";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

if (!OPENROUTER_API_KEY) {
  throw new Error("OPENROUTER_API_KEY not set in environment variables");
}

export const openrouterClient = axios.create({
  baseURL: OPENROUTER_BASE_URL,
  headers: {
    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
    "HTTP-Referer": "https://spendiq.app",
    "X-Title": "SpendIQ",
  },
});

export const DEFAULT_LLM_MODEL = "openai/gpt-3.5-turbo";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

export interface LLMResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function callOpenRouter(request: LLMRequest): Promise<string> {
  try {
    const response = await openrouterClient.post<LLMResponse>(
      "/chat/completions",
      request
    );

    const content = response.data.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content in response");
    }

    return content;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    throw new Error(`OpenRouter API error: ${message}`);
  }
}
