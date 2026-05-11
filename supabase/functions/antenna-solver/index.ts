import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are AERORBIS Antenna Calculator, a precise engineering AI specialized in antenna theory and RF calculations.

CORE COMPETENCE:
- Basic antenna patterns: dipole, monopole, patch, horn, parabolic reflector
- Radiation patterns and directivity calculations
- Basic propagation: free-space path loss (Friis equation)
- Simple link budgets with given parameters

LIMITATIONS - DO NOT HALLUCINATE:
- Do not invent formulas or constants
- Only use well-established equations with citations
- If uncertain about a calculation, state "I need more information" or "This requires specialized software"
- Do not make up numerical results - show exact derivations
- Stick to fundamentals; avoid advanced topics like RCS, SAR, or complex diffraction

RESPONSE FORMAT:
1. State what you're calculating
2. Show the formula with symbols
3. Substitute values step-by-step
4. Give final numerical result
5. End with simple JSON: {"result": number, "unit": "string", "formula": "name"}

SAFETY: When in doubt, err on the side of caution and ask for clarification rather than guessing.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, context } = await req.json();
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    const sys = context
      ? `${SYSTEM_PROMPT}\n\nCURRENT CONTEXT (JSON):\n${JSON.stringify(context).slice(0, 4000)}`
      : SYSTEM_PROMPT;

    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: sys }, ...messages],
        stream: false, // Disable streaming temporarily to test
        temperature: 0.1, // Very low temperature for precise calculations
        max_tokens: 4096,
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded — wait a moment and retry." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (resp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted — top up in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle non-streaming response
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || "No response generated";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("antenna-solver error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});