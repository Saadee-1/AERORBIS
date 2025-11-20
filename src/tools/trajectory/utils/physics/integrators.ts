/**
 * Numerical integrators for trajectory simulation
 * RK4 and RKF45 adaptive step methods
 */

export type DerivativeFunction = (t: number, state: number[]) => number[];

/**
 * Runge-Kutta 4th order (RK4) integrator
 * Fixed step size
 */
export function rk4(
  f: DerivativeFunction,
  t: number,
  y: number[],
  h: number
): number[] {
  const k1 = f(t, y);
  const k2 = f(t + h / 2, y.map((yi, i) => yi + (h / 2) * k1[i]));
  const k3 = f(t + h / 2, y.map((yi, i) => yi + (h / 2) * k2[i]));
  const k4 = f(t + h, y.map((yi, i) => yi + h * k3[i]));
  
  return y.map((yi, i) => yi + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

/**
 * Runge-Kutta-Fehlberg 4(5) adaptive step integrator
 * Automatically adjusts step size based on error estimate
 */
export interface RKF45Options {
  minStep?: number;
  maxStep?: number;
  tolerance?: number;
  maxSteps?: number;
}

export interface RKF45Result {
  t: number;
  y: number[];
  step: number;
  error: number;
}

export function rkf45(
  f: DerivativeFunction,
  t: number,
  y: number[],
  h: number,
  options: RKF45Options = {}
): RKF45Result {
  const {
    minStep = 1e-6,
    maxStep = 100,
    tolerance = 1e-6,
  } = options;

  // RKF45 coefficients
  const a = [0, 1/4, 3/8, 12/13, 1, 1/2];
  const b = [
    [0, 0, 0, 0, 0],
    [1/4, 0, 0, 0, 0],
    [3/32, 9/32, 0, 0, 0],
    [1932/2197, -7200/2197, 7296/2197, 0, 0],
    [439/216, -8, 3680/513, -845/4104, 0],
    [-8/27, 2, -3544/2565, 1859/4104, -11/40],
  ];
  const c4 = [25/216, 0, 1408/2565, 2197/4104, -1/5, 0];
  const c5 = [16/135, 0, 6656/12825, 28561/56430, -9/50, 2/55];

  let currentH = Math.min(h, maxStep);
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    // Calculate k values
    const k: number[][] = [];
    for (let i = 0; i < 6; i++) {
      const sum = y.map((_, j) => {
        let s = 0;
        for (let l = 0; l < i; l++) {
          s += b[i][l] * k[l][j];
        }
        return s;
      });
      const yTemp = y.map((yi, j) => yi + currentH * sum[j]);
      k.push(f(t + a[i] * currentH, yTemp));
    }

    // Calculate 4th and 5th order solutions
    const y4 = y.map((yi, j) => {
      let sum = 0;
      for (let i = 0; i < 6; i++) {
        sum += c4[i] * k[i][j];
      }
      return yi + currentH * sum;
    });

    const y5 = y.map((yi, j) => {
      let sum = 0;
      for (let i = 0; i < 6; i++) {
        sum += c5[i] * k[i][j];
      }
      return yi + currentH * sum;
    });

    // Estimate error
    const error = Math.max(...y4.map((y4i, i) => Math.abs(y4i - y5[i]))) / currentH;

    // Check if step is acceptable
    if (error <= tolerance || currentH <= minStep) {
      return {
        t: t + currentH,
        y: y5, // Use 5th order solution
        step: currentH,
        error,
      };
    }

    // Reduce step size
    const safety = 0.9;
    const factor = safety * Math.pow(tolerance / error, 0.2);
    currentH = Math.max(minStep, currentH * factor);
    attempts++;
  }

  // If we couldn't find a good step, use minimum step
  const k1 = f(t, y);
  const yNext = y.map((yi, i) => yi + minStep * k1[i]);
  
  return {
    t: t + minStep,
    y: yNext,
    step: minStep,
    error: tolerance * 10, // Indicate high error
  };
}

/**
 * Integrate ODE system over time range
 */
export function integrate(
  f: DerivativeFunction,
  t0: number,
  y0: number[],
  tEnd: number,
  options: {
    method?: 'rk4' | 'rkf45';
    step?: number;
    adaptive?: boolean;
    maxSteps?: number;
  } = {}
): Array<{ t: number; y: number[] }> {
  const {
    method = 'rk4',
    step = 0.1,
    adaptive = false,
    maxSteps = 100000,
  } = options;

  const result: Array<{ t: number; y: number[] }> = [{ t: t0, y: [...y0] }];
  
  let t = t0;
  let y = [...y0];
  let currentStep = step;
  let steps = 0;

  while (t < tEnd && steps < maxSteps) {
    if (method === 'rkf45' || adaptive) {
      const rkfResult = rkf45(f, t, y, currentStep, {
        minStep: step / 1000,
        maxStep: step * 10,
        tolerance: 1e-6,
      });
      t = rkfResult.t;
      y = rkfResult.y;
      currentStep = rkfResult.step;
    } else {
      y = rk4(f, t, y, currentStep);
      t += currentStep;
    }

    result.push({ t, y: [...y] });
    steps++;

    // Prevent infinite loops
    if (t >= tEnd) break;
  }

  return result;
}
