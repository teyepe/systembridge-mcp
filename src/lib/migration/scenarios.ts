/**
 * Migration Scenario Generator
 *
 * Generates multiple migration scenarios (conservative, progressive, comprehensive)
 * with detailed action plans, risk assessments, and comparison to reference systems.
 *
 * Philosophy: "B→C progression" — augment existing analysis to enable orchestrated
 * migration. Provide options, not prescriptions.
 */

import type { DesignToken } from "../types.js";
import type { SemanticAuditResult, DependencyGraph } from "../semantics/audit.js";
import type { MigrationRiskProfile, TokenRisk } from "./risk-assessment.js";
import { parseSemanticPath, buildSemanticPath, type SemanticTokenName } from "../semantics/ontology.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MigrationScenario {
  /** Scenario ID */
  id: string;
  /** Scenario name */
  name: string;
  /** Description */
  description: string;
  /** Approach type */
  approach: "conservative" | "progressive" | "comprehensive";
  /** Overall risk score for this scenario (0-100) */
  riskScore: number;
  /** Migration phases */
  phases: MigrationPhase[];
  /** Estimated effort (person-hours) */
  estimatedEffort: number;
  /** Expected timeline (days) */
  estimatedDays: number;
  /** Success probability (0-1) */
  successProbability: number;
  /** Key benefits */
  benefits: string[];
  /** Key challenges */
  challenges: string[];
  /** Prerequisites */
  prerequisites: string[];
}

export interface MigrationPhase {
  /** Phase number */
  phase: number;
  /** Phase name */
  name: string;
  /** Description */
  description: string;
  /** Actions in this phase */
  actions: MigrationAction[];
  /** Estimated effort (person-hours) */
  effort: number;
  /** Dependencies on other phases */
  dependencies: number[];
  /** Rollback plan */
  rollbackPlan: string;
}

export interface MigrationAction {
  /** Action type */
  type: "rename" | "merge" | "split" | "restructure" | "delete" | "create" | "update-references";
  /** Target token path(s) */
  targets: string[];
  /** New path/value (for rename/create) */
  newPath?: string;
  /** Description */
  description: string;
  /** Risk level */
  risk: "low" | "medium" | "high" | "critical";
  /** Automated? */
  automated: boolean;
  /** Validation steps */
  validation: string[];
}

export interface ScenarioComparison {
  /** Scenarios being compared */
  scenarios: MigrationScenario[];
  /** Comparison matrix */
  matrix: ComparisonDimension[];
  /** Recommended scenario */
  recommended: string;
  /** Reasoning for recommendation */
  reasoning: string;
}

export interface ComparisonDimension {
  /** Dimension name */
  dimension: string;
  /** Values per scenario */
  values: Record<string, string | number>;
  /** Weight for recommendation (0-1) */
  weight: number;
}

export interface ReferenceSystemComparison {
  /** Reference system name */
  referenceName: string;
  /** Similarity score (0-1) */
  similarity: number;
  /** Structural alignment */
  structuralAlignment: number;
  /** Naming alignment */
  namingAlignment: number;
  /** Coverage alignment */
  coverageAlignment: number;
  /** Insights */
  insights: string[];
  /** Recommendations based on reference */
  recommendations: string[];
}

export interface ScenarioGenerationOptions {
  /** Generate only specific approaches */
  approaches?: Array<"conservative" | "progressive" | "comprehensive">;
  /** Risk tolerance */
  riskTolerance?: "conservative" | "moderate" | "aggressive";
  /** Team size (affects effort estimation) */
  teamSize?: number;
  /** Available hours per week */
  availableHoursPerWeek?: number;
  /** Include reference system comparison */
  includeReferenceComparison?: boolean;
  /** Reference system data (if available) */
  referenceSystem?: {
    name: string;
    tokens: Map<string, DesignToken>;
  };
}

// ---------------------------------------------------------------------------
// Scenario Generator
// ---------------------------------------------------------------------------

/**
 * Generate migration scenarios based on audit results and risk profile.
 *
 * @param auditResult - Semantic token audit result
 * @param riskProfile - Risk assessment
 * @param options - Generation options
 * @returns Array of migration scenarios
 */
