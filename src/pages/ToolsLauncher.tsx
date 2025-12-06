import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DeepSpaceDataBackground from "@/components/backgrounds/DeepSpaceDataBackground";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Rocket, Plane, Orbit, TrendingUp, Wind, Database, Zap, Radio, Grid3x3, Cloud, Scale, Target, Battery } from "lucide-react";
import ThrustCalculator from "@/components/tools/ThrustCalculator";
import WingLoadingCalculator from "@/components/tools/WingLoadingCalculator";
import OrbitalVisualizer from "@/components/tools/OrbitalVisualizer";
import { LaunchpadWithMissionPanel } from "@/components/tools/LaunchpadWithMissionPanel";
import ReynoldsNumberCalculator from "@/components/tools/ReynoldsNumberCalculator";
import MaterialsDatabase from "@/components/tools/MaterialsDatabase";
import DeltaVPlanner from "@/components/tools/deltav/DeltaVPlanner";
import AntennaPatternAnalyzer from "@/components/tools/AntennaPatternAnalyzer";
import StandardAtmosphereCalculator from "@/components/tools/StandardAtmosphereCalculator";
import StabilityCalculator from "@/tools/stability";
import StructuralWeightEstimator from "@/tools/weight";
import TrajectorySimulator from "@/tools/trajectory";
import RocketEngineCalculator from "@/tools/rocketEngine";
import PowerSystemCalculator from "@/tools/power";

// Mapping from tool names to tab IDs
const TOOL_NAME_TO_TAB: { [key: string]: string } = {
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
    // Also support direct tool IDs
  "thrust": "thrust",
  "wing": "wing",
  "orbital": "orbital",
  "liftdrag": "liftdrag",
  "reynolds": "reynolds",
  "materials": "materials",
  "deltav": "deltav",
  "antenna": "antenna",
    "atmosphere": "atmosphere",
    "rocketengine": "rocketengine",
    "stability": "stability",
    "power": "power",
    "weight": "weight",
    "trajectory": "trajectory",
};

