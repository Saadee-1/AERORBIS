"use client";

import { useEffect } from "react";
import { globalAudioController } from "@/lib/audio/globalAudioController";

const GlobalAudioProvider = () => {
  useEffect(() => {
    // Ensure the singleton audio element exists as soon as the app mounts.
    globalAudioController.getAudioElement();
  }, []);

  return null;
};

export default GlobalAudioProvider;
