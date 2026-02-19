#!/usr/bin/env tsx
/**
 * Performance benchmarking script for mcp-ds
 * 
 * Measures search performance with and without caching to demonstrate
 * the impact of Phase 2 optimizations.
 * 
 * Usage: npm run benchmark
 */

import { searchTokens } from "../src/tools/search.js";
import { loadConfig } from "../src/config/loader.js";
import { getCache } from "../src/lib/cache.js";
import {
  benchmark,
  formatBenchmarkResult,
  compareBenchmarks,
} from "../src/lib/performance.js";

const PROJECT_ROOT = process.cwd();

// ANSI colors
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
};

async function main() {
  console.log(
    `${colors.bright}${colors.cyan}mcp-ds Performance Benchmark${colors.reset}\n`,
  );
  console.log(`Project root: ${colors.dim}${PROJECT_ROOT}${colors.reset}\n`);

  const config = loadConfig(PROJECT_ROOT);

  // Test queries
  const queries = [
    { text: "color blue" },
    { text: "spacing 8", type: "dimension" as const },
    { text: "button", type: "color" as const },
    { lifecycle: "active" as const },
  ];

  console.log(
    `${colors.bright}Running benchmarks with ${queries.length} queries...${colors.reset}\n`,
  );

  // Benchmark WITHOUT caching (clear cache + disable it temporarily)
  process.env.MCP_DS_CACHE = "false";
  getCache().clear();

  const withoutCacheResult = await benchmark(
    "Search WITHOUT caching",
    async () => {
      for (const query of queries) {
        await searchTokens(query, PROJECT_ROOT, config);
      }
    },
    5,
  );

  console.log(formatBenchmarkResult(withoutCacheResult));

  // Benchmark WITH caching (enable cache)
  process.env.MCP_DS_CACHE = "true";
  getCache().clear(); // Start with empty cache

  const withCacheResult = await benchmark(
    "Search WITH caching",
    async () => {
      for (const query of queries) {
        await searchTokens(query, PROJECT_ROOT, config);
      }
    },
    5,
  );

  console.log(formatBenchmarkResult(withCacheResult));

  // Comparison
  console.log(compareBenchmarks(withoutCacheResult, withCacheResult));

  // Cache statistics
  const cacheStats = getCache().getStats();
  console.log(`\n${colors.bright}Cache Statistics:${colors.reset}`);
  console.log(`   Entries: ${cacheStats.size}`);
  console.log(`   Keys: ${cacheStats.keys.join(", ") || "(none)"}${colors.reset}\n`);

  // Recommendations
  const improvement =
    ((withoutCacheResult.avgDuration - withCacheResult.avgDuration) /
      withoutCacheResult.avgDuration) *
    100;

  if (improvement > 10) {
    console.log(
      `${colors.green}✓ Caching provides significant performance improvement (${improvement.toFixed(1)}%)${colors.reset}`,
    );
  } else if (improvement > 0) {
    console.log(
      `${colors.yellow}⚠ Caching provides modest improvement (${improvement.toFixed(1)}%)${colors.reset}`,
    );
  } else {
    console.log(
      `${colors.yellow}⚠ No significant improvement from caching${colors.reset}`,
    );
  }

  console.log(
    `\n${colors.dim}Tip: Caching is most effective with large token sets and repeated queries.${colors.reset}\n`,
  );
}

main().catch((error) => {
  console.error(`${colors.reset}Error:`, error);
  process.exit(1);
});
