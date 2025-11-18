"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { MissionParameters, Stage, MissionResult } from "./types";
import {
  calculateDeltaVBreakdown,
  calculateStageResults,
  calculateTotalAchievableDeltaV,
  generateWarningsAndRecommendations,
} from "./calculations";
import { MISSION_PRESETS } from "./presets";
import { saveLastMission, loadLastMission, savePreset, loadPresets } from "./storage";
import StageEditor from "./StageEditor";
import DVBudgetTable from "./DVBudgetTable";
import DeltaVChart from "./DeltaVChart";
import MassBreakdownChart from "./MassBreakdownChart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Rocket,
  Settings2,
  Database,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useToolContext } from "@/hooks/useToolContext";
import { PDFExportButton } from "@/components/tools/PDFExportButton";
import { AskAIButton } from "@/components/tools/AskAIButton";
import { ToolWrapper } from "@/components/layout/ToolWrapper";
import { ToolHeader } from "@/components/layout/ToolHeader";
import { ToolSection } from "@/components/layout/ToolSection";
import { ToolActions } from "@/components/layout/ToolActions";
import { AeroCard } from "@/components/common/AeroCard";
import { AeroFormField } from "@/components/forms/AeroFormField";
import { AeroButton } from "@/components/common/AeroButton";
import { ChartCard } from "@/components/charts/ChartCard";
import { spacingVertical } from "@/styles/spacing";

type UnitSystem = "SI" | "Imperial" | "Custom";

