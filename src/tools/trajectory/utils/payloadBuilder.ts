/**
 * AI payload builder for Rocket Trajectory Simulator
 */

import { buildAeroversePayload } from '@/ai/buildPayload';
import { AeroverseAIPayload } from '@/ai/schema/AeroversePayload';
import { Planet } from '../data/planets';
import { Stage } from '../utils/physics/staging';
import { GuidanceProfile } from '../utils/solver/run2d';
import { Guidance3D } from '../utils/solver/run3d';

export interface TrajectoryResults {
  mode: '1D' | '2D' | '3D';
  planet: Planet;
  stages: Stage[];
  guidance?: GuidanceProfile | Guidance3D;
  result1D?: any;
  result2D?: any;
  result3D?: any;
}

/**
 * Build AI payload from trajectory simulation results
 */
export function buildTrajectoryPayload(
  results: TrajectoryResults,
  requestId?: string
): AeroverseAIPayload {
  const { mode, planet, stages, guidance, result1D, result2D, result3D } = results;
  const result = mode === '1D' ? result1D : mode === '2D' ? result2D : result3D;

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
  const formattedInputs: Record<string, any> = {
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
  const formattedResults: Record<string, any> = {};
  
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
      formattedResults['Final Velocity'] = `${(final.velocity / 1000).toFixed(2)} km/s`;
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
  
  if (result?.burnout && result.burnout.velocity < 7500) {
    warnings.push('Burnout velocity below orbital velocity - may not reach orbit');
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
