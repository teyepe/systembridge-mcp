/**
 * Simple in-memory cache for token loading
 * 
 * Reduces file I/O on repeated queries by caching loaded token maps.
 * Cache is invalidated when token files change or after a TTL.
 */
import type { TokenMap, McpDsConfig } from "./types.js";
import * as fs from "node:fs";
import * as path from "node:path";

interface CacheEntry {
  tokenMap: TokenMap;
  timestamp: number;
  fileChecksums: Map<string, string>;
}

/**
 * Simple checksum for file content (not cryptographically secure, just for cache invalidation)
 */
function simpleChecksum(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Get file checksums for cache validation
 */
function getFileChecksums(tokenPaths: string[]): Map<string, string> {
  const checksums = new Map<string, string>();
  
  for (const filePath of tokenPaths) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      checksums.set(filePath, simpleChecksum(content));
    } catch (error) {
      // File doesn't exist or can't be read - use empty checksum
      checksums.set(filePath, "");
    }
  }
  
  return checksums;
}

export class TokenCache {
  private cache = new Map<string, CacheEntry>();
  private ttlMs: number;
  
  constructor(ttlMs: number = 60000) { // Default: 60 second TTL
    this.ttlMs = ttlMs;
  }
  
  /**
   * Get cached tokens if available and valid
   */
  get(projectRoot: string, config: McpDsConfig, tokenPaths: string[]): TokenMap | null {
    const cacheKey = projectRoot;
    const entry = this.cache.get(cacheKey);
    
    if (!entry) {
      return null;
    }
    
    // Check TTL
    const now = Date.now();
    if (now - entry.timestamp > this.ttlMs) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    // Check if files have changed
    const currentChecksums = getFileChecksums(tokenPaths);
    for (const [filePath, checksum] of currentChecksums) {
      if (entry.fileChecksums.get(filePath) !== checksum) {
        this.cache.delete(cacheKey);
        return null;
      }
    }
    
    return entry.tokenMap;
  }
  
  /**
   * Store tokens in cache
   */
  set(projectRoot: string, config: McpDsConfig, tokenPaths: string[], tokenMap: TokenMap): void {
    const cacheKey = projectRoot;
    const fileChecksums = getFileChecksums(tokenPaths);
    
    this.cache.set(cacheKey, {
      tokenMap,
      timestamp: Date.now(),
      fileChecksums,
    });
  }
  
  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Global cache instance
let globalCache: TokenCache | null = null;

/**
 * Get or create the global cache instance
 */
export function getCache(ttlMs?: number): TokenCache {
  if (!globalCache) {
    globalCache = new TokenCache(ttlMs);
  }
  return globalCache;
}

/**
 * Check if caching is enabled (via environment variable)
 */
export function isCachingEnabled(): boolean {
  return process.env.SYSTEMBRIDGE_MCP_CACHE !== "false";
}
