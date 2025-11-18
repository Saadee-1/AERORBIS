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

// Realistic Astronaut Icon Component
const AstronautIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Helmet - More realistic rounded shape */}
    <circle cx="12" cy="8.5" r="5" fill="white" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="8.5" r="5" fill="currentColor" fillOpacity="0.05" />
    
    {/* Helmet rim/band */}
    <path d="M7 6.5h10" stroke="currentColor" strokeWidth="1.5" />
    
    {/* Visor - Dark reflective with highlights */}
    <ellipse cx="12" cy="8.5" rx="3.5" ry="2.8" fill="#1a0d3a" stroke="currentColor" strokeWidth="0.8" />
    <ellipse cx="12" cy="8.5" rx="3.5" ry="2.8" fill="currentColor" fillOpacity="0.15" />
    {/* Visor highlight */}
    <ellipse cx="10.5" cy="8" rx="1.2" ry="0.8" fill="white" opacity="0.4" />
    
    {/* Antenna on helmet */}
    <circle cx="12" cy="3" r="0.6" fill="currentColor" />
    <path d="M12 3v1.5" stroke="currentColor" strokeWidth="1.2" />
    
    {/* Body - More realistic torso shape */}
    <path d="M9 13.5 Q9 12.5 12 12.5 Q15 12.5 15 13.5 L15 17 Q15 18 12 18 Q9 18 9 17 Z" 
          fill="white" stroke="currentColor" strokeWidth="1.5" />
    <path d="M9 13.5 Q9 12.5 12 12.5 Q15 12.5 15 13.5 L15 17 Q15 18 12 18 Q9 18 9 17 Z" 
          fill="currentColor" fillOpacity="0.05" />
    
    {/* Chest control panel */}
    <rect x="10.5" y="14" width="3" height="2.5" rx="0.4" fill="white" stroke="currentColor" strokeWidth="0.8" />
    <rect x="10.5" y="14" width="3" height="2.5" rx="0.4" fill="currentColor" fillOpacity="0.2" />
    {/* Control buttons */}
    <circle cx="11.2" cy="15.2" r="0.3" fill="currentColor" fillOpacity="0.6" />
    <circle cx="12" cy="15.2" r="0.3" fill="currentColor" fillOpacity="0.6" />
    <circle cx="12.8" cy="15.2" r="0.3" fill="currentColor" fillOpacity="0.6" />
    
    {/* Left arm - more natural position */}
    <path d="M6.5 12 Q5.5 13 5 14.5 Q4.5 16 5.5 17" 
          fill="white" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="5.5" cy="17" r="1.2" fill="white" stroke="currentColor" strokeWidth="1.2" />
    
    {/* Right arm - waving position */}
    <path d="M17.5 12 Q18.5 11 19 9.5 Q19.5 8 18.5 7.5 Q17.5 7 16.5 8 Q16 9 16.5 10 Q17 11 17.5 12" 
          fill="white" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="18.5" cy="8" r="1.2" fill="white" stroke="currentColor" strokeWidth="1.2" />
    
    {/* Legs - More realistic space suit legs */}
    <path d="M10.5 17 L10.5 20.5 Q10.5 21.5 11.5 21.5 L11.5 21.5 Q12.5 21.5 12.5 20.5 L12.5 17" 
          fill="white" stroke="currentColor" strokeWidth="1.5" />
    <path d="M11.5 17 L11.5 20.5 Q11.5 21.5 12.5 21.5 L12.5 21.5 Q13.5 21.5 13.5 20.5 L13.5 17" 
          fill="white" stroke="currentColor" strokeWidth="1.5" />
    
    {/* Boots */}
    <ellipse cx="11" cy="21.5" rx="1" ry="0.8" fill="currentColor" fillOpacity="0.3" />
    <ellipse cx="13" cy="21.5" rx="1" ry="0.8" fill="currentColor" fillOpacity="0.3" />
  </svg>
);

