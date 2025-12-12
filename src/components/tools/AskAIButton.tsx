"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useAIAssistant } from '@/contexts/AIAssistantContext';
import { useToast } from '@/hooks/use-toast';
import { AeroverseAIPayload } from '@/ai/schema/AeroversePayload';
import { buildAeroversePayload } from '@/ai/buildPayload';

interface AskAIButtonProps {
  requestId?: string | null;
  payload?: Partial<AeroverseAIPayload> | null; // Optional pre-built payload
  explanationLevel?: 'brief' | 'detailed' | 'teaching';
  disabled?: boolean;
  className?: string;
}

export function AskAIButton({ 
  requestId, 
  payload,
  explanationLevel = 'detailed',
  disabled,
  className 
}: AskAIButtonProps) {
  const { openAssistantWithPayload, setCurrentPayload, setIsOpen, sendMessage } = useAIAssistant();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAskAI = async () => {
    // Log telemetry for missing payload
    if (!requestId && !payload) {
      console.warn('FALLBACK_MISSING_RESULTS: No requestId or payload provided', {
        reason: 'NO_REQUEST_ID_OR_PAYLOAD',
        timestamp: new Date().toISOString(),
      });
      
      toast({
        title: 'Error',
        description: 'No calculation found. Please run a calculation first.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      let finalPayload: AeroverseAIPayload | undefined = undefined;
      let finalRequestId: string;

      if (payload) {
        // If payload is provided, build it using the helper
        try {
          finalPayload = buildAeroversePayload(payload as unknown);
          finalRequestId = finalPayload.requestId || requestId || `calc-${Date.now()}`;
          finalPayload.requestId = finalRequestId;
          
          console.log('✅ Using provided payload:', {
            toolName: finalPayload.toolName,
            requestId: finalRequestId,
            hasInputs: Object.keys(finalPayload.inputs).length > 0,
            hasResults: Object.keys(finalPayload.results).length > 0,
          });
        } catch (error) {
          console.error('Error building payload:', error);
          throw new Error('Failed to build AI payload. Please ensure all required fields are provided.');
        }
      }

      if (finalPayload) {
        // Use pre-built payload - set it in context and open assistant
        setCurrentPayload(finalPayload);
        setIsOpen(true);
        
        // Trigger initial explanation message (will include payload JSON in message)
        await sendMessage(`Explain this ${finalPayload.toolName} calculation.`);
        
        toast({
          title: 'Success',
          description: 'AI Assistant opened with full calculation context.',
        });
      } else if (requestId) {
        // Fallback: Use openAssistantWithPayload which loads from localStorage
        await openAssistantWithPayload(requestId);
        
        toast({
          title: 'Success',
          description: 'AI Assistant opened with full calculation context.',
        });
      } else {
        throw new Error('No payload or requestId available');
      }
    } catch (error) {
      console.error('Error opening AI assistant:', error);
      
      // Log telemetry for errors
      console.warn('FALLBACK_MISSING_RESULTS: Error opening assistant', {
        reason: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
        requestId: requestId || 'N/A',
        hasPayload: !!payload,
        timestamp: new Date().toISOString(),
      });
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to open AI assistant',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleAskAI}
      disabled={disabled || (!requestId && !payload) || isLoading}
      className={className || "border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10"}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Loading...
        </>
      ) : (
        <>
          <MessageSquare className="w-4 h-4 mr-2" />
          Ask AI: Explain
        </>
      )}
    </Button>
  );
}

