import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Wrench, Rocket, Wind, Globe, Box, Gauge, Calculator, Satellite } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DeepSpaceDataBackground from "@/components/backgrounds/DeepSpaceDataBackground";
import PageBreadcrumb from "@/components/PageBreadcrumb";

const Tools = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  // FIX 1: Added 'href' and 'status' to every tool
  const tools = [
    {
      icon: Rocket,
      name: "Thrust Calculator",
      description: "Calculate rocket thrust, specific impulse, and exhaust velocity for different propulsion systems.",
      category: "Propulsion",
      href: "/tools/advanced-thrust-calculator",
      status: "live"
    },
    {
      icon: Wind,
      name: "Lift-to-Drag Ratio Analyzer",
      description: "Optimize aerodynamic efficiency by analyzing lift and drag coefficients for various wing designs.",
      category: "Aerodynamics",
      href: "/tools/lift-drag-analyzer", // <-- This is the one you wanted!
      status: "live" // <-- This makes it "Launch Tool"
    },
    {
      icon: Globe,
      name: "Orbital Path Visualizer",
      description: "Simulate and visualize satellite orbits, transfer trajectories, and gravitational assists.",
      category: "Orbital Mechanics",
      href: "/tools/advanced-orbital-visualizer",
      status: "live"
    },
    {
      icon: Box,
      name: "Material Density Database",
      description: "Access comprehensive material properties including density, strength, and thermal characteristics.",
      category: "Materials",
      href: "#",
      status: "coming-soon"
    },
    {
      icon: Gauge,
      name: "Wing Loading Calculator",
      description: "Determine optimal wing area and loading for different aircraft configurations and missions.",
      category: "Aircraft Design",
      href: "/tools/advanced-wing-calculator",
      status: "live"
    },
    {
      icon: Calculator,
      name: "Delta-V Budget Planner",
      description: "Plan space missions by calculating required velocity changes for orbital maneuvers.",
      category: "Space Systems",
      href: "#",
      status: "coming-soon"
    },
    {
      icon: Satellite,
      name: "Antenna Pattern Analyzer",
      description: "Design and analyze communication antenna patterns for aerospace applications.",
      category: "Avionics",
      href: "#",
      status: "coming-soon"
    },
    {
      icon: Wind,
      name: "Reynolds Number Calculator",
      description: "Calculate Reynolds numbers to predict flow regimes and boundary layer behavior.",
      category: "Aerodynamics",
      href: "#",
      status: "coming-soon"
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

s     {/* Tools Grid */}
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
read-only                   {tool.category}
                    </span>
                  </CardContent>
                  <CardFooter>
                    {/* FIX 2: Simplified the button logic */}
                    <Button 
                      className="w-full bg-gradient-to-r from-cyan-400 to-blue-400 text-slate-900 hover:shadow-[0_0_50px_rgba(34,211,238,0.6)] font-semibold transition-all duration-300"
                      asChild
                      disabled={tool.status === 'coming-soon'}
is                   >
                      <a href={tool.href}>
Warning                   {tool.status === 'live' ? "Launch Tool" : "Coming Soon"}
                      </a>
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

ci     {/* Demo Calculator Section */}
      <section className="py-20 bg-slate-900/30 relative z-10">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
    S       className="max-w-4xl mx-auto"
          >
            <div className="text-center mb-12">
              <Calculator className="w-16 h-16 mx-auto mb-6 text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
              <h2 className="text-4xl font-bold mb-4 text-white">Quick Demo: Thrust Calculator</h2>
              <p className="text-gray-300 text-lg">
                Try our interactive thrust calculator right here
  A         </p>
            </div>

            <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
              <CardContent className="pt-6">
                <div className="space-y-6">
  s               <div className="text-center p-8 bg-slate-900/50 rounded-lg">
                    <Rocket className="w-24 h-24 mx-auto mb-4 text-cyan-400" />
                    <p className="text-gray-300">
                      Interactive calculator interface will be embedded here
ci               </p>
                    <p className="text-sm text-gray-400 mt-2">
                      Calculate thrust based on mass flow rate and exhaust velocity
                    </p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 text-center">
Note               <div>
                      <p className="text-2xl font-bold text-cyan-400">F = ṁ × Ve</p>
                      <p className="text-sm text-gray-400">Thrust Equation</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-400">Isp = F / (ṁ × g₀)</p>
Example                   <p className="text-sm text-gray-400">Specific Impulse</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-cyan-400">Ve = Isp × g₀</p>
    A               <p className="text-sm text-gray-400">Exhaust Velocity</p>
                    </div>
                  </div>
                </div>
              </CardContent>
Comment           </Card>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative z-10">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
ci           whileInView={{ opacity: 1, y: 0 }}
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
  s           <Button size="lg" variant="outline" className="border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400/60" asChild>
                <a href="/contact">Request a Tool</a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

Read-only       <Footer />
    </div>
  );
};

export default Tools;
