/**
 * Linear scale generator.
 *
 * Generates evenly-spaced values with a constant step.
 * Formula: a(n) = base + n × step
 *
 * Example (base=0, step=4): 0, 4, 8, 12, 16, 20, 24...
 */

/**
 * Generate a linear scale with constant steps.
 *
 * @param base - Starting value
 * @param step - Constant increment
 * @param count - Number of values to generate
 * @returns Array of numeric values
 *
 * @example
 * ```ts
 * generateLinearScale(0, 4, 10);
 * // → [0, 4, 8, 12, 16, 20, 24, 28, 32, 36]
 * ```
 */
export function generateLinearScale(
  base: number,
  step: number,
  count: number,
): number[] {
  const values: number[] = [];

  for (let i = 0; i < count; i++) {
    values.push(base + i * step);
  }

  return values;
}

/**
 * Generate a linear scale with specific start and end values.
 *
 * @param min - Minimum value
 * @param max - Maximum value
 * @param count - Number of steps (including min and max)
 * @returns Array of evenly-spaced values
 *
 * @example
 * ```ts
 * generateLinearRange(0, 100, 5);
 * // → [0, 25, 50, 75, 100]
 * ```
 */
export function generateLinearRange(
  min: number,
  max: number,
  count: number,
): number[] {
  if (count < 2) {
    throw new Error("Count must be at least 2 for a range");
  }

  const values: number[] = [];
  const step = (max - min) / (count - 1);

  for (let i = 0; i < count; i++) {
    values.push(min + i * step);
  }

  return values;
}
