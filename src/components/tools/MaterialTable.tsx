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
  onMaterialClick: (material: Material) => void;
}

const MaterialTable = ({ materials, unitSystem, onMaterialClick }: MaterialTableProps) => {
  return (
    <div className="rounded-lg border border-cyan-400/20 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-800/50 border-b border-cyan-400/20">
              <TableHead className="text-cyan-400 font-semibold">Material Name</TableHead>
              <TableHead className="text-cyan-400 font-semibold">Category</TableHead>
              <TableHead className="text-cyan-400 font-semibold text-right">
                Density ({unitSystem === "SI" ? "kg/m³" : "lb/ft³"})
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-gray-400">
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
                  className="border-b border-cyan-400/10 hover:bg-cyan-400/5 cursor-pointer transition-colors"
                  onClick={() => onMaterialClick(material)}
                >
                  <TableCell className="text-white font-medium">{material.name}</TableCell>
                  <TableCell>
                    <Badge className="bg-cyan-400/20 text-cyan-400 border-cyan-400/30">
                      {material.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-cyan-400 font-semibold">
                    {unitSystem === "SI"
                      ? `${material.density.toLocaleString('en-US', { maximumFractionDigits: 0 })} kg/m³`
                      : `${convertDensityToImperial(material.density).toLocaleString('en-US', { maximumFractionDigits: 2 })} lb/ft³`}
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

