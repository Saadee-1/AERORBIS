import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Wrench, Rocket, Wind, Globe, Box, Gauge, Calculator, Satellite, Database, Zap, Radio, Cloud, Plane } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DeepSpaceDataBackground from "@/components/backgrounds/DeepSpaceDataBackground";
import PageBreadcrumb from "@/components/PageBreadcrumb";

// Helper function to get tool URL
const getToolUrl = (toolName: string): string => {
  const toolMap: { [key: string]: string } = {
    "Thrust Calculator": "thrust",
    "Wing Loading Calculator": "wing",
    "Orbital Path Visualizer": "orbital",
    "Lift-to-Drag Ratio Analyzer": "liftdrag",
    "Reynolds Number Calculator": "reynolds",
    "Material Density Database": "materials",
    "Delta-V Budget Planner": "deltav",
    "Antenna Pattern Analyzer": "antenna",
    "Standard Atmosphere Calculator": "atmosphere",
    "Rocket Engine Performance": "rocketengine",
    "Stability & Control Derivatives": "stability",
  };
  const toolId = toolMap[toolName];
  return toolId ? `/tools/launch?tool=${toolId}` : "/tools/launch";
};

const Tools = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const tools = [
    {
      icon: Rocket,
      name: "Thrust Calculator",
      description: "Calculate rocket thrust, specific impulse, and exhaust velocity for different propulsion systems.",
      category: "Propulsion",
    },
    {
      icon: Wind,
      name: "Lift-to-Drag Ratio Analyzer",
      description: "Optimize aerodynamic efficiency by analyzing lift and drag coefficients for various wing designs.",
      category: "Aerodynamics",
    },
    {
      icon: Globe,
      name: "Orbital Path Visualizer",
      description: "Simulate and visualize satellite orbits, transfer trajectories, and gravitational assists.",
      category: "Orbital Mechanics",
    },
    {
      icon: Database,
      name: "Material Density Database",
      description: "Searchable database of aerospace materials with density properties. Compare materials and add custom entries.",
      category: "Materials",
    },
    {
      icon: Gauge,
      name: "Wing Loading Calculator",
      description: "Determine optimal wing area and loading for different aircraft configurations and missions.",
      category: "Aircraft Design",
    },
    {
      icon: Zap,
      name: "Delta-V Budget Planner",
      description: "Mission Δv & Staging Designer - Calculate required Δv, stage sizing, and mission feasibility for multi-stage rockets.",
      category: "Space Systems",
    },
    {
      icon: Radio,
      name: "Antenna Pattern Analyzer",
      description: "Analyze antenna radiation patterns, calculate gain, directivity, HPBW, and EIRP for aerospace applications.",
      category: "Avionics",
    },
    {
      icon: Wind,
      name: "Reynolds Number Calculator",
      description: "Calculate Reynolds numbers to predict flow regimes and boundary layer behavior.",
      category: "Aerodynamics",
    },
    {
      icon: Cloud,
      name: "Standard Atmosphere Calculator",
      description: "Compute atmospheric properties (temperature, pressure, density, speed of sound) from 0-86 km using U.S. Standard Atmosphere 1976.",
      category: "Atmospheric Science",
    },
    {
      icon: Gauge,
      name: "Rocket Engine Performance",
      description: "High-fidelity isentropic flow calculations with practical corrections for chemical and electric rocket engines. Compute thrust, Isp, c*, and nozzle performance.",
      category: "Propulsion",
    },
    {
      icon: Plane,
      name: "Stability & Control Derivatives",
      description: "Comprehensive stability analysis based on Raymer, Roskam, Anderson, and DATCOM. Calculate neutral point, static margin, control derivatives, and tail sizing.",
      category: "Aircraft Design",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col relative bg-gradient-to-b from-black via-slate-900 to-black">
      <DeepSpaceDataBackground />
      <Navbar />
      <PageBreadcrumb />
      
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <Wrench className="w-16 h-16 mx-auto mb-6 text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Engineering Tools & Simulators
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
              Your aerospace lab — right in your browser
            </p>
          </motion.div>
        </div>
      </section>

      {/* Tools Grid */}
      <section ref={ref} className="py-20">
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool, index) => (
              <motion.div
                key={tool.name}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.03, y: -5 }}
              >
                <Card className="h-full flex flex-col bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 hover:border-cyan-400/60 hover:shadow-[0_0_40px_rgba(34,211,238,0.3)] transition-all duration-300 rounded-2xl">
                  <CardHeader>
                    <div className="w-16 h-16 rounded-lg bg-cyan-400/10 flex items-center justify-center mb-4">
                      <tool.icon className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
                    </div>
                    <CardTitle className="text-xl text-white">{tool.name}</CardTitle>
                    <CardDescription className="text-gray-300">{tool.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <span className="inline-block text-xs px-3 py-1 rounded-full bg-cyan-400/20 text-cyan-400">
                      {tool.category}
                    </span>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full bg-gradient-to-r from-cyan-400 to-blue-400 text-slate-900 hover:shadow-[0_0_50px_rgba(34,211,238,0.6)] font-semibold transition-all duration-300"
                      asChild
                      disabled={!["Thrust Calculator", "Wing Loading Calculator", "Orbital Path Visualizer", "Lift-to-Drag Ratio Analyzer", "Reynolds Number Calculator", "Material Density Database", "Delta-V Budget Planner", "Antenna Pattern Analyzer", "Standard Atmosphere Calculator", "Rocket Engine Performance", "Stability & Control Derivatives"].includes(tool.name)}
                    >
                      <a href={["Thrust Calculator", "Wing Loading Calculator", "Orbital Path Visualizer", "Lift-to-Drag Ratio Analyzer", "Reynolds Number Calculator", "Material Density Database", "Delta-V Budget Planner", "Antenna Pattern Analyzer", "Standard Atmosphere Calculator", "Rocket Engine Performance", "Stability & Control Derivatives"].includes(tool.name) ? getToolUrl(tool.name) : "#"}>
                        {["Thrust Calculator", "Wing Loading Calculator", "Orbital Path Visualizer", "Lift-to-Drag Ratio Analyzer", "Reynolds Number Calculator", "Material Density Database", "Delta-V Budget Planner", "Antenna Pattern Analyzer", "Standard Atmosphere Calculator", "Rocket Engine Performance", "Stability & Control Derivatives"].includes(tool.name) ? "Launch Tool" : "Coming Soon"}
                      </a>
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Calculator Section */}
      <section className="py-20 bg-slate-900/30 relative z-10">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <div className="text-center mb-12">
              <Calculator className="w-16 h-16 mx-auto mb-6 text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
              <h2 className="text-4xl font-bold mb-4 text-white">Quick Demo: Thrust Calculator</h2>
              <p className="text-gray-300 text-lg">
                Try our interactive thrust calculator right here
              </p>
            </div>

            <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div className="text-center p-8 bg-slate-900/50 rounded-lg">
                    <Rocket className="w-24 h-24 mx-auto mb-4 text-cyan-400" />
                    <p className="text-gray-300">
                      Interactive calculator interface will be embedded here
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      Calculate thrust based on mass flow rate and exhaust velocity
                    </p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-cyan-400">F = ṁ × Ve</p>
                      <p className="text-sm text-gray-400">Thrust Equation</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-400">Isp = F / (ṁ × g₀)</p>
                      <p className="text-sm text-gray-400">Specific Impulse</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-cyan-400">Ve = Isp × g₀</p>
                      <p className="text-sm text-gray-400">Exhaust Velocity</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative z-10">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Need More Advanced Tools?
            </h2>
            <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
              Join our community to request new tools or contribute your own calculators and simulators
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-gradient-to-r from-cyan-400 to-blue-400 text-slate-900 hover:shadow-[0_0_50px_rgba(34,211,238,0.6)] font-semibold transition-all duration-300" asChild>
                <a href="/community">Join Community</a>
              </Button>
              <Button size="lg" variant="outline" className="border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400/60" asChild>
                <a href="/contact">Request a Tool</a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Tools;

