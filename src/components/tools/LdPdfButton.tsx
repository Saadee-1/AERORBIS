"use client";

/**
 * L/D Analyzer PDF Export Button
 * 
 * Generates NASA-style aerodynamic reports from polar data
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { exportPdfForAirfoils } from "@/lib/pdfExport";
import { safeToFixed } from "@/lib/safeNumbers";
import { useToast } from "@/hooks/use-toast";

interface LdPdfButtonProps {
  selectedAirfoils: string[];
  re: number;
  disabled?: boolean;
}

export function LdPdfButton({ selectedAirfoils, re, disabled }: LdPdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    if (disabled || !selectedAirfoils || selectedAirfoils.length === 0) {
      toast({
        title: "Error",
        description: "At least one airfoil must be selected.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Call the orchestrator function
      const pdfBlob = await exportPdfForAirfoils(selectedAirfoils, {
        re,
        onProgress: (progress) => {
          // Optional: show progress if needed
          console.log(`PDF generation progress: ${(progress * 100).toFixed(0)}%`);
        },
      });

      // Trigger download using blob URL
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      const airfoilName = selectedAirfoils[0];
      const reStr = re >= 1000000 
        ? `${safeToFixed(re / 1000000, 0)}M` 
        : `${safeToFixed(re / 1000, 0)}k`;
      link.download = `Aerodynamic_Report_${airfoilName}_Re${reStr}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "NASA aerodynamic report generated successfully!",
      });
    } catch (error) {
      console.error('Error generating PDF report:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate PDF report.";
      // Check if it's a font loading error
      if (errorMessage.includes('font loading failed') || errorMessage.includes('Unicode export unavailable')) {
        toast({
          title: "Font Loading Error",
          description: "PDF font loading failed — Unicode export unavailable.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleExport}
            disabled={disabled || isGenerating || !selectedAirfoils || selectedAirfoils.length === 0}
            variant="default"
            className="bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-400/40"
            style={{ height: 'auto', fontSize: '14px' }}
            aria-label="Export PDF - Generate full NASA-style aerodynamic report"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 mr-2" />
                Export PDF
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Generate full NASA-style aerodynamic report</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

