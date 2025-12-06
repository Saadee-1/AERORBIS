/**
 * Airfoil recommendation engine
 * Supports both AI mode (Gemini-backed) and Engineering mode
 */

import type {
  MissionId,
  RecommendationMode,
  RecommendationResult,
  AirfoilRecommendation,
} from "@/types/missionRecommendations";
import { getAllAirfoilsWithMetricsForRe, type AirfoilWithMetrics, type AirfoilPolarMetrics } from "@/core/airfoilMetrics";
import { getTargetReForMission } from "@/core/missionReMapping";
import { callGeminiJSON } from "@/services/geminiClient";

/**
 * Main recommendation function
 * Routes to AI or Engineering mode
 */
export async function recommendAirfoils(
  missionId: MissionId,
  mode: RecommendationMode
): Promise<RecommendationResult> {
  if (mode === "ai") {
    // Try AI first, then gracefully fall back to engineering if anything goes wrong.
    const aiResult = await recommendWithGemini(missionId);
    if (aiResult && aiResult.items.length > 0) {
      return aiResult;
    }
    console.warn("[AI recommendAirfoils] Falling back to engineering scoring for", missionId);
    return recommendWithLocalScoring(missionId, "engineering");
  }

  return recommendWithLocalScoring(missionId, "engineering");
}

/**
 * Normalize a value to 0-1 range given min and max bounds
 */
function normalize(value: number, min: number, max: number): number {
  if (!isFinite(value)) return 0;
  if (max <= min) return 0;
  const clamped = Math.max(min, Math.min(max, value));
  return (clamped - min) / (max - min);
}

/**
 * Build a per-airfoil engineering reason based on metrics and mission
 * Returns a short single sentence (~80-120 characters) explaining why this airfoil is good for that mission
 */
