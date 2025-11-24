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
import { generatePdfReport, downloadHTMLAsPDF, loadPolar, generateCharts } from "@/lib/pdfExport";
import { useToast } from "@/hooks/use-toast";

interface LdPdfButtonProps {
  airfoilId: string;
  re: number;
  polarData?: {
    alpha: number[];
    cl: number[];
    cd: number[];
    cm?: number[];
  };
  disabled?: boolean;
}

export function LdPdfButton({ airfoilId, re, polarData, disabled }: LdPdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    if (disabled || !polarData) {
      toast({
        title: "Error",
        description: "Polar data is required to generate the report.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Load polar data to get full structure
      const fullPolar = await loadPolar(airfoilId, re);
      if (!fullPolar) {
        // Fallback: construct polar from provided data
        const constructedPolar = {
          airfoil: airfoilId,
          re: re,
          mach: 0.0,
          alpha: polarData.alpha,
          cl: polarData.cl,
          cd: polarData.cd,
          cm: polarData.cm,
        };
        
        // Generate charts using the helper function
        const generatedCharts = await generateCharts(constructedPolar);
        const chartImages = {
          cl: generatedCharts.clChart,
          cd: generatedCharts.cdChart,
          cm: generatedCharts.cmChart,
          ld: generatedCharts.ldChart,
        };

        // Generate PDF HTML
        const html = await generatePdfReport(airfoilId, re, chartImages);
        
        // Download as PDF
        const filename = `Aerodynamic_Report_${airfoilId}_Re${re >= 1000000 ? (re / 1000000).toFixed(0) + 'M' : (re / 1000).toFixed(0) + 'k'}.pdf`;
        await downloadHTMLAsPDF(html, filename);
      } else {
        // Use full polar data - generate charts
        const generatedCharts = await generateCharts(fullPolar);
        const chartImages = {
          cl: generatedCharts.clChart,
          cd: generatedCharts.cdChart,
          cm: generatedCharts.cmChart,
          ld: generatedCharts.ldChart,
        };

        // Generate PDF HTML
        const html = await generatePdfReport(airfoilId, re, chartImages);

        // Download as PDF
        const filename = `Aerodynamic_Report_${airfoilId}_Re${re >= 1000000 ? (re / 1000000).toFixed(0) + 'M' : (re / 1000).toFixed(0) + 'k'}.pdf`;
        await downloadHTMLAsPDF(html, filename);
      }

      toast({
        title: "Success",
        description: "NASA aerodynamic report generated successfully!",
      });
    } catch (error) {
      console.error('Error generating PDF report:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate PDF report.",
        variant: "destructive",
      });
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
            disabled={disabled || isGenerating || !polarData}
            variant="default"
            className="bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-400/40"
            style={{ height: 'auto', fontSize: '14px' }}
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

