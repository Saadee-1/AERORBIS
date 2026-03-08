/**
 * Stage Editor Component
 */

import { AeroCard } from '@/components/common/AeroCard';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Rocket } from 'lucide-react';
import { Stage } from '../utils/physics/staging';
import { getAllEngines } from '../data/enginePresets';

interface StageEditorProps {
  stages: Stage[];
  onStagesChange: (stages: Stage[]) => void;
}

export function StageEditor({ stages, onStagesChange }: StageEditorProps) {
  const engines = getAllEngines();

  const addStage = () => {
    const newStage: Stage = {
      id: `stage-${Date.now()}`,
      dryMass: 1000,
      fuelMass: 5000,
      engines: [{ id: engines[0]?.id || '', count: 1, isp: 300, thrust: 100000 }],
      Cd: 0.5,
      area: 1.0,
    };
    onStagesChange([...stages, newStage]);
  };

  const removeStage = (index: number) => {
    onStagesChange(stages.filter((_, i) => i !== index));
  };

  const updateStage = (index: number, field: keyof Stage, value: unknown) => {
    const newStages = [...stages];
    (newStages[index] as unknown)[field] = value;
    onStagesChange(newStages);
  };

  const updateStageEngine = (stageIndex: number, engineIndex: number, field: string, value: unknown) => {
    const newStages = [...stages];
    (newStages[stageIndex].engines[engineIndex] as unknown)[field] = value;
    onStagesChange(newStages);
  };

  const addEngine = (stageIndex: number) => {
    const newStages = [...stages];
    newStages[stageIndex].engines.push({
      id: engines[0]?.id || '',
      count: 1,
      isp: 300,
      thrust: 100000,
    });
    onStagesChange(newStages);
  };

  const removeEngine = (stageIndex: number, engineIndex: number) => {
    const newStages = [...stages];
    newStages[stageIndex].engines = newStages[stageIndex].engines.filter((_, i) => i !== engineIndex);
    onStagesChange(newStages);
  };

  return (
    <AeroCard title="Rocket Stages" icon={Rocket}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">Configure rocket stages (first stage = bottom)</p>
          <Button onClick={addStage} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Stage
          </Button>
        </div>

        {stages.map((stage, stageIndex) => (
          <div key={stage.id} className="p-4 bg-muted/30 rounded-lg border border-border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-primary">
                Stage {stageIndex + 1} {stageIndex === 0 ? '(First)' : stageIndex === stages.length - 1 ? '(Upper)' : ''}
              </h3>
              {stages.length > 1 && (
                <Button onClick={() => removeStage(stageIndex)} variant="ghost" size="sm" className="text-destructive hover:text-destructive/80">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <AeroFormField label="Dry Mass" helperText="kg" htmlFor={`dry-${stageIndex}`}>
                <Input id={`dry-${stageIndex}`} type="number" value={stage.dryMass} onChange={(e) => updateStage(stageIndex, 'dryMass', parseFloat(e.target.value) || 0)} min="0" step="100" />
              </AeroFormField>
              <AeroFormField label="Fuel Mass" helperText="kg" htmlFor={`fuel-${stageIndex}`}>
                <Input id={`fuel-${stageIndex}`} type="number" value={stage.fuelMass} onChange={(e) => updateStage(stageIndex, 'fuelMass', parseFloat(e.target.value) || 0)} min="0" step="100" />
              </AeroFormField>
              <AeroFormField label="Drag Coefficient" helperText="Cd" htmlFor={`cd-${stageIndex}`}>
                <Input id={`cd-${stageIndex}`} type="number" value={stage.Cd} onChange={(e) => updateStage(stageIndex, 'Cd', parseFloat(e.target.value) || 0)} min="0" max="2" step="0.01" />
              </AeroFormField>
              <AeroFormField label="Frontal Area" helperText="m²" htmlFor={`area-${stageIndex}`}>
                <Input id={`area-${stageIndex}`} type="number" value={stage.area} onChange={(e) => updateStage(stageIndex, 'area', parseFloat(e.target.value) || 0)} min="0" step="0.1" />
              </AeroFormField>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex justify-between items-center mb-3">
                <Label className="text-sm font-semibold text-primary">Engines</Label>
                <Button onClick={() => addEngine(stageIndex)} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Engine
                </Button>
              </div>

              {stage.engines.map((engine, engineIndex) => (
                <div key={engineIndex} className="p-3 bg-muted/20 rounded mb-2">
                  <div className="grid grid-cols-4 gap-2">
                    <AeroFormField label="Engine" helperText="" htmlFor={`engine-${stageIndex}-${engineIndex}`}>
                      <Select value={engine.id} onValueChange={(value) => updateStageEngine(stageIndex, engineIndex, 'id', value)}>
                        <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {engines.map(eng => <SelectItem key={eng.id} value={eng.id}>{eng.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </AeroFormField>
                    <AeroFormField label="Count" helperText="" htmlFor={`count-${stageIndex}-${engineIndex}`}>
                      <Input id={`count-${stageIndex}-${engineIndex}`} type="number" value={engine.count} onChange={(e) => updateStageEngine(stageIndex, engineIndex, 'count', parseInt(e.target.value) || 1)} className="text-xs" min="1" step="1" />
                    </AeroFormField>
                    <AeroFormField label="Isp" helperText="s" htmlFor={`isp-${stageIndex}-${engineIndex}`}>
                      <Input id={`isp-${stageIndex}-${engineIndex}`} type="number" value={engine.isp} onChange={(e) => updateStageEngine(stageIndex, engineIndex, 'isp', parseFloat(e.target.value) || 0)} className="text-xs" min="0" step="10" />
                    </AeroFormField>
                    <div className="flex items-end">
                      <Button onClick={() => removeEngine(stageIndex, engineIndex)} variant="ghost" size="sm" className="text-destructive hover:text-destructive/80" disabled={stage.engines.length === 1}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {stages.length === 0 && (
          <div className="text-center p-8 text-muted-foreground">
            <p>No stages configured. Click "Add Stage" to begin.</p>
          </div>
        )}
      </div>
    </AeroCard>
  );
}
