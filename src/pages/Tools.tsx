import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Wrench, Rocket, Wind, Globe, Box, Gauge, Calculator, Satellite, Database, Zap, Radio, Cloud, Plane, Scale, Target, Battery, ArrowUp } from "lucide-react";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    "Battery & Solar Power System": "power",
    "Structural Weight Estimator": "weight",
    "Rocket Trajectory Simulator": "trajectory",
    "Climb Performance Calculator": "climb",
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
      description: "Unified propulsion analysis: rocket engine thrust (Isp, exhaust velocity, mass flow) and aircraft thrust loading (T/W ratio, mission envelopes, climb performance).",
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
    {
      icon: Battery,
      name: "Battery & Solar Power System",
      description: "Ultra-high-fidelity energy modeling for UAVs, aircraft, rockets, and CubeSats. Compute endurance, solar generation, power budgets, and mission feasibility.",
      category: "Power Systems",
    },
    {
      icon: Scale,
      name: "Structural Weight Estimator",
      description: "Professional-grade weight estimation using Raymer, Torenbeek, and Nicolai models. Calculate component weights, mission fuel, W_TO iteration, CG, and aircraft classification.",
      category: "Aircraft Design",
    },
    {
      icon: Target,
      name: "Rocket Trajectory Simulator",
      description: "High-fidelity 1D, 2D, and 3D trajectory simulation with atmospheric flight, staging, orbital mechanics, and 3D visualization.",
      category: "Space Systems",
    },
    {
      icon: ArrowUp,
      name: "Climb Performance Calculator",
      description: "Compute climb speeds (V_y — best rate, V_x — best angle), rate of climb, and climb gradient with interactive plots.",
      category: "Aircraft Performance",
    },
  ];

  const enabledTools = ["Thrust Calculator", "Wing Loading Calculator", "Orbital Path Visualizer", "Lift-to-Drag Ratio Analyzer", "Reynolds Number Calculator", "Material Density Database", "Delta-V Budget Planner", "Antenna Pattern Analyzer", "Standard Atmosphere Calculator", "Rocket Engine Performance", "Stability & Control Derivatives", "Battery & Solar Power System", "Structural Weight Estimator", "Rocket Trajectory Simulator", "Climb Performance Calculator"];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PageBreadcrumb />
      
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <Wrench className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h1 className="text-4xl md:text-5xl font-semibold mb-4 text-foreground tracking-tight">
              Engineering Tools & Simulators
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Your aerospace lab — right in your browser
            </p>
          </motion.div>
        </div>
      </section>

      {/* Tools Grid */}
      <section ref={ref} className="py-12 pb-20">
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.map((tool, index) => (
              <motion.div
                key={tool.name}
                initial={{ opacity: 0, y: 15 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="h-full flex flex-col hover:border-primary/40 transition-colors duration-200">
                  <CardHeader className="pb-3">
                    <div className="w-12 h-12 rounded bg-accent flex items-center justify-center mb-3">
                      <tool.icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg text-foreground">{tool.name}</CardTitle>
                    <CardDescription className="text-sm">{tool.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow pt-0">
                    <span className="inline-block text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                      {tool.category}
                    </span>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button 
                      className="w-full"
                      variant={enabledTools.includes(tool.name) ? "default" : "secondary"}
                      asChild={enabledTools.includes(tool.name)}
                      disabled={!enabledTools.includes(tool.name)}
                    >
                      {enabledTools.includes(tool.name) ? (
                        <a href={getToolUrl(tool.name)}>Launch Tool</a>
                      ) : (
                        <span>Coming Soon</span>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Calculator Section */}
      <section className="py-16 bg-card border-y border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <div className="text-center mb-8">
              <Calculator className="w-10 h-10 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-semibold mb-2 text-foreground">Quick Demo: Thrust Calculator</h2>
              <p className="text-muted-foreground">
                Try our interactive thrust calculator right here
              </p>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div className="text-center p-6 bg-muted rounded">
                    <Rocket className="w-16 h-16 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground text-sm">
                      Interactive calculator interface will be embedded here
                    </p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-muted rounded">
                      <p className="text-lg font-mono font-medium text-foreground">F = ṁ × Ve</p>
                      <p className="text-xs text-muted-foreground mt-1">Thrust Equation</p>
                    </div>
                    <div className="p-3 bg-muted rounded">
                      <p className="text-lg font-mono font-medium text-foreground">Isp = F / (ṁ × g₀)</p>
                      <p className="text-xs text-muted-foreground mt-1">Specific Impulse</p>
                    </div>
                    <div className="p-3 bg-muted rounded">
                      <p className="text-lg font-mono font-medium text-foreground">Ve = Isp × g₀</p>
                      <p className="text-xs text-muted-foreground mt-1">Exhaust Velocity</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-2xl font-semibold mb-3 text-foreground">
              Need More Advanced Tools?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Join our community to request new tools or contribute your own calculators and simulators
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <a href="/community">Join Community</a>
              </Button>
              <Button variant="outline" asChild>
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
