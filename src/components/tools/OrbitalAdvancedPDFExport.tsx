/**
 * PDF Export for Advanced Orbital Calculations
 * Generates HTML report with all step-by-step derivations for homework submissions
 */

import { useState } from 'react';
import { AeroButton } from '@/components/common/AeroButton';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AdvancedResult } from '@/lib/advancedOrbitalMechanics';
import type { PorkChopData } from './PorkChopPlot';

interface AdvancedPDFExportProps {
  energyResults?: AdvancedResult[] | null;
  j2Results?: AdvancedResult[] | null;
  maneuverResults?: AdvancedResult[];
  lambertResult?: AdvancedResult | null;
  interplanetaryResults?: AdvancedResult[];
  gravityAssistResults?: AdvancedResult[];
  porkChopData?: PorkChopData | null;
  orbitParams?: {
    semiMajorAxis: number;
    eccentricity: number;
    inclination_deg: number;
  };
}

function renderResultHTML(result: AdvancedResult): string {
  return `
    <div class="result-card">
      <div class="result-header">
        <span class="result-title">${result.title}</span>
        <span class="result-value">${result.value.toFixed(4)} ${result.unit}</span>
      </div>
      <div class="steps">
        ${result.steps.map((step, i) => `
          <div class="step">
            <div class="step-number">${i + 1}</div>
            <div class="step-content">
              <div class="step-label">${step.label}</div>
              <div class="step-equation">${step.equation}</div>
              <div class="step-substitution">${step.substitution}</div>
              <div class="step-result">→ ${step.result}</div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="interpretation">
        <div class="interp-label">Physical Interpretation</div>
        <p>${result.interpretation}</p>
      </div>
    </div>
  `;
}

function renderSectionHTML(title: string, results: AdvancedResult[]): string {
  if (!results || results.length === 0) return '';
  return `
    <div class="section">
      <h2>${title}</h2>
      ${results.map(r => renderResultHTML(r)).join('')}
    </div>
  `;
}

function renderPorkChopHTML(data: PorkChopData): string {
  return `
    <div class="section">
      <h2>Pork-Chop Plot Analysis: ${data.departPlanet} → ${data.arrivePlanet}</h2>
      <table>
        <tr><th>Parameter</th><th>Value</th></tr>
        <tr><td>Departure Planet</td><td>${data.departPlanet}</td></tr>
        <tr><td>Arrival Planet</td><td>${data.arrivePlanet}</td></tr>
        <tr><td>Optimal Departure</td><td>${data.minC3Depart}</td></tr>
        <tr><td>Optimal Arrival</td><td>${data.minC3Arrive}</td></tr>
        <tr><td>Minimum C₃ (total)</td><td class="highlight">${data.minC3.toFixed(4)} km²/s²</td></tr>
        <tr><td>Transfer Duration</td><td>${((new Date(data.minC3Arrive).getTime() - new Date(data.minC3Depart).getTime()) / 86400000).toFixed(0)} days</td></tr>
        <tr><td>Departure v∞</td><td>${Math.sqrt(data.minC3 / 2).toFixed(4)} km/s</td></tr>
      </table>
      <div class="interpretation">
        <div class="interp-label">Mission Planning Interpretation</div>
        <p>The pork-chop plot scanned ${data.departureDates.length} × ${data.arrivalDates.length} = ${data.departureDates.length * data.arrivalDates.length} transfer combinations. 
        The minimum energy transfer from ${data.departPlanet} to ${data.arrivePlanet} departs on ${data.minC3Depart} and arrives on ${data.minC3Arrive}, 
        requiring a combined C₃ of ${data.minC3.toFixed(2)} km²/s². Lower C₃ means less propellant, enabling either a smaller launch vehicle or more payload mass.</p>
      </div>
    </div>
  `;
}

export function generateAdvancedOrbitalPDF(props: AdvancedPDFExportProps): string {
  const timestamp = new Date().toLocaleString();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Advanced Orbital Mechanics Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 40px; color: #1e293b; line-height: 1.6; }
    .header { border-bottom: 3px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
    h1 { color: #10b981; font-size: 2.2em; margin-bottom: 8px; }
    h2 { color: #059669; margin-top: 30px; margin-bottom: 15px; font-size: 1.4em; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    .metadata { color: #64748b; font-size: 0.9em; }
    .section { margin: 30px 0; padding: 20px; background: #f8fafc; border-radius: 8px; page-break-inside: avoid; }
    .result-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; background: white; }
    .result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .result-title { font-size: 1.1em; font-weight: bold; color: #0f172a; }
    .result-value { font-size: 1.2em; font-weight: bold; color: #059669; font-family: monospace; }
    .steps { margin: 12px 0; }
    .step { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
    .step:last-child { border-bottom: none; }
    .step-number { width: 24px; height: 24px; background: #10b981; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; flex-shrink: 0; }
    .step-content { flex: 1; }
    .step-label { font-weight: 600; font-size: 0.95em; color: #1e293b; }
    .step-equation { font-family: monospace; color: #475569; font-size: 0.9em; margin: 2px 0; }
    .step-substitution { font-family: monospace; color: #64748b; font-size: 0.85em; }
    .step-result { font-family: monospace; font-weight: bold; color: #059669; margin-top: 4px; }
    .interpretation { background: #ecfdf5; border: 1px solid #10b981; border-radius: 6px; padding: 12px; margin-top: 12px; }
    .interp-label { font-size: 0.8em; text-transform: uppercase; letter-spacing: 0.05em; color: #059669; font-weight: bold; margin-bottom: 6px; }
    .interpretation p { font-size: 0.9em; color: #334155; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #0f172a; color: #10b981; font-weight: 600; }
    .highlight { color: #059669; font-weight: bold; font-family: monospace; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #64748b; font-size: 0.85em; }
    .orbit-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }
    .orbit-metric { background: white; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; text-align: center; }
    .orbit-metric-label { font-size: 0.8em; color: #64748b; }
    .orbit-metric-value { font-size: 1.4em; font-weight: bold; color: #059669; font-family: monospace; }
    @media print { body { margin: 20px; } .section { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Advanced Orbital Mechanics Report</h1>
    <p class="metadata">Generated: ${timestamp}</p>
    <p class="metadata">Aeroverse Engineering Tools — Homework Submission Report</p>
  </div>

  ${props.orbitParams ? `
    <div class="section">
      <h2>Orbit Parameters</h2>
      <div class="orbit-summary">
        <div class="orbit-metric">
          <div class="orbit-metric-label">Semi-Major Axis</div>
          <div class="orbit-metric-value">${props.orbitParams.semiMajorAxis.toFixed(2)} km</div>
        </div>
        <div class="orbit-metric">
          <div class="orbit-metric-label">Eccentricity</div>
          <div class="orbit-metric-value">${props.orbitParams.eccentricity.toFixed(6)}</div>
        </div>
        <div class="orbit-metric">
          <div class="orbit-metric-label">Inclination</div>
          <div class="orbit-metric-value">${props.orbitParams.inclination_deg.toFixed(2)}°</div>
        </div>
      </div>
    </div>
  ` : ''}

  ${renderSectionHTML('Energy & Momentum Analysis', props.energyResults || [])}
  ${renderSectionHTML('J2 Oblateness Perturbations', props.j2Results || [])}
  ${renderSectionHTML('Orbital Maneuver Analysis', props.maneuverResults || [])}
  ${props.lambertResult ? renderSectionHTML('Lambert Problem Solution', [props.lambertResult]) : ''}
  ${renderSectionHTML('Interplanetary Transfer', props.interplanetaryResults || [])}
  ${renderSectionHTML('Gravity Assist Analysis', props.gravityAssistResults || [])}
  ${props.porkChopData ? renderPorkChopHTML(props.porkChopData) : ''}

  <div class="footer">
    <p>Generated by Aeroverse Engineering Tools</p>
    <p>All calculations use standard Keplerian orbital mechanics with J2 perturbation corrections</p>
  </div>
</body>
</html>`;
}

export function AdvancedPDFExportButton(props: AdvancedPDFExportProps) {
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const hasData = (props.energyResults?.length || 0) > 0 
    || (props.j2Results?.length || 0) > 0
    || (props.maneuverResults?.length || 0) > 0
    || props.lambertResult
    || (props.interplanetaryResults?.length || 0) > 0
    || props.porkChopData;

  const handleExport = async () => {
    setExporting(true);
    try {
      const html = generateAdvancedOrbitalPDF(props);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
        setTimeout(() => win.print(), 500);
      }
      URL.revokeObjectURL(url);
      toast({ title: 'Report generated', description: 'Print dialog opened with full step-by-step derivations.' });
    } catch (err) {
      toast({ title: 'Export failed', description: String(err), variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <AeroButton
      variant="outline"
      size="sm"
      icon={Download}
      onClick={handleExport}
      disabled={!hasData || exporting}
    >
      {exporting ? 'Generating...' : 'Export Advanced PDF'}
    </AeroButton>
  );
}