export function generateMigrationScenarios(
  auditResult: SemanticAuditResult,
  riskProfile: MigrationRiskProfile,
  options: ScenarioGenerationOptions = {},
): MigrationScenario[] {
  const approaches = options.approaches ?? ["conservative", "progressive", "comprehensive"];
  const scenarios: MigrationScenario[] = [];

  if (approaches.includes("conservative")) {
    scenarios.push(generateConservativeScenario(auditResult, riskProfile, options));
  }

  if (approaches.includes("progressive")) {
    scenarios.push(generateProgressiveScenario(auditResult, riskProfile, options));
  }

  if (approaches.includes("comprehensive")) {
    scenarios.push(generateComprehensiveScenario(auditResult, riskProfile, options));
  }

  return scenarios;
}

/**
 * Compare multiple scenarios and recommend best fit.
 *
 * @param scenarios - Scenarios to compare
 * @param priorities - Dimension weights for recommendation
 * @returns Comparison with recommendation
 */
export function compareScenarios(
  scenarios: MigrationScenario[],
  priorities?: {
    risk?: number;
    effort?: number;
    timeline?: number;
    completeness?: number;
  },
): ScenarioComparison {
  const weights = {
    risk: priorities?.risk ?? 0.35,
    effort: priorities?.effort ?? 0.25,
    timeline: priorities?.timeline ?? 0.2,
    completeness: priorities?.completeness ?? 0.2,
  };

  const matrix: ComparisonDimension[] = [
    {
      dimension: "Risk",
      weight: weights.risk,
      values: Object.fromEntries(scenarios.map(s => [s.id, s.riskScore])),
    },
    {
      dimension: "Effort (hours)",
      weight: weights.effort,
      values: Object.fromEntries(scenarios.map(s => [s.id, s.estimatedEffort])),
    },
    {
      dimension: "Timeline (days)",
      weight: weights.timeline,
      values: Object.fromEntries(scenarios.map(s => [s.id, s.estimatedDays])),
    },
    {
      dimension: "Success Probability",
      weight: weights.completeness,
      values: Object.fromEntries(scenarios.map(s => [s.id, `${(s.successProbability * 100).toFixed(0)}%`])),
    },
  ];

  // Compute recommendation score for each scenario
  const scores = scenarios.map(scenario => {
    let score = 0;
    
    // Lower risk is better (invert)
    score += weights.risk * (1 - scenario.riskScore / 100);
    
    // Lower effort is better (invert, normalize by max)
    const maxEffort = Math.max(...scenarios.map(s => s.estimatedEffort));
    score += weights.effort * (1 - scenario.estimatedEffort / maxEffort);
    
    // Lower timeline is better (invert, normalize by max)
    const maxDays = Math.max(...scenarios.map(s => s.estimatedDays));
    score += weights.timeline * (1 - scenario.estimatedDays / maxDays);
    
    // Higher success probability is better
    score += weights.completeness * scenario.successProbability;
    
    return { scenario, score };
  });

  const recommended = scores.sort((a, b) => b.score - a.score)[0];

  const reasoning = generateRecommendationReasoning(recommended.scenario, scenarios, weights);

  return {
    scenarios,
    matrix,
    recommended: recommended.scenario.id,
    reasoning,
  };
}

/**
 * Compare current token structure with a reference system.
 *
 * @param currentTokens - Current token map
 * @param referenceSystem - Reference system data
 * @param auditResult - Current audit result
 * @returns Comparison analysis
 */
export function compareWithReferenceSystem(
  currentTokens: Map<string, DesignToken>,
  referenceSystem: { name: string; tokens: Map<string, DesignToken> },
  auditResult: SemanticAuditResult,
): ReferenceSystemComparison {
  const refTokens = referenceSystem.tokens;
  
  // Structural similarity (property class distribution)
  const structuralAlignment = compareStructure(
    auditResult.structure.propertyClassDistribution,
    computePropertyClassDistribution(refTokens)
  );

  // Naming similarity
  const namingAlignment = compareNaming(currentTokens, refTokens);

  // Coverage similarity (UX contexts)
  const coverageAlignment = compareCoverage(
    auditResult.coverage.coveredContexts,
    extractCoveredContexts(refTokens)
  );

  // Overall similarity
  const similarity = (structuralAlignment + namingAlignment + coverageAlignment) / 3;

  // Generate insights
  const insights = generateReferenceInsights(
    currentTokens,
    refTokens,
    structuralAlignment,
    namingAlignment,
    coverageAlignment
  );

  // Generate recommendations
  const recommendations = generateReferenceRecommendations(
    currentTokens,
    refTokens,
    similarity,
    insights
  );

  return {
    referenceName: referenceSystem.name,
    similarity,
    structuralAlignment,
    namingAlignment,
    coverageAlignment,
    insights,
    recommendations,
  };
}

