/**
 * Palette → Semantic Token Mapping Engine
 *
 * Maps palette scales (tonal ramps) to semantic tokens using configurable
 * rules that define which palette step corresponds to which intent × property
 * class × state combination.
 *
 * Includes built-in presets for common mapping patterns.
 */

import type { DesignToken } from "../types.js";
import { buildSemanticPath } from "../semantics/ontology.js";
import type {
  PaletteMap,
  PaletteScale,
  SemanticMappingRule,
  SemanticMappingPreset,
  PaletteToSemanticResult,
} from "./types.js";

// ---------------------------------------------------------------------------
// Built-in presets
// ---------------------------------------------------------------------------

/**
 * "Light mode" preset: backgrounds are light steps, text is dark steps.
 * Designed for a 19-step scale (0-950 in steps of 50).
 */
const LIGHT_MODE_PRESET: SemanticMappingPreset = {
  name: "light-mode",
  description: "Light-mode defaults: light backgrounds (50-200), dark text (700-900), medium borders (300-400).",
  rules: [
    // --- Accent intent (brand/primary scale) ---
    { propertyClass: "background", intent: "accent", paletteScale: "brand", defaultStep: 500, stateOffsets: { hover: 50, active: 100, disabled: -350 } },
    { propertyClass: "text", intent: "accent", paletteScale: "brand", defaultStep: 50, stateOffsets: { disabled: -50 } },
    { propertyClass: "icon", intent: "accent", paletteScale: "brand", defaultStep: 50, stateOffsets: { disabled: -50 } },
    { propertyClass: "border", intent: "accent", paletteScale: "brand", defaultStep: 600, stateOffsets: { hover: 50, focus: -100 } },
    { propertyClass: "outline", intent: "accent", paletteScale: "brand", defaultStep: 400 },

    // --- Base intent (neutral scale) ---
    { propertyClass: "background", intent: "base", paletteScale: "neutral", defaultStep: 50, stateOffsets: { hover: 50, active: 100, disabled: 0 } },
    { propertyClass: "text", intent: "base", paletteScale: "neutral", defaultStep: 900, stateOffsets: { disabled: -400 } },
    { propertyClass: "icon", intent: "base", paletteScale: "neutral", defaultStep: 700, stateOffsets: { disabled: -300 } },
    { propertyClass: "border", intent: "base", paletteScale: "neutral", defaultStep: 300, stateOffsets: { hover: 50, focus: 100 } },
    { propertyClass: "outline", intent: "base", paletteScale: "neutral", defaultStep: 500 },

    // --- Muted intent (neutral, lighter) ---
    { propertyClass: "background", intent: "muted", paletteScale: "neutral", defaultStep: 100, stateOffsets: { hover: 50, active: 100 } },
    { propertyClass: "text", intent: "muted", paletteScale: "neutral", defaultStep: 500, stateOffsets: { disabled: -200 } },
    { propertyClass: "icon", intent: "muted", paletteScale: "neutral", defaultStep: 400 },
    { propertyClass: "border", intent: "muted", paletteScale: "neutral", defaultStep: 200 },

    // --- Inverted intent (dark backgrounds, light text) ---
    { propertyClass: "background", intent: "inverted", paletteScale: "neutral", defaultStep: 900, stateOffsets: { hover: -50, active: -100 } },
    { propertyClass: "text", intent: "inverted", paletteScale: "neutral", defaultStep: 50 },
    { propertyClass: "icon", intent: "inverted", paletteScale: "neutral", defaultStep: 100 },
    { propertyClass: "border", intent: "inverted", paletteScale: "neutral", defaultStep: 700 },

    // --- Status intents (use corresponding scales) ---
    ...makeStatusRules("success"),
    ...makeStatusRules("warning"),
    ...makeStatusRules("danger"),
    ...makeStatusRules("info"),
  ],
};

/**
 * "Dark mode" preset: inverts the step assignments.
 */
const DARK_MODE_PRESET: SemanticMappingPreset = {
  name: "dark-mode",
  description: "Dark-mode defaults: dark backgrounds (800-900), light text (50-200), medium borders (500-600).",
  rules: [
    // --- Accent ---
    { propertyClass: "background", intent: "accent", paletteScale: "brand", defaultStep: 500, stateOffsets: { hover: -50, active: -100, disabled: 300 } },
    { propertyClass: "text", intent: "accent", paletteScale: "brand", defaultStep: 50, stateOffsets: { disabled: 300 } },
    { propertyClass: "icon", intent: "accent", paletteScale: "brand", defaultStep: 50 },
    { propertyClass: "border", intent: "accent", paletteScale: "brand", defaultStep: 400 },
    { propertyClass: "outline", intent: "accent", paletteScale: "brand", defaultStep: 300 },

    // --- Base ---
    { propertyClass: "background", intent: "base", paletteScale: "neutral", defaultStep: 900, stateOffsets: { hover: -50, active: -100 } },
    { propertyClass: "text", intent: "base", paletteScale: "neutral", defaultStep: 100, stateOffsets: { disabled: 300 } },
    { propertyClass: "icon", intent: "base", paletteScale: "neutral", defaultStep: 200 },
    { propertyClass: "border", intent: "base", paletteScale: "neutral", defaultStep: 600, stateOffsets: { hover: -50, focus: -100 } },
    { propertyClass: "outline", intent: "base", paletteScale: "neutral", defaultStep: 400 },

    // --- Muted ---
    { propertyClass: "background", intent: "muted", paletteScale: "neutral", defaultStep: 800 },
    { propertyClass: "text", intent: "muted", paletteScale: "neutral", defaultStep: 400 },
    { propertyClass: "icon", intent: "muted", paletteScale: "neutral", defaultStep: 500 },
    { propertyClass: "border", intent: "muted", paletteScale: "neutral", defaultStep: 700 },

    // --- Inverted ---
    { propertyClass: "background", intent: "inverted", paletteScale: "neutral", defaultStep: 50 },
    { propertyClass: "text", intent: "inverted", paletteScale: "neutral", defaultStep: 900 },
    { propertyClass: "icon", intent: "inverted", paletteScale: "neutral", defaultStep: 800 },
    { propertyClass: "border", intent: "inverted", paletteScale: "neutral", defaultStep: 200 },

    // --- Status intents ---
    ...makeStatusRules("success"),
    ...makeStatusRules("warning"),
    ...makeStatusRules("danger"),
    ...makeStatusRules("info"),
  ],
};

