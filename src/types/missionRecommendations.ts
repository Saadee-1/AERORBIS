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
}

