/**
 * Manual Palette Strategy
 *
 * User provides an explicit array of hex color values for each scale.
 * Steps are assigned to the values in order.
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

export class ManualPaletteStrategy implements PaletteStrategy {
  readonly name = "manual";

  generateScale(
    config: PaletteScaleConfig,
    steps: number[],
    _options?: Record<string, unknown>,
  ): PaletteScale {
    const values = config.values ?? [];

    if (values.length === 0) {
      throw new Error(
        `Manual strategy requires "values" array for scale "${config.name}".`,
      );
    }

    // Map provided values to steps (zip — use as many as we have)
    const paletteSteps: PaletteStep[] = [];

    for (let i = 0; i < steps.length && i < values.length; i++) {
      const step = steps[i];
      const hex = values[i].toUpperCase();
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
