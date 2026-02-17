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
  buildSemanticPath,
  type SemanticTokenName,
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
  const migration = suggestMigrations(tokenSet);

  const healthScore = computeHealthScore(structure, coverage, scoping, accessibility);

  const summary = buildSummary(healthScore, structure, coverage, scoping, accessibility, migration);

  return {
    healthScore,
    structure,
    coverage,
    scoping,
    accessibility,
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
  const groups = new Map<
    string,
    { backgrounds: [string, DesignToken][]; foregrounds: [string, DesignToken][] }
  >();

  for (const [path, token] of tokens) {
    const parsed = parseSemanticPath(path);
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
// Health score
// ---------------------------------------------------------------------------

function computeHealthScore(
  structure: StructureAnalysis,
  coverage: CoverageAnalysis,
  scoping: ScopingReport,
  accessibility?: AccessibilityAnalysis,
): number {
  // Weighted components:
  // - Naming compliance: 25%
  // - Coverage score: 20%
  // - Scoping errors: 25% (penalize hard for errors)
  // - Scoping warnings: 10% (gentler penalty)
  // - Contrast compliance: 20% (weighted by computable pairs)

  const complianceScore = structure.complianceRate * 100;
  const coverageScore = coverage.coverageScore * 100;

  // Error penalty: each error removes up to 5 points (max 25 point loss)
  const errorPenalty = Math.min(scoping.errors * 5, 25);
  const scopingErrorScore = 100 - (errorPenalty / 25) * 100;

  // Warning penalty: each warning removes 2 points (max 10 point loss)
  const warningPenalty = Math.min(scoping.warnings * 2, 10);
  const scopingWarningScore = 100 - (warningPenalty / 10) * 100;

  // Contrast score: ratio of passing pairs (fallback to 100 if no computable pairs)
  const contrastScore = accessibility
    ? accessibility.contrastScore * 100
    : 100;

  return Math.round(
    complianceScore * 0.25 +
    coverageScore * 0.2 +
    scopingErrorScore * 0.25 +
    scopingWarningScore * 0.1 +
    contrastScore * 0.2,
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
