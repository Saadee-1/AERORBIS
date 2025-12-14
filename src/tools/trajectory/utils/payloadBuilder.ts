/**
 * AI payload builder for Rocket Trajectory Simulator
 */

import { buildAeroversePayload } from '@/ai/buildPayload';
import { AeroverseAIPayload } from '@/ai/schema/AeroversePayload';
import { Planet } from '../data/planets';
import { Stage } from '../utils/physics/staging';
import { GuidanceProfile } from '../utils/solver/run2d';
import { Guidance3D } from '../utils/solver/run3d';

export interface AdvancedFeatures {
  performanceMode?: 'fast' | 'accurate' | 'high-fidelity';
  enableJ2?: boolean;
  enableAerobraking?: boolean;
  enableMissileMode?: boolean;
  enableGuidedMode?: boolean;
  enableKepler?: boolean;
  enable3D?: boolean;
  engineDatabaseUsed?: boolean;
  downsampleOutput?: boolean;
}

/** Simulation result shape for trajectory (supports both 1D/2D and 3D) */
interface SimulationResult {
  states?: Array<{ 
    altitude: number; 
    velocity: number | [number, number, number];
    t?: number;
  }>;
  maxQ?: { value: number; altitude: number; time: number };
  burnout?: { altitude: number; velocity: number | [number, number, number]; time: number; downrange?: number };
  stagingEvents?: Array<{ time: number; altitude: number; downrange?: number }>;
  losses?: { gravity: number; drag: number; steering: number };
}

export interface TrajectoryResults {
  mode: '1D' | '2D' | '3D';
  planet: Planet;
  stages: Stage[];
  guidance?: GuidanceProfile | Guidance3D;
  result1D?: SimulationResult;
  result2D?: SimulationResult;
  result3D?: SimulationResult;
  advancedFeatures?: AdvancedFeatures;
}

/**
 * Build AI payload from trajectory simulation results
 */
