import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CalculationEvent {
  eventType: "calculation.complete" | "calculation.update";
  toolId: string;
  toolName: string;
  requestId: string;
  userId: string;
  timestamp: string;
  inputs: Record<string, any>;
  results: Record<string, any>;
  steps?: string[];
  attachments?: {
    charts?: Array<{ mime: string; data: string }>;
    files?: Array<{ name: string; url: string }>;
  };
  metadata?: {
    units?: string;
    approxLevel?: string;
    confidence?: string;
    warnings?: string[];
  };
  sequenceId?: number;
  isFinal?: boolean;
  progress?: number;
  intermediateResults?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // Route to appropriate handler
    if (path.includes('/events/calc-complete') && req.method === 'POST') {
      return await handleCalculationEvent(req);
    } else if (path.includes('/explain') && req.method === 'POST') {
      return await handleExplainRequest(req);
    } else if (path.includes('/export/pdf') && req.method === 'POST') {
      return await handlePDFExport(req);
    } else if (path.includes('/context/') && req.method === 'GET') {
      return await handleGetContext(req);
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Assistant events error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'An error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Store calculation context (using in-memory for now, can migrate to Supabase DB)
const calculationContexts = new Map<string, CalculationEvent & { explanation?: string; explanationId?: string; cachedExplanations?: Map<string, string> }>();

// Memoization cache for explanations (key: requestId + explanationLevel)
const explanationCache = new Map<string, string>();

async function handleCalculationEvent(req: Request): Promise<Response> {
  const event: CalculationEvent = await req.json();

  // Validate required fields
  if (!event.requestId || !event.toolId || !event.userId) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Store context
  calculationContexts.set(event.requestId, {
    ...event,
    explanationId: `exp-${event.requestId}`,
  });

  // Generate summary using AI
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    // Fallback summary without AI
    const summary = generateFallbackSummary(event);
    const stored = calculationContexts.get(event.requestId);
    if (stored) {
      stored.explanation = summary;
    }
    return new Response(JSON.stringify({
      ack: true,
      requestId: event.requestId,
      explanationId: `exp-${event.requestId}`,
      summary,
      recommendations: generateRecommendations(event),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Generate AI summary
  try {
    const summaryPrompt = `You are analyzing a calculation from ${event.toolName}. 

Inputs: ${JSON.stringify(event.inputs)}
Results: ${JSON.stringify(event.results)}
${event.steps ? `Steps: ${event.steps.join('\n')}` : ''}
${event.metadata ? `Metadata: ${JSON.stringify(event.metadata)}` : ''}

Provide a concise 1-4 sentence summary of the results and their engineering significance. Then suggest 2-3 actionable next steps or follow-up calculations. Format as JSON:
{
  "summary": "brief summary text",
  "recommendations": ["recommendation 1", "recommendation 2"]
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an aerospace engineering assistant. Respond only with valid JSON.' },
          { role: 'user', content: summaryPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content;
      try {
        const parsed = JSON.parse(content);
        const stored = calculationContexts.get(event.requestId);
        if (stored) {
          stored.explanation = parsed.summary;
        }
        return new Response(JSON.stringify({
          ack: true,
          requestId: event.requestId,
          explanationId: `exp-${event.requestId}`,
          summary: parsed.summary || generateFallbackSummary(event),
          recommendations: parsed.recommendations || generateRecommendations(event),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch {
        // Fallback if JSON parse fails
        const stored = calculationContexts.get(event.requestId);
        if (stored) {
          stored.explanation = content;
        }
        return new Response(JSON.stringify({
          ack: true,
          requestId: event.requestId,
          explanationId: `exp-${event.requestId}`,
          summary: content || generateFallbackSummary(event),
          recommendations: generateRecommendations(event),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
  } catch (error) {
    console.error('AI summary generation failed:', error);
  }

  // Fallback response
  const summary = generateFallbackSummary(event);
  const stored = calculationContexts.get(event.requestId);
  if (stored) {
    stored.explanation = summary;
  }
  return new Response(JSON.stringify({
    ack: true,
    requestId: event.requestId,
    explanationId: `exp-${event.requestId}`,
    summary,
    recommendations: generateRecommendations(event),
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function generateFallbackSummary(event: CalculationEvent): string {
  const toolName = event.toolName;
  const keyResults = Object.entries(event.results)
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
  return `Calculation complete for ${toolName}. Results: ${keyResults}.`;
}

function generateRecommendations(event: CalculationEvent): string[] {
  const recommendations: string[] = [];
  if (event.toolId.includes('liftdrag')) {
    recommendations.push('Plot L/D vs angle of attack', 'Check spanwise twist if AR < 6');
  } else if (event.toolId.includes('deltav')) {
    recommendations.push('Verify mass margins', 'Check staging efficiency');
  } else if (event.toolId.includes('antenna')) {
    recommendations.push('Analyze link budget', 'Check for grating lobes');
  }
  return recommendations.length > 0 ? recommendations : ['Review results', 'Consider parameter variations'];
}

async function handleExplainRequest(req: Request): Promise<Response> {
  const { requestId, explanationLevel = 'detailed' } = await req.json();
  
  const context = calculationContexts.get(requestId);
  if (!context) {
    return new Response(JSON.stringify({ error: 'Calculation context not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check memoization cache
  const cacheKey = `${requestId}:${explanationLevel}`;
  if (explanationCache.has(cacheKey)) {
    return new Response(JSON.stringify({
      explanation: explanationCache.get(cacheKey),
      requestId,
      explanationLevel,
      cached: true,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    const fallbackExplanation = context.explanation || generateFallbackSummary(context);
    explanationCache.set(cacheKey, fallbackExplanation);
    return new Response(JSON.stringify({
      explanation: fallbackExplanation,
      requestId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Generate detailed explanation
  const explainPrompt = `Provide a ${explanationLevel} explanation of this calculation:

Tool: ${context.toolName}
Inputs: ${JSON.stringify(context.inputs, null, 2)}
Results: ${JSON.stringify(context.results, null, 2)}
${context.steps ? `Calculation Steps:\n${context.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}` : ''}
${context.metadata ? `Metadata: ${JSON.stringify(context.metadata, null, 2)}` : ''}

Provide:
1. Physical meaning of results
2. Step-by-step calculation explanation with numeric substitution
3. Engineering implications
4. Assumptions and limitations
5. Recommendations for validation or next steps`;

  try {
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an aerospace engineering expert providing detailed explanations.' },
          { role: 'user', content: explainPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      const explanation = aiData.choices?.[0]?.message?.content;
      // Cache the explanation
      explanationCache.set(cacheKey, explanation);
      return new Response(JSON.stringify({
        explanation,
        requestId,
        explanationLevel,
        cached: false,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Explanation generation failed:', error);
  }

  return new Response(JSON.stringify({
    explanation: context.explanation || generateFallbackSummary(context),
    requestId,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handlePDFExport(req: Request): Promise<Response> {
  const { requestId, options = {} } = await req.json();
  
  const context = calculationContexts.get(requestId);
  if (!context) {
    return new Response(JSON.stringify({ error: 'Calculation context not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Generate HTML for PDF (client-side will convert to PDF)
  const html = generatePDFHTML(context, options);
  
  return new Response(JSON.stringify({
    status: 'ready',
    html,
    requestId,
    pdfUrl: null, // Client-side conversion
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function generatePDFHTML(context: CalculationEvent, options: any): string {
  const { includeAssistantExplanation = true, explanationLevel = 'detailed', includeCharts = true } = options;
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${context.toolName} - Calculation Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
    h1 { color: #22d3ee; }
    h2 { color: #3b82f6; margin-top: 30px; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #1e293b; color: white; }
    .step { margin: 15px 0; padding: 10px; background: #f8f9fa; border-left: 4px solid #22d3ee; }
    .result { font-size: 1.2em; font-weight: bold; color: #22d3ee; }
    .metadata { font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <h1>${context.toolName} - Calculation Report</h1>
  <p><strong>Request ID:</strong> ${context.requestId}</p>
  <p><strong>Timestamp:</strong> ${context.timestamp}</p>
  
  <h2>Inputs</h2>
  <table>
    <tr><th>Parameter</th><th>Value</th></tr>
    ${Object.entries(context.inputs).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}
  </table>
  
  <h2>Results</h2>
  <table>
    <tr><th>Result</th><th>Value</th></tr>
    ${Object.entries(context.results).map(([k, v]) => `<tr><td>${k}</td><td class="result">${v}</td></tr>`).join('')}
  </table>
  
  ${context.steps && context.steps.length > 0 ? `
  <h2>Step-by-Step Calculation</h2>
  ${context.steps.map((step, i) => `<div class="step"><strong>Step ${i + 1}:</strong> ${step}</div>`).join('')}
  ` : ''}
  
  ${includeAssistantExplanation && context.explanation ? `
  <h2>AI Assistant Explanation</h2>
  <p>${context.explanation}</p>
  ` : ''}
  
  ${context.metadata ? `
  <h2>Metadata</h2>
  <div class="metadata">
    ${Object.entries(context.metadata).map(([k, v]) => `<p><strong>${k}:</strong> ${v}</p>`).join('')}
  </div>
  ` : ''}
</body>
</html>`;
}

async function handleGetContext(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const requestId = url.pathname.split('/context/')[1];
  
  if (!requestId) {
    return new Response(JSON.stringify({ error: 'Missing requestId' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const context = calculationContexts.get(requestId);
  if (!context) {
    return new Response(JSON.stringify({ error: 'Context not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    requestId,
    inputs: context.inputs,
    results: context.results,
    steps: context.steps,
    metadata: context.metadata,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

