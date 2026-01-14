/**
 * Aerobot API Integration
 * All API calls are routed through the secure backend edge function
 */

import { supabase } from "@/integrations/supabase/client";

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
 * Call Aerobot API through secure backend edge function
 * API keys are stored server-side for security
 */
export async function callAerobotAPI(
  messages: AerobotMessage[],
  options: {
    mode?: 'chat' | 'summarize';
    temperature?: number;
    max_tokens?: number;
  } = {}
): Promise<AerobotResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-gateway', {
      body: {
        messages,
        mode: options.mode,
        temperature: options.temperature,
        max_tokens: options.max_tokens,
      },
    });

    if (error) {
      console.error('Aerobot API error:', error);
      return {
        content: '',
        error: error.message || 'Failed to connect to AI service',
      };
    }

    if (data?.error) {
      return {
        content: '',
        error: data.error,
      };
    }

    return { content: data?.content || '' };
  } catch (error) {
    console.error('Aerobot API error:', error);
    return {
      content: '',
      error: error instanceof Error ? error.message : 'Failed to connect to AI service',
    };
  }
}
