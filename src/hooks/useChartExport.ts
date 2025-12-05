import { useCallback } from "react";
import { toPng } from "html-to-image";

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
    const node = ref.current;
    if (!node) {
      console.error("exportAsPng: ref.current is null");
      return;
    }

    try {
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#0f172a", // slate-900 background
      });

      const link = document.createElement("a");
      link.download = generateFileName("png");
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("exportAsPng failed:", error);
    }
  }, [ref, generateFileName]);

  const exportAsSvg = useCallback(() => {
    const node = ref.current;
    if (!node) {
      console.error("exportAsSvg: ref.current is null");
      return;
    }

    try {
      // Look for the first SVG inside the card
      const svg = node.querySelector("svg");
      if (!svg) {
        console.error("exportAsSvg: no <svg> element found inside card");
        return;
      }

      // Clone the SVG to avoid modifying the original
      const clone = svg.cloneNode(true) as SVGSVGElement;

      // Ensure xmlns is set so the file displays correctly
      if (!clone.getAttribute("xmlns")) {
        clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      }

      // Serialize the cloned SVG
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clone);

      // Create blob and download
      const blob = new Blob([svgString], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = generateFileName("svg");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("exportAsSvg failed:", error);
    }
  }, [ref, generateFileName]);

  return {
    exportAsPng,
    exportAsSvg,
  };
}

