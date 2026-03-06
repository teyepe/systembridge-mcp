/**
 * Session-level analysis snapshot cache.
 *
 * Caches expensive analysis results (audits, projections) so that
 * multi-step workflows (search → audit → contrast → topology) reuse
 * intermediate computations instead of re-streaming the same data.
 *
 * Cache keys combine tool name + scope parameters.
 * Entries are invalidated by TTL or token-file fingerprint mismatch.
 */
import type { TokenMap } from "./types.js";

interface AnalysisSnapshot {
  key: string;
  timestamp: number;
  data: unknown;
  tokenFingerprint: string;
}

export class AnalysisCache {
  private snapshots = new Map<string, AnalysisSnapshot>();
  private ttlMs: number;

  constructor(ttlMs = 120_000) {
    this.ttlMs = ttlMs;
  }

  /**
   * Build a deterministic cache key from tool name + scope params.
   */
  static buildKey(tool: string, scope: Record<string, unknown>): string {
    const parts = [tool];
    for (const [k, v] of Object.entries(scope).sort(([a], [b]) => a.localeCompare(b))) {
      if (v !== undefined && v !== null) {
        parts.push(`${k}=${JSON.stringify(v)}`);
      }
    }
    return parts.join("|");
  }

  get<T>(key: string, currentFingerprint: string): T | null {
    const snap = this.snapshots.get(key);
    if (!snap) return null;
    if (Date.now() - snap.timestamp > this.ttlMs) {
      this.snapshots.delete(key);
      return null;
    }
    if (snap.tokenFingerprint !== currentFingerprint) {
      this.snapshots.delete(key);
      return null;
    }
    return snap.data as T;
  }

  set(key: string, data: unknown, tokenFingerprint: string): void {
    this.snapshots.set(key, {
      key,
      timestamp: Date.now(),
      data,
      tokenFingerprint,
    });
  }

  getStats(): { entries: number; keys: string[] } {
    return {
      entries: this.snapshots.size,
      keys: [...this.snapshots.keys()],
    };
  }

  clear(): void {
    this.snapshots.clear();
  }
}

/**
 * Compute a fast fingerprint for a TokenMap.
 * Not cryptographic — just enough to detect when tokens have changed.
 */
export function computeTokenFingerprint(tokenMap: TokenMap): string {
  const size = tokenMap.size;
  if (size === 0) return "empty";

  const paths = [...tokenMap.keys()].sort();
  const sample = [
    paths[0],
    paths[Math.floor(size / 4)],
    paths[Math.floor(size / 2)],
    paths[Math.floor((size * 3) / 4)],
    paths[size - 1],
  ].join(",");

  let valueHash = 0;
  for (const token of tokenMap.values()) {
    const v = String(token.resolvedValue ?? token.value ?? "");
    for (let i = 0; i < v.length; i++) {
      valueHash = (valueHash << 5) - valueHash + v.charCodeAt(i);
      valueHash = valueHash & valueHash;
    }
  }

  return `${size}:${valueHash.toString(36)}:${sample}`;
}

// Singleton instance
let globalAnalysisCache: AnalysisCache | null = null;

export function getAnalysisCache(ttlMs?: number): AnalysisCache {
  if (!globalAnalysisCache) {
    globalAnalysisCache = new AnalysisCache(ttlMs);
  }
  return globalAnalysisCache;
}
