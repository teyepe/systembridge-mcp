/**
 * Component Matcher
 *
 * Maps natural language descriptions of screens, features, or problems
 * to concrete UI patterns and component inventories. This is the "blank
 * canvas syndrome" solver — it takes vague descriptions and returns
 * actionable component lists.
 *
 * Matching strategy:
 * 1. Keyword matching against the UIPattern registry
 * 2. Synonym expansion (common design vocabulary → pattern keywords)
 * 3. Scoring by relevance (keyword density, category coherence)
 */

import {
  COMMON_UI_PATTERNS,
  getUniqueComponents,
  getUniqueIntents,
  getUniqueContexts,
  type UIPattern,
} from "./patterns.js";
import {
  COMPONENT_TOKEN_SURFACES,
  UX_CONTEXTS,
  findComponentContext,
  getComponentSurface,
} from "../semantics/ontology.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MatchResult {
  /** Overall match confidence 0-1 */
  confidence: number;
  /** Matched patterns sorted by relevance */
  patterns: PatternMatch[];
  /** Deduplicated component list from all matched patterns */
  components: string[];
  /** Deduplicated UX contexts */
  uxContexts: string[];
  /** Deduplicated intents */
  intents: string[];
  /** Components that have known token surfaces vs unknown */
  knownComponents: string[];
  unknownComponents: string[];
  /** Summary text */
  summary: string;
}

export interface PatternMatch {
  pattern: UIPattern;
  /** How well this pattern matches the query (0-1) */
  score: number;
  /** Which keywords matched */
  matchedKeywords: string[];
}

// ---------------------------------------------------------------------------
// Synonym expansion
// ---------------------------------------------------------------------------

/**
 * Additional domain vocabulary that maps to pattern keywords.
 * This bridges the gap between how designers describe things and
 * how the pattern registry indexes them.
 */
const SYNONYM_MAP: ReadonlyMap<string, string[]> = new Map([
  // Auth synonyms
  ["authentication", ["login", "sign in", "credentials"]],
  ["oauth", ["login", "sign in", "authenticate"]],
  ["sso", ["login", "sign in", "authenticate"]],
  ["2fa", ["login", "authenticate"]],
  ["mfa", ["login", "authenticate"]],

  // Layout synonyms
  ["scaffold", ["layout", "app shell"]],
  ["template", ["layout", "app shell"]],
  ["shell", ["layout", "app shell", "sidebar"]],
  ["frame", ["layout", "app shell"]],

  // Data synonyms
  ["crud", ["table", "data grid", "admin"]],
  ["api", ["data", "table", "records"]],
  ["database", ["table", "data grid", "records"]],
  ["report", ["analytics", "dashboard", "chart"]],

  // Commerce synonyms
  ["buy", ["purchase", "checkout", "cart"]],
  ["sell", ["product listing", "catalog", "shop"]],
  ["pay", ["payment", "checkout", "billing"]],
  ["subscribe", ["subscription", "pricing", "plans"]],

  // Feedback synonyms
  ["error handling", ["error page", "error state"]],
  ["success message", ["toast", "alert", "notification"]],
  ["loading", ["skeleton", "progress"]],
  ["confirm", ["modal", "dialog", "confirm"]],

  // General synonyms
  ["homepage", ["landing", "hero", "homepage"]],
  ["home", ["landing", "homepage", "dashboard"]],
  ["about", ["landing", "content page"]],
  ["help", ["documentation", "content page"]],
  ["docs", ["documentation", "content page"]],
  ["blog", ["article", "blog", "content page"]],
]);

// ---------------------------------------------------------------------------
// Matching engine
// ---------------------------------------------------------------------------

/**
 * Match a natural language description to UI patterns.
 *
 * @param description - Free-text description of the screen, feature, or problem.
 * @param maxPatterns - Maximum number of patterns to return (default: 5).
 */
