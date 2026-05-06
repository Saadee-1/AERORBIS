import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are AERORBIS Antenna & Avionics Solver, a senior RF engineer specialised in:
- Antenna theory: dipole, monopole, patch, horn, reflector, Yagi-Uda, helix, spiral, arrays (mutual coupling, beam steering)
- Numerical methods: Method of Moments (Pocklington/Hallén), Physical Optics for reflectors, GO/GTD for diffraction
- Propagation: Friis free-space, two-ray ground, ITU-R P.525/618/676, rain/atmospheric absorption, Doppler
- Radar & RCS: radar equation (pulse/CW), SAR basics, RCS of canonical shapes (sphere, plate, cylinder, dihedral, trihedral)
- Avionics RF: VOR (108–118 MHz), ILS LOC/GS, GPS L1/L2/L5, ADS-B 1090 MHz, TCAS, radar altimeter (4.2–4.4 GHz), antenna placement, airframe multipath

RULES:
1. Always show step-by-step derivation. Cite the governing formula in plain text (e.g. "Friis: Pr = Pt + Gt + Gr − Lfs").
2. Use SI units; convert if user gives Imperial. State assumptions explicitly.
3. If a question is ambiguous, ask ONE concise clarifying question, otherwise answer.
4. After the prose explanation, ALWAYS append a fenced JSON block with this contract:
\`\`\`json
{
  "summary": "one-line answer",
  "numeric_result": { "value": <number|null>, "unit": "<string|null>" },
  "steps": ["step 1", "step 2", "..."],
  "formulas": ["formula 1", "..."],
  "assumptions": ["..."],
  "warnings": ["..."],
  "suggested_solver": "mom" | "linkBudget" | "polarization" | "coupling" | "po" | "bandwidth" | null
}
\`\`\`
5. Be concise but rigorous — university-level depth. No fluff.
6. If the user attaches CONTEXT (current MoM run, selected antenna, frequency), use those values rather than asking.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const sys = context
      ? `${SYSTEM_PROMPT}\n\nCURRENT CONTEXT (JSON):\n${JSON.stringify(context).slice(0, 4000)}`
      : SYSTEM_PROMPT;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [{ role: "system", content: sys }, ...messages],
        stream: true,
        reasoning: { effort: "low" },
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

    return new Response(resp.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("antenna-solver error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});