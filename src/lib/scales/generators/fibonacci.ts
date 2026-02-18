/**
 * Fibonacci scale generator.
 *
 * Generates values based on the Fibonacci sequence.
 * Formula: F(n) = F(n-1) + F(n-2), starting with F(0)=0, F(1)=1
 *
 * The sequence: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89...
 *
 * Ratio between consecutive values approaches the golden ratio (φ ≈ 1.618).
 */

/**
 * Generate Fibonacci sequence scaled by a base unit.
 *
 * @param baseUnit - Multiplier for each Fibonacci number
 * @param count - Number of values to generate
 * @returns Array of scaled Fibonacci values
 *
 * @example
 * ```ts
 * generateFibonacciScale(4, 10);
 * // → [0, 4, 4, 8, 12, 20, 32, 52, 84, 136]
 * ```
 */
export function generateFibonacciScale(
  baseUnit: number,
  count: number,
): number[] {
  if (count < 1) return [];
  if (count === 1) return [0];

  const fib: number[] = [0, 1];

  for (let i = 2; i < count; i++) {
    fib.push(fib[i - 1] + fib[i - 2]);
  }

  return fib.map((n) => n * baseUnit);
}

/**
 * Generate Fibonacci sequence starting from a specific index.
 *
 * @param startIndex - Starting Fibonacci index (e.g., 5 for F(5)=5)
 * @param count - Number of values to generate
 * @param baseUnit - Multiplier for each value
 * @returns Array of Fibonacci values
 *
 * @example
 * ```ts
 * generateFibonacciFromIndex(5, 5, 1);
 * // → [5, 8, 13, 21, 34]
 * ```
 */
export function generateFibonacciFromIndex(
  startIndex: number,
  count: number,
  baseUnit: number = 1,
): number[] {
  // Generate enough Fibonacci numbers to reach startIndex + count
  const totalNeeded = startIndex + count;
  const allFib = generateFibonacciSequence(totalNeeded);

  return allFib.slice(startIndex, startIndex + count).map((n) => n * baseUnit);
}

/**
 * Generate the raw Fibonacci sequence (unscaled).
 *
 * @param count - Number of Fibonacci numbers
 * @returns Raw Fibonacci sequence
 *
 * @example
 * ```ts
 * generateFibonacciSequence(10);
 * // → [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
 * ```
 */
export function generateFibonacciSequence(count: number): number[] {
  if (count < 1) return [];
  if (count === 1) return [0];

  const fib: number[] = [0, 1];

  for (let i = 2; i < count; i++) {
    fib.push(fib[i - 1] + fib[i - 2]);
  }

  return fib;
}

/**
 * Get the nth Fibonacci number.
 *
 * @param n - Index in the sequence
 * @returns The nth Fibonacci number
 *
 * @example
 * ```ts
 * getFibonacciNumber(0);  // → 0
 * getFibonacciNumber(1);  // → 1
 * getFibonacciNumber(10); // → 55
 * ```
 */
export function getFibonacciNumber(n: number): number {
  if (n === 0) return 0;
  if (n === 1) return 1;

  let a = 0;
  let b = 1;

  for (let i = 2; i <= n; i++) {
    const temp = a + b;
    a = b;
    b = temp;
  }

  return b;
}
