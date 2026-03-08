import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calculator, Satellite, Wind, Gauge, Database, Zap, Star, Search, Radio, Cloud, ArrowRight } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useState, useRef } from "react";

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
  };
  const toolId = toolMap[toolName];
  return toolId ? `/tools/launch?tool=${toolId}` : "/tools/launch";
};

const DashboardTools = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const headerRef = useRef<HTMLDivElement>(null);
  const favoritesRef = useRef<HTMLDivElement>(null);
  const allToolsRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  const headerInView = useInView(headerRef, { once: true, margin: "-50px" as `${number}px` });
  const favoritesInView = useInView(favoritesRef, { once: true, margin: "-50px" as `${number}px` });
  const allToolsInView = useInView(allToolsRef, { once: true, margin: "-50px" as `${number}px` });
  const statsInView = useInView(statsRef, { once: true, margin: "-50px" as `${number}px` });

  const tools = [
    { id: 1, name: "Thrust Calculator", icon: Calculator, description: "Calculate thrust force based on mass flow and velocity", category: "Propulsion", usageCount: 23, favorite: true },
    { id: 2, name: "Orbital Path Visualizer", icon: Satellite, description: "Simulate and visualize satellite orbital trajectories", category: "Orbital Mechanics", usageCount: 15, favorite: true },
    { id: 3, name: "Wing Efficiency Plotter", icon: Wind, description: "Plot lift-to-drag ratios for different wing configurations", category: "Aerodynamics", usageCount: 31, favorite: false },
    { id: 4, name: "Pressure Distribution Analyzer", icon: Gauge, description: "Analyze pressure distributions across airfoil surfaces", category: "Aerodynamics", usageCount: 12, favorite: true },
    { id: 5, name: "Material Density Database", icon: Database, description: "Searchable database of aerospace materials with density properties", category: "Materials", usageCount: 42, favorite: true },
    { id: 6, name: "Rocket Performance Simulator", icon: Zap, description: "Simulate rocket performance under various conditions", category: "Propulsion", usageCount: 19, favorite: false },
    { id: 7, name: "Reynolds Number Calculator", icon: Wind, description: "Calculate Reynolds numbers to predict flow regimes", category: "Aerodynamics", usageCount: 27, favorite: true },
    { id: 8, name: "Delta-V Budget Planner", icon: Zap, description: "Mission Δv & Staging Designer", category: "Space Systems", usageCount: 35, favorite: true },
    { id: 9, name: "Antenna Pattern Analyzer", icon: Radio, description: "Analyze antenna radiation patterns and gain", category: "Avionics", usageCount: 28, favorite: true },
    { id: 10, name: "Standard Atmosphere Calculator", icon: Cloud, description: "Compute atmospheric properties from 0-86 km", category: "Atmospheric Science", usageCount: 0, favorite: false },
  ];

  const filteredTools = tools.filter(tool =>
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const favoriteTools = tools.filter(tool => tool.favorite);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 25, scale: 0.97 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: "easeOut" as const } },
  };

  const implementedTools = ["Thrust Calculator", "Wing Loading Calculator", "Orbital Path Visualizer", "Lift-to-Drag Ratio Analyzer", "Reynolds Number Calculator", "Material Density Database", "Delta-V Budget Planner", "Antenna Pattern Analyzer"];

  const ToolCard = ({ tool, isFavorite = false }: { tool: typeof tools[0]; isFavorite?: boolean }) => {
    const Icon = tool.icon;
    const isImplemented = implementedTools.includes(tool.name);

    return (
      <motion.div variants={itemVariants} whileHover={{ scale: 1.03, y: -5 }} whileTap={{ scale: 0.98 }}>
        <div className="relative h-full rounded-xl overflow-hidden group">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-lg" />
          <div className={`absolute inset-0 rounded-xl border transition-colors ${
            isFavorite ? 'border-primary/25 group-hover:border-primary/50' : 'border-primary/10 group-hover:border-primary/25'
          }`} />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          {/* HUD corners */}
          <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-primary/30 group-hover:border-primary/60 transition-colors" />
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-primary/30 group-hover:border-primary/60 transition-colors" />

          <div className="relative p-5">
            <div className="flex items-start justify-between mb-3">
              <motion.div
                className="bg-primary/10 p-2.5 rounded-lg border border-primary/15 group-hover:shadow-[0_0_10px_hsl(160_84%_39%/0.15)] transition-shadow"
                whileHover={{ rotate: [0, -8, 8, 0] }}
                transition={{ duration: 0.4 }}
              >
                <Icon className="w-5 h-5 text-primary" />
              </motion.div>
              {tool.favorite && (
                <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 3, repeat: Infinity }}>
                  <Star className="w-4 h-4 text-primary fill-primary/50" />
                </motion.div>
              )}
            </div>

            <h3 className="text-sm font-semibold text-foreground mb-1 tracking-wide" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {tool.name}
            </h3>
            <Badge className="mb-3 bg-muted/10 text-muted-foreground border border-muted/20 text-[9px] tracking-wider uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {tool.category}
            </Badge>
            <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">{tool.description}</p>

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground tracking-wider" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {tool.usageCount} runs
              </span>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <Button
                  size="sm"
                  className={`text-[10px] tracking-wider uppercase ${
                    isImplemented
                      ? "bg-primary/10 text-primary border border-primary/25 hover:bg-primary/20"
                      : "bg-muted/10 text-muted-foreground border border-muted/20"
                  }`}
                  style={{ fontFamily: 'Rajdhani, sans-serif' }}
                  asChild
                  disabled={!isImplemented}
                >
                  <a href={isImplemented ? getToolUrl(tool.name) : "#"} className="flex items-center gap-1">
                    {isImplemented ? (
                      <>
                        Launch
                        <ArrowRight className="w-3 h-3" />
                      </>
                    ) : (
                      "Pending"
                    )}
                  </a>
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <motion.div
        ref={headerRef}
        className="mb-8 text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={headerInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-[10px] text-primary/60 tracking-[0.3em] uppercase mb-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          // Simulation Bay
        </p>
        <h1 className="text-3xl font-bold text-foreground mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          Engineering <span className="text-primary drop-shadow-[0_0_15px_hsl(185_85%_50%/0.4)]">Tools</span>
        </h1>
        <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          Interactive aerospace calculators and simulators
        </p>
      </motion.div>

      {/* Search */}
      <motion.div
        className="mb-8 flex justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={headerInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <div className="relative w-full max-w-xl">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-primary/50" />
          <Input
            type="search"
            placeholder="Search tools by name, category, or function..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-800/30 border-primary/15 text-foreground focus:border-primary/40 focus:shadow-[0_0_15px_hsl(185_85%_50%/0.1)] text-sm"
            style={{ fontFamily: 'Rajdhani, sans-serif' }}
          />
        </div>
      </motion.div>

      {/* Favorite Tools */}
      {favoriteTools.length > 0 && !searchQuery && (
        <motion.div ref={favoritesRef} className="mb-8" initial={{ opacity: 0 }} animate={favoritesInView ? { opacity: 1 } : { opacity: 0 }}>
          <div className="flex items-center gap-3 mb-4">
            <Star className="w-4 h-4 text-primary fill-primary/50" />
            <h2 className="text-[11px] text-primary tracking-[0.2em] uppercase font-semibold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              // Priority Tools
            </h2>
            <div className="flex-1 h-px bg-gradient-to-r from-primary/20 to-transparent" />
          </div>
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate={favoritesInView ? "visible" : "hidden"}
          >
            {favoriteTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} isFavorite />
            ))}
          </motion.div>
        </motion.div>
      )}

      {/* All Tools */}
      <motion.div ref={allToolsRef}>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-[11px] text-primary/70 tracking-[0.2em] uppercase font-semibold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {searchQuery ? "// Search Results" : "// Full Arsenal"}
          </h2>
          <div className="flex-1 h-px bg-gradient-to-r from-primary/15 to-transparent" />
        </div>
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate={allToolsInView ? "visible" : "hidden"}
        >
          {filteredTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </motion.div>

        {filteredTools.length === 0 && (
          <motion.div className="text-center py-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-muted-foreground text-sm">No tools found matching "{searchQuery}"</p>
          </motion.div>
        )}
      </motion.div>

      {/* Usage Stats */}
      <motion.div
        ref={statsRef}
        initial={{ opacity: 0, y: 40 }}
        animate={statsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="mt-8"
      >
        <div className="relative rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-800/50 via-primary/3 to-slate-800/50 backdrop-blur-lg" />
          <div className="absolute inset-0 rounded-xl border border-primary/15" />
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/40" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary/40" />

          <div className="relative p-6">
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center"
              variants={containerVariants}
              initial="hidden"
              animate={statsInView ? "visible" : "hidden"}
            >
              {[
                { value: "12", label: "Tools Available", unit: "SYS" },
                { value: "108", label: "Simulations Run", unit: "OPS" },
                { value: "7", label: "Priority Tools", unit: "FAV" },
              ].map((stat) => (
                <motion.div key={stat.label} variants={itemVariants}>
                  <p className="text-[9px] text-primary/50 tracking-[0.3em] uppercase mb-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    [{stat.unit}]
                  </p>
                  <motion.p
                    className="text-3xl font-bold text-primary mb-1"
                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                    initial={{ scale: 0.5 }}
                    animate={statsInView ? { scale: 1 } : { scale: 0.5 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                  >
                    {stat.value}
                  </motion.p>
                  <p className="text-[11px] text-muted-foreground tracking-wider uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    {stat.label}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default DashboardTools;
