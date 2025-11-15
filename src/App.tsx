import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useAudioSection } from "@/hooks/useAudioSection";
import { AIAssistantProvider } from "@/contexts/AIAssistantContext";
import AIAssistant from "@/components/AIAssistant";
import PageTransition from "./components/PageTransition";
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
import HeroIntro from "@/components/HeroIntro"; // <-- Add your 3D intro component

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();
  useAudioSection();

   return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Index /></PageTransition>} />
        <Route path="/learn" element={<PageTransition><Learn /></PageTransition>} />
        <Route path="/research" element={<PageTransition><Research /></PageTransition>} />
        <Route path="/tools/launch" element={<PageTransition><ToolsLauncher /></PageTransition>} />
        <Route path="/tools" element={<PageTransition><Tools /></PageTransition>} />
        <Route path="/community" element={<PageTransition><Community /></PageTransition>} />
        <Route path="/contact" element={<PageTransition><ContactPage /></PageTransition>} />
        <Route path="/dashboard/learning" element={<PageTransition><DashboardLearning /></PageTransition>} />
        <Route path="/dashboard/research" element={<PageTransition><DashboardResearch /></PageTransition>} />
        <Route path="/dashboard/tools" element={<PageTransition><DashboardTools /></PageTransition>} />
        <Route path="/dashboard/profile" element={<PageTransition><DashboardProfile /></PageTransition>} />
        <Route path="/dashboard" element={<PageTransition><DashboardOverview /></PageTransition>} />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

// ---- MAIN APP ----
const App = () => {
  const [showIntro, setShowIntro] = useState(() => {
    // Check if intro has been shown before
    const hasSeenIntro = localStorage.getItem('hasSeenIntro');
    return !hasSeenIntro;
  });

  // Automatically hide intro after 4s and mark as seen
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

