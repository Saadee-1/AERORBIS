import { useCallback } from "react";
import type { RefObject } from "react";
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
  ref: RefObject<HTMLElement | null>,
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
    if (typeof window === "undefined") {
      console.error("exportAsPng: window is undefined (SSR)");
      return;
    }

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
    if (typeof window === "undefined") {
      console.error("exportAsSvg: window is undefined (SSR)");
      return;
    }

    const node = ref.current;
    if (!node) {
      console.error("exportAsSvg: ref.current is null");
      return;
    }

    try {
      // Find the actual chart <svg> inside the export target
      const svg = node.querySelector("svg");
      if (!svg) {
        console.error("exportAsSvg: no <svg> element found inside export target");
        return;
      }

      // Clone WITH children (true = deep clone), otherwise we get an empty shell
      const clonedSvg = svg.cloneNode(true) as SVGSVGElement;

      // Ensure proper namespace so it renders when opened
      if (!clonedSvg.getAttribute("xmlns")) {
        clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      }

      // Ensure xmlns:xlink is set if needed
      if (!clonedSvg.getAttribute("xmlns:xlink")) {
        clonedSvg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
      }

      // Preserve viewBox if it exists
      if (svg.getAttribute("viewBox") && !clonedSvg.getAttribute("viewBox")) {
        clonedSvg.setAttribute("viewBox", svg.getAttribute("viewBox") || "");
      }

      // Serialize using XMLSerializer to avoid empty/invalid SVG
      // XMLSerializer is a browser API, safe to use here since we checked window
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clonedSvg);

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