// ---------------------------------------------------------------------------
// Conservative Scenario
// ---------------------------------------------------------------------------

function generateConservativeScenario(
  auditResult: SemanticAuditResult,
  riskProfile: MigrationRiskProfile,
  options: ScenarioGenerationOptions,
): MigrationScenario {
  const phases: MigrationPhase[] = [];

  // Phase 1: Fix critical issues only
  phases.push({
    phase: 1,
    name: "Critical Fixes",
    description: "Resolve broken references and circular dependencies",
    actions: generateCriticalFixActions(auditResult, riskProfile),
    effort: 8,
    dependencies: [],
    rollbackPlan: "Revert to previous token definitions via version control.",
  });

  // Phase 2: Low-risk renamings
  phases.push({
    phase: 2,
    name: "Low-Risk Alignments",
    description: "Rename isolated tokens to follow naming convention",
    actions: generateLowRiskRenameActions(auditResult, riskProfile),
    effort: 12,
    dependencies: [1],
    rollbackPlan: "Automated find-replace rollback via migration tool.",
  });

  // Phase 3: Documentation
  phases.push({
    phase: 3,
    name: "Documentation",
    description: "Add descriptions and migration notes to all tokens",
    actions: generateDocumentationActions(auditResult),
    effort: 6,
    dependencies: [1, 2],
    rollbackPlan: "Not applicable (non-breaking).",
  });

  const totalEffort = phases.reduce((sum, p) => sum + p.effort, 0);
  const teamSize = options.teamSize ?? 2;
  const hoursPerWeek = options.availableHoursPerWeek ?? 20;
  const estimatedDays = Math.ceil((totalEffort / teamSize) / (hoursPerWeek / 5));

  return {
    id: "conservative",
    name: "Conservative Migration",
    description: "Minimal changes focused on critical fixes and low-risk improvements. Preserves existing structure.",
    approach: "conservative",
    riskScore: Math.max(10, riskProfile.overallRisk - 30),
    phases,
    estimatedEffort: totalEffort,
    estimatedDays,
    successProbability: 0.95,
    benefits: [
      "Low risk — minimal disruption to existing systems",
      "Fast timeline — can complete in parallel with other work",
      "Easy rollback — changes are incremental and reversible",
    ],
    challenges: [
      "Limited structural improvement — won't address root causes",
      "Technical debt remains — may need future migrations",
      "Coverage gaps persist — doesn't fully leverage ontology",
    ],
    prerequisites: [
      "Version control system in place",
      "Basic automated testing",
      "Stakeholder approval for token renames",
    ],
  };
}

// ---------------------------------------------------------------------------
// Progressive Scenario
// ---------------------------------------------------------------------------

