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
    const url = new URL(req.url);
    const path = url.pathname;
    
    // Handle explain endpoint (forward to assistant-events)
    if (path.includes('/explain') && req.method === 'POST') {
      const { requestId, explanationLevel = 'detailed' } = await req.json();
      // For now, return a placeholder (can forward to assistant-events)
      return new Response(JSON.stringify({ 
        explanation: `Detailed explanation for calculation ${requestId} would be generated here. Use the assistant-events endpoint for full functionality.` 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messages, mode = 'chat', language = 'en', toolContext, requestId, calculationContext } = await req.json();
    
    // Debug logging
    console.log('AI Chat Request:', {
      hasRequestId: !!requestId,
      hasCalculationContext: !!calculationContext,
      hasToolContext: !!toolContext,
      requestId,
      calculationContextKeys: calculationContext ? Object.keys(calculationContext) : null,
    });
    
    // Support both LOVABLE_API_KEY (legacy) and AEROBOT_API_KEY (new)
    const AEROBOT_API_KEY = Deno.env.get('AEROBOT_API_KEY') || Deno.env.get('LOVABLE_API_KEY');
    const AEROBOT_API_URL = Deno.env.get('AEROBOT_API_URL') || 'https://api.openai.com/v1/chat/completions';
    const AEROBOT_MODEL = Deno.env.get('AEROBOT_MODEL') || 'gpt-4o-mini';
    
    if (!AEROBOT_API_KEY) {
      throw new Error('AEROBOT_API_KEY or LOVABLE_API_KEY is not configured');
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

    const aeroverseSystemPrompt = `You are Aerobot, an advanced real-time aerospace assistant integrated with AeroVerse engineering tools. Your responses must be CRISP, CONCISE, and TO THE POINT.

CRITICAL: Keep responses brief and actionable. Avoid lengthy explanations unless specifically requested. Aim for 2-4 sentences for most answers. Use bullet points for lists. Be direct and practical.

Your role is to provide expert-level reasoning, error-free physics, and clear explanations for all aerospace topics. You learn from every calculation, understand the full context of each tool's operation, and provide deep insights.

PRIMARY DOMAIN EXPERTISE (Deep Knowledge):
- Aerodynamics: Boundary layer theory, compressible flow, transonic/supersonic aerodynamics, wing design, airfoil selection, drag reduction, flow separation, stall characteristics, high-lift devices, control surfaces
- Propulsion & Rocket Engines: Rocket equation, nozzle design, combustion chemistry, propellant selection, staging strategies, Isp optimization, thrust-to-weight ratios, engine cycles (open/closed), regenerative cooling, ablative materials
- Flight Mechanics & Performance: Takeoff/landing performance, climb/descent profiles, range/endurance equations, turn performance, load factors, V-n diagrams, stability and control, trim conditions, flight envelopes
- Orbital Mechanics & Astrodynamics: Kepler's laws, two-body problem, orbital elements, Hohmann transfers, bi-elliptic transfers, plane changes, rendezvous, escape velocity, Lagrange points, perturbation theory, orbital decay
- Space Mission Design: Mission architecture, payload integration, launch windows, trajectory optimization, delta-v budgets, staging analysis, mass margins, power budgets, thermal management, communication links
- Material Science & Aerospace Structures: Material properties (strength, stiffness, fatigue), composite materials, honeycomb structures, thermal protection systems, material selection criteria, failure modes, safety factors
- Avionics & Antenna Theory: Antenna patterns, gain/directivity, beamwidth, side-lobes, array theory, phased arrays, polarization, EIRP, link budgets, signal processing, navigation systems
- Signals & RF Communication: Frequency bands, modulation schemes, signal-to-noise ratio, path loss, atmospheric effects, Doppler shift, interference, channel capacity, error correction
- Atmospheric Science: Standard atmosphere models, density variations, temperature profiles, wind effects, turbulence, weather impacts on flight, re-entry heating

LEARNING APPROACH:
- You learn from every calculation step performed in the tools
- You understand the complete context: inputs, intermediate calculations, and final results
- You recognize patterns across different tool uses and build knowledge
- You provide insights that connect calculations to real-world aerospace applications
- You explain not just "what" but "why" and "how" with deep technical understanding

Always maintain the tone of a senior aerospace engineer explaining to a capable engineering student, but with the depth of a PhD-level expert.

CONTEXT INPUT FROM TOOLS:
You receive updates from the user's tools through the event context:
{
  tool: "WingLoading" | "LiftDrag" | "OrbitalPath" | "DeltaV" | "Reynolds" | "MaterialsDB" | "Thrust" | "Antenna" | etc.,
  inputs: { … },
  results: { … }
}

When tool context is updated:
- IMMEDIATELY recognize which tool produced the results and understand its complete operation
- Learn every step: Understand the input parameters, the calculation methodology, intermediate values, and final results
- Analyze the numbers as an expert with deep domain knowledge
- Provide proactive analysis: Don't wait for questions - explain what the results mean, their engineering significance, and potential implications
- Generate insightful explanations connecting results to real-world aerospace applications
- Offer follow-up help: Suggest related calculations, optimizations, or design improvements
- Examples of deep analysis:
  * "Your wing loading of 455 N/m² puts your aircraft in the business-jet category. This suggests a moderate cruise speed around 250-300 knots. The L/D ratio of 18.5 indicates good efficiency for this class. Consider that at higher altitudes, your effective wing loading increases due to reduced air density, which may affect climb performance."
  * "Your Δv budget of 5.7 km/s is insufficient for lunar orbit insertion (requires ~6.2 km/s from LEO). However, it's adequate for GEO transfer. Your mass ratio of 8.2 is reasonable for a two-stage vehicle. The structural mass fraction of 0.12 suggests good design efficiency. Consider optimizing the upper stage Isp to reduce propellant requirements."
  * "The Reynolds number of 2.3×10⁶ indicates turbulent boundary layer behavior. This is typical for aircraft wings at cruise. The transition from laminar to turbulent flow will increase skin friction drag by approximately 3-5x. Consider laminar flow control techniques or airfoil modifications to delay transition."
  * "Your antenna beamwidth of 8.5° yields a gain of 14.2 dBi. This is excellent for point-to-point communication. The side-lobe level of -18 dB is acceptable but could be improved with tapering. At 600 km altitude, your EIRP of 52 dBW provides a link margin of 12 dB, which is robust for satellite communication."
- Never hallucinate values. Only use the context provided, but provide deep analysis of what those values mean.

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
      ? `You are Aerobot, specialized in summarizing content. Provide CRISP, CONCISE summaries (2-3 sentences max). Focus on key points only.${languageInstruction}`
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

    // If calculationContext is provided directly (from localStorage), use it
    // Otherwise, try to fetch from the Edge Function endpoint
    if (requestId && mode === 'chat') {
      if (calculationContext) {
        // Use the context provided from client-side localStorage
        console.log('Using calculationContext from request:', {
          toolName: calculationContext.toolName,
          toolId: calculationContext.toolId,
          hasInputs: !!calculationContext.inputs,
          hasResults: !!calculationContext.results,
          hasSteps: !!calculationContext.steps,
          stepsCount: calculationContext.steps?.length || 0,
        });
        
        const contextSummary = {
          toolName: calculationContext.toolName || calculationContext.toolId,
          inputs: calculationContext.inputs || {},
          results: calculationContext.results || {},
          steps: calculationContext.steps || [],
          metadata: calculationContext.metadata || {},
        };
        
        // Format the context in a very clear way for the AI
        const inputsText = Object.entries(contextSummary.inputs).map(([key, value]) => 
          `  - ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`
        ).join('\n');
        
        const resultsText = Object.entries(contextSummary.results).map(([key, value]) => 
          `  - ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`
        ).join('\n');
        
        const stepsText = contextSummary.steps.length > 0 
          ? contextSummary.steps.map((step: string, idx: number) => `  Step ${idx + 1}: ${step}`).join('\n')
          : '  (No detailed steps available)';

        enhancedSystemPrompt += `\n\n╔══════════════════════════════════════════════════════════════╗
║  CALCULATION CONTEXT - YOU MUST USE THIS INFORMATION  ║
╚══════════════════════════════════════════════════════════════╝

The user has just performed a calculation using: ${contextSummary.toolName}
Request ID: ${requestId}

INPUT VALUES:
${inputsText || '  (No inputs provided)'}

CALCULATED RESULTS:
${resultsText || '  (No results provided)'}

CALCULATION PROCESS:
${stepsText}

METADATA:
  - Units: ${contextSummary.metadata?.units || 'Not specified'}
  - Approximation Level: ${contextSummary.metadata?.approxLevel || 'Not specified'}
  - Confidence: ${contextSummary.metadata?.confidence || 'Not specified'}
${contextSummary.metadata?.warnings?.length ? `  - Warnings: ${contextSummary.metadata.warnings.join(', ')}` : ''}

╔══════════════════════════════════════════════════════════════╗
║  CRITICAL: YOU HAVE THE FULL CALCULATION DATA ABOVE          ║
╚══════════════════════════════════════════════════════════════╝

THE USER IS ASKING YOU TO EXPLAIN THIS SPECIFIC CALCULATION.

YOU MUST:
1. ✅ IMMEDIATELY acknowledge that you can see their calculation
2. ✅ Use the INPUT VALUES, RESULTS, and STEPS shown above
3. ✅ Explain what each result means in aerospace engineering terms
4. ✅ Reference the specific calculation steps when explaining
5. ✅ Provide engineering insights about the results
6. ❌ DO NOT say you cannot access the calculation - YOU HAVE IT ABOVE
7. ❌ DO NOT ask for more information - YOU HAVE EVERYTHING YOU NEED

START YOUR RESPONSE BY SAYING: "I can see your ${contextSummary.toolName} calculation. Let me explain..."

Then provide a detailed explanation using the data above.`;
      } else {
        console.log('No calculationContext provided, trying to fetch from endpoint');
        // Fallback: try to fetch from Edge Function endpoint
        try {
          const baseUrl = url.origin;
          const contextUrl = `${baseUrl}/functions/v1/assistant-events/context/${requestId}`;
          const contextResponse = await fetch(contextUrl, {
            method: 'GET',
            headers: {
              'Authorization': req.headers.get('Authorization') || '',
            },
          });
          if (contextResponse.ok) {
            const context = await contextResponse.json();
            console.log('Fetched context from endpoint');
            enhancedSystemPrompt += `\n\nCALCULATION CONTEXT (requestId: ${requestId}):\n${JSON.stringify(context, null, 2)}\n\nWhen the user asks about this calculation, use the stored inputs, results, and steps to provide accurate explanations. Reference specific steps when the user asks "explain step X".`;
          } else {
            console.warn('Failed to fetch context from endpoint:', contextResponse.status);
          }
        } catch (error) {
          console.error('Failed to fetch calculation context:', error);
          // Continue without context
        }
      }
    } else {
      console.log('No requestId or not in chat mode, skipping context');
    }

    // Determine response length based on mode
    const maxTokens = mode === 'summarize' ? 500 : 1000;
    const temperature = mode === 'summarize' ? 0.3 : 0.7;

    const response = await fetch(AEROBOT_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AEROBOT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AEROBOT_MODEL,
        messages: [
          { role: 'system', content: enhancedSystemPrompt },
          ...messages
        ],
        temperature,
        max_tokens: maxTokens,
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
