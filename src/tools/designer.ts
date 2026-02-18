/**
 * Designer-centric MCP tools
 *
 * Three tools that help designers go from idea to design-system-backed implementation:
 *
 *   - plan_flow:      "Blank canvas syndrome" solver — describe a problem,
 *                     get screens, components, and token requirements.
 *
 *   - audit_design:   Handoff audit — describe a partial design, get gap analysis,
 *                     missing tokens, accessibility issues, and corrections.
 *
 *   - analyze_ui:     Screenshot-to-system — describe UI elements and colors,
 *                     get matched components, closest tokens, and coverage analysis.
 */

import type { McpDsConfig } from "../lib/types.js";
import { loadAllTokens, resolveReferences } from "../lib/parser.js";
import {
  matchDescription,
  resolveTokenSurface,
  analyzeGaps,
  findClosestTokenColors,
  type GapAnalysis,
  type ColorMatch,
} from "../lib/designer/index.js";
import {
  getComponentSurface,
  findComponentContext,
} from "../lib/semantics/ontology.js";
import {
  scaffoldSemanticTokens,
  type ScaffoldOptions,
} from "../lib/semantics/scaffold.js";
import {
  auditSemanticTokens,
  type SemanticAuditResult,
} from "../lib/semantics/audit.js";
import { normalizeHex } from "../lib/color/index.js";

// ---------------------------------------------------------------------------
// plan_flow — "Blank Canvas Syndrome" solver
// ---------------------------------------------------------------------------

export interface PlanFlowResult {
  formatted: string;
  json: {
    patterns: Array<{
      id: string;
      name: string;
      category: string;
      score: number;
      matchedKeywords: string[];
    }>;
    components: string[];
    uxContexts: string[];
    intents: string[];
    tokenSurface: {
      totalSlots: number;
      byContext: Array<{
        uxContext: string;
        components: string[];
        propertyClasses: string[];
        intents: string[];
        states: string[];
        tokenCount: number;
      }>;
    };
    scaffoldPreview?: {
      totalTokens: number;
      breakdown: Array<{
        uxContext: string;
        tokenCount: number;
      }>;
    };
  };
}

