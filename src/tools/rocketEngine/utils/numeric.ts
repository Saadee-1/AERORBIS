/**
 * Numerical solvers and utilities for rocket engine calculations
 * 
 * Implements Newton-Raphson and bracketed root-finding methods
 */

export interface SolverResult {
  success: boolean;
  value: number;
  iterations: number;
  residual: number;
  error?: string;
}

/**
 * Safe power function that handles edge cases
 */
export function safePow(base: number, exponent: number): number {
  if (base < 0 && Math.floor(exponent) !== exponent) {
    throw new Error('Cannot raise negative number to fractional power');
  }
  if (base === 0 && exponent < 0) {
    throw new Error('Cannot raise 0 to negative power');
  }
  return Math.pow(base, exponent);
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Safe logarithm with bounds checking
 */
export function logSafe(value: number, base: number = Math.E): number {
  if (value <= 0) {
    throw new Error('Logarithm argument must be positive');
  }
  if (base <= 0 || base === 1) {
    throw new Error('Logarithm base must be positive and not equal to 1');
  }
  return Math.log(value) / Math.log(base);
}

/**
 * Solve for exit Mach number from area ratio using Newton-Raphson
 * 
 * Solves: A/A* = (1/M) * [ (2/(γ+1)) * (1 + (γ-1)/2 * M²) ]^{(γ+1)/(2(γ-1))}
 * 
 * @param areaRatio - Expansion ratio Ae/At (must be > 1)
 * @param gamma - Ratio of specific heats
 * @param tolerance - Relative tolerance for convergence (default 1e-8)
 * @param maxIterations - Maximum iterations (default 100)
 * @returns Solver result with exit Mach number
 */
export function solveForMe(
  areaRatio: number,
  gamma: number,
  tolerance: number = 1e-8,
  maxIterations: number = 100
): SolverResult {
  if (areaRatio <= 1) {
    return {
      success: false,
      value: 1,
      iterations: 0,
      residual: Infinity,
      error: 'Area ratio must be > 1 for supersonic flow',
    };
  }
  
  if (gamma <= 1) {
    return {
      success: false,
      value: 1,
      iterations: 0,
      residual: Infinity,
      error: 'Gamma must be > 1',
    };
  }
  
  // Initial guess for supersonic Mach number
  // Use approximate formula: M ≈ sqrt( ((A/A*)^(2*(γ-1)/(γ+1)) - 1) * 2/(γ-1) )
  let M = 1.5;
  try {
    const approx = Math.pow(areaRatio, 2 * (gamma - 1) / (gamma + 1)) - 1;
    if (approx > 0) {
      M = Math.max(1.5, Math.sqrt(approx * 2 / (gamma - 1)));
    }
  } catch (e) {
    // Use default guess
    M = 1.5;
  }
  
  // Bracket the solution: supersonic branch is in [1+ε, 50]
  const M_min = 1.001;
  const M_max = 50.0;
  M = clamp(M, M_min, M_max);
  
  // Area-Mach relation function and its derivative
  const f = (M: number): number => {
    const term1 = 1 / M;
    const term2 = (2 / (gamma + 1)) * (1 + (gamma - 1) / 2 * M * M);
    const exponent = (gamma + 1) / (2 * (gamma - 1));
    return term1 * safePow(term2, exponent) - areaRatio;
  };
  
  const df = (M: number): number => {
    const term2 = (2 / (gamma + 1)) * (1 + (gamma - 1) / 2 * M * M);
    const exponent = (gamma + 1) / (2 * (gamma - 1));
    const term2_pow = safePow(term2, exponent);
    
    const dterm1 = -1 / (M * M);
    const dterm2 = (gamma - 1) * M / (gamma + 1);
    const dterm2_pow = exponent * safePow(term2, exponent - 1) * dterm2;
    
    return dterm1 * term2_pow + (1 / M) * dterm2_pow;
  };
  
  // Newton-Raphson iteration
  let iterations = 0;
  let residual = Math.abs(f(M));
  
  while (residual > tolerance * Math.abs(areaRatio) && iterations < maxIterations) {
    const f_val = f(M);
    const df_val = df(M);
    
    if (Math.abs(df_val) < 1e-12) {
      // Derivative too small, fall back to bisection
      return bisectionSolve(areaRatio, gamma, M_min, M_max, tolerance, maxIterations);
    }
    
    const M_new = M - f_val / df_val;
    
    // Check bounds
    if (M_new < M_min || M_new > M_max) {
      // Out of bounds, fall back to bisection
      return bisectionSolve(areaRatio, gamma, M_min, M_max, tolerance, maxIterations);
    }
    
    M = M_new;
    residual = Math.abs(f(M));
    iterations++;
  }
  
  if (iterations >= maxIterations) {
    // Did not converge, try bisection
    return bisectionSolve(areaRatio, gamma, M_min, M_max, tolerance, maxIterations);
  }
  
  return {
    success: true,
    value: M,
    iterations,
    residual,
  };
}

/**
 * Bisection method for solving area-Mach relation (fallback)
 */
function bisectionSolve(
  areaRatio: number,
  gamma: number,
  M_min: number,
  M_max: number,
  tolerance: number,
  maxIterations: number
): SolverResult {
  const f = (M: number): number => {
    const term1 = 1 / M;
    const term2 = (2 / (gamma + 1)) * (1 + (gamma - 1) / 2 * M * M);
    const exponent = (gamma + 1) / (2 * (gamma - 1));
    return term1 * safePow(term2, exponent) - areaRatio;
  };
  
  let a = M_min;
  let b = M_max;
  let iterations = 0;
  
  while (b - a > tolerance && iterations < maxIterations) {
    const c = (a + b) / 2;
    const f_c = f(c);
    
    if (Math.abs(f_c) < tolerance) {
      return {
        success: true,
        value: c,
        iterations,
        residual: Math.abs(f_c),
      };
    }
    
    if (f(a) * f_c < 0) {
      b = c;
    } else {
      a = c;
    }
    
    iterations++;
  }
  
  const M = (a + b) / 2;
  const residual = Math.abs(f(M));
  
  return {
    success: residual < tolerance * areaRatio,
    value: M,
    iterations,
    residual,
  };
}

/**
 * Vectorized sweep for parameter studies
 * 
 * @param min - Minimum value
 * @param max - Maximum value
 * @param steps - Number of steps
 * @param logScale - Use logarithmic spacing (default false)
 * @returns Array of values
 */
export function parameterSweep(
  min: number,
  max: number,
  steps: number,
  logScale: boolean = false
): number[] {
  if (min >= max) {
    throw new Error('Minimum must be less than maximum');
  }
  if (steps < 2) {
    throw new Error('Steps must be at least 2');
  }
  
  const values: number[] = [];
  
  if (logScale) {
    const logMin = Math.log(min);
    const logMax = Math.log(max);
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const logVal = logMin + t * (logMax - logMin);
      values.push(Math.exp(logVal));
    }
  } else {
    const stepSize = (max - min) / (steps - 1);
    for (let i = 0; i < steps; i++) {
      values.push(min + i * stepSize);
    }
  }
  
  return values;
}

