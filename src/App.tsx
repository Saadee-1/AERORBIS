import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useAudioSection } from "@/hooks/useAudioSection";
import { AIAssistantProvider } from "@/contexts/AIAssistantContext";
import AIAssistant from "@/components/AIAssistant";
import PageTransition from "./components/PageTransition";
import GalaxyBackground from "./components/GalaxyBackground";
import GlobeLoader from "./components/GlobeLoader";
import Index from "./pages/Index";
import Learn from "./pages/Learn";
import Research from "./pages/Research";
import Tools from "./pages/Tools";
import ToolsLauncher from "./pages/ToolsLauncher";
import Community from "./pages/Community";
import ContactPage from "./pages/ContactPage";
import NotFound from "./pages/NotFound";
import DashboardOverview from "./pages/DashboardOverview";
import DashboardLearning from "./pages/DashboardLearning";
import DashboardResearch from "./pages/DashboardResearch";
import DashboardTools from "./pages/DashboardTools";
import DashboardProfile from "./pages/DashboardProfile";
import AudioVisualizer from "@/components/AudioVisualizer";
import GlobalAudioProvider from "@/components/GlobalAudioProvider";
import HeroIntro from "@/components/HeroIntro";
import Navbar from "@/components/Navbar";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousPath, setPreviousPath] = useState(location.pathname);
  useAudioSection();

  useEffect(() => {
    if (location.pathname !== previousPath) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setPreviousPath(location.pathname);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, previousPath]);

  return (
    <>
      <GlobeLoader isLoading={isTransitioning} />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><Index /></PageTransition>} />
          <Route path="/learn" element={<PageTransition><Learn /></PageTransition>} />
          <Route path="/research" element={<PageTransition><Research /></PageTransition>} />
          <Route path="/tools" element={<PageTransition><Tools /></PageTransition>} />
          <Route path="/tools/launch" element={<PageTransition><ToolsLauncher /></PageTransition>} />
          <Route path="/community" element={<PageTransition><Community /></PageTransition>} />
          <Route path="/contact" element={<PageTransition><ContactPage /></PageTransition>} />
          <Route path="/dashboard" element={<PageTransition><DashboardOverview /></PageTransition>} />
          <Route path="/dashboard/learning" element={<PageTransition><DashboardLearning /></PageTransition>} />
          <Route path="/dashboard/research" element={<PageTransition><DashboardResearch /></PageTransition>} />
          <Route path="/dashboard/tools" element={<PageTransition><DashboardTools /></PageTransition>} />
          <Route path="/dashboard/profile" element={<PageTransition><DashboardProfile /></PageTransition>} />
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </AnimatePresence>
    </>
  );
};

// ---- MAIN APP ----
const App = () => {
  const [showIntro, setShowIntro] = useState(() => {
    const hasSeenIntro = localStorage.getItem('hasSeenIntro');
    return !hasSeenIntro;
  });

  useEffect(() => {
    if (showIntro) {
      const timer = setTimeout(() => {
        setShowIntro(false);
        localStorage.setItem('hasSeenIntro', 'true');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showIntro]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AIAssistantProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <GalaxyBackground />
            <GlobalAudioProvider />
            {!showIntro && <Navbar />}
            <AudioVisualizer />
            {showIntro ? <HeroIntro /> : <AnimatedRoutes />}
            <AIAssistant />
          </BrowserRouter>
        </AIAssistantProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

