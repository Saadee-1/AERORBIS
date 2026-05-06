const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

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
  if (!GEMINI_API_KEY) {
    return { content: "", error: "Gemini API key not configured." };
  }

  // Convert messages to Gemini format
  // Gemini uses "model" instead of "assistant", no "system" role in contents
  const contents = messages
    .filter(m => m.role !== "system")
    .map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  try {
    const response = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.max_tokens ?? 2048,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { content: "", error: `Gemini API error ${response.status}: ${errText}` };
    }

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!content) {
      return { content: "", error: "No response from Gemini" };
    }

    return { content };
  } catch (err) {
    return { content: "", error: err instanceof Error ? err.message : "Network error" };
  }
}