import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: string;
  className?: string;
  children?: ReactNode;
}

const DashboardCard = ({ title, value, icon: Icon, description, trend, className = "", children }: DashboardCardProps) => {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      className={`relative rounded-xl p-5 transition-all duration-300 overflow-hidden group ${className}`}
    >
      {/* Glass background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800/60 via-slate-800/40 to-slate-900/60 backdrop-blur-lg" />
      
      {/* Border */}
      <div className="absolute inset-0 rounded-xl border border-primary/15 group-hover:border-primary/30 transition-colors" />
      
      {/* Hover glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* HUD corners */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/40 rounded-tl" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-primary/40 rounded-tr" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-primary/40 rounded-bl" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/40 rounded-br" />
      
      <div className="flex items-start justify-between mb-3 relative z-10">
        <div className="flex-1">
          <p className="text-[10px] text-primary/80 mb-1.5 font-semibold tracking-[0.2em] uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {title}
          </p>
          <motion.h3
            className="text-3xl font-bold text-foreground"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            {value}
          </motion.h3>
          {description && <p className="text-[11px] text-muted-foreground mt-1.5">{description}</p>}
          {trend && (
            <p className="text-[11px] text-primary mt-1.5 font-semibold tracking-wide" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {trend}
            </p>
          )}
        </div>
        <div className="bg-primary/10 p-2.5 rounded-lg border border-primary/20 group-hover:shadow-[0_0_12px_hsl(185_85%_50%/0.2)] transition-shadow">
          <Icon className="w-5 h-5 text-primary drop-shadow-[0_0_6px_hsl(185_85%_50%/0.6)]" />
        </div>
      </div>
      {children && <div className="relative z-10">{children}</div>}
    </motion.div>
  );
};

export default DashboardCard;
