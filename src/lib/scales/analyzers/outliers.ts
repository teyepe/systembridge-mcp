/**
 * Outlier detection for scale values.
 *
 * Identifies values that don't fit the detected scale pattern.
 */

import type { DetectionResult } from "./detector.js";

export interface Outlier {
  index: number;
  value: number;
  expected: number;
  deviation: number;
  reason: string;
}

/**
 * Find outliers in a scale based on detected pattern.
 *
 * @param values - Scale values (sorted ascending)
 * @param detection - Detection result from detectScaleStrategy()
 * @param threshold - Deviation threshold (default: 0.15 = 15%)
 * @returns Array of outliers
 *
 * @example
 * ```ts
 * const values = [0, 4, 8, 13, 16, 20]; // 13 is outlier
 * const detection = detectScaleStrategy(values);
 * findOutliers(values, detection);
 * // → [{ index: 3, value: 13, expected: 12, deviation: 0.083, reason: '...' }]
 * ```
 */
export function findOutliers(
  values: number[],
  detection: DetectionResult,
  threshold: number = 0.15,
): Outlier[] {
  const { strategy, parameters } = detection;

  if (!parameters) {
    return [];
  }

  switch (strategy) {
    case "linear":
      return findLinearOutliers(values, parameters, threshold);
    case "modular":
      return findModularOutliers(values, parameters, threshold);
    case "exponential":
      return findExponentialOutliers(values, parameters, threshold);
    case "fibonacci":
      return findFibonacciOutliers(values, threshold);
    case "golden":
      return findGoldenOutliers(values, parameters, threshold);
    case "harmonic":
      return findHarmonicOutliers(values, parameters, threshold);
    default:
      return [];
  }
}

/**
 * Find outliers in a linear scale.
 */
function findLinearOutliers(
  values: number[],
  parameters: { base?: number; step?: number },
  threshold: number,
): Outlier[] {
  const { base = 0, step = 1 } = parameters;
  const outliers: Outlier[] = [];

  for (let i = 0; i < values.length; i++) {
    const expected = base + i * step;
    const actual = values[i];
    const deviation = Math.abs(actual - expected) / Math.max(expected, 1);

    if (deviation > threshold) {
      outliers.push({
        index: i,
        value: actual,
        expected,
        deviation,
        reason: `Expected ${expected.toFixed(2)} (linear: ${base} + ${i} × ${step}), got ${actual}`,
      });
    }
  }

  return outliers;
}

/**
 * Find outliers in a modular (geometric) scale.
 */
function findModularOutliers(
  values: number[],
  parameters: { base?: number; ratio?: number },
  threshold: number,
): Outlier[] {
  const { base = 1, ratio = 1.25 } = parameters;
  const outliers: Outlier[] = [];

  for (let i = 0; i < values.length; i++) {
    const expected = base * Math.pow(ratio, i);
    const actual = values[i];
    const deviation = Math.abs(actual - expected) / expected;

    if (deviation > threshold) {
      outliers.push({
        index: i,
        value: actual,
        expected,
        deviation,
        reason: `Expected ${expected.toFixed(2)} (modular: ${base} × ${ratio}^${i}), got ${actual}`,
      });
    }
  }

  return outliers;
}

/**
 * Find outliers in an exponential (power of 2) scale.
 */
function findExponentialOutliers(
  values: number[],
  parameters: { base?: number; exponent?: number },
  threshold: number,
): Outlier[] {
  const { base = 1, exponent = 2 } = parameters;
  const outliers: Outlier[] = [];

  for (let i = 0; i < values.length; i++) {
    const expected = base * Math.pow(exponent, i);
    const actual = values[i];
    const deviation = Math.abs(actual - expected) / expected;

    if (deviation > threshold) {
      outliers.push({
        index: i,
        value: actual,
        expected,
        deviation,
        reason: `Expected ${expected.toFixed(2)} (exponential: ${base} × ${exponent}^${i}), got ${actual}`,
      });
    }
  }

  return outliers;
}

/**
 * Find outliers in a Fibonacci scale.
 */