function buildEngineeringReason(
  missionId: MissionId,
  metrics: AirfoilPolarMetrics,
  normalizedScore: number,
  rankIndex: number
): string {
  const clMax = metrics.clMax ?? 0;
  const cdMin = metrics.cdMin ?? 1;
  const ldMax = metrics.ldMax ?? 0;
  const stallSoftness = metrics.stallSoftness ?? 0;
  const stallAlpha = metrics.stallAlpha ?? metrics.alphaAtClMax ?? 0;
  const cmRange = metrics.cmRange ?? 0;

  // Determine quality prefix based on rank
  const qualityPrefix = rankIndex === 0 
    ? "Excellent" 
    : rankIndex <= 2 
    ? "Very good" 
    : "Good trade-off";

  switch (missionId) {
    case "racer_highspeed": {
      // Emphasize low cdMin and high ldMax
      if (cdMin < 0.01 && ldMax > 80) {
        return `${qualityPrefix} low drag (Cd≈${cdMin.toFixed(4)}) and high L/D (${ldMax.toFixed(0)}) for high-speed efficiency.`;
      } else if (cdMin < 0.01) {
        return `${qualityPrefix} very low drag (Cd≈${cdMin.toFixed(4)}) ideal for high-speed racing.`;
      } else {
        return `${qualityPrefix} efficient L/D (${ldMax.toFixed(0)}) with low drag for racing.`;
      }
    }

    case "uav_endurance":
    case "glider_sailplane": {
      // Emphasize high ldMax and low cdMin
      if (ldMax > 100) {
        return `${qualityPrefix} high L/D (${ldMax.toFixed(0)}) with low drag (Cd≈${cdMin.toFixed(4)}) for extended endurance.`;
      } else if (cdMin < 0.008) {
        return `${qualityPrefix} very low drag (Cd≈${cdMin.toFixed(4)}) maximizes range and efficiency.`;
      } else {
        return `${qualityPrefix} balanced L/D (${ldMax.toFixed(0)}) and drag for efficient flight.`;
      }
    }

    case "stol_hauler": {
      // Emphasize high clMax, soft stall, good stallAlpha
      if (clMax > 1.8 && stallSoftness > 0.6) {
        return `${qualityPrefix} high lift (Cl=${clMax.toFixed(2)}) with soft stall at ${stallAlpha.toFixed(1)}° for STOL.`;
      } else if (clMax > 1.8) {
        return `${qualityPrefix} very high lift (Cl=${clMax.toFixed(2)}) enables short takeoff performance.`;
      } else if (stallSoftness > 0.6) {
        return `${qualityPrefix} soft stall characteristics with good lift for bush operations.`;
      } else {
        return `${qualityPrefix} high lift (Cl=${clMax.toFixed(2)}) suitable for short-field operations.`;
      }
    }

    case "trainer_ga": {
      // Emphasize balanced ldMax and gentle stall
      if (stallSoftness > 0.5 && ldMax > 50) {
        return `${qualityPrefix} gentle stall behavior with good efficiency (L/D=${ldMax.toFixed(0)}) for training.`;
      } else if (stallSoftness > 0.5) {
        return `${qualityPrefix} forgiving stall characteristics ideal for student pilots.`;
      } else if (ldMax > 50) {
        return `${qualityPrefix} efficient L/D (${ldMax.toFixed(0)}) with stable handling for GA.`;
      } else {
        return `${qualityPrefix} balanced performance with predictable stall at ${stallAlpha.toFixed(1)}°.`;
      }
    }

    case "aerobatic_symmetric": {
      // Emphasize symmetry / stable cmRange
      if (cmRange < 0.1) {
        return `${qualityPrefix} stable pitching moment (Cm range ${cmRange.toFixed(3)}) for predictable aerobatics.`;
      } else if (stallSoftness > 0.4) {
        return `${qualityPrefix} moderate lift (Cl=${clMax.toFixed(2)}) with controlled stall for aerobatic flight.`;
      } else {
        return `${qualityPrefix} balanced lift and pitching moment suitable for aerobatic maneuvers.`;
      }
    }

    case "micro_uav_lowre": {
      // Emphasize good lift and L/D at low Re
      if (clMax > 1.2 && ldMax > 40) {
        return `${qualityPrefix} strong lift (Cl=${clMax.toFixed(2)}) and L/D (${ldMax.toFixed(0)}) at low Reynolds.`;
      } else if (clMax > 1.2) {
        return `${qualityPrefix} high lift (Cl=${clMax.toFixed(2)}) maintains performance at very low Re.`;
      } else if (ldMax > 40) {
        return `${qualityPrefix} good L/D (${ldMax.toFixed(0)}) efficiency for small-scale UAVs.`;
      } else {
        return `${qualityPrefix} suitable lift characteristics for micro UAV applications.`;
      }
    }

    case "wind_turbine": {
      // Emphasize strong lift with reasonable drag
      if (clMax > 1.5 && cdMin < 0.02) {
        return `${qualityPrefix} strong lift (Cl=${clMax.toFixed(2)}) with reasonable drag for energy extraction.`;
      } else if (clMax > 1.5) {
        return `${qualityPrefix} high lift (Cl=${clMax.toFixed(2)}) maximizes power generation.`;
      } else {
        return `${qualityPrefix} balanced lift and drag suitable for wind turbine blades.`;
      }
    }

    case "transport_supercrit": {
      // Emphasize low drag and stable pitching moment
      if (cdMin < 0.01 && cmRange < 0.1) {
        return `${qualityPrefix} low drag (Cd≈${cdMin.toFixed(4)}) with stable Cm for efficient cruise.`;
      } else if (cdMin < 0.01) {
        return `${qualityPrefix} very low drag (Cd≈${cdMin.toFixed(4)}) minimizes fuel consumption.`;
      } else if (cmRange < 0.1) {
        return `${qualityPrefix} stable pitching moment (Cm range ${cmRange.toFixed(3)}) ensures smooth cruise.`;
      } else {
        return `${qualityPrefix} efficient L/D (${ldMax.toFixed(0)}) with low drag for transport.`;
      }
    }

    default:
      return `${qualityPrefix} performance characteristics suitable for this mission.`;
  }
}

/**
 * Score an airfoil for a specific mission using engineering metrics
 * Note: reason will be set later with rankIndex in recommendWithLocalScoring
 */
