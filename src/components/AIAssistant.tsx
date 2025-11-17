import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Minimize2, Trash2, Send, History, Plus, Globe, Menu, Settings, Rocket } from 'lucide-react';
import { useAIAssistant } from '@/contexts/AIAssistantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'ar', name: 'العربية' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ur', name: 'اردو' },
];

// Astronaut Icon Component
const AstronautIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Helmet */}
    <circle cx="12" cy="10" r="6" />
    {/* Visor */}
    <path d="M12 7c-1.5 0-3 .5-3 2v1c0 1.5 1.5 2 3 2s3-.5 3-2V9c0-1.5-1.5-2-3-2z" />
    {/* Body */}
    <path d="M12 16v4" />
    <path d="M8 18h8" />
    {/* Arms */}
    <path d="M6 12l-2 2" />
    <path d="M18 12l2 2" />
    {/* Legs */}
    <path d="M10 20l-1 2" />
    <path d="M14 20l1 2" />
  </svg>
);

const AIAssistant: React.FC = () => {
  const { messages, isOpen, isLoading, mode, language, chatHistory, toolContext, notificationMessage, currentSessionId, setIsOpen, setMode, setLanguage, sendMessage, clearChat, loadChatSession, startNewChat, deleteChatSession, clearNotification } = useAIAssistant();
  const [inputValue, setInputValue] = useState('');
  const [typingText, setTypingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingText]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Typing effect for the last assistant message
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant' && !isTyping) {
      setIsTyping(true);
      setTypingText('');
      let index = 0;
      const text = lastMessage.content;
      
      const timer = setInterval(() => {
        if (index < text.length) {
          setTypingText(text.slice(0, index + 1));
          index++;
        } else {
          setIsTyping(false);
          clearInterval(timer);
        }
      }, 20);

      return () => clearInterval(timer);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const message = inputValue.trim();
    setInputValue('');
    await sendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Notification Toast */}
      <AnimatePresence>
        {notificationMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 right-8 z-50 max-w-sm"
          >
            <div
              onClick={() => {
                setIsOpen(true);
                clearNotification();
              }}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white p-4 rounded-xl shadow-[0_0_30px_rgba(34,211,238,0.6)] 
                       border border-cyan-400/50 cursor-pointer hover:shadow-[0_0_50px_rgba(34,211,238,0.8)] transition-all"
            >
              <div className="flex items-center gap-3">
                <Rocket className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-semibold flex-1">{notificationMessage}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearNotification();
                  }}
                  className="text-white/80 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Chat Bubble */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-8 right-8 z-50 w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 
                     shadow-[0_0_40px_rgba(34,211,238,0.7)] hover:shadow-[0_0_60px_rgba(34,211,238,0.9)]
                     flex items-center justify-center transition-all duration-300 hover:scale-110 group"
            style={{
              animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          >
            <AstronautIcon className="w-10 h-10 text-white group-hover:scale-110 transition-transform" />
            <div className="absolute inset-0 rounded-full bg-white/20 blur-xl group-hover:bg-white/30 transition-all" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-8 right-8 z-50 w-96 h-[600px] flex flex-col
                     bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl 
                     border border-cyan-400/40 rounded-3xl shadow-[0_0_80px_rgba(34,211,238,0.5)] overflow-hidden"
          >
            {/* Minimal Header */}
            <div className="flex items-center justify-between p-4 border-b border-cyan-400/20 bg-gradient-to-r from-slate-800/80 to-slate-900/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 
                              flex items-center justify-center shadow-[0_0_25px_rgba(34,211,238,0.7)]">
                  <AstronautIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 
                               bg-clip-text text-transparent">
                    Aerobot
                  </h3>
                  <p className="text-[10px] text-gray-400">
                    {toolContext ? `Analyzing ${toolContext.tool}` : 'Aerospace AI Assistant'}
                  </p>
                </div>
              </div>
              
              {/* Minimal Controls */}
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10"
                    >
                      <Menu className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-cyan-400/30">
                    <DropdownMenuItem onClick={() => setShowHistory(!showHistory)} className="text-cyan-400 focus:text-cyan-300 focus:bg-cyan-400/10">
                      <History className="w-4 h-4 mr-2" />
                      {showHistory ? 'Hide' : 'Show'} History
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={startNewChat} className="text-cyan-400 focus:text-cyan-300 focus:bg-cyan-400/10">
                      <Plus className="w-4 h-4 mr-2" />
                      New Chat
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={clearChat} 
                      disabled={messages.length === 0}
                      className="text-red-400 focus:text-red-300 focus:bg-red-400/10 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear Chat
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-cyan-400/20" />
                    <div className="px-2 py-1.5">
                      <p className="text-xs text-gray-400 mb-1.5">Mode</p>
                      <div className="flex gap-1">
                        <Button
                          variant={mode === 'chat' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setMode('chat')}
                          className={cn(
                            'flex-1 text-xs h-7',
                            mode === 'chat' 
                              ? 'bg-cyan-400/20 text-cyan-400 hover:bg-cyan-400/30' 
                              : 'text-gray-400 hover:text-cyan-400'
                          )}
                        >
                          Chat
                        </Button>
                        <Button
                          variant={mode === 'summarize' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setMode('summarize')}
                          className={cn(
                            'flex-1 text-xs h-7',
                            mode === 'summarize' 
                              ? 'bg-blue-400/20 text-blue-400 hover:bg-blue-400/30' 
                              : 'text-gray-400 hover:text-blue-400'
                          )}
                        >
                          Summarize
                        </Button>
                      </div>
                    </div>
                    <DropdownMenuSeparator className="bg-cyan-400/20" />
                    <div className="px-2 py-1.5">
                      <p className="text-xs text-gray-400 mb-1.5">Language</p>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger className="w-full h-7 bg-slate-800 border-cyan-400/30 text-cyan-400 text-xs">
                          <Globe className="w-3 h-3 mr-1" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-cyan-400/30">
                          {LANGUAGES.map((lang) => (
                            <SelectItem 
                              key={lang.code} 
                              value={lang.code}
                              className="text-gray-300 focus:bg-cyan-400/20 focus:text-cyan-400 text-xs"
                            >
                              {lang.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <DropdownMenuSeparator className="bg-cyan-400/20" />
                    <DropdownMenuItem 
                      onClick={() => setIsOpen(false)} 
                      className="text-gray-400 focus:text-gray-300 focus:bg-slate-800"
                    >
                      <Minimize2 className="w-4 h-4 mr-2" />
                      Minimize
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Chat History Sidebar */}
            <AnimatePresence>
              {showHistory && chatHistory.length > 0 && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 280, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="border-r border-cyan-400/20 bg-slate-900/50 overflow-hidden"
                >
                  <div className="p-3 border-b border-cyan-400/10">
                    <p className="text-xs font-semibold text-cyan-400">Recent Chats</p>
                  </div>
                  <ScrollArea className="h-full">
                    <div className="p-2 space-y-2">
                      {chatHistory.map((session) => (
                        <button
                          key={session.id}
                          onClick={() => {
                            loadChatSession(session.id);
                            setShowHistory(false);
                          }}
                          className={cn(
                            "w-full p-3 rounded-lg text-left transition-all group",
                            session.id === currentSessionId
                              ? "bg-cyan-400/20 border border-cyan-400/50"
                              : "bg-slate-800/50 border border-cyan-400/10 hover:border-cyan-400/30 hover:bg-slate-800/70"
                          )}
                        >
                          <p className="text-xs text-gray-300 truncate group-hover:text-cyan-400 transition-colors font-medium">
                            {session.title}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-1">
                            {new Date(session.timestamp).toLocaleDateString()}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-[10px] text-gray-600">
                              {session.messages.length} messages
                            </p>
                            {session.id === currentSessionId && (
                              <span className="text-[10px] text-cyan-400 font-semibold">Current</span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Delete this chat?')) {
                                  deleteChatSession(session.id);
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages Area - Maximum Space */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-cyan-400/20 
                          scrollbar-track-transparent min-h-0">
              {messages.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20 
                                  flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.5)]">
                      <AstronautIcon className="w-10 h-10 text-cyan-400" />
                    </div>
                    <p className="text-gray-400 text-sm">
                      {mode === 'chat' 
                        ? (toolContext 
                          ? `Analyzing ${toolContext.tool} results. Ask anything!`
                          : 'Ask me anything about aerospace!')
                        : 'Paste text for a concise summary'}
                    </p>
                    {toolContext && mode === 'chat' && (
                      <div className="mt-4 p-3 bg-cyan-400/10 border border-cyan-400/30 rounded-lg text-left max-w-xs mx-auto">
                        <div className="flex items-center gap-2 mb-2">
                          <Rocket className="w-4 h-4 text-cyan-400" />
                          <span className="text-xs font-semibold text-cyan-400">Tool Context Active</span>
                        </div>
                        <p className="text-xs text-gray-400">
                          I can explain results, perform calculations, and provide insights.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {messages.map((message, index) => {
                const isLastAssistant = message.role === 'assistant' && index === messages.length - 1;
                const displayContent = isLastAssistant && isTyping ? typingText : message.content;

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'flex gap-3',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20 
                                    flex items-center justify-center flex-shrink-0 mt-1">
                        <AstronautIcon className="w-5 h-5 text-cyan-400" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[75%] p-3 rounded-2xl',
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-cyan-400/20 to-blue-400/20 border border-cyan-400/30 text-gray-200'
                          : 'bg-slate-800/60 backdrop-blur-sm border border-cyan-400/20 text-gray-300'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{displayContent}</p>
                      {isLastAssistant && isTyping && (
                        <span className="inline-block w-1 h-4 ml-1 bg-cyan-400 animate-pulse" />
                      )}
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-500/20 
                                    flex items-center justify-center flex-shrink-0 mt-1">
                        <MessageSquare className="w-5 h-5 text-blue-400" />
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {isLoading && !isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20 
                                flex items-center justify-center flex-shrink-0">
                    <AstronautIcon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="bg-slate-800/60 backdrop-blur-sm border border-cyan-400/20 p-4 rounded-2xl">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-cyan-400/20 bg-gradient-to-r from-slate-800/80 to-slate-900/80">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={mode === 'chat' ? 'Ask Aerobot anything...' : 'Paste text to summarize...'}
                  disabled={isLoading}
                  className="flex-1 bg-slate-900/70 border-cyan-400/30 text-gray-200 placeholder:text-gray-500
                           focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 rounded-xl"
                />
                <Button
                  onClick={handleSend}
                  disabled={isLoading || !inputValue.trim()}
                  className="bg-gradient-to-r from-cyan-400 to-blue-400 text-white hover:shadow-[0_0_30px_rgba(34,211,238,0.6)]
                           disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-4"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIAssistant;
