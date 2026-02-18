/**
 * Modular (geometric) scale generator.
 *
 * Generates values using a constant ratio (geometric progression).
 * Formula: a(n) = base × ratio^n
 *
 * Commonly used for typography with musical ratios (1.125, 1.25, 1.333, 1.5, 1.618).
 */

/**
 * Generate a modular scale with a constant ratio.
 *
 * @param base - Base value (starting point)
 * @param ratio - Scale ratio (e.g., 1.25 for major third, 1.618 for golden ratio)
 * @param count - Number of values to generate
 * @param centerIndex - Index of the base value (default: 0 for base at start)
 * @returns Array of geometrically scaled values
 *
 * @example
 * ```ts
 * generateModularScale(16, 1.25, 7);
 * // → [16, 20, 25, 31.25, 39.06, 48.83, 61.04]
 * ```
 *
 * @example
 * // With centered base (3 steps down, 3 steps up)
 * generateModularScale(16, 1.25, 7, 3);
 * // → [8.19, 10.24, 12.8, 16, 20, 25, 31.25]
 * ```
 */
export function generateModularScale(
  base: number,
  ratio: number,
  count: number,
  centerIndex: number = 0,
): number[] {
  const values: number[] = [];

  for (let i = 0; i < count; i++) {
    const exponent = i - centerIndex;
    values.push(base * Math.pow(ratio, exponent));
  }

  return values;
}

/**
 * Generate a bidirectional modular scale (steps above and below base).
 *
 * @param base - Base value (center point)
 * @param ratio - Scale ratio
 * @param stepsUp - Number of steps above base
 * @param stepsDown - Number of steps below base
 * @returns Array of values centered around base
 *
 * @example
 * ```ts
 * generateBidirectionalModularScale(16, 1.25, 3, 2);
 * // → [10.24, 12.8, 16, 20, 25, 31.25]
 * //    ↑base-2  ↑base-1  ↑base  ↑base+1  ↑base+2  ↑base+3
 * ```
 */
export function generateBidirectionalModularScale(
  base: number,
  ratio: number,
  stepsUp: number,
  stepsDown: number,
): number[] {
  const values: number[] = [];

  // Generate steps below base
  for (let i = stepsDown; i > 0; i--) {
    values.push(base / Math.pow(ratio, i));
  }

  // Add base
  values.push(base);

  // Generate steps above base
  for (let i = 1; i <= stepsUp; i++) {
    values.push(base * Math.pow(ratio, i));
  }

  return values;
}

/**
 * Get a modular scale step by name (for semantic sizing).
 *
 * @param base - Base value
 * @param ratio - Scale ratio
 * @param step - Step offset from base (-2, -1, 0, 1, 2, etc.)
 * @returns Calculated value
 *
 * @example
 * ```ts
 * getModularScaleStep(16, 1.25, 0);  // → 16 (base)
 * getModularScaleStep(16, 1.25, 2);  // → 25 (base × 1.25^2)
 * getModularScaleStep(16, 1.25, -1); // → 12.8 (base / 1.25)
 * ```
 */
export function getModularScaleStep(
  base: number,
  ratio: number,
  step: number,
): number {
  return base * Math.pow(ratio, step);
}
