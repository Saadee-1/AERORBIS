import { auth } from '@/config/firebase';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
const GROQ_ENDPOINT = import.meta.env.DEV
  ? "/api-groq/openai/v1/chat/completions"
  : "https://corsproxy.io/?url=https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const FIREBASE_FUNCTION_AI_GATEWAY = "https://us-central1-aerorbis-dad0a.cloudfunctions.net/aiGateway";

const SYSTEM_PROMPT = `You are Aerobot, an expert aerospace engineering AI assistant built into AERORBIS. You have deep knowledge of aerodynamics, propulsion, orbital mechanics, atmospheric science, structures, materials science, and flight systems. When explaining calculations, provide expert-level interpretation with physical intuition, real-world context, and actionable insights. Be concise but thorough. Always respond in the same language the user writes in.`;

export interface AerobotMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AerobotResponse {
  content: string;
  error?: string;
}

export async function callAerobotAPI(
  messages: AerobotMessage[],
  options: { temperature?: number; max_tokens?: number } = {}
): Promise<AerobotResponse> {
  const groqMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.filter(m => m.role !== "system").map(m => ({
      role: m.role,
      content: m.content,
    })),
  ];

  const payload = {
    model: GROQ_MODEL,
    messages: groqMessages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 2048,
  };

  if (GROQ_API_KEY) {
    try {
      const response = await fetch(GROQ_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        return { content: "", error: `Groq API error ${response.status}: ${errText}` };
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content || "";

      if (!content) {
        return { content: "", error: "No response from Groq" };
      }

      return { content };
    } catch (err) {
      return { content: "", error: err instanceof Error ? err.message : "Network error" };
    }
  }

  if (!FIREBASE_FUNCTION_AI_GATEWAY) {
    return { content: "", error: "Groq API key not configured and no proxy endpoint is available." };
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
      return { content: "", error: "Please sign in to use Aerobot AI or configure VITE_GROQ_API_KEY." };
    }

    const response = await fetch(FIREBASE_FUNCTION_AI_GATEWAY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { content: "", error: `AI gateway error ${response.status}: ${errText}` };
    }

    const data = await response.json();
    const content = data?.content || "";

    if (!content) {
      return { content: "", error: "No content returned from AI gateway." };
    }

    return { content };
  } catch (err) {
    return { content: "", error: err instanceof Error ? err.message : "AI gateway network error" };
  }
}