const DeltaVPlanner = () => {
  const { toast } = useToast();
  const { updateToolContext, sendCalculationEvent } = useToolContext();
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [customUnitName, setCustomUnitName] = useState("Unit-Δv");
  const [customFactor, setCustomFactor] = useState("1.0");
  const [mission, setMission] = useState<MissionParameters>({
    targetOrbitAltitude: 200,
    orbitType: "LEO",
    targetInclination: 28.5,
    payloadMass: 250,
    gravityLoss: 1500,
    dragLoss: 200,
    steeringLoss: 200,
    reserveMargin: 10,
  });
  const [stages, setStages] = useState<Stage[]>([]);
  const [result, setResult] = useState<MissionResult | null>(null);
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState("");

  // Load last mission on mount
  useEffect(() => {
    const last = loadLastMission();
    if (last.mission && last.stages) {
      setMission(last.mission);
      setStages(last.stages);
    } else {
      // Load first preset as default
      if (MISSION_PRESETS.length > 0) {
        loadPreset(MISSION_PRESETS[0]);
      }
    }
    const storedUnitSystem = localStorage.getItem("deltavPlanner_unitSystem");
    if (storedUnitSystem) {
      setUnitSystem(storedUnitSystem as UnitSystem);
    }
    const storedCustomUnitName = localStorage.getItem("deltavPlanner_customUnitName");
    if (storedCustomUnitName) {
      setCustomUnitName(storedCustomUnitName);
    }
    const storedCustomFactor = localStorage.getItem("deltavPlanner_customFactor");
    if (storedCustomFactor) {
      setCustomFactor(storedCustomFactor);
    }
  }, []);

  // Save mission on change
  useEffect(() => {
    if (stages.length > 0) {
      saveLastMission(mission, stages);
    }
  }, [mission, stages]);

  useEffect(() => {
    localStorage.setItem("deltavPlanner_unitSystem", unitSystem);
  }, [unitSystem]);

  useEffect(() => {
    if (unitSystem === "Custom") {
      localStorage.setItem("deltavPlanner_customUnitName", customUnitName);
      localStorage.setItem("deltavPlanner_customFactor", customFactor);
    }
  }, [unitSystem, customUnitName, customFactor]);

  // Calculate results when mission or stages change
  const stageResults = useMemo(() => {
    if (stages.length === 0) return [];
    return calculateStageResults(stages, mission.payloadMass, 0);
  }, [stages, mission.payloadMass]);

  const totalAchievable = useMemo(() => {
    return calculateTotalAchievableDeltaV(stageResults);
  }, [stageResults]);

  const breakdown = useMemo(() => {
    return calculateDeltaVBreakdown(mission, totalAchievable);
  }, [mission, totalAchievable]);

  const { warnings, recommendations } = useMemo(() => {
    if (stageResults.length === 0) return { warnings: [], recommendations: [] };
    return generateWarningsAndRecommendations(breakdown, stageResults, mission.payloadMass);
  }, [breakdown, stageResults, mission.payloadMass]);

  // Format DeltaV for display
  const formatDeltaV = (value: number): string => {
    let converted = value;
    let unit = "m/s";
    
    if (unitSystem === "Imperial") {
      converted = value * 3.28084; // m/s to ft/s
      unit = "ft/s";
    } else if (unitSystem === "Custom") {
      const factor = parseFloat(customFactor);
      if (!isNaN(factor) && factor > 0) {
        converted = value / factor; // Convert from SI (m/s) to custom
      }
      unit = customUnitName || "Unit";
    }
    
    return `${converted.toFixed(1)} ${unit}`;
  };

  // Update result
  useEffect(() => {
    if (stageResults.length > 0) {
      const resultData = {
        mission,
        stages: stageResults,
        breakdown,
        totalLiftoffMass:
          stageResults.reduce((sum, r) => sum + r.initialMass, 0) + mission.payloadMass,
        payloadMass: mission.payloadMass,
        warnings,
        recommendations,
      };
      
      // Generate calculation steps for PDF
      const calculationSteps = [
        `Mission: ${mission.orbitType} at ${mission.targetOrbitAltitude} km altitude`,
        `Target inclination: ${mission.targetInclination}°`,
        `Payload mass: ${mission.payloadMass} kg`,
        `Number of stages: ${stages.length}`,
        `Total required Δv: ${breakdown.totalRequired.toFixed(1)} m/s`,
        `Total achievable Δv: ${totalAchievable.toFixed(1)} m/s`,
        `Feasibility: ${breakdown.isFeasible ? "Feasible" : "Not Feasible"}`,
        `Total liftoff mass: ${resultData.totalLiftoffMass.toFixed(1)} kg`,
        ...stageResults.map((sr, i) => 
          `Stage ${i + 1}: Δv = ${sr.achievableDeltaV.toFixed(1)} m/s, Initial mass = ${sr.initialMass.toFixed(1)} kg, Final mass = ${sr.finalMass.toFixed(1)} kg`
        )
      ];
      
      // Send calculation event to assistant
      sendCalculationEvent({
        toolId: "deltav-planner",
        toolName: "Delta-V Budget Planner",
        inputs: {
          targetOrbitAltitude: mission.targetOrbitAltitude,
          orbitType: mission.orbitType,
          targetInclination: mission.targetInclination,
          payloadMass: mission.payloadMass,
          gravityLoss: mission.gravityLoss,
          dragLoss: mission.dragLoss,
          steeringLoss: mission.steeringLoss,
          reserveMargin: mission.reserveMargin,
          numberOfStages: stages.length,
          stages: stages.map(s => ({
            name: s.name,
            dryMass: s.dryMass,
            propellantMass: s.propellantMass,
            ispSeaLevel: s.ispSeaLevel,
            ispVacuum: s.ispVacuum,
            useVacuumIsp: s.useVacuumIsp
          })),
          unitSystem
        },
        results: {
          totalRequiredDeltaV: breakdown.totalRequired,
          totalAchievableDeltaV: totalAchievable,
          feasibility: breakdown.isFeasible,
          totalLiftoffMass: resultData.totalLiftoffMass,
          payloadMass: mission.payloadMass,
          stageResults: stageResults.map(sr => ({
            stageName: sr.stage.name,
            achievableDeltaV: sr.achievableDeltaV,
            initialMass: sr.initialMass,
            finalMass: sr.finalMass
          }))
        },
        steps: calculationSteps,
        metadata: {
          units: unitSystem,
          approxLevel: "exact",
          confidence: "high",
          warnings,
          recommendations
        }
      }).then((eventResponse) => {
        // Always set lastRequestId (sendCalculationEvent always returns a response with requestId)
        setLastRequestId(eventResponse?.requestId || null);
      }).catch((error) => {
        console.warn("Failed to send calculation event:", error);
        // Even on error, try to get requestId from localStorage
        const storedKeys = Object.keys(localStorage).filter(key => key.startsWith('calc-'));
        if (storedKeys.length > 0) {
          const latestKey = storedKeys.sort().reverse()[0];
          const requestId = latestKey.replace('calc-', '');
          setLastRequestId(requestId);
        }
      });
      
      setResult(resultData);
      
      // Update AI assistant context
      updateToolContext({
        tool: "Delta-V Budget Planner",
        inputs: {
          targetOrbitAltitude: `${mission.targetOrbitAltitude} km`,
          orbitType: mission.orbitType,
          targetInclination: `${mission.targetInclination}°`,
          payloadMass: `${mission.payloadMass} kg`,
          gravityLoss: formatDeltaV(mission.gravityLoss),
          dragLoss: formatDeltaV(mission.dragLoss),
          steeringLoss: formatDeltaV(mission.steeringLoss),
          reserveMargin: `${mission.reserveMargin}%`,
          numberOfStages: stages.length
        },
        results: {
          totalRequiredDeltaV: formatDeltaV(breakdown.totalRequired),
          totalAchievableDeltaV: formatDeltaV(totalAchievable),
          feasibility: breakdown.totalRequired <= totalAchievable ? "Feasible" : "Not Feasible",
          totalLiftoffMass: `${resultData.totalLiftoffMass.toFixed(1)} kg`,
          payloadMass: `${mission.payloadMass} kg`,
          warnings: warnings.length > 0 ? warnings.join("; ") : "None",
          recommendations: recommendations.length > 0 ? recommendations.join("; ") : "None"
        }
      });
    } else {
      setResult(null);
    }
  }, [mission, stageResults, breakdown, warnings, recommendations, totalAchievable, stages, unitSystem, sendCalculationEvent, updateToolContext]);

  const loadPreset = useCallback((preset: typeof MISSION_PRESETS[0]) => {
    setMission(preset.mission);
    setStages(
      preset.stages.map((s, i) => ({
        ...s,
        id: `stage-${Date.now()}-${i}`,
      }))
    );
    toast({
      title: "Preset Loaded",
      description: `${preset.name} configuration loaded`,
    });
  }, [toast]);


  const handleSavePreset = () => {
    if (!presetName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for the preset",
        variant: "destructive",
      });
      return;
    }
    savePreset(presetName, mission, stages);
    toast({
      title: "Preset Saved",
      description: `${presetName} has been saved`,
    });
    setPresetName("");
    setIsPresetDialogOpen(false);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Rocket className="w-12 h-12 text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
          <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Delta-V Budget Planner
          </h2>
        </div>
        <p className="text-gray-300 text-lg max-w-3xl mx-auto">
          Mission Δv & Staging Designer - Calculate required Δv, stage sizing, and mission feasibility
        </p>
        <div className="flex justify-center gap-2 mt-4">
          <Select value={unitSystem} onValueChange={(v) => setUnitSystem(v as UnitSystem)}>
            <SelectTrigger className="w-40 bg-slate-900/50 border-cyan-400/30 text-cyan-400">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SI">SI (m/s)</SelectItem>
              <SelectItem value="Imperial">Imperial (ft/s)</SelectItem>
              <SelectItem value="Custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => setIsPresetDialogOpen(true)}
            className="border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10"
          >
            <Database className="w-4 h-4 mr-2" />
            Save Preset
          </Button>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Panel - Mission & Stage Inputs */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Mission Parameters */}
          <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Rocket className="w-5 h-5 text-cyan-400" />
                Mission Parameters
              </CardTitle>
              <CardDescription className="text-gray-400">
                Configure target orbit and mission requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orbit-type" className="text-gray-300">
                    Orbit Type
                  </Label>
                  <Select
                    value={mission.orbitType}
                    onValueChange={(value: MissionParameters["orbitType"]) =>
                      setMission({ ...mission, orbitType: value })
                    }
                  >
                    <SelectTrigger className="bg-slate-900/50 border-cyan-400/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LEO">LEO</SelectItem>
                      <SelectItem value="GTO">GTO</SelectItem>
                      <SelectItem value="GEO">GEO</SelectItem>
                      <SelectItem value="Escape">Escape</SelectItem>
                      <SelectItem value="Custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="altitude" className="text-gray-300">
                    Target Altitude (km)
                  </Label>
                  <Input
                    id="altitude"
                    type="number"
                    step="1"
                    value={mission.targetOrbitAltitude}
                    onChange={(e) =>
                      setMission({
                        ...mission,
                        targetOrbitAltitude: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="bg-slate-900/50 border-cyan-400/30 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inclination" className="text-gray-300">
                    Target Inclination (deg)
                  </Label>
                  <Input
                    id="inclination"
                    type="number"
                    step="0.1"
                    value={mission.targetInclination}
                    onChange={(e) =>
                      setMission({
                        ...mission,
                        targetInclination: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="bg-slate-900/50 border-cyan-400/30 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payload" className="text-gray-300">
                    Payload Mass (kg)
                  </Label>
                  <Input
                    id="payload"
                    type="number"
                    step="0.1"
                    value={mission.payloadMass}
                    onChange={(e) =>
                      setMission({
                        ...mission,
                        payloadMass: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="bg-slate-900/50 border-cyan-400/30 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gravity-loss" className="text-gray-300">
                    Gravity Loss (m/s)
                  </Label>
                  <Input
                    id="gravity-loss"
                    type="number"
                    step="10"
                    value={mission.gravityLoss}
                    onChange={(e) =>
                      setMission({
                        ...mission,
                        gravityLoss: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="bg-slate-900/50 border-cyan-400/30 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="drag-loss" className="text-gray-300">
                    Drag Loss ({unitSystem === "SI" ? "m/s" : unitSystem === "Imperial" ? "ft/s" : customUnitName || "Unit"})
                  </Label>
                  <Input
                    id="drag-loss"
                    type="number"
                    step="10"
                    value={mission.dragLoss}
                    onChange={(e) =>
                      setMission({
                        ...mission,
                        dragLoss: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="bg-slate-900/50 border-cyan-400/30 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="steering-loss" className="text-gray-300">
                    Steering Loss ({unitSystem === "SI" ? "m/s" : unitSystem === "Imperial" ? "ft/s" : customUnitName || "Unit"})
                  </Label>
                  <Input
                    id="steering-loss"
                    type="number"
                    step="10"
                    value={mission.steeringLoss}
                    onChange={(e) =>
                      setMission({
                        ...mission,
                        steeringLoss: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="bg-slate-900/50 border-cyan-400/30 text-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="margin" className="text-gray-300">
                  Reserve Margin (%)
                </Label>
                <Input
                  id="margin"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={mission.reserveMargin}
                  onChange={(e) =>
                    setMission({
                      ...mission,
                      reserveMargin: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="bg-slate-900/50 border-cyan-400/30 text-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* Stage Editor */}
          <StageEditor stages={stages} onStagesChange={setStages} />

          {/* Presets */}
          <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-cyan-400" />
                Mission Presets
              </CardTitle>
              <CardDescription className="text-gray-400">
                Quick-load common mission configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {MISSION_PRESETS.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    onClick={() => loadPreset(preset)}
                    className="justify-start border-cyan-400/20 text-gray-300 hover:bg-cyan-400/10 hover:border-cyan-400/40"
                  >
                    <div className="text-left">
                      <p className="font-semibold">{preset.name}</p>
                      <p className="text-xs text-gray-400">{preset.description}</p>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Panel - Results */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          {/* Summary Card */}
          {result && (
            <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Mission Summary</CardTitle>
                  <PDFExportButton 
                    requestId={lastRequestId} 
                    toolName="Delta-V Budget Planner"
                    disabled={!lastRequestId}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-cyan-400/10 to-blue-400/10 rounded-lg border border-cyan-400/30">
                  <p className="text-sm text-gray-400 mb-1">Total Liftoff Mass</p>
                  <p className="text-3xl font-bold text-cyan-400">
                    {(result.totalLiftoffMass / 1000).toFixed(1)} t
                  </p>
                </div>
                <div className="p-4 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-lg border border-blue-400/30">
                  <p className="text-sm text-gray-400 mb-1">Total Achievable Δv</p>
                  <p className="text-3xl font-bold text-blue-400">
                    {formatDeltaV(breakdown.totalAchievable)}
                  </p>
                </div>
                <div
                  className={`p-4 rounded-lg border ${
                    breakdown.isFeasible
                      ? "bg-gradient-to-r from-green-400/10 to-emerald-400/10 border-green-400/30"
                      : "bg-gradient-to-r from-red-400/10 to-pink-400/10 border-red-400/30"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {breakdown.isFeasible ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    )}
                    <p className="font-semibold text-white">
                      {breakdown.isFeasible ? "Mission Feasible" : "Mission Infeasible"}
                    </p>
                  </div>
                  <p className="text-sm text-gray-300">
                    Required: {formatDeltaV(breakdown.totalWithMargin)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <Card className="bg-slate-800/50 backdrop-blur-lg border border-yellow-400/20 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-yellow-400 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Warnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {warnings.map((warning, i) => (
                    <Alert key={i} variant="default" className="bg-yellow-400/10 border-yellow-400/30">
                      <AlertDescription className="text-yellow-400 text-sm">
                        {warning}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-cyan-400 flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {recommendations.map((rec, i) => (
                    <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                      <span className="text-cyan-400">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>

      {/* Results Section */}
      {result && (
        <div className="grid lg:grid-cols-2 gap-6">
          <DVBudgetTable breakdown={breakdown} stageResults={stageResults} unitSystem={unitSystem} customUnitName={customUnitName} customFactor={customFactor} />
          <DeltaVChart breakdown={breakdown} unitSystem={unitSystem} customUnitName={customUnitName} customFactor={customFactor} />
        </div>
      )}

      {result && (
        <MassBreakdownChart stageResults={stageResults} payloadMass={mission.payloadMass} />
      )}

      {/* Save Preset Dialog */}
      <Dialog open={isPresetDialogOpen} onOpenChange={setIsPresetDialogOpen}>
        <DialogContent className="bg-slate-800 border-cyan-400/20 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Save Preset</DialogTitle>
            <DialogDescription className="text-gray-400">
              Save current mission configuration as a preset
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="preset-name" className="text-gray-300">
                Preset Name
              </Label>
              <Input
                id="preset-name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                className="bg-slate-900/50 border-cyan-400/30 text-white"
                placeholder="My Custom Mission"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPresetDialogOpen(false)}
              className="border-cyan-400/40 text-cyan-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePreset}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-900 font-semibold"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



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
                Define conversion factor to SI (m/s)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-slate-900/50 rounded-lg border border-cyan-400/10">
                <Label className="text-white font-semibold">Delta-V (Δv)</Label>
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
                  1 {customUnitName || "Unit"} = {customFactor || "..."} m/s
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default DeltaVPlanner;