export function matchDescription(
  description: string,
  maxPatterns = 5,
): MatchResult {
  const normalized = description.toLowerCase().trim();
  const words = tokenize(normalized);

  // Expand synonyms
  const expandedWords = new Set(words);
  for (const word of words) {
    const synonyms = SYNONYM_MAP.get(word);
    if (synonyms) {
      for (const s of synonyms) expandedWords.add(s);
    }
    // Also try multi-word combinations
    for (const [key, syns] of SYNONYM_MAP) {
      if (normalized.includes(key)) {
        for (const s of syns) expandedWords.add(s);
      }
    }
  }

  // Score each pattern
  const scored: PatternMatch[] = [];
  for (const pattern of COMMON_UI_PATTERNS) {
    const { score, matchedKeywords } = scorePattern(
      pattern,
      normalized,
      expandedWords,
    );
    if (score > 0) {
      scored.push({ pattern, score, matchedKeywords });
    }
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Take top N
  const topPatterns = scored.slice(0, maxPatterns);

  // If no patterns matched, try a fallback: match any individual component name
  if (topPatterns.length === 0) {
    const fallback = matchComponentsDirect(normalized);
    if (fallback.length > 0) {
      return buildResult([], fallback, 0.3);
    }
    return buildResult([], [], 0);
  }

  // Deduplicate components from matched patterns
  const allComponents = getUniqueComponents(
    topPatterns.map((m) => m.pattern),
  );

  return buildResult(topPatterns, allComponents, topPatterns[0]?.score ?? 0);
}

/**
 * Score a pattern against the query.
 */
function scorePattern(
  pattern: UIPattern,
  query: string,
  expandedWords: Set<string>,
): { score: number; matchedKeywords: string[] } {
  const matchedKeywords: string[] = [];
  let rawScore = 0;

  // Keyword matching: check if any pattern keyword appears in the query
  for (const kw of pattern.keywords) {
    if (query.includes(kw)) {
      matchedKeywords.push(kw);
      // Longer keyword matches are more significant
      rawScore += kw.split(/\s+/).length;
    }
  }

  // Check expanded words against keywords
  for (const word of expandedWords) {
    for (const kw of pattern.keywords) {
      if (kw.includes(word) && !matchedKeywords.includes(kw)) {
        matchedKeywords.push(kw);
        rawScore += 0.5;
      }
    }
  }

  // Pattern name / category match
  if (query.includes(pattern.name.toLowerCase())) {
    rawScore += 2;
  }
  if (query.includes(pattern.category)) {
    rawScore += 0.5;
  }

  // Screen example match
  if (pattern.screenExamples) {
    for (const ex of pattern.screenExamples) {
      if (query.includes(ex.toLowerCase())) {
        rawScore += 1.5;
        matchedKeywords.push(ex);
      }
    }
  }

  // Component name match (someone mentions specific components)
  for (const comp of pattern.components) {
    if (query.includes(comp)) {
      rawScore += 0.3;
    }
  }

  // Normalize score to 0-1 range
  const maxPossibleScore = pattern.keywords.length * 2 + 5;
  const score = Math.min(1.0, rawScore / Math.max(maxPossibleScore, 5));

  return { score, matchedKeywords };
}

/**
 * Fallback: directly match component names in the description.
 */
function matchComponentsDirect(description: string): string[] {
  const matched: string[] = [];
  for (const surface of COMPONENT_TOKEN_SURFACES) {
    if (description.includes(surface.component)) {
      matched.push(surface.component);
    }
  }
  // Also check UX context component lists
  for (const ctx of UX_CONTEXTS) {
    for (const comp of ctx.components) {
      if (description.includes(comp) && !matched.includes(comp)) {
        matched.push(comp);
      }
    }
  }
  return matched;
}

/**
 * Simple tokenizer — splits on whitespace and common punctuation.
 */
function tokenize(text: string): string[] {
  return text
    .replace(/[,.;:!?()[\]{}'"]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

/**
 * Build a MatchResult from scored patterns and components.
 */
function buildResult(
  patterns: PatternMatch[],
  components: string[],
  topScore: number,
): MatchResult {
  const uxContexts =
    patterns.length > 0
      ? getUniqueContexts(patterns.map((m) => m.pattern))
      : [...new Set(
          components
            .map((c) => findComponentContext(c))
            .filter(Boolean)
            .map((ctx) => ctx!.id),
        )];

  const intents =
    patterns.length > 0
      ? getUniqueIntents(patterns.map((m) => m.pattern))
      : ["base", "accent", "danger"]; // safe defaults

  const known: string[] = [];
  const unknown: string[] = [];
  for (const c of components) {
    if (getComponentSurface(c)) {
      known.push(c);
    } else {
      unknown.push(c);
    }
  }

  // Build summary
  const lines: string[] = [];
  if (patterns.length > 0) {
    lines.push(
      `Matched **${patterns.length}** UI pattern(s): ` +
        patterns.map((m) => m.pattern.name).join(", ") +
        ".",
    );
  }
  lines.push(`**${components.length}** component(s) identified: ${components.join(", ") || "none"}.`);
  lines.push(`UX contexts: ${uxContexts.join(", ") || "none"}.`);
  lines.push(`Semantic intents needed: ${intents.join(", ")}.`);
  if (known.length > 0) {
    lines.push(`${known.length} component(s) have built-in token surfaces.`);
  }
  if (unknown.length > 0) {
    lines.push(
      `${unknown.length} component(s) will use generic fallback: ${unknown.join(", ")}.`,
    );
  }

  return {
    confidence: topScore,
    patterns,
    components,
    uxContexts,
    intents,
    knownComponents: known,
    unknownComponents: unknown,
    summary: lines.join("\n"),
  };
}
