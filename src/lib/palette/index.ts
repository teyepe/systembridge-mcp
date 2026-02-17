/**
 * Palette Module — barrel export + strategy factory
 *
 * Re-exports all palette types, strategies, and the mapping engine.
 * Provides a factory function to create the appropriate strategy.
 */

export type {
  PaletteStep,
  PaletteScale,
  PaletteMap,
  PaletteConfig,
  PaletteScaleConfig,
  PaletteStrategy,
  SemanticMappingRule,
  SemanticMappingPreset,
  PaletteToSemanticResult,
} from "./types.js";

export { DEFAULT_PALETTE_STEPS } from "./types.js";
export { HslRampStrategy } from "./strategies/hsl.js";
export { LeonardoStrategy } from "./strategies/leonardo.js";
export { ManualPaletteStrategy } from "./strategies/manual.js";
export { ImportPaletteStrategy } from "./strategies/import.js";
export { mapPaletteToSemantics, MAPPING_PRESETS } from "./mapping.js";

import type { DesignToken } from "../types.js";
import type { PaletteStrategy, PaletteConfig, PaletteMap, PaletteScaleConfig } from "./types.js";
import { DEFAULT_PALETTE_STEPS } from "./types.js";
import { HslRampStrategy } from "./strategies/hsl.js";
import { LeonardoStrategy } from "./strategies/leonardo.js";
import { ManualPaletteStrategy } from "./strategies/manual.js";
import { ImportPaletteStrategy } from "./strategies/import.js";

// ---------------------------------------------------------------------------
// Strategy factory
// ---------------------------------------------------------------------------

/**
 * Create the appropriate palette strategy.
 *
 * @param name      - Strategy name: "hsl" | "leonardo" | "manual" | "import"
 * @param tokenMap  - Existing tokens (needed for "import" strategy)
 */
export function createStrategy(
  name: string,
  tokenMap?: Map<string, DesignToken>,
): PaletteStrategy {
  switch (name) {
    case "hsl":
      return new HslRampStrategy();
    case "leonardo":
      return new LeonardoStrategy();
    case "manual":
      return new ManualPaletteStrategy();
    case "import":
      if (!tokenMap) {
        throw new Error("Import strategy requires a loaded token map.");
      }
      return new ImportPaletteStrategy(tokenMap);
    default:
      throw new Error(
        `Unknown palette strategy "${name}". ` +
        `Available: hsl, leonardo, manual, import`,
      );
  }
}

// ---------------------------------------------------------------------------
// High-level palette generation
// ---------------------------------------------------------------------------

/**
 * Generate a complete palette from a PaletteConfig.
 *
 * @param config   - Palette configuration
 * @param tokenMap - Existing token map (needed for "import" strategy)
 */
export async function generatePalette(
  config: PaletteConfig,
  tokenMap?: Map<string, DesignToken>,
): Promise<PaletteMap> {
  const strategy = createStrategy(config.strategy, tokenMap);
  const steps = config.steps ?? DEFAULT_PALETTE_STEPS;

  const scales: Record<string, PaletteMap["scales"][string]> = {};

  for (const scaleConfig of config.scales) {
    const options = config.strategy === "leonardo" ? config.leonardo : undefined;
    const scale = await Promise.resolve(
      strategy.generateScale(scaleConfig, steps, options as Record<string, unknown>),
    );
    scales[scaleConfig.name] = scale;
  }

  return {
    scales,
    meta: {
      strategy: config.strategy,
      generatedAt: new Date().toISOString(),
      options: config.leonardo as Record<string, unknown> | undefined,
    },
  };
}
