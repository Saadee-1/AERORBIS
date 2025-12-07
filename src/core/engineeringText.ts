/**
 * Generate structured engineering summaries for airfoil recommendations
 * Converts numeric metrics into clear, mission-aware text explanations
 */

import type { MissionId } from "@/types/missionRecommendations";
import type { MissionPreset } from "@/data/missions";
import { getMissionById } from "@/data/missions";

export interface EngineeringSummary {
  headline: string;
  pros: string[];
  cautions: string[];
  missionNote?: string;
}

export interface EngineeringContext {
  airfoilId: string;
  name: string;
  missionId: MissionId | null;
  ldMax: number;
  clMax: number;
  alphaStall: number;
  cdMin: number;
  stallSoftness?: number | null;
  cmRange?: number | null;
  cmMean?: number | null;
  reynolds?: number;
}

/**
 * Build a structured engineering summary from metrics
 * Uses numeric thresholds for text classification (NOT for scoring)
 */
export function buildEngineeringSummary(
  ctx: EngineeringContext,
  mission?: MissionPreset
): EngineeringSummary {
  const {
    name,
    ldMax,
    clMax,
    alphaStall,
    cdMin,
    stallSoftness,
    cmRange,
    cmMean,
    reynolds,
  } = ctx;

  const summary: EngineeringSummary = {
    headline: "",
    pros: [],
    cautions: [],
    missionNote: undefined,
  };

  // Build headline based on strongest characteristics
  if (ldMax >= 80) {
    summary.headline = `High-efficiency airfoil with excellent L/D (${ldMax.toFixed(0)})`;
  } else if (clMax >= 1.6) {
    summary.headline = `High-lift design with strong CLmax (${clMax.toFixed(2)})`;
  } else if (cdMin < 0.008) {
    summary.headline = `Low-drag profile with minimal Cd (${cdMin.toFixed(4)})`;
  } else if (stallSoftness && stallSoftness > 0.6) {
    summary.headline = `Forgiving airfoil with gentle stall characteristics`;
  } else {
    summary.headline = `${name || "This airfoil"} offers balanced performance`;
  }

  // Pros: Positive characteristics
  if (ldMax >= 80) {
    summary.pros.push(`Excellent cruise efficiency with L/D of ${ldMax.toFixed(0)}`);
  } else if (ldMax >= 60) {
    summary.pros.push(`Good cruise efficiency (L/D=${ldMax.toFixed(0)})`);
  } else if (ldMax >= 40) {
    summary.pros.push(`Moderate efficiency (L/D=${ldMax.toFixed(0)})`);
  }

  if (clMax >= 1.6) {
    summary.pros.push(`Strong maximum lift (CL=${clMax.toFixed(2)}) enables low-speed performance`);
  } else if (clMax >= 1.2) {
    summary.pros.push(`Good maximum lift (CL=${clMax.toFixed(2)}) for typical operations`);
  }

  if (alphaStall >= 14) {
    summary.pros.push(`Generous stall margin (α=${alphaStall.toFixed(1)}°) for safer operations`);
  } else if (alphaStall >= 10) {
    summary.pros.push(`Adequate stall angle (α=${alphaStall.toFixed(1)}°)`);
  }

  if (cdMin < 0.008) {
    summary.pros.push(`Very low minimum drag (Cd=${cdMin.toFixed(4)}) minimizes fuel consumption`);
  } else if (cdMin < 0.015) {
    summary.pros.push(`Low minimum drag (Cd=${cdMin.toFixed(4)}) for efficient cruise`);
  }

  if (stallSoftness && stallSoftness > 0.6) {
    summary.pros.push(`Soft stall behavior (softness=${stallSoftness.toFixed(2)}) is forgiving near limits`);
  } else if (stallSoftness && stallSoftness > 0.4) {
    summary.pros.push(`Moderate stall softness for predictable handling`);
  }

  if (cmRange !== undefined && cmRange < 0.1) {
    summary.pros.push(`Stable pitching moment (Cm range ${cmRange.toFixed(3)}) ensures predictable trim`);
  }

  // Cautions: Potential concerns
  if (clMax >= 1.8 && alphaStall < 12) {
    summary.cautions.push(`Very high lift but stall occurs early (α=${alphaStall.toFixed(1)}°), watch for sharper stall`);
  } else if (clMax >= 1.6 && alphaStall < 10) {
    summary.cautions.push(`Strong lift but lower stall angle (α=${alphaStall.toFixed(1)}°) requires careful handling`);
  }

  if (cdMin >= 0.02) {
    summary.cautions.push(`Higher minimum drag (Cd=${cdMin.toFixed(4)}) may impact efficiency at cruise`);
  }

  if (cmMean !== undefined && cmMean < -0.1) {
    summary.cautions.push(`Strong nose-down pitching moment (Cm≈${cmMean.toFixed(3)}) may require more tail volume`);
  } else if (cmMean !== undefined && cmMean > 0.1) {
    summary.cautions.push(`Nose-up pitching moment (Cm≈${cmMean.toFixed(3)}) may affect trim requirements`);
  }

  if (cmRange !== undefined && cmRange > 0.2) {
    summary.cautions.push(`Wide Cm range (${cmRange.toFixed(3)}) - verify trim requirements for your CG range`);
  }

  if (stallSoftness !== undefined && stallSoftness < 0.3) {
    summary.cautions.push(`Sharp stall characteristics may require careful pilot technique`);
  }

  // Mission-specific note using engineeringHint
  if (mission && mission.engineeringHint) {
    // Build mission note incorporating the hint
    const hint = mission.engineeringHint.toLowerCase();
    
    if (hint.includes("l/d") || hint.includes("efficiency")) {
      if (ldMax >= 60) {
        summary.missionNote = `For ${mission.shortLabel}: ${mission.engineeringHint} — L/D of ${ldMax.toFixed(0)} supports this.`;
      } else {
        summary.missionNote = `For ${mission.shortLabel}: ${mission.engineeringHint}`;
      }
    } else if (hint.includes("clmax") || hint.includes("lift")) {
      if (clMax >= 1.4) {
        summary.missionNote = `For ${mission.shortLabel}: ${mission.engineeringHint} — CLmax of ${clMax.toFixed(2)} supports this.`;
      } else {
        summary.missionNote = `For ${mission.shortLabel}: ${mission.engineeringHint}`;
      }
    } else if (hint.includes("stall")) {
      if (stallSoftness && stallSoftness > 0.5) {
        summary.missionNote = `For ${mission.shortLabel}: ${mission.engineeringHint} — soft stall (${stallSoftness.toFixed(2)}) supports this.`;
      } else {
        summary.missionNote = `For ${mission.shortLabel}: ${mission.engineeringHint}`;
      }
    } else if (hint.includes("drag")) {
      if (cdMin < 0.015) {
        summary.missionNote = `For ${mission.shortLabel}: ${mission.engineeringHint} — low drag (Cd=${cdMin.toFixed(4)}) supports this.`;
      } else {
        summary.missionNote = `For ${mission.shortLabel}: ${mission.engineeringHint}`;
      }
    } else {
      summary.missionNote = `For ${mission.shortLabel}: ${mission.engineeringHint}`;
    }
  }

  // Ensure we have at least one pro
  if (summary.pros.length === 0) {
    summary.pros.push(`Evaluated at Re=${reynolds ? reynolds.toLocaleString() : "target"}`);
  }

  // Limit pros to 2-3 most important
  summary.pros = summary.pros.slice(0, 3);

  return summary;
}

