import { Link, useLocation } from "react-router-dom";
import { Home, BookOpen, FlaskConical, Wrench, User, Rocket, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";

interface DashboardSidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const DashboardSidebar = ({ isOpen }: DashboardSidebarProps) => {
  const location = useLocation();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const menuItems = [
    { name: "COMMAND CENTER", href: "/dashboard", icon: Home },
    { name: "TRAINING MODULES", href: "/dashboard/learning", icon: BookOpen },
    { name: "RESEARCH LAB", href: "/dashboard/research", icon: FlaskConical },
    { name: "TOOLS & SIMS", href: "/dashboard/tools", icon: Wrench },
    { name: "PILOT PROFILE", href: "/dashboard/profile", icon: User },
  ];

  return (
    <motion.aside
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed left-0 top-0 h-full z-40 transition-all duration-300 ${
        isOpen ? "w-64" : "w-20"
      }`}
    >
      {/* Background */}
      <div className={`absolute inset-0 backdrop-blur-xl ${
        isLight 
          ? 'bg-card border-r border-border' 
          : 'bg-gradient-to-b from-slate-950/95 via-slate-900/90 to-slate-950/95'
      }`} />
      {!isLight && <div className="absolute inset-0 grid-overlay opacity-30" />}
      
      {/* Right edge glow - dark only */}
      {!isLight && (
        <>
          <div className="absolute top-0 right-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/50 to-transparent" />
          <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
        </>
      )}
      
      {/* HUD corners - dark only */}
      {!isLight && (
        <>
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/50" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary/50" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary/50" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary/50" />
        </>
      )}

      {/* Logo */}
      <Link to="/" className={`relative flex items-center p-6 border-b group ${isLight ? 'border-border' : 'border-primary/20'}`}>
        <div className="relative">
          {!isLight && (
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-1 rounded-full border border-primary/20"
            />
          )}
          <Rocket className={`w-8 h-8 text-primary transition-transform group-hover:rotate-12 flex-shrink-0 ${!isLight ? 'drop-shadow-[0_0_15px_hsl(160_84%_39%/0.8)]' : ''}`} />
        </div>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="ml-3 flex flex-col"
          >
            <span className="text-lg font-bold text-foreground tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              AERORBIS
            </span>
            <span className={`text-[10px] font-medium tracking-[0.3em] uppercase ${isLight ? 'text-muted-foreground' : 'text-primary'}`} style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              Mission Control
            </span>
          </motion.div>
        )}
      </Link>

      {/* System Status Indicator */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`relative mx-4 mt-4 mb-2 px-3 py-2 rounded border ${isLight ? 'border-border bg-muted/50' : 'border-primary/10 bg-primary/5'}`}
        >
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_hsl(160_60%_45%)]"
            />
            <span className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              All Systems Online
            </span>
          </div>
        </motion.div>
      )}

      {/* Menu Items */}
      <nav className="relative p-4 space-y-1">
        {isOpen && (
          <p className="text-[9px] text-muted-foreground tracking-[0.3em] uppercase mb-3 px-3" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            // Navigation
          </p>
        )}
        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          return (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 + 0.2, duration: 0.4 }}
            >
              <Link
                to={item.href}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
                  isActive
                    ? isLight
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : "bg-primary/15 text-primary border border-primary/40 shadow-[0_0_20px_hsl(160_84%_39%/0.15)]"
                    : isLight
                      ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                      : "text-muted-foreground hover:bg-primary/5 hover:text-foreground hover:border hover:border-primary/10"
                }`}
              >
                {/* Active indicator line */}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-r ${!isLight ? 'shadow-[0_0_8px_hsl(160_84%_39%/0.6)]' : ''}`}
                  />
                )}
                <Icon className={`w-4 h-4 flex-shrink-0 ${
                  isActive 
                    ? !isLight ? "drop-shadow-[0_0_8px_hsl(185_85%_50%/0.8)]" : ""
                    : !isLight ? "group-hover:text-primary group-hover:drop-shadow-[0_0_4px_hsl(185_85%_50%/0.4)]" : "group-hover:text-primary"
                }`} />
                {isOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="ml-3 text-[11px] font-semibold tracking-[0.15em]"
                    style={{ fontFamily: 'Rajdhani, sans-serif' }}
                  >
                    {item.name}
                  </motion.span>
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Bottom telemetry */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-6 left-0 right-0 px-4 space-y-3"
        >
          {/* Mini telemetry bars */}
          <div className={`px-3 py-3 rounded border ${isLight ? 'border-border bg-muted/50' : 'border-primary/10 bg-slate-900/50'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] text-muted-foreground tracking-[0.2em] uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                System Load
              </span>
              <Activity className="w-3 h-3 text-primary/60" />
            </div>
            <div className="flex gap-0.5">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className={`h-1 flex-1 rounded-full ${i < 14 ? 'bg-primary/40' : 'bg-muted/30'}`}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: i * 0.03 + 0.6 }}
                />
              ))}
            </div>
          </div>

          <div className={`p-3 rounded border ${isLight ? 'border-border bg-muted/30' : 'border-primary/10 bg-gradient-to-br from-primary/5 to-transparent'}`}>
            <p className={`text-[10px] italic font-medium ${isLight ? 'text-muted-foreground' : 'text-primary/70'}`} style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              "The sky is not the limit — it's just the beginning."
            </p>
          </div>
        </motion.div>
      )}
    </motion.aside>
  );
};

export default DashboardSidebar;
