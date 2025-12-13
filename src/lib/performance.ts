/**
 * Performance Monitoring Utility
 * Tracks FPS, simulation time, memory usage, and rendering performance
 */

import React from 'react';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  simulationTime: number;
  memoryUsage?: number;
  workerLoad?: number;
  chartRenderTime?: number;
}

class PerformanceMonitor {
  private fps: number = 60;
  private frameCount: number = 0;
  private lastTime: number = performance.now();
  private frameTimes: number[] = [];
  private maxFrameTimeHistory: number = 60;
  private simulationStartTime: number = 0;
  private simulationTime: number = 0;
  private isMonitoring: boolean = false;
  private rafId: number | null = null;
  private listeners: Set<(metrics: PerformanceMetrics) => void> = new Set();

  start() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.frameTimes = [];
    this.measure();
  }

  stop() {
    this.isMonitoring = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private measure = () => {
    if (!this.isMonitoring) return;

    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;

    // Calculate FPS
    if (delta > 0) {
      const currentFPS = 1000 / delta;
      this.frameTimes.push(currentFPS);
      if (this.frameTimes.length > this.maxFrameTimeHistory) {
        this.frameTimes.shift();
      }
      this.fps = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    }

    // Get memory usage if available
    interface PerformanceWithMemory extends Performance {
      memory?: { usedJSHeapSize: number };
    }
    const memoryUsage = (performance as PerformanceWithMemory).memory
      ? (performance as PerformanceWithMemory).memory!.usedJSHeapSize / 1048576 // Convert to MB
      : undefined;

    // Notify listeners
    const metrics: PerformanceMetrics = {
      fps: Math.round(this.fps),
      frameTime: delta,
      simulationTime: this.simulationTime,
      memoryUsage,
    };

    this.listeners.forEach((listener) => listener(metrics));

    this.rafId = requestAnimationFrame(this.measure);
  };

  startSimulation() {
    this.simulationStartTime = performance.now();
  }

  endSimulation() {
    if (this.simulationStartTime > 0) {
      this.simulationTime = performance.now() - this.simulationStartTime;
      this.simulationStartTime = 0;
    }
  }

  resetSimulationTime() {
    this.simulationTime = 0;
    this.simulationStartTime = 0;
  }

  subscribe(listener: (metrics: PerformanceMetrics) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getMetrics(): PerformanceMetrics {
    return {
      fps: Math.round(this.fps),
      frameTime: this.frameTimes.length > 0
        ? this.frameTimes[this.frameTimes.length - 1]
        : 0,
      simulationTime: this.simulationTime,
      memoryUsage: ((performance as unknown as { memory?: { usedJSHeapSize: number } }).memory)
        ? ((performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize / 1048576)
        : undefined,
    };
  }
}

// Global instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * React hook for performance monitoring
 */
export function usePerformanceMonitor(enabled: boolean = false) {
  const [metrics, setMetrics] = React.useState<PerformanceMetrics>({
    fps: 60,
    frameTime: 0,
    simulationTime: 0,
  });

  React.useEffect(() => {
    if (!enabled) return;

    performanceMonitor.start();
    const unsubscribe = performanceMonitor.subscribe(setMetrics);

    return () => {
      unsubscribe();
      performanceMonitor.stop();
    };
  }, [enabled]);

  return metrics;
}

/**
 * Measure function execution time
 */
export function measureTime<T>(fn: () => T, label?: string): T {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  const duration = end - start;

  if (label && process.env.NODE_ENV === 'development') {
    console.log(`[Perf] ${label}: ${duration.toFixed(2)}ms`);
  }

  return result;
}

/**
 * Measure async function execution time
 */
export async function measureTimeAsync<T>(
  fn: () => Promise<T>,
  label?: string
): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  const duration = end - start;

  if (label && process.env.NODE_ENV === 'development') {
    console.log(`[Perf] ${label}: ${duration.toFixed(2)}ms`);
  }

  return result;
}

/**
 * Debounce function for expensive operations
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for frequent events
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
