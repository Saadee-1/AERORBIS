"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useCalculationAnimation } from "@/hooks/useCalculationAnimation";
import { CalculationOverlay } from "@/components/common/CalculationOverlay";
import { motion } from "framer-motion";
import { Material, UnitSystem } from "./types";
import MaterialTable from "./MaterialTable";
import MaterialDetailsDrawer from "./MaterialDetailsDrawer";
import AddMaterialDialog from "./AddMaterialDialog";
import DensityChart from "./DensityChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Database, Search, Filter, Plus, Settings2 } from "lucide-react";
import { useToolContext } from "@/hooks/useToolContext";
import type { AeroverseAIPayload } from "@/ai/schema/AerorbisPayload";
import { buildCalculationEvent } from "@/lib/events/payloadBuilder";
import { buildMaterialsPayload } from "./materials/payloadBuilder";

// Full Aerospace Materials Database
const MATERIALS: Material[] = [
  { "name": "Aluminum 2024-T3", "category": "Metal", "density": 2780, "description": "High strength aircraft aluminum alloy used in fuselage skins" },
  { "name": "Aluminum 6061-T6", "category": "Metal", "density": 2700, "description": "General-purpose alloy used in spacecraft structures and machining" },
  { "name": "Aluminum 7075-T6", "category": "Metal", "density": 2810, "description": "Very high strength alloy for wing spars and landing gear" },
  { "name": "Titanium Ti-6Al-4V", "category": "Metal", "density": 4430, "description": "Primary aerospace titanium alloy used in jet engines and spacecraft" },
  { "name": "Titanium CP Grade 2", "category": "Metal", "density": 4500, "description": "Commercially pure titanium, corrosion resistant" },
  { "name": "Stainless Steel 304", "category": "Metal", "density": 8000, "description": "Common stainless steel, corrosion resistant" },
  { "name": "Stainless Steel 316", "category": "Metal", "density": 8000, "description": "Marine-grade aerospace structural steel" },
  { "name": "Maraging Steel 250", "category": "Metal", "density": 8100, "description": "Ultra-high strength steel for rocket motor casings" },
  { "name": "Inconel 718", "category": "Superalloy", "density": 8190, "description": "High-temperature nickel alloy used in jet engines and turbines" },
  { "name": "Inconel 625", "category": "Superalloy", "density": 8440, "description": "Heat-resistant alloy for exhaust systems" },
  { "name": "Hastelloy X", "category": "Superalloy", "density": 8800, "description": "Used in aerospace combustion chambers" },
  { "name": "Carbon Fiber (CFRP - Unidirectional)", "category": "Composite", "density": 1550, "description": "Primary composite for aircraft wings and fuselage" },
  { "name": "Carbon Fiber (Woven Fabric)", "category": "Composite", "density": 1650, "description": "High stiffness fabric used in aircraft control surfaces" },
  { "name": "Carbon Fiber (High Modulus)", "category": "Composite", "density": 1800, "description": "Used in satellites and high-performance UAVs" },
  { "name": "Fiberglass (GFRP)", "category": "Composite", "density": 1850, "description": "Used in fairings, radomes, UAV bodies" },
  { "name": "Kevlar (Aramid Fiber)", "category": "Composite", "density": 1440, "description": "Impact-resistant composite used in radomes and armor" },
  { "name": "Aluminum Honeycomb Core", "category": "Composite", "density": 50, "description": "Aircraft floor panels, fairings" },
  { "name": "Nomex Honeycomb Core", "category": "Composite", "density": 48, "description": "Fireproof lightweight core for aerospace panels" },
  { "name": "ABS Plastic", "category": "Polymer", "density": 1050, "description": "Common polymer used in housings and interior components" },
  { "name": "Polycarbonate", "category": "Polymer", "density": 1200, "description": "Impact-resistant transparent polymer" },
  { "name": "Nylon (PA6)", "category": "Polymer", "density": 1150, "description": "Engineering plastic for gears and bushings" },
  { "name": "PEEK (Aerospace Grade)", "category": "Polymer", "density": 1320, "description": "High-strength polymer for high-temperature components" },
  { "name": "Polyurethane Foam", "category": "Foam", "density": 40, "description": "Used in UAV wings, insulation" },
  { "name": "EPS Foam", "category": "Foam", "density": 20, "description": "Lightweight insulation foam" },
  { "name": "Rohacell Foam", "category": "Foam", "density": 52, "description": "Aerospace-grade core material for CFRP sandwich structures" },
  { "name": "Silica Tile (Space Shuttle)", "category": "Ceramic", "density": 144, "description": "Thermal Protection System for re-entry vehicles" },
  { "name": "Zirconia Ceramic", "category": "Ceramic", "density": 5600, "description": "Used in high-temperature insulation" },
  { "name": "Water", "category": "Fluid", "density": 1000, "description": "Standard fluid reference" },
  { "name": "Jet A Fuel", "category": "Fluid", "density": 804, "description": "Standard aviation fuel" },
  { "name": "RP-1 (Rocket Kerosene)", "category": "Fluid", "density": 810, "description": "Fuel used in Falcon 9, Soyuz, Saturn I" },
  { "name": "Liquid Oxygen (LOX)", "category": "Fluid", "density": 1141, "description": "Rocket oxidizer" },
  { "name": "Liquid Hydrogen (LH2)", "category": "Fluid", "density": 70, "description": "Cryogenic rocket fuel" },
  { "name": "Balsa Wood", "category": "Wood", "density": 160, "description": "Very lightweight material used in RC aircraft" },
  { "name": "Spruce Wood", "category": "Wood", "density": 400, "description": "Used in vintage wooden aircraft frames" },
  { "name": "Magnesium Alloy", "category": "Metal", "density": 1800, "description": "Extremely lightweight alloy for aerospace usage" },
  { "name": "Copper", "category": "Metal", "density": 8960, "description": "Used in electrical systems and cooling channels" },
  { "name": "Brass", "category": "Metal", "density": 8500, "description": "Common engineering metal" }
];

