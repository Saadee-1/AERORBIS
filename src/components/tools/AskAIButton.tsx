"use client";

import { Button } from '@/components/ui/button';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useAIAssistant } from '@/contexts/AIAssistantContext';
import { getExplanation } from '@/lib/pdfExport';
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
  const { setIsOpen, sendMessage } = useAIAssistant();
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
      // Get explanation from assistant
      const explanation = await getExplanation(requestId, explanationLevel);
      
      // Open AI assistant and send explanation request
      setIsOpen(true);
      
      // Send a message with the explanation request
      // The assistant will use the requestId to fetch context
      await sendMessage(`Please explain this calculation in detail. Request ID: ${requestId}`);
      
      toast({
        title: 'Success',
        description: 'AI Assistant opened with calculation context.',
      });
    } catch (error) {
      console.error('Error getting explanation:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to get explanation',
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

