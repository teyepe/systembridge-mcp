/**
 * Scale transformation utilities.
 *
 * Transform existing scales: re-base, re-ratio, interpolate, etc.
 */

import type { ScaleStrategy } from "../types.js";
import { generateModularScale } from "../generators/modular.js";
import { generateLinearScale } from "../generators/linear.js";

export type ScaleTransformationType =
  | "rebase" // Change base value
  | "reratio" // Change ratio (modular scales)
  | "interpolate" // Add intermediate values
  | "extrapolate" // Extend scale
  | "normalize"; // Normalize to [0, 1]

/**
 * Re-base a scale to a new base value.
 *
 * @param values - Original scale values
 * @param newBase - New base value
 * @returns Transformed scale
 *
 * @example
 * ```ts
 * rebaseScale([16, 20, 25, 31.25], 14);
 * // → [14, 17.5, 21.88, 27.34]
 * ```
 */
export function rebaseScale(values: number[], newBase: number): number[] {
  if (values.length === 0) return [];

  const oldBase = values[0];
  if (oldBase === 0) {
    // If old base is 0, add offset
    const offset = newBase;
    return values.map((v) => v + offset);
  }

  const factor = newBase / oldBase;
  return values.map((v) => v * factor);
}

/**
 * Re-ratio a modular scale.
 *
 * @param values - Original modular scale
 * @param newRatio - New ratio
 * @returns Transformed scale
 *
 * @example
 * ```ts
 * reratioScale([16, 20, 25, 31.25], 1.125);
 * // Old ratio: 1.25, new ratio: 1.125
 * // → [16, 18, 20.25, 22.78]
 * ```
 */
export function reratioScale(values: number[], newRatio: number): number[] {
  if (values.length === 0) return [];

  const base = values[0];
  return generateModularScale(base, newRatio, values.length);
}

/**
 * Interpolate intermediate values into a scale.
 *
 * @param values - Original scale
 * @param steps - Number of steps to add between each pair
 * @returns Interpolated scale
 *
 * @example
 * ```ts
 * interpolateScale([0, 8, 16, 24], 1);
 * // → [0, 4, 8, 12, 16, 20, 24] (1 step between each)
 * ```
 */
export function interpolateScale(values: number[], steps: number = 1): number[] {
  if (values.length < 2) return values;

  const result: number[] = [values[0]];

  for (let i = 1; i < values.length; i++) {
    const start = values[i - 1];
    const end = values[i];
    const step = (end - start) / (steps + 1);

    for (let j = 1; j <= steps; j++) {
      result.push(start + step * j);
    }
    result.push(end);
  }

  return result;
}

/**
 * Extrapolate a scale beyond its current range.
 *
 * @param values - Original scale
 * @param additionalSteps - Number of steps to add
 * @param direction - 'up' or 'down'
 * @returns Extended scale
 *
 * @example
 * ```ts
 * extrapolateScale([12, 16, 20, 25], 2, 'up');
 * // Detects ratio ~1.25, extends upward
 * // → [12, 16, 20, 25, 31.25, 39.06]
 * ```
 */
export function extrapolateScale(
  values: number[],
  additionalSteps: number,
  direction: "up" | "down" = "up",
): number[] {
  if (values.length < 2) return values;

  // Detect pattern: linear or modular
  const diffs = [];
  const ratios = [];

  for (let i = 1; i < values.length; i++) {
    diffs.push(values[i] - values[i - 1]);
    if (values[i - 1] !== 0) {
      ratios.push(values[i] / values[i - 1]);
    }
  }

  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const diffVariance =
    diffs.reduce((sum, d) => sum + Math.pow(d - avgDiff, 2), 0) / diffs.length;

  const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  const ratioVariance =
    ratios.reduce((sum, r) => sum + Math.pow(r - avgRatio, 2), 0) /
    ratios.length;

  // Choose pattern with lower variance
  const isLinear = diffVariance < ratioVariance * avgDiff * avgDiff;

  if (direction === "up") {
    const extended = [...values];
    for (let i = 0; i < additionalSteps; i++) {
      const last = extended[extended.length - 1];
      const next = isLinear ? last + avgDiff : last * avgRatio;
      extended.push(next);
    }
    return extended;
  } else {
    // down
    const extended = [...values];
    for (let i = 0; i < additionalSteps; i++) {
      const first = extended[0];
      const prev = isLinear ? first - avgDiff : first / avgRatio;
      if (prev < 0) break;
      extended.unshift(prev);
    }
    return extended;
  }
}

