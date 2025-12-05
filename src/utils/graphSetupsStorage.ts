import type { SavedSetup } from "@/types/graphSetup";

const STORAGE_KEY = "aeroverse_graph_setups";

export function loadAllSavedSetups(): SavedSetup[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveAllSetups(setups: SavedSetup[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(setups));
}

