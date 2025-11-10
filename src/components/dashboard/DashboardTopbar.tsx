import { Search, Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DashboardTopbarProps {
  toggleSidebar: () => void;
}

const DashboardTopbar = ({ toggleSidebar }: DashboardTopbarProps) => {
  const [showNotifications, setShowNotifications] = useState(false);

  // Mock notifications - Future Integration: Connect to Database
  const notifications = [
    { id: 1, text: "Your research submission was featured!", time: "2h ago" },
    { id: 2, text: "New propulsion module released.", time: "5h ago" },
    { id: 3, text: "You earned a new badge!", time: "1d ago" },
  ];

  return (
    <header className="sticky top-0 z-30 bg-slate-900/50 backdrop-blur-lg border-b border-cyan-400/20">
      <div className="flex items-center justify-between p-4">
        {/* Left side - Menu & Search */}
        <div className="flex items-center space-x-4 flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="text-gray-300 hover:text-cyan-400 hover:bg-cyan-400/10"
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="relative max-w-md w-full hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cyan-400" />
            <Input
              type="search"
              placeholder="Search resources..."
              className="pl-10 bg-slate-800/50 border-cyan-400/20 focus:border-cyan-400/50 text-white placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Right side - Notifications & Profile */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNotifications(!showNotifications)}
              className="text-gray-300 hover:text-cyan-400 hover:bg-cyan-400/10 relative"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.8)]"></span>
            </Button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-80 bg-slate-900/95 backdrop-blur-lg border border-cyan-400/30 rounded-lg shadow-[0_0_30px_rgba(34,211,238,0.3)] overflow-hidden"
                >
                  <div className="p-4 border-b border-cyan-400/20 bg-gradient-to-r from-cyan-400/10 to-transparent">
                    <h3 className="font-bold text-white uppercase text-sm tracking-wide">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className="p-4 hover:bg-cyan-400/5 transition-colors cursor-pointer border-b border-cyan-400/10 last:border-0"
                      >
                        <p className="text-sm text-gray-300 font-medium">{notif.text}</p>
                        <p className="text-xs text-cyan-400 mt-1">{notif.time}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Profile */}
          <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity group">
            <Avatar className="ring-2 ring-cyan-400/30 group-hover:ring-cyan-400/50 transition-all">
              <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Saad" />
              <AvatarFallback className="bg-cyan-400 text-black font-bold">SA</AvatarFallback>
            </Avatar>
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-white">Saad Ahmed</p>
              <p className="text-xs text-cyan-400 font-medium">Aerospace Student</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardTopbar;
