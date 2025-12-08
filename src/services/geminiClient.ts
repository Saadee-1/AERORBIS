/**
 * Gemini API Client
 * Simple wrapper for calling Gemini via Lovable AI Gateway
 * Reuses the same API key and configuration as the rest of the app
 */

export type GeminiResult =
  | { ok: true; content: string }
  | { ok: false; reason: "AI_DISABLED" | "NETWORK_ERROR" | "BAD_RESPONSE"; detail?: string };

/**
 * Check if Smart AI is enabled (API key is configured)
 */
export function isSmartAiEnabled(): boolean {
  const apiKey = 
    import.meta.env.VITE_LOVABLE_API_KEY || 
    import.meta.env.VITE_AEROBOT_API_KEY ||
    import.meta.env.VITE_GEMINI_API_KEY;
  return !!apiKey;
}

/**
 * Call Gemini and return a structured result
 * @param prompt - The prompt to send to Gemini
 * @returns Structured result with success/error information
 */
export async function callGeminiJSON(prompt: string): Promise<GeminiResult> {
  // Check if API key is configured
  const apiKey = 
    import.meta.env.VITE_LOVABLE_API_KEY || 
    import.meta.env.VITE_AEROBOT_API_KEY ||
    import.meta.env.VITE_GEMINI_API_KEY;
  
  const apiUrl = import.meta.env.VITE_AI_GATEWAY_URL || 'https://ai.gateway.lovable.dev/v1/chat/completions';
  const model = import.meta.env.VITE_GEMINI_MODEL || 'google/gemini-2.5-flash';

  if (!apiKey) {
    return {
      ok: false,
      reason: "AI_DISABLED",
      detail: "AI API key is not configured. Please set VITE_LOVABLE_API_KEY, VITE_AEROBOT_API_KEY, or VITE_GEMINI_API_KEY in your environment variables.",
    };
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an aerospace engineering assistant. Respond only with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent JSON output
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorDetail = errorData.error?.message || errorDetail;
      } catch {
        // If JSON parsing fails, use the status text
      }
      return {
        ok: false,
        reason: "NETWORK_ERROR",
        detail: `Smart AI HTTP error ${response.status}: ${response.statusText}. ${errorDetail}`,
      };
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      return {
        ok: false,
        reason: "BAD_RESPONSE",
        detail: `Smart AI response parse error: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`,
      };
    }

    const content = data.choices?.[0]?.message?.content || '';

    if (!content) {
      return {
        ok: false,
        reason: "BAD_RESPONSE",
        detail: "No content in Gemini response",
      };
    }

    return { ok: true, content };
  } catch (error) {
    // Network errors, fetch failures, etc.
    return {
      ok: false,
      reason: "NETWORK_ERROR",
      detail: error instanceof Error ? error.message : 'Unknown network error',
    };
  }
}

