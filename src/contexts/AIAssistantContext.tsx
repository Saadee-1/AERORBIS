import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
  setIsOpen: (isOpen: boolean) => void;
  setMode: (mode: 'chat' | 'summarize') => void;
  setLanguage: (language: string) => void;
  setToolContext: (context: ToolContext | null) => void;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
  loadChatSession: (sessionId: string) => void;
  startNewChat: () => void;
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)));
      
      // Update chat history when there are messages
      if (messages.length > 0) {
        const sessionTitle = messages[0]?.content.slice(0, 50) || 'New Chat';
        const updatedHistory = chatHistory.filter(s => s.id !== currentSessionId);
        const currentSession: ChatSession = {
          id: currentSessionId,
          title: sessionTitle,
          messages: messages,
          timestamp: Date.now(),
        };
        const newHistory = [currentSession, ...updatedHistory].slice(0, MAX_HISTORY_SESSIONS);
        setChatHistory(newHistory);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      }
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  }, [messages, currentSessionId]);

  const sendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const apiMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Extract requestId from message
      const requestId = extractRequestId(content);
      
      // Try to fetch calculation context from localStorage if requestId is present
      let calculationContext = null;
      if (requestId) {
        try {
          const storedData = localStorage.getItem(`calc-${requestId}`);
          if (storedData) {
            const parsed = JSON.parse(storedData);
            // Check if data hasn't expired
            if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
              calculationContext = {
                requestId: parsed.requestId,
                toolId: parsed.toolId,
                toolName: parsed.toolName,
                inputs: parsed.inputs,
                results: parsed.results,
                steps: parsed.steps,
                metadata: parsed.metadata,
                timestamp: parsed.timestamp,
              };
            } else {
              // Data expired, remove it
              localStorage.removeItem(`calc-${requestId}`);
            }
          }
        } catch (error) {
          console.error('Error reading calculation context from localStorage:', error);
        }
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: apiMessages, 
          mode, 
          language, 
          toolContext, 
          requestId,
          calculationContext // Pass the full context from localStorage
        }),
      });

      const data = await response.json();

      if (!response.ok) {
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
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const loadChatSession = (sessionId: string) => {
    const session = chatHistory.find(s => s.id === sessionId);
    if (session) {
      setMessages(session.messages);
      setCurrentSessionId(sessionId);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setCurrentSessionId(Date.now().toString());
    setToolContext(null);
    localStorage.removeItem(STORAGE_KEY);
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
        setIsOpen,
        setMode,
        setLanguage,
        setToolContext,
        sendMessage,
        clearChat,
        loadChatSession,
        startNewChat,
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
