/**
 * Exponential scale generator.
 *
 * Generates values using exponential progression (powers).
 * Formula: a(n) = base × exponent^n
 *
 * Commonly used with exponent=2 (powers of 2): 4, 8, 16, 32, 64...
 */

/**
 * Generate an exponential scale.
 *
 * @param base - Base value (multiplier)
 * @param exponent - Exponent (typically 2 for doubling)
 * @param count - Number of values to generate
 * @returns Array of exponentially increasing values
 *
 * @example
 * ```ts
 * generateExponentialScale(4, 2, 6);
 * // → [4, 8, 16, 32, 64, 128]
 * ```
 */
export function generateExponentialScale(
  base: number,
  exponent: number = 2,
  count: number = 8,
): number[] {
  const values: number[] = [];

  for (let i = 0; i < count; i++) {
    values.push(base * Math.pow(exponent, i));
  }

  return values;
}

/**
 * Generate a power-of-2 scale (common for responsive breakpoints, icon sizes).
 *
 * @param start - Starting power (e.g., 4 for 2^4 = 16)
 * @param count - Number of values
 * @returns Array of powers of 2
 *
 * @example
 * ```ts
 * generatePowerOf2Scale(4, 5);
 * // → [16, 32, 64, 128, 256]
 * ```
 */
export function generatePowerOf2Scale(start: number, count: number): number[] {
  const values: number[] = [];

  for (let i = 0; i < count; i++) {
    values.push(Math.pow(2, start + i));
  }

  return values;
}
