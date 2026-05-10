const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY as string;
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

export type GeminiResult =
  | { ok: true; content: string }
  | { ok: false; reason: "AI_DISABLED" | "NETWORK_ERROR" | "BAD_RESPONSE"; detail?: string };

export function isSmartAiEnabled(): boolean {
  return !!GROQ_API_KEY;
}

export async function callGeminiJSON(prompt: string): Promise<GeminiResult> {
  if (!GROQ_API_KEY) {
    return { ok: false, reason: "AI_DISABLED", detail: "Groq API key not configured." };
  }

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: "You are an aerospace engineering assistant. Respond only with valid JSON. No markdown, no explanation, just raw JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      return { ok: false, reason: "NETWORK_ERROR", detail: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "";

    if (!content) {
      return { ok: false, reason: "BAD_RESPONSE", detail: "Empty response" };
    }

    return { ok: true, content };
  } catch (err) {
    return { ok: false, reason: "NETWORK_ERROR", detail: err instanceof Error ? err.message : "Unknown error" };
  }
}