import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Calculator, TrendingUp, Orbit, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveSection } from "@/hooks/useActiveSection";

const tools = [
  {
    icon: Calculator,
    title: "Rocket Thrust Calculator",
    description: "Calculate thrust, specific impulse, and performance metrics",
  },
  {
    icon: TrendingUp,
    title: "Lift-to-Drag Ratio Visualizer",
    description: "Analyze aerodynamic efficiency with interactive charts",
  },
  {
    icon: Orbit,
    title: "Orbital Path Simulator",
    description: "Simulate and visualize satellite trajectories",
  },
  {
    icon: Database,
    title: "Material Density Database",
    description: "Access comprehensive aerospace materials data",
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
      className={`py-24 bg-transparent relative overflow-hidden transition-all duration-500 ${
        isActive ? "border-t border-b border-primary/20" : ""
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
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Tools;
