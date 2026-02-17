/**
 * Semantic token MCP tools
 *
 * Tools:
 *   - describe_ontology:     Explain the semantic token naming model
 *   - scaffold_semantics:    Generate semantic tokens from a component inventory
 *   - audit_semantics:       Audit an existing token set for structural issues
 *   - analyze_coverage:      Show the coverage matrix for the token set
 *   - check_contrast:        Check contrast ratios for foreground/background pairs
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
