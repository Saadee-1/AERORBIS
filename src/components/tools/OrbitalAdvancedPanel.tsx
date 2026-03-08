/**
 * Advanced Orbital Analysis Panel
 * Full step-by-step derivations for advanced orbital mechanics topics
 * Physics: FROZEN — do not modify calculation logic
 */

import { useState, useMemo } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AeroCard } from '@/components/common/AeroCard';
import { AeroButton } from '@/components/common/AeroButton';
import { AeroFormField } from '@/components/forms/AeroFormField';
import {
  biEllipticTransfer,
  planeChangeManeuver,
  combinedManeuver,
  phasingOrbit,
  j2Perturbations,
  energyMomentumAnalysis,
  solveLambert,
  interplanetaryHohmann,
  R_EARTH,
  GM_EARTH,
  PLANETS,
  type AdvancedResult,
  type DerivationStep,
} from '@/lib/advancedOrbitalMechanics';
import { Rocket, Globe, Zap, Navigation, Atom, Orbit } from 'lucide-react';
import { PorkChopPlot, type PorkChopData } from './PorkChopPlot';
import { AdvancedPDFExportButton } from './OrbitalAdvancedPDFExport';
import { GravityAssistCalculator } from './GravityAssistCalculator';
import { LaunchVehicleC3Overlay } from './LaunchVehicleC3Overlay';

interface OrbitalAdvancedPanelProps {
  semiMajorAxis?: number;
  eccentricity?: number;
  inclination_deg?: number;
  gm?: number;
}

/** Render a single derivation step */
function StepRow({ step, index }: { step: DerivationStep; index: number }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-border/30 last:border-0">
      <div className="flex items-start gap-2">
        <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-foreground">{step.label}</div>
          <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{step.equation}</div>
          <div className="text-[11px] text-muted-foreground/80 font-mono">{step.substitution}</div>
          <div className="text-xs font-bold text-accent-foreground mt-0.5 font-mono">→ {step.result}</div>
        </div>
      </div>
    </div>
  );
}

