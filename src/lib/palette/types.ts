/**
 * Palette Types
 *
 * Strategy-based palette generation system that supports multiple backends
 * (HSL ramp, Leonardo, manual, import) and maps palette steps to semantic
 * token intents.
 */

import type { DesignToken } from "../types.js";

// ---------------------------------------------------------------------------
// Palette primitives
// ---------------------------------------------------------------------------

/** A single step in a tonal palette. */
export interface PaletteStep {
  /** Step index (e.g. 0, 50, 100, ... 950) */
  step: number;
  /** Hex color value */
  hex: string;
  /** Relative luminance (0-1) */
  luminance?: number;
  /** WCAG 2.1 contrast ratio against white */
  contrastOnWhite?: number;
  /** WCAG 2.1 contrast ratio against black */
  contrastOnBlack?: number;
}

/** A named color scale (e.g., "brand", "neutral", "success"). */
export interface PaletteScale {
  /** Scale name / identifier */
  name: string;
  /** Base hue in degrees (0-360). May be undefined for imported palettes. */
  hue?: number;
  /** Steps in ascending lightness order */
  steps: PaletteStep[];
}

/** Complete palette map — all color scales. */
export interface PaletteMap {
  /** Named color scales */
  scales: Record<string, PaletteScale>;
  /** Metadata about generation */
  meta: {
    strategy: string;
    generatedAt: string;
    options?: Record<string, unknown>;
  };
}

// ---------------------------------------------------------------------------
// Palette configuration
// ---------------------------------------------------------------------------

/** Configuration for generating a palette. */
export interface PaletteConfig {
  /** Which strategy to use */
  strategy: "hsl" | "leonardo" | "manual" | "import";

  /** Color scales to generate */
  scales: PaletteScaleConfig[];

  /** Step values to generate (default: [0, 50, 100, ..., 900, 950]) */
  steps?: number[];

  /** Leonardo-specific options (only used with leonardo strategy) */
  leonardo?: {
    /** Contrast ratios for each step */
    ratios?: number[];
    /** Color space for interpolation */
    colorSpace?: string;
    /** Whether to smooth output */
    smooth?: boolean;
  };
}

/** Configuration for a single scale within the palette. */
export interface PaletteScaleConfig {
  /** Scale name (e.g., "brand", "neutral") */
  name: string;
  /** Base hue in degrees (0-360) — for generative strategies */
  hue?: number;
  /** Saturation (0-1) — for HSL strategy */
  saturation?: number;
  /** Array of manual hex values — for manual strategy */
  values?: string[];
  /** Token path to import from — for import strategy */
  importPath?: string;
  /** Leonardo key color (hex) — for leonardo strategy */
  keyColor?: string;
}

// ---------------------------------------------------------------------------
// Strategy interface
// ---------------------------------------------------------------------------

/** Strategy interface for palette generation. */
export interface PaletteStrategy {
  /** Strategy identifier */
  readonly name: string;
  /** Generate a single color scale (may be async for external deps like Leonardo) */
  generateScale(
    config: PaletteScaleConfig,
    steps: number[],
    options?: Record<string, unknown>,
  ): PaletteScale | Promise<PaletteScale>;
}

// ---------------------------------------------------------------------------
// Semantic mapping
// ---------------------------------------------------------------------------

/** Maps a semantic intent to a palette role + step. */
export interface SemanticMappingRule {
  /** Property class (e.g., "background", "text") */
  propertyClass: string;
  /** Semantic intent (e.g., "accent", "base", "danger") */
  intent: string;
  /** Which palette scale to pull from */
  paletteScale: string;
  /** Which step index to use for the default state */
  defaultStep: number;
  /** Optional state overrides (e.g., hover = step + 100) */
  stateOffsets?: Record<string, number>;
}

/** A preset mapping configuration. */
export interface SemanticMappingPreset {
  /** Preset name */
  name: string;
  /** Description */
  description: string;
  /** The mapping rules */
  rules: SemanticMappingRule[];
}

/** Result of mapping palette steps to semantic tokens. */
export interface PaletteToSemanticResult {
  /** Generated semantic tokens */
  tokens: Map<string, DesignToken>;
  /** Mapping report */
  report: {
    totalTokens: number;
    scalesUsed: string[];
    intentsMatched: string[];
    unmappedIntents: string[];
  };
}

// ---------------------------------------------------------------------------
// Default step values
// ---------------------------------------------------------------------------

/** Standard 19-step scale: 0, 50, 100, 150 ... 900, 950 */
export const DEFAULT_PALETTE_STEPS = [
  0, 50, 100, 150, 200, 250, 300, 350, 400, 450,
  500, 550, 600, 650, 700, 750, 800, 850, 900, 950,
];
