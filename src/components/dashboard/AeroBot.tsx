import { useState } from "react";
import { X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

// Enhanced Realistic Astronaut Icon Component
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
    {/* Helmet - More realistic with depth */}
    <defs>
      <linearGradient id="helmetGradient" x1="12" y1="3" x2="12" y2="13.5">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
        <stop offset="50%" stopColor="#f0f0f0" stopOpacity="0.95" />
        <stop offset="100%" stopColor="#e0e0e0" stopOpacity="0.9" />
      </linearGradient>
      <linearGradient id="visorGradient" x1="12" y1="6" x2="12" y2="11">
        <stop offset="0%" stopColor="#2a1a4a" stopOpacity="0.9" />
        <stop offset="50%" stopColor="#1a0d3a" stopOpacity="0.95" />
        <stop offset="100%" stopColor="#0d0520" stopOpacity="1" />
      </linearGradient>
      <linearGradient id="bodyGradient" x1="12" y1="12.5" x2="12" y2="18">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
        <stop offset="100%" stopColor="#f5f5f5" stopOpacity="0.95" />
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    
    {/* Helmet base with gradient */}
    <circle cx="12" cy="8.5" r="5" fill="url(#helmetGradient)" stroke="currentColor" strokeWidth="1.5" />
    {/* Helmet rim highlight */}
    <path d="M7 6.5h10" stroke="currentColor" strokeWidth="1.5" opacity="0.8" />
    <path d="M7 6.5h10" stroke="white" strokeWidth="0.5" opacity="0.3" />
    
    {/* Visor with realistic dark tint and reflection */}
    <ellipse cx="12" cy="8.5" rx="3.5" ry="2.8" fill="url(#visorGradient)" stroke="currentColor" strokeWidth="0.8" />
    {/* Visor reflection highlight */}
    <ellipse cx="10.5" cy="7.8" rx="1.5" ry="1" fill="white" opacity="0.25" />
    <ellipse cx="11" cy="8.2" rx="0.8" ry="0.5" fill="white" opacity="0.4" />
    {/* Visor rim shine */}
    <ellipse cx="12" cy="8.5" rx="3.5" ry="2.8" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.3" />
    
    {/* Antenna with detail */}
    <circle cx="12" cy="3" r="0.6" fill="currentColor" filter="url(#glow)" />
    <path d="M12 3v1.5" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="12" cy="4.2" r="0.3" fill="currentColor" opacity="0.6" />
    
    {/* Body with gradient and depth */}
    <path d="M9 13.5 Q9 12.5 12 12.5 Q15 12.5 15 13.5 L15 17 Q15 18 12 18 Q9 18 9 17 Z" 
          fill="url(#bodyGradient)" stroke="currentColor" strokeWidth="1.5" />
    {/* Body shadow for depth */}
    <path d="M9 13.5 Q9 12.5 12 12.5 Q15 12.5 15 13.5" 
          stroke="rgba(0,0,0,0.1)" strokeWidth="2" fill="none" />
    
    {/* Chest control panel with more detail */}
    <rect x="10.5" y="14" width="3" height="2.5" rx="0.4" fill="white" stroke="currentColor" strokeWidth="0.8" />
    <rect x="10.5" y="14" width="3" height="2.5" rx="0.4" fill="rgba(0,0,0,0.05)" />
    {/* Control buttons with depth */}
    <circle cx="11.2" cy="15.2" r="0.3" fill="currentColor" fillOpacity="0.7" />
    <circle cx="11.2" cy="15.2" r="0.15" fill="white" opacity="0.3" />
    <circle cx="12" cy="15.2" r="0.3" fill="currentColor" fillOpacity="0.7" />
    <circle cx="12" cy="15.2" r="0.15" fill="white" opacity="0.3" />
    <circle cx="12.8" cy="15.2" r="0.3" fill="currentColor" fillOpacity="0.7" />
    <circle cx="12.8" cy="15.2" r="0.15" fill="white" opacity="0.3" />
    
    {/* Left arm with better proportions */}
    <path d="M6.5 12 Q5.5 13 5 14.5 Q4.5 16 5.5 17" 
          fill="white" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="5.5" cy="17" r="1.2" fill="white" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="5.5" cy="17" r="0.6" fill="rgba(0,0,0,0.1)" />
    
    {/* Right arm with better proportions */}
    <path d="M17.5 12 Q18.5 11 19 9.5 Q19.5 8 18.5 7.5 Q17.5 7 16.5 8 Q16 9 16.5 10 Q17 11 17.5 12" 
          fill="white" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="18.5" cy="8" r="1.2" fill="white" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="18.5" cy="8" r="0.6" fill="rgba(0,0,0,0.1)" />
    
    {/* Legs with better detail */}
    <path d="M10.5 17 L10.5 20.5 Q10.5 21.5 11.5 21.5" fill="white" stroke="currentColor" strokeWidth="1.5" />
    <path d="M13.5 17 L13.5 20.5 Q13.5 21.5 12.5 21.5" fill="white" stroke="currentColor" strokeWidth="1.5" />
    {/* Boots with depth */}
    <ellipse cx="11" cy="21.5" rx="1" ry="0.8" fill="currentColor" fillOpacity="0.4" />
    <ellipse cx="11" cy="21.5" rx="0.6" ry="0.5" fill="rgba(0,0,0,0.2)" />
    <ellipse cx="13" cy="21.5" rx="1" ry="0.8" fill="currentColor" fillOpacity="0.4" />
    <ellipse cx="13" cy="21.5" rx="0.6" ry="0.5" fill="rgba(0,0,0,0.2)" />
  </svg>
);

const AeroBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm AeroBot, your aerospace learning assistant. How can I help you today?", sender: "bot" },
  ]);
  const [inputValue, setInputValue] = useState("");

  // Future Integration: Real AI Chat Assistant
  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMessage = { id: Date.now(), text: inputValue, sender: "user" };
    setMessages([...messages, userMessage]);

    // Mock bot response
    setTimeout(() => {
      const botMessage = {
        id: Date.now() + 1,
        text: "I'm a placeholder assistant. In the future, I'll provide real-time aerospace learning tips and guidance!",
        sender: "bot",
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 1000);

    setInputValue("");
  };

  return (
    <>
      {/* Chat Bubble Button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="aerobot-icon"
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <img 
              src="/aerobot-icon.png" 
              alt="AeroBot Assistant" 
              className="w-full h-full object-contain"
            />
          )}
        </div>
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-96 h-[500px] bg-card border border-border rounded-lg shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="bg-primary text-primary-foreground p-4 rounded-t-lg">
              <h3 className="font-semibold text-lg">AeroBot Assistant</h3>
              <p className="text-xs opacity-90">Your aerospace learning companion</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      msg.sender === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="flex space-x-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask me anything..."
                  className="flex-1 bg-muted"
                />
                <Button onClick={handleSend} size="icon" className="bg-primary text-primary-foreground">
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

export default AeroBot;
