import { supabase } from '@/integrations/supabase/client';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_FUNCTION_AI_GATEWAY = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/ai-gateway` : undefined;

export type GeminiResult =
  | { ok: true; content: string }
  | { ok: false; reason: "AI_DISABLED" | "NETWORK_ERROR" | "BAD_RESPONSE"; detail?: string };

export function isSmartAiEnabled(): boolean {
  return !!GROQ_API_KEY || !!SUPABASE_FUNCTION_AI_GATEWAY;
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

  if (!SUPABASE_FUNCTION_AI_GATEWAY) {
    return { ok: false, reason: "AI_DISABLED", detail: "Groq API key not configured and no proxy endpoint is available." };
  }

  try {
    const { data: session } = await supabase.auth.getSession();
    const authHeader = session?.session?.access_token
      ? `Bearer ${session.session.access_token}`
      : undefined;

    if (!authHeader) {
      return { ok: false, reason: "AI_DISABLED", detail: "Please sign in to use Smart AI or configure VITE_GROQ_API_KEY." };
    }

    const response = await fetch(SUPABASE_FUNCTION_AI_GATEWAY, {
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
