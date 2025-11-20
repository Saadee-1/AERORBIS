/**
 * Export Snapshot Functionality
 * Captures canvas and exports for PDF
 */

import { useThree } from '@react-three/fiber';
import { useCallback } from 'react';

export function useExportSnapshot() {
  const { gl } = useThree();

  const captureScreenshot = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      try {
        const dataURL = gl.domElement.toDataURL('image/png');
        resolve(dataURL);
      } catch (error) {
        console.error('Failed to capture screenshot:', error);
        resolve('');
      }
    });
  }, [gl]);

  const exportSnapshotForPDF = useCallback(async (): Promise<string> => {
    return captureScreenshot();
  }, [captureScreenshot]);

  return {
    captureScreenshot,
    exportSnapshotForPDF,
  };
}

/**
 * Standalone screenshot function for use outside Canvas context
 */
export function captureCanvasScreenshot(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve) => {
    try {
      const dataURL = canvas.toDataURL('image/png');
      resolve(dataURL);
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      resolve('');
    }
  });
}
