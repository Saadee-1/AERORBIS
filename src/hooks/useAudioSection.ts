import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { globalAudioController } from "@/lib/audio/globalAudioController";

const routeToTrack: Record<string, string> = {
  "/": "home",
  "/learn": "learn",
  "/research": "research",
  "/tools": "tools",
  "/community": "community",
  "/contact": "home",
  "/dashboard": "dashboard",
  "/dashboard/learning": "dashboard",
  "/dashboard/research": "dashboard",
  "/dashboard/tools": "dashboard",
  "/dashboard/profile": "dashboard",
};

export const useAudioSection = () => {
  const location = useLocation();

  useEffect(() => {
    const nextTrack = routeToTrack[location.pathname] ?? "home";
    globalAudioController.setTrack(nextTrack);
  }, [location.pathname]);
};
