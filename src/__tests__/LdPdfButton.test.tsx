/**
 * Integration test for LdPdfButton component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LdPdfButton } from '../components/tools/LdPdfButton';
import * as pdfExport from '../lib/pdfExport';

// Mock the PDF export function
vi.mock('../lib/pdfExport', () => ({
  exportPdfForAirfoils: vi.fn(),
}));

// Mock useToast
vi.mock('../hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('LdPdfButton Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the Export PDF button', () => {
    render(<LdPdfButton selectedAirfoils={['naca0012']} re={1000000} />);
    expect(screen.getByText('Export PDF')).toBeInTheDocument();
  });

  it('should call exportPdfForAirfoils when clicked', async () => {
    const mockBlob = new Blob(['test'], { type: 'application/pdf' });
    vi.mocked(pdfExport.exportPdfForAirfoils).mockResolvedValue(mockBlob);

    // Mock URL.createObjectURL and document methods
    global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
    global.URL.revokeObjectURL = vi.fn();
    
    const linkClick = vi.fn();
    const linkRemove = vi.fn();
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') {
        const link = {
          href: '',
          download: '',
          click: linkClick,
          remove: linkRemove,
        } as any;
        return link;
      }
      return document.createElement(tag);
    });
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any);

    render(<LdPdfButton selectedAirfoils={['naca0012']} re={1000000} />);
    
    const button = screen.getByText('Export PDF');
    fireEvent.click(button);

    await waitFor(() => {
      expect(pdfExport.exportPdfForAirfoils).toHaveBeenCalledWith(
        ['naca0012'],
        expect.objectContaining({
          re: 1000000,
        })
      );
    });

    // Cleanup
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it('should be disabled when no airfoils are selected', () => {
    render(<LdPdfButton selectedAirfoils={[]} re={1000000} />);
    const button = screen.getByText('Export PDF').closest('button');
    expect(button).toBeDisabled();
  });

  it('should show loading state during generation', async () => {
    const mockBlob = new Blob(['test'], { type: 'application/pdf' });
    let resolvePromise: (value: Blob) => void;
    const promise = new Promise<Blob>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(pdfExport.exportPdfForAirfoils).mockReturnValue(promise);

    global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
    global.URL.revokeObjectURL = vi.fn();

    render(<LdPdfButton selectedAirfoils={['naca0012']} re={1000000} />);
    
    const button = screen.getByText('Export PDF');
    fireEvent.click(button);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText(/Generating/i)).toBeInTheDocument();
    });

    // Resolve the promise
    resolvePromise!(mockBlob);
  });
});

