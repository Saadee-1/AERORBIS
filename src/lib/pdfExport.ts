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
 * Generate PDF HTML from localStorage data (fallback)
 */
function generatePDFFromLocalStorage(requestId: string, options: PDFExportOptions = {}): string {
  try {
    const storedData = localStorage.getItem(`calc-${requestId}`);
    if (!storedData) {
      throw new Error('Calculation data not found in localStorage');
    }

    const data = JSON.parse(storedData);
    const toolName = data.toolName || data.toolId || 'Calculation';
    const inputs = data.inputs || {};
    const results = data.results || {};
    const steps = data.steps || [];
    const metadata = data.metadata || {};

    // Generate HTML
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${toolName} Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #22d3ee; border-bottom: 2px solid #22d3ee; padding-bottom: 10px; }
    h2 { color: #06b6d4; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #0f172a; color: #22d3ee; }
    .step { margin: 10px 0; padding: 10px; background-color: #f8f9fa; border-left: 3px solid #22d3ee; }
    .result { font-size: 1.2em; font-weight: bold; color: #06b6d4; }
    .metadata { color: #666; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>${toolName} - Calculation Report</h1>
  <p class="metadata">Generated: ${new Date().toLocaleString()}</p>
  <p class="metadata">Request ID: ${requestId}</p>

  <h2>Inputs</h2>
  <table>
    ${Object.entries(inputs).map(([key, value]) => `
      <tr>
        <th>${key}</th>
        <td>${typeof value === 'object' ? JSON.stringify(value) : value}</td>
      </tr>
    `).join('')}
  </table>

  <h2>Results</h2>
  <table>
    ${Object.entries(results).map(([key, value]) => `
      <tr>
        <th>${key}</th>
        <td class="result">${typeof value === 'object' ? JSON.stringify(value) : value}</td>
      </tr>
    `).join('')}
  </table>

  ${steps.length > 0 ? `
    <h2>Calculation Steps</h2>
    ${steps.map((step: string, index: number) => `
      <div class="step">
        <strong>Step ${index + 1}:</strong> ${step}
      </div>
    `).join('')}
  ` : ''}

  ${metadata.units ? `<p class="metadata">Units: ${metadata.units}</p>` : ''}
  ${metadata.approxLevel ? `<p class="metadata">Approximation Level: ${metadata.approxLevel}</p>` : ''}
  ${metadata.confidence ? `<p class="metadata">Confidence: ${metadata.confidence}</p>` : ''}
</body>
</html>
    `;

    return html;
  } catch (error) {
    console.error('Error generating PDF from localStorage:', error);
    throw error;
  }
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
    
    // If Supabase URL is not configured, use localStorage fallback
    if (!supabaseUrl) {
      console.warn('Supabase URL not configured, generating PDF from localStorage');
      const html = generatePDFFromLocalStorage(requestId, options);
      return {
        status: 'ready',
        html,
        requestId,
      };
    }

    try {
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
            author: localStorage.getItem('userName') || 'User',
            ...options,
          },
        }),
      });

      if (response.ok) {
        return await response.json();
      } else {
        // If server fails, fall back to localStorage
        console.warn('PDF export from server failed, using localStorage fallback');
        const html = generatePDFFromLocalStorage(requestId, options);
        return {
          status: 'ready',
          html,
          requestId,
        };
      }
    } catch (fetchError) {
      // Network error, use localStorage fallback
      console.warn('PDF export fetch failed, using localStorage fallback:', fetchError);
      const html = generatePDFFromLocalStorage(requestId, options);
      return {
        status: 'ready',
        html,
        requestId,
      };
    }
  } catch (error) {
    console.error('PDF export error:', error);
    throw error;
  }
}

/**
 * Export batch PDF (multiple calculations)
 */
export async function exportBatchPDF(
  requestIds: string[],
  options: PDFExportOptions = {}
): Promise<PDFExportResponse> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Supabase URL not configured');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/assistant-events/export/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestIds,
        options: {
          includeAssistantExplanation: true,
          explanationLevel: 'detailed',
          includeCharts: true,
          format: 'A4',
          language: 'en',
          author: localStorage.getItem('userName') || 'User',
          ...options,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Batch PDF export failed: ${await response.text()}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Batch PDF export error:', error);
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

