/**
 * Aerobot API Integration
 * Configure your API key in environment variables: VITE_AEROBOT_API_KEY
 */

export interface AerobotMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AerobotRequest {
  messages: AerobotMessage[];
  mode?: 'chat' | 'summarize';
  temperature?: number;
  max_tokens?: number;
}

export interface AerobotResponse {
  content: string;
  error?: string;
}

/**
 * Call Aerobot API
 * You can configure the API endpoint and key via environment variables
 */
export async function callAerobotAPI(
  messages: AerobotMessage[],
  options: {
    mode?: 'chat' | 'summarize';
    temperature?: number;
    max_tokens?: number;
  } = {}
): Promise<AerobotResponse> {
  const apiKey = import.meta.env.VITE_AEROBOT_API_KEY;
  const apiUrl = import.meta.env.VITE_AEROBOT_API_URL || 'https://api.openai.com/v1/chat/completions';
  const model = import.meta.env.VITE_AEROBOT_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    throw new Error('AEROBOT_API_KEY is not configured. Please set VITE_AEROBOT_API_KEY in your environment variables.');
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? (options.mode === 'summarize' ? 0.3 : 0.7),
        max_tokens: options.max_tokens ?? (options.mode === 'summarize' ? 500 : 1000),
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || 'No response generated.';

    return { content };
  } catch (error) {
    console.error('Aerobot API error:', error);
    return {
      content: '',
      error: error instanceof Error ? error.message : 'Failed to connect to Aerobot API',
    };
  }
}

