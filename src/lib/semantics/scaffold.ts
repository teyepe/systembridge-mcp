/**
 * Semantic Token Scaffolding
 *
 * Given a component inventory, generates the minimum viable semantic token
 * set with correct property class separation, intent coverage, and state
 * completeness. This is the "intelligent first draft" that prevents teams
 * from either under-specifying or over-engineering their semantic layer.
 */

import type { DesignToken } from "../types.js";
import {
  ALL_PROPERTY_CLASSES,
  SEMANTIC_INTENTS,
  INTERACTION_STATES,
  EMPHASIS_MODIFIERS,
  UX_CONTEXTS,
  COMPONENT_TOKEN_SURFACES,
  buildSemanticPath,
  getComponentSurface,
  findComponentContext,
  type ComponentTokenSurface,
  type PropertyClass,
  type SemanticTokenName,
  type UxContext,
} from "./ontology.js";

// ---------------------------------------------------------------------------
// Scaffold options
// ---------------------------------------------------------------------------

export interface ScaffoldOptions {
  /**
   * Components to scaffold tokens for.
   * Use component names like "button", "text-input", "card", "alert".
   */
  components: string[];

  /**
   * If true, include emphasis modifiers (strong/soft/plain) for each
   * intent. Default: false (start minimal, add later).
   */
  includeModifiers?: boolean;

  /**
   * If true, include global (context-free) semantic tokens in addition
   * to context-specific ones. Default: true.
   */
  includeGlobalTokens?: boolean;

  /**
   * Additional intents beyond the component defaults.
   * e.g., if you want "warning" on a button even though it's not in
   * the default surface definition.
   */
  additionalIntents?: string[];

  /**
   * Token value strategy: how placeholder values are generated.
   * - "reference": Use {core.color.*} style references (default)
   * - "placeholder": Use descriptive placeholders like "#TODO"
   * - "empty": Leave values empty
   */
  valueStrategy?: "reference" | "placeholder" | "empty";

  /**
   * Output format for the generated tokens.
   * - "flat": flat path → DesignToken map
   * - "nested": nested JSON object (W3C-style)
   */
  outputFormat?: "flat" | "nested";
}

// ---------------------------------------------------------------------------
// Value generation helpers
// ---------------------------------------------------------------------------

/**
 * Intent-to-primitive mapping for reference-style values.
 * Maps semantic intents to likely core token paths.
 */
const INTENT_PRIMITIVE_HINTS: Record<string, Record<string, string>> = {
  base: {
    background: "{core.color.neutral.100}",
    text: "{core.color.neutral.900}",
    icon: "{core.color.neutral.700}",
    border: "{core.color.neutral.300}",
    outline: "{core.color.neutral.500}",
    shadow: "{core.color.neutral.200}",
  },
  accent: {
    background: "{core.color.brand.500}",
    text: "{core.color.brand.50}",
    icon: "{core.color.brand.50}",
    border: "{core.color.brand.600}",
    outline: "{core.color.brand.400}",
    shadow: "{core.color.brand.200}",
  },
  muted: {
    background: "{core.color.neutral.50}",
    text: "{core.color.neutral.500}",
    icon: "{core.color.neutral.400}",
    border: "{core.color.neutral.200}",
    outline: "{core.color.neutral.300}",
    shadow: "{core.color.neutral.100}",
  },
  inverted: {
    background: "{core.color.neutral.900}",
    text: "{core.color.neutral.50}",
    icon: "{core.color.neutral.100}",
    border: "{core.color.neutral.700}",
    outline: "{core.color.neutral.500}",
    shadow: "{core.color.neutral.800}",
  },
  success: {
    background: "{core.color.green.100}",
    text: "{core.color.green.900}",
    icon: "{core.color.green.600}",
    border: "{core.color.green.300}",
    outline: "{core.color.green.400}",
    shadow: "{core.color.green.200}",
  },
  warning: {
    background: "{core.color.yellow.100}",
    text: "{core.color.yellow.900}",
    icon: "{core.color.yellow.600}",
    border: "{core.color.yellow.300}",
    outline: "{core.color.yellow.400}",
    shadow: "{core.color.yellow.200}",
  },
  danger: {
    background: "{core.color.red.100}",
    text: "{core.color.red.900}",
    icon: "{core.color.red.600}",
    border: "{core.color.red.300}",
    outline: "{core.color.red.400}",
    shadow: "{core.color.red.200}",
  },
  info: {
    background: "{core.color.blue.100}",
    text: "{core.color.blue.900}",
    icon: "{core.color.blue.600}",
    border: "{core.color.blue.300}",
    outline: "{core.color.blue.400}",
    shadow: "{core.color.blue.200}",
  },
};

