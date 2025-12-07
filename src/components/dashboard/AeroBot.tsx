import { useState } from "react";
import { X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

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
    {/* Helmet */}
    <circle cx="12" cy="8.5" r="5" fill="white" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="8.5" r="5" fill="currentColor" fillOpacity="0.05" />
    <path d="M7 6.5h10" stroke="currentColor" strokeWidth="1.5" />
    
    {/* Visor */}
    <ellipse cx="12" cy="8.5" rx="3.5" ry="2.8" fill="#1a0d3a" stroke="currentColor" strokeWidth="0.8" />
    <ellipse cx="12" cy="8.5" rx="3.5" ry="2.8" fill="currentColor" fillOpacity="0.15" />
    <ellipse cx="10.5" cy="8" rx="1.2" ry="0.8" fill="white" opacity="0.4" />
    
    {/* Antenna */}
    <circle cx="12" cy="3" r="0.6" fill="currentColor" />
    <path d="M12 3v1.5" stroke="currentColor" strokeWidth="1.2" />
    
    {/* Body */}
    <path d="M9 13.5 Q9 12.5 12 12.5 Q15 12.5 15 13.5 L15 17 Q15 18 12 18 Q9 18 9 17 Z" 
          fill="white" stroke="currentColor" strokeWidth="1.5" />
    
    {/* Chest panel */}
    <rect x="10.5" y="14" width="3" height="2.5" rx="0.4" fill="white" stroke="currentColor" strokeWidth="0.8" />
    <circle cx="11.2" cy="15.2" r="0.3" fill="currentColor" fillOpacity="0.6" />
    <circle cx="12" cy="15.2" r="0.3" fill="currentColor" fillOpacity="0.6" />
    <circle cx="12.8" cy="15.2" r="0.3" fill="currentColor" fillOpacity="0.6" />
    
    {/* Arms */}
    <path d="M6.5 12 Q5.5 13 5 14.5 Q4.5 16 5.5 17" 
          fill="white" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="5.5" cy="17" r="1.2" fill="white" stroke="currentColor" strokeWidth="1.2" />
    <path d="M17.5 12 Q18.5 11 19 9.5 Q19.5 8 18.5 7.5 Q17.5 7 16.5 8 Q16 9 16.5 10 Q17 11 17.5 12" 
          fill="white" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="18.5" cy="8" r="1.2" fill="white" stroke="currentColor" strokeWidth="1.2" />
    
    {/* Legs */}
    <path d="M10.5 17 L10.5 20.5 Q10.5 21.5 11.5 21.5" fill="white" stroke="currentColor" strokeWidth="1.5" />
    <path d="M13.5 17 L13.5 20.5 Q13.5 21.5 12.5 21.5" fill="white" stroke="currentColor" strokeWidth="1.5" />
    <ellipse cx="11" cy="21.5" rx="1" ry="0.8" fill="currentColor" fillOpacity="0.3" />
    <ellipse cx="13" cy="21.5" rx="1" ry="0.8" fill="currentColor" fillOpacity="0.3" />
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
          {isOpen ? <X className="w-6 h-6 text-white" /> : <AstronautIcon className="w-7 h-7 text-white" />}
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
