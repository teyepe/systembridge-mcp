/**
 * Migration Risk Assessment
 *
 * Analyzes the risk profile of migrating from one token structure to another.
 * Provides confidence scores, impact analysis, and criticality assessment.
 *
 * Core principle: "Cartography, not judgment" — we map the risk landscape
 * without prescribing solutions. The system should help users understand
 * trade-offs and make informed decisions.
 */

import type { DesignToken } from "../types.js";
import type { DependencyGraph, DependencyNode } from "../semantics/audit.js";
import { parseSemanticPath, type SemanticTokenName } from "../semantics/ontology.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MigrationRiskProfile {
  /** Overall risk score (0-100, higher = riskier) */
  overallRisk: number;
  /** Risk level classification */
  riskLevel: "low" | "medium" | "high" | "critical";
  /** Breakdown by risk dimension */
  dimensions: RiskDimensions;
  /** Token-level risk assessments */
  tokenRisks: TokenRisk[];
  /** High-risk tokens requiring special attention */
  highRiskTokens: string[];
  /** Migration readiness indicators */
  readiness: ReadinessIndicators;
  /** Recommendations */
  recommendations: string[];
}

export interface RiskDimensions {
  /** Usage risk: how widely used are affected tokens? */
  usage: DimensionScore;
  /** Confidence risk: how certain are we about mappings? */
  confidence: DimensionScore;
  /** Structural risk: how complex is the change? */
  structural: DimensionScore;
  /** Accessibility risk: impact on contrast/a11y */
  accessibility: DimensionScore;
  /** Brand risk: impact on core brand tokens */
  brand: DimensionScore;
}

export interface DimensionScore {
  /** Score 0-100 (higher = riskier) */
  score: number;
  /** Level classification */
  level: "low" | "medium" | "high" | "critical";
  /** Contributing factors */
  factors: string[];
}

export interface TokenRisk {
  /** Token path */
  path: string;
  /** Overall risk score for this token (0-100) */
  risk: number;
  /** Risk level */
  level: "low" | "medium" | "high" | "critical";
  /** Number of references (from dependency graph) */
  referenceCount: number;
  /** Dependency depth */
  depth: number;
  /** Is this a primitive token? */
  isPrimitive: boolean;
  /** Is this a brand/core token? */
  isBrandToken: boolean;
  /** Is this used in accessibility pairs? */
  isAccessibilityCritical: boolean;
  /** Proposed migration action */
  proposedAction?: "rename" | "merge" | "split" | "restructure" | "delete";
  /** Confidence in proposed action (0-1) */
  actionConfidence?: number;
  /** Reasons for risk score */
  reasons: string[];
}

export interface ReadinessIndicators {
  /** Documentation quality (0-1) */
  documentation: number;
  /** Test coverage (0-1, if applicable) */
  testCoverage: number;
  /** Dependency clarity (0-1) */
  dependencyClarity: number;
  /** Migration path clarity (0-1) */
  migrationPathClarity: number;
  /** Overall readiness score (0-1) */
  overall: number;
}

export interface RiskAssessmentOptions {
  /** Consider Figma usage in assessment */
  includeFigma?: boolean;
  /** Weight for different risk factors (0-1) */
  weights?: {
    usage?: number;
    confidence?: number;
    structural?: number;
    accessibility?: number;
    brand?: number;
  };
  /** Risk tolerance (affects classifications) */
  riskTolerance?: "conservative" | "moderate" | "aggressive";
}

// ---------------------------------------------------------------------------
// Risk Assessment Engine
// ---------------------------------------------------------------------------

/**
 * Assess migration risk profile for a token set.
 *
 * @param tokens - Token map to assess
 * @param dependencies - Dependency graph from topology analysis
 * @param options - Assessment options
 * @returns Comprehensive risk profile
 */
