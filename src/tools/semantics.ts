/**
 * Semantic token MCP tools
 *
 * Tools:
 *   - describe_ontology:     Explain the semantic token naming model
 *   - scaffold_semantics:    Generate semantic tokens from a component inventory
 *   - audit_semantics:       Audit an existing token set for structural issues
 *   - analyze_coverage:      Show the coverage matrix for the token set
 *   - check_contrast:        Check contrast ratios for foreground/background pairs
 *   - analyze_topology:      Analyze token topology (dependencies, anti-patterns, structure)
 */
import type { DesignToken, McpDsConfig } from "../lib/types.js";
import { loadAllTokens, resolveReferences } from "../lib/parser.js";
import {
  computeContrast,
  resolveTokenColor,
  type ContrastResult,
} from "../lib/color/index.js";
import {
  ALL_PROPERTY_CLASSES,
  SEMANTIC_INTENTS,
  UX_CONTEXTS,
  INTERACTION_STATES,
  EMPHASIS_MODIFIERS,
  COMPONENT_TOKEN_SURFACES,
  parseSemanticPath,
  buildSemanticPath,
} from "../lib/semantics/ontology.js";
import {
  evaluateScoping,
  generateScopingReport,
  ALL_SCOPING_RULES,
} from "../lib/semantics/scoping.js";
import {
  scaffoldSemanticTokens,
  tokensToNestedJson,
  mergeWithExisting,
  type ScaffoldOptions,
} from "../lib/semantics/scaffold.js";
import {
  auditSemanticTokens,
  type SemanticAuditResult,
} from "../lib/semantics/audit.js";
import {
  writeTokenFiles,
  type SplitStrategy,
  type MergeStrategy,
} from "../lib/io/writer.js";
import {
  assessMigrationRisk,
  type MigrationRiskProfile,
} from "../lib/migration/risk-assessment.js";
import {
  generateMigrationScenarios,
  compareScenarios,
  compareWithReferenceSystem,
  type MigrationScenario,
  type ScenarioComparison,
  type ReferenceSystemComparison,
} from "../lib/migration/scenarios.js";
import {
  generateTopologyReport,
  visualizeDependencyGraph,
  visualizeCoverageMatrix,
  visualizeTokenDistribution,
  visualizeAntiPatterns,
} from "../lib/semantics/visualization.js";

// ---------------------------------------------------------------------------
// describe_ontology — explain the naming model
// ---------------------------------------------------------------------------

export function describeOntologyTool(): { formatted: string } {
  const lines: string[] = [];

  lines.push("# Semantic Token Ontology");
  lines.push("");
  lines.push("## Naming Formula");
  lines.push("");
  lines.push("```");
  lines.push("{propertyClass}.{uxContext}.{intent}.{modifier}.{state}");
  lines.push("```");
  lines.push("");
  lines.push("- **propertyClass** (required): CSS-destination. Leads the name for cognitive clarity.");
  lines.push("- **uxContext** (optional): Component domain. Omit for global semantics.");
  lines.push("- **intent** (required): Semantic meaning / communicative purpose.");
  lines.push('- **modifier** (optional): Emphasis level. Omit "default".');
  lines.push('- **state** (optional): Interaction state. Omit "default".');
  lines.push("");
  lines.push("### Examples");
  lines.push("```");
  lines.push("background.action.accent.strong.hover");
  lines.push("text.input.danger");
  lines.push("border.surface.base");
  lines.push("icon.feedback.success");
  lines.push("background.accent      ← global (no uxContext)");
  lines.push("```");
  lines.push("");

  // Property classes
  lines.push("## Property Classes (CSS-destination axis)");
  lines.push("");
  for (const pc of ALL_PROPERTY_CLASSES) {
    lines.push(`### ${pc.label} (\`${pc.id}\`)`);
    lines.push(pc.description);
    lines.push(`CSS: ${pc.cssProperties.join(", ")}`);
    if (pc.requiredPairings?.length) {
      lines.push(`Requires pairing with: ${pc.requiredPairings.join(", ")}`);
    }
    lines.push("");
  }

  // Semantic intents
  lines.push("## Semantic Intents (meaning axis)");
  lines.push("");
  for (const si of SEMANTIC_INTENTS) {
    lines.push(`- **${si.label}** (\`${si.id}\`): ${si.description}`);
  }
  lines.push("");

  // UX contexts
  lines.push("## UX Contexts (component-domain axis)");
  lines.push("");
  for (const ux of UX_CONTEXTS) {
    lines.push(`### ${ux.label} (\`${ux.id}\`)`);
    lines.push(ux.description);
    lines.push(`Components: ${ux.components.join(", ")}`);
    lines.push(`Required property classes: ${ux.requiredPropertyClasses.join(", ")}`);
    lines.push(`Interactive: ${ux.interactive ? "yes" : "no"}`);
    lines.push("");
  }

  // Interaction states
  lines.push("## Interaction States");
  lines.push("");
  for (const s of INTERACTION_STATES) {
    lines.push(`- **${s.label}** (\`${s.id}\`): ${s.description} → \`${s.cssSelector || "(none)"}\``);
  }
  lines.push("");

  // Emphasis modifiers
  lines.push("## Emphasis Modifiers");
  lines.push("");
  for (const m of EMPHASIS_MODIFIERS) {
    lines.push(`- **${m.label}** (\`${m.id}\`): ${m.description}`);
  }
  lines.push("");

  // Component surfaces
  lines.push("## Registered Component Surfaces");
  lines.push("");
  lines.push(`${COMPONENT_TOKEN_SURFACES.length} components have built-in token surface definitions:`);
  lines.push("");
  const byCtx = new Map<string, string[]>();
  for (const cs of COMPONENT_TOKEN_SURFACES) {
    if (!byCtx.has(cs.uxContext)) byCtx.set(cs.uxContext, []);
    byCtx.get(cs.uxContext)!.push(cs.component);
  }
  for (const [ctx, comps] of byCtx) {
    lines.push(`- **${ctx}**: ${comps.join(", ")}`);
  }
  lines.push("");

  // Scoping rules
  lines.push("## Scoping Rules");
  lines.push("");
  for (const rule of ALL_SCOPING_RULES) {
    lines.push(`- **${rule.name}** (\`${rule.id}\`, ${rule.severity}): ${rule.description}`);
  }

  return { formatted: lines.join("\n") };
}