function generateProgressiveScenario(
  auditResult: SemanticAuditResult,
  riskProfile: MigrationRiskProfile,
  options: ScenarioGenerationOptions,
): MigrationScenario {
  const phases: MigrationPhase[] = [];

  // Phase 1: Foundation (critical fixes)
  phases.push({
    phase: 1,
    name: "Foundation",
    description: "Fix critical issues and establish migration infrastructure",
    actions: generateCriticalFixActions(auditResult, riskProfile),
    effort: 10,
    dependencies: [],
    rollbackPlan: "Revert via version control; migration tool provides undo.",
  });

  // Phase 2: Structural alignment
  phases.push({
    phase: 2,
    name: "Structural Alignment",
    description: "Reorganize tokens to follow ontology structure (property-class separation)",
    actions: generateStructuralActions(auditResult, riskProfile),
    effort: 24,
    dependencies: [1],
    rollbackPlan: "Automated rollback via migration snapshots.",
  });

  // Phase 3: Coverage expansion
  phases.push({
    phase: 3,
    name: "Coverage Expansion",
    description: "Add missing tokens for identified gaps",
    actions: generateCoverageActions(auditResult),
    effort: 16,
    dependencies: [2],
    rollbackPlan: "Remove newly added tokens (non-breaking if not yet referenced).",
  });

  // Phase 4: Validation & documentation
  phases.push({
    phase: 4,
    name: "Validation",
    description: "Comprehensive testing and documentation",
    actions: generateValidationActions(auditResult),
    effort: 12,
    dependencies: [1, 2, 3],
    rollbackPlan: "Not applicable (validation phase).",
  });

  const totalEffort = phases.reduce((sum, p) => sum + p.effort, 0);
  const teamSize = options.teamSize ?? 2;
  const hoursPerWeek = options.availableHoursPerWeek ?? 20;
  const estimatedDays = Math.ceil((totalEffort / teamSize) / (hoursPerWeek / 5));

  return {
    id: "progressive",
    name: "Progressive Migration",
    description: "Balanced approach combining structural improvements with manageable risk. Implements ontology incrementally.",
    approach: "progressive",
    riskScore: Math.max(20, riskProfile.overallRisk - 15),
    phases,
    estimatedEffort: totalEffort,
    estimatedDays,
    successProbability: 0.80,
    benefits: [
      "Balanced risk/reward — addresses root causes without excessive disruption",
      "Incremental delivery — each phase adds value independently",
      "Sustainable — sets foundation for future scalability",
    ],
    challenges: [
      "Moderate timeline — requires dedicated time commitment",
      "Coordination needed — multiple phases require sequencing",
      "Testing overhead — each phase needs validation",
    ],
    prerequisites: [
      "Migration tooling in place",
      "Automated testing infrastructure",
      "Design system governance process",
      "Stakeholder buy-in for structural changes",
    ],
  };
}

// ---------------------------------------------------------------------------
// Comprehensive Scenario
// ---------------------------------------------------------------------------

function generateComprehensiveScenario(
  auditResult: SemanticAuditResult,
  riskProfile: MigrationRiskProfile,
  options: ScenarioGenerationOptions,
): MigrationScenario {
  const phases: MigrationPhase[] = [];

  // Phase 1: Analysis & planning
  phases.push({
    phase: 1,
    name: "Analysis & Planning",
    description: "Deep analysis, dependency mapping, and detailed migration plan",
    actions: generateAnalysisActions(auditResult, riskProfile),
    effort: 16,
    dependencies: [],
    rollbackPlan: "Not applicable (planning phase).",
  });

  // Phase 2: Infrastructure
  phases.push({
    phase: 2,
    name: "Infrastructure",
    description: "Build migration tooling, testing framework, and rollback mechanisms",
    actions: generateInfrastructureActions(),
    effort: 20,
    dependencies: [1],
    rollbackPlan: "Not applicable (tooling development).",
  });

  // Phase 3: Core restructure
  phases.push({
    phase: 3,
    name: "Core Restructure",
    description: "Complete structural overhaul following ontology",
    actions: generateComprehensiveStructuralActions(auditResult, riskProfile),
    effort: 40,
    dependencies: [1, 2],
    rollbackPlan: "Full system snapshot; automated rollback via migration tool.",
  });

  // Phase 4: Coverage completion
  phases.push({
    phase: 4,
    name: "Coverage Completion",
    description: "Fill all identified gaps and add comprehensive token coverage",
    actions: generateComprehensiveCoverageActions(auditResult),
    effort: 28,
    dependencies: [3],
    rollbackPlan: "Selective rollback of new additions.",
  });

  // Phase 5: Optimization
  phases.push({
    phase: 5,
    name: "Optimization",
    description: "Performance tuning, accessibility validation, and refinement",
    actions: generateOptimizationActions(auditResult),
    effort: 16,
    dependencies: [3, 4],
    rollbackPlan: "Revert optimization changes (non-breaking).",
  });

  // Phase 6: Documentation & handoff
  phases.push({
    phase: 6,
    name: "Documentation & Handoff",
    description: "Complete documentation, training materials, and knowledge transfer",
    actions: generateHandoffActions(auditResult),
    effort: 12,
    dependencies: [3, 4, 5],
    rollbackPlan: "Not applicable (documentation).",
  });

  const totalEffort = phases.reduce((sum, p) => sum + p.effort, 0);
  const teamSize = options.teamSize ?? 3;
  const hoursPerWeek = options.availableHoursPerWeek ?? 30;
  const estimatedDays = Math.ceil((totalEffort / teamSize) / (hoursPerWeek / 5));

  return {
    id: "comprehensive",
    name: "Comprehensive Migration",
    description: "Complete transformation to ontology-compliant structure. Full coverage, optimal organization, maximum long-term value.",
    approach: "comprehensive",
    riskScore: Math.min(90, riskProfile.overallRisk + 10),
    phases,
    estimatedEffort: totalEffort,
    estimatedDays,
    successProbability: 0.65,
    benefits: [
      "Maximum value — fully leverages ontology for scalability",
      "Future-proof — positions design system for growth",
      "Complete coverage — addresses all gaps systematically",
      "Best practices — implements industry-standard patterns",
    ],
    challenges: [
      "High risk — significant changes across entire system",
      "Long timeline — requires sustained commitment",
      "Resource intensive — needs dedicated team",
      "Complex coordination — many interdependent phases",
    ],
    prerequisites: [
      "Executive sponsorship secured",
      "Dedicated migration team (3+ people)",
      "Comprehensive testing infrastructure",
      "Robust migration tooling",
      "Staging environment for validation",
      "Communication plan for stakeholders",
    ],
  };
}