export function assessMigrationRisk(
  tokens: Map<string, DesignToken>,
  dependencies: DependencyGraph,
  options: RiskAssessmentOptions = {},
): MigrationRiskProfile {
  const weights = {
    usage: options.weights?.usage ?? 0.3,
    confidence: options.weights?.confidence ?? 0.25,
    structural: options.weights?.structural ?? 0.2,
    accessibility: options.weights?.accessibility ?? 0.15,
    brand: options.weights?.brand ?? 0.1,
  };

  // Assess token-level risks
  const tokenRisks = assessTokenRisks(tokens, dependencies);

  // Compute dimension scores
  const dimensions: RiskDimensions = {
    usage: assessUsageRisk(tokenRisks, dependencies),
    confidence: assessConfidenceRisk(tokenRisks),
    structural: assessStructuralRisk(tokens, dependencies),
    accessibility: assessAccessibilityRisk(tokens, tokenRisks),
    brand: assessBrandRisk(tokens, tokenRisks),
  };

  // Compute overall risk (weighted average)
  const overallRisk = Math.round(
    dimensions.usage.score * weights.usage +
    dimensions.confidence.score * weights.confidence +
    dimensions.structural.score * weights.structural +
    dimensions.accessibility.score * weights.accessibility +
    dimensions.brand.score * weights.brand
  );

  const riskLevel = classifyRiskLevel(overallRisk, options.riskTolerance);

  // Identify high-risk tokens
  const highRiskTokens = tokenRisks
    .filter(tr => tr.level === "high" || tr.level === "critical")
    .map(tr => tr.path);

  // Assess readiness
  const readiness = assessReadiness(tokens, dependencies, tokenRisks);

  // Generate recommendations
  const recommendations = generateRiskRecommendations(
    dimensions,
    tokenRisks,
    readiness,
    options
  );

  return {
    overallRisk,
    riskLevel,
    dimensions,
    tokenRisks,
    highRiskTokens,
    readiness,
    recommendations,
  };
}

// ---------------------------------------------------------------------------
// Token-Level Risk Assessment
// ---------------------------------------------------------------------------

function assessTokenRisks(
  tokens: Map<string, DesignToken>,
  dependencies: DependencyGraph,
): TokenRisk[] {
  const risks: TokenRisk[] = [];
  const nodeMap = new Map(dependencies.nodes.map(n => [n.id, n]));

  for (const [path, token] of tokens) {
    const node = nodeMap.get(path);
    const referenceCount = node?.referenceCount ?? 0;
    const depth = node?.depth ?? 0;
    const isPrimitive = node?.type === "primitive";

    const isBrandToken = isBrandCritical(path, token);
    const isAccessibilityCritical = isA11yCritical(path);

    const reasons: string[] = [];
    let riskScore = 0;

    // Factor 1: High reference count increases risk
    if (referenceCount > 10) {
      riskScore += 30;
      reasons.push(`High reference count (${referenceCount})`);
    } else if (referenceCount > 5) {
      riskScore += 15;
      reasons.push(`Moderate reference count (${referenceCount})`);
    }

    // Factor 2: Deep dependencies increase risk
    if (depth > 3) {
      riskScore += 20;
      reasons.push(`Deep dependency chain (depth: ${depth})`);
    } else if (depth > 1) {
      riskScore += 10;
      reasons.push(`Moderate dependency depth (${depth})`);
    }

    // Factor 3: Primitives are more stable (lower risk to change)
    if (isPrimitive) {
      riskScore -= 10;
      reasons.push("Primitive token (isolated)");
    }

    // Factor 4: Brand tokens are critical
    if (isBrandToken) {
      riskScore += 25;
      reasons.push("Brand-critical token");
    }

    // Factor 5: Accessibility tokens are critical
    if (isAccessibilityCritical) {
      riskScore += 20;
      reasons.push("Accessibility-critical token");
    }

    // Factor 6: Broken references are high risk
    if (node?.hasUnresolvedRefs) {
      riskScore += 40;
      reasons.push("Has unresolved references");
    }

    // Factor 7: Circular dependencies
    if (node?.hasCircularRef) {
      riskScore += 35;
      reasons.push("Involved in circular dependency");
    }

    // Normalize to 0-100
    riskScore = Math.max(0, Math.min(100, riskScore));

    const level = classifyRiskLevel(riskScore);

    risks.push({
      path,
      risk: riskScore,
      level,
      referenceCount,
      depth,
      isPrimitive,
      isBrandToken,
      isAccessibilityCritical,
      reasons,
    });
  }

  return risks.sort((a, b) => b.risk - a.risk);
}