function scoreAirfoilForMission(
  a: AirfoilWithMetrics,
  missionId: MissionId
): AirfoilRecommendation {
  // Normalization helpers (avoid NaNs)
  const clMax = a.clMax ?? 0;
  const ldMax = a.ldMax ?? 0;
  const cdMin = a.cdMin ?? 1;
  const stallSoftness = a.stallSoftness ?? 0;
  const stallAlpha = a.stallAlpha ?? a.alphaAtClMax ?? 0;
  const cmRange = a.cmRange ?? 0;

  // These weights are rough and can be tuned later.
  let score = 0;

  switch (missionId) {
    case "trainer_ga": {
      // High Clmax, soft stall, stable Cm
      score =
        0.35 * normalize(clMax, 0.5, 2.0) +
        0.35 * normalize(stallSoftness, 0, 1) +
        0.20 * normalize(stallAlpha, 8, 18) +
        0.10 * (1 - normalize(cmRange, 0, 0.2));
      break;
    }

    case "stol_hauler": {
      // Very high Clmax and stall angle, plus soft stall
      score =
        0.45 * normalize(clMax, 0.8, 3.0) +
        0.35 * normalize(stallAlpha, 10, 20) +
        0.20 * normalize(stallSoftness, 0, 1);
      break;
    }

    case "uav_endurance": {
      // Best L/D and low Cd, moderate Cl
      score =
        0.45 * normalize(ldMax, 20, 200) +
        0.30 * (1 - normalize(cdMin, 0.004, 0.03)) +
        0.25 * normalize(clMax, 0.6, 1.8);
      break;
    }

    case "racer_highspeed": {
      // Low Cd and decent Cl at high Re
      score =
        0.55 * (1 - normalize(cdMin, 0.004, 0.03)) +
        0.25 * normalize(ldMax, 20, 150) +
        0.20 * normalize(clMax, 0.6, 1.6);
      break;
    }

    case "aerobatic_symmetric": {
      // We can't fully detect symmetry here, but we can look for moderate Cl and stable Cm.
      score =
        0.40 * normalize(clMax, 0.6, 1.6) +
        0.30 * (1 - normalize(cmRange, 0, 0.2)) +
        0.30 * normalize(stallSoftness, 0, 1);
      break;
    }

    case "glider_sailplane": {
      score =
        0.60 * normalize(ldMax, 30, 250) +
        0.25 * (1 - normalize(cdMin, 0.004, 0.02)) +
        0.15 * normalize(clMax, 0.6, 1.8);
      break;
    }

    case "wind_turbine": {
      // Higher Cl and acceptable Cd
      score =
        0.5 * normalize(clMax, 0.8, 3.0) +
        0.3 * (1 - normalize(cdMin, 0.004, 0.03)) +
        0.2 * normalize(stallAlpha, 8, 18);
      break;
    }

    case "transport_supercrit": {
      score =
        0.50 * (1 - normalize(cdMin, 0.004, 0.03)) +
        0.30 * normalize(ldMax, 20, 150) +
        0.20 * (1 - normalize(cmRange, 0, 0.2));
      break;
    }

    case "micro_uav_lowre": {
      score =
        0.5 * normalize(clMax, 0.8, 3.0) +
        0.3 * normalize(ldMax, 15, 150) +
        0.2 * normalize(stallSoftness, 0, 1);
      break;
    }
  }

  // Clamp between 0 and 1
  const clampedScore = Math.max(0, Math.min(1, score || 0));

  // Reason will be set later with rankIndex
  return {
    airfoilId: a.airfoilId,
    score: clampedScore,
    reason: "", // Will be set in recommendWithLocalScoring
  };
}

/**
 * Describe a mission for Gemini prompts
 */
function describeMission(missionId: MissionId): string {
  switch (missionId) {
    case "trainer_ga":
      return "Trainer/GA: stable Cessna-like aircraft with forgiving stall and predictable handling.";
    case "stol_hauler":
      return "STOL/Bush: short takeoff and landing aircraft operating from rough strips, needs very high lift and soft stall.";
    case "uav_endurance":
      return "UAV Endurance: long-duration fixed-wing UAV with the best lift-to-drag ratio at mission Reynolds.";
    case "racer_highspeed":
      return "High-Speed Racer: low drag at higher speeds, good efficiency at higher Reynolds.";
    case "aerobatic_symmetric":
      return "Aerobatic/Symmetric: profiles suitable for aerobatics and inverted flight with predictable pitching moments.";
    case "glider_sailplane":
      return "Glider/Sailplane: maximum glide ratio and very low drag for soaring.";
    case "wind_turbine":
      return "Wind Turbine: blade sections that provide strong lift and reasonable drag for energy extraction.";
    case "transport_supercrit":
      return "Transport/Supercritical: transport wing sections that emphasize low drag and stable pitching moment in cruise.";
    case "micro_uav_lowre":
      return "Micro UAV Low Re: very small UAVs operating at low Reynolds numbers with strong lift and decent efficiency.";
    default:
      return "General mission.";
  }
}

