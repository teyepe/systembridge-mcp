/**
 * Leonardo Strategy
 *
 * Uses Adobe's @adobe/leonardo-contrast-colors to generate
 * contrast-ratio-targeted palettes. Leonardo is an optional peer
 * dependency — this strategy fails gracefully if not installed.
 */

import {
  hexToRgb,
  relativeLuminance,
  contrastRatio,
} from "../../color/index.js";
import type {
  PaletteStrategy,
  PaletteScale,
  PaletteStep,
  PaletteScaleConfig,
} from "../types.js";

// Type stubs for @adobe/leonardo-contrast-colors
// (we dynamic-import, so we can't import types at compile time)
interface LeonardoColor {
  name: string;
  colorKeys: string[];
  ratios: number[];
  colorspace?: string;
  smooth?: boolean;
}
interface LeonardoTheme {
  colors: Array<{ name: string; values: Array<{ value: string }> }>;
}

export class LeonardoStrategy implements PaletteStrategy {
  readonly name = "leonardo";

  async generateScale(
    config: PaletteScaleConfig,
    steps: number[],
    options?: Record<string, unknown>,
  ): Promise<PaletteScale> {
    // Dynamic import of Leonardo
    let leonardo: {
      Color: new (opts: LeonardoColor) => unknown;
      Theme: new (opts: { colors: unknown[]; backgroundColor: unknown; lightness: number }) => LeonardoTheme;
      BackgroundColor: new (opts: { name: string; colorKeys: string[]; ratios?: number[] }) => unknown;
    };

    try {
      leonardo = await import("@adobe/leonardo-contrast-colors");
    } catch {
      throw new Error(
        "Leonardo strategy requires @adobe/leonardo-contrast-colors. " +
        "Install it with: npm install @adobe/leonardo-contrast-colors",
      );
    }

    const keyColor = config.keyColor ?? config.values?.[0] ?? "#0066CC";
    const colorSpace = (options?.colorSpace as string) ?? "CAM02";
    const smooth = (options?.smooth as boolean) ?? true;
    const ratios = (options?.ratios as number[]) ?? generateDefaultRatios(steps.length);

    // Create Leonardo color + theme
    const leoColor = new leonardo.Color({
      name: config.name,
      colorKeys: [keyColor],
      ratios,
      colorspace: colorSpace,
      smooth,
    });

    const bgColor = new leonardo.BackgroundColor({
      name: "background",
      colorKeys: ["#FFFFFF"],
      ratios: [1],
    });

    const theme = new leonardo.Theme({
      colors: [leoColor],
      backgroundColor: bgColor,
      lightness: 100,
    });

    // Extract generated colors
    const colorData = theme.colors.find((c) => c.name === config.name);
    if (!colorData || !colorData.values) {
      throw new Error(`Leonardo failed to generate colors for scale "${config.name}".`);
    }

    const paletteSteps: PaletteStep[] = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const leoValue = colorData.values[i];

      if (!leoValue) {
        // More steps requested than ratios produced — skip
        continue;
      }

      const hex = normalizeHex(leoValue.value);
      const rgb = hexToRgb(hex);

      let lum: number | undefined;
      let cwh: number | undefined;
      let cwb: number | undefined;

      if (rgb) {
        lum = relativeLuminance(rgb.r, rgb.g, rgb.b);
        cwh = contrastRatio(lum, 1.0);
        cwb = contrastRatio(lum, 0.0);
      }

      paletteSteps.push({
        step,
        hex,
        luminance: lum,
        contrastOnWhite: cwh,
        contrastOnBlack: cwb,
      });
    }

    return {
      name: config.name,
      hue: config.hue,
      steps: paletteSteps,
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate default contrast ratios spanning from near-1 (lightest)
 * to ~18 (darkest) for the given number of steps.
 */
function generateDefaultRatios(count: number): number[] {
  if (count <= 1) return [4.5];

  const ratios: number[] = [];
  for (let i = 0; i < count; i++) {
    // Logarithmic scale from 1.05 to 18
    const t = i / (count - 1);
    const ratio = 1.05 + t * t * 16.95; // quadratic ramp
    ratios.push(Math.round(ratio * 100) / 100);
  }
  return ratios;
}

/**
 * Normalize a potentially rgba/hex color string to 6-digit hex.
 */
function normalizeHex(value: string): string {
  if (value.startsWith("#") && (value.length === 7 || value.length === 4)) {
    return value.toUpperCase();
  }
  // Leonardo sometimes returns rgb() format
  const rgbMatch = value.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return (
      "#" +
      [r, g, b]
        .map((v) => parseInt(v, 10).toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase()
    );
  }
  return value;
}
