import { useState, useEffect } from "react";
import { loadAllSavedSetups, saveAllSetups } from "@/utils/graphSetupsStorage";
import type { SavedSetup, GraphMode } from "@/types/graphSetup";

interface GraphSelection {
  baseAirfoilId: string;
  comparedAirfoilIds: string[];
  reynolds: number;
  mode: GraphMode;
}

interface UseGraphSetupsProps {
  calculatorId: string;
  baseAirfoilId: string;
  comparedAirfoilIds: string[];
  reynolds: number;
  mode: GraphMode;
  onLoadSetup: (setup: GraphSelection) => void;
}

export function useGraphSetups({
  calculatorId,
  baseAirfoilId,
  comparedAirfoilIds,
  reynolds,
  mode,
  onLoadSetup,
}: UseGraphSetupsProps) {
  const [setups, setSetups] = useState<SavedSetup[]>([]);

  useEffect(() => {
    const all = loadAllSavedSetups();
    setSetups(all.filter((s) => s.calculatorId === calculatorId));
  }, [calculatorId]);

  function persist(nextForThisCalculator: SavedSetup[]) {
    const all = loadAllSavedSetups()
      .filter((s) => s.calculatorId !== calculatorId)
      .concat(nextForThisCalculator);
    saveAllSetups(all);
    setSetups(nextForThisCalculator);
  }

  function saveCurrentSetup(name: string) {
    if (!baseAirfoilId) return;

    const newSetup: SavedSetup = {
      id: crypto.randomUUID?.() ?? String(Date.now()),
      name: name.trim() || "Unnamed setup",
      createdAt: Date.now(),
      baseAirfoilId,
      comparedAirfoilIds: [...comparedAirfoilIds], // copy array
      reynolds,
      mode: mode as GraphMode,
      calculatorId,
      version: 1,
    };

    persist([...setups, newSetup]);
  }

  function deleteSetup(id: string) {
    const next = setups.filter((s) => s.id !== id);
    persist(next);
  }

  function loadSetup(id: string) {
    const setup = setups.find((s) => s.id === id);
    if (!setup) return;

    onLoadSetup({
      baseAirfoilId: setup.baseAirfoilId,
      comparedAirfoilIds: setup.comparedAirfoilIds,
      reynolds: setup.reynolds,
      mode: setup.mode,
    });
  }

  return {
    setups,
    saveCurrentSetup,
    deleteSetup,
    loadSetup,
  };
}

