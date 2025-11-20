/**
 * Thrust calculation and engine models
 */

export interface ThrustCurve {
  type: 'constant' | 'piecewise' | 'function';
  value?: number; // Constant thrust (N)
  points?: Array<{ t: number; thrust: number }>; // Piecewise linear
  function?: (t: number) => number; // Custom function
}

export interface Engine {
  id: string;
  name: string;
  isp: number; // Specific impulse (s)
  thrust: number | ThrustCurve; // Thrust (N) or thrust curve
  throttleable?: boolean;
  minThrottle?: number; // Minimum throttle (0-1)
  maxThrottle?: number; // Maximum throttle (0-1)
}

/**
 * Get thrust at time t
 */
export function getThrust(engine: Engine, t: number, throttle: number = 1.0): number {
  let baseThrust: number;

  if (typeof engine.thrust === 'number') {
    baseThrust = engine.thrust;
  } else {
    const curve = engine.thrust;
    if (curve.type === 'constant' && curve.value !== undefined) {
      baseThrust = curve.value;
    } else if (curve.type === 'piecewise' && curve.points) {
      // Linear interpolation
      if (t <= curve.points[0].t) {
        baseThrust = curve.points[0].thrust;
      } else if (t >= curve.points[curve.points.length - 1].t) {
        baseThrust = curve.points[curve.points.length - 1].thrust;
      } else {
        for (let i = 0; i < curve.points.length - 1; i++) {
          if (t >= curve.points[i].t && t <= curve.points[i + 1].t) {
            const t1 = curve.points[i].t;
            const t2 = curve.points[i + 1].t;
            const T1 = curve.points[i].thrust;
            const T2 = curve.points[i + 1].thrust;
            baseThrust = T1 + (T2 - T1) * (t - t1) / (t2 - t1);
            break;
          }
        }
        baseThrust = baseThrust || 0;
      }
    } else if (curve.type === 'function' && curve.function) {
      baseThrust = curve.function(t);
    } else {
      baseThrust = 0;
    }
  }

  // Apply throttle
  if (engine.throttleable) {
    const minThrottle = engine.minThrottle ?? 0;
    const maxThrottle = engine.maxThrottle ?? 1;
    const effectiveThrottle = minThrottle + throttle * (maxThrottle - minThrottle);
    return baseThrust * effectiveThrottle;
  }

  return baseThrust;
}

/**
 * Calculate mass flow rate
 * ṁ = T / (Isp * g0)
 */
export function calculateMassFlowRate(thrust: number, isp: number, g0: number = 9.80665): number {
  return thrust / (isp * g0);
}

/**
 * Calculate propellant consumption
 */
export function calculatePropellantConsumed(
  thrust: number,
  isp: number,
  dt: number,
  g0: number = 9.80665
): number {
  const mdot = calculateMassFlowRate(thrust, isp, g0);
  return mdot * dt;
}
