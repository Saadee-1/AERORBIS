import { Search, Bell, Menu, Shield, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "@/components/ThemeToggle";
import { useTheme } from "@/contexts/ThemeContext";

interface DashboardTopbarProps {
  toggleSidebar: () => void;
}

const DashboardTopbar = ({ toggleSidebar }: DashboardTopbarProps) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const notifications = [
    { id: 1, text: "Your research submission was featured!", time: "2h ago", priority: "high" },
    { id: 2, text: "New propulsion module released.", time: "5h ago", priority: "normal" },
    { id: 3, text: "You earned a new badge!", time: "1d ago", priority: "normal" },
  ];

  return (
    <header className="sticky top-0 z-30 relative">
      {/* Background */}
      <div className={`absolute inset-0 backdrop-blur-xl ${
        isLight 
          ? 'bg-background/90 border-b border-border' 
          : 'bg-gradient-to-r from-slate-950/90 via-slate-900/85 to-slate-950/90'
      }`} />
      
      {/* Bottom border glow - dark only */}
      {!isLight && (
        <>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
        </>
      )}

      <div className="relative flex items-center justify-between p-4">
        {/* Left side */}
        <div className="flex items-center space-x-4 flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="text-muted-foreground hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20"
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="relative max-w-md w-full hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-primary/60" />
            <Input
              type="search"
              placeholder="Search systems..."
              className={`pl-10 text-foreground placeholder:text-muted-foreground text-sm ${
                isLight 
                  ? 'bg-muted/50 border-border focus:border-primary/40' 
                  : 'bg-slate-800/30 border-primary/15 focus:border-primary/40 focus:shadow-[0_0_15px_hsl(160_84%_39%/0.1)]'
              }`}
              style={{ fontFamily: 'Rajdhani, sans-serif' }}
            />
          </div>

          {/* Status indicators */}
          <div className="hidden lg:flex items-center gap-3 ml-4">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary/5 border border-primary/10">
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_4px_hsl(160_60%_45%)]"
              />
              <span className="text-[10px] text-muted-foreground tracking-wider uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                Secure
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary/5 border border-primary/10">
              <Wifi className="w-3 h-3 text-primary/60" />
              <span className="text-[10px] text-muted-foreground tracking-wider uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                Connected
              </span>
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-3">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNotifications(!showNotifications)}
              className="text-muted-foreground hover:text-primary hover:bg-primary/10 relative border border-transparent hover:border-primary/20"
            >
              <Bell className="w-4 h-4" />
              <motion.span
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_hsl(160_84%_39%/0.8)]"
              />
            </Button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className={`absolute right-0 mt-2 w-80 rounded-lg overflow-hidden border shadow-lg ${
                    isLight 
                      ? 'border-border bg-card' 
                      : 'border-primary/20 shadow-[0_0_30px_hsl(185_85%_50%/0.1)]'
                  }`}
                >
                  {!isLight && <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl" />}

                  {/* HUD corners - dark only */}
                  {!isLight && (
                    <>
                      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/50" />
                      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-primary/50" />
                      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-primary/50" />
                      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/50" />
                    </>
                  )}

                  <div className="relative">
                    <div className={`p-3 border-b ${isLight ? 'border-border' : 'border-primary/15'}`}>
                      <h3 className={`text-[11px] tracking-[0.2em] uppercase font-semibold ${isLight ? 'text-foreground' : 'text-primary'}`} style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                        {isLight ? 'Notifications' : '// Incoming Transmissions'}
                      </h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.map((notif, i) => (
                        <motion.div
                          key={notif.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className={`p-3 transition-colors cursor-pointer last:border-0 ${
                            isLight 
                              ? 'hover:bg-muted/50 border-b border-border/50' 
                              : 'hover:bg-primary/5 border-b border-primary/5'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {notif.priority === "high" && (
                              <motion.div
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0"
                              />
                            )}
                            <div>
                              <p className="text-sm text-foreground/90">{notif.text}</p>
                              <p className={`text-[10px] mt-1 tracking-wider uppercase ${isLight ? 'text-muted-foreground' : 'text-primary/60'}`} style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                                {notif.time}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Separator */}
          <div className={`w-px h-8 ${isLight ? 'bg-border' : 'bg-gradient-to-b from-transparent via-primary/20 to-transparent'}`} />

          {/* User Profile */}
          <div className="flex items-center space-x-3 cursor-pointer group">
            <div className="relative">
              <Avatar className={`w-8 h-8 ring-1 transition-all ${isLight ? 'ring-border group-hover:ring-primary/50' : 'ring-primary/30 group-hover:ring-primary/50'}`}>
                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Saad" />
                <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">SA</AvatarFallback>
              </Avatar>
              <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border ${isLight ? 'border-background' : 'border-slate-900'} shadow-[0_0_4px_hsl(160_60%_45%)]`} />
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-foreground tracking-wide">Saad Ahmed</p>
              <p className={`text-[10px] tracking-[0.15em] uppercase ${isLight ? 'text-muted-foreground' : 'text-primary/70'}`} style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                Clearance: L3
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardTopbar;
