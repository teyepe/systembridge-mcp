/**
 * Fluid/responsive scale generator.
 *
 * Generates CSS clamp() values for viewport-responsive scales.
 * Based on the Utopia fluid typography methodology.
 *
 * Formula: clamp(MIN, PREFERRED, MAX)
 * Where PREFERRED = MIN + (MAX - MIN) × (100vw - MIN_VP) / (MAX_VP - MIN_VP)
 *
 * @see https://utopia.fyi/
 */

/**
 * Generate a CSS clamp() value for fluid sizing.
 *
 * @param minSize - Minimum value (at minViewport)
 * @param maxSize - Maximum value (at maxViewport)
 * @param minViewport - Minimum viewport width (px)
 * @param maxViewport - Maximum viewport width (px)
 * @param unit - CSS unit (px or rem)
 * @returns CSS clamp() string
 *
 * @example
 * ```ts
 * generateFluidValue(16, 20, 320, 1920, 'px');
 * // → "clamp(16px, 15.2px + 0.25vw, 20px)"
 * ```
 */
export function generateFluidValue(
  minSize: number,
  maxSize: number,
  minViewport: number,
  maxViewport: number,
  unit: "px" | "rem" = "px",
): string {
  // Convert to rem if needed
  const minRem = unit === "rem" ? minSize : minSize / 16;
  const maxRem = unit === "rem" ? maxSize : maxSize / 16;
  const minVwRem = minViewport / 16;
  const maxVwRem = maxViewport / 16;

  // Calculate slope and intercept for linear interpolation
  const slope = (maxSize - minSize) / (maxViewport - minViewport);
  const intercept = minSize - slope * minViewport;

  // Build clamp expression
  const minValue = unit === "rem" ? `${minRem}rem` : `${minSize}px`;
  const maxValue = unit === "rem" ? `${maxRem}rem` : `${maxSize}px`;

  // Preferred value: intercept + slope × 100vw
  const interceptStr =
    unit === "rem"
      ? `${(intercept / 16).toFixed(3)}rem`
      : `${intercept.toFixed(2)}px`;
  const slopePercent = (slope * 100).toFixed(3);

  return `clamp(${minValue}, ${interceptStr} + ${slopePercent}vw, ${maxValue})`;
}

/**
 * Generate a fluid scale with multiple steps.
 *
 * @param config - Fluid scale configuration
 * @returns Array of CSS clamp() strings
 *
 * @example
 * ```ts
 * generateFluidScale({
 *   minBase: 16,
 *   maxBase: 20,
 *   minViewport: 320,
 *   maxViewport: 1920,
 *   ratio: 1.25,
 *   steps: 5,
 *   unit: 'px'
 * });
 * // → ["clamp(12.8px, ..., 16px)", "clamp(16px, ..., 20px)", ...]
 * ```
 */
export function generateFluidScale(config: {
  minBase: number;
  maxBase: number;
  minViewport: number;
  maxViewport: number;
  ratio: number;
  steps: number;
  unit?: "px" | "rem";
}): string[] {
  const {
    minBase,
    maxBase,
    minViewport,
    maxViewport,
    ratio,
    steps,
    unit = "px",
  } = config;

  const clampValues: string[] = [];

  for (let i = 0; i < steps; i++) {
    const minSize = minBase * Math.pow(ratio, i);
    const maxSize = maxBase * Math.pow(ratio, i);

    clampValues.push(
      generateFluidValue(minSize, maxSize, minViewport, maxViewport, unit),
    );
  }

  return clampValues;
}

/**
 * Generate a fluid spacing scale (simpler version without ratio).
 *
 * @param minBase - Minimum base spacing
 * @param maxBase - Maximum base spacing
 * @param minViewport - Minimum viewport (px)
 * @param maxViewport - Maximum viewport (px)
 * @param steps - Array of multipliers (e.g., [1, 2, 3, 4, 6, 8])
 * @param unit - CSS unit
 * @returns Array of clamp() values for each step
 *
 * @example
 * ```ts
 * generateFluidSpacingScale(4, 6, 320, 1920, [1, 2, 3, 4, 6, 8], 'px');
 * // → ["clamp(4px, ..., 6px)", "clamp(8px, ..., 12px)", ...]
 * ```
 */
export function generateFluidSpacingScale(
  minBase: number,
  maxBase: number,
  minViewport: number,
  maxViewport: number,
  steps: number[],
  unit: "px" | "rem" = "px",
): string[] {
  return steps.map((multiplier) => {
    const minSize = minBase * multiplier;
    const maxSize = maxBase * multiplier;
    return generateFluidValue(minSize, maxSize, minViewport, maxViewport, unit);
  });
}

/**
 * Calculate the preferred value (slope) for a fluid scale.
 *
 * @param minSize - Min value
 * @param maxSize - Max value
 * @param minViewport - Min viewport
 * @param maxViewport - Max viewport
 * @returns { slope, intercept } for linear function
 *
 * @example
 * ```ts
 * calculateFluidSlope(16, 20, 320, 1920);
 * // → { slope: 0.0025, intercept: 15.2 }
 * // Means: 15.2px + 0.25vw
 * ```
 */
export function calculateFluidSlope(
  minSize: number,
  maxSize: number,
  minViewport: number,
  maxViewport: number,
): { slope: number; intercept: number } {
  const slope = (maxSize - minSize) / (maxViewport - minViewport);
  const intercept = minSize - slope * minViewport;

  return { slope, intercept };
}

/**
 * Convert a fluid clamp() expression to discrete breakpoint values.
 *
 * @param minSize - Min value
 * @param maxSize - Max value
 * @param minViewport - Min viewport
 * @param maxViewport - Max viewport
 * @param breakpoints - Viewport widths to generate values for
 * @returns Map of viewport → size
 *
 * @example
 * ```ts
 * fluidToBreakpoints(16, 20, 320, 1920, [320, 768, 1024, 1920]);
 * // → { 320: 16, 768: 17.12, 1024: 17.76, 1920: 20 }
 * ```
 */
export function fluidToBreakpoints(
  minSize: number,
  maxSize: number,
  minViewport: number,
  maxViewport: number,
  breakpoints: number[],
): Record<number, number> {
  const { slope, intercept } = calculateFluidSlope(
    minSize,
    maxSize,
    minViewport,
    maxViewport,
  );

  const result: Record<number, number> = {};

  for (const vw of breakpoints) {
    const value = intercept + slope * vw;
    // Clamp to min/max
    result[vw] = Math.max(minSize, Math.min(maxSize, value));
  }

  return result;
}