function generateValue(
  strategy: "reference" | "placeholder" | "empty",
  propertyClass: string,
  intent: string,
  state?: string,
): string {
  if (strategy === "empty") return "";

  if (strategy === "placeholder") {
    const stateSuffix = state && state !== "default" ? ` (${state})` : "";
    return `#TODO: ${propertyClass}.${intent}${stateSuffix}`;
  }

  // Reference strategy
  const hints = INTENT_PRIMITIVE_HINTS[intent];
  if (!hints) return `{core.color.${intent}.500}`;
  const base = hints[propertyClass] ?? `{core.color.${intent}.500}`;

  if (state && state !== "default") {
    // Adjust shade for states
    const shadeAdjust: Record<string, number> = {
      hover: -100,
      active: -200,
      focus: 0,
      disabled: 0,
      selected: -100,
    };
    // Simple numeric shade adjustment in the reference
    const match = base.match(/\.(\d+)\}/);
    if (match) {
      const shade = parseInt(match[1], 10);
      const adjusted = Math.max(50, Math.min(950, shade + (shadeAdjust[state] ?? 0)));
      return base.replace(/\.\d+\}/, `.${adjusted}}`);
    }
  }

  return base;
}

function generateDescription(
  propertyClass: string,
  uxContext: string | undefined,
  intent: string,
  state?: string,
  modifier?: string,
): string {
  const parts: string[] = [];
  const propDef = ALL_PROPERTY_CLASSES.find((p) => p.id === propertyClass);
  const intentDef = SEMANTIC_INTENTS.find((i) => i.id === intent);
  const ctxDef = uxContext
    ? UX_CONTEXTS.find((u) => u.id === uxContext)
    : undefined;

  if (propDef) parts.push(propDef.label);
  if (ctxDef) parts.push(`for ${ctxDef.label.toLowerCase()} elements`);
  if (intentDef) parts.push(`with ${intentDef.label.toLowerCase()} intent`);
  if (modifier && modifier !== "default") parts.push(`(${modifier} emphasis)`);
  if (state && state !== "default") parts.push(`in ${state} state`);

  return parts.join(" ") + ".";
}

// ---------------------------------------------------------------------------
// Scaffold generator
// ---------------------------------------------------------------------------

export interface ScaffoldResult {
  /** Generated tokens as flat map */
  tokens: Map<string, DesignToken>;
  /** Summary of what was generated */
  summary: ScaffoldSummary;
}

export interface ScaffoldSummary {
  /** Total tokens generated */
  totalTokens: number;
  /** Components covered */
  components: string[];
  /** Components for which no built-in surface was found (custom fallback used) */
  unknownComponents: string[];
  /** UX contexts covered */
  uxContexts: string[];
  /** Property classes covered */
  propertyClasses: string[];
  /** Breakdown by uxContext */
  breakdown: Array<{
    uxContext: string;
    tokenCount: number;
    propertyClasses: string[];
    intents: string[];
    states: string[];
  }>;
}

/**
 * Generate a minimum viable semantic token set from a component inventory.
 */
