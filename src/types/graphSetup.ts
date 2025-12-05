export type GraphMode =
  | "ld"
  | "cl"
  | "cd"
  | "cm"
  | "dragPolar";

export interface SavedSetup {
  id: string; // unique id (uuid or timestamp-based)
  name: string; // user label: "Racer vs Trainer"
  createdAt: number; // timestamp
  baseAirfoilId: string;
  comparedAirfoilIds: string[]; // max 5
  reynolds: number;
  mode: GraphMode;
  // scope: which calculator / page this belongs to
  calculatorId: string; // e.g. "launchpad"
  version: number; // for future migrations, start with 1
}