/**
 * Safely parse JSON from Gemini response
 * Handles cases where Gemini adds extra text around the JSON or wraps it in markdown code blocks
 * Safety: All parsing attempts are wrapped in try-catch to prevent crashes
 * Never throws - always returns null on failure
 */
function safeParseGeminiJson(raw: string | null | undefined): { items?: any[] } | null {
  if (!raw || typeof raw !== "string") return null;

  // Helper to normalize parsed result (map 'id' to 'airfoilId' if needed)
  const normalizeResult = (obj: any): { items?: any[] } | null => {
    try {
      if (!obj || typeof obj !== "object") return null;
      
      // If items array exists, normalize each item
      if (Array.isArray(obj.items)) {
        obj.items = obj.items.map((item: any) => {
          if (item && typeof item === "object") {
            // Map 'id' to 'airfoilId' if airfoilId is missing
            if (!item.airfoilId && item.id) {
              item.airfoilId = item.id;
            }
          }
          return item;
        });
        return obj;
      }
      
      // If the object itself is an array, wrap it
      if (Array.isArray(obj)) {
        const normalized = obj.map((item: any) => {
          if (item && typeof item === "object" && !item.airfoilId && item.id) {
            item.airfoilId = item.id;
          }
          return item;
        });
        return { items: normalized };
      }
      
      return null;
    } catch {
      return null;
    }
  };

  // Helper to safely parse a string
  const safeParse = (str: string): any => {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  };

  // 1. Try direct parse first
  const directParsed = safeParse(raw);
  if (directParsed) {
    const result = normalizeResult(directParsed);
    if (result?.items?.length) return result;
  }

  // 2. Try to extract JSON from markdown code blocks (```json ... ```)
  try {
    const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch?.[1]) {
      const parsed = safeParse(codeBlockMatch[1].trim());
      if (parsed) {
        const result = normalizeResult(parsed);
        if (result?.items?.length) return result;
      }
    }
  } catch {
    // Continue to next attempt
  }

  // 3. Find ALL {...} blocks and pick the largest one (most likely the full response)
  try {
    const jsonBlocks: string[] = [];
    let depth = 0;
    let startIdx = -1;
    
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] === "{") {
        if (depth === 0) startIdx = i;
        depth++;
      } else if (raw[i] === "}") {
        depth--;
        if (depth === 0 && startIdx !== -1) {
          jsonBlocks.push(raw.slice(startIdx, i + 1));
          startIdx = -1;
        }
      }
    }

    // Sort by length descending and try each
    jsonBlocks.sort((a, b) => b.length - a.length);
    
    for (const block of jsonBlocks) {
      const parsed = safeParse(block);
      if (parsed) {
        const result = normalizeResult(parsed);
        if (result?.items?.length) return result;
      }
    }
  } catch {
    // Continue to regex fallback
  }

  // 4. Last resort: simple regex extraction
  try {
    const simpleMatch = raw.match(/\{[\s\S]*\}/);
    if (simpleMatch?.[0]) {
      const parsed = safeParse(simpleMatch[0]);
      if (parsed) {
        const result = normalizeResult(parsed);
        if (result?.items?.length) return result;
      }
    }
  } catch {
    // Silently fail
  }

  return null;
}

/**
 * AI-based recommendation using Gemini
 * Falls back to engineering mode if Gemini call fails
 */
