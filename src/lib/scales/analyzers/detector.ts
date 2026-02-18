/**
 * Scale pattern detector.
 *
 * Analyzes an array of numeric values and detects which scale strategy
 * (linear, modular, exponential, fibonacci, etc.) best fits the pattern.
 */

import type { ScaleStrategy } from "../types.js";
import { generateLinearScale } from "../generators/linear.js";
import { generateModularScale } from "../generators/modular.js";
import { generateFibonacciSequence } from "../generators/fibonacci.js";
import { MUSICAL_RATIOS } from "../knowledge.js";

export interface DetectionResult {
  strategy: ScaleStrategy;
  confidence: number; // 0-1
  parameters?: {
    base?: number;
    step?: number;
    ratio?: number;
    exponent?: number;
  };
  deviation?: number; // Average deviation from ideal pattern
  alternatives?: Array<{
    strategy: ScaleStrategy;
    confidence: number;
  }>;
}

/**
 * Detect the scale strategy for an array of values.
 *
 * @param values - Numeric values (must be sorted ascending)
 * @returns Detection result with confidence scores
 *
 * @example
 * ```ts
 * detectScaleStrategy([0, 4, 8, 12, 16, 20]);
 * // → { strategy: 'linear', confidence: 1.0, parameters: { base: 0, step: 4 } }
 *
 * detectScaleStrategy([16, 20, 25, 31.25, 39.06]);
 * // → { strategy: 'modular', confidence: 0.98, parameters: { base: 16, ratio: 1.25 } }
 * ```
 */
export function detectScaleStrategy(values: number[]): DetectionResult {
  if (values.length < 3) {
    return {
      strategy: "custom",
      confidence: 0,
      deviation: 0,
    };
  }

  // Filter out zeros for ratio calculations
  const nonZero = values.filter((v) => v !== 0);

  // Test all strategies and collect results
  const tests: DetectionResult[] = [
    testLinear(values),
    testModular(nonZero),
    testExponential(nonZero),
    testFibonacci(values),
    testGoldenRatio(nonZero),
    testHarmonic(nonZero),
  ];

  // Sort by confidence
  tests.sort((a, b) => b.confidence - a.confidence);

  // Return best match with alternatives
  const [best, ...alternatives] = tests;

  return {
    ...best,
    parameters: best.parameters || {},
    alternatives: alternatives
      .filter((t) => t.confidence > 0.7)
      .map((t) => ({ strategy: t.strategy, confidence: t.confidence })),
  };
}

/**
 * Test if values follow a linear pattern.
 */
function testLinear(values: number[]): DetectionResult {
  if (values.length < 2) {
    return { strategy: "linear", confidence: 0 };
  }

  // Calculate differences between consecutive values
  const diffs = [];
  for (let i = 1; i < values.length; i++) {
    diffs.push(values[i] - values[i - 1]);
  }

  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const base = values[0];

  // Calculate deviation from perfect linear
  const deviations = diffs.map((d) => Math.abs(d - avgDiff));
  const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;

  // Confidence: high if deviation is low relative to step size
  const relativeDeviation = avgDiff === 0 ? 1 : avgDeviation / avgDiff;
  const confidence = Math.max(0, 1 - relativeDeviation);

  return {
    strategy: "linear",
    confidence,
    parameters: { base, step: avgDiff },
    deviation: avgDeviation,
  };
}

/**
 * Test if values follow a modular (geometric) pattern.
 */
function testModular(values: number[]): DetectionResult {
  if (values.length < 2) {
    return { strategy: "modular", confidence: 0 };
  }

  // Calculate ratios between consecutive values
  const ratios = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] !== 0) {
      ratios.push(values[i] / values[i - 1]);
    }
  }

  if (ratios.length === 0) {
    return { strategy: "modular", confidence: 0 };
  }

  const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  const base = values[0];

  // Calculate deviation from perfect modular
  const deviations = ratios.map((r) => Math.abs(r - avgRatio));
  const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;

  // Confidence: high if ratio is consistent
  const relativeDeviation = avgDeviation / avgRatio;
  const confidence = Math.max(0, 1 - relativeDeviation * 2);

  return {
    strategy: "modular",
    confidence,
    parameters: { base, ratio: avgRatio },
    deviation: avgDeviation,
  };
}

/**
 * Test if values follow an exponential pattern (powers of 2).
 */
function testExponential(values: number[]): DetectionResult {
  if (values.length < 2) {
    return { strategy: "exponential", confidence: 0 };
  }

  // Check if ratios are all ~2
  const ratios = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] !== 0) {
      ratios.push(values[i] / values[i - 1]);
    }
  }

  if (ratios.length === 0) {
    return { strategy: "exponential", confidence: 0 };
  }

  const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;

  // High confidence if ratio is close to 2
  const deviation = Math.abs(avgRatio - 2);
  const confidence = deviation < 0.1 ? 1 - deviation * 2 : 0;

  return {
    strategy: "exponential",
    confidence,
    parameters: { base: values[0], exponent: 2 },
    deviation,
  };
}

/**
 * Test if values follow a Fibonacci sequence.
 */
