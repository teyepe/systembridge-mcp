/**
 * Hybrid scale generator (linear then exponential).
 *
 * Generates a scale that's linear for small values, then switches to
 * exponential for larger values. This is the Tailwind CSS spacing approach.
 *
 * Example: 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48...
 *          ↑ linear (0-12)      ↑ exponential (beyond 12)
 */

import { generateLinearScale } from "./linear.js";

/**
 * Generate a hybrid linear-then-exponential scale.
 *
 * @param base - Base unit
 * @param step - Linear step size
 * @param linearUpTo - Threshold to switch to exponential
 * @param exponentialCount - Number of exponential steps after threshold
 * @returns Array of hybrid scale values
 *
 * @example
 * ```ts
 * generateHybridScale(0.25, 0.25, 12, 8);
 * // → [0, 0.25, 0.5, 0.75, 1, ... 3 (linear), 4, 5, 6, 8, 10, 12 (exponential)]
 * ```
 */
export function generateHybridScale(
  base: number,
  step: number,
  linearUpTo: number,
  exponentialCount: number = 8,
): number[] {
  // Generate linear portion
  const linearCount = Math.ceil(linearUpTo / step) + 1;
  const linear = generateLinearScale(base, step, linearCount);

  // Generate exponential portion
  const exponential: number[] = [];
  const maxLinear = linear[linear.length - 1];

  // Start doubling from the last linear value
  let current = maxLinear + step;
  for (let i = 0; i < exponentialCount; i++) {
    exponential.push(current);
    current *= 2;
  }

  return [...linear, ...exponential];
}

/**
 * Generate Tailwind-style spacing scale.
 *
 * Tailwind uses: 0, 0.25, 0.5, 0.75... up to 3rem (linear)
 * Then: 3.5, 4, 5, 6, 7, 8, 10, 12, 14, 16, 20, 24, 32, 40, 48, 56, 64...
 *
 * @param unit - CSS unit (rem or px)
 * @returns Tailwind spacing scale
 *
 * @example
 * ```ts
 * generateTailwindSpacing('rem');
 * // → [0, 0.25, 0.5, ..., 3, 3.5, 4, 5, 6, 8, 10, 12, 16, 20, 24...]
 * ```
 */
export function generateTailwindSpacing(unit: "rem" | "px" = "rem"): number[] {
  const baseUnit = unit === "rem" ? 0.25 : 4;

  // Linear: 0-3rem (0-12 in Tailwind scale)
  const linear: number[] = [];
  for (let i = 0; i <= 12; i++) {
    linear.push(i * baseUnit);
  }

  // Add intermediate steps
  const intermediates = [14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64];

  return [
    ...linear,
    ...intermediates.map((i) => i * (unit === "rem" ? 0.25 : 1)),
  ];
}

/**
 * Generate a custom hybrid scale with configurable transition.
 *
 * @param config - Hybrid configuration
 * @returns Hybrid scale values
 *
 * @example
 * ```ts
 * generateCustomHybrid({
 *   linearBase: 0,
 *   linearStep: 4,
 *   linearCount: 13,
 *   transitionMultiplier: 1.5,
 *   exponentialSteps: 6
 * });
 * ```
 */
export function generateCustomHybrid(config: {
  linearBase: number;
  linearStep: number;
  linearCount: number;
  transitionMultiplier: number;
  exponentialSteps: number;
}): number[] {
  const {
    linearBase,
    linearStep,
    linearCount,
    transitionMultiplier,
    exponentialSteps,
  } = config;

  // Generate linear portion
  const linear = generateLinearScale(linearBase, linearStep, linearCount);

  // Generate exponential portion
  const exponential: number[] = [];
  let current = linear[linear.length - 1] * transitionMultiplier;

  for (let i = 0; i < exponentialSteps; i++) {
    exponential.push(current);
    current *= transitionMultiplier;
  }

  return [...linear, ...exponential];
}
