"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useCalculationAnimation } from "@/hooks/useCalculationAnimation";
import { CalculationOverlay } from "@/components/common/CalculationOverlay";
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
import { spacingVertical } from "@/styles/spacing";
import { buildCalculationEvent } from "@/lib/events/payloadBuilder";
import type { AeroverseAIPayload } from "@/ai/schema/AerorbisPayload";
import { buildDeltaVPayload, DeltaVUnitSystem } from "./payloadBuilder";

type UnitSystem = DeltaVUnitSystem;

const DeltaVPlanner = () => {
  const { toast } = useToast();
  const { updateToolContext, sendCalculationEvent } = useToolContext();
  const { isCalculating, runCalculation } = useCalculationAnimation({ minDuration: 900 });
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  const [lastPayload, setLastPayload] = useState<AeroverseAIPayload | null>(null);
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
        tool: "Delta-V Budget Planner",
        inputs: payload.inputs,
        results: payload.results,
      });

      const eventPayload = buildCalculationEvent({
        toolId: "deltav-planner",
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

  // Update result + AI payload when state changes
  useEffect(() => {
    if (stageResults.length === 0) {
      setResult(null);
      setLastPayload(null);
      setLastRequestId(null);
      return;
    }

    const totalLiftoffMass =
      stageResults.reduce((sum, r) => sum + r.initialMass, 0) + mission.payloadMass;

    const resultData: MissionResult = {
      mission,
      stages: stageResults,
      breakdown,
      totalLiftoffMass,
      payloadMass: mission.payloadMass,
      warnings,
      recommendations,
    };

    setResult(resultData);

    const payload = buildDeltaVPayload({
      mission,
      stages,
      stageResults,
      breakdown,
      totalLiftoffMass,
      warnings,
      recommendations,
      unitSystem,
      customUnitName,
      customFactor,
    });

    void applyToolPayload(payload);
  }, [
    applyToolPayload,
    breakdown,
    customFactor,
    customUnitName,
    mission,
    recommendations,
    stageResults,
    stages,
    unitSystem,
    warnings,
  ]);

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
    <ToolWrapper>
      <ToolHeader
        title="Delta-V Budget Planner"
        description="Mission Δv & Staging Designer - Calculate required Δv, stage sizing, and mission feasibility"
        icon={Rocket}
        actions={
          <ToolActions>
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
            <AeroButton
              variant="outline"
              onClick={() => setIsPresetDialogOpen(true)}
              icon={Database}
            >
              Save Preset
            </AeroButton>
          </ToolActions>
        }
      />

      <ToolSection gridCols={3}>
        {/* Left Panel - Mission & Stage Inputs */}
        <div className="lg:col-span-2">
          <div className={spacingVertical.L}>
            {/* Mission Parameters */}
            <AeroCard
              title="Mission Parameters"
              description="Configure target orbit and mission requirements"
              icon={Rocket}
            >
              <div className="grid grid-cols-2 gap-4">
                <AeroFormField label="Orbit Type">
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
                </AeroFormField>
                <AeroFormField label="Target Altitude (km)">
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
                </AeroFormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <AeroFormField label="Target Inclination (deg)">
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
                </AeroFormField>
                <AeroFormField label={`Payload Mass (kg)`}>
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
                </AeroFormField>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <AeroFormField label="Gravity Loss (m/s)">
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
                </AeroFormField>
                <AeroFormField label={`Drag Loss (${unitSystem === "SI" ? "m/s" : unitSystem === "Imperial" ? "ft/s" : customUnitName || "Unit"})`}>
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
                </AeroFormField>
                <AeroFormField label={`Steering Loss (${unitSystem === "SI" ? "m/s" : unitSystem === "Imperial" ? "ft/s" : customUnitName || "Unit"})`}>
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
                </AeroFormField>
              </div>
              <AeroFormField label="Reserve Margin (%)">
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
              </AeroFormField>
            </AeroCard>

            {/* Stage Editor */}
            <StageEditor stages={stages} onStagesChange={setStages} />

            {/* Presets */}
            <AeroCard
              title="Mission Presets"
              description="Quick-load common mission configurations"
              icon={Database}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {MISSION_PRESETS.map((preset) => (
                  <AeroButton
                    key={preset.name}
                    variant="outline"
                    onClick={() => loadPreset(preset)}
                    className="justify-start"
                  >
                    <div className="text-left">
                      <p className="font-semibold">{preset.name}</p>
                      <p className="text-xs text-gray-400">{preset.description}</p>
                    </div>
                  </AeroButton>
                ))}
              </div>
            </AeroCard>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div>
          <div className={spacingVertical.L}>
            {/* Summary Card */}
            {result ? (
                <AeroCard
                  title="Mission Summary"
                  headerActions={
                    result && breakdown && stageResults.length > 0 ? (
                      <div className="flex gap-2">
                        <AskAIButton
                          requestId={lastRequestId}
                          payload={lastPayload || undefined}
                          disabled={!lastPayload}
                        />
                        <PDFExportButton
                          requestId={lastRequestId}
                          toolName="Delta-V Budget Planner"
                          disabled={!lastRequestId}
                        />
                      </div>
                    ) : null
                  }
                >
                <div className="p-4 bg-gradient-to-r from-cyan-400/10 to-blue-400/10 rounded-lg border border-cyan-400/30 mb-4">
                  <p className="text-sm text-gray-400 mb-1">Total Liftoff Mass</p>
                  <p className="text-3xl font-bold text-cyan-400">
                    {(result.totalLiftoffMass / 1000).toFixed(1)} t
                  </p>
                </div>
                <div className="p-4 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-lg border border-blue-400/30 mb-4">
                  <p className="text-sm text-gray-400 mb-1">Total Achievable Δv</p>
                  <p className="text-3xl font-bold text-blue-400">
                    {formatDeltaV(breakdown.totalAchievable)}
                  </p>
                </div>
                <div
                  className={`p-4 rounded-lg border mb-4 ${
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
              </AeroCard>
            ) : null}

            {/* Warnings */}
            {warnings.length > 0 && (
              <AeroCard
                title="Warnings"
                icon={AlertTriangle}
                className="border-yellow-400/20"
              >
                <div className="space-y-2">
                  {warnings.map((warning, i) => (
                    <Alert key={i} variant="default" className="bg-yellow-400/10 border-yellow-400/30">
                      <AlertDescription className="text-yellow-400 text-sm">
                        {warning}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </AeroCard>
            )}

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <AeroCard
                title="Recommendations"
                icon={Info}
              >
                <ul className="space-y-2">
                  {recommendations.map((rec, i) => (
                    <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                      <span className="text-cyan-400">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </AeroCard>
            )}

            {/* Custom Units Card */}
            {unitSystem === "Custom" && (
              <AeroCard
                title="Custom Unit Definitions"
                description="Define conversion factor to SI (m/s)"
                icon={Settings2}
              >
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
              </AeroCard>
            )}
          </div>
        </div>
      </ToolSection>

      {/* Results Section */}
      {result && (
        <div className={spacingVertical.L}>
          <div className="grid lg:grid-cols-2 gap-6">
            <DVBudgetTable breakdown={breakdown} stageResults={stageResults} unitSystem={unitSystem} customUnitName={customUnitName} customFactor={customFactor} />
            <DeltaVChart breakdown={breakdown} unitSystem={unitSystem} customUnitName={customUnitName} customFactor={customFactor} />
          </div>
          {result && (
            <MassBreakdownChart stageResults={stageResults} payloadMass={mission.payloadMass} />
          )}
        </div>
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
            <AeroButton
              variant="outline"
              onClick={() => setIsPresetDialogOpen(false)}
            >
              Cancel
            </AeroButton>
            <AeroButton
              onClick={handleSavePreset}
              variant="primary"
            >
              Save
            </AeroButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ToolWrapper>
  );
};

export default DeltaVPlanner;

