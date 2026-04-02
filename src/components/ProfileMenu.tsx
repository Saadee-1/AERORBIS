import { useState, useEffect } from 'react';
import { Settings, LogOut, LayoutDashboard, Bookmark, Target, LogIn } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const ProfileMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ username: string | null; display_name: string | null; avatar_url: string | null } | null>(null);

  useEffect(() => {
    if (!user) { setProfile(null); return; }
    supabase.from('profiles').select('username, display_name, avatar_url').eq('id', user.id).single()
      .then(({ data }) => { if (data) setProfile(data); });
  }, [user]);

  const displayName = profile?.display_name || profile?.username || user?.email?.split('@')[0] || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  const menuItems = [
    { icon: LayoutDashboard, label: 'My Dashboard', href: '/dashboard' },
    { icon: Target, label: 'My Missions', href: '/dashboard/learning' },
    { icon: Bookmark, label: 'Bookmarks', href: '/dashboard/research' },
    { icon: Settings, label: 'Settings', href: '/dashboard/profile' },
  ];

  // Not logged in → show login button
  if (!user) {
    return (
      <Link
        to="/auth"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider hover:bg-primary/20 transition-colors"
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
        className="relative w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-150 hover:opacity-90"
        style={{
          background: `conic-gradient(from 0deg, hsl(var(--primary)) ${65 * 3.6}deg, hsl(var(--muted)) ${65 * 3.6}deg)`,
        }}
      >
        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-card border border-border">
          <span className="text-xs font-semibold text-foreground">{initials}</span>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50"
              style={{ backdropFilter: 'blur(10px)' }}
            >
              <div className="p-4 border-b border-border/50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
              </div>

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

              <div className="border-t border-border/50">
                <button
                  onClick={handleSignOut}
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
