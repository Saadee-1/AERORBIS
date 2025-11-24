"use client";

/**
 * L/D Analyzer PDF Export Button
 * 
 * Generates NASA-style aerodynamic reports from polar data
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { generatePdfReport, downloadHTMLAsPDF } from "@/lib/pdfExport";
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

/**
 * Generate chart image from polar data using canvas
 */
async function generateChartImageFromData(
  data: Array<{ x: number; y: number }>,
  title: string,
  xLabel: string,
  yLabel: string,
  color: string = "#22d3ee"
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      resolve('');
      return;
    }

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 800, 400);

    // Margins
    const margin = { top: 50, right: 50, bottom: 70, left: 90 };
    const plotWidth = 800 - margin.left - margin.right;
    const plotHeight = 400 - margin.top - margin.bottom;

    // Find data range
    const xValues = data.map(d => d.x);
    const yValues = data.map(d => d.y);
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);

    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;

    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const x = margin.left + (i / gridLines) * plotWidth;
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, 400 - margin.bottom);
      ctx.stroke();

      const y = margin.top + (i / gridLines) * plotHeight;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(800 - margin.right, y);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, 400 - margin.bottom);
    ctx.lineTo(800 - margin.right, 400 - margin.bottom);
    ctx.stroke();

    // Draw data line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    for (let i = 0; i < data.length; i++) {
      const x = margin.left + ((data[i].x - xMin) / xRange) * plotWidth;
      const y = 400 - margin.bottom - ((data[i].y - yMin) / yRange) * plotHeight;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Draw data points
    ctx.fillStyle = color;
    for (let i = 0; i < data.length; i++) {
      const x = margin.left + ((data[i].x - xMin) / xRange) * plotWidth;
      const y = 400 - margin.bottom - ((data[i].y - yMin) / yRange) * plotHeight;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Title
    ctx.fillStyle = '#1a1a1a';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title, 400, 30);

    // X-axis label
    ctx.font = '14px Arial';
    ctx.fillText(xLabel, 400, 390);

    // Y-axis label
    ctx.save();
    ctx.translate(25, 200);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();

    // X-axis ticks and labels
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
      const value = xMin + (i / 5) * xRange;
      const x = margin.left + (i / 5) * plotWidth;
      ctx.fillText(value.toFixed(1), x, 400 - margin.bottom + 20);
    }

    // Y-axis ticks and labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const value = yMin + (i / 5) * yRange;
      const y = margin.top + (1 - i / 5) * plotHeight;
      ctx.fillText(value.toFixed(3), margin.left - 10, y + 4);
    }

    resolve(canvas.toDataURL('image/png'));
  });
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
      // Generate chart images
      const chartImages: { cl: string; cd: string; cm: string; ld: string } = {
        cl: '',
        cd: '',
        cm: '',
        ld: '',
      };

      // Cl vs α
      const clData = polarData.alpha.map((alpha, i) => ({
        x: alpha,
        y: polarData.cl[i],
      }));
      chartImages.cl = await generateChartImageFromData(
        clData,
        'Lift Coefficient vs. Angle of Attack',
        'Angle of Attack, α (degrees)',
        'Lift Coefficient, Cl',
        '#0066cc'
      );

      // Cd vs α
      const cdData = polarData.alpha.map((alpha, i) => ({
        x: alpha,
        y: polarData.cd[i],
      }));
      chartImages.cd = await generateChartImageFromData(
        cdData,
        'Drag Coefficient vs. Angle of Attack',
        'Angle of Attack, α (degrees)',
        'Drag Coefficient, Cd',
        '#cc0000'
      );

      // Cm vs α (if available)
      if (polarData.cm && polarData.cm.length > 0) {
        const cmData = polarData.alpha.map((alpha, i) => ({
          x: alpha,
          y: polarData.cm[i],
        }));
        chartImages.cm = await generateChartImageFromData(
          cmData,
          'Pitching Moment Coefficient vs. Angle of Attack',
          'Angle of Attack, α (degrees)',
          'Pitching Moment Coefficient, Cm',
          '#00aa00'
        );
      }

      // L/D vs α
      const ldData = polarData.alpha.map((alpha, i) => {
        const ld = polarData.cd[i] > 0 ? polarData.cl[i] / polarData.cd[i] : 0;
        return { x: alpha, y: ld };
      });
      chartImages.ld = await generateChartImageFromData(
        ldData,
        'Lift-to-Drag Ratio vs. Angle of Attack',
        'Angle of Attack, α (degrees)',
        'Lift-to-Drag Ratio, L/D',
        '#22d3ee'
      );

      // Generate PDF HTML
      const html = await generatePdfReport(airfoilId, re, chartImages);

      // Download as PDF
      const filename = `Aerodynamic_Report_${airfoilId}_Re${re >= 1000000 ? (re / 1000000).toFixed(0) + 'M' : (re / 1000).toFixed(0) + 'k'}.pdf`;
      await downloadHTMLAsPDF(html, filename);

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
    <Button
      onClick={handleExport}
      disabled={disabled || isGenerating || !polarData}
      className="bg-cyan-600 hover:bg-cyan-700 text-white"
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Generating Report...
        </>
      ) : (
        <>
          <FileDown className="w-4 h-4 mr-2" />
          Export NASA Aerodynamic Report (PDF)
        </>
      )}
    </Button>
  );
}

