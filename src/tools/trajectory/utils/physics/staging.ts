/**
 * Staging system logic
 */

export interface Stage {
  id: string;
  dryMass: number; // kg
  fuelMass: number; // kg
  engines: Array<{
    id: string;
    count: number;
    isp: number;
    thrust: number | any; // Thrust or thrust curve
  }>;
  Cd: number;
  area: number; // m²
  separationAltitude?: number; // Optional separation altitude (m)
  separationVelocity?: number; // Optional separation velocity (m/s)
  separationTime?: number; // Optional separation time (s)
}

export interface StagingEvent {
  stageIndex: number;
  time: number;
  reason: 'fuel_depleted' | 'altitude' | 'velocity' | 'time' | 'manual';
}

/**
 * Check if stage should separate
 */
export function checkStaging(
  stage: Stage,
  currentTime: number,
  currentAltitude: number,
  currentVelocity: number,
  remainingFuel: number
): boolean {
  // Check fuel depletion
  if (remainingFuel <= 0) {
    return true;
  }

  // Check altitude trigger
  if (stage.separationAltitude !== undefined && currentAltitude >= stage.separationAltitude) {
    return true;
  }

  // Check velocity trigger
  if (stage.separationVelocity !== undefined && currentVelocity >= stage.separationVelocity) {
    return true;
  }

  // Check time trigger
  if (stage.separationTime !== undefined && currentTime >= stage.separationTime) {
    return true;
  }

  return false;
}

/**
 * Calculate total mass of stage
 */
export function getStageMass(stage: Stage, remainingFuel: number): number {
  return stage.dryMass + Math.max(0, remainingFuel);
}

/**
 * Calculate total thrust of stage
 */
export function getStageThrust(
  stage: Stage,
  time: number,
  throttle: number = 1.0
): number {
  let totalThrust = 0;
  
  for (const engine of stage.engines) {
    let engineThrust = 0;
    
    if (typeof engine.thrust === 'number') {
      engineThrust = engine.thrust;
    } else if (engine.thrust && typeof engine.thrust === 'object') {
      // Handle thrust curve
      if (engine.thrust.type === 'constant' && engine.thrust.value !== undefined) {
        engineThrust = engine.thrust.value;
      } else if (engine.thrust.type === 'piecewise' && engine.thrust.points) {
        // Linear interpolation
        const points = engine.thrust.points;
        if (time <= points[0].t) {
          engineThrust = points[0].thrust;
        } else if (time >= points[points.length - 1].t) {
          engineThrust = points[points.length - 1].thrust;
        } else {
          for (let i = 0; i < points.length - 1; i++) {
            if (time >= points[i].t && time <= points[i + 1].t) {
              const t1 = points[i].t;
              const t2 = points[i + 1].t;
              const T1 = points[i].thrust;
              const T2 = points[i + 1].thrust;
              engineThrust = T1 + (T2 - T1) * (time - t1) / (t2 - t1);
              break;
            }
          }
        }
      } else if (engine.thrust.type === 'function' && engine.thrust.function) {
        engineThrust = engine.thrust.function(time);
      }
    }
    
    totalThrust += engineThrust * engine.count * throttle;
  }
  
  return totalThrust;
}

/**
 * Calculate total Isp of stage (mass-weighted average)
 * Uses initial thrust value for Isp calculation
 */
export function getStageIsp(stage: Stage): number {
  let totalThrust = 0;
  let totalMassFlow = 0;
  
  for (const engine of stage.engines) {
    let engineThrust = 0;
    
    if (typeof engine.thrust === 'number') {
      engineThrust = engine.thrust;
    } else if (engine.thrust && typeof engine.thrust === 'object') {
      // Use initial thrust value for Isp calculation
      if (engine.thrust.type === 'constant' && engine.thrust.value !== undefined) {
        engineThrust = engine.thrust.value;
      } else if (engine.thrust.type === 'piecewise' && engine.thrust.points && engine.thrust.points.length > 0) {
        engineThrust = engine.thrust.points[0].thrust; // Use first point
      } else if (engine.thrust.type === 'function' && engine.thrust.function) {
        engineThrust = engine.thrust.function(0); // Use t=0
      }
    }
    
    const totalEngineThrust = engineThrust * engine.count;
    const massFlow = totalEngineThrust / (engine.isp * 9.80665);
    
    totalThrust += totalEngineThrust;
    totalMassFlow += massFlow;
  }
  
  if (totalMassFlow === 0) return 0;
  return totalThrust / (totalMassFlow * 9.80665);
}