// ---------------------------------------------------------------------------
// Dimension Assessments
// ---------------------------------------------------------------------------

function assessUsageRisk(
  tokenRisks: TokenRisk[],
  dependencies: DependencyGraph,
): DimensionScore {
  const factors: string[] = [];
  let score = 0;

  // High reference concentration
  const highRefTokens = tokenRisks.filter(tr => tr.referenceCount > 5);
  if (highRefTokens.length > 0) {
    score += 30;
    factors.push(`${highRefTokens.length} heavily-referenced token(s)`);
  }

  // Total reference density
  const avgRefs = tokenRisks.reduce((sum, tr) => sum + tr.referenceCount, 0) / tokenRisks.length;
  if (avgRefs > 3) {
    score += 20;
    factors.push(`High average reference count (${avgRefs.toFixed(1)})`);
  }

  // Isolated tokens (low risk, but signals gaps)
  const isolatedCount = dependencies.metrics.isolatedTokens.length;
  if (isolatedCount > tokenRisks.length * 0.2) {
    score += 15;
    factors.push(`${isolatedCount} isolated token(s) may be orphaned`);
  }

  score = Math.min(100, score);
  const level = classifyRiskLevel(score);

  return { score, level, factors };
}

function assessConfidenceRisk(tokenRisks: TokenRisk[]): DimensionScore {
  const factors: string[] = [];
  let score = 0;

  // Unresolved references indicate uncertainty
  const unresolvedCount = tokenRisks.filter(tr =>
    tr.reasons.some(r => r.includes("unresolved"))
  ).length;

  if (unresolvedCount > 0) {
    score += Math.min(50, unresolvedCount * 5);
    factors.push(`${unresolvedCount} token(s) with unresolved references`);
  }

  // Circular dependencies indicate structural uncertainty
  const circularCount = tokenRisks.filter(tr =>
    tr.reasons.some(r => r.includes("circular"))
  ).length;

  if (circularCount > 0) {
    score += Math.min(40, circularCount * 10);
    factors.push(`${circularCount} token(s) in circular dependencies`);
  }

  // Low documentation/naming clarity
  const unclearCount = tokenRisks.filter(tr => {
    const parsed = parseSemanticPath(tr.path);
    return !parsed; // Non-semantic naming reduces confidence
  }).length;

  if (unclearCount > tokenRisks.length * 0.3) {
    score += 30;
    factors.push(`${Math.round(unclearCount / tokenRisks.length * 100)}% tokens don't follow naming convention`);
  }

  score = Math.min(100, score);
  const level = classifyRiskLevel(score);

  return { score, level, factors };
}

function assessStructuralRisk(
  tokens: Map<string, DesignToken>,
  dependencies: DependencyGraph,
): DimensionScore {
  const factors: string[] = [];
  let score = 0;

  // Deep dependency chains
  if (dependencies.metrics.maxDepth > 3) {
    score += 30;
    factors.push(`Max dependency depth: ${dependencies.metrics.maxDepth}`);
  }

  // Complex reference patterns
  const avgDepth = dependencies.metrics.avgDepth;
  if (avgDepth > 2) {
    score += 20;
    factors.push(`Average dependency depth: ${avgDepth.toFixed(1)}`);
  }

  // Broken references
  const unresolvedCount = dependencies.issues.filter(i => i.type === "unresolved-reference").length;
  if (unresolvedCount > 0) {
    score += Math.min(40, unresolvedCount * 5);
    factors.push(`${unresolvedCount} unresolved reference(s)`);
  }

  // Circular dependencies
  const circularCount = dependencies.issues.filter(i => i.type === "circular-dependency").length;
  if (circularCount > 0) {
    score += Math.min(30, circularCount * 10);
    factors.push(`${circularCount} circular dependenc${circularCount === 1 ? 'y' : 'ies'}`);
  }

  score = Math.min(100, score);
  const level = classifyRiskLevel(score);

  return { score, level, factors };
}