function testFibonacci(values: number[]): DetectionResult {
  if (values.length < 4) {
    return { strategy: "fibonacci", confidence: 0 };
  }

  // Generate Fibonacci sequence and try to match
  const fibs = generateFibonacciSequence(values.length * 2);

  // Find best scaling factor
  let bestScale = 1;
  let bestDeviation = Infinity;

  for (let i = 0; i < fibs.length - values.length; i++) {
    const segment = fibs.slice(i, i + values.length);
    const scale = values[0] / segment[0];

    if (scale > 0 && isFinite(scale)) {
      const scaled = segment.map((f) => f * scale);
      const deviation =
        scaled.reduce((sum, s, idx) => sum + Math.abs(s - values[idx]), 0) /
        values.length;

      if (deviation < bestDeviation) {
        bestDeviation = deviation;
        bestScale = scale;
      }
    }
  }

  // Confidence based on relative deviation
  const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
  const relativeDeviation = avgValue === 0 ? 1 : bestDeviation / avgValue;
  const confidence = Math.max(0, 1 - relativeDeviation * 2);

  return {
    strategy: "fibonacci",
    confidence,
    parameters: { base: bestScale },
    deviation: bestDeviation,
  };
}

/**
 * Test if values follow a golden ratio pattern.
 */
function testGoldenRatio(values: number[]): DetectionResult {
  if (values.length < 2) {
    return { strategy: "golden", confidence: 0 };
  }

  const PHI = 1.618033988749895;

  // Check if ratios are all ~φ
  const ratios = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] !== 0) {
      ratios.push(values[i] / values[i - 1]);
    }
  }

  if (ratios.length === 0) {
    return { strategy: "golden", confidence: 0 };
  }

  const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;

  // Confidence: high if ratio is close to φ
  const deviation = Math.abs(avgRatio - PHI);
  const confidence = deviation < 0.1 ? 1 - deviation * 2 : 0;

  return {
    strategy: "golden",
    confidence,
    parameters: { base: values[0], ratio: PHI },
    deviation,
  };
}

/**
 * Test if values follow a harmonic pattern (1/n).
 */
function testHarmonic(values: number[]): DetectionResult {
  if (values.length < 3) {
    return { strategy: "harmonic", confidence: 0 };
  }

  // Harmonic sequence: a, a/2, a/3, a/4...
  // Check if values × index ≈ constant
  const products = values.map((v, i) => v * (i + 1));
  const avgProduct = products.reduce((a, b) => a + b, 0) / products.length;

  const deviations = products.map((p) => Math.abs(p - avgProduct));
  const avgDeviation =
    deviations.reduce((a, b) => a + b, 0) / deviations.length;

  // Confidence based on consistency
  const relativeDeviation =
    avgProduct === 0 ? 1 : avgDeviation / avgProduct;
  const confidence = Math.max(0, 1 - relativeDeviation * 2);

  return {
    strategy: "harmonic",
    confidence,
    parameters: { base: avgProduct },
    deviation: avgDeviation,
  };
}

/**
 * Suggest a better scale based on detected pattern.
 *
 * @param detection - Detection result from detectScaleStrategy()
 * @param valueCount - Number of values in original scale
 * @returns Suggested scale parameters
 *
 * @example
 * ```ts
 * const detection = detectScaleStrategy([0, 4, 8, 13, 16, 20]);
 * const suggestion = suggestImprovement(detection, 6);
 * // → { strategy: 'linear', base: 0, step: 4, reason: 'Outlier detected at index 3...' }
 * ```
 */
export function suggestImprovement(
  detection: DetectionResult,
  valueCount: number,
): {
  strategy: ScaleStrategy;
  parameters: Record<string, number>;
  reason: string;
} {
  const { strategy, parameters, confidence } = detection;

  if (confidence >= 0.95) {
    return {
      strategy,
      parameters: parameters || {},
      reason: "Scale is already well-formed",
    };
  }

  // Suggest snapping to known musical ratios for modular scales
  if (strategy === "modular" && parameters?.ratio) {
    const ratio = parameters.ratio;
    const closest = Object.entries(MUSICAL_RATIOS).reduce((best, [name, data]) => {
      const diff = Math.abs(data.ratio - ratio);
      if (diff < best.diff) {
        return { name, ratio: data.ratio, diff };
      }
      return best;
    }, { name: "", ratio: 1, diff: Infinity });

    if (closest.diff < 0.05) {
      return {
        strategy: "modular",
        parameters: { base: parameters.base || 16, ratio: closest.ratio },
        reason: `Ratio ${ratio.toFixed(3)} is close to ${closest.name} (${closest.ratio}). Consider using exact ratio for consistency.`,
      };
    }
  }

  // Suggest alternatives if confidence is low
  if (confidence < 0.7 && detection.alternatives?.[0]) {
    const alt = detection.alternatives[0];
    return {
      strategy: alt.strategy,
      parameters: {},
      reason: `Low confidence (${(confidence * 100).toFixed(0)}%). Consider ${alt.strategy} instead.`,
    };
  }

  return {
    strategy,
    parameters: parameters || {},
    reason: `Moderate confidence (${(confidence * 100).toFixed(0)}%). Consider refining values.`,
  };
}
