import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AeroverseAIPayload } from '@/ai/schema/AeroversePayload';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  requestId?: string; // Reference to calculation requestId for follow-up Q&A
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
}

export interface ToolContext {
  tool: "WingLoading" | "LiftDrag" | "OrbitalPath" | "DeltaV" | "Reynolds" | "MaterialsDB" | "Thrust" | "Antenna" | string;
  inputs: Record<string, any>;
  results: Record<string, any>;
}

interface AIAssistantContextType {
  messages: Message[];
  isOpen: boolean;
  isLoading: boolean;
  mode: 'chat' | 'summarize';
  language: string;
  chatHistory: ChatSession[];
  toolContext: ToolContext | null;
  notificationMessage: string | null;
  currentSessionId: string;
  currentPayload: AeroverseAIPayload | null; // Current AI payload for assistant
  setIsOpen: (isOpen: boolean) => void;
  setMode: (mode: 'chat' | 'summarize') => void;
  setLanguage: (language: string) => void;
  setToolContext: (context: ToolContext | null) => void;
  setCurrentPayload: (payload: AeroverseAIPayload | null) => void;
  openAssistantWithPayload: (requestId: string, payload?: AeroverseAIPayload) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
  loadChatSession: (sessionId: string) => void;
  startNewChat: () => void;
  deleteChatSession: (sessionId: string) => void;
  showNotification: (message: string) => void;
  clearNotification: () => void;
}

const AIAssistantContext = createContext<AIAssistantContextType | undefined>(undefined);

const STORAGE_KEY = 'aeroverse_ai_chat';
const HISTORY_KEY = 'aeroverse_chat_history';
const LANGUAGE_KEY = 'aeroverse_ai_language';
const MAX_STORED_MESSAGES = 50;
const MAX_HISTORY_SESSIONS = 20;

// Extract requestId from message content
function extractRequestId(content: string): string | undefined {
  const match = content.match(/Request ID:\s*([a-zA-Z0-9-]+)/i) || 
                content.match(/requestId[:\s]+([a-zA-Z0-9-]+)/i) ||
                content.match(/(calc-[a-zA-Z0-9-]+)/i);
  return match ? match[1] : undefined;
}