// ---------------------------------------------------------------------------
// Action Generators (helpers for phase construction)
// ---------------------------------------------------------------------------

function generateCriticalFixActions(
  auditResult: SemanticAuditResult,
  riskProfile: MigrationRiskProfile,
): MigrationAction[] {
  const actions: MigrationAction[] = [];

  // Fix circular dependencies
  const circularIssues = auditResult.dependencies.issues.filter(
    i => i.type === "circular-dependency"
  );
  if (circularIssues.length > 0) {
    actions.push({
      type: "restructure",
      targets: circularIssues.flatMap(i => i.tokens),
      description: `Break ${circularIssues.length} circular dependenc${circularIssues.length === 1 ? 'y' : 'ies'}`,
      risk: "high",
      automated: false,
      validation: ["Verify no circular dependencies remain", "Test all affected components"],
    });
  }

  // Fix unresolved references
  const unresolvedIssues = auditResult.dependencies.issues.filter(
    i => i.type === "unresolved-reference"
  );
  if (unresolvedIssues.length > 0) {
    actions.push({
      type: "update-references",
      targets: unresolvedIssues.flatMap(i => i.tokens),
      description: `Resolve ${unresolvedIssues.length} broken reference(s)`,
      risk: "critical",
      automated: true,
      validation: ["Verify all references resolve", "Check visual regression tests"],
    });
  }

  return actions;
}

function generateLowRiskRenameActions(
  auditResult: SemanticAuditResult,
  riskProfile: MigrationRiskProfile,
): MigrationAction[] {
  const actions: MigrationAction[] = [];

  // Rename isolated tokens (low risk since no dependencies)
  const isolatedTokens = auditResult.dependencies.metrics.isolatedTokens;
  const lowRiskIsolated = isolatedTokens.filter(token => {
    const tokenRisk = riskProfile.tokenRisks.find(tr => tr.path === token);
    return tokenRisk && tokenRisk.level === "low";
  });

  if (lowRiskIsolated.length > 0) {
    actions.push({
      type: "rename",
      targets: lowRiskIsolated.slice(0, 10), // Limit to first 10
      description: `Rename ${Math.min(10, lowRiskIsolated.length)} isolated token(s) to follow convention`,
      risk: "low",
      automated: true,
      validation: ["Verify naming convention compliance", "Check no references broken"],
    });
  }

  return actions;
}

function generateDocumentationActions(auditResult: SemanticAuditResult): MigrationAction[] {
  return [{
    type: "update-references",
    targets: ["all-tokens"],
    description: "Add descriptions and usage examples to all tokens",
    risk: "low",
    automated: false,
    validation: ["Review documentation coverage", "Verify examples are accurate"],
  }];
}

function generateStructuralActions(
  auditResult: SemanticAuditResult,
  riskProfile: MigrationRiskProfile,
): MigrationAction[] {
  const actions: MigrationAction[] = [];

  // Reorganize non-compliant tokens
  const nonCompliant = auditResult.structure.nonCompliantPaths;
  if (nonCompliant.length > 0) {
    actions.push({
      type: "restructure",
      targets: nonCompliant,
      description: `Restructure ${nonCompliant.length} token(s) to follow ontology`,
      risk: "medium",
      automated: true,
      validation: ["Verify ontology compliance", "Test all dependent components"],
    });
  }

  return actions;
}

