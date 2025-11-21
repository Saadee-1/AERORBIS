import { buildAeroversePayload } from "@/ai/buildPayload";
import type { AeroverseAIPayload } from "@/ai/schema/AeroversePayload";
import type { Material, UnitSystem } from "../types";

interface BuildMaterialsPayloadParams {
  material: Material;
  unitSystem: UnitSystem;
  densitySI: number;
  densityImperial: number;
  densityCustom?: number | null;
  customUnitName: string;
  searchQuery: string;
  selectedCategory: string;
  totalCount: number;
  filteredCount: number;
}

export function buildMaterialsPayload({
  material,
  unitSystem,
  densitySI,
  densityImperial,
  densityCustom,
  customUnitName,
  searchQuery,
  selectedCategory,
  totalCount,
  filteredCount,
}: BuildMaterialsPayloadParams): AeroverseAIPayload {
  const steps = [
    `Selected material: ${material.name} (${material.category})`,
    `Density (SI): ${densitySI.toFixed(0)} kg/m³`,
    `Density (Imperial): ${densityImperial.toFixed(2)} lb/ft³`,
    unitSystem === "Custom" && densityCustom !== undefined && densityCustom !== null
      ? `Density (${customUnitName}): ${densityCustom.toFixed(2)} ${customUnitName}`
      : null,
    `Search filters → query: "${searchQuery || "∅"}", category: ${selectedCategory}`,
    `Database stats: ${filteredCount} / ${totalCount} materials visible`,
  ].filter(Boolean) as string[];

  return buildAeroversePayload({
    toolName: "Materials Density Database",
    inputs: {
      material: {
        name: material.name,
        category: material.category,
        description: material.description,
      },
      unitSystem,
      searchQuery,
      selectedCategory,
      stats: {
        totalMaterials: totalCount,
        filteredMaterials: filteredCount,
      },
    },
    results: {
      densitySI_kg_m3: densitySI,
      densityImperial_lb_ft3: densityImperial,
      ...(unitSystem === "Custom" && densityCustom !== undefined && densityCustom !== null
        ? { [`densityCustom_${customUnitName}`]: densityCustom }
        : {}),
      description: material.description,
    },
    units: {
      densitySI_kg_m3: "kg/m³",
      densityImperial_lb_ft3: "lb/ft³",
      ...(unitSystem === "Custom"
        ? { [`densityCustom_${customUnitName}`]: customUnitName }
        : {}),
    },
    configuration: {
      unitSystem,
      customUnitName: unitSystem === "Custom" ? customUnitName : undefined,
      selectedCategory,
    },
    metadata: {
      steps,
      unitsSystem: unitSystem,
      approxLevel: "reference-data",
      confidence: "high",
      warnings: [],
    },
  });
}