// ---------------------------------------------------------------------------
// scaffold_semantics — generate tokens from component inventory
// ---------------------------------------------------------------------------

export async function scaffoldSemanticsTool(
  args: {
    components: string;
    includeModifiers?: boolean;
    includeGlobalTokens?: boolean;
    additionalIntents?: string;
    valueStrategy?: string;
    format?: string;
    outputDir?: string;
    dryRun?: boolean;
    mergeStrategy?: string;
    splitStrategy?: string;
  },
  projectRoot: string,
  config: McpDsConfig,
): Promise<{ formatted: string; json: unknown }> {
  const components = args.components
    .split(/[,\s]+/)
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);

  const additionalIntents = args.additionalIntents
    ? args.additionalIntents.split(/[,\s]+/).filter(Boolean)
    : undefined;

  const options: ScaffoldOptions = {
    components,
    includeModifiers: args.includeModifiers,
    includeGlobalTokens: args.includeGlobalTokens ?? true,
    additionalIntents,
    valueStrategy: (args.valueStrategy as "reference" | "placeholder" | "empty") ?? "reference",
    outputFormat: (args.format as "flat" | "nested") ?? "flat",
  };

  const result = scaffoldSemanticTokens(options);

  // Format output
  const lines: string[] = [];
  lines.push("# Semantic Token Scaffold");
  lines.push("");
  lines.push(`Generated **${result.summary.totalTokens}** tokens for **${components.length}** component(s).`);
  lines.push("");

  if (result.summary.unknownComponents.length > 0) {
    lines.push(
      `> **Note:** ${result.summary.unknownComponents.join(", ")} ` +
        `not found in built-in registry — used generic surface fallback.`,
    );
    lines.push("");
  }

  lines.push("## Breakdown");
  lines.push("");
  for (const b of result.summary.breakdown) {
    lines.push(
      `- **${b.uxContext}**: ${b.tokenCount} tokens — ` +
        `classes: ${b.propertyClasses.join(", ")} | ` +
        `intents: ${b.intents.join(", ")} | ` +
        `states: ${b.states.join(", ")}`,
    );
  }
  lines.push("");

  // Show the tokens
  const nestedJson = tokensToNestedJson(result.tokens);

  // ---- File writing (optional) ----
  if (args.outputDir) {
    const split = (args.splitStrategy as SplitStrategy) ?? "by-context";
    const merge = (args.mergeStrategy as MergeStrategy) ?? "additive";
    const dryRun = args.dryRun ?? false;

    const writeResult = writeTokenFiles(
      result.tokens,
      args.outputDir,
      projectRoot,
      { split, merge, dryRun, filePrefix: "semantic-tokens" },
    );

    lines.push("## File Output");
    lines.push("");
    lines.push(writeResult.summary);
    lines.push("");
  } else {
    // No output dir — show JSON inline
    lines.push("## Generated Tokens (W3C Design Tokens format)");
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(nestedJson, null, 2));
    lines.push("```");
  }

  return {
    formatted: lines.join("\n"),
    json: nestedJson,
  };
}

// ---------------------------------------------------------------------------
// audit_semantics — comprehensive audit of existing tokens
// ---------------------------------------------------------------------------

