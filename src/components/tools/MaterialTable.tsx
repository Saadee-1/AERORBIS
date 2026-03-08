"use client";

import { Material, UnitSystem } from "./types";
import { convertDensityToImperial, formatDensity } from "./unitConversion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface MaterialTableProps {
  materials: Material[];
  unitSystem: UnitSystem;
  customUnitName?: string;
  customFactor?: string;
  onMaterialClick: (material: Material) => void;
}

const MaterialTable = ({ materials, unitSystem, customUnitName, customFactor, onMaterialClick }: MaterialTableProps) => {
  const convertDensityToCustom = (densitySI: number): number => {
    if (unitSystem !== "Custom" || !customFactor) return densitySI;
    const factor = parseFloat(customFactor);
    if (!isNaN(factor) && factor > 0) {
      return densitySI / factor;
    }
    return densitySI;
  };

  const getDensityUnit = (): string => {
    if (unitSystem === "SI") return "kg/m³";
    if (unitSystem === "Imperial") return "lb/ft³";
    return customUnitName || "Unit";
  };

  const formatDensity = (material: Material): string => {
    if (unitSystem === "SI") {
      return `${material.density.toLocaleString('en-US', { maximumFractionDigits: 0 })} kg/m³`;
    } else if (unitSystem === "Imperial") {
      return `${convertDensityToImperial(material.density).toLocaleString('en-US', { maximumFractionDigits: 2 })} lb/ft³`;
    } else {
      const customDensity = convertDensityToCustom(material.density);
      return `${customDensity.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${getDensityUnit()}`;
    }
  };
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 border-b border-border">
              <TableHead className="text-primary font-semibold">Material Name</TableHead>
              <TableHead className="text-primary font-semibold">Category</TableHead>
              <TableHead className="text-primary font-semibold text-right">
                Density ({getDensityUnit()})
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  No materials found matching your search criteria
                </TableCell>
              </TableRow>
            ) : (
              materials.map((material, index) => (
                <motion.tr
                  key={`${material.name}-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="border-b border-border/50 hover:bg-primary/5 cursor-pointer transition-colors"
                  onClick={() => onMaterialClick(material)}
                >
                  <TableCell className="text-foreground font-medium">{material.name}</TableCell>
                  <TableCell>
                    <Badge className="bg-primary/20 text-primary border-border">
                      {material.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-primary font-semibold">
                    {formatDensity(material)}
                  </TableCell>
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default MaterialTable;