/** Render a complete result with steps and interpretation */
function ResultCard({ result }: { result: AdvancedResult }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-bold text-foreground">{result.title}</span>
        <span className="text-sm font-mono font-bold text-primary">
          {result.value < 0 && result.unit === '°' ? 'N/A' : `${result.value.toFixed(4)} ${result.unit}`}
        </span>
      </div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-[10px] uppercase tracking-wider text-primary hover:text-primary/80 transition-colors font-semibold"
      >
        {expanded ? '▼ Hide Derivation' : '▶ Show Step-by-Step Derivation'}
      </button>
      {expanded && (
        <div className="mt-2 pl-1">
          {result.steps.map((step, i) => (
            <StepRow key={i} step={step} index={i} />
          ))}
          <div className="mt-3 p-2.5 rounded-md bg-primary/5 border border-primary/10">
            <div className="text-[10px] uppercase tracking-wider text-primary font-bold mb-1">Interpretation</div>
            <p className="text-xs text-muted-foreground leading-relaxed">{result.interpretation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function OrbitalAdvancedPanel({
  semiMajorAxis,
  eccentricity,
  inclination_deg,
  gm,
}: OrbitalAdvancedPanelProps) {
  // ── Maneuver inputs ──
  const [biellipticR1, setBiellipticR1] = useState('');
  const [biellipticR2, setBiellipticR2] = useState('');
  const [biellipticRb, setBiellipticRb] = useState('');
  const [planeR, setPlaneR] = useState('');
  const [planeDi, setPlaneDi] = useState('');
  const [combinedR1, setCombinedR1] = useState('');
  const [combinedR2, setCombinedR2] = useState('');
  const [combinedDi, setCombinedDi] = useState('');
  const [phaseR, setPhaseR] = useState('');
  const [phaseAngle, setPhaseAngle] = useState('');
  const [phaseK, setPhaseK] = useState('1');

  // ── Lambert inputs ──
  const [lambertR1, setLambertR1] = useState('');
  const [lambertR2, setLambertR2] = useState('');
  const [lambertDtheta, setLambertDtheta] = useState('');
  const [lambertTOF, setLambertTOF] = useState('');

  // ── Interplanetary inputs ──
  const [departPlanet, setDepartPlanet] = useState('earth');
  const [arrivePlanet, setArrivePlanet] = useState('mars');

  // ── Pork-chop data ──
  const [porkChopData, setPorkChopData] = useState<PorkChopData | null>(null);

  // ── Gravity assist results ──
  const [gravityAssistResults, setGravityAssistResults] = useState<AdvancedResult[]>([]);

  // ── Results ──
  const [maneuverResults, setManeuverResults] = useState<AdvancedResult[]>([]);
  const [lambertResult, setLambertResult] = useState<AdvancedResult | null>(null);
  const [interplanetaryResults, setInterplanetaryResults] = useState<AdvancedResult[]>([]);

  const mu = gm || GM_EARTH;

  // Auto-compute J2 and energy from current orbit params
  const j2Results = useMemo(() => {
    if (!semiMajorAxis || !eccentricity || inclination_deg === undefined) return null;
    return j2Perturbations(semiMajorAxis, eccentricity ?? 0, inclination_deg);
  }, [semiMajorAxis, eccentricity, inclination_deg]);

  const energyResults = useMemo(() => {
    if (!semiMajorAxis || eccentricity === undefined) return null;
    return energyMomentumAnalysis(semiMajorAxis, eccentricity ?? 0, mu);
  }, [semiMajorAxis, eccentricity, mu]);

  // ── Handlers ──
  const runBielliptic = () => {
    const r1 = parseFloat(biellipticR1) + R_EARTH;
    const r2 = parseFloat(biellipticR2) + R_EARTH;
    const rb = parseFloat(biellipticRb) + R_EARTH;
    if (isNaN(r1) || isNaN(r2) || isNaN(rb)) return;
    setManeuverResults(biEllipticTransfer(r1, r2, rb, mu));
  };

  const runPlaneChange = () => {
    const r = parseFloat(planeR) + R_EARTH;
    const di = parseFloat(planeDi);
    if (isNaN(r) || isNaN(di)) return;
    setManeuverResults([planeChangeManeuver(r, di, mu)]);
  };

  const runCombined = () => {
    const r1 = parseFloat(combinedR1) + R_EARTH;
    const r2 = parseFloat(combinedR2) + R_EARTH;
    const di = parseFloat(combinedDi);
    if (isNaN(r1) || isNaN(r2) || isNaN(di)) return;
    setManeuverResults([combinedManeuver(r1, r2, di, mu)]);
  };

  const runPhasing = () => {
    const r = parseFloat(phaseR) + R_EARTH;
    const angle = parseFloat(phaseAngle);
    const k = parseInt(phaseK) || 1;
    if (isNaN(r) || isNaN(angle)) return;
    setManeuverResults([phasingOrbit(r, angle, k, mu)]);
  };

  const runLambert = () => {
    const r1 = parseFloat(lambertR1);
    const r2 = parseFloat(lambertR2);
    const dtheta = parseFloat(lambertDtheta);
    const tof = parseFloat(lambertTOF) * 3600; // hours to seconds
    if (isNaN(r1) || isNaN(r2) || isNaN(dtheta) || isNaN(tof)) return;
    setLambertResult(solveLambert(r1, r2, dtheta, tof, mu));
  };

  const runInterplanetary = () => {
    setInterplanetaryResults(interplanetaryHohmann(departPlanet, arrivePlanet));
  };

  return (
    <div className="space-y-4">
      {/* ═══ PDF EXPORT BUTTON ═══ */}
      <div className="flex justify-end">
        <AdvancedPDFExportButton
          energyResults={energyResults}
          j2Results={j2Results}
          maneuverResults={maneuverResults}
          lambertResult={lambertResult}
          interplanetaryResults={interplanetaryResults}
          gravityAssistResults={gravityAssistResults}
          porkChopData={porkChopData}
          orbitParams={semiMajorAxis && eccentricity !== undefined && inclination_deg !== undefined ? {
            semiMajorAxis,
            eccentricity: eccentricity ?? 0,
            inclination_deg: inclination_deg ?? 0,
          } : undefined}
        />
      </div>
      {energyResults && (
        <AeroCard title="Energy & Momentum Analysis" icon={Atom}>
          <p className="text-xs text-muted-foreground mb-3">
            Auto-computed from current orbit (a = {semiMajorAxis?.toFixed(1)} km, e = {eccentricity})
          </p>
          {energyResults.map((r, i) => <ResultCard key={`energy-${i}`} result={r} />)}
        </AeroCard>
      )}

      {/* ═══ J2 PERTURBATIONS (Auto from current orbit) ═══ */}
      {j2Results && (
        <AeroCard title="J2 Oblateness Perturbations" icon={Globe}>
          <p className="text-xs text-muted-foreground mb-3">
            Effects of Earth's equatorial bulge on current orbit (i = {inclination_deg?.toFixed(1)}°)
          </p>
          {j2Results.map((r, i) => <ResultCard key={`j2-${i}`} result={r} />)}
        </AeroCard>
      )}

      {/* ═══ ADVANCED MANEUVERS ═══ */}
      <AeroCard title="Advanced Maneuver Calculator" icon={Rocket}>
        <Accordion type="single" collapsible className="w-full">
          {/* Bi-elliptic */}
          <AccordionItem value="bielliptic">
            <AccordionTrigger className="text-sm font-semibold">
              <span className="flex items-center gap-2"><Navigation className="w-4 h-4 text-primary" /> Bi-Elliptic Transfer</span>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-xs text-muted-foreground mb-3">Three-burn transfer via an intermediate apoapsis. More efficient than Hohmann when r₂/r₁ &gt; 11.94.</p>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <AeroFormField label="Initial Alt (km)">
                  <Input type="number" value={biellipticR1} onChange={e => setBiellipticR1(e.target.value)} placeholder="400" className="bg-muted/50" />
                </AeroFormField>
                <AeroFormField label="Target Alt (km)">
                  <Input type="number" value={biellipticR2} onChange={e => setBiellipticR2(e.target.value)} placeholder="35786" className="bg-muted/50" />
                </AeroFormField>
                <AeroFormField label="Intermediate Alt (km)">
                  <Input type="number" value={biellipticRb} onChange={e => setBiellipticRb(e.target.value)} placeholder="100000" className="bg-muted/50" />
                </AeroFormField>
              </div>
              <AeroButton onClick={runBielliptic} variant="primary" icon={Rocket} className="w-full">Calculate Bi-Elliptic Transfer</AeroButton>
            </AccordionContent>
          </AccordionItem>

          {/* Plane Change */}
          <AccordionItem value="planechange">
            <AccordionTrigger className="text-sm font-semibold">
              <span className="flex items-center gap-2"><Orbit className="w-4 h-4 text-primary" /> Plane Change (Inclination)</span>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-xs text-muted-foreground mb-3">Pure inclination change at constant altitude. The most expensive type of maneuver.</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <AeroFormField label="Orbit Altitude (km)">
                  <Input type="number" value={planeR} onChange={e => setPlaneR(e.target.value)} placeholder="400" className="bg-muted/50" />
                </AeroFormField>
                <AeroFormField label="Inclination Change (°)">
                  <Input type="number" value={planeDi} onChange={e => setPlaneDi(e.target.value)} placeholder="28.5" className="bg-muted/50" />
                </AeroFormField>
              </div>
              <AeroButton onClick={runPlaneChange} variant="primary" icon={Orbit} className="w-full">Calculate Plane Change</AeroButton>
            </AccordionContent>
          </AccordionItem>

          {/* Combined Maneuver */}
          <AccordionItem value="combined">
            <AccordionTrigger className="text-sm font-semibold">
              <span className="flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> Combined Altitude + Plane Change</span>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-xs text-muted-foreground mb-3">Optimal single-burn combining altitude transfer with inclination change. Always more efficient than separate maneuvers.</p>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <AeroFormField label="Initial Alt (km)">
                  <Input type="number" value={combinedR1} onChange={e => setCombinedR1(e.target.value)} placeholder="400" className="bg-muted/50" />
                </AeroFormField>
                <AeroFormField label="Target Alt (km)">
                  <Input type="number" value={combinedR2} onChange={e => setCombinedR2(e.target.value)} placeholder="800" className="bg-muted/50" />
                </AeroFormField>
                <AeroFormField label="Δi (°)">
                  <Input type="number" value={combinedDi} onChange={e => setCombinedDi(e.target.value)} placeholder="10" className="bg-muted/50" />
                </AeroFormField>
              </div>
              <AeroButton onClick={runCombined} variant="primary" icon={Zap} className="w-full">Calculate Combined Maneuver</AeroButton>
            </AccordionContent>
          </AccordionItem>

          {/* Phasing */}
          <AccordionItem value="phasing">
            <AccordionTrigger className="text-sm font-semibold">
              <span className="flex items-center gap-2"><Navigation className="w-4 h-4 text-primary" /> Phasing Orbit (Rendezvous)</span>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-xs text-muted-foreground mb-3">Adjust phase angle to rendezvous with a target at the same altitude.</p>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <AeroFormField label="Orbit Alt (km)">
                  <Input type="number" value={phaseR} onChange={e => setPhaseR(e.target.value)} placeholder="400" className="bg-muted/50" />
                </AeroFormField>
                <AeroFormField label="Phase Angle (°)">
                  <Input type="number" value={phaseAngle} onChange={e => setPhaseAngle(e.target.value)} placeholder="30" className="bg-muted/50" />
                </AeroFormField>
                <AeroFormField label="Revolutions (k)">
                  <Input type="number" value={phaseK} onChange={e => setPhaseK(e.target.value)} placeholder="1" min="1" className="bg-muted/50" />
                </AeroFormField>
              </div>
              <AeroButton onClick={runPhasing} variant="primary" icon={Navigation} className="w-full">Calculate Phasing Orbit</AeroButton>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Maneuver results */}
        {maneuverResults.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="text-sm font-bold text-foreground mb-3">Results</h4>
            {maneuverResults.map((r, i) => <ResultCard key={`maneuver-${i}`} result={r} />)}
          </div>
        )}
      </AeroCard>

      {/* ═══ LAMBERT PROBLEM ═══ */}
      <AeroCard title="Lambert Problem Solver" icon={Navigation}>
        <p className="text-xs text-muted-foreground mb-3">
          Find the transfer orbit connecting two positions in a given time — the fundamental problem of orbital mechanics.
        </p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <AeroFormField label="|r₁| (km)">
            <Input type="number" value={lambertR1} onChange={e => setLambertR1(e.target.value)} placeholder="6771" className="bg-muted/50" />
          </AeroFormField>
          <AeroFormField label="|r₂| (km)">
            <Input type="number" value={lambertR2} onChange={e => setLambertR2(e.target.value)} placeholder="42164" className="bg-muted/50" />
          </AeroFormField>
          <AeroFormField label="Transfer Angle Δθ (°)">
            <Input type="number" value={lambertDtheta} onChange={e => setLambertDtheta(e.target.value)} placeholder="120" className="bg-muted/50" />
          </AeroFormField>
          <AeroFormField label="Time of Flight (hours)">
            <Input type="number" value={lambertTOF} onChange={e => setLambertTOF(e.target.value)} placeholder="5" className="bg-muted/50" />
          </AeroFormField>
        </div>
        <AeroButton onClick={runLambert} variant="primary" icon={Navigation} className="w-full">Solve Lambert Problem</AeroButton>
        {lambertResult && (
          <div className="mt-4 pt-4 border-t border-border">
            <ResultCard result={lambertResult} />
          </div>
        )}
      </AeroCard>

      {/* ═══ INTERPLANETARY ═══ */}
      <AeroCard title="Interplanetary Transfer Calculator" icon={Globe}>
        <p className="text-xs text-muted-foreground mb-3">
          Hohmann transfer between planets with departure/arrival C₃, phase angles, and launch windows.
        </p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <AeroFormField label="Departure Planet">
            <Select value={departPlanet} onValueChange={setDepartPlanet}>
              <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PLANETS).map(([key, p]) => (
                  <SelectItem key={key} value={key}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AeroFormField>
          <AeroFormField label="Arrival Planet">
            <Select value={arrivePlanet} onValueChange={setArrivePlanet}>
              <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PLANETS).filter(([k]) => k !== departPlanet).map(([key, p]) => (
                  <SelectItem key={key} value={key}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AeroFormField>
        </div>
        <AeroButton onClick={runInterplanetary} variant="primary" icon={Globe} className="w-full">Calculate Interplanetary Transfer</AeroButton>
        {interplanetaryResults.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            {interplanetaryResults.map((r, i) => <ResultCard key={`interp-${i}`} result={r} />)}
          </div>
        )}
      </AeroCard>
      {/* ═══ PORK-CHOP PLOT ═══ */}
      <PorkChopPlot onExportData={setPorkChopData} />

      {/* ═══ GRAVITY ASSIST ═══ */}
      <GravityAssistCalculator onResults={setGravityAssistResults} />

      {/* ═══ LAUNCH VEHICLE C3 OVERLAY ═══ */}
      <LaunchVehicleC3Overlay 
        missionC3={porkChopData?.minC3 || (interplanetaryResults.length > 0 ? interplanetaryResults[0]?.value * interplanetaryResults[0]?.value : undefined)}
        missionName={porkChopData ? `${porkChopData.departPlanet}→${porkChopData.arrivePlanet}` : undefined}
      />
    </div>
  );
}
