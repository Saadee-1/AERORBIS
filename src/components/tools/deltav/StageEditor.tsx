"use client";

import { useState } from "react";
import { Stage } from "./types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Layers, Trash2, Plus, GripVertical } from "lucide-react";
import { motion } from "framer-motion";

interface StageEditorProps {
  stages: Stage[];
  onStagesChange: (stages: Stage[]) => void;
}

const StageEditor = ({ stages, onStagesChange }: StageEditorProps) => {
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  const addStage = () => {
    const newStage: Stage = {
      id: `stage-${Date.now()}`,
      name: `Stage ${stages.length + 1}`,
      ispSeaLevel: 290,
      ispVacuum: 340,
      useVacuumIsp: stages.length === 0, // First stage uses sea-level, others use vacuum
      structuralMassFraction: stages.length === 0 ? 0.08 : 0.06,
    };
    onStagesChange([...stages, newStage]);
  };

  const removeStage = (id: string) => {
    onStagesChange(stages.filter((s) => s.id !== id));
  };

  const updateStage = (id: string, updates: Partial<Stage>) => {
    onStagesChange(
      stages.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const moveStage = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === stages.length - 1)
    ) {
      return;
    }
    const newStages = [...stages];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newStages[index], newStages[targetIndex]] = [
      newStages[targetIndex],
      newStages[index],
    ];
    onStagesChange(newStages);
  };

  return (
    <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <CardTitle className="text-white">Stage Configuration</CardTitle>
          </div>
          <Button
            onClick={addStage}
            size="sm"
            className="bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-900 font-semibold"
            disabled={stages.length >= 4}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Stage
          </Button>
        </div>
        <CardDescription className="text-gray-400">
          Configure up to 4 stages. Stages are ordered from top (last to burn) to bottom (first to burn).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stages.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Layers className="w-12 h-12 mx-auto mb-4 text-cyan-400/30" />
            <p>No stages configured. Add a stage to begin.</p>
          </div>
        ) : (
          stages.map((stage, index) => (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-slate-900/50 border border-cyan-400/10">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-gray-500" />
                      <CardTitle className="text-lg text-white">
                        {stage.name || `Stage ${index + 1}`}
                      </CardTitle>
                      {index > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveStage(index, "up")}
                          className="text-cyan-400 hover:text-cyan-300"
                        >
                          ↑
                        </Button>
                      )}
                      {index < stages.length - 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveStage(index, "down")}
                          className="text-cyan-400 hover:text-cyan-300"
                        >
                          ↓
                        </Button>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStage(stage.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`name-${stage.id}`} className="text-gray-300">
                        Stage Name
                      </Label>
                      <Input
                        id={`name-${stage.id}`}
                        value={stage.name}
                        onChange={(e) =>
                          updateStage(stage.id, { name: e.target.value })
                        }
                        className="bg-slate-800 border-cyan-400/30 text-white"
                        placeholder={`Stage ${index + 1}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`engines-${stage.id}`} className="text-gray-300">
                        Number of Engines
                      </Label>
                      <Input
                        id={`engines-${stage.id}`}
                        type="number"
                        min="1"
                        value={stage.numberOfEngines || ""}
                        onChange={(e) =>
                          updateStage(stage.id, {
                            numberOfEngines: parseInt(e.target.value) || undefined,
                          })
                        }
                        className="bg-slate-800 border-cyan-400/30 text-white"
                        placeholder="1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`isp-sl-${stage.id}`} className="text-gray-300">
                        Isp Sea-Level (s)
                      </Label>
                      <Input
                        id={`isp-sl-${stage.id}`}
                        type="number"
                        step="0.1"
                        value={stage.ispSeaLevel}
                        onChange={(e) =>
                          updateStage(stage.id, {
                            ispSeaLevel: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="bg-slate-800 border-cyan-400/30 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`isp-vac-${stage.id}`} className="text-gray-300">
                        Isp Vacuum (s)
                      </Label>
                      <Input
                        id={`isp-vac-${stage.id}`}
                        type="number"
                        step="0.1"
                        value={stage.ispVacuum}
                        onChange={(e) =>
                          updateStage(stage.id, {
                            ispVacuum: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="bg-slate-800 border-cyan-400/30 text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={stage.useVacuumIsp}
                      onCheckedChange={(checked) =>
                        updateStage(stage.id, { useVacuumIsp: checked })
                      }
                    />
                    <Label className="text-gray-300">
                      Use Vacuum Isp (uncheck for sea-level operation)
                    </Label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`dry-${stage.id}`} className="text-gray-300">
                        Dry Mass (kg)
                      </Label>
                      <Input
                        id={`dry-${stage.id}`}
                        type="number"
                        step="0.1"
                        value={stage.dryMass || ""}
                        onChange={(e) =>
                          updateStage(stage.id, {
                            dryMass: parseFloat(e.target.value) || undefined,
                            structuralMassFraction: undefined, // Clear fraction if dry mass set
                          })
                        }
                        className="bg-slate-800 border-cyan-400/30 text-white"
                        placeholder="Auto from fraction"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`struct-${stage.id}`} className="text-gray-300">
                        Structural Fraction
                      </Label>
                      <Input
                        id={`struct-${stage.id}`}
                        type="number"
                        step="0.001"
                        min="0.02"
                        max="0.3"
                        value={stage.structuralMassFraction || ""}
                        onChange={(e) =>
                          updateStage(stage.id, {
                            structuralMassFraction: parseFloat(e.target.value) || undefined,
                            dryMass: undefined, // Clear dry mass if fraction set
                          })
                        }
                        className="bg-slate-800 border-cyan-400/30 text-white"
                        placeholder="0.08"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`prop-${stage.id}`} className="text-gray-300">
                        Propellant Mass (kg)
                      </Label>
                      <Input
                        id={`prop-${stage.id}`}
                        type="number"
                        step="0.1"
                        value={stage.propellantMass || ""}
                        onChange={(e) =>
                          updateStage(stage.id, {
                            propellantMass: parseFloat(e.target.value) || undefined,
                            desiredDeltaV: undefined, // Clear desired Δv if propellant set
                          })
                        }
                        className="bg-slate-800 border-cyan-400/30 text-white"
                        placeholder="Leave blank for Δv mode"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`dv-${stage.id}`} className="text-gray-300">
                        Desired Δv (m/s)
                      </Label>
                      <Input
                        id={`dv-${stage.id}`}
                        type="number"
                        step="0.1"
                        value={stage.desiredDeltaV || ""}
                        onChange={(e) =>
                          updateStage(stage.id, {
                            desiredDeltaV: parseFloat(e.target.value) || undefined,
                            propellantMass: undefined, // Clear propellant if Δv set
                          })
                        }
                        className="bg-slate-800 border-cyan-400/30 text-white"
                        placeholder="Leave blank for propellant mode"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`thrust-${stage.id}`} className="text-gray-300">
                        Thrust (N) - Optional
                      </Label>
                      <Input
                        id={`thrust-${stage.id}`}
                        type="number"
                        step="1000"
                        value={stage.thrust || ""}
                        onChange={(e) =>
                          updateStage(stage.id, {
                            thrust: parseFloat(e.target.value) || undefined,
                          })
                        }
                        className="bg-slate-800 border-cyan-400/30 text-white"
                        placeholder="For T/W check"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`interstage-${stage.id}`} className="text-gray-300">
                        Interstage Mass (kg) - Optional
                      </Label>
                      <Input
                        id={`interstage-${stage.id}`}
                        type="number"
                        step="0.1"
                        value={stage.interstageMass || ""}
                        onChange={(e) =>
                          updateStage(stage.id, {
                            interstageMass: parseFloat(e.target.value) || undefined,
                          })
                        }
                        className="bg-slate-800 border-cyan-400/30 text-white"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default StageEditor;

