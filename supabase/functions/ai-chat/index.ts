// @ts-nocheck — This file runs on Supabase Edge Functions (Deno runtime), not Node.js
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schemas
const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1).max(50000),
});

const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(100),
  mode: z.enum(['chat', 'summarize']).optional().default('chat'),
  language: z.string().max(10).optional().default('en'),
  toolContext: z.record(z.unknown()).optional(),
  requestId: z.string().max(100).optional(),
  calculationContext: z.record(z.unknown()).optional(),
  aeroversePayload: z.record(z.unknown()).optional(),
});

const ExplainRequestSchema = z.object({
  requestId: z.string().min(1).max(100),
  explanationLevel: z.enum(['brief', 'detailed', 'expert']).optional().default('detailed'),
});

// Authenticate user from JWT
async function authenticateUser(req: Request): Promise<{ user: { id: string } } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const jwt = authHeader.replace('Bearer ', '');
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );

  const { data: { user }, error } = await supabaseClient.auth.getUser(jwt);
  if (error || !user) return null;

  return { user: { id: user.id } };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check request size before parsing
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 1048576) { // 1MB limit
      return new Response(
        JSON.stringify({ error: 'Request too large' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate user
    const auth = await authenticateUser(req);
    if (!auth) {
      console.log('Unauthorized access attempt to ai-chat');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', auth.user.id);

    const url = new URL(req.url);
    const path = url.pathname;
    
    // Parse and validate JSON
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle explain endpoint
    if (path.includes('/explain') && req.method === 'POST') {
      const validationResult = ExplainRequestSchema.safeParse(body);
      if (!validationResult.success) {
        return new Response(
          JSON.stringify({ error: 'Invalid request format', details: validationResult.error.errors }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const { requestId, explanationLevel } = validationResult.data;
      return new Response(JSON.stringify({ 
        explanation: `Detailed explanation for calculation ${requestId} would be generated here. Use the assistant-events endpoint for full functionality.` 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate chat request
    const validationResult = ChatRequestSchema.safeParse(body);
    if (!validationResult.success) {
      console.log('Validation failed:', validationResult.error.errors);
      return new Response(
        JSON.stringify({ error: 'Invalid request format', details: validationResult.error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { messages, mode, language, toolContext, requestId, calculationContext, aeroversePayload } = validationResult.data;
    
    // Debug logging
    console.log('AI Chat Request:', {
      userId: auth.user.id,
      hasRequestId: !!requestId,
      hasCalculationContext: !!calculationContext,
      hasAeroversePayload: !!aeroversePayload,
      hasToolContext: !!toolContext,
      requestId,
      calculationContextKeys: calculationContext ? Object.keys(calculationContext) : null,
      aeroversePayloadKeys: aeroversePayload ? Object.keys(aeroversePayload) : null,
      messageCount: messages?.length || 0,
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

    // Detect calculation mode based on payload presence
    const isCalculationMode = !!aeroversePayload && !!(aeroversePayload as Record<string, unknown>).toolName;

    // CONCISE PROFESSIONAL SYSTEM PROMPT FOR CALCULATIONS
    const calculationSystemPrompt = `You are AERORBIS AI — a concise aerospace engineering calculation interpreter.${languageInstruction}

STRICT RULES:
1. Keep explanations SHORT, TECHNICAL, and PROFESSIONAL.
2. Maximum length: 6–10 bullet points. NO paragraphs longer than 2 lines.
3. Output structure (REQUIRED):
   **Summary (1–2 bullets)**  
   – High-level meaning of the result.
   
   **Key Results**  
   – Numerical outputs + what they imply.
   
   **Equations Used**  
   – Only essential formulas in short form.
   
   **Engineering Interpretation**  
   – 2–3 professional notes relevant to performance and design.

4. Do NOT teach theory or provide historical context.
5. Do NOT repeat the JSON payload or raw data.
6. Do NOT ask for more details unless the payload is fundamentally incomplete.
7. Tone must match a technical design-review note written by an aerospace engineer.
8. Avoid fluff, filler language, or motivational statements.
9. Use SI units unless the tool explicitly uses another system.
10. Focus ONLY on the calculation provided — no general explanations.

PAYLOAD HANDLING:
- The user message contains a JSON payload wrapped in \`\`\`json code blocks
- ALWAYS use the payload JSON from the user message
- DO NOT attempt to access external systems or fetch data by Request ID
- If needed values are missing in the payload, explicitly state which fields are missing
- Never say "I can't access external systems" if payload JSON is provided`;

    // CHAT MODE SYSTEM PROMPT (conversational)
    const chatSystemPrompt = `You are Aerobot, an aerospace engineering assistant. Provide concise, technical answers. Use bullet points for lists. Keep responses brief and actionable.${languageInstruction}

IF USER REQUESTS SOMETHING UNSAFE:
Examples: Real missile design for harm, weaponization, sensitive military details
Respond: "I can't help with harmful applications. But I can explain the physics for educational aerospace engineering purposes."`;

    const systemPrompt = mode === 'summarize' 
      ? `You are Aerobot, specialized in summarizing content. Provide CRISP, CONCISE summaries (2-3 sentences max). Focus on key points only.${languageInstruction}`
      : isCalculationMode 
      ? calculationSystemPrompt
      : chatSystemPrompt;

    // For calculation mode, payload is already in user message - no need to add context
    const enhancedSystemPrompt = systemPrompt;

    // Determine response length based on mode - shorter for calculation mode
    const maxTokens = mode === 'summarize' ? 500 : isCalculationMode ? 600 : 1000;
    const temperature = mode === 'summarize' ? 0.3 : isCalculationMode ? 0.4 : 0.7;

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
    console.error('AI chat error:', error); // Keep detailed log server-side only
    
    // Return safe generic error message - never expose internal details
    return new Response(JSON.stringify({ 
      error: 'Request processing failed. Please try again.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
