import { auth } from '@/config/firebase';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
const GROQ_ENDPOINT = import.meta.env.DEV
  ? "/api-groq/openai/v1/chat/completions"
  : "https://corsproxy.io/?url=https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const FIREBASE_FUNCTION_AI_GATEWAY = "https://us-central1-aerorbis-dad0a.cloudfunctions.net/aiGateway";

export type GeminiResult =
  | { ok: true; content: string }
  | { ok: false; reason: "AI_DISABLED" | "NETWORK_ERROR" | "BAD_RESPONSE"; detail?: string };

export function isSmartAiEnabled(): boolean {
  return !!GROQ_API_KEY || !!FIREBASE_FUNCTION_AI_GATEWAY;
}

export async function callGeminiJSON(prompt: string): Promise<GeminiResult> {
  const requestPayload = {
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: "You are an aerospace engineering assistant. Respond only with valid JSON. No markdown, no explanation, just raw JSON." },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  };

  if (GROQ_API_KEY) {
    try {
      const response = await fetch(GROQ_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify(requestPayload),
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

  if (!FIREBASE_FUNCTION_AI_GATEWAY) {
    return { ok: false, reason: "AI_DISABLED", detail: "Groq API key not configured and no proxy endpoint is available." };
  }

  try {
    let authHeader = "";
    if (auth.currentUser) {
      try {
        const idToken = await auth.currentUser.getIdToken();
        authHeader = `Bearer ${idToken}`;
      } catch (err) {
        console.warn("Failed to get Firebase ID token:", err);
      }
    }

    if (!authHeader) {
      return { ok: false, reason: "AI_DISABLED", detail: "Please sign in to use Smart AI or configure VITE_GROQ_API_KEY." };
    }

    const response = await fetch(FIREBASE_FUNCTION_AI_GATEWAY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      return { ok: false, reason: "NETWORK_ERROR", detail: `AI gateway HTTP ${response.status}` };
    }

    const data = await response.json();
    const content = data?.content || "";

    if (!content) {
      return { ok: false, reason: "BAD_RESPONSE", detail: "Empty response from AI gateway" };
    }

    return { ok: true, content };
  } catch (err) {
    return { ok: false, reason: "NETWORK_ERROR", detail: err instanceof Error ? err.message : "Unknown error" };
  }
}
