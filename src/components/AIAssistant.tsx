import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Minimize2, Trash2, Send, Sparkles, History, Plus, Globe, Calculator } from 'lucide-react';
import { useAIAssistant } from '@/contexts/AIAssistantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

const AIAssistant: React.FC = () => {
  const { messages, isOpen, isLoading, mode, language, chatHistory, toolContext, notificationMessage, currentSessionId, setIsOpen, setMode, setLanguage, sendMessage, clearChat, loadChatSession, startNewChat, clearNotification } = useAIAssistant();
  const [inputValue, setInputValue] = useState('');
  const [typingText, setTypingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
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
                <Calculator className="w-5 h-5 flex-shrink-0" />
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
            className="fixed bottom-8 right-8 z-50 w-16 h-16 rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 
                     shadow-[0_0_30px_rgba(34,211,238,0.6)] hover:shadow-[0_0_50px_rgba(34,211,238,0.8)]
                     flex items-center justify-center transition-all duration-300 hover:scale-110"
            style={{
              animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          >
            <Sparkles className="w-8 h-8 text-black" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-8 right-8 z-50 w-72 h-[450px] flex flex-col
                     bg-slate-900/80 backdrop-blur-xl border border-cyan-400/30 rounded-2xl
                     shadow-[0_0_60px_rgba(34,211,238,0.4)] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-cyan-400/20 bg-slate-800/50">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 h-8 w-8"
                  title="Exit"
                >
                  <X className="w-4 h-4" />
                </Button>
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 
                              flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.6)]">
                  <Sparkles className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3 className="text-sm font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 
                               bg-clip-text text-transparent">
                    AeroVerse AI
                  </h3>
                  <p className="text-[10px] text-gray-400">
                    {toolContext ? `Analyzing: ${toolContext.tool}` : 'Your aerospace guide'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-[110px] h-8 bg-slate-900/50 border-cyan-400/30 text-cyan-400 text-xs">
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 h-8 w-8"
                  title="Chat history"
                >
                  <History className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={startNewChat}
                  className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 h-8 w-8"
                  title="New chat"
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearChat}
                  className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 h-8 w-8"
                  title="Clear chat"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 h-8 w-8"
                  title="Minimize"
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-2 p-3 bg-slate-800/30">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode('chat')}
                className={cn(
                  'flex-1 text-xs',
                  mode === 'chat' 
                    ? 'bg-cyan-400/20 text-cyan-400 hover:bg-cyan-400/30' 
                    : 'text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10'
                )}
              >
                Chat Mode
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode('summarize')}
                className={cn(
                  'flex-1 text-xs',
                  mode === 'summarize' 
                    ? 'bg-blue-400/20 text-blue-400 hover:bg-blue-400/30' 
                    : 'text-gray-400 hover:text-blue-400 hover:bg-blue-400/10'
                )}
              >
                Summarize Mode
              </Button>
            </div>

            {/* Chat History Panel */}
            {showHistory && (
              <div className="border-b border-cyan-400/20 bg-slate-800/30 max-h-60">
                <div className="p-2 border-b border-cyan-400/10">
                  <p className="text-xs font-semibold text-cyan-400 px-2">Chat History</p>
                </div>
                <ScrollArea className="h-full max-h-52">
                  <div className="p-3 space-y-2">
                    {chatHistory.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-4">No chat history yet</p>
                    ) : (
                      chatHistory.map((session) => (
                        <button
                          key={session.id}
                          onClick={() => {
                            loadChatSession(session.id);
                            setShowHistory(false);
                          }}
                          className="w-full text-left p-3 rounded-lg bg-slate-900/50 hover:bg-slate-800/70 
                                   border border-cyan-400/10 hover:border-cyan-400/30 transition-all group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-300 truncate group-hover:text-cyan-400 transition-colors">
                                {session.title}
                              </p>
                              <p className="text-[10px] text-gray-500 mt-1">
                                {new Date(session.timestamp).toLocaleString()}
                              </p>
                              <p className="text-[10px] text-gray-600 mt-1">
                                {session.messages.length} message{session.messages.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            {session.id === currentSessionId && (
                              <span className="text-[10px] text-cyan-400 font-semibold">Current</span>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-cyan-400/20 
                          scrollbar-track-transparent">
              {messages.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <Sparkles className="w-12 h-12 text-cyan-400 mx-auto drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
                    <p className="text-gray-400 text-sm">
                      {mode === 'chat' 
                        ? (toolContext 
                          ? `I'm analyzing your ${toolContext.tool} results. Ask me anything!`
                          : 'Ask me anything about aerospace!')
                        : 'Paste text to get a summary'}
                    </p>
                    {toolContext && mode === 'chat' && (
                      <div className="mt-4 p-3 bg-cyan-400/10 border border-cyan-400/30 rounded-lg text-left">
                        <div className="flex items-center gap-2 mb-2">
                          <Calculator className="w-4 h-4 text-cyan-400" />
                          <span className="text-xs font-semibold text-cyan-400">Tool Context Active</span>
                        </div>
                        <p className="text-xs text-gray-400">
                          I can explain your results, perform follow-up calculations, and provide engineering insights.
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
                      'flex',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[80%] p-3 rounded-2xl',
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-cyan-400/20 to-blue-400/20 border border-cyan-400/30 text-gray-200'
                          : 'bg-slate-800/60 backdrop-blur-sm border border-cyan-400/20 text-gray-300'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{displayContent}</p>
                      {isLastAssistant && isTyping && (
                        <span className="inline-block w-1 h-4 ml-1 bg-cyan-400 animate-pulse" />
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {isLoading && !isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-slate-800/60 backdrop-blur-sm border border-cyan-400/20 p-3 rounded-2xl">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-cyan-400/20 bg-slate-800/50">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={mode === 'chat' ? 'Ask me anything...' : 'Paste text to summarize...'}
                  disabled={isLoading}
                  className="flex-1 bg-slate-900/50 border-cyan-400/30 text-gray-200 placeholder:text-gray-500
                           focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
                />
                <Button
                  onClick={handleSend}
                  disabled={isLoading || !inputValue.trim()}
                  className="bg-gradient-to-r from-cyan-400 to-blue-400 text-black hover:shadow-[0_0_30px_rgba(34,211,238,0.6)]
                           disabled:opacity-50 disabled:cursor-not-allowed"
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
