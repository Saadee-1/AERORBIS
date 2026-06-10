import { useState } from 'react';
import { Settings, LogOut, LayoutDashboard, Bookmark, Target, LogIn } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';

const ProfileMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  const menuItems = [
    { icon: LayoutDashboard, label: 'My Dashboard', href: '/dashboard' },
    { icon: Target, label: 'My Missions', href: '/dashboard/learning' },
    { icon: Bookmark, label: 'Bookmarks', href: '/dashboard/research' },
    { icon: Settings, label: 'Settings', href: '/dashboard/profile' },
  ];

  if (!user) {
    return (
      <Link
        to="/auth"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200"
        style={{
          border: "1px solid rgba(0,212,170,0.4)",
          background: "rgba(0,212,170,0.1)",
          color: "rgba(0,212,170,1)",
          boxShadow: "0 0 15px rgba(0,212,170,0.12)",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = "rgba(0,212,170,0.2)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px rgba(0,212,170,0.25)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = "rgba(0,212,170,0.1)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 0 15px rgba(0,212,170,0.12)";
        }}
      >
        <LogIn className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Sign In</span>
      </Link>
    );
  }

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
    navigate('/');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-10 h-10 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity border border-primary/30 hover:border-primary/50"
        style={{
          background: "rgba(0,212,170,0.08)",
        }}
      >
        <div className="w-9 h-9 flex items-center justify-center rounded-full bg-card border border-border overflow-hidden">
          {user.photoURL ? (
            <img src={user.photoURL} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-semibold text-foreground">{initials}</span>
          )}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 mt-2 w-64 rounded-lg shadow-xl overflow-hidden z-50"
              style={{
                background: "rgba(10,14,30,0.95)",
                border: "1px solid rgba(0,212,170,0.15)",
                backdropFilter: "blur(16px)",
              }}
            >
              <div className="p-4 border-b border-white/8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-primary/40 flex items-center justify-center overflow-hidden flex-shrink-0"
                    style={{ background: "rgba(0,212,170,0.1)" }}>
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-primary">{initials}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{displayName}</p>
                    <p className="text-xs text-white/40 truncate">{user.email}</p>
                  </div>
                </div>
              </div>

              <div className="py-1.5">
                {menuItems.map((item) => (
                  <Link
                    key={item.label}
                    to={item.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-white/70 hover:text-white"
                  >
                    <item.icon className="w-4 h-4 text-primary/70" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                ))}
              </div>

              <div className="border-t border-white/8">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 transition-colors text-red-400 w-full"
                >
                  <LogOut className="w-4 h-4" />
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