const CATEGORIES = [
  "All",
  "Metal",
  "Superalloy",
  "Composite",
  "Polymer",
  "Foam",
  "Ceramic",
  "Fluid",
  "Wood",
  "Other",
];

const MaterialsDatabase = () => {
  const { updateToolContext, sendCalculationEvent } = useToolContext();
  const [materials, setMaterials] = useState<Material[]>(MATERIALS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [customUnitName, setCustomUnitName] = useState("Unit-ρ");
  const [customFactor, setCustomFactor] = useState("1.0");
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  const [lastPayload, setLastPayload] = useState<AeroverseAIPayload | null>(null);

  const getLatestStoredRequestId = useCallback((): string | null => {
    try {
      const storedKeys = Object.keys(localStorage).filter((key) => key.startsWith("calc-"));
      if (storedKeys.length === 0) return null;
      const latestKey = storedKeys.sort().reverse()[0];
      return latestKey.replace("calc-", "");
    } catch (error) {
      console.warn("Unable to read stored calculation IDs:", error);
      return null;
    }
  }, []);

  const applyToolPayload = useCallback(
    async (payload: AeroverseAIPayload) => {
      setLastPayload(payload);

      updateToolContext({
        tool: "Materials Density Database",
        inputs: payload.inputs,
        results: payload.results,
      });

      const eventPayload = buildCalculationEvent({
        toolId: "materials-density-database",
        toolName: payload.toolName,
        inputs: payload.inputs,
        results: payload.results,
        steps: payload.metadata.steps,
        metadata: {
          units: payload.metadata.unitsSystem,
          approxLevel: payload.metadata.approxLevel,
          confidence: payload.metadata.confidence,
          warnings: payload.metadata.warnings,
        },
      });

      try {
        const eventResponse = await sendCalculationEvent(eventPayload);
        const requestId = eventResponse?.requestId ?? getLatestStoredRequestId();
        setLastRequestId(requestId);
        return requestId;
      } catch (error) {
        console.warn("Failed to send calculation event:", error);
        const fallbackId = getLatestStoredRequestId();
        setLastRequestId(fallbackId);
        return fallbackId;
      }
    },
    [getLatestStoredRequestId, sendCalculationEvent, updateToolContext]
  );

  // Load custom materials from localStorage on mount
  useEffect(() => {
    const storedCustom = localStorage.getItem("materialsDatabase_customMaterials");
    if (storedCustom) {
      try {
        const customMaterials: Material[] = JSON.parse(storedCustom);
        setMaterials([...MATERIALS, ...customMaterials]);
      } catch (e) {
        console.warn("Failed to load custom materials from localStorage");
      }
    }

    const storedUnitSystem = localStorage.getItem("materialsDatabase_unitSystem");
    if (storedUnitSystem) {
      setUnitSystem(storedUnitSystem as UnitSystem);
    }
    const storedCustomUnitName = localStorage.getItem("materialsDatabase_customUnitName");
    if (storedCustomUnitName) {
      setCustomUnitName(storedCustomUnitName);
    }
    const storedCustomFactor = localStorage.getItem("materialsDatabase_customFactor");
    if (storedCustomFactor) {
      setCustomFactor(storedCustomFactor);
    }
  }, []);

  // Save custom materials to localStorage
  useEffect(() => {
    const customMaterials = materials.filter(
      (m) => !MATERIALS.some((base) => base.name === m.name)
    );
    if (customMaterials.length > 0) {
      localStorage.setItem("materialsDatabase_customMaterials", JSON.stringify(customMaterials));
    }
  }, [materials]);

  // Save unit system to localStorage
  useEffect(() => {
    localStorage.setItem("materialsDatabase_unitSystem", unitSystem);
  }, [unitSystem]);

  useEffect(() => {
    if (unitSystem === "Custom") {
      localStorage.setItem("materialsDatabase_customUnitName", customUnitName);
      localStorage.setItem("materialsDatabase_customFactor", customFactor);
    }
  }, [unitSystem, customUnitName, customFactor]);

  // Filter materials based on search and category
  const filteredMaterials = useMemo(() => {
    return materials.filter((material) => {
      const matchesSearch =
        material.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        material.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "All" || material.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [materials, searchQuery, selectedCategory]);

  // Get unique categories from materials
  const availableCategories = useMemo(() => {
    const cats = new Set(materials.map((m) => m.category));
    return Array.from(cats).sort();
  }, [materials]);

  const convertDensityToCustom = (densitySI: number): number => {
    const factor = parseFloat(customFactor);
    if (!isNaN(factor) && factor > 0) {
      return densitySI / factor;
    }
    return densitySI;
  };

  const handleMaterialClick = (material: Material) => {
    setSelectedMaterial(material);
    setIsDrawerOpen(true);

    const densitySI = material.density;
    const densityImperial = densitySI * 0.062428;
    const densityCustom =
      unitSystem === "Custom" ? convertDensityToCustom(densitySI) : undefined;

    const payload = buildMaterialsPayload({
      material,
      unitSystem,
      densitySI,
      densityImperial,
      densityCustom,
      customUnitName,
      searchQuery,
      selectedCategory,
      totalCount: materials.length,
      filteredCount: filteredMaterials.length,
    });

    void applyToolPayload(payload);
  };

  const handleAddMaterial = (material: Material) => {
    // Check for duplicates and append "(Custom)" if needed
    let materialName = material.name;
    let counter = 1;
    while (materials.some((m) => m.name === materialName)) {
      materialName = `${material.name} (Custom ${counter})`;
      counter++;
    }

    const newMaterial: Material = {
      ...material,
      name: materialName,
    };

    setMaterials([...materials, newMaterial]);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Database className="w-12 h-12 text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
          <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Aerospace Materials Density Database
          </h2>
        </div>
        <p className="text-gray-300 text-lg max-w-3xl mx-auto">
          Comprehensive database of aerospace materials with density properties. Search, filter, and compare materials.
        </p>
        <div className="flex justify-center gap-2 mt-4">
          <Select value={unitSystem} onValueChange={(v) => setUnitSystem(v as UnitSystem)}>
            <SelectTrigger className="w-32 bg-slate-900/50 border-cyan-400/30 text-cyan-400">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SI">SI (kg/m³)</SelectItem>
              <SelectItem value="Imperial">Imperial (lb/ft³)</SelectItem>
              <SelectItem value="Custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid md:grid-cols-3 gap-4"
      >
        <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl md:col-span-2">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cyan-400" />
              <Input
                type="search"
                placeholder="Search materials by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-900/50 border-cyan-400/30 text-white"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-cyan-400" />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="bg-slate-900/50 border-cyan-400/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter((cat) => cat === "All" || availableCategories.includes(cat)).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Custom Units Card */}
        {unitSystem === "Custom" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-cyan-400" />
                  Custom Unit Definitions
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Define conversion factor to SI (kg/m³)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-slate-900/50 rounded-lg border border-cyan-400/10">
                  <Label className="text-white font-semibold">Density (ρ)</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Input 
                      placeholder="Unit Name" 
                      value={customUnitName}
                      onChange={(e) => setCustomUnitName(e.target.value)}
                      className="bg-slate-800 border-cyan-400/30 text-white"
                    />
                    <Input 
                      type="number"
                      step="0.0001"
                      placeholder="SI Factor"
                      value={customFactor}
                      onChange={(e) => setCustomFactor(e.target.value)}
                      className="bg-slate-800 border-cyan-400/30 text-white"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">
                    1 {customUnitName || "Unit"} = {customFactor || "..."} kg/m³
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>

      {/* Add Material Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex justify-end"
      >
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-900 font-semibold"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Custom Material
        </Button>
      </motion.div>

      {/* Stats Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-cyan-400 mb-2">{materials.length}</p>
                <p className="text-gray-400 text-sm">Total Materials</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-400 mb-2">{filteredMaterials.length}</p>
                <p className="text-gray-400 text-sm">Filtered Results</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-cyan-400 mb-2">{availableCategories.length}</p>
                <p className="text-gray-400 text-sm">Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Table and Chart Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Materials Table */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-cyan-400" />
                Materials Database
              </CardTitle>
              <CardDescription className="text-gray-400">
                Click on any material to view detailed information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MaterialTable
                materials={filteredMaterials}
                unitSystem={unitSystem}
                customUnitName={customUnitName}
                customFactor={customFactor}
                onMaterialClick={handleMaterialClick}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Density Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <DensityChart materials={filteredMaterials} unitSystem={unitSystem} />
        </motion.div>
      </div>

      {/* Material Details Drawer */}
        <MaterialDetailsDrawer
          material={selectedMaterial}
          unitSystem={unitSystem}
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          requestId={lastRequestId}
          payload={lastPayload}
        />

      {/* Add Material Dialog */}
      <AddMaterialDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAdd={handleAddMaterial}
        existingMaterials={materials}
      />
    </div>
  );
};

export default MaterialsDatabase;

