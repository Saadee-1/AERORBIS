/**
 * PDF Export Utility for Battery & Solar Power System
 * 
 * Generates formatted HTML/PDF reports for power system calculations
 */

import type { AeroverseAIPayload } from '@/ai/schema/AerorbisPayload';
import { MissionResult } from './missionEngine';

export interface PowerSystemPDFData {
  toolName: string;
  requestId: string;
  timestamp: string;
  inputs: {
    battery: {
      chemistry: string;
      capacity_mAh: number;
      series: number;
      parallel: number;
      cycles: number;
      temperature: number;
    };
    solar: {
      area_m2: number;
      efficiency: number;
      mpptEfficiency: number;
      tilt: number;
      azimuth: number;
    };
    loads: Record<string, number>;
    location: {
      latitude: number;
      longitude: number;
      altitude: number;
    };
    dayOfYear: number;
  };
  results: {
    endurance_min: number;
    endurance_hours: number;
    solarFraction: number;
    minPowerMargin_W: number;
    maxVoltage: number;
    minVoltage: number;
    totalEnergyUsed_Wh: number;
    totalSolarGenerated_Wh: number;
  };
  warnings: string[];
  recommendations: string[];
  steps?: string[];
}

/**
 * Generate PDF HTML from power system data
 */
export function generatePowerSystemPDF(data: PowerSystemPDFData): string {
  const {
    toolName,
    requestId,
    timestamp,
    inputs,
    results,
    warnings,
    recommendations,
    steps = [],
  } = data;

  // Calculate totals
  const totalLoad_W = Object.values(inputs.loads).reduce(
    (sum, val) => sum + (typeof val === 'number' ? val : 0),
    0
  );
  const packVoltage = inputs.battery.series * 3.7; // Approximate nominal voltage
  const packCapacity_mAh = inputs.battery.capacity_mAh * inputs.battery.parallel;
  const packEnergy_Wh = (packVoltage * packCapacity_mAh) / 1000;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${toolName} Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      margin: 40px; 
      color: #1e293b; 
      background: #ffffff;
      line-height: 1.6;
    }
    .header {
      border-bottom: 3px solid #10b981;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    h1 { 
      color: #10b981; 
      font-size: 2.5em;
      margin-bottom: 10px;
    }
    h2 { 
      color: #059669; 
      margin-top: 30px; 
      margin-bottom: 15px;
      font-size: 1.5em;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
    }
    h3 {
      color: #0891b2;
      margin-top: 20px;
      margin-bottom: 10px;
      font-size: 1.2em;
    }
    .metadata { 
      color: #64748b; 
      font-size: 0.9em; 
      margin-top: 10px;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 20px 0; 
      background: #f8fafc;
      border-radius: 8px;
      overflow: hidden;
    }
    th, td { 
      padding: 12px 16px; 
      text-align: left; 
      border-bottom: 1px solid #e2e8f0; 
    }
    th { 
      background-color: #0f172a; 
      color: #22d3ee; 
      font-weight: 600;
    }
    tr:last-child td {
      border-bottom: none;
    }
    tr:hover {
      background-color: #f1f5f9;
    }
    .result { 
      font-size: 1.3em; 
      font-weight: bold; 
      color: #06b6d4; 
    }
    .step { 
      margin: 12px 0; 
      padding: 12px 16px; 
      background-color: #f1f5f9; 
      border-left: 4px solid #22d3ee; 
      border-radius: 4px;
    }
    .warning {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      margin: 12px 0;
      border-radius: 4px;
      color: #92400e;
    }
    .recommendation {
      background-color: #dbeafe;
      border-left: 4px solid #3b82f6;
      padding: 12px 16px;
      margin: 12px 0;
      border-radius: 4px;
      color: #1e40af;
    }
    .section {
      margin: 30px 0;
      padding: 20px;
      background: #f8fafc;
      border-radius: 8px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin: 20px 0;
    }
    .metric {
      background: white;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .metric-label {
      font-size: 0.9em;
      color: #64748b;
      margin-bottom: 8px;
    }
    .metric-value {
      font-size: 1.8em;
      font-weight: bold;
      color: #06b6d4;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 0.9em;
    }
    @media print {
      body { margin: 20px; }
      .section { page-break-inside: avoid; }
      h2 { page-break-after: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${toolName}</h1>
    <p class="metadata">Generated: ${new Date(timestamp).toLocaleString()}</p>
    <p class="metadata">Request ID: ${requestId}</p>
  </div>

  <div class="section">
    <h2>Summary</h2>
    <div class="grid">
      <div class="metric">
        <div class="metric-label">Endurance</div>
        <div class="metric-value">${results.endurance_hours.toFixed(2)} hours</div>
      </div>
      <div class="metric">
        <div class="metric-label">Solar Fraction</div>
        <div class="metric-value">${(results.solarFraction * 100).toFixed(1)}%</div>
      </div>
      <div class="metric">
        <div class="metric-label">Total Energy Used</div>
        <div class="metric-value">${results.totalEnergyUsed_Wh.toFixed(2)} Wh</div>
      </div>
      <div class="metric">
        <div class="metric-label">Total Solar Generated</div>
        <div class="metric-value">${results.totalSolarGenerated_Wh.toFixed(2)} Wh</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Battery Configuration</h2>
    <table>
      <tr>
        <th>Parameter</th>
        <th>Value</th>
      </tr>
      <tr>
        <td>Chemistry</td>
        <td>${inputs.battery.chemistry}</td>
      </tr>
      <tr>
        <td>Cell Capacity</td>
        <td>${inputs.battery.capacity_mAh.toFixed(0)} mAh</td>
      </tr>
      <tr>
        <td>Series Cells (S)</td>
        <td>${inputs.battery.series}</td>
      </tr>
      <tr>
        <td>Parallel Cells (P)</td>
        <td>${inputs.battery.parallel}</td>
      </tr>
      <tr>
        <td>Pack Configuration</td>
        <td>${inputs.battery.series}S${inputs.battery.parallel}P</td>
      </tr>
      <tr>
        <td>Pack Voltage</td>
        <td>${packVoltage.toFixed(2)} V</td>
      </tr>
      <tr>
        <td>Pack Capacity</td>
        <td>${packCapacity_mAh.toFixed(0)} mAh</td>
      </tr>
      <tr>
        <td>Pack Energy</td>
        <td>${packEnergy_Wh.toFixed(2)} Wh</td>
      </tr>
      <tr>
        <td>Cycle Count</td>
        <td>${inputs.battery.cycles}</td>
      </tr>
      <tr>
        <td>Temperature</td>
        <td>${inputs.battery.temperature.toFixed(1)} °C</td>
      </tr>
    </table>
  </div>

  <div class="section">
    <h2>Solar Panel Configuration</h2>
    <table>
      <tr>
        <th>Parameter</th>
        <th>Value</th>
      </tr>
      <tr>
        <td>Panel Area</td>
        <td>${inputs.solar.area_m2.toFixed(3)} m²</td>
      </tr>
      <tr>
        <td>Cell Efficiency</td>
        <td>${(inputs.solar.efficiency * 100).toFixed(1)}%</td>
      </tr>
      <tr>
        <td>MPPT Efficiency</td>
        <td>${(inputs.solar.mpptEfficiency * 100).toFixed(1)}%</td>
      </tr>
      <tr>
        <td>Tilt Angle</td>
        <td>${inputs.solar.tilt.toFixed(1)}°</td>
      </tr>
      <tr>
        <td>Azimuth Angle</td>
        <td>${inputs.solar.azimuth.toFixed(1)}°</td>
      </tr>
    </table>
  </div>

  <div class="section">
    <h2>Power Loads</h2>
    <table>
      <tr>
        <th>Load Type</th>
        <th>Power (W)</th>
      </tr>
      ${Object.entries(inputs.loads).map(([key, value]) => `
        <tr>
          <td>${key.charAt(0).toUpperCase() + key.slice(1)}</td>
          <td>${typeof value === 'number' ? value.toFixed(2) : '0.00'}</td>
        </tr>
      `).join('')}
      <tr style="background-color: #e2e8f0; font-weight: bold;">
        <td>Total Load</td>
        <td>${totalLoad_W.toFixed(2)} W</td>
      </tr>
    </table>
  </div>

  <div class="section">
    <h2>Mission Environment</h2>
    <table>
      <tr>
        <th>Parameter</th>
        <th>Value</th>
      </tr>
      <tr>
        <td>Latitude</td>
        <td>${inputs.location.latitude.toFixed(4)}°</td>
      </tr>
      <tr>
        <td>Longitude</td>
        <td>${inputs.location.longitude.toFixed(4)}°</td>
      </tr>
      <tr>
        <td>Altitude</td>
        <td>${inputs.location.altitude.toFixed(0)} m</td>
      </tr>
      <tr>
        <td>Day of Year</td>
        <td>${inputs.dayOfYear} (${getDayOfYearDescription(inputs.dayOfYear)})</td>
      </tr>
    </table>
  </div>

  <div class="section">
    <h2>Simulation Results</h2>
    <table>
      <tr>
        <th>Metric</th>
        <th>Value</th>
      </tr>
      <tr>
        <td>Endurance</td>
        <td class="result">${results.endurance_min.toFixed(1)} minutes (${results.endurance_hours.toFixed(2)} hours)</td>
      </tr>
      <tr>
        <td>Solar Fraction</td>
        <td class="result">${(results.solarFraction * 100).toFixed(1)}%</td>
      </tr>
      <tr>
        <td>Minimum Power Margin</td>
        <td>${results.minPowerMargin_W.toFixed(2)} W</td>
      </tr>
      <tr>
        <td>Maximum Voltage</td>
        <td>${results.maxVoltage.toFixed(2)} V</td>
      </tr>
      <tr>
        <td>Minimum Voltage</td>
        <td>${results.minVoltage.toFixed(2)} V</td>
      </tr>
      <tr>
        <td>Total Energy Used</td>
        <td>${results.totalEnergyUsed_Wh.toFixed(2)} Wh</td>
      </tr>
      <tr>
        <td>Total Solar Generated</td>
        <td>${results.totalSolarGenerated_Wh.toFixed(2)} Wh</td>
      </tr>
    </table>
  </div>

  ${steps.length > 0 ? `
    <div class="section">
      <h2>Calculation Steps</h2>
      ${steps.map((step, index) => `
        <div class="step">
          <strong>Step ${index + 1}:</strong> ${step}
        </div>
      `).join('')}
    </div>
  ` : ''}

  ${warnings.length > 0 ? `
    <div class="section">
      <h2>Warnings</h2>
      ${warnings.map(warning => `
        <div class="warning">
          ⚠️ ${warning}
        </div>
      `).join('')}
    </div>
  ` : ''}

  ${recommendations.length > 0 ? `
    <div class="section">
      <h2>Recommendations</h2>
      ${recommendations.map(rec => `
        <div class="recommendation">
          💡 ${rec}
        </div>
      `).join('')}
    </div>
  ` : ''}

  <div class="footer">
    <p>Generated by Aeroverse Engineering Tools</p>
    <p>Report ID: ${requestId}</p>
  </div>
</body>
</html>
  `;

  return html;
}

/**
 * Get human-readable description of day of year
 */
function getDayOfYearDescription(day: number): string {
  if (day <= 31) return 'January';
  if (day <= 59) return 'February';
  if (day <= 90) return 'March';
  if (day <= 120) return 'April';
  if (day <= 151) return 'May';
  if (day <= 181) return 'June';
  if (day <= 212) return 'July';
  if (day <= 243) return 'August';
  if (day <= 273) return 'September';
  if (day <= 304) return 'October';
  if (day <= 334) return 'November';
  return 'December';
}

/**
 * Convert AeroverseAIPayload to PDF data format
 */
export function convertPayloadToPDFData(
  payload: AeroverseAIPayload,
  steps?: string[]
): PowerSystemPDFData {
  const config = payload.configuration as { battery?: Record<string, unknown>; solar?: Record<string, unknown>; loads?: Record<string, number>; location?: Record<string, unknown>; dayOfYear?: number } | undefined;
  const results = payload.results as { endurance_min?: number; endurance_hours?: number; solarFraction?: number; minPowerMargin_W?: number; maxVoltage?: number; minVoltage?: number; totalEnergyUsed_Wh?: number; totalSolarGenerated_Wh?: number; recommendations?: string[] } | undefined;
  const metadata = payload.metadata as { warnings?: string[] } | undefined;
  
  const defaultBattery = { chemistry: '', capacity_mAh: 0, series: 0, parallel: 0, cycles: 0, temperature: 0 };
  const defaultSolar = { area_m2: 0, efficiency: 0, mpptEfficiency: 0, tilt: 0, azimuth: 0 };
  const defaultLocation = { latitude: 0, longitude: 0, altitude: 0 };
  
  return {
    toolName: payload.toolName,
    requestId: payload.requestId || `power-${Date.now()}`,
    timestamp: new Date().toISOString(),
    inputs: {
      battery: { ...defaultBattery, ...config?.battery } as PowerSystemPDFData['inputs']['battery'],
      solar: { ...defaultSolar, ...config?.solar } as PowerSystemPDFData['inputs']['solar'],
      loads: (config?.loads || {}) as Record<string, number>,
      location: { ...defaultLocation, ...config?.location } as PowerSystemPDFData['inputs']['location'],
      dayOfYear: config?.dayOfYear || 0,
    },
    results: results as PowerSystemPDFData['results'],
    warnings: metadata?.warnings || [],
    recommendations: results?.recommendations || [],
    steps,
  };
}
