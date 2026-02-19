/**
 * Semantic Token Audit
 *
 * Analyzes an existing token set — potentially not yet structured with
 * the ontology — and provides a comprehensive audit covering:
 *
 * 1. Structural analysis: Does the set follow property-class separation?
 * 2. Coverage analysis: Which components / contexts are covered?
 * 3. Scoping violations: Cross-concern, pairing, state consistency issues
 * 4. Migration suggestions: How to restructure for ontology compliance
 * 5. Accessibility surface: Foreground/background pairing for contrast
 */

import type { DesignToken } from "../types.js";
import {
  computeContrast,
  resolveTokenColor,
  type ContrastResult,
} from "../color/index.js";
import {
  ALL_PROPERTY_CLASSES,
  SEMANTIC_INTENTS,
  UX_CONTEXTS,
  INTERACTION_STATES,
  EMPHASIS_MODIFIERS,
  COMPONENT_TOKEN_SURFACES,
  parseSemanticPath,
  parseSemanticPathLenient,
  buildSemanticPath,
  type SemanticTokenName,
  type LenientParseResult,
} from "./ontology.js";
import {
  evaluateScoping,
  generateScopingReport,
  ALL_SCOPING_RULES,
  type ScopingReport,
  type ScopingViolation,
} from "./scoping.js";

// ---------------------------------------------------------------------------
// Audit result types
// ---------------------------------------------------------------------------

export interface SemanticAuditResult {
  /** Overall health score 0-100 */
  healthScore: number;
  /** Structure analysis */
  structure: StructureAnalysis;
  /** Coverage analysis */
  coverage: CoverageAnalysis;
  /** Scoping report (from rules engine) */
  scoping: ScopingReport;
  /** Accessibility surface analysis */
  accessibility: AccessibilityAnalysis;
  /** Dependency graph analysis */
  dependencies: DependencyGraph;
  /** Anti-pattern detection */
  antiPatterns: AntiPatternReport;
  /** Migration suggestions for non-compliant tokens */
  migration: MigrationSuggestion[];
  /** Summary text */
  summary: string;
}

// ---- Structure ----

export interface StructureAnalysis {
  /** Total tokens analyzed */
  totalTokens: number;
  /** Tokens that parse as valid semantic names */
  compliantTokens: number;
  /** Tokens that don't follow the naming convention */
  nonCompliantTokens: number;
  /** Compliance percentage */
  complianceRate: number;
  /** Breakdown by property class */
  propertyClassDistribution: Record<string, number>;
  /** Breakdown by UX context */
  uxContextDistribution: Record<string, number>;
  /** Breakdown by intent */
  intentDistribution: Record<string, number>;
  /** Breakdown by state */
  stateDistribution: Record<string, number>;
  /** Non-compliant token paths */
  nonCompliantPaths: string[];
}

// ---- Coverage ----

export interface CoverageAnalysis {
  /**
   * Coverage matrix: for each UX context, which property classes are present
   * and which are required but missing.
   */
  matrix: CoverageCell[];
  /** UX contexts found in the token set */
  coveredContexts: string[];
  /** UX contexts from the ontology that are absent */
  missingContexts: string[];
  /** Overall coverage score (covered-classes / required-classes) */
  coverageScore: number;
}

export interface CoverageCell {
  uxContext: string;
  propertyClass: string;
  /** Is this cell populated (at least one token)? */
  present: boolean;
  /** Is this cell required by the ontology? */
  required: boolean;
  /** How many tokens fill this cell */
  tokenCount: number;
  /** Intents covered in this cell */
  intents: string[];
  /** States covered in this cell */
  states: string[];
}

// ---- Accessibility ----

export interface AccessibilityAnalysis {
  /** Token pairs suitable for contrast checking */
  pairs: ContrastPair[];
  /** Pairs that couldn't be formed (missing foreground or background) */
  unpairedTokens: string[];
  /** Number of pairs with computable contrast values */
  computablePairs: number;
  /** Number of pairs that fail WCAG 2.1 AA for normal text */
  wcagFailures: number;
  /** Number of pairs with APCA Lc below body-text threshold (75) */
  apcaFailures: number;
  /** Contrast score 0-1 (ratio of passing pairs to computable pairs) */
  contrastScore: number;
}

export interface ContrastPair {
  /** Background token path */
  backgroundPath: string;
  /** Foreground (text/icon) token path */
  foregroundPath: string;
  /** Background value */
  backgroundValue: string;
  /** Foreground value */
  foregroundValue: string;
  /** Common context (intent + uxContext + state) */
  context: string;
  /** Whether both values could be resolved to colors */
  computable: boolean;
  /** Full contrast result (when computable) */
  contrast?: ContrastResult;
  /** Issue description if contrast fails thresholds */
  issue?: string;
}

// ---- Migration ----

export interface MigrationSuggestion {
  /** Original token path */
  originalPath: string;
  /** Suggested new path following the ontology */
  suggestedPath: string;
  /** Confidence level 0-1 */
  confidence: number;
  /** Explanation of why this mapping was suggested */
  reason: string;
}

// ---- Dependency Graph ----

export interface DependencyGraph {
  /** All nodes in the dependency graph */
  nodes: DependencyNode[];
  /** All edges (references) in the graph */
  edges: DependencyEdge[];
  /** Summary metrics */
  metrics: DependencyMetrics;
  /** Issues detected in the dependency structure */
  issues: DependencyIssue[];
}

export interface DependencyNode {
  /** Token path */
  path: string;
  /** Token type (primitive, semantic, or unknown) */
  nodeType: "primitive" | "semantic" | "unknown";
  /** Number of tokens this token references */
  outgoingRefs: number;
  /** Number of tokens that reference this token */
  incomingRefs: number;
  /** Maximum depth from a primitive (0 for primitives, 1+ for semantic) */
  depth: number;
  /** Whether this token is isolated (not referenced and doesn't reference) */
  isolated: boolean;
}

