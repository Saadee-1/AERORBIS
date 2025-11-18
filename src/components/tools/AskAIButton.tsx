"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useAIAssistant } from '@/contexts/AIAssistantContext';
import { useToast } from '@/hooks/use-toast';

interface AskAIButtonProps {
  requestId: string | null;
  explanationLevel?: 'brief' | 'detailed' | 'teaching';
  disabled?: boolean;
  className?: string;
}

export function AskAIButton({ 
  requestId, 
  explanationLevel = 'detailed',
  disabled,
  className 
}: AskAIButtonProps) {
  const { openAssistantWithPayload } = useAIAssistant();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAskAI = async () => {
    if (!requestId) {
      toast({
        title: 'Error',
        description: 'No calculation found. Please run a calculation first.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Use openAssistantWithPayload which ensures payload is loaded BEFORE opening
      // This function will:
      // 1. Load calculation data from localStorage using requestId
      // 2. Convert to AeroverseAIPayload format
      // 3. Set payload in context FIRST
      // 4. Open assistant UI
      // 5. Send explanation request with full context
      await openAssistantWithPayload(requestId);
      
      toast({
        title: 'Success',
        description: 'AI Assistant opened with full calculation context.',
      });
    } catch (error) {
      console.error('Error opening AI assistant:', error);
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
      disabled={disabled || !requestId || isLoading}
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