function findFibonacciOutliers(
  values: number[],
  threshold: number,
): Outlier[] {
  if (values.length < 2) return [];

  const outliers: Outlier[] = [];

  // Fibonacci: F(n) = F(n-1) + F(n-2)
  // Start from index 2
  for (let i = 2; i < values.length; i++) {
    const expected = values[i - 1] + values[i - 2];
    const actual = values[i];
    const deviation = Math.abs(actual - expected) / Math.max(expected, 1);

    if (deviation > threshold) {
      outliers.push({
        index: i,
        value: actual,
        expected,
        deviation,
        reason: `Expected ${expected.toFixed(2)} (Fibonacci: ${values[i - 1]} + ${values[i - 2]}), got ${actual}`,
      });
    }
  }

  return outliers;
}

/**
 * Find outliers in a golden ratio scale.
 */
function findGoldenOutliers(
  values: number[],
  parameters: { base?: number; ratio?: number },
  threshold: number,
): Outlier[] {
  const PHI = 1.618033988749895;
  const { base = 1 } = parameters;
  const outliers: Outlier[] = [];

  for (let i = 0; i < values.length; i++) {
    const expected = base * Math.pow(PHI, i);
    const actual = values[i];
    const deviation = Math.abs(actual - expected) / expected;

    if (deviation > threshold) {
      outliers.push({
        index: i,
        value: actual,
        expected,
        deviation,
        reason: `Expected ${expected.toFixed(2)} (golden: ${base} × φ^${i}), got ${actual}`,
      });
    }
  }

  return outliers;
}

/**
 * Find outliers in a harmonic scale.
 */
function findHarmonicOutliers(
  values: number[],
  parameters: { base?: number },
  threshold: number,
): Outlier[] {
  const { base = 1 } = parameters;
  const outliers: Outlier[] = [];

  for (let i = 0; i < values.length; i++) {
    const expected = base / (i + 1);
    const actual = values[i];
    const deviation = Math.abs(actual - expected) / expected;

    if (deviation > threshold) {
      outliers.push({
        index: i,
        value: actual,
        expected,
        deviation,
        reason: `Expected ${expected.toFixed(2)} (harmonic: ${base} / ${i + 1}), got ${actual}`,
      });
    }
  }

  return outliers;
}

/**
 * Suggest corrections for outliers.
 *
 * @param outliers - Array of detected outliers
 * @returns Map of index → suggested value
 *
 * @example
 * ```ts
 * const outliers = findOutliers([0, 4, 8, 13, 16], detection);
 * suggestCorrections(outliers);
 * // → { 3: 12 }
 * ```
 */
export function suggestCorrections(
  outliers: Outlier[],
): Record<number, number> {
  const corrections: Record<number, number> = {};

  for (const outlier of outliers) {
    // Round expected value to nearest 0.5
    const rounded = Math.round(outlier.expected * 2) / 2;
    corrections[outlier.index] = rounded;
  }

  return corrections;
}

/**
 * Apply corrections to a scale.
 *
 * @param values - Original values
 * @param corrections - Map of index → new value
 * @returns Corrected values
 */
export function applyCorrections(
  values: number[],
  corrections: Record<number, number>,
): number[] {
  const result = [...values];

  for (const [index, newValue] of Object.entries(corrections)) {
    const idx = parseInt(index, 10);
    if (idx >= 0 && idx < result.length) {
      result[idx] = newValue;
    }
  }

  return result;
}

/**
 * Statistical outlier detection using IQR method.
 *
 * Detects outliers based on interquartile range, independent of scale strategy.
 *
 * @param values - Numeric values
 * @param factor - IQR factor (default: 1.5, use 3.0 for extreme outliers)
 * @returns Array of outlier indices
 */
export function findStatisticalOutliers(
  values: number[],
  factor: number = 1.5,
): number[] {
  if (values.length < 4) return [];

  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;

  const lowerBound = q1 - factor * iqr;
  const upperBound = q3 + factor * iqr;

  const outlierIndices: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (values[i] < lowerBound || values[i] > upperBound) {
      outlierIndices.push(i);
    }
  }

  return outlierIndices;
}
