import { ReactNode, useState } from "react";
import DashboardSidebar from "./DashboardSidebar";
import DashboardTopbar from "./DashboardTopbar";
import AeroBot from "./AeroBot";
import { motion } from "framer-motion";
import DeepSpaceDataBackground from "@/components/backgrounds/DeepSpaceDataBackground";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-900 to-black flex relative overflow-hidden">
      <DeepSpaceDataBackground />
      
      {/* Animated Stars Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <DashboardSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <div className={`flex-1 flex flex-col transition-all duration-300 relative z-10 ${sidebarOpen ? "ml-64" : "ml-20"}`}>
        <DashboardTopbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex-1 p-6 overflow-auto"
        >
          {children}
        </motion.main>
      </div>

      <AeroBot />
    </div>
  );
};

export default DashboardLayout;