export async function auditSemanticsTool(
  args: {
    pathPrefix?: string;
    skipRules?: string;
  },
  projectRoot: string,
  config: McpDsConfig,
): Promise<{ formatted: string; result: SemanticAuditResult }> {
  // Load existing tokens
  const tokenMap = await loadAllTokens(projectRoot, config);
  resolveReferences(tokenMap);

  const pathPrefixes = args.pathPrefix
    ? args.pathPrefix.split(",").map((p) => p.trim())
    : undefined;
  const skipRules = args.skipRules
    ? args.skipRules.split(",").map((r) => r.trim())
    : undefined;

  const result = auditSemanticTokens(tokenMap, {
    pathPrefixes,
    skipRules,
  });

  // Format output
  const lines: string[] = [];
  lines.push(result.summary);
  lines.push("");

  // Detailed violations
  if (result.scoping.violations.length > 0) {
    lines.push("## Scoping Violations");
    lines.push("");
    for (const v of result.scoping.violations) {
      const icon = v.severity === "error" ? "❌" : v.severity === "warning" ? "⚠️" : "ℹ️";
      lines.push(`${icon} **${v.ruleId}** (${v.severity})`);
      lines.push(`   ${v.message}`);
      if (v.suggestion) {
        lines.push(`   💡 ${v.suggestion}`);
      }
      lines.push(`   Tokens: ${v.tokenPaths.slice(0, 5).join(", ")}${v.tokenPaths.length > 5 ? " ..." : ""}`);
      lines.push("");
    }
  }

  // Migration suggestions
  if (result.migration.length > 0) {
    lines.push("## Migration Suggestions");
    lines.push("");
    for (const m of result.migration.slice(0, 20)) {
      const confPct = Math.round(m.confidence * 100);
      lines.push(`- \`${m.originalPath}\` → \`${m.suggestedPath}\` (${confPct}% confidence)`);
      lines.push(`  ${m.reason}`);
    }
    if (result.migration.length > 20) {
      lines.push(`  ... and ${result.migration.length - 20} more.`);
    }
    lines.push("");
  }

  // Accessibility pairs
  if (result.accessibility.pairs.length > 0) {
    lines.push("## Accessibility Contrast Pairs");
    lines.push("");
    lines.push(`Found ${result.accessibility.pairs.length} foreground/background pair(s) for contrast checking.`);
    if (result.accessibility.unpairedTokens.length > 0) {
      lines.push(
        `⚠️ ${result.accessibility.unpairedTokens.length} token(s) without matching pair:`,
      );
      for (const t of result.accessibility.unpairedTokens.slice(0, 10)) {
        lines.push(`  - ${t}`);
      }
    }
    lines.push("");
  }

  return {
    formatted: lines.join("\n"),
    result,
  };
}

// ---------------------------------------------------------------------------
// analyze_coverage — coverage matrix
// ---------------------------------------------------------------------------

export async function analyzeCoverageTool(
  args: {
    pathPrefix?: string;
  },
  projectRoot: string,
  config: McpDsConfig,
): Promise<{ formatted: string }> {
  // Load existing tokens
  const tokenMap = await loadAllTokens(projectRoot, config);
  resolveReferences(tokenMap);

  // Filter if needed
  let filteredMap = tokenMap;
  if (args.pathPrefix) {
    filteredMap = new Map(
      [...tokenMap].filter(([path]) => path.startsWith(args.pathPrefix!)),
    );
  }

  const result = auditSemanticTokens(filteredMap);
  const { coverage } = result;

  const lines: string[] = [];
  lines.push("# Semantic Token Coverage Matrix");
  lines.push("");
  lines.push(`Coverage score: **${Math.round(coverage.coverageScore * 100)}%**`);
  lines.push("");

  // Build a matrix table
  const contexts = UX_CONTEXTS.map((u) => u.id);
  const propClasses = ALL_PROPERTY_CLASSES.map((p) => p.id);

  // Header
  lines.push(`| Context | ${propClasses.join(" | ")} |`);
  lines.push(`| --- | ${propClasses.map(() => "---").join(" | ")} |`);

  for (const ctx of contexts) {
    const cells = propClasses.map((pc) => {
      const cell = coverage.matrix.find(
        (c) => c.uxContext === ctx && c.propertyClass === pc,
      );
      if (!cell) return "—";
      if (cell.present && cell.required) return `✅ ${cell.tokenCount}`;
      if (cell.present && !cell.required) return `➕ ${cell.tokenCount}`;
      if (!cell.present && cell.required) return "❌";
      return "—";
    });
    lines.push(`| **${ctx}** | ${cells.join(" | ")} |`);
  }
  lines.push("");
  lines.push("Legend: ✅ = required & present, ❌ = required & missing, ➕ = extra, — = not applicable");
  lines.push("");

  if (coverage.missingContexts.length > 0) {
    lines.push(`**Missing UX contexts:** ${coverage.missingContexts.join(", ")}`);
    lines.push("(No tokens found for these contexts)");
  }

  return { formatted: lines.join("\n") };
}

// ---------------------------------------------------------------------------
// check_contrast — WCAG 2.1 + APCA contrast checking
// ---------------------------------------------------------------------------