export function buildTrajectoryPayload(
  results: TrajectoryResults,
  requestId?: string
): AeroverseAIPayload {
  const { mode, planet, stages, guidance, result1D, result2D, result3D, advancedFeatures } = results;
  const result: SimulationResult | undefined = mode === '1D' ? result1D : mode === '2D' ? result2D : result3D;

  // Format calculation steps
  const steps: string[] = [
    `Trajectory simulation mode: ${mode}`,
    `Planet: ${planet.name}`,
    `Number of stages: ${stages.length}`,
  ];

  if (result) {
    steps.push(`Simulation completed: ${result.states?.length || 0} data points`);
    
    if (result.maxQ) {
      steps.push(`Max Q: ${(result.maxQ.value / 1000).toFixed(1)} kPa at ${(result.maxQ.altitude / 1000).toFixed(1)} km`);
    }
    
    if (result.burnout) {
      steps.push(`Burnout: ${(result.burnout.altitude / 1000).toFixed(1)} km, ${(result.burnout.velocity / 1000).toFixed(2)} km/s`);
    }
    
    if (result.stagingEvents) {
      steps.push(`Staging events: ${result.stagingEvents.length}`);
    }
  }

  // Format inputs
  // TODO: refine type for `formattedInputs` — changed any -> unknown automatically by chore/typed-cleanup
  const formattedInputs: Record<string, unknown> = {
    'Simulation Mode': mode,
    'Planet': planet.name,
    'Surface Gravity': `${planet.surfaceGravity.toFixed(2)} m/s²`,
    'Planetary Radius': `${(planet.radius / 1000).toFixed(0)} km`,
    'Has Atmosphere': planet.hasAtmosphere ? 'Yes' : 'No',
    'Number of Stages': stages.length.toString(),
  };

  stages.forEach((stage, i) => {
    formattedInputs[`Stage ${i + 1} Dry Mass`] = `${(stage.dryMass / 1000).toFixed(2)} t`;
    formattedInputs[`Stage ${i + 1} Fuel Mass`] = `${(stage.fuelMass / 1000).toFixed(2)} t`;
    formattedInputs[`Stage ${i + 1} Engines`] = stage.engines.length.toString();
  });

  if (guidance) {
    if (mode === '2D') {
      const g2d = guidance as GuidanceProfile;
      formattedInputs['Guidance Type'] = g2d.type;
      if (g2d.initialPitch) formattedInputs['Initial Pitch'] = `${g2d.initialPitch}°`;
      if (g2d.pitchRate) formattedInputs['Pitch Rate'] = `${g2d.pitchRate} deg/s`;
    }
  }

  // Format results
  // TODO: refine type for `formattedResults` — changed any -> unknown automatically by chore/typed-cleanup
  const formattedResults: Record<string, unknown> = {};
  
  if (result) {
    if (result.maxQ) {
      formattedResults['Max Q'] = `${(result.maxQ.value / 1000).toFixed(1)} kPa`;
      formattedResults['Max Q Altitude'] = `${(result.maxQ.altitude / 1000).toFixed(1)} km`;
    }
    
    if (result.burnout) {
      formattedResults['Burnout Altitude'] = `${(result.burnout.altitude / 1000).toFixed(1)} km`;
      formattedResults['Burnout Velocity'] = `${(result.burnout.velocity / 1000).toFixed(2)} km/s`;
      formattedResults['Burnout Time'] = `${result.burnout.time.toFixed(1)} s`;
    }
    
    if (result.states && result.states.length > 0) {
      const final = result.states[result.states.length - 1];
      formattedResults['Final Altitude'] = `${(final.altitude / 1000).toFixed(1)} km`;
      const finalVelocity = Array.isArray(final.velocity) 
        ? Math.sqrt(final.velocity[0]**2 + final.velocity[1]**2 + final.velocity[2]**2)
        : final.velocity;
      formattedResults['Final Velocity'] = `${(finalVelocity / 1000).toFixed(2)} km/s`;
    }
    
    if (mode === '2D' && result.losses) {
      formattedResults['Gravity Loss'] = `${(result.losses.gravity / 1000).toFixed(2)} km/s`;
      formattedResults['Drag Loss'] = `${(result.losses.drag / 1000).toFixed(2)} km/s`;
      formattedResults['Steering Loss'] = `${(result.losses.steering / 1000).toFixed(2)} km/s`;
    }
  }

  // Collect warnings
  const warnings: string[] = [];
  
  if (result?.maxQ && result.maxQ.value > 80000) {
    warnings.push('Max Q exceeds 80 kPa - structural loads may be high');
  }
  
  const burnoutVelocityScalar = result?.burnout 
    ? (Array.isArray(result.burnout.velocity) 
        ? Math.sqrt(result.burnout.velocity[0]**2 + result.burnout.velocity[1]**2 + result.burnout.velocity[2]**2)
        : result.burnout.velocity)
    : 0;
  if (result?.burnout && burnoutVelocityScalar < 7500) {
    warnings.push('Burnout velocity below orbital velocity - may not reach orbit');
  }

  // Extract event markers for visualization
  const eventFrames: Array<{ name: string; t: number; pos: [number, number, number] }> = [];
  if (result?.maxQ) {
    eventFrames.push({
      name: 'maxQ',
      t: result.maxQ.time,
      pos: [0, 0, result.maxQ.altitude] as [number, number, number], // Simplified
    });
  }
  if (result?.burnout) {
    eventFrames.push({
      name: 'MECO',
      t: result.burnout.time,
      pos: mode === '2D' 
        ? [result.burnout.downrange || 0, 0, result.burnout.altitude] as [number, number, number]
        : [0, 0, result.burnout.altitude] as [number, number, number],
    });
  }
  if (result?.stagingEvents) {
    result.stagingEvents.forEach((event) => {
      eventFrames.push({
        name: 'stageSep',
        t: event.time,
        pos: mode === '2D'
          ? [event.downrange || 0, 0, event.altitude] as [number, number, number]
          : [0, 0, event.altitude] as [number, number, number],
      });
    });
  }

  return buildAeroversePayload({
    requestId,
    toolName: 'Rocket Trajectory Simulator',
    toolVersion: '1.0.0',
    inputs: formattedInputs,
    results: formattedResults,
    units: {
      'Altitude': 'km',
      'Velocity': 'km/s',
      'Max Q': 'kPa',
      'Mass': 't',
      'Time': 's',
    },
    charts: [
      { id: 'altitude-time', title: 'Altitude vs Time', dataSummary: 'Trajectory altitude over time' },
      { id: 'velocity-time', title: 'Velocity vs Time', dataSummary: 'Velocity profile' },
      { id: 'max-q', title: 'Dynamic Pressure', dataSummary: 'Max Q vs altitude' },
      { id: 'mass-time', title: 'Mass vs Time', dataSummary: 'Mass depletion' },
      ...(mode === '2D' ? [{ id: 'trajectory-2d', title: '2D Trajectory', dataSummary: 'Altitude vs downrange' }] : []),
      ...(mode === '3D' ? [{ id: 'trajectory-3d', title: '3D Visualization', dataSummary: '3D flight path' }] : []),
    ],
    configuration: {
      mode,
      planet: planet.id,
      numberOfStages: stages.length,
      guidance: guidance ? (mode === '2D' ? (guidance as GuidanceProfile).type : '3D') : undefined,
      advancedFeatures: advancedFeatures || {},
      visualization: {
        cameraMode: advancedFeatures?.enable3D ? 'follow' : undefined,
        showMarkers: true,
        eventFrames,
        enabled: advancedFeatures?.enable3D || false,
      },
    },
    metadata: {
      steps,
      unitsSystem: 'SI',
      approxLevel: 'numerical',
      confidence: warnings.length === 0 ? 'high' : 'medium',
      warnings,
    },
  });
}
