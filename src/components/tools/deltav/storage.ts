import { MissionParameters, Stage } from "./types";

const STORAGE_KEY_PRESETS = "deltav_presets";
const STORAGE_KEY_LAST_MISSION = "deltav_last_mission";
const STORAGE_KEY_LAST_STAGES = "deltav_last_stages";

export interface SavedPreset {
  name: string;
  mission: MissionParameters;
  stages: Stage[];
  timestamp: number;
}

/**
 * Save a custom preset
 */
export const savePreset = (name: string, mission: MissionParameters, stages: Stage[]): void => {
  try {
    const presets = loadPresets();
    const newPreset: SavedPreset = {
      name,
      mission,
      stages,
      timestamp: Date.now(),
    };
    presets.push(newPreset);
    localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(presets));
  } catch (error) {
    console.error("Failed to save preset:", error);
  }
};

/**
 * Load all saved presets
 */
export const loadPresets = (): SavedPreset[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PRESETS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load presets:", error);
  }
  return [];
};

/**
 * Delete a preset by name
 */
export const deletePreset = (name: string): void => {
  try {
    const presets = loadPresets();
    const filtered = presets.filter((p) => p.name !== name);
    localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to delete preset:", error);
  }
};

/**
 * Save last mission configuration
 */
export const saveLastMission = (mission: MissionParameters, stages: Stage[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_LAST_MISSION, JSON.stringify(mission));
    localStorage.setItem(STORAGE_KEY_LAST_STAGES, JSON.stringify(stages));
  } catch (error) {
    console.error("Failed to save last mission:", error);
  }
};

/**
 * Load last mission configuration
 */
export const loadLastMission = (): {
  mission: MissionParameters | null;
  stages: Stage[] | null;
} => {
  try {
    const missionStr = localStorage.getItem(STORAGE_KEY_LAST_MISSION);
    const stagesStr = localStorage.getItem(STORAGE_KEY_LAST_STAGES);
    
    if (missionStr && stagesStr) {
      return {
        mission: JSON.parse(missionStr),
        stages: JSON.parse(stagesStr),
      };
    }
  } catch (error) {
    console.error("Failed to load last mission:", error);
  }
  return { mission: null, stages: null };
};