export const AIAssistantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'chat' | 'summarize'>('chat');
  const [language, setLanguage] = useState<string>(() => {
    try {
      return localStorage.getItem(LANGUAGE_KEY) || 'en';
    } catch {
      return 'en';
    }
  });
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => Date.now().toString());
  const [toolContext, setToolContext] = useState<ToolContext | null>(null);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [currentPayload, setCurrentPayload] = useState<AeroverseAIPayload | null>(null);

  // Save language preference
  useEffect(() => {
    try {
      localStorage.setItem(LANGUAGE_KEY, language);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  }, [language]);

  // Load messages and history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setMessages(parsed.slice(-MAX_STORED_MESSAGES));
      }
      
      const historyStored = localStorage.getItem(HISTORY_KEY);
      if (historyStored) {
        const parsedHistory = JSON.parse(historyStored);
        setChatHistory(parsedHistory.slice(-MAX_HISTORY_SESSIONS));
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }, []);

  // Save messages and update history whenever messages change
  useEffect(() => {
    try {
      // Only save current messages to STORAGE_KEY if there are messages
      if (messages.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)));
        
        // Update chat history - save current session
        setChatHistory(prevHistory => {
          const sessionTitle = messages[0]?.content.slice(0, 50) || 'New Chat';
          const updatedHistory = prevHistory.filter(s => s.id !== currentSessionId);
          const currentSession: ChatSession = {
            id: currentSessionId,
            title: sessionTitle,
            messages: [...messages], // Save a copy of messages
            timestamp: Date.now(),
          };
          const newHistory = [currentSession, ...updatedHistory].slice(0, MAX_HISTORY_SESSIONS);
          localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
          return newHistory;
        });
      } else {
        // If no messages, remove current session from storage but keep history
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  }, [messages, currentSessionId]);

  const sendMessage = async (content: string) => {
    // PRIORITY 1: Use currentPayload from context if available (most reliable)
    // PRIORITY 2: Try to fetch calculation context from localStorage if requestId is present
    let calculationContext = null;
    const requestId = extractRequestId(content) || currentPayload?.requestId;
    
    if (currentPayload) {
      // Use the payload that was set via openAssistantWithPayload
      console.log('✅ Using currentPayload from context:', {
        toolName: currentPayload.toolName,
        requestId: currentPayload.requestId,
        hasInputs: Object.keys(currentPayload.inputs).length > 0,
        hasResults: Object.keys(currentPayload.results).length > 0,
        stepsCount: currentPayload.metadata.steps?.length || 0,
      });
      
      calculationContext = {
        requestId: currentPayload.requestId || requestId || `calc-${Date.now()}`,
        toolId: currentPayload.toolName,
        toolName: currentPayload.toolName,
        inputs: currentPayload.inputs,
        results: currentPayload.results,
        steps: currentPayload.metadata.steps || [],
        metadata: {
          ...currentPayload.metadata,
          units: currentPayload.units || {},
          charts: currentPayload.charts || [],
          configuration: currentPayload.configuration || {},
        },
        timestamp: currentPayload.metadata.timestamp,
      };
    } else if (requestId) {
      // Fallback: Load from localStorage
      try {
        const storageKey = `calc-${requestId}`;
        console.log('Looking for calculation data in localStorage with key:', storageKey);
        const storedData = localStorage.getItem(storageKey);
        
        if (storedData) {
          console.log('Found stored data, parsing...');
          const parsed = JSON.parse(storedData);
          console.log('Parsed data keys:', Object.keys(parsed));
          
          // Check if data hasn't expired
          if (!parsed.expiresAt || parsed.expiresAt > Date.now()) {
            calculationContext = {
              requestId: parsed.requestId || requestId,
              toolId: parsed.toolId,
              toolName: parsed.toolName,
              inputs: parsed.inputs || {},
              results: parsed.results || {},
              steps: parsed.steps || [],
              metadata: parsed.metadata || {},
              timestamp: parsed.timestamp || new Date().toISOString(),
            };
            console.log('✅ Calculation context loaded from localStorage:', {
              toolName: calculationContext.toolName,
              hasInputs: Object.keys(calculationContext.inputs).length > 0,
              hasResults: Object.keys(calculationContext.results).length > 0,
              stepsCount: calculationContext.steps.length,
            });
          } else {
            // Data expired, remove it
            console.warn('❌ Calculation context expired, removing from localStorage');
            localStorage.removeItem(storageKey);
          }
        } else {
          console.warn(`❌ No calculation data found in localStorage for key: ${storageKey}`);
          // Try to list all calc- keys to help debug
          const allKeys = Object.keys(localStorage).filter(k => k.startsWith('calc-'));
          console.log('Available calc- keys in localStorage:', allKeys);
        }
      } catch (error) {
        console.error('❌ Error reading calculation context from localStorage:', error);
      }
    } else {
      console.log('⚠️ No requestId found in message and no currentPayload available');
    }

    // Build user message content - ALWAYS include payload JSON if available
    let userMessageContent = content;
    
    if (currentPayload) {
      // CRITICAL: Include full payload JSON in user message so Gemini receives it directly
      // Wrap in code block to preserve formatting and avoid truncation
      const payloadJson = JSON.stringify(currentPayload, null, 2);
      userMessageContent = `Explain this calculation concisely using the payload below.

\`\`\`json
${payloadJson}
\`\`\``;

      console.log('✅ Including full payload JSON in user message:', {
        toolName: currentPayload.toolName,
        requestId: currentPayload.requestId,
        payloadSize: payloadJson.length,
      });
    } else if (calculationContext) {
      // Fallback: Include calculation context in user message if no structured payload
      const contextJson = JSON.stringify(calculationContext, null, 2);
      userMessageContent = `${content}

Calculation Context:
\`\`\`json
${contextJson}
\`\`\`

Use this context to explain the calculation. Reference specific inputs, results, and steps.`;

      console.log('✅ Including calculation context in user message:', {
        toolName: calculationContext.toolName,
        requestId: calculationContext.requestId,
      });
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessageContent,
      timestamp: Date.now(),
      requestId: currentPayload?.requestId || requestId,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const apiMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const requestBody = { 
        messages: apiMessages, 
        mode, 
        language, 
        toolContext: currentPayload ? {
          tool: currentPayload.toolName,
          inputs: currentPayload.inputs,
          results: currentPayload.results
        } : toolContext, 
        requestId: currentPayload?.requestId || requestId,
        calculationContext, // Pass the full context (from payload or localStorage)
        aeroversePayload: currentPayload // Also pass the structured payload if available
      };
      
      console.log('Sending AI chat request:', {
        hasRequestId: !!requestId,
        hasCalculationContext: !!calculationContext,
        hasCurrentPayload: !!currentPayload,
        calculationContextKeys: calculationContext ? Object.keys(calculationContext) : null,
        messageCount: apiMessages.length,
        toolName: currentPayload?.toolName || calculationContext?.toolName || 'N/A',
      });

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        // If Supabase is not configured, provide a helpful response using the context
        console.warn('Supabase URL not configured - AI Assistant will work with limited functionality');
        
        if (calculationContext) {
          // Generate a basic explanation from the context
          const explanation = `Based on your ${calculationContext.toolName || calculationContext.toolId} calculation:

**Inputs:** ${JSON.stringify(calculationContext.inputs, null, 2)}

**Results:** ${JSON.stringify(calculationContext.results, null, 2)}

**Calculation Steps:**
${calculationContext.steps?.map((step: string, idx: number) => `${idx + 1}. ${step}`).join('\n') || 'No steps available'}

This calculation was performed using the ${calculationContext.toolName || calculationContext.toolId} tool. The results show the computed values based on your input parameters.

Note: Full AI analysis requires Supabase configuration. For detailed explanations, please configure your Supabase URL.`;

          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: explanation,
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, assistantMessage]);
          setIsLoading(false);
          return;
        } else {
          throw new Error('Supabase URL not configured and no calculation context available');
        }
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        // If server error but we have context, provide fallback explanation
        if (calculationContext && data.error) {
          console.warn('Server error but context available, providing fallback explanation');
          const fallbackExplanation = `I encountered an issue connecting to the AI service, but I can see your calculation:

**Tool:** ${calculationContext.toolName || calculationContext.toolId}
**Inputs:** ${JSON.stringify(calculationContext.inputs, null, 2)}
**Results:** ${JSON.stringify(calculationContext.results, null, 2)}

**Steps:**
${calculationContext.steps?.map((step: string, idx: number) => `${idx + 1}. ${step}`).join('\n') || 'No steps'}

Error: ${data.error}`;

          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: fallbackExplanation,
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, assistantMessage]);
          setIsLoading(false);
          return;
        }
        throw new Error(data.error || 'Failed to get response');
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error instanceof Error ? error.message : 'I apologize, but I encountered an error. Please try again.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    // Save current session to history before clearing (if it has messages)
    if (messages.length > 0) {
      const sessionTitle = messages[0]?.content.slice(0, 50) || 'New Chat';
      const updatedHistory = chatHistory.filter(s => s.id !== currentSessionId);
      const currentSession: ChatSession = {
        id: currentSessionId,
        title: sessionTitle,
        messages: [...messages],
        timestamp: Date.now(),
      };
      const newHistory = [currentSession, ...updatedHistory].slice(0, MAX_HISTORY_SESSIONS);
      setChatHistory(newHistory);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    }
    
    // Clear current messages but keep history
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    // Clear payload when clearing chat
    setCurrentPayload(null);
  };

  const loadChatSession = (sessionId: string) => {
    const session = chatHistory.find(s => s.id === sessionId);
    if (session) {
      // Save current session before loading another
      if (messages.length > 0 && currentSessionId !== sessionId) {
        const sessionTitle = messages[0]?.content.slice(0, 50) || 'New Chat';
        const updatedHistory = chatHistory.filter(s => s.id !== currentSessionId);
        const currentSession: ChatSession = {
          id: currentSessionId,
          title: sessionTitle,
          messages: [...messages],
          timestamp: Date.now(),
        };
        const newHistory = [currentSession, ...updatedHistory].slice(0, MAX_HISTORY_SESSIONS);
        setChatHistory(newHistory);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      }
      
      setMessages(session.messages);
      setCurrentSessionId(sessionId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session.messages.slice(-MAX_STORED_MESSAGES)));
    }
  };

  const startNewChat = () => {
    // Save current session to history before starting new chat (if it has messages)
    if (messages.length > 0) {
      const sessionTitle = messages[0]?.content.slice(0, 50) || 'New Chat';
      const updatedHistory = chatHistory.filter(s => s.id !== currentSessionId);
      const currentSession: ChatSession = {
        id: currentSessionId,
        title: sessionTitle,
        messages: [...messages],
        timestamp: Date.now(),
      };
      const newHistory = [currentSession, ...updatedHistory].slice(0, MAX_HISTORY_SESSIONS);
      setChatHistory(newHistory);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    }
    
    // Start new chat
    const newSessionId = Date.now().toString();
    setMessages([]);
    setCurrentSessionId(newSessionId);
    setToolContext(null);
    setCurrentPayload(null); // Clear payload when starting new chat
    localStorage.removeItem(STORAGE_KEY);
  };

  const deleteChatSession = (sessionId: string) => {
    const updatedHistory = chatHistory.filter(s => s.id !== sessionId);
    setChatHistory(updatedHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    
    // If deleting current session, clear messages
    if (sessionId === currentSessionId) {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEY);
      // Start a new session
      const newSessionId = Date.now().toString();
      setCurrentSessionId(newSessionId);
    }
  };

  const showNotification = (message: string) => {
    setNotificationMessage(message);
    // Auto-clear notification after 5 seconds
    setTimeout(() => {
      setNotificationMessage(null);
    }, 5000);
  };

  const clearNotification = () => {
    setNotificationMessage(null);
  };

  /**
   * Opens AI assistant with a complete payload from a calculation
   * This ensures the assistant ALWAYS has full context before opening
   * 
   * @param requestId - Unique request ID from calculation event
   * @param payload - Optional pre-built payload (if not provided, loads from localStorage)
   */
  const openAssistantWithPayload = async (requestId: string, payload?: AeroverseAIPayload) => {
    try {
      let finalPayload = payload;

      // If payload not provided, load from localStorage using requestId
      if (!finalPayload) {
        const storageKey = `calc-${requestId}`;
        const storedData = localStorage.getItem(storageKey);
        
        if (!storedData) {
          throw new Error(`No calculation data found for request ID: ${requestId}`);
        }

        const parsed = JSON.parse(storedData);
        
        // Check if data hasn't expired
        if (parsed.expiresAt && parsed.expiresAt < Date.now()) {
          throw new Error('Calculation data has expired');
        }

        // Convert stored calculation event to AeroverseAIPayload format
        finalPayload = {
          toolName: parsed.toolName || parsed.toolId || 'Unknown Tool',
          inputs: parsed.inputs || {},
          results: parsed.results || {},
          units: parsed.units || {},
          charts: parsed.attachments?.charts?.map((c: any, idx: number) => ({
            id: `chart-${idx}`,
            title: c.title || `Chart ${idx + 1}`
          })) || [],
          configuration: parsed.configuration || {},
          metadata: {
            timestamp: parsed.timestamp || new Date().toISOString(),
            version: parsed.version || '1.0.0',
            steps: parsed.steps || [],
            unitsSystem: parsed.metadata?.units || 'SI',
            approxLevel: parsed.metadata?.approxLevel || 'numeric',
            confidence: parsed.metadata?.confidence || 'medium',
            warnings: parsed.metadata?.warnings || [],
          }
        };
      }

      // Set payload in context FIRST (before opening)
      setCurrentPayload(finalPayload);
      
      // Update tool context for backward compatibility
      setToolContext({
        tool: finalPayload.toolName,
        inputs: finalPayload.inputs,
        results: finalPayload.results
      });

      // Open assistant UI
      setIsOpen(true);

      // Send initial explanation request with full context
      // The sendMessage function will use currentPayload from context and include payload JSON in message
      const explanationPrompt = `Explain this ${finalPayload.toolName} calculation.`;
      await sendMessage(explanationPrompt);
    } catch (error) {
      console.error('Error opening assistant with payload:', error);
      throw error;
    }
  };

  return (
    <AIAssistantContext.Provider
      value={{
        messages,
        isOpen,
        isLoading,
        mode,
        language,
        chatHistory,
        toolContext,
        notificationMessage,
        currentSessionId,
        currentPayload,
        setIsOpen,
        setMode,
        setLanguage,
        setToolContext,
        setCurrentPayload,
        openAssistantWithPayload,
        sendMessage,
        clearChat,
        loadChatSession,
        startNewChat,
        deleteChatSession,
        showNotification,
        clearNotification,
      }}
    >
      {children}
    </AIAssistantContext.Provider>
  );
};

export const useAIAssistant = () => {
  const context = useContext(AIAssistantContext);
  if (!context) {
    throw new Error('useAIAssistant must be used within AIAssistantProvider');
  }
  return context;
};
