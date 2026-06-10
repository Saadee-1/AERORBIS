import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AeroverseAIPayload } from '@/ai/schema/AerorbisPayload';
import { callAerobotAPI } from '@/lib/aerobot-api';

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
  // TODO: refine type for `inputs` — changed any -> unknown automatically by chore/typed-cleanup
  inputs: Record<string, unknown>;
  // TODO: refine type for `results` — changed any -> unknown automatically by chore/typed-cleanup
  results: Record<string, unknown>;
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

    // Load chat history from localStorage on mount
  useEffect(() => {
    try {
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
        const storedData = localStorage.getItem(storageKey);
        
        if (storedData) {
          const parsed = JSON.parse(storedData);
          
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
          } else {
            // Data expired, remove it
            localStorage.removeItem(storageKey);
          }
        }
      } catch (error) {
        console.error('Error reading calculation context from localStorage:', error);
      }
    }

    // Build user message content — ALWAYS preserve the user's actual question
    // Append context so the AI can reference it while answering the real question
    let userMessageContent = content;
    
    if (currentPayload) {
      const payloadJson = JSON.stringify(currentPayload, null, 2);
      // Truncate very large payloads to avoid token limits (keep first 6000 chars)
      const truncatedJson = payloadJson.length > 6000 
        ? payloadJson.slice(0, 6000) + '\n... (truncated)' 
        : payloadJson;
      userMessageContent = `${content}

\`\`\`json
${truncatedJson}
\`\`\``;
    } else if (calculationContext) {
      const contextJson = JSON.stringify(calculationContext, null, 2);
      const truncatedContext = contextJson.length > 6000 
        ? contextJson.slice(0, 6000) + '\n... (truncated)' 
        : contextJson;
      userMessageContent = `${content}

Calculation Context:
\`\`\`json
${truncatedContext}
\`\`\`

Use this context to answer the question above. Reference specific inputs, results, and steps.`;
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

      const { content: aiContent, error: aiError } = await callAerobotAPI(apiMessages);

      if (aiError) {
        throw new Error(aiError);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiContent,
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
    setToolContext(null);
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
      setToolContext(null);
      setCurrentPayload(null);
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
          charts: (parsed.attachments?.charts as Array<{ title?: string }> | undefined)?.map((c, idx: number) => ({
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
