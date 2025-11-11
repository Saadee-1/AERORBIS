import { Link, useLocation } from "react-router-dom";
import { Home, BookOpen, FlaskConical, Wrench, User, Rocket } from "lucide-react";
import { motion } from "framer-motion";

interface DashboardSidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const DashboardSidebar = ({ isOpen }: DashboardSidebarProps) => {
  const location = useLocation();

  const menuItems = [
    { name: "DASHBOARD", href: "/dashboard", icon: Home },
    { name: "MY COURSES", href: "/dashboard/learning", icon: BookOpen },
    { name: "RESEARCH LIBRARY", href: "/dashboard/research", icon: FlaskConical },
    { name: "TOOLS & SIMULATIONS", href: "/dashboard/tools", icon: Wrench },
    { name: "SETTINGS", href: "/dashboard/profile", icon: User },
  ];

  return (
    <motion.aside
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      className={`fixed left-0 top-0 h-full bg-slate-900/50 backdrop-blur-lg border-r border-cyan-400/20 z-40 transition-all duration-300 shadow-[0_0_30px_rgba(34,211,238,0.2)] ${
        isOpen ? "w-64" : "w-20"
      }`}
    >
      {/* Logo */}
      <Link to="/" className="flex items-center p-6 border-b border-cyan-400/20 group">
        <Rocket className="w-8 h-8 text-cyan-400 transition-transform group-hover:rotate-12 flex-shrink-0 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]" />
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="ml-3 flex flex-col"
          >
            <span className="text-xl font-bold text-white">AeroVerse</span>
            <span className="text-xs text-cyan-400">Mission Control</span>
          </motion.div>
        )}
      </Link>

      {/* Menu Items */}
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 group relative ${
                isActive
                  ? "bg-cyan-400/20 text-cyan-400 border border-cyan-400/50 shadow-[0_0_30px_rgba(34,211,238,0.6)]"
                  : "text-gray-300 hover:bg-cyan-400/5 hover:border hover:border-cyan-400/20 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)]"
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "drop-shadow-[0_0_12px_rgba(34,211,238,1)]" : "group-hover:text-cyan-400 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"}`} />
              {isOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="ml-3 font-semibold text-xs tracking-wide"
                >
                  {item.name}
                </motion.span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Quote at bottom */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-6 left-0 right-0 px-6"
        >
          <div className="bg-gradient-to-br from-cyan-400/10 to-transparent p-4 rounded-lg border border-cyan-400/20 backdrop-blur-sm">
            <p className="text-xs text-cyan-400 italic font-medium">
              "The sky is not the limit — it's just the beginning."
            </p>
          </div>
        </motion.div>
      )}
    </motion.aside>
  );
};

export default DashboardSidebar;