function assessAccessibilityRisk(
  tokens: Map<string, DesignToken>,
  tokenRisks: TokenRisk[],
): DimensionScore {
  const factors: string[] = [];
  let score = 0;

  // A11y-critical tokens at risk
  const a11yHighRisk = tokenRisks.filter(
    tr => tr.isAccessibilityCritical && (tr.level === "high" || tr.level === "critical")
  );

  if (a11yHighRisk.length > 0) {
    score += 50;
    factors.push(`${a11yHighRisk.length} accessibility-critical token(s) at high risk`);
  }

  // Total a11y surface
  const a11yTokens = tokenRisks.filter(tr => tr.isAccessibilityCritical);
  const a11yPercentage = (a11yTokens.length / tokenRisks.length) * 100;

  if (a11yPercentage > 30) {
    score += 20;
    factors.push(`${Math.round(a11yPercentage)}% of tokens are accessibility-critical`);
  }

  score = Math.min(100, score);
  const level = classifyRiskLevel(score);

  return { score, level, factors };
}

function assessBrandRisk(
  tokens: Map<string, DesignToken>,
  tokenRisks: TokenRisk[],
): DimensionScore {
  const factors: string[] = [];
  let score = 0;

  // Brand tokens at risk
  const brandHighRisk = tokenRisks.filter(
    tr => tr.isBrandToken && (tr.level === "high" || tr.level === "critical")
  );

  if (brandHighRisk.length > 0) {
    score += 60;
    factors.push(`${brandHighRisk.length} brand-critical token(s) at high risk`);
  }

  // Total brand surface
  const brandTokens = tokenRisks.filter(tr => tr.isBrandToken);
  if (brandTokens.length > 0) {
    const brandPercentage = (brandTokens.length / tokenRisks.length) * 100;
    if (brandPercentage > 20) {
      score += 25;
      factors.push(`${Math.round(brandPercentage)}% of tokens are brand-critical`);
    }
  }

  score = Math.min(100, score);
  const level = classifyRiskLevel(score);

  return { score, level, factors };
}

// ---------------------------------------------------------------------------
// Readiness Assessment
// ---------------------------------------------------------------------------

