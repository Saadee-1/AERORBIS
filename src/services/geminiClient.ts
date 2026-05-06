const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

export type GeminiResult =
  | { ok: true; content: string }
  | { ok: false; reason: "AI_DISABLED" | "NETWORK_ERROR" | "BAD_RESPONSE"; detail?: string };

export function isSmartAiEnabled(): boolean {
  return !!GEMINI_API_KEY;
}

export async function callGeminiJSON(prompt: string): Promise<GeminiResult> {
  if (!GEMINI_API_KEY) {
    return { ok: false, reason: "AI_DISABLED", detail: "Gemini API key not configured." };
  }

  try {
    const response = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        systemInstruction: {
          parts: [{ text: "You are an aerospace engineering assistant. Respond only with valid JSON. No markdown, no explanation, just raw JSON." }]
        },
        generationConfig: { temperature: 0.3, maxOutputTokens: 2000 },
      }),
    });

    if (!response.ok) {
      return { ok: false, reason: "NETWORK_ERROR", detail: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!content) {
      return { ok: false, reason: "BAD_RESPONSE", detail: "Empty response from Gemini" };
    }

    return { ok: true, content };
  } catch (err) {
    return { ok: false, reason: "NETWORK_ERROR", detail: err instanceof Error ? err.message : "Unknown error" };
  }
}