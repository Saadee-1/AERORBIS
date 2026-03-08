"use client";

/**
 * Multi-Airfoil Selector
 * 
 * Allows selection of up to 5 airfoils for comparison
 */

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { AIRFOIL_GROUPS, AIRFOIL_DATA } from "@/data/airfoils";

interface MultiAirfoilSelectorProps {
  selectedAirfoils: string[];
  onSelectionChange: (airfoils: string[]) => void;
  maxSelections?: number;
}

export function MultiAirfoilSelector({
  selectedAirfoils,
  onSelectionChange,
  maxSelections = 5,
}: MultiAirfoilSelectorProps) {
  const [pendingSelection, setPendingSelection] = useState<string>("");

  const handleAddAirfoil = () => {
    if (!pendingSelection || selectedAirfoils.includes(pendingSelection)) {
      return;
    }

    if (selectedAirfoils.length >= maxSelections) {
      return;
    }

    onSelectionChange([...selectedAirfoils, pendingSelection]);
    setPendingSelection("");
  };

  const handleRemoveAirfoil = (airfoilId: string) => {
    onSelectionChange(selectedAirfoils.filter(id => id !== airfoilId));
  };

  // Get available airfoils (exclude already selected and custom)
  const availableAirfoils = AIRFOIL_GROUPS.flatMap(group => 
    group.airfoils.filter(af => 
      !af.custom && !selectedAirfoils.includes(af.id)
    )
  );

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label className="text-primary mb-2 block">Add Airfoil for Comparison</Label>
          <Select value={pendingSelection} onValueChange={setPendingSelection}>
            <SelectTrigger className="bg-input border-border text-foreground">
              <SelectValue placeholder="Select an airfoil..." />
            </SelectTrigger>
            <SelectContent className="max-h-[400px]">
              {AIRFOIL_GROUPS.filter(group => !group.airfoils.some(af => af.custom)).map((group) => (
                <SelectGroup key={group.label}>
                  <SelectLabel className="text-primary font-semibold px-2 py-1.5 text-xs uppercase tracking-wider">
                    {group.label}
                  </SelectLabel>
                  {group.airfoils.filter(af => !af.custom && !selectedAirfoils.includes(af.id)).map((airfoil) => (
                    <SelectItem key={airfoil.id} value={airfoil.id}>
                      {airfoil.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleAddAirfoil}
          disabled={!pendingSelection || selectedAirfoils.length >= maxSelections}
          className="bg-primary hover:bg-primary/80 text-primary-foreground"
        >
          Add
        </Button>
      </div>

      {/* Selected airfoils list */}
      {selectedAirfoils.length > 0 && (
        <div className="space-y-2">
          <Label className="text-primary">
            Selected Airfoils ({selectedAirfoils.length}/{maxSelections})
          </Label>
          <div className="space-y-2">
            {selectedAirfoils.map((airfoilId) => {
              const airfoilName = AIRFOIL_DATA[airfoilId]?.name || airfoilId;
              return (
                <div
                  key={airfoilId}
                  className="flex items-center justify-between bg-muted/30 border border-border rounded-lg p-3"
                >
                  <span className="text-foreground font-medium">{airfoilName}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveAirfoil(airfoilId)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedAirfoils.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No airfoils selected. Add up to {maxSelections} airfoils to compare.
        </p>
      )}

      {selectedAirfoils.length >= maxSelections && (
        <p className="text-sm text-yellow-400 text-center">
          Maximum {maxSelections} airfoils selected
        </p>
      )}
    </div>
  );
}
