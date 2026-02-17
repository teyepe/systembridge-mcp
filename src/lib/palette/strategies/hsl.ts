/**
 * HSL Ramp Strategy
 *
 * Generates tonal palettes by sweeping lightness across a fixed hue and
 * saturation. Simple, dependency-free, and suitable as the default strategy.
 */

import {
  hslToRgb,
  rgbToHex,
  relativeLuminance,
  contrastRatio,
} from "../../color/index.js";
import type {
  PaletteStrategy,
  PaletteScale,
  PaletteStep,
  PaletteScaleConfig,
} from "../types.js";

export class HslRampStrategy implements PaletteStrategy {
  readonly name = "hsl";

  generateScale(
    config: PaletteScaleConfig,
    steps: number[],
    _options?: Record<string, unknown>,
  ): PaletteScale {
    const hue = (config.hue ?? 220) / 360; // normalize to 0-1
    const saturation = config.saturation ?? 0.6;

    const maxStep = Math.max(...steps);
    const minStep = Math.min(...steps);
    const range = maxStep - minStep || 1;

    const paletteSteps: PaletteStep[] = steps.map((step) => {
      // Map step to lightness: low steps = light, high steps = dark
      const t = (step - minStep) / range;
      const lightness = 1 - t * 0.9; // range: 1.0 → 0.1

      const [r, g, b] = hslToRgb(hue, saturation, lightness);
      const hex = rgbToHex(r, g, b);
      const lum = relativeLuminance(r, g, b);
      const whiteLum = 1.0; // relative luminance of white
      const blackLum = 0.0; // relative luminance of black

      return {
        step,
        hex,
        luminance: lum,
        contrastOnWhite: contrastRatio(lum, whiteLum),
        contrastOnBlack: contrastRatio(lum, blackLum),
      };
    });

    return {
      name: config.name,
      hue: config.hue ?? 220,
      steps: paletteSteps,
    };
  }
}
