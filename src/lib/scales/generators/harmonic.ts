/**
 * Harmonic scale generator.
 *
 * Generates values based on the harmonic series (reciprocals).
 * Formula: a(n) = base / n
 *
 * Creates diminishing intervals: 96, 48, 32, 24, 19.2, 16...
 * Rarely used in mainstream design systems but useful for optical balance.
 */

/**
 * Generate a harmonic scale (1/n series).
 *
 * @param base - Base value
 * @param count - Number of values to generate
 * @returns Array of harmonically decreasing values
 *
 * @example
 * ```ts
 * generateHarmonicScale(96, 6);
 * // → [96, 48, 32, 24, 19.2, 16]
 * ```
 */
export function generateHarmonicScale(base: number, count: number): number[] {
  const values: number[] = [];

  for (let i = 1; i <= count; i++) {
    values.push(base / i);
  }

  return values;
}

/**
 * Generate a harmonic scale with a multiplier.
 *
 * @param base - Base value
 * @param count - Number of values
 * @param multiplier - Scale factor
 * @returns Scaled harmonic values
 *
 * @example
 * ```ts
 * generateScaledHarmonicScale(100, 5, 2);
 * // → [200, 100, 66.67, 50, 40]
 * ```
 */
export function generateScaledHarmonicScale(
  base: number,
  count: number,
  multiplier: number,
): number[] {
  const values: number[] = [];

  for (let i = 1; i <= count; i++) {
    values.push((base * multiplier) / i);
  }

  return values;
}
