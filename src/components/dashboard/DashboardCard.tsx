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
      className={`bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_0_40px_rgba(34,211,238,0.3)] hover:border-cyan-400/40 relative overflow-hidden ${className}`}
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
      
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="flex-1">
          <p className="text-xs text-cyan-400 mb-2 font-semibold uppercase tracking-wider">{title}</p>
          <h3 className="text-4xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{value}</h3>
          {description && <p className="text-xs text-gray-400 mt-2">{description}</p>}
          {trend && (
            <p className="text-xs text-cyan-400 mt-2 font-bold uppercase tracking-wide drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">{trend}</p>
          )}
        </div>
        <div className="bg-cyan-400/10 p-3 rounded-lg border border-cyan-400/30 shadow-[0_0_20px_rgba(34,211,238,0.3)]">
          <Icon className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
        </div>
      </div>
      {children && <div className="relative z-10">{children}</div>}
    </motion.div>
  );
};

export default DashboardCard;
