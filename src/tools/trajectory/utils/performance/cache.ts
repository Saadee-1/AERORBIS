/**
 * Performance optimization: Memoization and caching
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

class LRUCache<K, V> {
  private cache: Map<K, CacheEntry<V>>;
  private maxSize: number;
  private ttl: number; // Time to live in ms

  constructor(maxSize: number = 1000, ttl: number = 60000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key: K, value: V): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global caches
export const atmosphereCache = new LRUCache<string, number>(500, 60000);
export const gravityCache = new LRUCache<string, number>(500, 60000);
export const dragCache = new LRUCache<string, number>(1000, 60000);

/**
 * Memoized atmospheric density calculation
 */
export function memoizedAtmosphericDensity(
  planet: any,
  altitude: number,
  calculateFn: (planet: any, altitude: number) => number
): number {
  const cacheKey = `${planet.id}-${Math.round(altitude / 100)}`;
  const cached = atmosphereCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const value = calculateFn(planet, altitude);
  atmosphereCache.set(cacheKey, value);
  return value;
}

/**
 * Memoized gravity calculation
 */
export function memoizedGravity(
  planet: any,
  altitude: number,
  calculateFn: (planet: any, altitude: number) => number
): number {
  const cacheKey = `${planet.id}-${Math.round(altitude / 1000)}`;
  const cached = gravityCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const value = calculateFn(planet, altitude);
  gravityCache.set(cacheKey, value);
  return value;
}

/**
 * Memoized drag calculation
 */
export function memoizedDrag(
  Cd: number,
  area: number,
  density: number,
  velocity: number,
  calculateFn: (Cd: number, area: number, density: number, velocity: number) => number
): number {
  const cacheKey = `${Cd}-${area}-${density.toFixed(6)}-${velocity.toFixed(1)}`;
  const cached = dragCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const value = calculateFn(Cd, area, density, velocity);
  dragCache.set(cacheKey, value);
  return value;
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  atmosphereCache.clear();
  gravityCache.clear();
  dragCache.clear();
}