export function scaffoldSemanticTokens(
  options: ScaffoldOptions,
): ScaffoldResult {
  const {
    components,
    includeModifiers = false,
    includeGlobalTokens = true,
    additionalIntents = [],
    valueStrategy = "reference",
    outputFormat = "flat",
  } = options;

  const tokens = new Map<string, DesignToken>();
  const unknownComponents: string[] = [];
  const coveredContexts = new Set<string>();
  const coveredClasses = new Set<string>();

  // ---- Per-component scaffolding ----
  for (const comp of components) {
    let surface = getComponentSurface(comp);

    if (!surface) {
      // Try to find a UX context for the component and create a basic surface
      const ctx = findComponentContext(comp);
      if (ctx) {
        surface = {
          component: comp,
          uxContext: ctx.id,
          intents: ["base", "accent"],
          propertyClasses: ctx.requiredPropertyClasses,
          states: ctx.interactive
            ? ["default", "hover", "active", "focus", "disabled"]
            : ["default"],
        };
      } else {
        // Complete unknown — use a generic surface
        unknownComponents.push(comp);
        surface = {
          component: comp,
          uxContext: "surface",
          intents: ["base"],
          propertyClasses: ["background", "text", "border"],
          states: ["default"],
        };
      }
    }

    const intents = [
      ...new Set([...surface.intents, ...additionalIntents]),
    ];

    const modifiers =
      includeModifiers
        ? EMPHASIS_MODIFIERS.map((m) => m.id)
        : ["default"];

    coveredContexts.add(surface.uxContext);

    for (const propClass of surface.propertyClasses) {
      coveredClasses.add(propClass);

      for (const intent of intents) {
        for (const modifier of modifiers) {
          for (const state of surface.states) {
            const name: SemanticTokenName = {
              propertyClass: propClass,
              uxContext: surface.uxContext,
              intent,
              modifier: modifier !== "default" ? modifier : undefined,
              state: state !== "default" ? state : undefined,
            };

            const path = buildSemanticPath(name);
            if (tokens.has(path)) continue; // Deduplicate across components

            tokens.set(path, {
              path,
              value: generateValue(valueStrategy, propClass, intent, state),
              resolvedValue: undefined,
              type: propClass === "shadow" ? "shadow" : (
                ["spacing-inline", "spacing-block", "gap", "sizing", "radius"].includes(propClass)
                  ? "dimension"
                  : "color"
              ),
              description: generateDescription(
                propClass,
                surface.uxContext,
                intent,
                state,
                modifier,
              ),
            });
          }
        }
      }

      // Handle extra slots (e.g., placeholder for inputs)
      if (surface.extraSlots) {
        for (const slot of surface.extraSlots) {
          // Extra slots typically only need "text" and "background" property classes
          if (propClass === "text" || propClass === "background") {
            const path = `${propClass}.${surface.uxContext}.${slot}`;
            if (!tokens.has(path)) {
              tokens.set(path, {
                path,
                value: generateValue(valueStrategy, propClass, "muted"),
                resolvedValue: undefined,
                type: "color",
                description: `${propClass === "text" ? "Text" : "Background"} color for ${slot} slot in ${surface.uxContext} elements.`,
              });
            }
          }
        }
      }
    }
  }

  // ---- Global semantic tokens ----
  if (includeGlobalTokens) {
    const globalIntents = ["base", "accent", "muted", "inverted"];
    const globalClasses = ["background", "text", "icon", "border"];

    for (const propClass of globalClasses) {
      coveredClasses.add(propClass);
      for (const intent of globalIntents) {
        const path = buildSemanticPath({ propertyClass: propClass, intent });
        if (!tokens.has(path)) {
          tokens.set(path, {
            path,
            value: generateValue(valueStrategy, propClass, intent),
            resolvedValue: undefined,
            type: "color",
            description: generateDescription(propClass, undefined, intent),
          });
        }
      }
    }
  }

  // ---- Generate summary ----
  const breakdown = new Map<
    string,
    { tokens: number; classes: Set<string>; intents: Set<string>; states: Set<string> }
  >();

  for (const [path] of tokens) {
    const segments = path.split(".");
    // Try to find uxContext from second segment
    const uxCtx =
      UX_CONTEXTS.find((u) => segments[1] === u.id)?.id ?? "_global";
    if (!breakdown.has(uxCtx)) {
      breakdown.set(uxCtx, {
        tokens: 0,
        classes: new Set(),
        intents: new Set(),
        states: new Set(),
      });
    }
    const b = breakdown.get(uxCtx)!;
    b.tokens++;
    b.classes.add(segments[0]);
    if (segments.length > 2) b.intents.add(segments[2]);
    const lastSeg = segments[segments.length - 1];
    if (INTERACTION_STATES.some((s) => s.id === lastSeg)) {
      b.states.add(lastSeg);
    }
  }

  const summary: ScaffoldSummary = {
    totalTokens: tokens.size,
    components,
    unknownComponents,
    uxContexts: [...coveredContexts],
    propertyClasses: [...coveredClasses],
    breakdown: [...breakdown.entries()].map(([ctx, b]) => ({
      uxContext: ctx,
      tokenCount: b.tokens,
      propertyClasses: [...b.classes],
      intents: [...b.intents],
      states: [...b.states],
    })),
  };

  return { tokens, summary };
}

/**
 * Convert the flat token map to a nested JSON object (W3C DT format).
 */
export function tokensToNestedJson(
  tokens: Map<string, DesignToken>,
): Record<string, unknown> {
  const root: Record<string, unknown> = {};

  for (const [path, token] of tokens) {
    const segments = path.split(".");
    let current = root;

    for (let i = 0; i < segments.length - 1; i++) {
      if (!(segments[i] in current)) {
        current[segments[i]] = {};
      }
      current = current[segments[i]] as Record<string, unknown>;
    }

    const leaf = segments[segments.length - 1];
    current[leaf] = {
      $value: token.value,
      $type: token.type,
      $description: token.description,
    };
  }

  return root;
}

/**
 * Merge scaffolded tokens with existing tokens, reporting conflicts.
 */
export interface MergeResult {
  /** Merged token set */
  tokens: Map<string, DesignToken>;
  /** Tokens that were added (new) */
  added: string[];
  /** Tokens that already existed (skipped) */
  skipped: string[];
}

export function mergeWithExisting(
  existing: Map<string, DesignToken>,
  scaffolded: Map<string, DesignToken>,
): MergeResult {
  const merged = new Map(existing);
  const added: string[] = [];
  const skipped: string[] = [];

  for (const [path, token] of scaffolded) {
    if (merged.has(path)) {
      skipped.push(path);
    } else {
      merged.set(path, token);
      added.push(path);
    }
  }

  return { tokens: merged, added, skipped };
}
