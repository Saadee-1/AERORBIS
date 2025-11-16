export interface Material {
  name: string;
  category: string;
  density: number; // always stored in SI (kg/m³)
  description: string;
}

export type UnitSystem = "SI" | "Imperial";