/** Built-in presets map */
export const MAPPING_PRESETS: Record<string, SemanticMappingPreset> = {
  "light-mode": LIGHT_MODE_PRESET,
  "dark-mode": DARK_MODE_PRESET,
};

// ---------------------------------------------------------------------------
// Mapping engine
// ---------------------------------------------------------------------------

/**
 * Map palette steps to semantic tokens using the given rules.
 *
 * @param palette  - Generated palette (from any strategy)
 * @param rules    - Mapping rules (or a preset name)
 * @param options  - Additional options
 */
export function mapPaletteToSemantics(
  palette: PaletteMap,
  rules: SemanticMappingRule[] | string,
  options?: {
    /** UX contexts to generate for (omit for global tokens only) */
    uxContexts?: string[];
    /** Additional states beyond default */
    states?: string[];
    /** Token type to set on generated tokens */
    tokenType?: string;
  },
): PaletteToSemanticResult {
  // Resolve preset if string
  const resolvedRules = typeof rules === "string"
    ? (MAPPING_PRESETS[rules]?.rules ?? [])
    : rules;

  if (resolvedRules.length === 0) {
    throw new Error(
      typeof rules === "string"
        ? `Unknown mapping preset "${rules}". Available: ${Object.keys(MAPPING_PRESETS).join(", ")}`
        : "No mapping rules provided.",
    );
  }

  const uxContexts = options?.uxContexts ?? [undefined as unknown as string];
  const additionalStates = options?.states ?? [];
  const tokenType = options?.tokenType ?? "color";

  const tokens = new Map<string, DesignToken>();
  const scalesUsed = new Set<string>();
  const intentsMatched = new Set<string>();
  const unmappedIntents = new Set<string>();

  for (const rule of resolvedRules) {
    const scale = palette.scales[rule.paletteScale];
    if (!scale) {
      unmappedIntents.add(rule.intent);
      continue;
    }

    scalesUsed.add(rule.paletteScale);
    intentsMatched.add(rule.intent);

    // Generate tokens for each UX context
    for (const uxContext of uxContexts) {
      // Default state token
      const defaultHex = findStepHex(scale, rule.defaultStep);
      if (defaultHex) {
        const path = buildSemanticPath({
          propertyClass: rule.propertyClass,
          uxContext: uxContext || undefined,
          intent: rule.intent,
        });
        tokens.set(path, {
          path,
          value: defaultHex,
          resolvedValue: defaultHex,
          type: tokenType as DesignToken["type"],
          description: `${rule.intent} ${rule.propertyClass} — ${rule.paletteScale} step ${rule.defaultStep}`,
        });
      }

      // State variants
      const states = [
        ...Object.keys(rule.stateOffsets ?? {}),
        ...additionalStates,
      ];
      const seenStates = new Set<string>();

      for (const state of states) {
        if (seenStates.has(state)) continue;
        seenStates.add(state);

        const offset = rule.stateOffsets?.[state] ?? 0;
        const stateStep = rule.defaultStep + offset;
        const stateHex = findStepHex(scale, stateStep);

        if (stateHex) {
          const path = buildSemanticPath({
            propertyClass: rule.propertyClass,
            uxContext: uxContext || undefined,
            intent: rule.intent,
            state,
          });
          tokens.set(path, {
            path,
            value: stateHex,
            resolvedValue: stateHex,
            type: tokenType as DesignToken["type"],
            description: `${rule.intent} ${rule.propertyClass} (${state}) — ${rule.paletteScale} step ${stateStep}`,
          });
        }
      }
    }
  }

  return {
    tokens,
    report: {
      totalTokens: tokens.size,
      scalesUsed: [...scalesUsed],
      intentsMatched: [...intentsMatched],
      unmappedIntents: [...unmappedIntents],
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find the hex value for the closest step in a scale.
 */
function findStepHex(scale: PaletteScale, targetStep: number): string | null {
  // Clamp to valid range
  const clamped = Math.max(0, targetStep);

  // Exact match first
  const exact = scale.steps.find((s) => s.step === clamped);
  if (exact) return exact.hex;

  // Find closest step
  let closest = scale.steps[0];
  let minDist = Math.abs(closest.step - clamped);

  for (const s of scale.steps) {
    const dist = Math.abs(s.step - clamped);
    if (dist < minDist) {
      closest = s;
      minDist = dist;
    }
  }

  return closest?.hex ?? null;
}

/**
 * Generate status intent rules (success/warning/danger/info).
 * These follow a consistent pattern: light bg, dark text, medium border.
 */
function makeStatusRules(intent: string): SemanticMappingRule[] {
  return [
    { propertyClass: "background", intent, paletteScale: intent, defaultStep: 100, stateOffsets: { hover: 50, active: 100 } },
    { propertyClass: "text", intent, paletteScale: intent, defaultStep: 800 },
    { propertyClass: "icon", intent, paletteScale: intent, defaultStep: 600 },
    { propertyClass: "border", intent, paletteScale: intent, defaultStep: 300 },
  ];
}