export async function planFlowTool(
  args: {
    description: string;
    maxPatterns?: number;
    includeScaffold?: boolean;
  },
  projectRoot: string,
  config: McpDsConfig,
): Promise<PlanFlowResult> {
  const { description, maxPatterns = 5, includeScaffold } = args;

  // 1. Match description to UI patterns
  const match = matchDescription(description, maxPatterns);

  // 2. Resolve token surface for identified components
  const surface = resolveTokenSurface(match.components);

  // 3. Optionally scaffold a preview
  let scaffoldPreview:
    | { totalTokens: number; breakdown: Array<{ uxContext: string; tokenCount: number }> }
    | undefined;

  if (includeScaffold && match.components.length > 0) {
    const opts: ScaffoldOptions = {
      components: match.components,
      includeModifiers: false,
      includeGlobalTokens: true,
      valueStrategy: "reference",
      outputFormat: "flat",
    };
    const result = scaffoldSemanticTokens(opts);
    scaffoldPreview = {
      totalTokens: result.summary.totalTokens,
      breakdown: result.summary.breakdown.map((b) => ({
        uxContext: b.uxContext,
        tokenCount: b.tokenCount,
      })),
    };
  }

  // 4. Format output
  const lines: string[] = [];
  lines.push("# Design Flow Plan");
  lines.push("");
  lines.push(`> _"${description}"_`);
  lines.push("");

  // Confidence indicator
  if (match.confidence > 0.5) {
    lines.push(`Match confidence: **high** (${Math.round(match.confidence * 100)}%)`);
  } else if (match.confidence > 0.2) {
    lines.push(`Match confidence: **medium** (${Math.round(match.confidence * 100)}%)`);
  } else if (match.confidence > 0) {
    lines.push(`Match confidence: **low** (${Math.round(match.confidence * 100)}%)`);
  } else {
    lines.push("⚠️ No strong pattern matches found. Consider providing more specific details.");
  }
  lines.push("");

  // Matched patterns
  if (match.patterns.length > 0) {
    lines.push("## Suggested Screen Patterns");
    lines.push("");
    for (const pm of match.patterns) {
      const p = pm.pattern;
      lines.push(`### ${p.name}`);
      lines.push(`_${p.description}_`);
      lines.push("");
      lines.push(`- **Category:** ${p.category}`);
      lines.push(`- **Match score:** ${Math.round(pm.score * 100)}%`);
      if (pm.matchedKeywords.length > 0) {
        lines.push(`- **Matched on:** ${pm.matchedKeywords.join(", ")}`);
      }
      if (p.screenExamples && p.screenExamples.length > 0) {
        lines.push(`- **Typical screen names:** ${p.screenExamples.join(", ")}`);
      }
      lines.push(`- **Components:** ${p.components.join(", ")}`);
      lines.push(`- **UX contexts:** ${p.uxContexts.join(", ")}`);
      lines.push(`- **Intents needed:** ${p.intents.join(", ")}`);
      if (p.additionalTokenHints && p.additionalTokenHints.length > 0) {
        lines.push("- **Token hints:**");
        for (const hint of p.additionalTokenHints) {
          lines.push(`  - ${hint}`);
        }
      }
      lines.push("");
    }
  }

  // Combined component inventory
  lines.push("## Component Inventory");
  lines.push("");
  lines.push(`**${match.components.length}** components identified:`);
  lines.push("");

  for (const comp of match.components) {
    const surf = getComponentSurface(comp);
    const ctx = findComponentContext(comp);
    if (surf) {
      lines.push(
        `- **${comp}** (${ctx?.label ?? "unknown"}) → ` +
          `${surf.propertyClasses.join(", ")} | ` +
          `intents: ${surf.intents.join(", ")} | ` +
          `states: ${surf.states.join(", ")}`,
      );
    } else {
      lines.push(`- **${comp}** _(not in registry — will use generic surface)_`);
    }
  }
  lines.push("");

  // Token surface summary
  lines.push("## Token Surface Required");
  lines.push("");
  lines.push(`**${surface.totalSlots}** token slots across **${surface.byContext.length}** UX context(s):`);
  lines.push("");

  for (const ctx of surface.byContext) {
    lines.push(`### ${ctx.uxContext} (${ctx.components.join(", ")})`);
    lines.push(`- Property classes: ${ctx.propertyClasses.join(", ")}`);
    lines.push(`- Intents: ${ctx.intents.join(", ")}`);
    lines.push(`- States: ${ctx.states.join(", ")}`);
    lines.push(`- Token count: **${ctx.tokenCount}**`);
    if (ctx.extraSlots.length > 0) {
      lines.push(`- Extra slots: ${ctx.extraSlots.join(", ")}`);
    }
    lines.push("");
  }

  // Scaffold preview
  if (scaffoldPreview) {
    lines.push("## Scaffold Preview");
    lines.push("");
    lines.push(`Would generate **${scaffoldPreview.totalTokens}** tokens:`);
    lines.push("");
    for (const b of scaffoldPreview.breakdown) {
      lines.push(`- **${b.uxContext}**: ${b.tokenCount} tokens`);
    }
    lines.push("");
    lines.push(
      "_Use `scaffold_semantics` with components `" +
        match.components.join(", ") +
        "` to generate the full token set._",
    );
    lines.push("");
  }

  // Next steps
  lines.push("## Suggested Next Steps");
  lines.push("");
  lines.push(
    `1. **Scaffold tokens**: Use \`scaffold_semantics\` with components: \`${match.components.join(", ")}\``,
  );
  lines.push(
    "2. **Generate palette**: Use `generate_palette` to create color scales for the intents above",
  );
  lines.push(
    "3. **Map to semantics**: Use `map_palette_to_semantics` to assign palette colors to semantic slots",
  );
  lines.push(
    "4. **Audit**: Use `audit_semantics` to verify coverage and naming compliance",
  );
  lines.push(
    "5. **Check contrast**: Use `check_contrast` to verify accessibility",
  );

  return {
    formatted: lines.join("\n"),
    json: {
      patterns: match.patterns.map((m) => ({
        id: m.pattern.id,
        name: m.pattern.name,
        category: m.pattern.category,
        score: m.score,
        matchedKeywords: m.matchedKeywords,
      })),
      components: match.components,
      uxContexts: match.uxContexts,
      intents: match.intents,
      tokenSurface: {
        totalSlots: surface.totalSlots,
        byContext: surface.byContext.map((c) => ({
          uxContext: c.uxContext,
          components: c.components,
          propertyClasses: c.propertyClasses,
          intents: c.intents,
          states: c.states,
          tokenCount: c.tokenCount,
        })),
      },
      scaffoldPreview,
    },
  };
}

