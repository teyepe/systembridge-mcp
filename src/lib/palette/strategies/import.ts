/**
 * Import Palette Strategy
 *
 * Reads existing color tokens from the loaded token set and builds a
 * palette scale from them. Useful when the user already has a palette
 * defined in their token files and wants to map it to semantic tokens.
 */

import {
  hexToRgb,
  relativeLuminance,
  contrastRatio,
  resolveTokenColor,
} from "../../color/index.js";
import type { DesignToken } from "../../types.js";
import type {
  PaletteStrategy,
  PaletteScale,
  PaletteStep,
  PaletteScaleConfig,
} from "../types.js";

export class ImportPaletteStrategy implements PaletteStrategy {
  readonly name = "import";

  private tokenMap: Map<string, DesignToken>;

  constructor(tokenMap: Map<string, DesignToken>) {
    this.tokenMap = tokenMap;
  }

  generateScale(
    config: PaletteScaleConfig,
    steps: number[],
    _options?: Record<string, unknown>,
  ): PaletteScale {
    const importPath = config.importPath ?? config.name;

    // Find all tokens whose path starts with the import path
    const matchingTokens: Array<{ numericKey: number; hex: string }> = [];

    for (const [path, token] of this.tokenMap) {
      if (!path.startsWith(importPath)) continue;

      const hex = resolveTokenColor(token);
      if (!hex) continue;

      // Try to extract a numeric step from the last segment
      const segments = path.split(".");
      const lastSeg = segments[segments.length - 1];
      const numericKey = parseInt(lastSeg, 10);

      if (!isNaN(numericKey)) {
        matchingTokens.push({ numericKey, hex });
      }
    }

    if (matchingTokens.length === 0) {
      throw new Error(
        `Import strategy found no color tokens matching path "${importPath}". ` +
        `Ensure your tokens exist and have resolvable color values.`,
      );
    }

    // Sort by numeric key
    matchingTokens.sort((a, b) => a.numericKey - b.numericKey);

    // Build palette steps using the found tokens
    const paletteSteps: PaletteStep[] = matchingTokens.map((t) => {
      const rgb = hexToRgb(t.hex);
      let lum: number | undefined;
      let cwh: number | undefined;
      let cwb: number | undefined;

      if (rgb) {
        lum = relativeLuminance(rgb.r, rgb.g, rgb.b);
        cwh = contrastRatio(lum, 1.0);
        cwb = contrastRatio(lum, 0.0);
      }

      return {
        step: t.numericKey,
        hex: t.hex,
        luminance: lum,
        contrastOnWhite: cwh,
        contrastOnBlack: cwb,
      };
    });

    return {
      name: config.name,
      hue: config.hue,
      steps: paletteSteps,
    };
  }
}
