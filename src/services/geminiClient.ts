/**
 * Gemini API Client
 * All API calls are routed through the secure backend edge function
 */

import type { SupabaseClient } from "@supabase/supabase-js";

async function getSupabaseClient(): Promise<SupabaseClient | null> {
  try {
    const mod = await import("@/integrations/supabase/client");
    return mod.supabase as SupabaseClient;
  } catch {
    // If env vars are missing, the generated client throws at import time.
    return null;
  }
}

export type GeminiResult =
  | { ok: true; content: string }
  | { ok: false; reason: "AI_DISABLED" | "NETWORK_ERROR" | "BAD_RESPONSE"; detail?: string };

/**
 * Check if Smart AI is enabled
 * This now checks if the backend edge function is available
 */
export function isSmartAiEnabled(): boolean {
  // AI is always potentially available through the backend
  // The actual availability depends on server-side configuration
  return true;
}

/**
 * Call Gemini through secure backend edge function
 * @param prompt - The prompt to send to Gemini
 * @returns Structured result with success/error information
 */
export async function callGeminiJSON(prompt: string): Promise<GeminiResult> {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "AI_DISABLED",
      detail: "Backend client is not configured in this build (missing backend URL).",
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('ai-gateway', {
      body: {
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
        mode: 'json',
        temperature: 0.3,
        max_tokens: 2000,
      },
    });

    if (error) {
      // Check for specific error types
      if (error.message?.includes('503') || error.message?.includes('unavailable')) {
        return {
          ok: false,
          reason: "AI_DISABLED",
          detail: "AI service is not configured on the server.",
        };
      }
      return {
        ok: false,
        reason: "NETWORK_ERROR",
        detail: error.message || 'Failed to connect to AI service',
      };
    }

    if (data?.error) {
      if (data.error.includes('unavailable') || data.error.includes('not configured')) {
        return {
          ok: false,
          reason: "AI_DISABLED",
          detail: data.error,
        };
      }
      return {
        ok: false,
        reason: "NETWORK_ERROR",
        detail: data.error,
      };
    }

    const content = data?.content || '';

    if (!content) {
      return {
        ok: false,
        reason: "BAD_RESPONSE",
        detail: "No content in AI response",
      };
    }

    return { ok: true, content };
  } catch (error) {
    return {
      ok: false,
      reason: "NETWORK_ERROR",
      detail: error instanceof Error ? error.message : 'Unknown network error',
    };
  }
}