// ---------------------------------------------------------------------------
// audit_design — Handoff Audit
// ---------------------------------------------------------------------------

export interface AuditDesignResult {
  formatted: string;
  json: {
    components: string[];
    gapAnalysis: {
      coveragePercent: number;
      missingCount: number;
      extraCount: number;
    };
    auditResult?: {
      healthScore: number;
      complianceRate: number;
      wcagFailures: number;
      migrationCount: number;
    };
    issues: Array<{
      severity: "error" | "warning" | "info";
      category: string;
      message: string;
      suggestion?: string;
    }>;
  };
}

export async function auditDesignTool(
  args: {
    components: string;
    description?: string;
    checkAccessibility?: boolean;
  },
  projectRoot: string,
  config: McpDsConfig,
): Promise<AuditDesignResult> {
  const componentList = args.components
    .split(/[,\s]+/)
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);

  // 1. Load existing tokens
  const tokenMap = await loadAllTokens(projectRoot, config);
  resolveReferences(tokenMap);

  // 2. Resolve expected token surface
  const surface = resolveTokenSurface(componentList);

  // 3. Gap analysis: compare expected vs existing
  const gaps = analyzeGaps(tokenMap, componentList);

  // 4. Run semantic audit on existing tokens
  const auditResult = auditSemanticTokens(tokenMap);

  // 5. Collect all issues
  const issues: AuditDesignResult["json"]["issues"] = [];

  // Missing tokens → errors
  for (const slot of gaps.missing) {
    issues.push({
      severity: "error",
      category: "missing-token",
      message: `Missing token: \`${slot.path}\` (${slot.propertyClass} for ${slot.uxContext}.${slot.intent}.${slot.state})`,
      suggestion: `Use \`scaffold_semantics\` with component(s) that require this token.`,
    });
  }

  // Scoping violations from audit
  for (const v of auditResult.scoping.violations) {
    issues.push({
      severity: v.severity as "error" | "warning" | "info",
      category: `scoping:${v.ruleId}`,
      message: v.message,
      suggestion: v.suggestion,
    });
  }

  // Migration suggestions
  for (const m of auditResult.migration.slice(0, 10)) {
    issues.push({
      severity: "warning",
      category: "naming",
      message: `\`${m.originalPath}\` should be \`${m.suggestedPath}\` (${Math.round(m.confidence * 100)}% confidence)`,
      suggestion: m.reason,
    });
  }

  // Accessibility issues
  if (args.checkAccessibility !== false) {
    const { accessibility } = auditResult;
    if (accessibility.wcagFailures > 0) {
      issues.push({
        severity: "error",
        category: "accessibility",
        message: `**${accessibility.wcagFailures}** WCAG 2.1 contrast failure(s) detected.`,
        suggestion: "Use `check_contrast` to see failing pairs and fix them.",
      });
    }
    if (accessibility.unpairedTokens.length > 0) {
      issues.push({
        severity: "warning",
        category: "accessibility",
        message: `**${accessibility.unpairedTokens.length}** token(s) without foreground/background pair.`,
        suggestion: "Every background token needs a paired text token for contrast checking.",
      });
    }
  }

  // Unknown components warning
  if (surface.unknownComponents.length > 0) {
    issues.push({
      severity: "info",
      category: "registry",
      message: `Component(s) not in built-in registry: ${surface.unknownComponents.join(", ")}. Using generic token surface.`,
      suggestion: "Generic surfaces cover background/text/border but may miss component-specific needs.",
    });
  }

  // 6. Format output
  const lines: string[] = [];
  lines.push("# Design Handoff Audit");
  lines.push("");
  if (args.description) {
    lines.push(`> _${args.description}_`);
    lines.push("");
  }
  lines.push(`Components: **${componentList.join(", ")}**`);
  lines.push("");

  // Score summary
  const score = computeDesignScore(gaps, auditResult, issues);
  lines.push(`## Overall Score: ${score}/100`);
  lines.push("");
  lines.push(scoreToEmoji(score));
  lines.push("");

  // Gap analysis
  lines.push("## Token Coverage");
  lines.push("");
  lines.push(gaps.summary);
  lines.push("");

  if (gaps.missing.length > 0) {
    lines.push("### Missing Tokens");
    lines.push("");

    // Group by context
    const byCtx = new Map<string, typeof gaps.missing>();
    for (const slot of gaps.missing) {
      const arr = byCtx.get(slot.uxContext) ?? [];
      arr.push(slot);
      byCtx.set(slot.uxContext, arr);
    }

    for (const [ctx, slots] of byCtx) {
      lines.push(`**${ctx}** (${slots.length} missing):`);
      for (const slot of slots.slice(0, 15)) {
        lines.push(`- \`${slot.path}\``);
      }
      if (slots.length > 15) {
        lines.push(`  ... and ${slots.length - 15} more`);
      }
      lines.push("");
    }
  }

  // Audit findings
  if (auditResult.healthScore < 100) {
    lines.push("## Semantic Audit Findings");
    lines.push("");
    lines.push(`Health score: **${auditResult.healthScore}/100**`);
    lines.push(`Naming compliance: **${Math.round(auditResult.structure.complianceRate * 100)}%**`);
    lines.push("");

    if (auditResult.migration.length > 0) {
      lines.push("### Suggested Renames");
      lines.push("");
      for (const m of auditResult.migration.slice(0, 10)) {
        lines.push(
          `- \`${m.originalPath}\` → \`${m.suggestedPath}\` (${Math.round(m.confidence * 100)}%)`,
        );
      }
      if (auditResult.migration.length > 10) {
        lines.push(`  ... and ${auditResult.migration.length - 10} more`);
      }
      lines.push("");
    }
  }

  // Accessibility
  if (args.checkAccessibility !== false) {
    const { accessibility } = auditResult;
    lines.push("## Accessibility");
    lines.push("");
    lines.push(`Contrast pairs found: **${accessibility.pairs.length}**`);
    lines.push(`Computable: **${accessibility.computablePairs}**`);
    lines.push(`WCAG failures: **${accessibility.wcagFailures}**`);
    lines.push(`Contrast score: **${Math.round(accessibility.contrastScore * 100)}%**`);
    lines.push("");

    if (accessibility.wcagFailures > 0) {
      lines.push("⚠️ Run `check_contrast` for detailed failure analysis.");
      lines.push("");
    }
  }

  // Issues summary
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const infos = issues.filter((i) => i.severity === "info");

  lines.push("## Issue Summary");
  lines.push("");
  lines.push(`- ❌ **${errors.length}** error(s)`);
  lines.push(`- ⚠️ **${warnings.length}** warning(s)`);
  lines.push(`- ℹ️ **${infos.length}** info`);
  lines.push("");

  // Suggested fixes
  lines.push("## Suggested Actions");
  lines.push("");
  let step = 1;
  if (gaps.missing.length > 0) {
    lines.push(
      `${step++}. **Fill gaps**: Use \`scaffold_semantics\` with \`${componentList.join(", ")}\` to generate missing tokens`,
    );
  }
  if (auditResult.migration.length > 0) {
    lines.push(
      `${step++}. **Fix naming**: Rename ${auditResult.migration.length} token(s) for ontology compliance`,
    );
  }
  if (auditResult.accessibility.wcagFailures > 0) {
    lines.push(
      `${step++}. **Fix contrast**: Use \`check_contrast\` to identify and fix failing color pairs`,
    );
  }

  return {
    formatted: lines.join("\n"),
    json: {
      components: componentList,
      gapAnalysis: {
        coveragePercent: gaps.coveragePercent,
        missingCount: gaps.missing.length,
        extraCount: gaps.extras.length,
      },
      auditResult: {
        healthScore: auditResult.healthScore,
        complianceRate: auditResult.structure.complianceRate,
        wcagFailures: auditResult.accessibility.wcagFailures,
        migrationCount: auditResult.migration.length,
      },
      issues,
    },
  };
}