const AIAssistant: React.FC = () => {
  const { messages, isOpen, isLoading, mode, language, chatHistory, toolContext, notificationMessage, currentSessionId, currentPayload, setIsOpen, setMode, setLanguage, sendMessage, clearChat, loadChatSession, startNewChat, deleteChatSession, clearNotification } = useAIAssistant();
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
            className="fixed bottom-8 right-8 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 
                     shadow-[0_0_40px_rgba(34,211,238,0.7)] hover:shadow-[0_0_60px_rgba(34,211,238,0.9)]
                     flex items-center justify-center transition-all duration-300 hover:scale-110 group"
            style={{
              animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          >
            <AstronautIcon className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
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
            className="fixed bottom-4 right-4 z-50 w-[320px] max-w-[calc(100vw-2rem)] h-[calc(100vh-8rem)] max-h-[600px] min-h-[450px] flex flex-col
                     bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl 
                     border border-cyan-400/40 rounded-3xl shadow-[0_0_80px_rgba(34,211,238,0.5)] overflow-hidden"
          >
            {/* Minimal Header - Always Visible */}
            <div className="flex items-center justify-between p-3 border-b border-cyan-400/20 bg-gradient-to-r from-slate-800/80 to-slate-900/80 flex-shrink-0">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 
                              flex items-center justify-center shadow-[0_0_25px_rgba(34,211,238,0.7)] flex-shrink-0">
                  <AstronautIcon className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 
                               bg-clip-text text-transparent truncate">
                    Aerobot
                  </h3>
                  <p className="text-[9px] text-gray-400 truncate">
                    {toolContext ? `Analyzing ${toolContext.tool}` : 'Aerospace AI'}
                  </p>
                </div>
              </div>
              
              {/* Minimal Controls - Always Visible */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10"
                      title="Menu"
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
                  className="h-7 w-7 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10"
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
                  animate={{ width: 260, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="border-r border-cyan-400/20 bg-slate-900/50 overflow-hidden flex-shrink-0"
                >
                  <div className="p-2 border-b border-cyan-400/10 flex-shrink-0">
                    <p className="text-xs font-semibold text-cyan-400">Recent Chats</p>
                  </div>
                  <ScrollArea className="flex-1 min-h-0">
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

            {/* Messages Area - Maximum Space with proper flex */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-cyan-400/20 
                          scrollbar-track-transparent min-h-0 flex flex-col">
              {messages.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20 
                                  flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.5)]">
                      <AstronautIcon className="w-10 h-10 text-cyan-400" />
                    </div>
                    <p className="text-gray-400 text-sm">
                      {mode === 'chat' 
                        ? (toolContext || currentPayload
                          ? `Analyzing ${toolContext?.tool || currentPayload?.toolName || 'calculation'} results. Ask anything!`
                          : 'Ask me anything about aerospace!')
                        : 'Paste text for a concise summary'}
                    </p>
                    {(toolContext || currentPayload) && mode === 'chat' && (
                      <div className="mt-4 p-3 bg-cyan-400/10 border border-cyan-400/30 rounded-lg text-left max-w-xs mx-auto">
                        <div className="flex items-center gap-2 mb-2">
                          <Rocket className="w-4 h-4 text-cyan-400" />
                          <span className="text-xs font-semibold text-cyan-400">Tool Context Active</span>
                        </div>
                        <p className="text-xs text-gray-400">
                          I can explain results, perform calculations, and provide insights.
                        </p>
                        {currentPayload && (!currentPayload.results || Object.keys(currentPayload.results).length === 0) && (
                          <div className="mt-2 p-2 bg-yellow-400/10 border border-yellow-400/30 rounded text-xs text-yellow-400">
                            ⚠️ No results found in payload. Please verify the calculation completed.
                          </div>
                        )}
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

            {/* Input Area - Always Visible */}
            <div className="p-3 border-t border-cyan-400/20 bg-gradient-to-r from-slate-800/80 to-slate-900/80 flex-shrink-0">
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
