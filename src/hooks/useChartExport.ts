import { useCallback } from "react";
import { exportChartAsPNG, exportChartAsSVG } from "@/lib/polarChartUtils";

interface UseChartExportOptions {
  getFileBaseName?: () => string;
  calculatorId?: string;
  graphMode?: string;
  reynolds?: number;
}

/**
 * Reusable hook for exporting charts as PNG or SVG
 * @param ref - React ref to the chart container element
 * @param options - Optional configuration for filename generation
 */
export function useChartExport(
  ref: React.RefObject<HTMLElement>,
  options?: UseChartExportOptions
) {
  const generateFileName = useCallback(
    (extension: "png" | "svg"): string => {
      if (options?.getFileBaseName) {
        return `${options.getFileBaseName()}.${extension}`;
      }

      // Default filename generation
      const parts: string[] = ["aeroverse"];

      if (options?.calculatorId) {
        parts.push(options.calculatorId);
      }

      if (options?.graphMode) {
        const modeMap: Record<string, string> = {
          ld: "ld-vs-alpha",
          cl: "cl-vs-alpha",
          cd: "cd-vs-alpha",
          cm: "cm-vs-alpha",
          dragPolar: "drag-polar",
        };
        parts.push(modeMap[options.graphMode] || options.graphMode);
      }

      if (options?.reynolds) {
        const reStr = options.reynolds >= 1000000
          ? `Re${(options.reynolds / 1000000).toFixed(0)}e6`
          : `Re${(options.reynolds / 1000).toFixed(0)}e3`;
        parts.push(reStr);
      }

      parts.push(Date.now().toString());
      return `${parts.join("-")}.${extension}`;
    },
    [options]
  );

  const exportAsPng = useCallback(async () => {
    if (!ref.current) {
      console.warn("Chart ref not available for PNG export");
      return;
    }

    try {
      const fileName = generateFileName("png");
      await exportChartAsPNG(ref.current, fileName);
    } catch (error) {
      console.error("PNG export failed:", error);
    }
  }, [ref, generateFileName]);

  const exportAsSvg = useCallback(async () => {
    if (!ref.current) {
      console.warn("Chart ref not available for SVG export");
      return;
    }

    try {
      const fileName = generateFileName("svg");
      await exportChartAsSVG(ref.current, fileName);
    } catch (error) {
      console.error("SVG export failed:", error);
    }
  }, [ref, generateFileName]);

  return {
    exportAsPng,
    exportAsSvg,
  };
}

