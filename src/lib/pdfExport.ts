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
    const attachments = data.attachments || {};

    // Extract chart data if available
    const charts = attachments.charts || [];
    const chartImages = charts.map((chart: any) => chart.data || '').filter(Boolean);

    // Generate HTML
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${toolName} Report</title>
  <style>
    @media print {
      @page { margin: 1cm; size: A4; }
      body { margin: 0; }
    }
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #333; line-height: 1.6; }
    h1 { color: #22d3ee; border-bottom: 3px solid #22d3ee; padding-bottom: 10px; margin-bottom: 20px; }
    h2 { color: #06b6d4; margin-top: 30px; margin-bottom: 15px; border-bottom: 1px solid #06b6d4; padding-bottom: 5px; }
    h3 { color: #0891b2; margin-top: 20px; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; page-break-inside: avoid; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #0f172a; color: #22d3ee; font-weight: 600; }
    tr:nth-child(even) { background-color: #f8f9fa; }
    .step { margin: 10px 0; padding: 12px; background-color: #f8f9fa; border-left: 4px solid #22d3ee; page-break-inside: avoid; }
    .result { font-size: 1.1em; font-weight: bold; color: #06b6d4; }
    .metadata { color: #666; font-size: 0.9em; margin: 5px 0; }
    .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 10px; margin: 10px 0; }
    .error { background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 10px; margin: 10px 0; }
    .chart-container { margin: 20px 0; text-align: center; page-break-inside: avoid; }
    .chart-container img { max-width: 100%; height: auto; border: 1px solid #ddd; }
    .summary-box { background-color: #ecfeff; border: 2px solid #22d3ee; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .summary-box h3 { margin-top: 0; }
  </style>
</head>
<body>
  <h1>${toolName} - Calculation Report</h1>
  <div class="metadata">Generated: ${new Date().toLocaleString()}</div>
  <div class="metadata">Request ID: ${requestId}</div>

  ${metadata.warnings && metadata.warnings.length > 0 ? `
    <div class="warning">
      <h3>⚠️ Warnings</h3>
      <ul>
        ${metadata.warnings.map((w: string) => `<li>${w}</li>`).join('')}
      </ul>
    </div>
  ` : ''}

  ${metadata.recommendations && metadata.recommendations.length > 0 ? `
    <div class="summary-box">
      <h3>💡 Recommendations</h3>
      <ul>
        ${metadata.recommendations.map((r: string) => `<li>${r}</li>`).join('')}
      </ul>
    </div>
  ` : ''}

  <h2>Input Parameters</h2>
  <table>
    <thead>
      <tr>
        <th>Parameter</th>
        <th>Value</th>
        <th>Unit</th>
      </tr>
    </thead>
    <tbody>
      ${Object.entries(inputs).map(([key, value]) => {
        const displayValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
        return `
          <tr>
            <td><strong>${key}</strong></td>
            <td>${displayValue}</td>
            <td>${metadata.units?.[key] || '-'}</td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <h2>Results</h2>
  <table>
    <thead>
      <tr>
        <th>Result</th>
        <th>Value</th>
        <th>Unit</th>
      </tr>
    </thead>
    <tbody>
      ${Object.entries(results).map(([key, value]) => {
        const displayValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
        return `
          <tr>
            <td><strong>${key}</strong></td>
            <td class="result">${displayValue}</td>
            <td>${metadata.units?.[key] || '-'}</td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  ${chartImages.length > 0 && options.includeCharts !== false ? `
    <h2>Charts & Visualizations</h2>
    ${chartImages.map((img: string, idx: number) => `
      <div class="chart-container">
        <h3>Chart ${idx + 1}</h3>
        <img src="${img}" alt="Chart ${idx + 1}" />
      </div>
    `).join('')}
  ` : ''}

  ${steps.length > 0 ? `
    <h2>Calculation Steps</h2>
    ${steps.map((step: string, index: number) => `
      <div class="step">
        <strong>Step ${index + 1}:</strong> ${step}
      </div>
    `).join('')}
  ` : ''}

  <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #ddd; color: #666; font-size: 0.85em;">
    <p><strong>Metadata:</strong></p>
    ${metadata.units ? `<p>Units: ${JSON.stringify(metadata.units)}</p>` : ''}
    ${metadata.approxLevel ? `<p>Approximation Level: ${metadata.approxLevel}</p>` : ''}
    ${metadata.confidence ? `<p>Confidence: ${metadata.confidence}</p>` : ''}
  </div>
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
    // Use hardcoded Supabase endpoint with authentication
    const assistantEventsUrl = "https://khzdqcixiqlomounagej.supabase.co/functions/v1/assistant-events";
    const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoemRxY2l4aXFsb21vdW5hZ2VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MDU4MjUsImV4cCI6MjA3ODk4MTgyNX0.E946JYReOMeS9f1qBFV-8sOI9NIUDAGt6nI-zSzyzbI";

    try {
      const response = await fetch(`${assistantEventsUrl}/export/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
        },
        mode: 'cors',
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
        try {
          const errorText = await response.text();
          console.error('PDF export from server failed:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
            url: `${assistantEventsUrl}/export/pdf`,
          });
        } catch (textError) {
          console.error('PDF export from server failed - failed to read response:', {
            status: response.status,
            statusText: response.statusText,
            textError,
            url: `${assistantEventsUrl}/export/pdf`,
          });
        }
        const html = generatePDFFromLocalStorage(requestId, options);
        return {
          status: 'ready',
          html,
          requestId,
        };
      }
    } catch (fetchError) {
      // Network error, use localStorage fallback
      console.error('PDF export fetch failed, using localStorage fallback:', {
        error: fetchError,
        url: `${assistantEventsUrl}/export/pdf`,
      });
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
    // Use hardcoded Supabase endpoint with authentication
    const assistantEventsUrl = "https://khzdqcixiqlomounagej.supabase.co/functions/v1/assistant-events";
    const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoemRxY2l4aXFsb21vdW5hZ2VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MDU4MjUsImV4cCI6MjA3ODk4MTgyNX0.E946JYReOMeS9f1qBFV-8sOI9NIUDAGt6nI-zSzyzbI";

    const response = await fetch(`${assistantEventsUrl}/export/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey,
      },
      mode: 'cors',
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
      try {
        const errorText = await response.text();
        console.error('Batch PDF export failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          url: `${assistantEventsUrl}/export/batch`,
        });
        throw new Error(`Batch PDF export failed: ${errorText}`);
      } catch (textError) {
        console.error('Batch PDF export failed - failed to read response:', {
          status: response.status,
          statusText: response.statusText,
          textError,
          url: `${assistantEventsUrl}/export/batch`,
        });
        throw new Error(`Batch PDF export failed: ${response.status} ${response.statusText}`);
      }
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
    // Use hardcoded Supabase endpoint with authentication
    const assistantEventsUrl = "https://khzdqcixiqlomounagej.supabase.co/functions/v1/assistant-events";
    const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoemRxY2l4aXFsb21vdW5hZ2VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MDU4MjUsImV4cCI6MjA3ODk4MTgyNX0.E946JYReOMeS9f1qBFV-8sOI9NIUDAGt6nI-zSzyzbI";

    const response = await fetch(`${assistantEventsUrl}/context/${requestId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey,
      },
      mode: 'cors',
    });

    if (!response.ok) {
      try {
        const errorText = await response.text();
        console.error('Failed to get context:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          url: `${assistantEventsUrl}/context/${requestId}`,
        });
        throw new Error(`Failed to get context: ${errorText}`);
      } catch (textError) {
        console.error('Failed to get context - failed to read response:', {
          status: response.status,
          statusText: response.statusText,
          textError,
          url: `${assistantEventsUrl}/context/${requestId}`,
        });
        throw new Error(`Failed to get context: ${response.status} ${response.statusText}`);
      }
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
    // Use hardcoded Supabase endpoint with authentication
    const assistantEventsUrl = "https://khzdqcixiqlomounagej.supabase.co/functions/v1/assistant-events";
    const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoemRxY2l4aXFsb21vdW5hZ2VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MDU4MjUsImV4cCI6MjA3ODk4MTgyNX0.E946JYReOMeS9f1qBFV-8sOI9NIUDAGt6nI-zSzyzbI";

    const response = await fetch(`${assistantEventsUrl}/explain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey,
      },
      mode: 'cors',
      body: JSON.stringify({
        requestId,
        explanationLevel,
      }),
    });

    if (!response.ok) {
      try {
        const errorText = await response.text();
        console.error('Explanation request failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          url: `${assistantEventsUrl}/explain`,
        });
        throw new Error(`Explanation request failed: ${errorText}`);
      } catch (textError) {
        console.error('Explanation request failed - failed to read response:', {
          status: response.status,
          statusText: response.statusText,
          textError,
          url: `${assistantEventsUrl}/explain`,
        });
        throw new Error(`Explanation request failed: ${response.status} ${response.statusText}`);
      }
    }

    const data = await response.json();
    return data.explanation || '';
  } catch (error) {
    console.error('Get explanation error:', error);
    throw error;
  }
}

