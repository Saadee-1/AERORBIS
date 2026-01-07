import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Wind, Rocket, Plane, Satellite } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveSection } from "@/hooks/useActiveSection";

const modules = [
  {
    icon: Wind,
    title: "Aerodynamics & Flight Mechanics",
    description:
      "Master the principles of lift, drag, and fluid dynamics. Understand how aircraft achieve and maintain flight.",
  },
  {
    icon: Rocket,
    title: "Rocket Propulsion Systems",
    description:
      "Explore chemical, electric, and nuclear propulsion. Learn rocket equations and thrust dynamics.",
  },
  {
    icon: Plane,
    title: "Aircraft Design & Structures",
    description:
      "Study structural analysis, materials selection, and design optimization for modern aircraft.",
  },
  {
    icon: Satellite,
    title: "Space Systems & Orbital Dynamics",
    description:
      "Dive into orbital mechanics, satellite systems, and mission planning for space exploration.",
  },
];

const LearningModules = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const activeSection = useActiveSection(["home", "about", "learn", "research", "tools", "community", "testimonials", "contact"]);
  const isActive = activeSection === "learn";

  return (
    <section 
      id="learn" 
      className={`py-24 bg-transparent relative overflow-hidden transition-all duration-500 ${
        isActive ? "border-t border-b border-primary/20" : ""
      }`}
    >
      <div className="container mx-auto px-4 lg:px-8" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Featured Learning Modules
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Comprehensive courses designed to take you from fundamentals to advanced concepts
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {modules.map((module, index) => (
            <motion.div
              key={module.title}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ scale: 1.03, y: -5 }}
            >
              <Card className="h-full bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl hover:border-cyan-400/60 hover:shadow-[0_0_40px_rgba(34,211,238,0.3)] transition-all duration-300 group cursor-pointer">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 rounded-lg bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center mb-4 mx-auto group-hover:shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all">
                    <module.icon className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                  </div>
                  <CardTitle className="text-xl text-white">{module.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-base text-gray-300 mb-4">
                    {module.description}
                  </CardDescription>
                  <Button
                    variant="ghost"
                    className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 p-0 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]"
                  >
                    Learn More →
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LearningModules;
