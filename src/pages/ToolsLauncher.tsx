"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom"; // <-- Make sure this is imported
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DeepSpaceDataBackground from "@/components/backgrounds/DeepSpaceDataBackground";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Rocket, Plane, Orbit, TrendingUp } from "lucide-react";

// FIX 1: Import the *correct* advanced calculators from /components
import AdvancedThrustCalculator from "@/components/AdvancedThrustCalc";
import AdvancedWingLoadingCalculator from "@/components/AdvancedWingCalc";
import AdvancedOrbitalVisualizer from "@/components/AdvancedOrbitalVis";
import LiftDragAnalyzer from "@/components/LiftDragAnalyzer";

// A simple component to read the URL query
const getToolFromQuery = () => {
  // This hook can only be called inside a component,
  // so we wrap it.
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  return params.get("tool") || "thrust"; // Default to 'thrust'
};

const ToolsLauncher = () => {
  // FIX 2: Set the initial tab state from the URL query
  const defaultTab = getToolFromQuery();
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="min-h-screen flex flex-col relative bg-gradient-to-b from-black via-slate-900 to-black">
      <DeepSpaceDataBackground />
      <Navbar />
      <PageBreadcrumb />
      
      <section className="relative py-12 flex-grow">
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full max-w-4xl mx-auto grid-cols-2 lg:grid-cols-4 bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 p-1 rounded-xl mb-8">
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
              </TabsList>

              {/* FIX 3: Render the *correct* components */}
              <TabsContent value="thrust" className="mt-0">
                <AdvancedThrustCalculator />
              </TabsContent>

              <TabsContent value="wing" className="mt-0">
                <AdvancedWingLoadingCalculator />
              </TabsContent>

              <TabsContent value="orbital" className="mt-0">
                <AdvancedOrbitalVisualizer />
              </TabsContent>

              <TabsContent value="liftdrag" className="mt-0">
                <LiftDragAnalyzer />
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