// ---------------------------------------------------------------------------
// analyze_ui — Screenshot-to-System
// ---------------------------------------------------------------------------

export interface AnalyzeUiResult {
  formatted: string;
  json: {
    identifiedComponents: Array<{
      name: string;
      inRegistry: boolean;
      uxContext: string;
    }>;
    colorMatches: Array<{
      inputColor: string;
      matches: ColorMatch[];
    }>;
    tokenSurface: {
      totalSlots: number;
      contexts: string[];
    };
    coverage: {
      matchedColors: number;
      totalColors: number;
      componentsCovered: number;
      totalComponents: number;
    };
  };
}

export async function analyzeUiTool(
  args: {
    components: string;
    colors?: string;
    description?: string;
  },
  projectRoot: string,
  config: McpDsConfig,
): Promise<AnalyzeUiResult> {
  const componentList = args.components
    .split(/[,\s]+/)
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);

  const colorList = args.colors
    ? args.colors
        .split(/[,\s]+/)
        .map((c) => c.trim())
        .filter(Boolean)
    : [];

  // 1. Load tokens
  const tokenMap = await loadAllTokens(projectRoot, config);
  resolveReferences(tokenMap);

  // 2. Identify components
  const identified = componentList.map((name) => {
    const surface = getComponentSurface(name);
    const ctx = findComponentContext(name);
    return {
      name,
      inRegistry: !!surface,
      uxContext: ctx?.id ?? "unknown",
    };
  });

  // 3. Match colors
  const colorMatches: AnalyzeUiResult["json"]["colorMatches"] = [];
  for (const color of colorList) {
    const hex = normalizeHex(color);
    if (!hex) {
      colorMatches.push({
        inputColor: color,
        matches: [],
      });
      continue;
    }
    const matches = findClosestTokenColors(hex, tokenMap, 3, 15);
    colorMatches.push({
      inputColor: hex,
      matches,
    });
  }

  // 4. Resolve token surface
  const surface = resolveTokenSurface(componentList);

  // 5. Compute coverage metrics
  const matchedColors = colorMatches.filter(
    (cm) => cm.matches.length > 0 && cm.matches[0].quality !== "distant",
  ).length;
  const componentsCovered = identified.filter((c) => c.inRegistry).length;

  // 6. Format output
  const lines: string[] = [];
  lines.push("# UI Analysis");
  lines.push("");
  if (args.description) {
    lines.push(`> _${args.description}_`);
    lines.push("");
  }

  // Component identification
  lines.push("## Identified Components");
  lines.push("");
  lines.push(
    `**${componentsCovered}/${componentList.length}** component(s) found in design system registry:`,
  );
  lines.push("");

  for (const comp of identified) {
    if (comp.inRegistry) {
      const surf = getComponentSurface(comp.name);
      lines.push(
        `- ✅ **${comp.name}** → ${comp.uxContext} context` +
          (surf
            ? ` (${surf.propertyClasses.length} property classes, ${surf.states.length} states)`
            : ""),
      );
    } else {
      lines.push(
        `- ⚠️ **${comp.name}** → not in registry (will need custom token surface)`,
      );
    }
  }
  lines.push("");

  // Color matching
  if (colorList.length > 0) {
    lines.push("## Color Matching");
    lines.push("");
    lines.push(
      `**${matchedColors}/${colorList.length}** color(s) found in token system:`,
    );
    lines.push("");

    for (const cm of colorMatches) {
      lines.push(`### ${cm.inputColor}`);
      if (cm.matches.length === 0) {
        lines.push("  _No matching tokens found._");
      } else {
        for (const m of cm.matches) {
          const icon =
            m.quality === "exact" || m.quality === "very-close"
              ? "✅"
              : m.quality === "close"
                ? "🟡"
                : m.quality === "approximate"
                  ? "🟠"
                  : "🔴";
          lines.push(
            `  ${icon} \`${m.tokenPath}\` (${m.tokenColor}) — ΔE ${m.deltaE} (${m.quality})`,
          );
        }
      }
      lines.push("");
    }
  }

  // Token surface
  lines.push("## Required Token Surface");
  lines.push("");
  lines.push(`**${surface.totalSlots}** token slots across ${surface.byContext.length} context(s):`);
  lines.push("");

  for (const ctx of surface.byContext) {
    lines.push(
      `- **${ctx.uxContext}**: ${ctx.tokenCount} tokens ` +
        `(${ctx.propertyClasses.join(", ")} × ${ctx.intents.join(", ")} × [${ctx.states.join(", ")}])`,
    );
  }
  lines.push("");

  // Unmatched elements
  const unmatchedColors = colorMatches.filter(
    (cm) => cm.matches.length === 0 || cm.matches[0].quality === "distant",
  );
  const unmatchedComponents = identified.filter((c) => !c.inRegistry);

  if (unmatchedColors.length > 0 || unmatchedComponents.length > 0) {
    lines.push("## Gaps Identified");
    lines.push("");
    if (unmatchedComponents.length > 0) {
      lines.push(
        `**Components not in system:** ${unmatchedComponents.map((c) => c.name).join(", ")}`,
      );
      lines.push("→ These need custom token surface definitions.");
      lines.push("");
    }
    if (unmatchedColors.length > 0) {
      lines.push(
        `**Colors not in system:** ${unmatchedColors.map((c) => c.inputColor).join(", ")}`,
      );
      lines.push("→ These may need to be added as core tokens or adjusted to match the palette.");
      lines.push("");
    }
  }

  // Recommendations
  lines.push("## Recommendations");
  lines.push("");
  let step = 1;
  if (unmatchedComponents.length > 0) {
    lines.push(
      `${step++}. **Register components**: Add token surfaces for ${unmatchedComponents.map((c) => c.name).join(", ")}`,
    );
  }
  if (unmatchedColors.length > 0) {
    lines.push(
      `${step++}. **Extend palette**: Add missing colors or adjust existing palette to cover ${unmatchedColors.length} unmatched color(s)`,
    );
  }
  if (componentsCovered > 0) {
    lines.push(
      `${step++}. **Scaffold tokens**: Use \`scaffold_semantics\` with \`${componentList.join(", ")}\``,
    );
  }
  lines.push(
    `${step++}. **Audit**: Run \`audit_design\` with these components to check for completeness`,
  );

  return {
    formatted: lines.join("\n"),
    json: {
      identifiedComponents: identified,
      colorMatches,
      tokenSurface: {
        totalSlots: surface.totalSlots,
        contexts: surface.byContext.map((c) => c.uxContext),
      },
      coverage: {
        matchedColors,
        totalColors: colorList.length,
        componentsCovered,
        totalComponents: componentList.length,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------

function computeDesignScore(
  gaps: GapAnalysis,
  audit: SemanticAuditResult,
  issues: AuditDesignResult["json"]["issues"],
): number {
  let score = 100;

  // Coverage penalty (major)
  score -= Math.round((1 - gaps.coveragePercent / 100) * 40);

  // Compliance penalty
  score -= Math.round((1 - audit.structure.complianceRate) * 20);

  // Error penalty
  const errorCount = issues.filter((i) => i.severity === "error").length;
  score -= Math.min(20, errorCount * 2);

  // Accessibility penalty
  score -= Math.min(20, audit.accessibility.wcagFailures * 5);

  return Math.max(0, Math.min(100, score));
}

function scoreToEmoji(score: number): string {
  if (score >= 90) return "🟢 **Excellent** — design is well-covered by the token system.";
  if (score >= 70) return "🟡 **Good** — some gaps to address before handoff.";
  if (score >= 50) return "🟠 **Needs work** — significant gaps in token coverage.";
  return "🔴 **Critical** — major gaps in token coverage and structure.";
}
