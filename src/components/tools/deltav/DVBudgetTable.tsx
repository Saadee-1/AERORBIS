"use client";

import { DeltaVBreakdown, StageResult } from "./types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, CheckCircle, XCircle } from "lucide-react";

type UnitSystem = "SI" | "Imperial" | "Custom";

interface DVBudgetTableProps {
  breakdown: DeltaVBreakdown;
  stageResults: StageResult[];
  unitSystem: UnitSystem;
  customUnitName?: string;
  customFactor?: string;
}

const DVBudgetTable = ({ breakdown, stageResults, unitSystem, customUnitName, customFactor }: DVBudgetTableProps) => {
  const formatDeltaV = (value: number): string => {
    let converted = value;
    let unit = "m/s";
    
    if (unitSystem === "Imperial") {
      converted = value * 3.28084; // m/s to ft/s
      unit = "ft/s";
    } else if (unitSystem === "Custom") {
      const factor = parseFloat(customFactor || "1.0");
      if (!isNaN(factor) && factor > 0) {
        converted = value / factor; // Convert from SI (m/s) to custom
      }
      unit = customUnitName || "Unit";
    }
    
    return `${converted.toFixed(1)} ${unit}`;
  };

  return (
    <div className="space-y-6">
      {/* Mission Δv Budget */}
      <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-cyan-400" />
            Mission Δv Budget
          </CardTitle>
          <CardDescription className="text-gray-400">
            Total required Δv breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-900/50 border-b border-cyan-400/20">
                <TableHead className="text-cyan-400 font-semibold">Component</TableHead>
                <TableHead className="text-cyan-400 font-semibold text-right">Δv</TableHead>
                <TableHead className="text-cyan-400 font-semibold">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-cyan-400/10">
                <TableCell className="text-white">Orbital Δv</TableCell>
                <TableCell className="text-right text-cyan-400 font-semibold">
                  {formatDeltaV(breakdown.orbitalDeltaV)}
                </TableCell>
                <TableCell className="text-gray-400 text-sm">
                  Circularization at target altitude
                </TableCell>
              </TableRow>
              {breakdown.hohmannDeltaV > 0 && (
                <TableRow className="border-cyan-400/10">
                  <TableCell className="text-white">Hohmann Transfer</TableCell>
                  <TableCell className="text-right text-cyan-400 font-semibold">
                    {formatDeltaV(breakdown.hohmannDeltaV)}
                  </TableCell>
                  <TableCell className="text-gray-400 text-sm">
                    Transfer between orbits
                  </TableCell>
                </TableRow>
              )}
              {breakdown.planeChangeDeltaV > 0 && (
                <TableRow className="border-cyan-400/10">
                  <TableCell className="text-white">Plane Change</TableCell>
                  <TableCell className="text-right text-cyan-400 font-semibold">
                    {formatDeltaV(breakdown.planeChangeDeltaV)}
                  </TableCell>
                  <TableCell className="text-gray-400 text-sm">
                    Inclination change
                  </TableCell>
                </TableRow>
              )}
              <TableRow className="border-cyan-400/10">
                <TableCell className="text-white">Gravity Loss</TableCell>
                <TableCell className="text-right text-cyan-400 font-semibold">
                  {formatDeltaV(breakdown.gravityLoss)}
                </TableCell>
                <TableCell className="text-gray-400 text-sm">
                  Ascent trajectory losses
                </TableCell>
              </TableRow>
              <TableRow className="border-cyan-400/10">
                <TableCell className="text-white">Drag Loss</TableCell>
                <TableCell className="text-right text-cyan-400 font-semibold">
                  {formatDeltaV(breakdown.dragLoss)}
                </TableCell>
                <TableCell className="text-gray-400 text-sm">
                  Atmospheric drag
                </TableCell>
              </TableRow>
              <TableRow className="border-cyan-400/10">
                <TableCell className="text-white">Steering Loss</TableCell>
                <TableCell className="text-right text-cyan-400 font-semibold">
                  {formatDeltaV(breakdown.steeringLoss)}
                </TableCell>
                <TableCell className="text-gray-400 text-sm">
                  Trajectory inefficiency
                </TableCell>
              </TableRow>
              <TableRow className="border-t-2 border-cyan-400/30 bg-slate-900/30">
                <TableCell className="text-white font-bold">Total Required</TableCell>
                <TableCell className="text-right text-cyan-400 font-bold text-lg">
                  {formatDeltaV(breakdown.totalRequired)}
                </TableCell>
                <TableCell className="text-gray-400 text-sm">
                  Sum of all components
                </TableCell>
              </TableRow>
              <TableRow className="border-cyan-400/10 bg-slate-900/30">
                <TableCell className="text-white font-semibold">With Margin</TableCell>
                <TableCell className="text-right text-yellow-400 font-semibold">
                  {formatDeltaV(breakdown.totalWithMargin)}
                </TableCell>
                <TableCell className="text-gray-400 text-sm">
                  Including reserve margin
                </TableCell>
              </TableRow>
              <TableRow className="border-cyan-400/10 bg-slate-900/30">
                <TableCell className="text-white font-semibold">Achievable</TableCell>
                <TableCell className="text-right font-semibold text-lg">
                  <span className={breakdown.isFeasible ? "text-green-400" : "text-red-400"}>
                    {formatDeltaV(breakdown.totalAchievable)}
                  </span>
                </TableCell>
                <TableCell className="text-gray-400 text-sm flex items-center gap-2">
                  {breakdown.isFeasible ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      Mission feasible
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-400" />
                      Insufficient Δv
                    </>
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Stage Results */}
      <Card className="bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-white">Stage Performance</CardTitle>
          <CardDescription className="text-gray-400">
            Per-stage Δv and mass breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stageResults.map((result, index) => (
              <div
                key={result.stage.id}
                className="p-4 bg-slate-900/50 rounded-lg border border-cyan-400/10"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-white font-semibold text-lg">
                    {result.stage.name || `Stage ${index + 1}`}
                  </h4>
                  <Badge
                    className={
                      result.isFeasible
                        ? "bg-green-400/20 text-green-400 border-green-400/30"
                        : "bg-red-400/20 text-red-400 border-red-400/30"
                    }
                  >
                    {result.isFeasible ? (
                      <CheckCircle className="w-3 h-3 mr-1" />
                    ) : (
                      <XCircle className="w-3 h-3 mr-1" />
                    )}
                    {result.isFeasible ? "Feasible" : "Insufficient"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Initial Mass</p>
                    <p className="text-cyan-400 font-semibold">
                      {(result.initialMass / 1000).toFixed(1)} t
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Final Mass</p>
                    <p className="text-cyan-400 font-semibold">
                      {(result.finalMass / 1000).toFixed(1)} t
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Achievable Δv</p>
                    <p className="text-cyan-400 font-semibold">
                      {formatDeltaV(result.achievableDeltaV)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Required Δv</p>
                    <p className="text-yellow-400 font-semibold">
                      {formatDeltaV(result.requiredDeltaV)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-cyan-400/10 grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <p className="text-gray-400">Isp: {result.effectiveIsp.toFixed(1)} s</p>
                  </div>
                  <div>
                    <p className="text-gray-400">
                      Mass Ratio: {result.massRatio.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">
                      Propellant: {(result.propellantMass / 1000).toFixed(1)} t
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DVBudgetTable;

