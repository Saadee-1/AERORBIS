"use client";

import { useState, useMemo, useEffect } from "react";
import { Material, UnitSystem } from "./types";
import { convertDensityToImperial } from "./unitConversion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";

interface MaterialTableProps {
  materials: Material[];
  unitSystem: UnitSystem;
  customUnitName?: string;
  customFactor?: string;
  onMaterialClick: (material: Material) => void;
}

type SortKey = "name" | "category" | "density";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 25;

const MaterialTable = ({ materials, unitSystem, customUnitName, customFactor, onMaterialClick }: MaterialTableProps) => {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(0);

  const convertDensityToCustom = (densitySI: number): number => {
    if (unitSystem !== "Custom" || !customFactor) return densitySI;
    const factor = parseFloat(customFactor);
    if (!isNaN(factor) && factor > 0) return densitySI / factor;
    return densitySI;
  };

  const getDensityUnit = (): string => {
    if (unitSystem === "SI") return "kg/m³";
    if (unitSystem === "Imperial") return "lb/ft³";
    return customUnitName || "Unit";
  };

  const fmtDensity = (material: Material): string => {
    if (unitSystem === "SI") {
      return `${material.density.toLocaleString('en-US', { maximumFractionDigits: 0 })} kg/m³`;
    } else if (unitSystem === "Imperial") {
      return `${convertDensityToImperial(material.density).toLocaleString('en-US', { maximumFractionDigits: 2 })} lb/ft³`;
    } else {
      const d = convertDensityToCustom(material.density);
      return `${d.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${getDensityUnit()}`;
    }
  };

  const sorted = useMemo(() => {
    const arr = [...materials];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "category") cmp = a.category.localeCompare(b.category);
      else cmp = a.density - b.density;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [materials, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page when materials change
  useEffect(() => setPage(0), [materials]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />;
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="bg-muted/80 backdrop-blur-sm border-b border-border">
                <TableHead className="text-primary font-semibold cursor-pointer select-none" onClick={() => toggleSort("name")}>
                  Material <SortIcon col="name" />
                </TableHead>
                <TableHead className="text-primary font-semibold cursor-pointer select-none" onClick={() => toggleSort("category")}>
                  Category <SortIcon col="category" />
                </TableHead>
                <TableHead className="text-primary font-semibold text-right cursor-pointer select-none" onClick={() => toggleSort("density")}>
                  Density ({getDensityUnit()}) <SortIcon col="density" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    No materials found matching your search criteria
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((material, index) => (
                  <TableRow
                    key={`${material.name}-${index}`}
                    className="border-b border-border/50 hover:bg-primary/5 cursor-pointer transition-colors"
                    onClick={() => onMaterialClick(material)}
                  >
                    <TableCell className="text-foreground font-medium text-sm">{material.name}</TableCell>
                    <TableCell>
                      <Badge className="bg-primary/20 text-primary border-border text-[10px]">
                        {material.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-primary font-semibold text-sm">
                      {fmtDensity(material)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              Prev
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialTable;
