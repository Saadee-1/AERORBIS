/**
 * Generate human-readable recommendation reasons based on airfoil metrics
 * Returns 3-6 short, metric-backed reasons explaining why an airfoil is suitable
 */

export interface RecommendationContext {
  mode: "engineering" | "smart-ai";
  isFallback: boolean;
  reynolds: number;
  clTarget?: number;
  clAtTarget?: number;
  cdAtTarget?: number;
  ldMax?: number;
  clMax?: number;
  alphaStallDeg?: number;
  cmAtTarget?: number;
  cdMin?: number;
  stallSoftness?: number;
  cmRange?: number;
  cmMean?: number;
}

/**
 * Build 3-6 metric-backed reasons for recommending an airfoil
 */
export function buildRecommendationReasons(ctx: RecommendationContext): string[] {
  const reasons: string[] = [];
  const {
    mode,
    isFallback,
    reynolds,
    clTarget,
    clAtTarget,
    cdAtTarget,
    ldMax,
    clMax,
    alphaStallDeg,
    cmAtTarget,
    cdMin,
    stallSoftness,
    cmRange,
    cmMean,
  } = ctx;

  // Handle fallback mode first
  if (isFallback) {
    reasons.push("AI is offline; using engineering scoring based on L/D, stall margin, and drag.");
  }

  // For Smart AI mode, start with a natural summary
  if (mode === "smart-ai" && !isFallback) {
    if (ldMax !== undefined && ldMax > 60) {
      reasons.push("Best tradeoff of efficiency and stall margin for this mission profile.");
    } else if (clMax !== undefined && clMax > 1.2) {
      reasons.push("Strong lift characteristics with good handling qualities for this application.");
    } else {
      reasons.push("Well-suited performance characteristics for this mission profile.");
    }
  }

  // L/D max reasons
  if (ldMax !== undefined) {
    if (ldMax >= 80) {
      reasons.push(`Very high (L/D)max (~${ldMax.toFixed(0)}) at Re=${reynolds.toLocaleString()}, excellent for endurance.`);
    } else if (ldMax >= 60) {
      reasons.push(`High (L/D)max (~${ldMax.toFixed(0)}) at this Reynolds number, good for efficient flight.`);
    } else if (ldMax >= 40) {
      reasons.push(`Moderate (L/D)max (~${ldMax.toFixed(0)}) suitable for this operating condition.`);
    }
  }

  // CL max reasons
  if (clMax !== undefined) {
    if (clMax >= 1.5) {
      reasons.push(`High maximum lift (CL≈${clMax.toFixed(2)}), enabling strong low-speed performance.`);
    } else if (clMax >= 1.0) {
      reasons.push(`Good maximum lift (CL≈${clMax.toFixed(2)}) for typical flight operations.`);
    }
  }

  // Stall angle/margin reasons
  if (alphaStallDeg !== undefined) {
    if (alphaStallDeg >= 14) {
      reasons.push(`Stall angle around ${alphaStallDeg.toFixed(1)}°, providing extra margin for approach and landing.`);
    } else if (alphaStallDeg >= 10) {
      reasons.push(`Stall occurs at ${alphaStallDeg.toFixed(1)}°, adequate for normal operations.`);
    }
  }

  // CL target matching
  if (clTarget !== undefined && clAtTarget !== undefined) {
    const diff = Math.abs(clAtTarget - clTarget);
    if (diff <= 0.05) {
      reasons.push(`Meets CL target (${clTarget.toFixed(2)}) with ~${(diff * 100).toFixed(0)}% error, ideal for cruise.`);
    } else if (diff <= 0.1) {
      reasons.push(`Close to CL target (${clTarget.toFixed(2)}), within ${(diff * 100).toFixed(0)}% for efficient operation.`);
    }
  }

  // Drag at target CL
  if (cdAtTarget !== undefined && clAtTarget !== undefined) {
    if (cdAtTarget <= 0.015) {
      reasons.push(`Low drag at CL≈${clAtTarget.toFixed(2)} (Cd≈${cdAtTarget.toFixed(4)}), efficient at your cruise condition.`);
    } else if (cdAtTarget <= 0.025) {
      reasons.push(`Reasonable drag at CL≈${clAtTarget.toFixed(2)} (Cd≈${cdAtTarget.toFixed(4)}) for this operating point.`);
    }
  }

  // Minimum drag
  if (cdMin !== undefined) {
    if (cdMin < 0.008) {
      reasons.push(`Very low minimum drag (Cd≈${cdMin.toFixed(4)}), minimizes fuel consumption.`);
    } else if (cdMin < 0.015) {
      reasons.push(`Low minimum drag (Cd≈${cdMin.toFixed(4)}), good for high-speed efficiency.`);
    }
  }

  // Stall softness
  if (stallSoftness !== undefined && stallSoftness > 0.5) {
    reasons.push(`Soft stall characteristics (softness≈${stallSoftness.toFixed(2)}), forgiving for training and GA operations.`);
  }

  // Pitching moment warnings/cautions
  if (cmAtTarget !== undefined) {
    if (cmAtTarget < -0.1) {
      reasons.push(`Strong nose-down pitching moment (Cm≈${cmAtTarget.toFixed(3)}); may require more tail volume or trim.`);
    } else if (cmAtTarget > 0.1) {
      reasons.push(`Nose-up pitching moment (Cm≈${cmAtTarget.toFixed(3)}); consider tail sizing for balance.`);
    }
  }

  // Cm range (stability)
  if (cmRange !== undefined) {
    if (cmRange < 0.1) {
      reasons.push(`Stable pitching moment (Cm range ${cmRange.toFixed(3)}), predictable handling.`);
    } else if (cmRange > 0.2) {
      reasons.push(`Wide Cm range (${cmRange.toFixed(3)}); verify trim requirements for your CG range.`);
    }
  }

  // Engineering mode specific - more technical
  if (mode === "engineering" && !isFallback) {
    // Add a technical summary if we have enough metrics
    if (ldMax !== undefined && clMax !== undefined && alphaStallDeg !== undefined) {
      if (reasons.length < 4) {
        reasons.push(`Engineering metrics: L/D=${ldMax.toFixed(0)}, CLmax=${clMax.toFixed(2)}, αstall=${alphaStallDeg.toFixed(1)}°.`);
      }
    }
  }

  // Ensure we have at least 3 reasons, but cap at 6
  if (reasons.length === 0) {
    reasons.push("Metrics match mission constraints.");
    if (reynolds) {
      reasons.push(`Evaluated at Reynolds number ${reynolds.toLocaleString()}.`);
    }
  }

  // Limit to 6 reasons max
  return reasons.slice(0, 6);
}

