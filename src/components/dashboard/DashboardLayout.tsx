import { ReactNode, useState } from "react";
import DashboardSidebar from "./DashboardSidebar";
import DashboardTopbar from "./DashboardTopbar";
import AeroBot from "./AeroBot";
import { motion } from "framer-motion";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { useTheme } from "@/contexts/ThemeContext";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className={`min-h-screen flex relative overflow-hidden transition-colors duration-500 ${isLight ? 'bg-background' : 'bg-gradient-to-b from-black via-slate-900 to-black'}`}>
      
      {/* Grid overlay for command center feel */}
      {!isLight && <div className="absolute inset-0 z-0 pointer-events-none grid-overlay" />}

      {/* Animated Stars Background */}
      {!isLight && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          {[...Array(40)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${Math.random() * 2 + 1}px`,
                height: `${Math.random() * 2 + 1}px`,
                background: i % 3 === 0
                  ? 'hsl(185 85% 50% / 0.4)'
                  : i % 3 === 1
                    ? 'hsl(200 80% 55% / 0.3)'
                    : 'hsl(210 30% 70% / 0.2)',
              }}
              animate={{
                opacity: [0.1, 0.8, 0.1],
                scale: [1, 1.8, 1],
              }}
              transition={{
                duration: Math.random() * 4 + 3,
                repeat: Infinity,
                delay: Math.random() * 3,
              }}
            />
          ))}
        </div>
      )}

      {/* Scanline overlay */}
      {!isLight && <div className="absolute inset-0 z-[1] pointer-events-none scanlines" />}

      {/* Ambient horizontal scan beam */}
      {!isLight && (
        <motion.div
          className="absolute left-0 right-0 h-px z-[1] pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, hsl(185 85% 50% / 0.15), transparent)',
          }}
          animate={{ top: ['0%', '100%'] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />
      )}

      <DashboardSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <div className={`flex-1 flex flex-col transition-all duration-300 relative z-10 ${sidebarOpen ? "ml-64" : "ml-20"}`}>
        <DashboardTopbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <PageBreadcrumb />
        
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex-1 p-6 overflow-auto flex flex-col items-center"
        >
          <div className="w-full max-w-7xl">
            {children}
          </div>
        </motion.main>
      </div>

      <AeroBot />
    </div>
  );
};

export default DashboardLayout;
