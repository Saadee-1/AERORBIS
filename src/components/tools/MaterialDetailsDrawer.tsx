"use client";

import { Material, UnitSystem } from "./types";
import { convertDensityToImperial } from "./unitConversion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Database, Ruler, Info } from "lucide-react";
import { AskAIButton } from "@/components/tools/AskAIButton";
import { PDFExportButton } from "@/components/tools/PDFExportButton";
import type { AeroverseAIPayload } from "@/ai/schema/AerorbisPayload";

interface MaterialDetailsDrawerProps {
  material: Material | null;
  unitSystem: UnitSystem;
  isOpen: boolean;
  onClose: () => void;
  requestId: string | null;
  payload: AeroverseAIPayload | null;
}

const MaterialDetailsDrawer = ({
  material,
  unitSystem,
  isOpen,
  onClose,
  requestId,
  payload,
}: MaterialDetailsDrawerProps) => {
  if (!material) return null;

  const densityImperial = convertDensityToImperial(material.density);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="bg-background border-l border-primary/20 text-foreground overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-8 h-8 text-primary" />
            <SheetTitle className="text-2xl text-white">{material.name}</SheetTitle>
          </div>
          <SheetDescription className="text-gray-400">
            Detailed material properties and specifications
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Category Badge */}
          <div>
            <p className="text-sm text-gray-400 mb-2">Category</p>
            <Badge className="bg-primary/20 text-primary border-primary/30 text-lg px-4 py-2">
              {material.category}
            </Badge>
          </div>

          {/* Density Information */}
          <div className="p-4 bg-card/50 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-4">
              <Ruler className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-white">Density</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">SI Units:</span>
                <span className="text-primary font-bold text-lg">
                  {material.density.toLocaleString('en-US', { maximumFractionDigits: 0 })} kg/m³
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Imperial Units:</span>
                <span className="text-primary font-bold text-lg">
                  {densityImperial.toLocaleString('en-US', { maximumFractionDigits: 2 })} lb/ft³
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="p-4 bg-card/50 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-white">Description</h3>
            </div>
            <p className="text-gray-300 leading-relaxed">{material.description}</p>
          </div>

          {/* Comparison Info */}
          <div className="p-4 bg-gradient-to-r from-primary/10 to-emerald-400/10 rounded-lg border border-primary/30">
            <p className="text-sm text-muted-foreground">
              <span className="text-primary font-semibold">Note:</span> Density values are stored
              internally in SI units (kg/m³). All conversions are calculated dynamically.
            </p>
          </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <AskAIButton
                requestId={requestId}
                payload={payload || undefined}
                disabled={!payload}
              />
              <PDFExportButton
                requestId={requestId}
                toolName="Materials Density Database"
                disabled={!requestId}
              />
            </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MaterialDetailsDrawer;

