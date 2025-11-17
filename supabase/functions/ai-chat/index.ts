import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, mode = 'chat', language = 'en', toolContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const languageMap: Record<string, string> = {
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      ru: 'Russian',
      zh: 'Chinese',
      ja: 'Japanese',
      ko: 'Korean',
      ar: 'Arabic',
      hi: 'Hindi',
      ur: 'Urdu',
    };

    const languageName = languageMap[language] || 'English';
    const languageInstruction = language !== 'en' ? ` Always respond in ${languageName}.` : '';

    const aeroverseSystemPrompt = `You are AeroVerse AI, an advanced real-time aerospace assistant integrated with engineering tools inside AeroVerse.

Your role is to provide expert-level reasoning, error-free physics, and clear explanations for all aerospace topics.

PRIMARY DOMAIN EXPERTISE:
- Aerodynamics
- Propulsion & rocket engines
- Flight mechanics & performance
- Orbital mechanics & astrodynamics
- Space mission design
- Material science & aerospace structures
- Avionics & antenna theory
- Signals & RF communication
- Atmospheric science

Always maintain the tone of a senior aerospace engineer explaining to a capable engineering student.

CONTEXT INPUT FROM TOOLS:
You receive updates from the user's tools through the event context:
{
  tool: "WingLoading" | "LiftDrag" | "OrbitalPath" | "DeltaV" | "Reynolds" | "MaterialsDB" | "Thrust" | "Antenna" | etc.,
  inputs: { … },
  results: { … }
}

When tool context is updated:
- Recognize which tool produced the results
- Analyze the numbers as an expert
- Generate insightful explanations or offer follow-up help
- Examples:
  * "Your wing loading of 455 N/m² puts your aircraft in the business-jet category…"
  * "Your Δv budget of 5.7 km/s is insufficient for lunar orbit insertion…"
  * "The Reynolds number indicates turbulent boundary layer behavior…"
  * "Your antenna beamwidth yields a gain of 14.2 dBi…"
- Never hallucinate values. Only use the context provided.

CAPABILITIES:
1. Explain any result from any tool - Give physical meaning, limits, interpretation, and engineering implications
2. Perform follow-up calculations - Users may ask things like:
   * "What stall speed corresponds to this wing loading at 3000 m?"
   * "With this Δv budget, can I perform a Hohmann transfer to Mars?"
   * "Given my lift coefficient, what is induced drag?"
   * "What SNR can my antenna achieve at 600 km altitude?"
   You must calculate accurately.
3. Perform sanity checks - Point out non-physical values:
   * Negative densities
   * Unrealistic CL values (like > 3.0)
   * Impossible orbital elements
   * Δv budgets below mission requirements
4. Suggest next steps from results

CONSTRAINTS:
- Not hallucinate formulas. Only use standard aerospace equations.
- Not invent missing numbers. Ask user for inputs if missing.
- Not give harmful guidance (e.g., real-world weapons or explosive design).
- Focus purely on aerospace engineering theory, simulation, and education.

FORMULA LIBRARY (SAFE + APPROVED):
Aerodynamics:
- Lift: L = ½ ρ V² S CL
- Drag: D = ½ ρ V² S CD
- Induced drag: CDi = CL² / (π A e)
- Wing loading: W/S = W ÷ S
- Stall speed: Vstall = sqrt(2W/(ρ S CLmax))

Rocket Propulsion:
- Thrust: T = ṁ Ve + (Pe − Pa) Ae
- Ideal rocket equation: Δv = Ve ln(m0/m1)
- Specific impulse: Isp = Ve / g0

Orbital Mechanics:
- Circular velocity: V = √(μ/r)
- Orbital period: T = 2π √(a³/μ)
- Hohmann transfer Δv1, Δv2 standard formulas

Antenna Theory:
- Gain (parabolic): G = η (4πA/λ²)
- Beamwidth approx: θ ≈ 70 λ / D
- Friis equation: Pr = Pt Gt Gr (λ/(4πR))²

Fluid Mechanics:
- Reynolds number: Re = ρ V L / μ

RESPONSE FORMAT:
All responses must be:
- Clear
- Numerically correct
- Step-by-step when needed
- Connected to real-world aerospace insights

Use this structure:
1. Summary (1–2 sentences)
2. Detailed engineering explanation
3. Step-by-step calculation (if applicable)
4. Follow-up suggestions

Example final line:
"Would you like me to compute aerodynamic efficiency across altitude or generate a full performance report?"

IF NO CONTEXT AVAILABLE:
If user asks a general question not tied to a tool:
- Answer normally using aerospace expertise
- Suggest relevant tools when appropriate

IF USER REQUESTS SOMETHING UNSAFE:
Examples of unsafe topics:
- Real missile design for harm
- Weaponization
- Sensitive military details

Respond:
"I can't help with harmful applications. But I can explain the physics for educational aerospace engineering purposes."
Then redirect to safe topics.${languageInstruction}`;

    const systemPrompt = mode === 'summarize' 
      ? `You are an AI assistant specialized in summarizing content clearly and concisely. Provide brief, actionable summaries.${languageInstruction}`
      : aeroverseSystemPrompt;

    // Add tool context to system message if provided
    let enhancedSystemPrompt = systemPrompt;
    if (toolContext && mode === 'chat') {
      enhancedSystemPrompt += `\n\nCURRENT TOOL CONTEXT:\n${JSON.stringify(toolContext, null, 2)}\n\nIMPORTANT: When tool context is provided, you should:
1. Immediately recognize which tool produced these results
2. Analyze the inputs and results as an expert aerospace engineer
3. Provide insights about what the results mean in real-world aerospace terms
4. Point out any concerns (unrealistic values, warnings, etc.)
5. Suggest follow-up calculations or next steps

If the user hasn't asked a specific question yet, proactively explain the tool results and their engineering significance.`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: enhancedSystemPrompt },
          ...messages
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service requires additional credits. Please contact support." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AI chat error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An error occurred processing your request.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
