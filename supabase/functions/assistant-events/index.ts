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

    // Handle calculation events at root path (POST to root with eventType in body)
    if (req.method === 'POST' && (path === '/functions/v1/assistant-events' || path.endsWith('/assistant-events'))) {
      try {
        const body = await req.clone().json();
        if (body.eventType === 'calculation.complete') {
          return await handleCalculationEvent(req);
        } else if (body.eventType === 'calculation.update') {
          return await handleCalculationUpdate(req);
        }
      } catch {
        // If body parsing fails, fall through to path-based routing
      }
    }

    // Route to appropriate handler based on path (for other endpoints)
    if (path.includes('/explain') && req.method === 'POST') {
      return await handleExplainRequest(req);
    } else if (path.includes('/export/pdf') && req.method === 'POST') {
      return await handlePDFExport(req);
    } else if (path.includes('/export/batch') && req.method === 'POST') {
      return await handleBatchExport(req);
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
          { role: 'system', content: 'You are AEROVERSE AI — a concise aerospace engineering calculation interpreter. Keep explanations SHORT, TECHNICAL, and PROFESSIONAL (6-10 bullet points max). No teaching tone, no fluff.' },
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
  const { includeAssistantExplanation = true, explanationLevel = 'detailed', includeCharts = true, author = 'User' } = options;
  const stored = calculationContexts.get(context.requestId);
  const explanation = stored?.explanation || '';
  
  // Generate calculation record JSON (for reproducibility)
  const calculationRecord = {
    requestId: context.requestId,
    toolId: context.toolId,
    toolName: context.toolName,
    timestamp: context.timestamp,
    userId: context.userId,
    inputs: context.inputs,
    results: context.results,
    steps: context.steps,
    metadata: context.metadata,
    exportTimestamp: new Date().toISOString(),
    exportOptions: options,
    assistantVersion: '1.0.0',
  };
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${context.toolName} - Calculation Report</title>
  <style>
    @page { margin: 2cm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 40px; line-height: 1.6; color: #1e293b; }
    .cover { text-align: center; page-break-after: always; padding: 60px 0; }
    h1 { color: #22d3ee; font-size: 2.5em; margin-bottom: 10px; }
    h2 { color: #3b82f6; margin-top: 30px; page-break-after: avoid; }
    h3 { color: #60a5fa; margin-top: 20px; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; page-break-inside: avoid; }
    th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; }
    th { background-color: #1e293b; color: white; font-weight: 600; }
    .step { margin: 15px 0; padding: 15px; background: #f1f5f9; border-left: 4px solid #22d3ee; page-break-inside: avoid; }
    .result { font-size: 1.2em; font-weight: bold; color: #22d3ee; }
    .metadata { font-size: 0.9em; color: #64748b; background: #f8fafc; padding: 15px; border-radius: 8px; }
    .formula { font-family: 'Courier New', monospace; background: #f1f5f9; padding: 8px; border-radius: 4px; margin: 10px 0; }
    .toc { page-break-after: always; }
    .toc-item { margin: 8px 0; }
    .toc-item a { color: #3b82f6; text-decoration: none; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; font-size: 0.85em; color: #64748b; }
    .json-record { background: #1e293b; color: #e2e8f0; padding: 20px; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 0.75em; overflow-x: auto; page-break-inside: avoid; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 15px 0; }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="cover">
    <h1>${context.toolName}</h1>
    <h2>Calculation Report</h2>
    <p style="margin-top: 40px; color: #64748b;">
      <strong>Request ID:</strong> ${context.requestId}<br>
      <strong>Generated:</strong> ${new Date(context.timestamp).toLocaleString()}<br>
      <strong>Author:</strong> ${author}<br>
      <strong>Tool Version:</strong> 1.0.0
    </p>
  </div>

  <!-- Table of Contents -->
  <div class="toc">
    <h2>Table of Contents</h2>
    <div class="toc-item"><a href="#inputs">1. Inputs</a></div>
    <div class="toc-item"><a href="#results">2. Results Summary</a></div>
    ${context.steps && context.steps.length > 0 ? '<div class="toc-item"><a href="#steps">3. Step-by-Step Calculation</a></div>' : ''}
    ${includeAssistantExplanation && explanation ? '<div class="toc-item"><a href="#explanation">4. AI Assistant Explanation</a></div>' : ''}
    ${context.metadata ? '<div class="toc-item"><a href="#metadata">5. Metadata & Assumptions</a></div>' : ''}
    <div class="toc-item"><a href="#record">6. Calculation Record (JSON)</a></div>
  </div>

  <!-- Inputs -->
  <h2 id="inputs">1. Inputs</h2>
  <table>
    <tr><th>Parameter</th><th>Value</th><th>Units</th></tr>
    ${Object.entries(context.inputs).map(([k, v]) => {
      const unit = context.metadata?.units || '';
      return `<tr><td><strong>${k}</strong></td><td>${v}</td><td>${unit}</td></tr>`;
    }).join('')}
  </table>
  
  <!-- Results -->
  <h2 id="results">2. Results Summary</h2>
  <table>
    <tr><th>Result</th><th>Value</th><th>Units</th></tr>
    ${Object.entries(context.results).map(([k, v]) => {
      const unit = context.metadata?.units || '';
      return `<tr><td><strong>${k}</strong></td><td class="result">${v}</td><td>${unit}</td></tr>`;
    }).join('')}
  </table>
  
  ${context.steps && context.steps.length > 0 ? `
  <!-- Steps -->
  <h2 id="steps">3. Step-by-Step Calculation</h2>
  ${context.steps.map((step, i) => {
    // Extract formula and numeric substitution
    const parts = step.split(':');
    const formula = parts.length > 1 ? parts[0] : '';
    const substitution = parts.length > 1 ? parts.slice(1).join(':') : step;
    return `
      <div class="step">
        <strong>Step ${i + 1}:</strong>
        ${formula ? `<div class="formula">${formula}</div>` : ''}
        <div>${substitution}</div>
      </div>
    `;
  }).join('')}
  ` : ''}
  
  ${includeAssistantExplanation && explanation ? `
  <!-- AI Explanation -->
  <h2 id="explanation">4. AI Assistant Explanation</h2>
  <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #22d3ee;">
    <p style="white-space: pre-wrap;">${explanation}</p>
    <p style="margin-top: 15px; font-size: 0.9em; color: #64748b;">
      <strong>Explanation Level:</strong> ${explanationLevel}<br>
      <strong>Confidence:</strong> ${context.metadata?.confidence || 'N/A'}
    </p>
  </div>
  ` : ''}
  
  ${context.metadata ? `
  <!-- Metadata -->
  <h2 id="metadata">5. Metadata & Assumptions</h2>
  <div class="metadata">
    ${Object.entries(context.metadata).map(([k, v]) => {
      if (Array.isArray(v)) {
        return `<p><strong>${k}:</strong> ${v.join(', ')}</p>`;
      }
      return `<p><strong>${k}:</strong> ${v}</p>`;
    }).join('')}
    ${context.metadata.approxLevel ? `<p><strong>Approximation Level:</strong> ${context.metadata.approxLevel} - ${getApproxLevelDescription(context.metadata.approxLevel)}</p>` : ''}
  </div>
  ` : ''}
  
  ${context.metadata?.warnings && context.metadata.warnings.length > 0 ? `
  <div class="warning">
    <strong>⚠️ Warnings:</strong>
    <ul style="margin: 10px 0 0 20px;">
      ${context.metadata.warnings.map((w: string) => `<li>${w}</li>`).join('')}
    </ul>
  </div>
  ` : ''}
  
  <!-- Calculation Record -->
  <h2 id="record">6. Calculation Record (JSON)</h2>
  <p style="color: #64748b; font-size: 0.9em;">This machine-readable record allows re-importing or re-running the calculation.</p>
  <div class="json-record">
    <pre>${JSON.stringify(calculationRecord, null, 2)}</pre>
  </div>
  
  <!-- Footer -->
  <div class="footer">
    <p><strong>Report Generated:</strong> ${new Date().toISOString()}</p>
    <p><strong>Tool:</strong> ${context.toolName} | <strong>Version:</strong> 1.0.0</p>
    <p style="margin-top: 10px; font-size: 0.8em;">This report was generated automatically by AeroVerse Calculation Tools.</p>
  </div>
</body>
</html>`;
}

function getApproxLevelDescription(level: string): string {
  const descriptions: Record<string, string> = {
    'analytic': 'Exact analytical formulas used (highest accuracy)',
    'array-analytic': 'Analytical array factor with element models',
    'hybrid': 'Mix of analytical and empirical models',
    'empirical': 'Data-driven approximations (verify with measurements)',
  };
  return descriptions[level] || 'Unknown approximation level';
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
    timestamp: context.timestamp,
    toolName: context.toolName,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Handle calculation.update events (for streaming/partial updates)
async function handleCalculationUpdate(req: Request): Promise<Response> {
  const event: CalculationEvent = await req.json();

  if (!event.requestId || !event.sequenceId) {
    return new Response(JSON.stringify({ error: 'Missing required fields (requestId, sequenceId)' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Update existing context or create new one
  const existing = calculationContexts.get(event.requestId);
  if (existing) {
    // Merge intermediate results
    if (event.intermediateResults) {
      existing.results = { ...existing.results, ...event.intermediateResults };
    }
    // Update progress if provided
    if (event.progress !== undefined) {
      (existing as any).progress = event.progress;
    }
    calculationContexts.set(event.requestId, existing);
  } else {
    // Create new context for first update
    calculationContexts.set(event.requestId, {
      ...event,
      explanationId: `exp-${event.requestId}`,
    });
  }

  return new Response(JSON.stringify({
    ack: true,
    requestId: event.requestId,
    sequenceId: event.sequenceId,
    isFinal: event.isFinal || false,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Handle batch PDF export (multiple requestIds)
async function handleBatchExport(req: Request): Promise<Response> {
  const { requestIds, options = {} } = await req.json();
  
  if (!Array.isArray(requestIds) || requestIds.length === 0) {
    return new Response(JSON.stringify({ error: 'Invalid requestIds array' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Fetch all contexts
  const contexts = requestIds
    .map((id: string) => calculationContexts.get(id))
    .filter((ctx) => ctx !== undefined);

  if (contexts.length === 0) {
    return new Response(JSON.stringify({ error: 'No valid contexts found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Generate combined HTML
  const html = generateBatchPDFHTML(contexts, options);
  
  return new Response(JSON.stringify({
    status: 'ready',
    html,
    requestIds,
    pdfUrl: null,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function generateBatchPDFHTML(contexts: any[], options: any): string {
  const { includeAssistantExplanation = true, explanationLevel = 'detailed' } = options;
  
  const contextsHTML = contexts.map((context, idx) => `
    <div style="page-break-after: always;">
      <h2>${context.toolName} - Calculation ${idx + 1}</h2>
      <p><strong>Request ID:</strong> ${context.requestId}</p>
      <p><strong>Timestamp:</strong> ${context.timestamp}</p>
      
      <h3>Inputs</h3>
      <table>
        <tr><th>Parameter</th><th>Value</th></tr>
        ${Object.entries(context.inputs).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}
      </table>
      
      <h3>Results</h3>
      <table>
        <tr><th>Result</th><th>Value</th></tr>
        ${Object.entries(context.results).map(([k, v]) => `<tr><td>${k}</td><td class="result">${v}</td></tr>`).join('')}
      </table>
      
      ${context.steps && context.steps.length > 0 ? `
      <h3>Step-by-Step Calculation</h3>
      ${context.steps.map((step: string, i: number) => `<div class="step"><strong>Step ${i + 1}:</strong> ${step}</div>`).join('')}
      ` : ''}
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Combined Calculation Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
    h1 { color: #22d3ee; }
    h2 { color: #3b82f6; margin-top: 30px; }
    h3 { color: #60a5fa; margin-top: 20px; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #1e293b; color: white; }
    .step { margin: 15px 0; padding: 10px; background: #f8f9fa; border-left: 4px solid #22d3ee; }
    .result { font-size: 1.2em; font-weight: bold; color: #22d3ee; }
  </style>
</head>
<body>
  <h1>Combined Calculation Report</h1>
  <p>Generated: ${new Date().toISOString()}</p>
  <p>Total Calculations: ${contexts.length}</p>
  
  ${contextsHTML}
  
  <div style="page-break-before: always; margin-top: 40px;">
    <h2>Comparison Summary</h2>
    <p>This report contains ${contexts.length} calculations. Compare results across different parameter sets.</p>
  </div>
</body>
</html>`;
}

