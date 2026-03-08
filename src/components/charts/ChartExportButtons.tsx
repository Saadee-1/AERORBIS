/**
 * Reusable export buttons component for charts
 */

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface ChartExportButtonsProps {
  exportAsPng: () => void;
  exportAsSvg: () => void;
}

export function ChartExportButtons({ exportAsPng, exportAsSvg }: ChartExportButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={exportAsPng}
        className="bg-slate-700/50 border-primary/30 hover:bg-primary/20 text-white"
      >
        <Download className="w-4 h-4 mr-1" />
        PNG
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={exportAsSvg}
        className="bg-slate-700/50 border-cyan-400/30 hover:bg-cyan-600/20 text-white"
      >
        <Download className="w-4 h-4 mr-1" />
        SVG
      </Button>
    </div>
  );
}