/**
 * Normalize a scale to [0, 1] range.
 *
 * @param values - Original scale
 * @returns Normalized scale
 *
 * @example
 * ```ts
 * normalizeScale([16, 24, 32, 48]);
 * // → [0, 0.25, 0.5, 1]
 * ```
 */
export function normalizeScale(values: number[]): number[] {
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  if (range === 0) return values.map(() => 0);

  return values.map((v) => (v - min) / range);
}

/**
 * Denormalize a scale from [0, 1] to target range.
 *
 * @param normalized - Normalized scale [0, 1]
 * @param min - Target minimum
 * @param max - Target maximum
 * @returns Denormalized scale
 */
export function denormalizeScale(
  normalized: number[],
  min: number,
  max: number,
): number[] {
  const range = max - min;
  return normalized.map((n) => min + n * range);
}

/**
 * Snap scale values to a grid.
 *
 * @param values - Original values
 * @param gridSize - Grid size (e.g., 4 for 4px grid, 8 for 8dp grid)
 * @returns Snapped values
 *
 * @example
 * ```ts
 * snapToGrid([13, 18, 23, 29], 8);
 * // → [16, 16, 24, 32]
 * ```
 */
export function snapToGrid(values: number[], gridSize: number): number[] {
  return values.map((v) => Math.round(v / gridSize) * gridSize);
}

/**
 * Round scale values with a specific strategy.
 *
 * @param values - Original values
 * @param strategy - Rounding strategy
 * @returns Rounded values
 */
export function roundScale(
  values: number[],
  strategy: "integer" | "half" | "quarter" | "none" = "integer",
): number[] {
  switch (strategy) {
    case "integer":
      return values.map((v) => Math.round(v));
    case "half":
      return values.map((v) => Math.round(v * 2) / 2);
    case "quarter":
      return values.map((v) => Math.round(v * 4) / 4);
    case "none":
      return values;
  }
}

/**
 * Mirror a scale around a center point.
 *
 * @param values - Original scale (should be ascending from center)
 * @param includeCenter - Whether to include the center value once
 * @returns Mirrored scale
 *
 * @example
 * ```ts
 * mirrorScale([16, 20, 25, 31.25], true);
 * // → [10.24, 12.8, 16, 20, 25, 31.25]
 * ```
 */
export function mirrorScale(
  values: number[],
  includeCenter: boolean = true,
): number[] {
  if (values.length === 0) return [];

  const center = values[0];
  const upper = values.slice(includeCenter ? 1 : 0);

  // Calculate mirror values
  const lower = upper.map((v) => center - (v - center)).reverse();

  return [...lower, center, ...upper];
}

/**
 * Merge two scales.
 *
 * @param scale1 - First scale
 * @param scale2 - Second scale
 * @param removeDuplicates - Remove duplicate values
 * @returns Merged and sorted scale
 */
export function mergeScales(
  scale1: number[],
  scale2: number[],
  removeDuplicates: boolean = true,
): number[] {
  const merged = [...scale1, ...scale2].sort((a, b) => a - b);

  if (!removeDuplicates) return merged;

  // Remove duplicates
  return merged.filter((v, i, arr) => i === 0 || v !== arr[i - 1]);
}

/**
 * Clamp scale values to a range.
 *
 * @param values - Original values
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped values
 */
export function clampScale(
  values: number[],
  min: number,
  max: number,
): number[] {
  return values.map((v) => Math.max(min, Math.min(max, v)));
}
