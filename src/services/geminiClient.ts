/**
 * Gemini API Client
 * Simple wrapper for calling Gemini via Lovable AI Gateway
 * Reuses the same API key and configuration as the rest of the app
 */

/**
 * Call Gemini and return the raw text response
 * @param prompt - The prompt to send to Gemini
 * @returns The raw text response from Gemini
 */
export async function callGeminiJSON(prompt: string): Promise<string> {
  // Try multiple environment variable names for API key
  const apiKey = 
    import.meta.env.VITE_LOVABLE_API_KEY || 
    import.meta.env.VITE_AEROBOT_API_KEY ||
    import.meta.env.VITE_GEMINI_API_KEY;
  
  const apiUrl = import.meta.env.VITE_AI_GATEWAY_URL || 'https://ai.gateway.lovable.dev/v1/chat/completions';
  const model = import.meta.env.VITE_GEMINI_MODEL || 'google/gemini-2.5-flash';

  if (!apiKey) {
    throw new Error('AI API key is not configured. Please set VITE_LOVABLE_API_KEY, VITE_AEROBOT_API_KEY, or VITE_GEMINI_API_KEY in your environment variables.');
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an aerospace engineering assistant. Respond only with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent JSON output
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    if (!content) {
      throw new Error('No content in Gemini response');
    }

    return content;
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

