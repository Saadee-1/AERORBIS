"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, FileText, Loader2 } from 'lucide-react';
import { exportToPDF, downloadHTMLAsPDF, PDFExportOptions } from '@/lib/pdfExport';
import { useToast } from '@/hooks/use-toast';

interface PDFExportButtonProps {
  requestId: string | null;
  toolName: string;
  disabled?: boolean;
}

export function PDFExportButton({ requestId, toolName, disabled }: PDFExportButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [options, setOptions] = useState<PDFExportOptions>({
    includeAssistantExplanation: true,
    explanationLevel: 'detailed',
    includeCharts: true,
    includeAttachments: true,
    format: 'A4',
    language: 'en',
    showLaTeX: true,
  });
  const { toast } = useToast();

  const handleExport = async () => {
    if (!requestId) {
      toast({
        title: 'Error',
        description: 'No calculation found. Please run a calculation first.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    try {
      const response = await exportToPDF(requestId, options);
      
      if (response.html) {
        await downloadHTMLAsPDF(response.html, `${toolName}-report-${Date.now()}.pdf`);
        toast({
          title: 'Success',
          description: 'PDF exported successfully!',
        });
        setIsDialogOpen(false);
      } else {
        throw new Error('No HTML content received');
      }
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export PDF',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsDialogOpen(true)}
        disabled={disabled || !requestId}
        className="border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10 disabled:opacity-50 disabled:cursor-not-allowed"
        title={!requestId ? "Run a calculation first to enable PDF export" : "Export PDF report"}
      >
        <Download className="w-4 h-4 mr-2" />
        Export PDF
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              Export PDF Report
            </DialogTitle>
            <DialogDescription>
              Configure your PDF export options for {toolName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="include-explanation" className="text-gray-300">
                Include AI Explanation
              </Label>
              <Switch
                id="include-explanation"
                checked={options.includeAssistantExplanation}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, includeAssistantExplanation: checked })
                }
              />
            </div>

            {options.includeAssistantExplanation && (
              <div className="space-y-2">
                <Label htmlFor="explanation-level" className="text-gray-300">
                  Explanation Level
                </Label>
                <Select
                  value={options.explanationLevel}
                  onValueChange={(value: 'brief' | 'detailed' | 'teaching') =>
                    setOptions({ ...options, explanationLevel: value })
                  }
                >
                  <SelectTrigger className="bg-slate-900/50 border-cyan-400/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brief">Brief (1-3 paragraphs)</SelectItem>
                    <SelectItem value="detailed">Detailed (step-by-step)</SelectItem>
                    <SelectItem value="teaching">Teaching (pedagogical)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label htmlFor="include-charts" className="text-gray-300">
                Include Charts
              </Label>
              <Switch
                id="include-charts"
                checked={options.includeCharts}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, includeCharts: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="include-attachments" className="text-gray-300">
                Include Attachments
              </Label>
              <Switch
                id="include-attachments"
                checked={options.includeAttachments}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, includeAttachments: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="bg-cyan-500 hover:bg-cyan-600"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