const ToolsLauncher = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toolParam = searchParams.get("tool");
  const initialTab = toolParam && TOOL_NAME_TO_TAB[toolParam] ? TOOL_NAME_TO_TAB[toolParam] : (toolParam || "thrust");
  const [activeTab, setActiveTab] = useState(initialTab);
  const [hideTabs, setHideTabs] = useState(!!toolParam);

  // Update active tab when URL changes
  useEffect(() => {
    if (toolParam && TOOL_NAME_TO_TAB[toolParam]) {
      const tabId = TOOL_NAME_TO_TAB[toolParam];
      setActiveTab(tabId);
      setHideTabs(true);
    } else if (toolParam) {
      // Direct tab ID in URL
      setActiveTab(toolParam);
      setHideTabs(true);
    }
  }, [toolParam]);

  const showAllTools = () => {
    navigate("/tools/launch");
    setHideTabs(false);
  };

  return (
    <div className="min-h-screen flex flex-col relative bg-gradient-to-b from-black via-slate-900 to-black">
      <DeepSpaceDataBackground />
      <Navbar />
      <PageBreadcrumb />
      
      <section className="relative py-12 flex-grow">
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          {hideTabs && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex justify-end"
            >
              <Button
                variant="outline"
                onClick={showAllTools}
                className="border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10"
              >
                <Grid3x3 className="w-4 h-4 mr-2" />
                Show All Tools
              </Button>
            </motion.div>
          )}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value); setHideTabs(false); }} className="w-full">
              {!hideTabs && (
                <TabsList className="grid w-full max-w-8xl mx-auto grid-cols-2 md:grid-cols-4 lg:grid-cols-8 bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 p-1 rounded-xl mb-8">
                <TabsTrigger 
                  value="thrust"
                  className="data-[state=active]:bg-cyan-400/30 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_30px_rgba(34,211,238,0.8)] data-[state=active]:border-2 data-[state=active]:border-cyan-400/70 data-[state=active]:font-bold rounded-lg transition-all duration-300"
                >
                  <Rocket className="w-4 h-4 mr-2" />
                  Thrust Calculator
                </TabsTrigger>
                <TabsTrigger 
                  value="wing"
                  className="data-[state=active]:bg-cyan-400/30 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_30px_rgba(34,211,238,0.8)] data-[state=active]:border-2 data-[state=active]:border-cyan-400/70 data-[state=active]:font-bold rounded-lg transition-all duration-300"
                >
                  <Plane className="w-4 h-4 mr-2" />
                  Wing Loading Calculator
                </TabsTrigger>
                <TabsTrigger 
                  value="orbital"
                  className="data-[state=active]:bg-cyan-400/30 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_30px_rgba(34,211,238,0.8)] data-[state=active]:border-2 data-[state=active]:border-cyan-400/70 data-[state=active]:font-bold rounded-lg transition-all duration-300"
                >
                  <Orbit className="w-4 h-4 mr-2" />
                  Orbital Visualizer
                </TabsTrigger>
                <TabsTrigger 
                  value="liftdrag"
                  className="data-[state=active]:bg-cyan-400/30 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_30px_rgba(34,211,238,0.8)] data-[state=active]:border-2 data-[state=active]:border-cyan-400/70 data-[state=active]:font-bold rounded-lg transition-all duration-300"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  L/D Analyzer
                </TabsTrigger>
                <TabsTrigger 
                  value="reynolds"
                  className="data-[state=active]:bg-cyan-400/30 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_30px_rgba(34,211,238,0.8)] data-[state=active]:border-2 data-[state=active]:border-cyan-400/70 data-[state=active]:font-bold rounded-lg transition-all duration-300"
                >
                  <Wind className="w-4 h-4 mr-2" />
                  Reynolds Number
                </TabsTrigger>
                <TabsTrigger 
                  value="materials"
                  className="data-[state=active]:bg-cyan-400/30 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_30px_rgba(34,211,238,0.8)] data-[state=active]:border-2 data-[state=active]:border-cyan-400/70 data-[state=active]:font-bold rounded-lg transition-all duration-300"
                >
                  <Database className="w-4 h-4 mr-2" />
                  Materials DB
                </TabsTrigger>
                <TabsTrigger 
                  value="deltav"
                  className="data-[state=active]:bg-cyan-400/30 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_30px_rgba(34,211,238,0.8)] data-[state=active]:border-2 data-[state=active]:border-cyan-400/70 data-[state=active]:font-bold rounded-lg transition-all duration-300"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Δv Planner
                </TabsTrigger>
                <TabsTrigger 
                  value="antenna"
                  className="data-[state=active]:bg-cyan-400/30 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_30px_rgba(34,211,238,0.8)] data-[state=active]:border-2 data-[state=active]:border-cyan-400/70 data-[state=active]:font-bold rounded-lg transition-all duration-300"
                >
                  <Radio className="w-4 h-4 mr-2" />
                  Antenna
                </TabsTrigger>
                <TabsTrigger 
                  value="atmosphere"
                  className="data-[state=active]:bg-cyan-400/30 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_30px_rgba(34,211,238,0.8)] data-[state=active]:border-2 data-[state=active]:border-cyan-400/70 data-[state=active]:font-bold rounded-lg transition-all duration-300"
                >
                  <Cloud className="w-4 h-4 mr-2" />
                  Atmosphere
                </TabsTrigger>
                <TabsTrigger 
                  value="rocketengine"
                  className="data-[state=active]:bg-cyan-400/30 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_30px_rgba(34,211,238,0.8)] data-[state=active]:border-2 data-[state=active]:border-cyan-400/70 data-[state=active]:font-bold rounded-lg transition-all duration-300"
                >
                  <Rocket className="w-4 h-4 mr-2" />
                  Rocket Engine
                </TabsTrigger>
                <TabsTrigger 
                  value="stability"
                  className="data-[state=active]:bg-cyan-400/30 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_30px_rgba(34,211,238,0.8)] data-[state=active]:border-2 data-[state=active]:border-cyan-400/70 data-[state=active]:font-bold rounded-lg transition-all duration-300"
                >
                  <Plane className="w-4 h-4 mr-2" />
                  Stability
                </TabsTrigger>
                <TabsTrigger 
                  value="power"
                  className="data-[state=active]:bg-cyan-400/30 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_30px_rgba(34,211,238,0.8)] data-[state=active]:border-2 data-[state=active]:border-cyan-400/70 data-[state=active]:font-bold rounded-lg transition-all duration-300"
                >
                  <Battery className="w-4 h-4 mr-2" />
                  Power System
                </TabsTrigger>
                <TabsTrigger 
                  value="weight"
                  className="data-[state=active]:bg-cyan-400/30 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_30px_rgba(34,211,238,0.8)] data-[state=active]:border-2 data-[state=active]:border-cyan-400/70 data-[state=active]:font-bold rounded-lg transition-all duration-300"
                >
                  <Scale className="w-4 h-4 mr-2" />
                  Weight Estimator
                </TabsTrigger>
                <TabsTrigger 
                  value="trajectory"
                  className="data-[state=active]:bg-cyan-400/30 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_30px_rgba(34,211,238,0.8)] data-[state=active]:border-2 data-[state=active]:border-cyan-400/70 data-[state=active]:font-bold rounded-lg transition-all duration-300"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Trajectory
                </TabsTrigger>
                </TabsList>
              )}

              <TabsContent value="thrust" className="mt-0">
                <ThrustCalculator />
              </TabsContent>

              <TabsContent value="wing" className="mt-0">
                <WingLoadingCalculator />
              </TabsContent>

              <TabsContent value="orbital" className="mt-0">
                <OrbitalVisualizer />
              </TabsContent>

              <TabsContent value="liftdrag" className="mt-0">
                <LaunchpadWithMissionPanel />
              </TabsContent>

              <TabsContent value="reynolds" className="mt-0">
                <ReynoldsNumberCalculator />
              </TabsContent>

              <TabsContent value="materials" className="mt-0">
                <MaterialsDatabase />
              </TabsContent>

              <TabsContent value="deltav" className="mt-0">
                <DeltaVPlanner />
              </TabsContent>

              <TabsContent value="antenna" className="mt-0">
                <AntennaPatternAnalyzer />
              </TabsContent>

              <TabsContent value="atmosphere" className="mt-0">
                <StandardAtmosphereCalculator />
              </TabsContent>

              <TabsContent value="rocketengine" className="mt-0">
                <RocketEngineCalculator />
              </TabsContent>

              <TabsContent value="stability" className="mt-0">
                <StabilityCalculator />
              </TabsContent>

              <TabsContent value="power" className="mt-0">
                <PowerSystemCalculator />
              </TabsContent>

              <TabsContent value="weight" className="mt-0">
                <StructuralWeightEstimator />
              </TabsContent>

              <TabsContent value="trajectory" className="mt-0">
                <TrajectorySimulator />
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ToolsLauncher;
