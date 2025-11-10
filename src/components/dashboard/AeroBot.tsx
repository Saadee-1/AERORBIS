import { useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

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
        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="icon"
          className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all"
        >
          {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        </Button>
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
