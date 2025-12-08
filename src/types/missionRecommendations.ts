export type MissionId =
  | "trainer_ga"
  | "stol_hauler"
  | "uav_endurance"
  | "racer_highspeed"
  | "aerobatic_symmetric"
  | "glider_sailplane"
  | "wind_turbine"
  | "transport_supercrit"
  | "micro_uav_lowre";

export type RecommendationMode = "ai" | "engineering";

export interface AirfoilRecommendation {
  airfoilId: string;
  score: number; // normalized 0..1 if possible
  reason: string; // short 1-line explanation
}

export interface RecommendationResult {
  missionId: MissionId;
  mode: RecommendationMode;
  items: AirfoilRecommendation[];
  smartAiError?: SmartAiError;
}

export type SmartAiErrorReason = "AI_DISABLED" | "NETWORK_ERROR" | "BAD_RESPONSE";

export interface SmartAiError {
  reason: SmartAiErrorReason;
  detail?: string;
}

export type SmartAiResult =
  | { ok: true; recommendations: RecommendationResult }
  | { ok: false; reason: SmartAiErrorReason; detail?: string };

