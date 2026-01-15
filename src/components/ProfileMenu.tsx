import { useState } from 'react';
import { Settings, LogOut, LayoutDashboard, Bookmark, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const ProfileMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  // User data
  const user = {
    name: 'Sahad Ahmad',
    level: 'Aerospace Engineer',
    progress: 65,
    initials: 'SA'
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'My Dashboard', href: '/dashboard' },
    { icon: Target, label: 'My Missions', href: '/dashboard/learning' },
    { icon: Bookmark, label: 'Bookmarks', href: '/dashboard/research' },
    { icon: Settings, label: 'Settings', href: '/dashboard/profile' }
  ];

  return (
    <div className="relative">
      {/* Avatar Button with Progress Ring */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-150 hover:opacity-90"
        style={{
          background: `conic-gradient(from 0deg, hsl(var(--primary)) ${user.progress * 3.6}deg, hsl(var(--muted)) ${user.progress * 3.6}deg)`
        }}
      >
        {/* Inner Avatar Circle */}
        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-card border border-border">
          <span className="text-xs font-semibold text-foreground">{user.initials}</span>
        </div>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            
            {/* Menu Panel */}
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50"
              style={{ backdropFilter: 'blur(10px)' }}
            >
              {/* User Info */}
              <div className="p-4 border-b border-border/50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{user.initials}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.level}</p>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Learning Progress</span>
                    <span>{user.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${user.progress}%` }}
                      transition={{ duration: 1, delay: 0.2 }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                {menuItems.map((item) => (
                  <Link 
                    key={item.label} 
                    to={item.href} 
                    onClick={() => setIsOpen(false)} 
                    className="flex items-center gap-3 px-4 py-2 hover:bg-muted/50 transition-colors duration-150 text-foreground"
                  >
                    <item.icon className="w-5 h-5 text-primary" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                ))}
              </div>

              {/* Sign Out */}
              <div className="border-t border-border/50">
                <button 
                  onClick={() => {
                    setIsOpen(false);
                    // Add sign out logic here
                  }} 
                  className="flex items-center gap-3 px-4 py-3 hover:bg-destructive/10 transition-colors duration-150 text-destructive w-full"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm font-medium">Sign Out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileMenu;
