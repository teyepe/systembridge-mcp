/**
 * Token Surface Resolver
 *
 * Given a set of components (from pattern matching or manual input),
 * resolves the complete token surface required — property classes,
 * intents, states, and extra slots — using the ontology's component
 * token surface definitions.
 *
 * Also produces gap analysis when compared against existing tokens.
 */

import type { TokenMap } from "../types.js";
import {
  getComponentSurface,
  findComponentContext,
  parseSemanticPathLenient,
  buildSemanticPath,
} from "../semantics/ontology.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TokenSurfaceResolution {
  /** Total token slots required (propertyClass × intent × state combos) */
  totalSlots: number;
  /** Grouped by UX context */
  byContext: ContextTokenSurface[];
  /** All required property classes (deduplicated) */
  propertyClasses: string[];
  /** All required intents (deduplicated) */
  intents: string[];
  /** All required states (deduplicated) */
  states: string[];
  /** Components not found in the registry (will use generic surface) */
  unknownComponents: string[];
}

export interface ContextTokenSurface {
  uxContext: string;
  components: string[];
  propertyClasses: string[];
  intents: string[];
  states: string[];
  extraSlots: string[];
  /** Number of token slots = propertyClasses × intents × states */
  tokenCount: number;
}

export interface GapAnalysis {
  /** Tokens that exist and match the required surface */
  covered: TokenSlot[];
  /** Tokens that are required but missing */
  missing: TokenSlot[];
  /** Tokens that exist but aren't in the required surface (extras) */
  extras: string[];
  /** Coverage percentage */
  coveragePercent: number;
  /** Summary text */
  summary: string;
}

