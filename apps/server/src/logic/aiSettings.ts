// logic/aiSettings.ts
// Helpers for AI personality settings (stored in user_settings table)

export interface AISettings {
  personalities: string[]; // e.g., ["nice", "humorous"]
  frugalScore: number; // 0-100, controls strictness of spending advice
  adviceScore: number; // 0-100, controls analysis vs action orientation
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  personalities: ["nice"],
  frugalScore: 55,
  adviceScore: 60,
};

/**
 * Build a system prompt based on AI personality settings
 */
export function buildAISystemPrompt(aiSettings: AISettings): string {
  const { personalities, frugalScore, adviceScore } = aiSettings;

  // Build tone description
  const toneBase =
    personalities.length === 0
      ? "neutral and helpful"
      : personalities.join(", ");

  // Build frugal instruction
  let frugalInstruction = "";
  if (frugalScore >= 70) {
    frugalInstruction =
      "Be strict and firm about spending limits. Flag discretionary spending and emphasize budget discipline.";
  } else if (frugalScore >= 40) {
    frugalInstruction =
      "Provide balanced guidance on spending. Permit reasonable discretionary spending within budgets.";
  } else {
    frugalInstruction =
      "Be generous in your interpretation of budgets. Emphasize enjoying life while staying roughly on track.";
  }

  // Build advice orientation
  let adviceOrientation = "";
  if (adviceScore >= 60) {
    adviceOrientation =
      "Focus on concrete actions and specific steps the user should take immediately. Be directive and prescriptive.";
  } else if (adviceScore >= 40) {
    adviceOrientation =
      "Provide a balanced mix of analysis and actionable advice. Explain the situation and suggest next steps.";
  } else {
    adviceOrientation =
      "Focus on thorough analysis and diagnosis of spending patterns. Explain the 'why' before suggesting actions.";
  }

  // Special tone modifiers
  let toneModifiers = "";
  if (personalities.includes("sarcastic") || personalities.includes("direct")) {
    toneModifiers =
      "Use direct language, avoid sugar-coating. Be straightforward about spending issues.";
  } else if (personalities.includes("nice") || personalities.includes("cute")) {
    toneModifiers =
      "Be warm and encouraging. Use supportive language even when discussing budget concerns.";
  }
  if (personalities.includes("humorous")) {
    toneModifiers +=
      "Use light humor and wit where appropriate to keep the tone engaging.";
  }

  return `You are a personal financial assistant for SpendIQ, helping users manage their budgets and spending.

Tone: ${toneBase}
${toneModifiers ? `Personality modifiers: ${toneModifiers}` : ""}

Strictness & spending guidance:
${frugalInstruction}

Response style:
${adviceOrientation}

Guidelines:
- Keep responses concise and actionable (2-3 sentences typically)
- Reference specific budget categories and amounts when relevant
- Use the user's currency preference in responses
- Be empathetic but direct about overspending
- Celebrate when users are on track with their budgets
- Focus on the current month's budget unless asked about trends`;
}

/**
 * Validates AI settings from user input
 */
export function validateAISettings(settings: unknown): settings is AISettings {
  if (!settings || typeof settings !== "object") return false;

  const s = settings as Record<string, unknown>;

  // Validate personalities array
  if (!Array.isArray(s.personalities)) return false;
  if (
    !s.personalities.every(
      (p) =>
        typeof p === "string" &&
        ["humorous", "sarcastic", "nice", "cute", "direct", "coach"].includes(p)
    )
  ) {
    return false;
  }

  // Validate frugalScore (0-100)
  if (typeof s.frugalScore !== "number") return false;
  if (s.frugalScore < 0 || s.frugalScore > 100) return false;

  // Validate adviceScore (0-100)
  if (typeof s.adviceScore !== "number") return false;
  if (s.adviceScore < 0 || s.adviceScore > 100) return false;

  return true;
}