function assessReadiness(
  tokens: Map<string, DesignToken>,
  dependencies: DependencyGraph,
  tokenRisks: TokenRisk[],
): ReadinessIndicators {
  // Documentation quality: do tokens have descriptions?
  const documented = Array.from(tokens.values()).filter(
    t => t.description && t.description.length > 0
  ).length;
  const documentation = tokens.size > 0 ? documented / tokens.size : 0;

  // Dependency clarity: clean dependency graph?
  const hasIssues = dependencies.issues.length > 0;
  const issueRatio = dependencies.metrics.totalNodes > 0
    ? dependencies.issues.length / dependencies.metrics.totalNodes
    : 0;
  const dependencyClarity = Math.max(0, 1 - issueRatio);

  // Migration path clarity: are token risks well understood?
  const highRiskCount = tokenRisks.filter(tr => tr.level === "high" || tr.level === "critical").length;
  const highRiskRatio = tokenRisks.length > 0 ? highRiskCount / tokenRisks.length : 0;
  const migrationPathClarity = Math.max(0, 1 - highRiskRatio);

  // Test coverage: not directly measurable, default to 0.5
  const testCoverage = 0.5;

  // Overall readiness
  const overall = (
    documentation * 0.3 +
    testCoverage * 0.2 +
    dependencyClarity * 0.3 +
    migrationPathClarity * 0.2
  );

  return {
    documentation,
    testCoverage,
    dependencyClarity,
    migrationPathClarity,
    overall,
  };
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

function generateRiskRecommendations(
  dimensions: RiskDimensions,
  tokenRisks: TokenRisk[],
  readiness: ReadinessIndicators,
  options: RiskAssessmentOptions,
): string[] {
  const recommendations: string[] = [];

  // Overall readiness
  if (readiness.overall < 0.5) {
    recommendations.push(
      "⚠️ **Low migration readiness** — Address structural issues and documentation gaps before proceeding."
    );
  } else if (readiness.overall < 0.7) {
    recommendations.push(
      "⚡ **Moderate readiness** — Consider a phased migration approach to manage complexity."
    );
  } else {
    recommendations.push(
      "✅ **High readiness** — Token set is well-prepared for migration. Proceed with confidence."
    );
  }

  // Dimension-specific recommendations
  if (dimensions.usage.level === "high" || dimensions.usage.level === "critical") {
    recommendations.push(
      `🔍 **High usage risk** — ${dimensions.usage.factors[0]}. Consider incremental updates with fallback mechanisms.`
    );
  }

  if (dimensions.confidence.level === "high" || dimensions.confidence.level === "critical") {
    recommendations.push(
      `❓ **Low confidence** — ${dimensions.confidence.factors[0]}. Resolve dependency issues before migration.`
    );
  }

  if (dimensions.structural.level === "high" || dimensions.structural.level === "critical") {
    recommendations.push(
      `🏗️ **High structural risk** — ${dimensions.structural.factors[0]}. Simplify dependency chains first.`
    );
  }

  if (dimensions.accessibility.level === "high" || dimensions.accessibility.level === "critical") {
    recommendations.push(
      `♿ **Accessibility at risk** — ${dimensions.accessibility.factors[0]}. Prioritize testing contrast ratios post-migration.`
    );
  }

  if (dimensions.brand.level === "high" || dimensions.brand.level === "critical") {
    recommendations.push(
      `🎨 **Brand tokens at risk** — ${dimensions.brand.factors[0]}. Involve brand/design leads in review.`
    );
  }

  // High-risk token recommendations
  const criticalTokens = tokenRisks.filter(tr => tr.level === "critical");
  if (criticalTokens.length > 0) {
    recommendations.push(
      `🚨 **${criticalTokens.length} critical-risk token(s)** — Manual review required: ${criticalTokens.slice(0, 3).map(t => `\`${t.path}\``).join(", ")}${criticalTokens.length > 3 ? ", ..." : ""}.`
    );
  }

  // Documentation gaps
  if (readiness.documentation < 0.5) {
    recommendations.push(
      `📝 **Document tokens** — Only ${Math.round(readiness.documentation * 100)}% of tokens have descriptions. Add documentation to improve confidence.`
    );
  }

  return recommendations;
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

function classifyRiskLevel(
  score: number,
  tolerance: "conservative" | "moderate" | "aggressive" = "moderate",
): "low" | "medium" | "high" | "critical" {
  // Adjust thresholds based on risk tolerance
  const thresholds = {
    conservative: { low: 20, medium: 40, high: 60 },
    moderate: { low: 30, medium: 50, high: 70 },
    aggressive: { low: 40, medium: 60, high: 80 },
  };

  const t = thresholds[tolerance];

  if (score < t.low) return "low";
  if (score < t.medium) return "medium";
  if (score < t.high) return "high";
  return "critical";
}

function isBrandCritical(path: string, token: DesignToken): boolean {
  const brandKeywords = ["brand", "primary", "logo", "identity"];
  const pathLower = path.toLowerCase();
  return brandKeywords.some(kw => pathLower.includes(kw));
}

function isA11yCritical(path: string): boolean {
  const parsed = parseSemanticPath(path);
  if (!parsed) return false;

  // Foreground/background tokens used in contrast pairs
  const a11yClasses = ["background", "foreground", "border"];
  return a11yClasses.includes(parsed.propertyClass);
}