export interface TokenSlot {
  path: string;
  propertyClass: string;
  uxContext: string;
  intent: string;
  state: string;
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the full token surface required for a set of components.
 */
export function resolveTokenSurface(
  components: string[],
): TokenSurfaceResolution {
  const contextMap = new Map<string, ContextTokenSurface>();
  const unknown: string[] = [];

  for (const comp of components) {
    const surface = getComponentSurface(comp);
    const ctx = findComponentContext(comp);

    if (!surface || !ctx) {
      // Use generic fallback
      unknown.push(comp);
      const fallbackCtx = ctx?.id ?? "surface";
      ensureContext(contextMap, fallbackCtx, comp, {
        propertyClasses: ["background", "text", "border"],
        intents: ["base", "accent"],
        states: ["default", "hover"],
        extraSlots: [],
      });
      continue;
    }

    ensureContext(contextMap, surface.uxContext, comp, {
      propertyClasses: surface.propertyClasses,
      intents: surface.intents,
      states: surface.states,
      extraSlots: surface.extraSlots ?? [],
    });
  }

  const contexts = [...contextMap.values()];

  // Compute totals
  let totalSlots = 0;
  for (const ctx of contexts) {
    ctx.tokenCount =
      ctx.propertyClasses.length * ctx.intents.length * ctx.states.length;
    totalSlots += ctx.tokenCount;
  }

  // Deduplicate across contexts
  const allPc = new Set<string>();
  const allIntents = new Set<string>();
  const allStates = new Set<string>();
  for (const ctx of contexts) {
    for (const pc of ctx.propertyClasses) allPc.add(pc);
    for (const i of ctx.intents) allIntents.add(i);
    for (const s of ctx.states) allStates.add(s);
  }

  return {
    totalSlots,
    byContext: contexts,
    propertyClasses: [...allPc].sort(),
    intents: [...allIntents].sort(),
    states: [...allStates].sort(),
    unknownComponents: unknown,
  };
}

/**
 * Compare existing tokens against the required surface, finding gaps.
 */
export function analyzeGaps(
  tokenMap: TokenMap,
  components: string[],
): GapAnalysis {
  const surface = resolveTokenSurface(components);
  const covered: TokenSlot[] = [];
  const missing: TokenSlot[] = [];
  const matchedPaths = new Set<string>();

  // Pre-build a parsed token index so we iterate the tokenMap only once
  // instead of once per slot. Key = "propertyClass|uxContext|intent|state".
  const parsedIndex = buildParsedTokenIndex(tokenMap);

  // Generate all required slots
  for (const ctx of surface.byContext) {
    for (const pc of ctx.propertyClasses) {
      for (const intent of ctx.intents) {
        for (const state of ctx.states) {
          const slot: TokenSlot = {
            path: buildSemanticPath({
              propertyClass: pc,
              uxContext: ctx.uxContext,
              intent,
              state: state === "default" ? undefined : state,
            }),
            propertyClass: pc,
            uxContext: ctx.uxContext,
            intent,
            state,
          };

          // Check if a matching token exists
          if (findMatchingToken(tokenMap, slot, parsedIndex)) {
            covered.push(slot);
            matchedPaths.add(slot.path);
          } else {
            missing.push(slot);
          }
        }
      }
    }
  }

  // Find extras: tokens that exist but aren't in the required slots
  const extras: string[] = [];
  const relevantContexts = new Set(surface.byContext.map((ctx) => ctx.uxContext));
  for (const [path] of tokenMap) {
    if (!matchedPaths.has(path)) {
      const parsed = parseSemanticPathLenient(path);
      if (parsed?.uxContext && relevantContexts.has(parsed.uxContext)) {
        extras.push(path);
      }
    }
  }

  const total = covered.length + missing.length;
  const coveragePercent =
    total > 0 ? Math.round((covered.length / total) * 100) : 0;

  // Build summary
  const lines: string[] = [];
  lines.push(
    `Token surface coverage: **${coveragePercent}%** (${covered.length}/${total} slots)`,
  );
  if (missing.length > 0) {
    lines.push(`**${missing.length}** missing token(s) identified.`);
  }
  if (extras.length > 0) {
    lines.push(`**${extras.length}** extra token(s) found beyond the required surface.`);
  }

  return {
    covered,
    missing,
    extras,
    coveragePercent,
    summary: lines.join("\n"),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureContext(
  map: Map<string, ContextTokenSurface>,
  ctxId: string,
  component: string,
  surface: {
    propertyClasses: string[];
    intents: string[];
    states: string[];
    extraSlots: string[];
  },
): void {
  let ctx = map.get(ctxId);
  if (!ctx) {
    ctx = {
      uxContext: ctxId,
      components: [],
      propertyClasses: [],
      intents: [],
      states: [],
      extraSlots: [],
      tokenCount: 0,
    };
    map.set(ctxId, ctx);
  }

  if (!ctx.components.includes(component)) {
    ctx.components.push(component);
  }

  // Merge (deduplicate)
  for (const pc of surface.propertyClasses) {
    if (!ctx.propertyClasses.includes(pc)) ctx.propertyClasses.push(pc);
  }
  for (const i of surface.intents) {
    if (!ctx.intents.includes(i)) ctx.intents.push(i);
  }
  for (const s of surface.states) {
    if (!ctx.states.includes(s)) ctx.states.push(s);
  }
  for (const e of surface.extraSlots) {
    if (!ctx.extraSlots.includes(e)) ctx.extraSlots.push(e);
  }
}

/**
 * Build a pre-parsed index of all tokens for fast slot matching.
 * Parses every token path once using lenient parsing and indexes by
 * composite key "propertyClass|uxContext|intent|state".
 */
function buildParsedTokenIndex(tokenMap: TokenMap): Set<string> {
  const index = new Set<string>();
  for (const [path] of tokenMap) {
    // Index exact path
    index.add(path);

    // Parse and index by semantic structure
    const parsed = parseSemanticPathLenient(path);
    if (parsed) {
      const key = `${parsed.propertyClass}|${parsed.uxContext}|${parsed.intent}|${parsed.state ?? "default"}`;
      index.add(`__parsed__${key}`);
    }
  }
  return index;
}

/**
 * Check if a token matching this slot exists in the map.
 * Uses a pre-built parsed index to avoid O(n) scans per slot.
 */
function findMatchingToken(
  tokenMap: TokenMap,
  slot: TokenSlot,
  parsedIndex: Set<string>,
): boolean {
  // Exact match
  if (tokenMap.has(slot.path)) return true;

  // Common prefix variations
  if (tokenMap.has(`color.${slot.path}`)) return true;
  if (tokenMap.has(`semantic.${slot.path}`)) return true;

  // O(1) lookup against the pre-parsed index
  const key = `__parsed__${slot.propertyClass}|${slot.uxContext}|${slot.intent}|${slot.state}`;
  return parsedIndex.has(key);
}