export interface DependencyEdge {
  /** Source token path (the one containing the reference) */
  from: string;
  /** Target token path (the referenced token) */
  to: string;
  /** Whether the reference could be resolved */
  resolved: boolean;
}

export interface DependencyMetrics {
  /** Total tokens analyzed */
  totalTokens: number;
  /** Tokens that are primitives (no references to other tokens) */
  primitiveCount: number;
  /** Tokens that reference other tokens */
  semanticCount: number;
  /** Maximum reference chain depth found */
  maxDepth: number;
  /** Average depth across all tokens */
  avgDepth: number;
  /** Tokens with no incoming or outgoing references */
  isolatedCount: number;
  /** Total number of reference relationships */
  totalEdges: number;
}

export interface DependencyIssue {
  /** Issue severity */
  severity: "error" | "warning" | "info";
  /** Issue type */
  type: "circular" | "unresolved" | "deep-chain" | "orphaned";
  /** Description of the issue */
  message: string;
  /** Tokens involved */
  tokenPaths: string[];
}

// ---- Anti-Patterns ----

export interface AntiPatternReport {
  /** All anti-patterns detected */
  patterns: AntiPattern[];
  /** Summary metrics */
  summary: {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
}

export interface AntiPattern {
  /** Anti-pattern type */
  type:
    | "primitive-leakage"
    | "naming-inconsistency"
    | "redundant-tokens"
    | "semantic-drift"
    | "missing-variants"
    | "over-nesting";
  /** Severity level */
  severity: "error" | "warning" | "info";
  /** Description */
  message: string;
  /** Affected token paths */
  tokenPaths: string[];
  /** Suggestion for resolution */
  suggestion?: string;
}

// ---------------------------------------------------------------------------
// Audit engine
// ---------------------------------------------------------------------------

/**
 * Perform a comprehensive audit of a semantic token set.
 *
 * @param tokens - Map of path → DesignToken. Can be any token set —
 *                 the audit will identify which follow the ontology and which don't.
 * @param options - Audit configuration
 */
export function auditSemanticTokens(
  tokens: Map<string, DesignToken>,
  options?: {
    /** Only audit tokens whose paths start with these prefixes */
    pathPrefixes?: string[];
    /** Skip these scoping rules */
    skipRules?: string[];
  },
): SemanticAuditResult {
  // Optionally filter tokens
  let tokenSet = tokens;
  if (options?.pathPrefixes?.length) {
    tokenSet = new Map(
      [...tokens].filter(([path]) =>
        options.pathPrefixes!.some((prefix) => path.startsWith(prefix)),
      ),
    );
  }

  const structure = analyzeStructure(tokenSet);
  const coverage = analyzeCoverage(tokenSet);
  // Determine which rules to run (excluding skipped ones)
  const skipSet = new Set(options?.skipRules ?? []);
  const ruleIds = skipSet.size > 0
    ? ALL_SCOPING_RULES.filter((r) => !skipSet.has(r.id)).map((r) => r.id)
    : undefined;
  const scoping = generateScopingReport(evaluateScoping(tokenSet, ruleIds));
  const accessibility = analyzeAccessibility(tokenSet);
  const dependencies = analyzeDependencies(tokenSet);
  const antiPatterns = analyzeAntiPatterns(tokenSet);
  const migration = suggestMigrations(tokenSet);

  const healthScore = computeHealthScore(structure, coverage, scoping, accessibility, dependencies, antiPatterns);

  const summary = buildSummary(healthScore, structure, coverage, scoping, accessibility, dependencies, antiPatterns, migration);

  return {
    healthScore,
    structure,
    coverage,
    scoping,
    accessibility,
    dependencies,
    antiPatterns,
    migration,
    summary,
  };
}

// ---------------------------------------------------------------------------
// Structure analysis
// ---------------------------------------------------------------------------

function analyzeStructure(tokens: Map<string, DesignToken>): StructureAnalysis {
  const propertyClassDist: Record<string, number> = {};
  const uxContextDist: Record<string, number> = {};
  const intentDist: Record<string, number> = {};
  const stateDist: Record<string, number> = {};
  const nonCompliant: string[] = [];
  let compliant = 0;

  for (const [path] of tokens) {
    const parsed = parseSemanticPath(path);
    if (parsed) {
      compliant++;
      propertyClassDist[parsed.propertyClass] =
        (propertyClassDist[parsed.propertyClass] ?? 0) + 1;
      if (parsed.uxContext) {
        uxContextDist[parsed.uxContext] =
          (uxContextDist[parsed.uxContext] ?? 0) + 1;
      }
      intentDist[parsed.intent] = (intentDist[parsed.intent] ?? 0) + 1;
      const state = parsed.state ?? "default";
      stateDist[state] = (stateDist[state] ?? 0) + 1;
    } else {
      nonCompliant.push(path);
    }
  }

  return {
    totalTokens: tokens.size,
    compliantTokens: compliant,
    nonCompliantTokens: nonCompliant.length,
    complianceRate: tokens.size > 0 ? compliant / tokens.size : 0,
    propertyClassDistribution: propertyClassDist,
    uxContextDistribution: uxContextDist,
    intentDistribution: intentDist,
    stateDistribution: stateDist,
    nonCompliantPaths: nonCompliant,
  };
}

// ---------------------------------------------------------------------------
// Coverage analysis
// ---------------------------------------------------------------------------

function analyzeCoverage(tokens: Map<string, DesignToken>): CoverageAnalysis {
  // Build matrix
  const byContextAndClass = new Map<
    string,
    { tokens: number; intents: Set<string>; states: Set<string> }
  >();

  for (const [path] of tokens) {
    const parsed = parseSemanticPath(path);
    if (!parsed?.uxContext) continue;

    const key = `${parsed.uxContext}::${parsed.propertyClass}`;
    if (!byContextAndClass.has(key)) {
      byContextAndClass.set(key, {
        tokens: 0,
        intents: new Set(),
        states: new Set(),
      });
    }
    const cell = byContextAndClass.get(key)!;
    cell.tokens++;
    cell.intents.add(parsed.intent);
    cell.states.add(parsed.state ?? "default");
  }

  // Build matrix cells
  const matrix: CoverageCell[] = [];
  const coveredContexts = new Set<string>();
  let totalRequired = 0;
  let totalCovered = 0;

  for (const uxCtx of UX_CONTEXTS) {
    for (const propClass of ALL_PROPERTY_CLASSES) {
      const key = `${uxCtx.id}::${propClass.id}`;
      const data = byContextAndClass.get(key);
      const isRequired = uxCtx.requiredPropertyClasses.includes(propClass.id);

      if (isRequired) totalRequired++;
      if (data && isRequired) totalCovered++;

      if (data) coveredContexts.add(uxCtx.id);

      matrix.push({
        uxContext: uxCtx.id,
        propertyClass: propClass.id,
        present: !!data,
        required: isRequired,
        tokenCount: data?.tokens ?? 0,
        intents: data ? [...data.intents] : [],
        states: data ? [...data.states] : [],
      });
    }
  }

  const allContextIds = UX_CONTEXTS.map((u) => u.id);
  const missingContexts = allContextIds.filter(
    (c) => !coveredContexts.has(c),
  );

  return {
    matrix,
    coveredContexts: [...coveredContexts],
    missingContexts,
    coverageScore: totalRequired > 0 ? totalCovered / totalRequired : 0,
  };
}

// ---------------------------------------------------------------------------
// Accessibility analysis
// ---------------------------------------------------------------------------

function analyzeAccessibility(
  tokens: Map<string, DesignToken>,
): AccessibilityAnalysis {
  const pairs: ContrastPair[] = [];
  const unpairedTokens: string[] = [];

  // Group semantic tokens by (uxContext, intent, state)
  // Uses strict parsing first, then falls back to lenient/alias-aware parsing
  // so tokens like "color.bg.primary" or "fg.accent" are still detected.
  const groups = new Map<
    string,
    { backgrounds: [string, DesignToken][]; foregrounds: [string, DesignToken][] }
  >();

  for (const [path, token] of tokens) {
    // Skip non-color tokens — only colors are relevant for contrast
    if (token.type && token.type !== "color") continue;

    // Try strict parse first, then lenient
    const parsed: SemanticTokenName | null =
      parseSemanticPath(path) ?? parseSemanticPathLenient(path);
    if (!parsed) continue;

    const key = [
      parsed.uxContext ?? "_global",
      parsed.intent,
      parsed.modifier ?? "default",
      parsed.state ?? "default",
    ].join("::");

    if (!groups.has(key)) {
      groups.set(key, { backgrounds: [], foregrounds: [] });
    }

    if (parsed.propertyClass === "background") {
      groups.get(key)!.backgrounds.push([path, token]);
    } else if (
      parsed.propertyClass === "text" ||
      parsed.propertyClass === "icon"
    ) {
      groups.get(key)!.foregrounds.push([path, token]);
    }
  }

  for (const [context, group] of groups) {
    if (group.backgrounds.length === 0 && group.foregrounds.length > 0) {
      unpairedTokens.push(
        ...group.foregrounds.map(([p]) => p),
      );
    } else if (group.foregrounds.length === 0 && group.backgrounds.length > 0) {
      unpairedTokens.push(
        ...group.backgrounds.map(([p]) => p),
      );
    } else {
      // Create pairs and compute contrast
      for (const [bgPath, bgToken] of group.backgrounds) {
        for (const [fgPath, fgToken] of group.foregrounds) {
          const bgValue = String(bgToken.resolvedValue ?? bgToken.value);
          const fgValue = String(fgToken.resolvedValue ?? fgToken.value);

          const bgHex = resolveTokenColor(bgToken);
          const fgHex = resolveTokenColor(fgToken);
          const computable = !!(bgHex && fgHex);

          let contrast: ContrastResult | undefined;
          let issue: string | undefined;

          if (computable) {
            contrast = computeContrast(fgHex!, bgHex!, "both");

            // Determine issues
            const issues: string[] = [];
            if (contrast.wcag21 && contrast.wcag21.levelNormal === "fail") {
              issues.push(
                `WCAG 2.1 AA fails for normal text (ratio ${contrast.wcag21.ratio.toFixed(2)}:1, need 4.5:1)`,
              );
            }
            if (contrast.apca && Math.abs(contrast.apca.lc) < 60) {
              issues.push(
                `APCA below large-text threshold (Lc ${contrast.apca.lc.toFixed(1)}, need ≥60)`,
              );
            }
            if (issues.length > 0) {
              issue = issues.join("; ");
            }
          }

          pairs.push({
            backgroundPath: bgPath,
            foregroundPath: fgPath,
            backgroundValue: bgValue,
            foregroundValue: fgValue,
            context,
            computable,
            contrast,
            issue,
          });
        }
      }
    }
  }

  // Compute summary stats
  const computablePairs = pairs.filter((p) => p.computable).length;
  const wcagFailures = pairs.filter(
    (p) => p.contrast?.wcag21?.levelNormal === "fail",
  ).length;
  const apcaFailures = pairs.filter(
    (p) => p.contrast?.apca && Math.abs(p.contrast.apca.lc) < 75,
  ).length;
  const contrastScore =
    computablePairs > 0
      ? (computablePairs - wcagFailures) / computablePairs
      : 1;

  return { pairs, unpairedTokens, computablePairs, wcagFailures, apcaFailures, contrastScore };
}

// ---------------------------------------------------------------------------
// Migration suggestions
// ---------------------------------------------------------------------------

/**
 * Heuristic migration engine:
 * For non-compliant token paths, attempt to infer what ontology-compliant
 * name they should have.
 */
function suggestMigrations(
  tokens: Map<string, DesignToken>,
): MigrationSuggestion[] {
  const suggestions: MigrationSuggestion[] = [];

  // Known mapping patterns from common design systems
  const propertyHints: Array<{
    pattern: RegExp;
    propertyClass: string;
    confidence: number;
  }> = [
    { pattern: /\bbg\b|background/i, propertyClass: "background", confidence: 0.9 },
    { pattern: /\bfg\b|foreground/i, propertyClass: "text", confidence: 0.8 },
    { pattern: /\btext\b|font\b|typography/i, propertyClass: "text", confidence: 0.85 },
    { pattern: /\bicon\b|svg\b/i, propertyClass: "icon", confidence: 0.8 },
    { pattern: /\bborder\b|stroke\b/i, propertyClass: "border", confidence: 0.9 },
    { pattern: /\boutline\b|focus-ring\b/i, propertyClass: "outline", confidence: 0.85 },
    { pattern: /\bshadow\b|elevation\b/i, propertyClass: "shadow", confidence: 0.8 },
    { pattern: /\bspacing\b|padding\b|margin\b|gap\b/i, propertyClass: "spacing-inline", confidence: 0.6 },
    { pattern: /\bradius\b|rounded\b|corner\b/i, propertyClass: "radius", confidence: 0.85 },
  ];

  const intentHints: Array<{
    pattern: RegExp;
    intent: string;
    confidence: number;
  }> = [
    { pattern: /\bprimary\b|brand\b|accent\b/i, intent: "accent", confidence: 0.8 },
    { pattern: /\bsecondary\b|muted\b|subtle\b/i, intent: "muted", confidence: 0.7 },
    { pattern: /\bneutral\b|default\b|base\b/i, intent: "base", confidence: 0.7 },
    { pattern: /\binverse\b|inverted\b|dark\b/i, intent: "inverted", confidence: 0.7 },
    { pattern: /\bsuccess\b|positive\b|valid\b/i, intent: "success", confidence: 0.9 },
    { pattern: /\bwarning\b|caution\b/i, intent: "warning", confidence: 0.9 },
    { pattern: /\berror\b|danger\b|critical\b|destructive\b/i, intent: "danger", confidence: 0.9 },
    { pattern: /\binfo\b|informational\b|notice\b/i, intent: "info", confidence: 0.85 },
  ];

  const contextHints: Array<{
    pattern: RegExp;
    uxContext: string;
    confidence: number;
  }> = [
    { pattern: /\bbutton\b|btn\b|cta\b|action\b/i, uxContext: "action", confidence: 0.8 },
    { pattern: /\binput\b|form\b|field\b|control\b|select\b/i, uxContext: "input", confidence: 0.8 },
    { pattern: /\bcard\b|modal\b|panel\b|page\b|surface\b/i, uxContext: "surface", confidence: 0.7 },
    { pattern: /\balert\b|toast\b|notification\b|banner\b|feedback\b/i, uxContext: "feedback", confidence: 0.8 },
    { pattern: /\bnav\b|menu\b|tab\b|breadcrumb\b/i, uxContext: "navigation", confidence: 0.8 },
    { pattern: /\btable\b|list\b|badge\b|tag\b|data\b/i, uxContext: "data", confidence: 0.7 },
  ];

  const stateHints: Array<{ pattern: RegExp; state: string }> = [
    { pattern: /\bhover\b/i, state: "hover" },
    { pattern: /\bactive\b|pressed\b/i, state: "active" },
    { pattern: /\bfocus\b/i, state: "focus" },
    { pattern: /\bdisabled\b/i, state: "disabled" },
    { pattern: /\bselected\b|checked\b/i, state: "selected" },
  ];

  for (const [path] of tokens) {
    // Skip already-compliant tokens
    if (parseSemanticPath(path)) continue;

    // Try lenient parser first — it uses the alias maps and is more precise
    // than the regex heuristics below.
    const lenient = parseSemanticPathLenient(path);
    if (lenient && lenient.confidence >= 0.5) {
      const suggested = buildSemanticPath({
        propertyClass: lenient.propertyClass,
        uxContext: lenient.uxContext,
        intent: lenient.intent,
        modifier: lenient.modifier,
        state: lenient.state,
      });

      const reasons: string[] = [];
      if (lenient.aliasesUsed.length > 0) {
        for (const alias of lenient.aliasesUsed) {
          reasons.push(`"${alias.original}" → "${alias.canonical}" (${alias.axis})`);
        }
      }
      if (lenient.skippedPrefixes.length > 0) {
        reasons.push(
          `skipped namespace prefix(es): ${lenient.skippedPrefixes.join(".")}`,
        );
      }

      suggestions.push({
        originalPath: path,
        suggestedPath: suggested,
        confidence: lenient.confidence,
        reason:
          `Lenient parse (confidence ${(lenient.confidence * 100).toFixed(0)}%): ` +
          (reasons.length > 0 ? reasons.join("; ") : "alias-aware match") +
          ".",
      });
      continue;
    }

    // Fall back to regex-based heuristics for paths the lenient parser
    // couldn't handle
    let propertyClass: string | undefined;
    let intent: string | undefined;
    let uxContext: string | undefined;
    let state: string | undefined;
    let totalConfidence = 0;
    let matchCount = 0;

    // Try to infer property class
    for (const hint of propertyHints) {
      if (hint.pattern.test(path)) {
        propertyClass = hint.propertyClass;
        totalConfidence += hint.confidence;
        matchCount++;
        break;
      }
    }

    // Try to infer intent
    for (const hint of intentHints) {
      if (hint.pattern.test(path)) {
        intent = hint.intent;
        totalConfidence += hint.confidence;
        matchCount++;
        break;
      }
    }

    // Try to infer UX context
    for (const hint of contextHints) {
      if (hint.pattern.test(path)) {
        uxContext = hint.uxContext;
        totalConfidence += hint.confidence;
        matchCount++;
        break;
      }
    }

    // Try to infer state
    for (const hint of stateHints) {
      if (hint.pattern.test(path)) {
        state = hint.state;
        matchCount++;
        break;
      }
    }

    // Only suggest if we have at least a property class
    if (!propertyClass) continue;

    const suggested = buildSemanticPath({
      propertyClass,
      uxContext,
      intent: intent ?? "base",
      state,
    });

    const confidence = matchCount > 0 ? totalConfidence / matchCount : 0;
    const reasons: string[] = [];
    if (propertyClass) reasons.push(`detected property class "${propertyClass}"`);
    if (intent) reasons.push(`inferred intent "${intent}"`);
    if (uxContext) reasons.push(`matched UX context "${uxContext}"`);
    if (state) reasons.push(`found state "${state}"`);

    suggestions.push({
      originalPath: path,
      suggestedPath: suggested,
      confidence: Math.min(confidence, 1),
      reason: `Auto-detected: ${reasons.join(", ")}.`,
    });
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

// ---------------------------------------------------------------------------
// Dependency graph analysis
// ---------------------------------------------------------------------------

/**
 * Build a dependency graph from token references and analyze structure.
 * Detects circular references, deep chains, orphaned tokens, and unresolved references.
 */
function analyzeDependencies(
  tokens: Map<string, DesignToken>,
): DependencyGraph {
  const nodes: DependencyNode[] = [];
  const edges: DependencyEdge[] = [];
  const issues: DependencyIssue[] = [];

  // Build adjacency lists
  const outgoing = new Map<string, Set<string>>();
  const incoming = new Map<string, Set<string>>();

  // First pass: identify all references
  for (const [path, token] of tokens) {
    const refs = extractReferences(token.value);
    
    if (!outgoing.has(path)) {
      outgoing.set(path, new Set());
    }
    
    for (const ref of refs) {
      outgoing.get(path)!.add(ref);
      
      if (!incoming.has(ref)) {
        incoming.set(ref, new Set());
      }
      incoming.get(ref)!.add(path);
      
      // Check if reference resolves
      const resolved = tokens.has(ref);
      edges.push({ from: path, to: ref, resolved });
      
      if (!resolved) {
        issues.push({
          severity: "error",
          type: "unresolved",
          message: `Token "${path}" references non-existent token "${ref}"`,
          tokenPaths: [path, ref],
        });
      }
    }
  }

  // Second pass: compute depths and detect issues
  const depths = new Map<string, number>();
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function computeDepth(path: string, chain: string[] = []): number {
    if (depths.has(path)) return depths.get(path)!;
    
    // Circular reference detection
    if (visiting.has(path)) {
      const cycle = [...chain, path];
      issues.push({
        severity: "error",
        type: "circular",
        message: `Circular reference detected: ${cycle.join(" → ")}`,
        tokenPaths: cycle,
      });
      return 0; // Break cycle
    }
    
    visiting.add(path);
    const refs = outgoing.get(path);
    
    if (!refs || refs.size === 0) {
      // Primitive token (no outgoing references)
      depths.set(path, 0);
      visiting.delete(path);
      visited.add(path);
      return 0;
    }
    
    // Compute max depth from dependencies
    let maxDepth = 0;
    for (const ref of refs) {
      if (tokens.has(ref)) {
        const refDepth = computeDepth(ref, [...chain, path]);
        maxDepth = Math.max(maxDepth, refDepth + 1);
      }
    }
    
    // Check for deep chains (> 3 levels)
    if (maxDepth > 3) {
      issues.push({
        severity: "warning",
        type: "deep-chain",
        message: `Token "${path}" has reference chain depth of ${maxDepth} (consider flattening)`,
        tokenPaths: [path],
      });
    }
    
    depths.set(path, maxDepth);
    visiting.delete(path);
    visited.add(path);
    return maxDepth;
  }

  // Compute depths for all tokens
  for (const path of tokens.keys()) {
    if (!depths.has(path)) {
      computeDepth(path);
    }
  }

  // Third pass: build nodes and detect isolated tokens
  for (const [path] of tokens) {
    const outRefs = outgoing.get(path)?.size ?? 0;
    const inRefs = incoming.get(path)?.size ?? 0;
    const depth = depths.get(path) ?? 0;
    const isolated = outRefs === 0 && inRefs === 0;
    
    const nodeType: "primitive" | "semantic" | "unknown" =
      outRefs === 0 ? "primitive" : depth > 0 ? "semantic" : "unknown";
    
    nodes.push({
      path,
      nodeType,
      outgoingRefs: outRefs,
      incomingRefs: inRefs,
      depth,
      isolated,
    });
    
    if (isolated && tokens.size > 10) { // Only flag in larger sets
      issues.push({
        severity: "info",
        type: "orphaned",
        message: `Token "${path}" is isolated (not referenced and doesn't reference others)`,
        tokenPaths: [path],
      });
    }
  }

  // Compute metrics
  const primitiveCount = nodes.filter((n) => n.nodeType === "primitive").length;
  const semanticCount = nodes.filter((n) => n.nodeType === "semantic").length;
  const isolatedCount = nodes.filter((n) => n.isolated).length;
  const depthValues = Array.from(depths.values());
  const maxDepth = depthValues.length > 0 ? Math.max(...depthValues) : 0;
  const avgDepth = depthValues.length > 0
    ? depthValues.reduce((a, b) => a + b, 0) / depthValues.length
    : 0;

  const metrics: DependencyMetrics = {
    totalTokens: tokens.size,
    primitiveCount,
    semanticCount,
    maxDepth,
    avgDepth,
    isolatedCount,
    totalEdges: edges.length,
  };

  return { nodes, edges, metrics, issues };
}

/**
 * Extract token reference paths from a value (handles {token.path} syntax)
 */
function extractReferences(value: unknown): string[] {
  if (typeof value !== "string") return [];
  
  const refs: string[] = [];
  const refPattern = /\{([^}]+)\}/g;
  let match;
  
  while ((match = refPattern.exec(value)) !== null) {
    refs.push(match[1]);
  }
  
  return refs;
}

// ---------------------------------------------------------------------------
// Anti-pattern detection
// ---------------------------------------------------------------------------

/**
 * Detect common anti-patterns in token sets
 */
function analyzeAntiPatterns(
  tokens: Map<string, DesignToken>,
): AntiPatternReport {
  const patterns: AntiPattern[] = [];

  // 1. Primitive leakage: Direct color/dimension values in semantic tokens
  const primitiveLeakage = detectPrimitiveLeakage(tokens);
  patterns.push(...primitiveLeakage);

  // 2. Naming inconsistency: Similar tokens with different naming conventions
  const namingIssues = detectNamingInconsistency(tokens);
  patterns.push(...namingIssues);

  // 3. Redundant tokens: Different paths, identical resolved values
  const redundant = detectRedundantTokens(tokens);
  patterns.push(...redundant);

  // 4. Semantic drift: Tokens with similar names but divergent values
  const drift = detectSemanticDrift(tokens);
  patterns.push(...drift);

  // 5. Missing variants: Incomplete state/modifier coverage
  const missingVariants = detectMissingVariants(tokens);
  patterns.push(...missingVariants);

  // Compute summary
  const byType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  
  for (const pattern of patterns) {
    byType[pattern.type] = (byType[pattern.type] ?? 0) + 1;
    bySeverity[pattern.severity] = (bySeverity[pattern.severity] ?? 0) + 1;
  }

  return {
    patterns,
    summary: {
      total: patterns.length,
      byType,
      bySeverity,
    },
  };
}

function detectPrimitiveLeakage(tokens: Map<string, DesignToken>): AntiPattern[] {
  const patterns: AntiPattern[] = [];
  
  for (const [path, token] of tokens) {
    const parsed = parseSemanticPath(path);
    if (!parsed) continue; // Skip non-semantic tokens
    
    // Check if this semantic token has a direct value (no references)
    const value = String(token.resolvedValue ?? token.value);
    const hasReferences = /\{[^}]+\}/.test(String(token.value));
    
    // Flag color values in semantic tokens
    if (!hasReferences && /^#[0-9a-f]{6}$/i.test(value)) {
      patterns.push({
        type: "primitive-leakage",
        severity: "warning",
        message: `Semantic token "${path}" uses direct color value "${value}" (should reference primitive)`,
        tokenPaths: [path],
        suggestion: `Create a primitive color token and reference it, e.g., {core.color.blue.500}`,
      });
    }
  }
  
  return patterns;
}

function detectNamingInconsistency(tokens: Map<string, DesignToken>): AntiPattern[] {
  const patterns: AntiPattern[] = [];
  const tokenPaths = Array.from(tokens.keys());
  
  // Group by property class to find naming inconsistencies
  const byPropertyClass = new Map<string, string[]>();
  
  for (const path of tokenPaths) {
    const parsed = parseSemanticPath(path);
    if (!parsed) continue;
    
    if (!byPropertyClass.has(parsed.propertyClass)) {
      byPropertyClass.set(parsed.propertyClass, []);
    }
    byPropertyClass.get(parsed.propertyClass)!.push(path);
  }
  
  // Check for mixed naming patterns within same property class
  for (const [propertyClass, paths] of byPropertyClass) {
    if (paths.length < 2) continue;
    
    // Check for "background.primary" vs "primary.background" inconsistency
    const separatorPattern = /([.-])/;
    const segments = paths.map(p => p.split(separatorPattern));
    const separators = segments.map(s => s.filter(seg => separatorPattern.test(seg)));
    
    // Check if mixing different separators
    const uniqueSeps = new Set(separators.flat());
    if (uniqueSeps.size > 1) {
       patterns.push({
        type: "naming-inconsistency",
        severity: "info",
        message: `Property class "${propertyClass}" mixes different separators (${Array.from(uniqueSeps).join(", ")})`,
        tokenPaths: paths.slice(0, 5), // Show first 5 examples
        suggestion: `Standardize on a single separator (recommend ".")`,
      });
    }
  }
  
  return patterns;
}

function detectRedundantTokens(tokens: Map<string, DesignToken>): AntiPattern[] {
  const patterns: AntiPattern[] = [];
  const valueGroups = new Map<string, string[]>();
  
  // Group tokens by resolved value
  for (const [path, token] of tokens) {
    const value = String(token.resolvedValue ?? token.value);
    if (!valueGroups.has(value)) {
      valueGroups.set(value, []);
    }
    valueGroups.get(value)!.push(path);
  }
  
  // Flag groups with multiple tokens
  for (const [value, paths] of valueGroups) {
    if (paths.length > 1 && value !== "undefined") {
      // Check if these are legitimately different contexts or truly redundant
      const parsed = paths.map(p => parseSemanticPath(p)).filter(Boolean);
      
      // If they're all the same property class and intent, likely redundant
      if (parsed.length > 1) {
        const propertyClasses = new Set(parsed.map(p => p!.propertyClass));
        const intents = new Set(parsed.map(p => p!.intent));
        
        if (propertyClasses.size === 1 && intents.size === 1) {
          patterns.push({
            type: "redundant-tokens",
            severity: "info",
            message: `${paths.length} tokens share identical value "${value}"`,
            tokenPaths: paths,
            suggestion: `Consider consolidating to a single token`,
          });
        }
      }
    }
  }
  
  return patterns;
}

function detectSemanticDrift(tokens: Map<string, DesignToken>): AntiPattern[] {
  const patterns: AntiPattern[] = [];
  
  // Look for tokens with "primary", "accent", etc. in the name that have different hues
  const semanticGroups: Record<string, Array<{ path: string; value: string }>> = {
    primary: [],
    accent: [],
    danger: [],
    success: [],
  };
  
  for (const [path, token] of tokens) {
    const lower = path.toLowerCase();
    for (const semantic of Object.keys(semanticGroups)) {
      if (lower.includes(semantic)) {
        semanticGroups[semantic].push({
          path,
          value: String(token.resolvedValue ?? token.value),
        });
      }
    }
  }
  
  // Check for divergent values within same semantic group
  for (const [semantic, group] of Object.entries(semanticGroups)) {
    if (group.length < 2) continue;
    
    // Extract color hues (very basic check)
    const hexValues = group
      .map(g => ({ ...g, hex: g.value.match(/#([0-9a-f]{6})/i)?.[1] }))
      .filter(g => g.hex);
    
    if (hexValues.length >= 2) {
      // Check if first two hex digits (red channel) vary significantly
      const hues = hexValues.map(({ hex }) => parseInt(hex!.substring(0, 2), 16));
      const maxDiff = Math.max(...hues) - Math.min(...hues);
      
      if (maxDiff > 50) { // Arbitrary threshold
        patterns.push({
          type: "semantic-drift",
          severity: "warning",
          message: `Tokens with "${semantic}" in name have divergent color values`,
          tokenPaths: hexValues.map(h => h.path),
          suggestion: `Ensure all "${semantic}" tokens derive from the same base color`,
        });
      }
    }
  }
  
  return patterns;
}

function detectMissingVariants(tokens: Map<string, DesignToken>): AntiPattern[] {
  const patterns: AntiPattern[] = [];
  
  // Group by property class + context + intent
  const groups = new Map<string, { paths: string[]; states: Set<string> }>();
  
  for (const [path] of tokens) {
    const parsed = parseSemanticPath(path);
    if (!parsed) continue;
    
    const key = `${parsed.propertyClass}::${parsed.uxContext ?? "_global"}::${parsed.intent}`;
    if (!groups.has(key)) {
      groups.set(key, { paths: [], states: new Set() });
    }
    
    const group = groups.get(key)!;
    group.paths.push(path);
    group.states.add(parsed.state ?? "default");
  }
  
  // Check for incomplete interactive state coverage
  const expectedStates = new Set(["default", "hover", "active", "focus", "disabled"]);
  
  for (const [key, group] of groups) {
    if (group.paths.length === 1 && group.states.has("hover")) {
      // Has hover but might be missing other states
      const missing = Array.from(expectedStates).filter(s => !group.states.has(s));
      if (missing.length > 0 && missing.includes("default")) {
        patterns.push({
          type: "missing-variants",
          severity: "warning",
          message: `Token group "${key}" has some interactive states but missing: ${missing.join(", ")}`,
          tokenPaths: group.paths,
          suggestion: `Add missing interactive states for complete UI coverage`,
        });
      }
    }
  }
  
  return patterns;
}

// ---------------------------------------------------------------------------
// Health score
// ---------------------------------------------------------------------------

function computeHealthScore(
  structure: StructureAnalysis,
  coverage: CoverageAnalysis,
  scoping: ScopingReport,
  accessibility: AccessibilityAnalysis,
  dependencies: DependencyGraph,
  antiPatterns: AntiPatternReport,
): number {
  // Weighted components (adjusted to include new analyses):
  // - Naming compliance: 20%
  // - Coverage score: 15%
  // - Scoping errors: 20% (penalize hard for errors)
  // - Scoping warnings: 8% (gentler penalty)
  // - Contrast compliance: 15%
  // - Dependency health: 12%
  // - Anti-pattern score: 10%

  const complianceScore = structure.complianceRate * 100;
  const coverageScore = coverage.coverageScore * 100;

  // Error penalty: each error removes up to 5 points (max 20 point loss)
  const errorPenalty = Math.min(scoping.errors * 5, 20);
  const scopingErrorScore = 100 - (errorPenalty / 20) * 100;

  // Warning penalty: each warning removes 2 points (max 8 point loss)
  const warningPenalty = Math.min(scoping.warnings * 2, 8);
  const scopingWarningScore = 100 - (warningPenalty / 8) * 100;

  // Contrast score: ratio of passing pairs
  const contrastScore = accessibility.contrastScore * 100;

  // Dependency score: penalize for errors and warnings
  const depErrors = dependencies.issues.filter(i => i.severity === "error").length;
  const depWarnings = dependencies.issues.filter(i => i.severity === "warning").length;
  const depPenalty = Math.min(depErrors * 20 + depWarnings * 5, 100);
  const dependencyScore = 100 - depPenalty;

  // Anti-pattern score: penalize based on severity
  const apErrors = antiPatterns.summary.bySeverity.error ?? 0;
  const apWarnings = antiPatterns.summary.bySeverity.warning ?? 0;
  const apPenalty = Math.min(apErrors * 15 + apWarnings * 5, 100);
  const antiPatternScore = 100 - apPenalty;

  return Math.round(
    complianceScore * 0.20 +
    coverageScore * 0.15 +
    scopingErrorScore * 0.20 +
    scopingWarningScore * 0.08 +
    contrastScore * 0.15 +
    dependencyScore * 0.12 +
    antiPatternScore * 0.10,
  );
}

// ---------------------------------------------------------------------------
// Summary builder
// ---------------------------------------------------------------------------

function buildSummary(
  healthScore: number,
  structure: StructureAnalysis,
  coverage: CoverageAnalysis,
  scoping: ScopingReport,
  accessibility: AccessibilityAnalysis,
  dependencies: DependencyGraph,
  antiPatterns: AntiPatternReport,
  migration: MigrationSuggestion[],
): string {
  const lines: string[] = [];

  // Health grade
  const grade =
    healthScore >= 90
      ? "A"
      : healthScore >= 75
        ? "B"
        : healthScore >= 60
          ? "C"
          : healthScore >= 40
            ? "D"
            : "F";
  lines.push(`## Semantic Token Audit — Grade: ${grade} (${healthScore}/100)`);
  lines.push("");

  // Structure
  lines.push(`### Structure`);
  lines.push(
    `- ${structure.compliantTokens}/${structure.totalTokens} tokens follow the naming convention (${Math.round(structure.complianceRate * 100)}%)`,
  );
  if (structure.nonCompliantTokens > 0) {
    lines.push(
      `- ${structure.nonCompliantTokens} tokens need restructuring`,
    );
  }

  const classKeys = Object.keys(structure.propertyClassDistribution);
  if (classKeys.length > 0) {
    lines.push(
      `- Property classes in use: ${classKeys.join(", ")}`,
    );
  }
  lines.push("");

  // Coverage
  lines.push(`### Coverage`);
  lines.push(
    `- ${coverage.coveredContexts.length}/${UX_CONTEXTS.length} UX contexts covered`,
  );
  if (coverage.missingContexts.length > 0) {
    lines.push(`- Missing: ${coverage.missingContexts.join(", ")}`);
  }
  lines.push(
    `- Coverage score: ${Math.round(coverage.coverageScore * 100)}%`,
  );
  lines.push("");

  // Scoping
  lines.push(`### Scoping Rules`);
  lines.push(`- ${scoping.summary}`);
  lines.push("");

  // Migration
  if (migration.length > 0) {
    lines.push(`### Migration Needed`);
    lines.push(
      `- ${migration.length} token(s) can be auto-migrated to ontology-compliant names`,
    );
    const highConf = migration.filter((m) => m.confidence >= 0.7);
    if (highConf.length > 0) {
      lines.push(
        `- ${highConf.length} with high confidence (≥70%)`,
      );
    }
    lines.push("");
  }

  // Accessibility / Contrast
  lines.push(`### Accessibility (Contrast)`);
  if (accessibility.computablePairs > 0) {
    lines.push(
      `- ${accessibility.pairs.length} contrast pair(s) detected, ${accessibility.computablePairs} computable`,
    );
    lines.push(
      `- WCAG 2.1 AA failures: ${accessibility.wcagFailures} / ${accessibility.computablePairs}`,
    );
    lines.push(
      `- APCA below body-text (Lc 75): ${accessibility.apcaFailures} / ${accessibility.computablePairs}`,
    );
    lines.push(
      `- Contrast score: ${Math.round(accessibility.contrastScore * 100)}%`,
    );
  } else if (accessibility.pairs.length > 0) {
    lines.push(
      `- ${accessibility.pairs.length} contrast pair(s) detected but values are unresolvable references`,
    );
  } else {
    lines.push("- No contrast pairs detected (no matching foreground/background tokens)");
  }
  if (accessibility.unpairedTokens.length > 0) {
    lines.push(
      `- ⚠️ ${accessibility.unpairedTokens.length} token(s) without a matching pair`,
    );
  }
  lines.push("");

  // Dependencies
  lines.push(`### Dependency Graph`);
  lines.push(
    `- ${dependencies.metrics.primitiveCount} primitive tokens, ${dependencies.metrics.semanticCount} semantic tokens`,
  );
  lines.push(
    `- Reference depth: max ${dependencies.metrics.maxDepth}, avg ${dependencies.metrics.avgDepth.toFixed(1)}`,
  );
  if (dependencies.metrics.isolatedCount > 0) {
    lines.push(
      `- ${dependencies.metrics.isolatedCount} isolated token(s) (not referenced)`,
    );
  }
  
  const depErrors = dependencies.issues.filter(i => i.severity === "error");
  const depWarnings = dependencies.issues.filter(i => i.severity === "warning");
  
  if (depErrors.length > 0) {
    lines.push(`- ❌ ${depErrors.length} error(s): ${depErrors.map(i => i.type).join(", ")}`);
  }
  if (depWarnings.length > 0) {
    lines.push(`- ⚠️ ${depWarnings.length} warning(s): ${depWarnings.map(i => i.type).join(", ")}`);
  }
  if (depErrors.length === 0 && depWarnings.length === 0) {
    lines.push("- ✅ No dependency issues detected");
  }
  lines.push("");

  // Anti-Patterns
  lines.push(`### Anti-Patterns`);
  if (antiPatterns.summary.total === 0) {
    lines.push("- ✅ No anti-patterns detected");
  } else {
    lines.push(`- ${antiPatterns.summary.total} pattern(s) detected`);
    
    const apErrors = antiPatterns.summary.bySeverity.error ?? 0;
    const apWarnings = antiPatterns.summary.bySeverity.warning ?? 0;
    const apInfo = antiPatterns.summary.bySeverity.info ?? 0;
    
    if (apErrors > 0) lines.push(`  - ❌ ${apErrors} error(s)`);
    if (apWarnings > 0) lines.push(`  - ⚠️ ${apWarnings} warning(s)`);
    if (apInfo > 0) lines.push(`  - ℹ️ ${apInfo} info`);
    
    // Show top pattern types
    const topTypes = Object.entries(antiPatterns.summary.byType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    if (topTypes.length > 0) {
      lines.push(`  - Most common: ${topTypes.map(([type, count]) => `${type} (${count})`).join(", ")}`);
    }
  }
  lines.push("");

  // Recommendations
  lines.push(`### Recommendations`);
  if (healthScore >= 90) {
    lines.push(
      "- Token set is well-structured. Focus on maintaining consistency as you scale.",
    );
  } else if (healthScore >= 60) {
    lines.push(
      "- Good foundation but gaps exist. Address coverage gaps and scoping errors first.",
    );
  } else {
    lines.push(
      "- Significant restructuring needed. Start with property-class separation, then address pairing and coverage.",
    );
  }

  return lines.join("\n");
}