function generateCoverageActions(auditResult: SemanticAuditResult): MigrationAction[] {
  const actions: MigrationAction[] = [];

  // Add missing tokens for coverage gaps
  const gaps = auditResult.coverage.matrix.filter(
    cell => cell.required && !cell.present
  );

  if (gaps.length > 0) {
    actions.push({
      type: "create",
      targets: gaps.map(g => `${g.uxContext}.${g.propertyClass}`),
      description: `Create ${gaps.length} missing token(s) for coverage`,
      risk: "low",
      automated: false,
      validation: ["Verify new tokens integrate properly", "Check naming consistency"],
    });
  }

  return actions;
}

function generateValidationActions(auditResult: SemanticAuditResult): MigrationAction[] {
  return [
    {
      type: "update-references",
      targets: ["all-tokens"],
      description: "Run comprehensive validation suite",
      risk: "low",
      automated: true,
      validation: [
        "Accessibility contrast checks pass",
        "No broken references",
        "Visual regression tests pass",
        "Documentation is complete",
      ],
    },
  ];
}

function generateComprehensiveStructuralActions(
  auditResult: SemanticAuditResult,
  riskProfile: MigrationRiskProfile,
): MigrationAction[] {
  return [
    ...generateCriticalFixActions(auditResult, riskProfile),
    ...generateStructuralActions(auditResult, riskProfile),
    {
      type: "restructure",
      targets: ["all-tokens"],
      description: "Complete restructure to ontology-compliant organization",
      risk: "high",
      automated: true,
      validation: [
        "100% ontology compliance",
        "All references updated",
        "Visual regression suite passes",
      ],
    },
  ];
}

function generateComprehensiveCoverageActions(auditResult: SemanticAuditResult): MigrationAction[] {
  return [
    ...generateCoverageActions(auditResult),
    {
      type: "create",
      targets: ["comprehensive-coverage"],
      description: "Add full token coverage for all components and contexts",
      risk: "medium",
      automated: false,
      validation: ["100% coverage achieved", "All tokens documented"],
    },
  ];
}

function generateAnalysisActions(
  auditResult: SemanticAuditResult,
  riskProfile: MigrationRiskProfile,
): MigrationAction[] {
  return [{
    type: "update-references",
    targets: ["analysis"],
    description: "Conduct deep analysis: audit, risk assessment, dependency mapping",
    risk: "low",
    automated: true,
    validation: ["Analysis reports complete", "Risk assessment documented"],
  }];
}

function generateInfrastructureActions(): MigrationAction[] {
  return [{
    type: "create",
    targets: ["infrastructure"],
    description: "Build migration tooling, testing framework, rollback mechanisms",
    risk: "low",
    automated: false,
    validation: ["Tools tested and validated", "Rollback mechanism verified"],
  }];
}

function generateOptimizationActions(auditResult: SemanticAuditResult): MigrationAction[] {
  return [{
    type: "update-references",
    targets: ["optimization"],
    description: "Performance tuning, accessibility validation, refinement",
    risk: "low",
    automated: true,
    validation: ["Performance benchmarks met", "WCAG 2.1 AA compliance verified"],
  }];
}

function generateHandoffActions(auditResult: SemanticAuditResult): MigrationAction[] {
  return [{
    type: "update-references",
    targets: ["documentation"],
    description: "Complete documentation, training materials, knowledge transfer",
    risk: "low",
    automated: false,
    validation: ["Documentation reviewed", "Training materials delivered"],
  }];
}

// ---------------------------------------------------------------------------
// Comparison Helpers
// ---------------------------------------------------------------------------

