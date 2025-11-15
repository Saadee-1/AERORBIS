import { useState } from 'react';
import { User, Settings, LogOut, LayoutDashboard, Bookmark, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
const ProfileMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Mock user data - replace with actual user data from auth
  const user = {
    name: 'Alex Kumar',
    level: 'Aerospace Cadet',
    progress: 65,
    avatar: null
  };
  const menuItems = [{
    icon: LayoutDashboard,
    label: 'My Dashboard',
    href: '/dashboard'
  }, {
    icon: Target,
    label: 'My Missions',
    href: '/dashboard/learning'
  }, {
    icon: Bookmark,
    label: 'Bookmarks',
    href: '/dashboard/research'
  }, {
    icon: Settings,
    label: 'Settings',
    href: '/dashboard/profile'
  }];
  return <div className="relative">
      {/* Avatar Button */}
      <button onClick={() => setIsOpen(!isOpen)} style={{
      background: `conic-gradient(from 0deg, hsl(var(--primary)) ${user.progress}%, transparent ${user.progress}%)`
    }} className="relative w-10 h-10 rounded-full border-2 border-primary flex items-center justify-center transition-colors text-justify font-sans font-light text-base bg-transparent text-transparent">
        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-950">
          {user.avatar ? <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" /> : <User className="w-5 h-5 text-primary" />}
        </div>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            
            {/* Menu Panel */}
            <motion.div initial={{
          opacity: 0,
          y: -10,
          scale: 0.95
        }} animate={{
          opacity: 1,
          y: 0,
          scale: 1
        }} exit={{
          opacity: 0,
          y: -10,
          scale: 0.95
        }} transition={{
          duration: 0.2
        }} className="absolute right-0 mt-2 w-64 bg-card border border-primary/20 rounded-lg shadow-lg overflow-hidden z-50" style={{
          backdropFilter: 'blur(10px)',
          background: 'rgba(0, 45, 114, 0.95)'
        }}>
              {/* User Info */}
              <div className="p-4 border-b border-primary/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{user.name}</p>
                    <p className="text-xs text-secondary">{user.level}</p>
                  </div>
                </div>
                
                {/* Progress Ring */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Learning Progress</span>
                    <span>{user.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div initial={{
                  width: 0
                }} animate={{
                  width: `${user.progress}%`
                }} transition={{
                  duration: 1,
                  delay: 0.2
                }} className="h-full bg-primary rounded-full" style={{
                  boxShadow: '0 0 10px rgba(255, 215, 0, 0.5)'
                }} />
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                {menuItems.map(item => <Link key={item.label} to={item.href} onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-4 py-2 hover:bg-primary/10 transition-colors text-foreground">
                    <item.icon className="w-5 h-5 text-primary" />
                    <span className="text-sm">{item.label}</span>
                  </Link>)}
              </div>

              {/* Sign Out */}
              <div className="border-t border-primary/20">
                <button onClick={() => {
              setIsOpen(false);
              // Add sign out logic here
            }} className="flex items-center gap-3 px-4 py-3 hover:bg-destructive/10 transition-colors text-destructive w-full">
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm font-medium">Sign Out</span>
                </button>
              </div>
            </motion.div>
          </>}
      </AnimatePresence>
    </div>;
};
export default ProfileMenu;