export async function checkContrastTool(
  args: {
    foreground?: string;
    background?: string;
    pathPrefix?: string;
    algorithm?: string;
    threshold?: string;
  },
  projectRoot: string,
  config: McpDsConfig,
): Promise<{ formatted: string; results: unknown }> {
  const algorithm = (args.algorithm as "wcag21" | "apca" | "both") ?? "both";

  // --- Mode 1: Explicit color values ---
  if (args.foreground && args.background) {
    const result = computeContrast(args.foreground, args.background, algorithm);
    const lines: string[] = [];
    lines.push("# Contrast Check");
    lines.push("");
    lines.push(`**Foreground:** ${args.foreground}`);
    lines.push(`**Background:** ${args.background}`);
    lines.push("");
    lines.push(formatContrastResult(result));

    return { formatted: lines.join("\n"), results: result };
  }

  // --- Mode 2: Scan token set for all foreground/background pairs ---
  const tokenMap = await loadAllTokens(projectRoot, config);
  resolveReferences(tokenMap);

  // Optionally filter by path prefix
  let filteredMap = tokenMap;
  if (args.pathPrefix) {
    const prefixes = args.pathPrefix.split(",").map((p) => p.trim());
    filteredMap = new Map(
      [...tokenMap].filter(([path]) =>
        prefixes.some((prefix) => path.startsWith(prefix)),
      ),
    );
  }

  const auditResult = auditSemanticTokens(filteredMap);
  const { accessibility } = auditResult;

  // Optional numeric threshold filter
  const minRatio = args.threshold ? parseFloat(args.threshold) : undefined;

  const lines: string[] = [];
  lines.push("# Contrast Audit");
  lines.push("");
  lines.push(`Scanned **${filteredMap.size}** tokens, found **${accessibility.pairs.length}** contrast pair(s).`);
  lines.push(`Computable: **${accessibility.computablePairs}** | ` +
    `WCAG failures: **${accessibility.wcagFailures}** | ` +
    `APCA < 75: **${accessibility.apcaFailures}**`);
  lines.push(`Contrast score: **${Math.round(accessibility.contrastScore * 100)}%**`);
  lines.push("");

  // Show failing pairs
  const failing = accessibility.pairs.filter((p) => {
    if (!p.computable) return false;
    if (p.issue) return true;
    if (minRatio && p.contrast?.wcag21 && p.contrast.wcag21.ratio < minRatio) return true;
    return false;
  });

  if (failing.length > 0) {
    lines.push("## Failing Pairs");
    lines.push("");
    for (const pair of failing.slice(0, 50)) {
      lines.push(`### ${pair.context}`);
      lines.push(`- **FG:** \`${pair.foregroundPath}\` → ${pair.foregroundValue}`);
      lines.push(`- **BG:** \`${pair.backgroundPath}\` → ${pair.backgroundValue}`);
      if (pair.contrast) {
        lines.push(formatContrastResult(pair.contrast));
      }
      if (pair.issue) {
        lines.push(`- ⚠️ ${pair.issue}`);
      }
      lines.push("");
    }
    if (failing.length > 50) {
      lines.push(`... and ${failing.length - 50} more failing pairs.`);
      lines.push("");
    }
  } else {
    lines.push("✅ All computable pairs pass contrast thresholds.");
    lines.push("");
  }

  // Show passing pairs summary
  const passing = accessibility.pairs.filter((p) => p.computable && !p.issue);
  if (passing.length > 0) {
    lines.push("## Passing Pairs");
    lines.push("");
    lines.push(`${passing.length} pair(s) meet WCAG 2.1 AA and APCA thresholds.`);

    // Show first few as examples
    for (const pair of passing.slice(0, 10)) {
      const ratio = pair.contrast?.wcag21?.ratio.toFixed(2) ?? "?";
      const lc = pair.contrast?.apca?.lc.toFixed(1) ?? "?";
      lines.push(`- \`${pair.foregroundPath}\` on \`${pair.backgroundPath}\`: ratio ${ratio}:1, Lc ${lc}`);
    }
    if (passing.length > 10) {
      lines.push(`  ... and ${passing.length - 10} more.`);
    }
    lines.push("");
  }

  // Unpaired tokens warning
  if (accessibility.unpairedTokens.length > 0) {
    lines.push("## Unpaired Tokens");
    lines.push("");
    lines.push(`${accessibility.unpairedTokens.length} token(s) have no matching foreground/background pair:`);
    for (const t of accessibility.unpairedTokens.slice(0, 20)) {
      lines.push(`- \`${t}\``);
    }
    if (accessibility.unpairedTokens.length > 20) {
      lines.push(`  ... and ${accessibility.unpairedTokens.length - 20} more.`);
    }
  }

  return {
    formatted: lines.join("\n"),
    results: {
      totalPairs: accessibility.pairs.length,
      computablePairs: accessibility.computablePairs,
      wcagFailures: accessibility.wcagFailures,
      apcaFailures: accessibility.apcaFailures,
      contrastScore: accessibility.contrastScore,
      failingPairs: failing.map((p) => ({
        foreground: p.foregroundPath,
        background: p.backgroundPath,
        contrast: p.contrast,
        issue: p.issue,
      })),
    },
  };
}

/**
 * Format a ContrastResult for display.
 */
