import { useState } from "react";
import { X, Send, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

const AeroBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm AeroBot, your aerospace learning assistant. How can I help you today?", sender: "bot" },
  ]);
  const [inputValue, setInputValue] = useState("");

  const handleSend = () => {
    if (!inputValue.trim()) return;
    const userMessage = { id: Date.now(), text: inputValue, sender: "user" };
    setMessages([...messages, userMessage]);
    setTimeout(() => {
      setMessages((prev) => [...prev, {
        id: Date.now() + 1,
        text: "I'm a placeholder assistant. In the future, I'll provide real-time aerospace learning tips and guidance!",
        sender: "bot",
      }]);
    }, 1000);
    setInputValue("");
  };

  return (
    <>
      {/* Chat Bubble */}
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="fixed bottom-6 right-6 z-50">
        <motion.div
          onClick={() => setIsOpen(!isOpen)}
          className="w-12 h-12 rounded-lg bg-slate-900/90 border border-primary/25 flex items-center justify-center cursor-pointer hover:border-primary/50 hover:shadow-[0_0_15px_hsl(160_84%_39%/0.2)] transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isOpen ? (
            <X className="w-5 h-5 text-primary" />
          ) : (
            <img
              src="/aerobot-icon.png?v=2"
              alt="AeroBot"
              className="w-full h-full object-contain p-1"
              loading="eager"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
        </motion.div>
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-96 h-[500px] z-50 flex flex-col rounded-xl overflow-hidden"
          >
            {/* Background */}
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl" />
            <div className="absolute inset-0 rounded-xl border border-primary/20" />
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/50" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary/50" />

            {/* Header */}
            <div className="relative p-4 border-b border-primary/15">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-primary" />
                <div>
                  <h3 className="text-xs font-semibold text-foreground tracking-wider uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    AeroBot Assistant
                  </h3>
                  <p className="text-[9px] text-primary/60 tracking-[0.2em] uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    // Channel Open
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="relative flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[80%] p-3 rounded-lg text-sm ${
                    msg.sender === "user"
                      ? "bg-primary/15 text-foreground border border-primary/20"
                      : "bg-muted/10 text-foreground/90 border border-muted/15"
                  }`}>
                    {msg.text}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Input */}
            <div className="relative p-4 border-t border-primary/15">
              <div className="flex space-x-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Transmit message..."
                  className="flex-1 bg-slate-800/30 border-primary/15 text-foreground text-sm"
                  style={{ fontFamily: 'Rajdhani, sans-serif' }}
                />
                <Button onClick={handleSend} size="icon" className="bg-primary/15 text-primary border border-primary/25 hover:bg-primary/25">
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
