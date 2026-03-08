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

import { ALL_MATERIALS, MATERIAL_CATEGORIES } from "./materials/materialsData";

const MATERIALS = ALL_MATERIALS;

const CATEGORIES = MATERIAL_CATEGORIES.map(c => c.id);

const MaterialsDatabase = () => {
  const { updateToolContext, sendCalculationEvent } = useToolContext();
  const { isCalculating, runCalculation } = useCalculationAnimation({ minDuration: 800 });
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
    runCalculation(() => {
      let materialName = material.name;
      let counter = 1;
      while (materials.some((m) => m.name === materialName)) {
        materialName = `${material.name} (Custom ${counter})`;
        counter++;
      }
      const newMaterial: Material = { ...material, name: materialName };
      setMaterials([...materials, newMaterial]);
    });
  };

  return (
    <>
    <CalculationOverlay isActive={isCalculating} label="Scanning Materials Database" />
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Database className="w-12 h-12 text-primary drop-shadow-[0_0_20px_hsl(var(--primary)/0.6)]" />
          <h2 className="text-4xl font-bold text-primary">
            Aerospace Materials Database
          </h2>
        </div>
        <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
          {materials.length}+ aerospace materials with density properties. Search, filter, and compare.
        </p>
        <div className="flex justify-center gap-2 mt-4">
          <Select value={unitSystem} onValueChange={(v) => setUnitSystem(v as UnitSystem)}>
            <SelectTrigger className="w-32 bg-card border-border text-foreground">
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

      {/* Search + Add */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="bg-card/50 backdrop-blur-lg border border-border rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary" />
                <Input
                  type="search"
                  placeholder="Search materials by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background border-border text-foreground"
                />
              </div>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-primary text-primary-foreground font-semibold shrink-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Custom
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Category Chips */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.15 }}
        className="flex flex-wrap gap-2"
      >
        {MATERIAL_CATEGORIES
          .filter((cat) => cat.id === "All" || availableCategories.includes(cat.id))
          .map((cat) => {
            const isActive = selectedCategory === cat.id;
            const count = cat.id === "All" ? materials.length : materials.filter(m => m.category === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                  isActive 
                    ? "bg-primary/20 border-primary/50 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.2)]" 
                    : "bg-card/50 border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                }`}
              >
                {cat.label} <span className="opacity-60">({count})</span>
              </button>
            );
          })}
      </motion.div>

      {/* Custom Units Card */}
      {unitSystem === "Custom" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="bg-card/50 backdrop-blur-lg border border-border rounded-2xl">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                Custom Unit Definitions
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Define conversion factor to SI (kg/m³)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-muted/30 rounded-lg border border-border">
                <Label className="text-foreground font-semibold">Density (ρ)</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Input 
                    placeholder="Unit Name" 
                    value={customUnitName}
                    onChange={(e) => setCustomUnitName(e.target.value)}
                    className="bg-background border-border text-foreground"
                  />
                  <Input 
                    type="number"
                    step="0.0001"
                    placeholder="SI Factor"
                    value={customFactor}
                    onChange={(e) => setCustomFactor(e.target.value)}
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  1 {customUnitName || "Unit"} = {customFactor || "..."} kg/m³
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats Row */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="bg-card/50 backdrop-blur-lg border border-border rounded-2xl">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-primary mb-1">{materials.length}</p>
                <p className="text-muted-foreground text-sm">Total Materials</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary mb-1">{filteredMaterials.length}</p>
                <p className="text-muted-foreground text-sm">Filtered Results</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary mb-1">{availableCategories.length}</p>
                <p className="text-muted-foreground text-sm">Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Table and Chart Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="space-y-4">
          <Card className="bg-card/50 backdrop-blur-lg border border-border rounded-2xl">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Materials Database
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Click any material for details · Sortable columns · 25 per page
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

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
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
    </>
  );
};

export default MaterialsDatabase;

