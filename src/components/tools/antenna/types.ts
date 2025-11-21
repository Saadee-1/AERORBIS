import type { AntennaPatternResult } from "@/lib/antenna/models-enhanced";

export interface AntennaResult {
  peakGainDbi: number;
  peakGainLinear: number;
  directivity: number;
  directivityDbi: number;
  hpbmE: number | null;
  hpbmH: number | null;
  sideLobeLevel: number;
  frontToBackRatio: number;
  eirp: {
    eirpWatts: number;
    eirpDbw: number;
    eirpDbm: number;
  };
  warnings: string[];
  metadata?: AntennaPatternResult["metadata"];
}

