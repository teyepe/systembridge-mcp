/**
 * Performance benchmarking utilities for measuring and tracking operation performance
 * 
 * Helps identify performance regressions and measure impact of optimizations like caching.
 */

interface BenchmarkResult {
  name: string;
  duration: number;
  iterations: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  timestamp: number;
}

/**
 * Simple performance timing utility
 */
export class PerformanceTimer {
  private start: number;
  private measurements: number[] = [];
  
  constructor() {
    this.start = performance.now();
  }
  
  /**
   * Mark a measurement point
   */
  mark(): number {
    const duration = performance.now() - this.start;
    this.measurements.push(duration);
    return duration;
  }
  
  /**
   * Reset the timer
   */
  reset(): void {
    this.start = performance.now();
    this.measurements = [];
  }
  
  /**
   * Get all measurements
   */
  getMeasurements(): number[] {
    return [...this.measurements];
  }
  
  /**
   * Get the current elapsed time without marking
   */
  elapsed(): number {
    return performance.now() - this.start;
  }
}

/**
 * Run a benchmark function multiple times and collect statistics
 */
export async function benchmark(
  name: string,
  fn: () => Promise<void> | void,
  iterations: number = 10,
): Promise<BenchmarkResult> {
  const durations: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const duration = performance.now() - start;
    durations.push(duration);
  }
  
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);
  
  return {
    name,
    duration: durations.reduce((a, b) => a + b, 0),
    iterations,
    avgDuration,
    minDuration,
    maxDuration,
    timestamp: Date.now(),
  };
}

/**
 * Format benchmark results as human-readable string
 */
export function formatBenchmarkResult(result: BenchmarkResult): string {
  const lines = [];
  lines.push(`\n📊 Benchmark: ${result.name}`);
  lines.push(`   Iterations: ${result.iterations}`);
  lines.push(`   Total Time: ${result.duration.toFixed(2)}ms`);
  lines.push(`   Average: ${result.avgDuration.toFixed(2)}ms`);
  lines.push(`   Min: ${result.minDuration.toFixed(2)}ms`);
  lines.push(`   Max: ${result.maxDuration.toFixed(2)}ms`);
  return lines.join("\n");
}

/**
 * Compare two benchmark results and show the percentage difference
 */
export function compareBenchmarks(
  baseline: BenchmarkResult,
  comparison: BenchmarkResult,
): string {
  const diff = comparison.avgDuration - baseline.avgDuration;
  const percentChange = (diff / baseline.avgDuration) * 100;
  const faster = diff < 0;
  
  const lines = [];
  lines.push(`\n📈 Comparison: ${baseline.name} vs ${comparison.name}`);
  lines.push(`   Baseline: ${baseline.avgDuration.toFixed(2)}ms`);
  lines.push(`   Comparison: ${comparison.avgDuration.toFixed(2)}ms`);
  lines.push(`   Difference: ${Math.abs(diff).toFixed(2)}ms`);
  lines.push(
    `   ${faster ? "🚀 Faster" : "🐌 Slower"} by ${Math.abs(percentChange).toFixed(1)}%`,
  );
  return lines.join("\n");
}

/**
 * Create a simple performance log entry for startup diagnostics
 */
export function logPerformance(label: string, durationMs: number): void {
  if (durationMs < 10) {
    console.error(`[systembridge-mcp] ⚡ ${label}: ${durationMs.toFixed(2)}ms`);
  } else if (durationMs < 100) {
    console.error(`[systembridge-mcp] ✓ ${label}: ${durationMs.toFixed(2)}ms`);
  } else {
    console.error(`[systembridge-mcp] ⏱️  ${label}: ${durationMs.toFixed(2)}ms`);
  }
}
