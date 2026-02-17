/**
 * Generation Algorithms — reusable functions that produce token values
 * from seed parameters.
 *
 * Each algorithm takes a small set of inputs and generates a structured
 * set of token values.
 */

import {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  relativeLuminance,
  contrastRatio,
} from "../color/index.js";

// ---------------------------------------------------------------------------
// Color: Tonal Palette
// ---------------------------------------------------------------------------

/**
 * Generate a tonal color palette from a key color.
 *
 * Produces shades from 50 (lightest) to 950 (darkest) using HSL
 * lightness interpolation.
 */
export function generateTonalPalette(
  keyColor: string,
  steps: number[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950],
): Record<string, string> {
  const rgb = hexToRgb(keyColor);
  if (!rgb) return {};

  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const result: Record<string, string> = {};

  for (const step of steps) {
    // Map step to lightness: 50→95%, 500→50%, 950→5%
    const lightness = 1 - step / 1000;
    const clampedL = Math.max(0.05, Math.min(0.95, lightness));

    // Adjust saturation — desaturate slightly at extremes.
    const satMod =
      step < 200 || step > 800
        ? hsl.s * 0.85
        : hsl.s;

    const [r, g, b] = hslToRgb(hsl.h, satMod, clampedL);
    result[String(step)] = rgbToHex(r, g, b);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Spacing: Modular Scale
// ---------------------------------------------------------------------------

/**
 * Generate a set of sizes using a modular scale (geometric progression).
 *
 * @param base   Base size in px.
 * @param ratio  Scale ratio (e.g. 1.25 for Major Third).
 * @param steps  Number of steps above and below the base.
 * @param unit   CSS unit (default: "rem").
 */
export function generateModularScale(
  base: number,
  ratio: number = 1.25,
  steps: number = 6,
  unit: string = "rem",
): Record<string, string> {
  const result: Record<string, string> = {};
  const names = [
    "4xs", "3xs", "2xs", "xs", "sm", "base",
    "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl",
  ];

  const startIdx = Math.max(0, 5 - steps);
  for (let i = -steps; i <= steps; i++) {
    const value = base * Math.pow(ratio, i);
    const nameIdx = i + 5; // center on "base" at index 5
    if (nameIdx >= 0 && nameIdx < names.length) {
      const rounded = Math.round(value * 1000) / 1000;
      result[names[nameIdx]] = `${rounded}${unit}`;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Spacing: Linear Scale
// ---------------------------------------------------------------------------

/**
 * Generate evenly-spaced sizes.
 *
 * @param base  Base size.
 * @param step  Increment per step.
 * @param count Number of steps.
 * @param unit  CSS unit (default: "rem").
 */
export function generateLinearScale(
  base: number,
  step: number = 0.25,
  count: number = 12,
  unit: string = "rem",
): Record<string, string> {
  const result: Record<string, string> = {};

  for (let i = 0; i < count; i++) {
    const value = base + step * i;
    const rounded = Math.round(value * 1000) / 1000;
    const key = String(i + 1);
    result[key] = `${rounded}${unit}`;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Color: Contrast Pair
// ---------------------------------------------------------------------------

/**
 * Generate an accessible foreground color for a given background.
 *
 * Returns a pair of { background, foreground } that meets WCAG AA
 * contrast ratio (4.5:1 for normal text).
 */
export function generateContrastPair(
  backgroundColor: string,
  targetRatio: number = 4.5,
): { background: string; foreground: string; ratio: number } {
  const bg = hexToRgb(backgroundColor);
  if (!bg) {
    return {
      background: backgroundColor,
      foreground: "#000000",
      ratio: 21,
    };
  }

  const bgLuminance = relativeLuminance(bg.r, bg.g, bg.b);

  // Try white first.
  const whiteRatio = contrastRatio(bgLuminance, 1);
  if (whiteRatio >= targetRatio) {
    return {
      background: backgroundColor,
      foreground: "#FFFFFF",
      ratio: Math.round(whiteRatio * 100) / 100,
    };
  }

  // Try black.
  const blackRatio = contrastRatio(bgLuminance, 0);
  return {
    background: backgroundColor,
    foreground: "#000000",
    ratio: Math.round(blackRatio * 100) / 100,
  };
}

// Color utility functions are now imported from ../color/index.ts