function generateRecommendationReasoning(
  recommended: MigrationScenario,
  allScenarios: MigrationScenario[],
  weights: Record<string, number>,
): string {
  const parts: string[] = [];

  parts.push(`**${recommended.name}** is recommended based on your priorities:`);

  if (weights.risk > 0.3) {
    parts.push(`- **Risk management** (${(weights.risk * 100).toFixed(0)}% weight): This scenario has a risk score of ${recommended.riskScore}/100.`);
  }

  if (weights.effort > 0.2) {
    parts.push(`- **Resource efficiency** (${(weights.effort * 100).toFixed(0)}% weight): Requires ${recommended.estimatedEffort} hours over ${recommended.estimatedDays} days.`);
  }

  parts.push(`- **Success probability**: ${(recommended.successProbability * 100).toFixed(0)}% based on historical patterns.`);

  return parts.join("\n");
}

function compareStructure(
  current: Record<string, number>,
  reference: Record<string, number>,
): number {
  const keys = new Set([...Object.keys(current), ...Object.keys(reference)]);
  let matches = 0;
  let total = 0;

  for (const key of keys) {
    const currVal = current[key] ?? 0;
    const refVal = reference[key] ?? 0;
    const diff = Math.abs(currVal - refVal);
    const maxVal = Math.max(currVal, refVal);

    if (maxVal > 0) {
      matches += 1 - (diff / maxVal);
      total += 1;
    }
  }

  return total > 0 ? matches / total : 0;
}

function compareNaming(
  current: Map<string, DesignToken>,
  reference: Map<string, DesignToken>,
): number {
  const currentParsed = Array.from(current.keys()).filter(k => parseSemanticPath(k)).length;
  const referenceParsed = Array.from(reference.keys()).filter(k => parseSemanticPath(k)).length;

  const currentRate = current.size > 0 ? currentParsed / current.size : 0;
  const referenceRate = reference.size > 0 ? referenceParsed / reference.size : 0;

  return 1 - Math.abs(currentRate - referenceRate);
}

function compareCoverage(current: string[], reference: string[]): number {
  const currentSet = new Set(current);
  const referenceSet = new Set(reference);
  const intersection = new Set([...currentSet].filter(x => referenceSet.has(x)));

  const union = new Set([...currentSet, ...referenceSet]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

function computePropertyClassDistribution(tokens: Map<string, DesignToken>): Record<string, number> {
  const dist: Record<string, number> = {};

  for (const [path] of tokens) {
    const parsed = parseSemanticPath(path);
    if (parsed) {
      dist[parsed.propertyClass] = (dist[parsed.propertyClass] ?? 0) + 1;
    }
  }

  return dist;
}

function extractCoveredContexts(tokens: Map<string, DesignToken>): string[] {
  const contexts = new Set<string>();

  for (const [path] of tokens) {
    const parsed = parseSemanticPath(path);
    if (parsed && parsed.uxContext) {
      contexts.add(parsed.uxContext);
    }
  }

  return Array.from(contexts);
}

function generateReferenceInsights(
  current: Map<string, DesignToken>,
  reference: Map<string, DesignToken>,
  structuralAlignment: number,
  namingAlignment: number,
  coverageAlignment: number,
): string[] {
  const insights: string[] = [];

  if (structuralAlignment > 0.8) {
    insights.push("Strong structural alignment — property class distribution is similar.");
  } else if (structuralAlignment < 0.5) {
    insights.push("Weak structural alignment — consider adopting reference structure.");
  }

  if (namingAlignment > 0.8) {
    insights.push("Naming conventions are well-aligned with reference.");
  } else if (namingAlignment < 0.5) {
    insights.push("Naming conventions diverge significantly from reference.");
  }

  if (coverageAlignment > 0.7) {
    insights.push("Coverage is comparable to reference system.");
  } else if (coverageAlignment < 0.4) {
    insights.push("Coverage gaps compared to reference — missing key UX contexts.");
  }

  return insights;
}

function generateReferenceRecommendations(
  current: Map<string, DesignToken>,
  reference: Map<string, DesignToken>,
  similarity: number,
  insights: string[],
): string[] {
  const recommendations: string[] = [];

  if (similarity < 0.5) {
    recommendations.push("Consider aligning more closely with reference system structure.");
  }

  if (insights.some(i => i.includes("structural"))) {
    recommendations.push("Review property class organization in reference system.");
  }

  if (insights.some(i => i.includes("naming"))) {
    recommendations.push("Adopt naming conventions from reference for consistency.");
  }

  if (insights.some(i => i.includes("coverage"))) {
    recommendations.push("Expand coverage to match contexts present in reference.");
  }

  return recommendations;
}
