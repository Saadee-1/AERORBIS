import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom"; // ✅ ADD THIS IMPORT
import { Calculator, TrendingUp, Orbit, Plane } from "lucide-react"; // ✅ CHANGED Database to Plane
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveSection } from "@/hooks/useActiveSection";

// ✅ ADD toolId to match the tabs in ToolsLauncher.tsx
const tools = [
  {
    icon: Calculator,
    title: "Rocket Thrust Calculator",
    description: "Calculate thrust, specific impulse, and performance metrics",
    toolId: "thrust", // ✅ ADDED
  },
  {
    icon: TrendingUp,
    title: "Lift-to-Drag Ratio Visualizer",
    description: "Analyze aerodynamic efficiency with interactive charts",
    toolId: "liftdrag", // ✅ ADDED
  },
  {
    icon: Orbit,
    title: "Orbital Path Simulator",
    description: "Simulate and visualize satellite trajectories",
    toolId: "orbital", // ✅ ADDED
  },
  {
    icon: Plane, // ✅ CHANGED from Database
    title: "Wing Loading Calculator",
    description: "Calculate wing loading and stall speed performance",
    toolId: "wing", // ✅ ADDED
  },
];

const Tools = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const activeSection = useActiveSection(["home", "about", "learn", "research", "tools", "community", "testimonials", "contact"]);
  const isActive = activeSection === "tools";

  return (
    <section 
      id="tools" 
      className={`py-24 bg-gradient-to-b from-black via-slate-900 to-black relative overflow-hidden transition-all duration-500 ${
        isActive ? "shadow-[inset_0_0_100px_rgba(34,211,238,0.4)] border-t-4 border-b-4 border-cyan-400/50" : ""
      }`}
    >
      <div className="container mx-auto px-4 lg:px-8 relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Tools & Simulators
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Powerful interactive tools to accelerate your learning and research
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {tools.map((tool, index) => (
            <motion.div
              key={tool.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              {/* ✅ WRAP Card in Link component with toolId query parameter */}
              <Link to={`/tools/launch?tool=${tool.toolId}`}>
                <Card className="h-full bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 hover:border-cyan-400/60 hover:shadow-[0_0_40px_rgba(34,211,238,0.3)] transition-all duration-300 group cursor-pointer text-center rounded-2xl">
                  <CardHeader>
                    <div className="w-20 h-20 rounded-full bg-cyan-400/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-cyan-400/20 transition-all group-hover:scale-110">
                      <tool.icon className="w-10 h-10 text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
                    </div>
                    <CardTitle className="text-xl text-white">{tool.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300">{tool.description}</p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Tools;
