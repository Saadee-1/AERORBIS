// UI-layer helper: use only for display, not computation!
export function getAerodynamicsDisplayStatus({ CL, CD, LD, Lift, Drag, Density, CL_max }) {
  const warnings: string[] = [];

  // NaN/Infinity check
  if (![CL, CD, LD, Lift, Drag, Density].every(Number.isFinite)) {
    warnings.push("Non-finite value in results (NaN/Infinity)");
  }
  if (typeof Density === "number" && Density <= 0) warnings.push("Non-physical air density (≤0)");
  if (typeof CD === "number" && CD <= 0) warnings.push("Invalid drag coefficient (≤0)");
  if (typeof LD === "number" && LD <= 0) warnings.push("L/D below physical range (≤0)");
  if (typeof LD === "number" && LD > 100) warnings.push("L/D exceeds realistic range (>100)");
  const postStall = Number.isFinite(CL) && typeof CL_max === "number" && Math.abs(CL) > CL_max;
  if (postStall) warnings.push("Post-stall condition: aerodynamic ratios not physically valid");

  // Display logic
  const display = {
    CL: Number.isFinite(CL) ? CL : "—",
    CD: Number.isFinite(CD) && CD > 0 ? CD : "—",
    LD: (Number.isFinite(LD) && LD > 0 && LD <= 100 && !postStall) ? LD : "—",
    Lift: Number.isFinite(Lift) && !postStall ? Lift : "—",
    Drag: Number.isFinite(Drag) && !postStall ? Drag : "—",
    Density: Number.isFinite(Density) && Density > 0 ? Density : "—"
  };

  if (postStall) {
    display.LD = display.Lift = display.Drag = "—";
  }

  return { display, postStall, warnings };
}

