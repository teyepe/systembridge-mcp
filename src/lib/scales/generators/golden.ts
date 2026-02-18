/**
 * Golden ratio scale generator.
 *
 * Generates values based on the golden ratio (φ ≈ 1.618033988749).
 * Formula: a(n) = base × φ^n
 *
 * The golden ratio is found in nature, art, and architecture (Le Corbusier's Modulor).
 */

/** Golden ratio constant (φ) */
export const PHI = 1.618033988749895;

/**
 * Generate a scale based on the golden ratio.
 *
 * @param base - Base value
 * @param count - Number of values to generate
 * @returns Array of values scaled by φ
 *
 * @example
 * ```ts
 * generateGoldenRatioScale(16, 6);
 * // → [16, 25.89, 41.89, 67.77, 109.67, 177.44]
 * ```
 */
export function generateGoldenRatioScale(
  base: number,
  count: number,
): number[] {
  const values: number[] = [];

  for (let i = 0; i < count; i++) {
    values.push(base * Math.pow(PHI, i));
  }

  return values;
}

/**
 * Generate a bidirectional golden ratio scale (steps above and below base).
 *
 * @param base - Base value (center)
 * @param stepsUp - Steps above base
 * @param stepsDown - Steps below base
 * @returns Array of values centered around base
 *
 * @example
 * ```ts
 * generateBidirectionalGoldenScale(16, 3, 2);
 * // → [6.13, 9.93, 16, 25.89, 41.89, 67.77]
 * ```
 */
export function generateBidirectionalGoldenScale(
  base: number,
  stepsUp: number,
  stepsDown: number,
): number[] {
  const values: number[] = [];

  // Steps below base
  for (let i = stepsDown; i > 0; i--) {
    values.push(base / Math.pow(PHI, i));
  }

  // Base
  values.push(base);

  // Steps above base
  for (let i = 1; i <= stepsUp; i++) {
    values.push(base * Math.pow(PHI, i));
  }

  return values;
}

/**
 * Get the Lucas numbers (related to Fibonacci but starts with 2, 1).
 * Lucas numbers also converge to the golden ratio.
 *
 * @param count - Number of Lucas numbers
 * @returns Array of Lucas numbers
 *
 * @example
 * ```ts
 * generateLucasSequence(8);
 * // → [2, 1, 3, 4, 7, 11, 18, 29]
 * ```
 */
export function generateLucasSequence(count: number): number[] {
  if (count < 1) return [];
  if (count === 1) return [2];

  const lucas: number[] = [2, 1];

  for (let i = 2; i < count; i++) {
    lucas.push(lucas[i - 1] + lucas[i - 2]);
  }

  return lucas;
}

/**
 * Calculate a value using Le Corbusier's Modulor system.
 * The Modulor combines Fibonacci and golden ratio with human body proportions.
 *
 * Red Series: based on 113cm (height of navel from ground with 6ft person)
 * Blue Series: based on 226cm (double red series)
 *
 * @param seriesBase - Base measurement (113 for red, 226 for blue)
 * @param step - Position in the series
 * @returns Calculated Modulor value
 *
 * @example
 * ```ts
 * // Red series
 * calculateModulorValue(113, 0); // → 113
 * calculateModulorValue(113, 1); // → 183 (113 × φ)
 * calculateModulorValue(113, 2); // → 296 (113 × φ²)
 * ```
 */
export function calculateModulorValue(seriesBase: number, step: number): number {
  return seriesBase * Math.pow(PHI, step);
}

/**
 * Generate Le Corbusier's Modulor red series.
 *
 * @param count - Number of values
 * @returns Modulor red series values
 *
 * @example
 * ```ts
 * generateModulorRedSeries(8);
 * // → [6, 9, 15, 24, 39, 63, 102, 165] (approximate)
 * ```
 */
export function generateModulorRedSeries(count: number): number[] {
  const RED_BASE = 113;
  const values: number[] = [];

  // Modulor uses Fibonacci-like additions after initial φ scaling
  // Simplified version: scale by φ and round to whole numbers
  for (let i = -3; i < count - 3; i++) {
    const value = RED_BASE * Math.pow(PHI, i);
    values.push(Math.round(value));
  }

  return values;
}

/**
 * Generate Le Corbusier's Modulor blue series.
 *
 * @param count - Number of values
 * @returns Modulor blue series values
 *
 * @example
 * ```ts
 * generateModulorBlueSeries(8);
 * // → [13, 20, 33, 53, 86, 140, 226, 366] (approximate)
 * ```
 */
export function generateModulorBlueSeries(count: number): number[] {
  const BLUE_BASE = 226;
  const values: number[] = [];

  for (let i = -3; i < count - 3; i++) {
    const value = BLUE_BASE * Math.pow(PHI, i);
    values.push(Math.round(value));
  }

  return values;
}
