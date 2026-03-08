import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Footer from "@/components/Footer";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import GlobeLoader from "@/components/GlobeLoader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Rocket, Plane, Orbit, TrendingUp, Wind, Database, Zap, Radio, Grid3x3, Cloud, Scale, Target, Battery, ArrowUp } from "lucide-react";
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
import ClimbPerformanceCalculator from "@/components/tools/performance/ClimbPerformanceCalculator";
import { DesignSessionProvider } from "@/contexts/designSession";

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
    "Climb Performance Calculator": "climb",
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
    "climb": "climb",
};

const ToolsLauncher = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toolParam = searchParams.get("tool");
  const initialTab = toolParam && TOOL_NAME_TO_TAB[toolParam] ? TOOL_NAME_TO_TAB[toolParam] : (toolParam || "thrust");
  const [activeTab, setActiveTab] = useState(initialTab);
  const [hideTabs, setHideTabs] = useState(!!toolParam);
  const [showToolsModal, setShowToolsModal] = useState(false);
  const [isHoveringTools, setIsHoveringTools] = useState(false);
  const [isToolTransitioning, setIsToolTransitioning] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(true);
  const [previousTool, setPreviousTool] = useState(activeTab);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const TRANSITION_DURATION = 400;

  // Handle tool transitions with globe loader and fade animation
  const triggerToolTransition = (newTab: string) => {
    if (newTab !== previousTool) {
      setIsContentVisible(false);
      setIsToolTransitioning(true);
      const timer = setTimeout(() => {
        setActiveTab(newTab);
        setPreviousTool(newTab);
        setIsToolTransitioning(false);
        setIsContentVisible(true);
      }, TRANSITION_DURATION);
      return () => clearTimeout(timer);
    } else {
      setActiveTab(newTab);
    }
  };

  // Update active tab when URL changes
  useEffect(() => {
    // Close modal when URL changes (browser navigation, back button, external links)
    setShowToolsModal(false);
    
    if (toolParam && TOOL_NAME_TO_TAB[toolParam]) {
      const tabId = TOOL_NAME_TO_TAB[toolParam];
      if (tabId !== previousTool) {
        triggerToolTransition(tabId);
      }
      setHideTabs(true);
    } else if (toolParam) {
      // Direct tab ID in URL
      if (toolParam !== previousTool) {
        triggerToolTransition(toolParam);
      }
      setHideTabs(true);
    } else {
      // No tool parameter - show all tabs
      setHideTabs(false);
    }
  }, [toolParam]);

  // Reset hover state when modal closes
  useEffect(() => {
    if (!showToolsModal) {
      setIsHoveringTools(false);
    }
  }, [showToolsModal]);

  const showAllTools = () => {
    setShowToolsModal(true);
  };

  const handleToolClick = (tabId: string) => {
    if (tabId !== activeTab) {
      setIsContentVisible(false);
      setIsToolTransitioning(true);
      setShowToolsModal(false);
      setIsHoveringTools(false);
      
      setTimeout(() => {
        setActiveTab(tabId);
        setPreviousTool(tabId);
        setIsToolTransitioning(false);
        setIsContentVisible(true);
        navigate(`/tools/launch?tool=${tabId}`);
      }, TRANSITION_DURATION);
    } else {
      setShowToolsModal(false);
      setIsHoveringTools(false);
    }
  };

  const handleTabChange = (newTab: string) => {
    if (newTab !== activeTab) {
      setIsContentVisible(false);
      setIsToolTransitioning(true);
      
      setTimeout(() => {
        setActiveTab(newTab);
        setPreviousTool(newTab);
        setHideTabs(false);
        setIsToolTransitioning(false);
        setIsContentVisible(true);
      }, TRANSITION_DURATION);
    }
  };

  const showAllTabs = () => {
    setShowToolsModal(false);
    setIsHoveringTools(false);
    setHideTabs(false);
    navigate("/tools/launch");
  };

  // Define all tools with their icons and labels
  const allTools = [
    { id: "thrust", icon: Rocket, label: "Thrust Calculator" },
    { id: "wing", icon: Plane, label: "Wing Loading" },
    { id: "orbital", icon: Orbit, label: "Orbital Visualizer" },
    { id: "liftdrag", icon: TrendingUp, label: "L/D Analyzer" },
    { id: "reynolds", icon: Wind, label: "Reynolds Number" },
    { id: "materials", icon: Database, label: "Materials DB" },
    { id: "deltav", icon: Zap, label: "Δv Planner" },
    { id: "antenna", icon: Radio, label: "Antenna" },
    { id: "atmosphere", icon: Cloud, label: "Atmosphere" },
    { id: "rocketengine", icon: Rocket, label: "Rocket Engine" },
    { id: "stability", icon: Plane, label: "Stability" },
    { id: "power", icon: Battery, label: "Power System" },
    { id: "weight", icon: Scale, label: "Weight Estimator" },
    { id: "trajectory", icon: Target, label: "Trajectory" },
    { id: "climb", icon: ArrowUp, label: "Climb Performance" },
  ];

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Globe loader for tool transitions */}
      <GlobeLoader isLoading={isToolTransitioning} />
      
      <PageBreadcrumb />
      
      <section className="relative py-12 flex-grow">
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          {hideTabs && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex justify-end relative"
            >
              <Button
                variant="outline"
                onClick={showAllTools}
                className="border-primary/40 text-primary hover:bg-primary/10"
              >
                <Grid3x3 className="w-4 h-4 mr-2" />
                Show All Tools
              </Button>
              
              {showToolsModal && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => {
                      setShowToolsModal(false);
                      setIsHoveringTools(false); // Reset hover state when modal closes
                    }}
                  />
                  
                  {/* Tools Modal */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 top-full mt-2 z-50 w-64 bg-popover backdrop-blur-lg border border-border rounded-lg shadow-xl overflow-hidden"
                    style={{ maxHeight: '11rem' }}
                    onMouseEnter={() => setIsHoveringTools(true)}
                    onMouseLeave={() => setIsHoveringTools(false)}
                  >
                    <div
                      ref={scrollContainerRef}
                      className="overflow-y-auto"
                      style={{
                        maxHeight: '11rem',
                        scrollbarWidth: 'thin',
                        scrollbarColor: isHoveringTools ? 'rgba(34, 211, 238, 0.5) rgba(51, 65, 85, 0.5)' : 'transparent transparent',
                        overflow: isHoveringTools ? 'auto' : 'hidden',
                      }}
                      onWheel={(e) => {
                        if (!isHoveringTools) {
                          e.preventDefault();
                          e.stopPropagation();
                          return;
                        }
                        if (scrollContainerRef.current) {
                          scrollContainerRef.current.scrollTop += e.deltaY;
                          e.preventDefault();
                        }
                      }}
                    >
                      <div className="p-2 space-y-1">
                        {/* Show All Tabs button */}
                        <button
                          onClick={showAllTabs}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-all duration-200 bg-cyan-400/20 text-cyan-400 border border-cyan-400/40 hover:bg-cyan-400/30 mb-1"
                        >
                          <Grid3x3 className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm font-medium">Show All Tabs</span>
                        </button>
                        
                        {/* Divider */}
                        <div className="h-px bg-slate-700/50 my-1" />
                        
                        {/* Tools list */}
                        {allTools.map((tool, index) => {
                          const Icon = tool.icon;
                          return (
                            <button
                              key={tool.id}
                              onClick={() => handleToolClick(tool.id)}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-all duration-200 ${
                                activeTab === tool.id
                                  ? 'bg-cyan-400/30 text-cyan-400 border border-cyan-400/50'
                                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-cyan-400'
                              }`}
                            >
                              <Icon className="w-4 h-4 flex-shrink-0" />
                              <span className="text-sm truncate">{tool.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </motion.div>
          )}
          <DesignSessionProvider>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              {!hideTabs && (
                <TabsList className="flex flex-wrap w-full max-w-full mx-auto bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 p-3 gap-2 sm:gap-3 rounded-xl mb-8 overflow-hidden">
                <TabsTrigger 
                  value="thrust"
                  className="data-[state=active]:bg-cyan-400/30 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_30px_rgba(34,211,238,0.8)] data-[state=active]:border-2 data-[state=active]:border-cyan-400/70 data-[state=active]:font-bold rounded-lg transition-all duration-300 px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 flex items-center justify-center min-w-0 flex-shrink-0 max-w-full"
                >
                  <Rocket className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                  <span className="text-xs sm:text-sm truncate">Thrust Calculator</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="wing"
                  className="data-[state=active]:bg-cyan-400/30 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_30px_rgba(34,211,238,0.8)] data-[state=active]:border-2 data-[state=active]:border-cyan-400/70 data-[state=active]:font-bold rounded-lg transition-all duration-300 px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 flex items-center justify-center min-w-0 flex-shrink-0 max-w-full"
                >
                  <Plane className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                  <span className="text-xs sm:text-sm truncate">Wing Loading</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="orbital"
                  className="data-[state=active]:bg-cyan-400/30 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_30px_rgba(34,211,238,0.8)] data-[state=active]:border-2 data-[state=active]:border-cyan-400/70 data-[state=active]:font-bold rounded-lg transition-all duration-300 px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 flex items-center justify-center min-w-0 flex-shrink-0 max-w-full"
                >
                  <Orbit className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                  <span className="text-xs sm:text-sm truncate">Orbital Visualizer</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="liftdrag"
                  className="data-[state=active]:bg-cyan-400/30 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_30px_rgba(34,211,238,0.8)] data-[state=active]:border-2 data-[state=active]:border-cyan-400/70 data-[state=active]:font-bold rounded-lg transition-all duration-300 px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 flex items-center justify-center min-w-0 flex-shrink-0 max-w-full"
                >
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                  <span className="text-xs sm:text-sm truncate">L/D Analyzer</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="reynolds"
                  className="data-[state=active]:bg-cyan-400/30 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_30px_rgba(34,211,238,0.8)] data-[state=active]:border-2 data-[state=active]:border-cyan-400/70 data-[state=active]:font-bold rounded-lg transition-all duration-300 px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 flex items-center justify-center min-w-0 flex-shrink-0 max-w-full"
                >
                  <Wind className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                  <span className="text-xs sm:text-sm truncate">Reynolds Number</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="materials"
                  className="data-[state=active]:bg-cyan-400/30 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_30px_rgba(34,211,238,0.8)] data-[state=active]:border-2 data-[state=active]:border-cyan-400/70 data-[state=active]:font-bold rounded-lg transition-all duration-300 px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 flex items-center justify-center min-w-0 flex-shrink-0 max-w-full"
                >
                  <Database className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                  <span className="text-xs sm:text-sm truncate">Materials DB</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="deltav"
                  className="data-[state=active]:bg-cyan-400/30 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_30px_rgba(34,211,238,0.8)] data-[state=active]:border-2 data-[state=active]:border-cyan-400/70 data-[state=active]:font-bold rounded-lg transition-all duration-300 px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 flex items-center justify-center min-w-0 flex-shrink-0 max-w-full"
                >
                  <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                  <span className="text-xs sm:text-sm truncate">Δv Planner</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="antenna"
                  className="data-[state=active]:bg-cyan-400/30 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_30px_rgba(34,211,238,0.8)] data-[state=active]:border-2 data-[state=active]:border-cyan-400/70 data-[state=active]:font-bold rounded-lg transition-all duration-300 px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 flex items-center justify-center min-w-0 flex-shrink-0 max-w-full"
                >
                  <Radio className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                  <span className="text-xs sm:text-sm truncate">Antenna</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="atmosphere"
                  className="data-[state=active]:bg-cyan-400/30 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_30px_rgba(34,211,238,0.8)] data-[state=active]:border-2 data-[state=active]:border-cyan-400/70 data-[state=active]:font-bold rounded-lg transition-all duration-300 px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 flex items-center justify-center min-w-0 flex-shrink-0 max-w-full"
                >
                  <Cloud className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                  <span className="text-xs sm:text-sm truncate">Atmosphere</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="rocketengine"
                  className="data-[state=active]:bg-cyan-400/30 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_30px_rgba(34,211,238,0.8)] data-[state=active]:border-2 data-[state=active]:border-cyan-400/70 data-[state=active]:font-bold rounded-lg transition-all duration-300 px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 flex items-center justify-center min-w-0 flex-shrink-0 max-w-full"
                >
                  <Rocket className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                  <span className="text-xs sm:text-sm truncate">Rocket Engine</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="stability"
                  className="data-[state=active]:bg-cyan-400/30 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_30px_rgba(34,211,238,0.8)] data-[state=active]:border-2 data-[state=active]:border-cyan-400/70 data-[state=active]:font-bold rounded-lg transition-all duration-300 px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 flex items-center justify-center min-w-0 flex-shrink-0 max-w-full"
                >
                  <Plane className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                  <span className="text-xs sm:text-sm truncate">Stability</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="power"
                  className="data-[state=active]:bg-cyan-400/30 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_30px_rgba(34,211,238,0.8)] data-[state=active]:border-2 data-[state=active]:border-cyan-400/70 data-[state=active]:font-bold rounded-lg transition-all duration-300 px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 flex items-center justify-center min-w-0 flex-shrink-0 max-w-full"
                >
                  <Battery className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                  <span className="text-xs sm:text-sm truncate">Power System</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="weight"
                  className="data-[state=active]:bg-cyan-400/30 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_30px_rgba(34,211,238,0.8)] data-[state=active]:border-2 data-[state=active]:border-cyan-400/70 data-[state=active]:font-bold rounded-lg transition-all duration-300 px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 flex items-center justify-center min-w-0 flex-shrink-0 max-w-full"
                >
                  <Scale className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                  <span className="text-xs sm:text-sm truncate">Weight Estimator</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="trajectory"
                  className="data-[state=active]:bg-cyan-400/30 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_30px_rgba(34,211,238,0.8)] data-[state=active]:border-2 data-[state=active]:border-cyan-400/70 data-[state=active]:font-bold rounded-lg transition-all duration-300 px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 flex items-center justify-center min-w-0 flex-shrink-0 max-w-full"
                >
                  <Target className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                  <span className="text-xs sm:text-sm truncate">Trajectory</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="climb"
                  className="data-[state=active]:bg-cyan-400/30 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_30px_rgba(34,211,238,0.8)] data-[state=active]:border-2 data-[state=active]:border-cyan-400/70 data-[state=active]:font-bold rounded-lg transition-all duration-300 px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 flex items-center justify-center min-w-0 flex-shrink-0 max-w-full"
                >
                  <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                  <span className="text-xs sm:text-sm truncate">Climb Performance</span>
                </TabsTrigger>
                </TabsList>
              )}

              <motion.div
                animate={{ opacity: isContentVisible ? 1 : 0 }}
                transition={{ duration: 0.2 }}
              >
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

                <TabsContent value="climb" className="mt-0">
                  <ClimbPerformanceCalculator />
                </TabsContent>
              </motion.div>
            </Tabs>
          </motion.div>
          </DesignSessionProvider>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ToolsLauncher;
