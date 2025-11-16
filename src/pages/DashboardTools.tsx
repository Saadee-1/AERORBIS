import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calculator, Satellite, Wind, Gauge, Database, Zap, Star, Search } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

const DashboardTools = () => {
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data - Future Integration: Connect to Database
  const tools = [
    {
      id: 1,
      name: "Thrust Calculator",
      icon: Calculator,
      description: "Calculate thrust force based on mass flow and velocity",
      category: "Propulsion",
      usageCount: 23,
      favorite: true,
    },
    {
      id: 2,
      name: "Orbital Path Visualizer",
      icon: Satellite,
      description: "Simulate and visualize satellite orbital trajectories",
      category: "Orbital Mechanics",
      usageCount: 15,
      favorite: true,
    },
    {
      id: 3,
      name: "Wing Efficiency Plotter",
      icon: Wind,
      description: "Plot lift-to-drag ratios for different wing configurations",
      category: "Aerodynamics",
      usageCount: 31,
      favorite: false,
    },
    {
      id: 4,
      name: "Pressure Distribution Analyzer",
      icon: Gauge,
      description: "Analyze pressure distributions across airfoil surfaces",
      category: "Aerodynamics",
      usageCount: 12,
      favorite: true,
    },
    {
      id: 5,
      name: "Material Density Database",
      icon: Database,
      description: "Searchable database of aerospace materials with density properties. Compare materials and add custom entries.",
      category: "Materials",
      usageCount: 42,
      favorite: true,
    },
    {
      id: 6,
      name: "Rocket Performance Simulator",
      icon: Zap,
      description: "Simulate rocket performance under various conditions",
      category: "Propulsion",
      usageCount: 19,
      favorite: false,
    },
    {
      id: 7,
      name: "Reynolds Number Calculator",
      icon: Wind,
      description: "Calculate Reynolds numbers to predict flow regimes and boundary layer behavior",
      category: "Aerodynamics",
      usageCount: 27,
      favorite: true,
    },
  ];

  const filteredTools = tools.filter(tool =>
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const favoriteTools = tools.filter(tool => tool.favorite);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">Engineering Tools</h1>
        <p className="text-gray-400">Access interactive aerospace calculators and simulators</p>
      </div>

      {/* Search */}
      <div className="mb-8">
        <div className="relative max-w-2xl">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cyan-400" />
          <Input
            type="search"
            placeholder="Search tools by name, category, or function..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 bg-slate-800/50 backdrop-blur-lg border-cyan-400/20 text-white"
          />
        </div>
      </div>

      {/* Favorite Tools Section */}
      {favoriteTools.length > 0 && !searchQuery && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center space-x-2">
            <Star className="w-6 h-6 text-primary fill-primary" />
            <span>Favorite Tools</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoriteTools.map((tool, index) => {
              const Icon = tool.icon;
              return (
                <motion.div
                  key={tool.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-card border-primary/30 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div className="bg-primary/10 p-3 rounded-lg">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <Star className="w-5 h-5 text-primary fill-primary" />
                      </div>
                      <CardTitle className="text-foreground">{tool.name}</CardTitle>
                      <Badge className="w-fit bg-muted text-muted-foreground">{tool.category}</Badge>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">{tool.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Used {tool.usageCount} times</span>
                        <Button 
                          size="sm" 
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                          asChild
                          disabled={!["Thrust Calculator", "Wing Loading Calculator", "Orbital Path Visualizer", "Lift-to-Drag Ratio Analyzer", "Reynolds Number Calculator", "Material Density Database"].includes(tool.name)}
                        >
                          <a href={["Thrust Calculator", "Wing Loading Calculator", "Orbital Path Visualizer", "Lift-to-Drag Ratio Analyzer", "Reynolds Number Calculator", "Material Density Database"].includes(tool.name) ? "/tools/launch" : "#"}>
                            {["Thrust Calculator", "Wing Loading Calculator", "Orbital Path Visualizer", "Lift-to-Drag Ratio Analyzer", "Reynolds Number Calculator", "Material Density Database"].includes(tool.name) ? "Launch Tool →" : "Coming Soon"}
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* All Tools Section */}
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-4">
          {searchQuery ? "Search Results" : "All Tools"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.map((tool, index) => {
            const Icon = tool.icon;
            return (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-card border-border hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="bg-primary/10 p-3 rounded-lg">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      {tool.favorite && <Star className="w-5 h-5 text-primary fill-primary" />}
                    </div>
                    <CardTitle className="text-foreground">{tool.name}</CardTitle>
                    <Badge className="w-fit bg-muted text-muted-foreground">{tool.category}</Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{tool.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Used {tool.usageCount} times</span>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-border hover:bg-muted"
                        asChild
                        disabled={!["Thrust Calculator", "Wing Loading Calculator", "Orbital Path Visualizer", "Lift-to-Drag Ratio Analyzer", "Reynolds Number Calculator", "Material Density Database"].includes(tool.name)}
                      >
                        <a href={["Thrust Calculator", "Wing Loading Calculator", "Orbital Path Visualizer", "Lift-to-Drag Ratio Analyzer", "Reynolds Number Calculator", "Material Density Database"].includes(tool.name) ? "/tools/launch" : "#"}>
                          {["Thrust Calculator", "Wing Loading Calculator", "Orbital Path Visualizer", "Lift-to-Drag Ratio Analyzer", "Reynolds Number Calculator", "Material Density Database"].includes(tool.name) ? "Launch Tool →" : "Coming Soon"}
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {filteredTools.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No tools found matching "{searchQuery}"</p>
          </div>
        )}
      </div>

      {/* Usage Stats */}
      <Card className="mt-8 bg-slate-800/50 backdrop-blur-lg border-cyan-400/30 rounded-2xl shadow-[0_0_30px_rgba(34,211,238,0.2)]">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-white mb-2">12</p>
              <p className="text-gray-400">Total Tools Available</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-cyan-400 mb-2 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">108</p>
              <p className="text-gray-400">Times Used This Month</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-blue-400 mb-2 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]">3</p>
              <p className="text-gray-400">Favorite Tools</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default DashboardTools;
