// Display-level ONLY: Validity envelope logic for physical interpretation zones

export function getCLValidity(CL, CL_max) {
  if (!Number.isFinite(CL) || !Number.isFinite(CL_max)) return { zone: 'invalid', label: 'Invalid', color: 'red' };
  const absCL = Math.abs(CL);
  if (absCL <= 0.9 * CL_max) return { zone: 'valid', label: 'Valid', color: 'green' };
  if (absCL <= CL_max) return { zone: 'near', label: 'Near Limit', color: 'amber' };
  return { zone: 'invalid', label: 'Outside Envelope', color: 'red' };
}

export function getCDValidity(CD) {
  if (!Number.isFinite(CD)) return { zone: 'invalid', label: 'Invalid', color: 'red' };
  if (CD > 0) return { zone: 'valid', label: 'Valid', color: 'green' };
  return { zone: 'invalid', label: 'Non-physical', color: 'red' };
}

export function getLDValidity(LD) {
  if (!Number.isFinite(LD)) return { zone: 'invalid', label: 'Invalid', color: 'red' };
  if (LD > 0 && LD <= 50) return { zone: 'valid', label: 'Valid', color: 'green' };
  if (LD > 50 && LD <= 100) return { zone: 'high', label: 'High (Possible)', color: 'amber' };
  if (LD > 100 || LD <= 0) return { zone: 'invalid', label: 'Non-physical', color: 'red' };
  return { zone: 'invalid', label: 'Unknown', color: 'red' };
}

