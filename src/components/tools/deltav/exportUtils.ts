import { MissionParameters, Stage, MissionResult } from "./types";

export interface ExportData {
  version: string;
  timestamp: number;
  mission: MissionParameters;
  stages: Stage[];
  result?: MissionResult;
}

/**
 * Export mission configuration and results to JSON
 */
export const exportToJSON = (
  mission: MissionParameters,
  stages: Stage[],
  result?: MissionResult
): string => {
  const exportData: ExportData = {
    version: "1.0",
    timestamp: Date.now(),
    mission,
    stages,
    result,
  };
  return JSON.stringify(exportData, null, 2);
};

/**
 * Import mission configuration from JSON
 */
export const importFromJSON = (jsonString: string): {
  mission: MissionParameters | null;
  stages: Stage[] | null;
  error?: string;
} => {
  try {
    const data: ExportData = JSON.parse(jsonString);
    
    if (!data.mission || !data.stages) {
      return {
        mission: null,
        stages: null,
        error: "Invalid export format: missing mission or stages",
      };
    }

    return {
      mission: data.mission,
      stages: data.stages,
    };
  } catch (error) {
    return {
      mission: null,
      stages: null,
      error: `Failed to parse JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
};

/**
 * Download JSON as file
 */
export const downloadJSON = (jsonString: string, filename: string = "deltav-mission.json"): void => {
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Read JSON from file
 */
export const readJSONFromFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === "string") {
        resolve(e.target.result);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = () => reject(new Error("File read error"));
    reader.readAsText(file);
  });
};