async function recommendWithGemini(
  missionId: MissionId
): Promise<RecommendationResult | null> {
  try {
    // Determine the mission's target Reynolds
    const targetRe = getTargetReForMission(missionId);

    // Get metrics for all airfoils at the chosen Re
    const airfoils = await getAllAirfoilsWithMetricsForRe(targetRe);

    if (airfoils.length === 0) {
      console.warn("[AI recommendWithGemini] No airfoils with metrics found");
      return null;
    }

    // Build a compact JSON-like summary of the available metrics for Gemini
    const airfoilSummaries = airfoils.map(a => ({
      id: a.airfoilId,
      name: a.name ?? a.airfoilId,
      clMax: a.clMax,
      cdMin: a.cdMin,
      ldMax: a.ldMax,
      stallAlpha: a.stallAlpha,
      stallSoftness: a.stallSoftness,
      cmRange: a.cmRange,
    }));

    const missionDescription = describeMission(missionId);

    // Construct a strict prompt asking Gemini to return ONLY JSON
    const prompt = `You are an aerospace aerodynamics assistant.

Given the following list of airfoils and their metrics, rank them for this mission:

MISSION:
${missionDescription}

AIRFOIL METRICS (JSON):
${JSON.stringify(airfoilSummaries, null, 2)}

Please return ONLY a JSON object in this exact shape:

{
  "items": [
    { "airfoilId": "<id from the list above>", "score": 0.0-1.0, "reason": "short one-line explanation" },
    ...
  ]
}

Rules:
- Use only airfoilId values that exist in the provided list.
- score should be between 0 and 1 (higher = better for this mission).
- Provide at most 5 items.
- reason must be short (max ~120 characters).
No extra text, no commentary, only the JSON object.`;

    // Call Gemini via the wrapper
    const raw = await callGeminiJSON(prompt);
    const parsed = safeParseGeminiJson(raw);

    if (!parsed || !Array.isArray(parsed.items)) {
      console.warn("[AI recommendWithGemini] Parsed JSON has no items, falling back.");
      return null;
    }

    // Create a map of airfoilId -> metrics for building engineering reasons when needed
    const metricsMap = new Map<string, AirfoilPolarMetrics>();
    airfoils.forEach(a => {
      metricsMap.set(a.airfoilId, a);
    });

    // Validate, map to AirfoilRecommendation[]
    const validIds = new Set(airfoils.map(a => a.airfoilId));
    const items: AirfoilRecommendation[] = parsed.items
      .filter((item: any) => item && typeof item.airfoilId === "string" && validIds.has(item.airfoilId))
      .map((item: any, index: number) => {
        const airfoilId = item.airfoilId;
        const score = typeof item.score === "number" && isFinite(item.score)
          ? Math.max(0, Math.min(1, item.score))
          : 0.5;
        
        // If AI provided a non-empty reason, keep it
        let reason = typeof item.reason === "string" && item.reason.trim()
          ? item.reason.trim()
          : null;
        
        // If reason is empty or missing, generate engineering reason
        if (!reason) {
          const metrics = metricsMap.get(airfoilId);
          if (metrics) {
            reason = buildEngineeringReason(missionId, metrics, score, index);
          } else {
            reason = `Recommended for mission ${missionId}.`;
          }
        }
        
        return {
          airfoilId,
          score,
          reason,
        };
      })
      .slice(0, 5);

    if (items.length === 0) {
      console.warn("[AI recommendWithGemini] No valid items after filtering, falling back.");
      return null;
    }

    return {
      missionId,
      mode: "ai",
      items,
    };
  } catch (err) {
    console.error("[AI recommendWithGemini] Gemini call failed:", err);
    return null;
  }
}

/**
 * Local scoring-based recommendation (Engineering mode)
 * Uses real polar data metrics for scoring
 */
async function recommendWithLocalScoring(
  missionId: MissionId,
  mode: RecommendationMode
): Promise<RecommendationResult> {
  const targetRe = getTargetReForMission(missionId);
  const airfoils = await getAllAirfoilsWithMetricsForRe(targetRe);

  // Create a map of airfoilId -> metrics for building reasons
  const metricsMap = new Map<string, AirfoilPolarMetrics>();
  airfoils.forEach(a => {
    metricsMap.set(a.airfoilId, a);
  });

  const scored: AirfoilRecommendation[] = airfoils.map((a) =>
    scoreAirfoilForMission(a, missionId)
  );

  const items = scored
    .filter((x) => x.score > 0) // drop completely invalid ones
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((rec, rankIndex) => {
      // Build per-airfoil reason based on metrics and rank
      const metrics = metricsMap.get(rec.airfoilId);
      if (metrics) {
        rec.reason = buildEngineeringReason(missionId, metrics, rec.score, rankIndex);
      } else {
        // Fallback if metrics not found (shouldn't happen)
        rec.reason = `Recommended for ${missionId}.`;
      }
      return rec;
    });

  return {
    missionId,
    mode,
    items,
  };
}