function formatContrastResult(result: ContrastResult): string {
  const parts: string[] = [];

  if (result.wcag21) {
    const w = result.wcag21;
    parts.push(`- **WCAG 2.1:** ratio **${w.ratio.toFixed(2)}:1** — ` +
      `normal text: ${w.levelNormal}, ` +
      `large text: ${w.levelLarge}, ` +
      `UI components: ${w.levelComponent}`);
  }

  if (result.apca) {
    const a = result.apca;
    parts.push(`- **APCA:** Lc **${a.lc.toFixed(1)}** — level: ${a.level}`);
  }

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// analyze_topology — comprehensive topology analysis
// ---------------------------------------------------------------------------

export async function analyzeTopologyTool(
  args: {
    pathPrefix?: string;
    includeGraph?: boolean;
    includeDistribution?: boolean;
    includeAntiPatterns?: boolean;
    graphMaxNodes?: number;
    graphMaxDepth?: number;
  },
  projectRoot: string,
  config: McpDsConfig,
): Promise<{ formatted: string; json: unknown }> {
  // Load existing tokens
  const tokenMap = await loadAllTokens(projectRoot, config);
  resolveReferences(tokenMap);

  const pathPrefixes = args.pathPrefix
    ? args.pathPrefix.split(",").map((p) => p.trim())
    : undefined;

  // Run audit to get all analyses
  const audit = auditSemanticTokens(tokenMap, { pathPrefixes });

  const includeGraph = args.includeGraph ?? true;
  const includeDistribution = args.includeDistribution ?? true;
  const includeAntiPatterns = args.includeAntiPatterns ?? true;

  // Build formatted output
  const lines: string[] = [];

  lines.push("# Token Topology Analysis");
  lines.push("");
  lines.push("## Overview");
  lines.push("");
  lines.push(`- **Total Tokens**: ${audit.structure.totalTokens}`);
  lines.push(`- **Primitives**: ${audit.dependencies.metrics.primitiveCount}`);
  lines.push(`- **Semantic Tokens**: ${audit.dependencies.metrics.semanticCount}`);
  lines.push(`- **Isolated**: ${audit.dependencies.metrics.isolatedCount}`);
  lines.push(`- **Max Depth**: ${audit.dependencies.metrics.maxDepth}`);
  lines.push(`- **Avg Depth**: ${audit.dependencies.metrics.avgDepth.toFixed(2)}`);
  lines.push(`- **Total References**: ${audit.dependencies.metrics.totalEdges}`);
  lines.push("");

  // Dependency issues
  if (audit.dependencies.issues.length > 0) {
    lines.push("## Dependency Issues");
    lines.push("");

    const errors = audit.dependencies.issues.filter(i => i.severity === "error");
    const warnings = audit.dependencies.issues.filter(i => i.severity === "warning");
    const info = audit.dependencies.issues.filter(i => i.severity === "info");

    if (errors.length > 0) {
      lines.push(`### ❌ Errors (${errors.length})`);
      lines.push("");
      for (const issue of errors.slice(0, 10)) {
        lines.push(`- **${issue.type}**: ${issue.message}`);
        if (issue.tokenPaths.length <= 5) {
          lines.push(`  - Tokens: ${issue.tokenPaths.map(p => `\`${p}\``).join(", ")}`);
        }
      }
      if (errors.length > 10) {
        lines.push(`  - _... and ${errors.length - 10} more errors_`);
      }
      lines.push("");
    }

    if (warnings.length > 0) {
      lines.push(`### ⚠️ Warnings (${warnings.length})`);
      lines.push("");
      for (const issue of warnings.slice(0, 10)) {
        lines.push(`- **${issue.type}**: ${issue.message}`);
        if (issue.tokenPaths.length <= 3) {
          lines.push(`  - Tokens: ${issue.tokenPaths.map(p => `\`${p}\``).join(", ")}`);
        }
      }
      if (warnings.length > 10) {
        lines.push(`  - _... and ${warnings.length - 10} more warnings_`);
      }
      lines.push("");
    }

    if (info.length > 5) {
      lines.push(`### ℹ️ Info: ${info.length} isolated tokens (not shown for brevity)`);
      lines.push("");
    }
  } else {
    lines.push("## Dependency Issues");
    lines.push("");
    lines.push("✅ No dependency issues detected!");
    lines.push("");
  }

  // Token distribution
  if (includeDistribution) {
    lines.push(visualizeTokenDistribution(audit.structure));
    lines.push("");
  }

  // Coverage matrix
  lines.push(visualizeCoverageMatrix(audit.coverage, { showCounts: true }));
  lines.push("");

  // Dependency graph
  if (includeGraph) {
    lines.push("## Dependency Graph");
    lines.push("");
    const graphMaxNodes = args.graphMaxNodes ?? 40;
    const graphMaxDepth = args.graphMaxDepth ?? 3;
    lines.push(visualizeDependencyGraph(audit.dependencies, {
      maxNodes: graphMaxNodes,
      maxDepth: graphMaxDepth,
    }));
    lines.push("");
  }

  // Anti-patterns
  if (includeAntiPatterns && audit.antiPatterns.summary.total > 0) {
    lines.push(visualizeAntiPatterns(audit.antiPatterns, { maxPerType: 5 }));
    lines.push("");
  }

  // Recommendations
  lines.push("## Recommendations");
  lines.push("");

  const recs: string[] = [];

  if (audit.dependencies.issues.filter(i => i.type === "unresolved").length > 0) {
    recs.push("- **Fix unresolved references** to ensure token integrity");
  }

  if (audit.dependencies.issues.filter(i => i.type === "circular").length > 0) {
    recs.push("- **Break circular dependencies** by introducing intermediate tokens");
  }

  if (audit.dependencies.issues.filter(i => i.type === "deep-chain").length > 0) {
    recs.push("- **Flatten deep reference chains** (>3 levels) for better maintainability");
  }

  if (audit.dependencies.metrics.isolatedCount > audit.structure.totalTokens * 0.1) {
    recs.push("- **Review isolated tokens** - consider removing unused tokens or referencing them");
  }

  if (audit.antiPatterns.summary.bySeverity.error ?? 0 > 0) {
    recs.push("- **Address anti-pattern errors** to improve token quality");
  }

  if (audit.coverage.coverageScore < 0.7) {
    recs.push("- **Improve coverage** - several UX contexts are missing required property classes");
  }

  if (recs.length === 0) {
    lines.push("✅ Token topology is healthy! Continue maintaining current structure.");
  } else {
    lines.push(recs.join("\n"));
  }

  lines.push("");

  return {
    formatted: lines.join("\n"),
    json: {
      overview: {
        totalTokens: audit.structure.totalTokens,
        primitives: audit.dependencies.metrics.primitiveCount,
        semanticTokens: audit.dependencies.metrics.semanticCount,
        isolated: audit.dependencies.metrics.isolatedCount,
        maxDepth: audit.dependencies.metrics.maxDepth,
        avgDepth: audit.dependencies.metrics.avgDepth,
        totalEdges: audit.dependencies.metrics.totalEdges,
      },
      dependencies: {
        issues: audit.dependencies.issues,
        metrics: audit.dependencies.metrics,
      },
      antiPatterns: audit.antiPatterns,
      coverage: {
        score: audit.coverage.coverageScore,
        coveredContexts: audit.coverage.coveredContexts.length,
        missingContexts: audit.coverage.missingContexts,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// generate_refactor_scenarios — Migration Scenario Generator
// ---------------------------------------------------------------------------

export interface GenerateRefactorScenariosResult {
  formatted: string;
  json: {
    riskProfile: MigrationRiskProfile;
    scenarios: MigrationScenario[];
    comparison: ScenarioComparison;
    referenceComparison?: ReferenceSystemComparison;
  };
}

/**
 * Generate migration scenarios for token refactoring.
 *
 * Analyzes audit results and risk profile to produce 3 migration approaches:
 * - Conservative: Minimal changes, low risk, fast timeline
 * - Progressive: Balanced improvements, moderate risk, sustainable
 * - Comprehensive: Complete transformation, higher risk, maximum value
 *
 * @param config - MCP-DS configuration
 * @param pathPrefix - Optional filter for token paths
 * @param riskTolerance - Risk tolerance level
 * @param approaches - Which approaches to generate
 * @param teamSize - Team size for effort estimation
 * @param hoursPerWeek - Available hours per week
 * @returns Migration scenarios with comparison and recommendations
 */
export async function generateRefactorScenariosTool(
  projectRoot: string,
  config: McpDsConfig,
  pathPrefix?: string,
  riskTolerance: "conservative" | "moderate" | "aggressive" = "moderate",
  approaches?: Array<"conservative" | "progressive" | "comprehensive">,
  teamSize?: number,
  hoursPerWeek?: number,
): Promise<GenerateRefactorScenariosResult> {
  // Load and resolve tokens
  const allTokens = await loadAllTokens(projectRoot, config);
  resolveReferences(allTokens);

  // Filter if prefix provided
  let filteredTokens = allTokens;
  if (pathPrefix) {
    filteredTokens = new Map(
      [...allTokens].filter(([path]) => path.startsWith(pathPrefix))
    );
  }

  // Run audit
  const auditResult = auditSemanticTokens(filteredTokens);

  // Assess risk
  const riskProfile = assessMigrationRisk(
    filteredTokens,
    auditResult.dependencies,
    { riskTolerance }
  );

  // Generate scenarios
  const scenarios = generateMigrationScenarios(auditResult, riskProfile, {
    approaches,
    riskTolerance,
    teamSize,
    availableHoursPerWeek: hoursPerWeek,
  });

  // Compare scenarios
  const comparison = compareScenarios(scenarios);

  // Format output
  const lines: string[] = [];

  lines.push(`## Migration Scenario Analysis`);
  lines.push(``);

  // Risk Profile Summary
  lines.push(`### Risk Profile`);
  lines.push(`- **Overall Risk:** ${riskProfile.overallRisk}/100 (${riskProfile.riskLevel})`);
  lines.push(`- **High-Risk Tokens:** ${riskProfile.highRiskTokens.length}`);
  lines.push(``);

  lines.push(`#### Risk Dimensions`);
  lines.push(`| Dimension | Score | Level | Key Factors |`);
  lines.push(`|-----------|-------|-------|-------------|`);
  for (const [dim, data] of Object.entries(riskProfile.dimensions)) {
    const factor = data.factors[0] ?? "None";
    lines.push(`| ${capitalize(dim)} | ${data.score}/100 | ${data.level} | ${factor} |`);
  }
  lines.push(``);

  lines.push(`#### Readiness Indicators`);
  lines.push(`- **Documentation:** ${(riskProfile.readiness.documentation * 100).toFixed(0)}%`);
  lines.push(`- **Dependency Clarity:** ${(riskProfile.readiness.dependencyClarity * 100).toFixed(0)}%`);
  lines.push(`- **Migration Path Clarity:** ${(riskProfile.readiness.migrationPathClarity * 100).toFixed(0)}%`);
  lines.push(`- **Overall Readiness:** ${(riskProfile.readiness.overall * 100).toFixed(0)}%`);
  lines.push(``);

  // Scenarios
  lines.push(`### Migration Scenarios`);
  lines.push(``);

  for (const scenario of scenarios) {
    lines.push(`#### ${scenario.approach === comparison.recommended ? "⭐ " : ""}${scenario.name}`);
    lines.push(scenario.description);
    lines.push(``);

    lines.push(`**Metrics:**`);
    lines.push(`- Risk Score: ${scenario.riskScore}/100`);
    lines.push(`- Estimated Effort: ${scenario.estimatedEffort} person-hours`);
    lines.push(`- Timeline: ${scenario.estimatedDays} days`);
    lines.push(`- Success Probability: ${(scenario.successProbability * 100).toFixed(0)}%`);
    lines.push(`- Phases: ${scenario.phases.length}`);
    lines.push(``);

    lines.push(`**Benefits:**`);
    scenario.benefits.forEach(b => lines.push(`- ${b}`));
    lines.push(``);

    lines.push(`**Challenges:**`);
    scenario.challenges.forEach(c => lines.push(`- ${c}`));
    lines.push(``);

    lines.push(`**Prerequisites:**`);
    scenario.prerequisites.forEach(p => lines.push(`- ${p}`));
    lines.push(``);

    lines.push(`**Phases:**`);
    for (const phase of scenario.phases) {
      lines.push(`${phase.phase}. **${phase.name}** (${phase.effort}h) — ${phase.description}`);
      lines.push(`   - Actions: ${phase.actions.length}`);
      lines.push(`   - Rollback: ${phase.rollbackPlan}`);
    }
    lines.push(``);
  }

  // Comparison
  lines.push(`### Scenario Comparison`);
  lines.push(``);
  lines.push(comparison.reasoning);
  lines.push(``);

  lines.push(`#### Comparison Matrix`);
  lines.push(`| Dimension | ${scenarios.map(s => s.name).join(" | ")} |`);
  lines.push(`|-----------|${scenarios.map(() => "---").join("|")}|`);
  for (const dim of comparison.matrix) {
    const row = scenarios.map(s => dim.values[s.id]).join(" | ");
    lines.push(`| ${dim.dimension} | ${row} |`);
  }
  lines.push(``);

  // Recommendations
  lines.push(`### Recommendations`);
  riskProfile.recommendations.forEach(rec => lines.push(`- ${rec}`));
  lines.push(``);

  return {
    formatted: lines.join("\n"),
    json: {
      riskProfile,
      scenarios,
      comparison,
    },
  };
}

// ---------------------------------------------------------------------------
// execute_migration — Execute staged migration with validation
// ---------------------------------------------------------------------------

export async function executeMigrationTool(
  projectRoot: string,
  config: McpDsConfig,
  args: {
  pathPrefix?: string;
  scenarioId?: string;
  phaseNumber?: number;
  dryRun?: boolean;
  createSnapshot?: boolean;
  stopOnError?: boolean;
  skipValidation?: boolean;
}): Promise<{ formatted: string; json: any }> {
  const lines: string[] = [];

  // Load tokens
  const tokens = await loadAllTokens(projectRoot, config);
  resolveReferences(tokens);

  // Run audit
  const audit = auditSemanticTokens(tokens);

  // Assess risk
  const riskProfile = assessMigrationRisk(
    tokens,
    audit.dependencies,
    { riskTolerance: "moderate" }
  );

  // Generate scenarios
  const scenarios = generateMigrationScenarios(
    audit,
    riskProfile,
    { approaches: ["conservative", "progressive", "comprehensive"] },
  );

  // Find scenario
  let scenario: MigrationScenario | undefined;
  if (args.scenarioId) {
    scenario = scenarios.find(s => s.id === args.scenarioId);
  } else {
    // Use first conservative scenario as default
    scenario = scenarios.find(s => s.approach === "conservative") ?? scenarios[0];
  }

  if (!scenario) {
    lines.push("# Error: No scenarios available");
    return { formatted: lines.join("\n"), json: { error: "No scenarios available" } };
  }

  // Select phases to execute
  const phasesToExecute = args.phaseNumber
    ? scenario.phases.filter(p => p.phase === args.phaseNumber)
    : scenario.phases;

  if (phasesToExecute.length === 0) {
    lines.push(`# Error: Phase ${args.phaseNumber} not found`);
    return { formatted: lines.join("\n"), json: { error: "Phase not found" } };
  }

  // Import execution modules
  const { executePhase, createSnapshot, rollback } = await import("../lib/migration/executor.js");
  const { validateMigration, generateValidationReport } = await import("../lib/migration/validation.js");

  lines.push(`# Migration Execution: ${scenario.name}`);
  lines.push(``);

  const dryRun = args.dryRun ?? true; // Default to dry run for safety
  lines.push(`**Mode:** ${dryRun ? "🔍 DRY RUN (Preview)" : " ⚠️ LIVE EXECUTION"}`);
  lines.push(`**Scenario:** ${scenario.id}`);
  lines.push(`**Phases:** ${phasesToExecute.map(p => p.phase).join(", ")}`);
  lines.push(``);

  // Create snapshot if requested
  let snapshot;
  if (args.createSnapshot && !dryRun) {
    snapshot = createSnapshot(tokens, {
      description: `Before executing ${scenario.name}`,
      phaseNumber: phasesToExecute[0].phase,
      phaseName: phasesToExecute[0].name,
    });
    lines.push(`✅ Snapshot created: ${snapshot.id}`);
    lines.push(``);
  }

  // Execute phases
  const execution = {
    id: `exec-${Date.now()}`,
    timestamp: new Date(),
    dryRun,
    phases: [] as any[],
    status: "running" as any,
    summary: {
      totalActions: 0,
      completedActions: 0,
      failedActions: 0,
      tokensCreated: 0,
      tokensUpdated: 0,
      tokensDeleted: 0,
      tokensRenamed: 0,
      referencesUpdated: 0,
      validationFailures: 0,
    },
    snapshot,
  };

  for (const phase of phasesToExecute) {
    lines.push(`## Phase ${phase.phase}: ${phase.name}`);
    lines.push(``);

    const phaseExecution = await executePhase(tokens, phase, {
      dryRun,
      createSnapshot: args.createSnapshot,
      validateEach: !args.skipValidation,
      stopOnError: args.stopOnError ?? true,
    });

    execution.phases.push(phaseExecution);
    execution.summary.totalActions += phaseExecution.actions.length;
    execution.summary.completedActions += phaseExecution.actions.filter(a => a.status === "completed").length;
    execution.summary.failedActions += phaseExecution.actions.filter(a => a.status === "failed").length;

    // Report phase results
    const statusIcon = phaseExecution.status === "completed" ? "✅" : phaseExecution.status === "failed" ? "❌" : "⏸️";
    lines.push(`${statusIcon} **Status:** ${phaseExecution.status}`);
    lines.push(`**Duration:** ${phaseExecution.duration}ms`);
    lines.push(`**Actions:** ${phaseExecution.actions.length} (${phaseExecution.actions.filter(a => a.status === "completed").length} completed, ${phaseExecution.actions.filter(a => a.status === "failed").length} failed)`);
    lines.push(``);

    // Show actions
    if (phaseExecution.actions.length > 0) {
      lines.push(`### Actions`);
      lines.push(``);

      for (const action of phaseExecution.actions) {
        const actionIcon = action.status === "completed" ? "✅" : action.status === "failed" ? "❌" : "⏸️";
        lines.push(`${actionIcon} **${action.type}** (${action.targets.length} targets)`);

        // Show operations
        for (const op of action.operations.slice(0, 5)) { // Limit to first 5
          const opIcon = op.success ? "  ✓" : "  ✗";
          lines.push(`${opIcon} ${op.type}: \`${op.path}\`${op.newPath ? ` → \`${op.newPath}\`` : ""}`);
          if (op.referencesUpdated.length > 0) {
            lines.push(`     Updated ${op.referencesUpdated.length} reference(s)`);
          }
          if (op.error) {
            lines.push(`     ❌ ${op.error}`);
          }
        }

        if (action.operations.length > 5) {
          lines.push(`  ... and ${action.operations.length - 5} more`);
        }

        // Show validation
        if (action.validation.length > 0) {
          const failed = action.validation.filter(v => !v.passed);
          if (failed.length > 0) {
            lines.push(`  ⚠️ Validation: ${failed.length} check(s) failed`);
            execution.summary.validationFailures += failed.length;
          }
        }

        lines.push(``);
      }
    }

    // Count operations
    for (const action of phaseExecution.actions) {
      for (const op of action.operations) {
        if (!op.success) continue;

        switch (op.type) {
          case "create":
            execution.summary.tokensCreated++;
            break;
          case "update":
            execution.summary.tokensUpdated++;
            break;
          case "delete":
            execution.summary.tokensDeleted++;
            break;
          case "rename":
            execution.summary.tokensRenamed++;
            execution.summary.referencesUpdated += op.referencesUpdated.length;
            break;
        }
      }
    }

    // Stop if phase failed and stopOnError
    if (phaseExecution.status === "failed" && args.stopOnError) {
      lines.push(`❌ Stopping execution due to phase failure`);
      lines.push(``);
      break;
    }
  }

  // Overall status
  const allCompleted = execution.phases.every(p => p.status === "completed");
  const anyFailed = execution.phases.some(p => p.status === "failed");
  execution.status = allCompleted ? "completed" : anyFailed ? "failed" : "pending";

  lines.push(`## Summary`);
  lines.push(``);
  lines.push(`**Overall Status:** ${execution.status === "completed" ? "✅ Completed" : execution.status === "failed" ? "❌ Failed" : "⏸️ Incomplete"}`);
  lines.push(``);
  lines.push(`- Total actions: ${execution.summary.totalActions}`);
  lines.push(`- Completed: ${execution.summary.completedActions}`);
  lines.push(`- Failed: ${execution.summary.failedActions}`);
  lines.push(``);
  lines.push(`**Token Changes:**`);
  lines.push(`- Created: ${execution.summary.tokensCreated}`);
  lines.push(`- Updated: ${execution.summary.tokensUpdated}`);
  lines.push(`- Deleted: ${execution.summary.tokensDeleted}`);
  lines.push(`- Renamed: ${execution.summary.tokensRenamed}`);
  lines.push(`- References updated: ${execution.summary.referencesUpdated}`);
  lines.push(``);

  if (execution.summary.validationFailures > 0) {
    lines.push(`⚠️ **Validation failures:** ${execution.summary.validationFailures}`);
    lines.push(``);
  }

  // Post-execution validation
  if (!args.skipValidation && !dryRun) {
    lines.push(`## Post-Execution Validation`);
    lines.push(``);

    const validationReport = await validateMigration(tokens, execution);
    const reportText = generateValidationReport(validationReport);

    lines.push(reportText);
    lines.push(``);

    // If validation failed, offer rollback
    if (validationReport.status === "failed" && snapshot) {
      lines.push(`❌ Validation failed. You can rollback using snapshot: ${snapshot.id}`);
      lines.push(``);
    }
  }

  // Dry run notice
  if (dryRun) {
    lines.push(`---`);
    lines.push(``);
    lines.push(`ℹ️ **This was a DRY RUN.** No changes were applied.`);
    lines.push(`To execute for real, set \`dryRun: false\`.`);
    lines.push(``);
  }

  return {
    formatted: lines.join("\n"),
    json: {
      execution,
      scenario,
      phases: phasesToExecute,
    },
  };
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

