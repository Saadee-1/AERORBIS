import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calculator, Satellite, Wind, Gauge, Database, Zap, Star, Search, Radio, Cloud } from "lucide-react";
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
    { id: 5, name: "Material Density Database", icon: Database, description: "Searchable database of aerospace materials with density properties. Compare materials and add custom entries.", category: "Materials", usageCount: 42, favorite: true },
    { id: 6, name: "Rocket Performance Simulator", icon: Zap, description: "Simulate rocket performance under various conditions", category: "Propulsion", usageCount: 19, favorite: false },
    { id: 7, name: "Reynolds Number Calculator", icon: Wind, description: "Calculate Reynolds numbers to predict flow regimes and boundary layer behavior", category: "Aerodynamics", usageCount: 27, favorite: true },
    { id: 8, name: "Delta-V Budget Planner", icon: Zap, description: "Mission Δv & Staging Designer - Calculate required Δv, stage sizing, and mission feasibility", category: "Space Systems", usageCount: 35, favorite: true },
    { id: 9, name: "Antenna Pattern Analyzer", icon: Radio, description: "Analyze antenna radiation patterns, calculate gain, directivity, HPBW, and EIRP", category: "Avionics", usageCount: 28, favorite: true },
    { id: 10, name: "Standard Atmosphere Calculator", icon: Cloud, description: "Compute atmospheric properties (temperature, pressure, density, speed of sound) from 0-86 km using U.S. Standard Atmosphere 1976", category: "Atmospheric Science", usageCount: 0, favorite: false },
  ];

  const filteredTools = tools.filter(tool =>
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const favoriteTools = tools.filter(tool => tool.favorite);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: "easeOut" as const } },
  };

  const implementedTools = ["Thrust Calculator", "Wing Loading Calculator", "Orbital Path Visualizer", "Lift-to-Drag Ratio Analyzer", "Reynolds Number Calculator", "Material Density Database", "Delta-V Budget Planner", "Antenna Pattern Analyzer"];

  const ToolCard = ({ tool, isFavorite = false }: { tool: typeof tools[0]; isFavorite?: boolean }) => {
    const Icon = tool.icon;
    const isImplemented = implementedTools.includes(tool.name);

    return (
      <motion.div
        variants={itemVariants}
        whileHover={{ scale: 1.03, y: -8 }}
        whileTap={{ scale: 0.98 }}
      >
        <Card className={`h-full ${isFavorite ? 'border-primary/30 hover:shadow-lg hover:shadow-primary/20' : 'border-border hover:shadow-lg hover:shadow-primary/10'} bg-card transition-all duration-300`}>
          <CardHeader>
            <div className="flex items-start justify-between mb-2">
              <motion.div 
                className="bg-primary/10 p-3 rounded-lg"
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5 }}
              >
                <Icon className="w-6 h-6 text-primary" />
              </motion.div>
              {tool.favorite && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Star className="w-5 h-5 text-primary fill-primary" />
                </motion.div>
              )}
            </div>
            <CardTitle className="text-foreground">{tool.name}</CardTitle>
            <Badge className="w-fit bg-muted text-muted-foreground">{tool.category}</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{tool.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Used {tool.usageCount} times</span>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  size="sm" 
                  className={isFavorite ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
                  variant={isFavorite ? "default" : "outline"}
                  asChild
                  disabled={!isImplemented}
                >
                  <a href={isImplemented ? getToolUrl(tool.name) : "#"}>
                    {isImplemented ? "Launch Tool →" : "Coming Soon"}
                  </a>
                </Button>
              </motion.div>
            </div>
          </CardContent>
        </Card>
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
        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">Engineering Tools</h1>
        <p className="text-gray-400">Access interactive aerospace calculators and simulators</p>
      </motion.div>

      {/* Search */}
      <motion.div 
        className="mb-8 flex justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={headerInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <div className="relative w-full max-w-2xl">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cyan-400" />
          <Input
            type="search"
            placeholder="Search tools by name, category, or function..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 bg-slate-800/50 backdrop-blur-lg border-cyan-400/20 text-white"
          />
        </div>
      </motion.div>

      {/* Favorite Tools Section */}
      {favoriteTools.length > 0 && !searchQuery && (
        <motion.div 
          ref={favoritesRef}
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={favoritesInView ? { opacity: 1 } : { opacity: 0 }}
        >
          <motion.h2 
            className="text-2xl font-semibold text-foreground mb-4 flex items-center justify-center space-x-2"
            initial={{ opacity: 0, x: -20 }}
            animate={favoritesInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.6 }}
          >
            <Star className="w-6 h-6 text-primary fill-primary" />
            <span>Favorite Tools</span>
          </motion.h2>
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
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

      {/* All Tools Section */}
      <motion.div ref={allToolsRef}>
        <motion.h2 
          className="text-2xl font-semibold text-foreground mb-4 text-center"
          initial={{ opacity: 0 }}
          animate={allToolsInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          {searchQuery ? "Search Results" : "All Tools"}
        </motion.h2>
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate={allToolsInView ? "visible" : "hidden"}
        >
          {filteredTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </motion.div>

        {filteredTools.length === 0 && (
          <motion.div 
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-muted-foreground">No tools found matching "{searchQuery}"</p>
          </motion.div>
        )}
      </motion.div>

      {/* Usage Stats */}
      <motion.div
        ref={statsRef}
        initial={{ opacity: 0, y: 40 }}
        animate={statsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="mt-8 bg-slate-800/50 backdrop-blur-lg border-cyan-400/30 rounded-2xl shadow-[0_0_30px_rgba(34,211,238,0.2)]">
          <CardContent className="pt-6">
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center"
              variants={containerVariants}
              initial="hidden"
              animate={statsInView ? "visible" : "hidden"}
            >
              {[
                { value: "12", label: "Total Tools Available", color: "text-white" },
                { value: "108", label: "Times Used This Month", color: "text-cyan-400", shadow: "drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" },
                { value: "3", label: "Favorite Tools", color: "text-blue-400", shadow: "drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]" },
              ].map((stat) => (
                <motion.div key={stat.label} variants={itemVariants}>
                  <motion.p 
                    className={`text-3xl font-bold mb-2 ${stat.color} ${stat.shadow || ''}`}
                    initial={{ scale: 0.5 }}
                    animate={statsInView ? { scale: 1 } : { scale: 0.5 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                  >
                    {stat.value}
                  </motion.p>
                  <p className="text-gray-400">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
};

export default DashboardTools;
