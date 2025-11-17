/**
 * PDF Export Utilities
 * 
 * Functions for exporting calculation results to PDF
 */

export interface PDFExportOptions {
  includeAssistantExplanation?: boolean;
  explanationLevel?: 'brief' | 'detailed' | 'teaching';
  includeCharts?: boolean;
  includeAttachments?: boolean;
  format?: 'A4';
  language?: string;
  author?: string;
  showLaTeX?: boolean;
}

export interface PDFExportResponse {
  status: 'queued' | 'ready';
  html?: string;
  pdfUrl?: string;
  requestId: string;
}

/**
 * Request PDF export from assistant
 */
export async function exportToPDF(
  requestId: string,
  options: PDFExportOptions = {}
): Promise<PDFExportResponse> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Supabase URL not configured');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/assistant-events/export/pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId,
        options: {
          includeAssistantExplanation: true,
          explanationLevel: 'detailed',
          includeCharts: true,
          includeAttachments: true,
          format: 'A4',
          language: 'en',
          showLaTeX: true,
          ...options,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`PDF export failed: ${await response.text()}`);
    }

    return await response.json();
  } catch (error) {
    console.error('PDF export error:', error);
    throw error;
  }
}

/**
 * Convert HTML to PDF using browser print API
 */
export function printHTMLAsPDF(html: string, filename: string = 'calculation-report.pdf') {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Failed to open print window');
  }

  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for content to load, then trigger print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
}

/**
 * Download HTML as PDF using html2pdf library (if available)
 * Falls back to print dialog
 */
export async function downloadHTMLAsPDF(
  html: string,
  filename: string = 'calculation-report.pdf'
) {
  // Try using html2pdf if available
  if (typeof window !== 'undefined' && (window as any).html2pdf) {
    try {
      const opt = {
        margin: 1,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      };
      await (window as any).html2pdf().set(opt).from(html).save();
      return;
    } catch (error) {
      console.warn('html2pdf failed, falling back to print:', error);
    }
  }

  // Fallback to print dialog
  printHTMLAsPDF(html, filename);
}

/**
 * Get calculation context by requestId
 */
export async function getCalculationContext(requestId: string) {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Supabase URL not configured');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/assistant-events/context/${requestId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get context: ${await response.text()}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Get context error:', error);
    throw error;
  }
}

/**
 * Request detailed explanation from assistant
 */
export async function getExplanation(
  requestId: string,
  explanationLevel: 'brief' | 'detailed' | 'teaching' = 'detailed'
): Promise<string> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Supabase URL not configured');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/assistant-events/explain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId,
        explanationLevel,
      }),
    });

    if (!response.ok) {
      throw new Error(`Explanation request failed: ${await response.text()}`);
    }

    const data = await response.json();
    return data.explanation || '';
  } catch (error) {
    console.error('Get explanation error:', error);
    throw error;
  }
}

