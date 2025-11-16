import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DeepSpaceDataBackground from "@/components/backgrounds/DeepSpaceDataBackground";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Rocket, Plane, Orbit, TrendingUp, Wind, Database, Zap, Radio, Grid3x3 } from "lucide-react";
import ThrustCalculator from "@/components/tools/ThrustCalculator";
import WingLoadingCalculator from "@/components/tools/WingLoadingCalculator";
import OrbitalVisualizer from "@/components/tools/OrbitalVisualizer";
import LiftDragAnalyzer from "@/components/tools/LiftDragAnalyzer";
import ReynoldsNumberCalculator from "@/components/tools/ReynoldsNumberCalculator";
import MaterialsDatabase from "@/components/tools/MaterialsDatabase";
import DeltaVPlanner from "@/components/tools/deltav/DeltaVPlanner";
import AntennaPatternAnalyzer from "@/components/tools/AntennaPatternAnalyzer";

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
                <TabsList className="grid w-full max-w-8xl mx-auto grid-cols-2 lg:grid-cols-8 bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 p-1 rounded-xl mb-8">
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
                <LiftDragAnalyzer />
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
            </Tabs>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ToolsLauncher;
