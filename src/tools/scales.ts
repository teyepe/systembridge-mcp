/**
 * Scale system MCP tools.
 *
 * Tools for mathematical scale generation, analysis, and transformation.
 */

import { z } from "zod";
import {
  detectScaleStrategy,
  auditSpacingTokens,
  auditTypographyTokens,
  auditGenericScale,
  compareAgainstPrinciple,
} from "../lib/scales/analyzers/index.js";
import {
  generateLinearScale,
  generateModularScale,
  generateExponentialScale,
  generateFibonacciScale,
  generateGoldenRatioScale,
  generateHarmonicScale,
  generateFluidScale,
  generateTailwindSpacing,
  generateHybridScale,
} from "../lib/scales/generators/index.js";
import {
  transformDensity,
  generateConditionalDensityTokens,
  validateDensityTransform,
  suggestDensityFactors,
  type DensityMode,
} from "../lib/scales/transformers/index.js";
import {
  MUSICAL_RATIOS,
  DESIGN_PRINCIPLES,
  SCALE_PRESETS,
  WCAG_COMPLIANCE_RULES,
  generateScaleLabels,
} from "../lib/scales/knowledge.js";
import type { ScaleStrategy, ScaleDimension } from "../lib/scales/types.js";

/**
 * Tool 1: Analyze existing token scales
 *
 * Detects the mathematical pattern in token values and provides
 * analysis, confidence scores, and improvement suggestions.
 */
export const analyzeScalesTool = {
  name: "analyze_scales",
  description:
    "Analyze existing design token scales (spacing, typography, etc.). " +
    "Detects mathematical patterns (linear, modular, fibonacci, etc.), " +
    "identifies outliers, and suggests improvements based on design principles.",
  inputSchema: z.object({
    tokens: z
      .record(z.string(), z.string())
      .describe("Token map to analyze (e.g., { 'spacing-0': '0px', 'spacing-1': '4px' })"),
    dimension: z
      .enum(["spacing", "typography", "fontSize", "borderRadius", "generic"])
      .default("spacing")
      .describe("Token dimension type for context-specific analysis"),
    compareAgainst: z
      .array(
        z.enum([
          "swiss-style",
          "financial-ui",
          "material-design",
          "ios-hig",
          "tailwind-css",
          "bootstrap",
          "minimalist",
        ]),
      )
      .optional()
      .describe("Design principles to compare against"),
  }),

  execute: async (args: {
    tokens: Record<string, string>;
    dimension: string;
    compareAgainst?: string[];
  }) => {
    const { tokens, dimension, compareAgainst } = args;

    // Perform audit
    let audit;
    if (dimension === "spacing") {
      audit = auditSpacingTokens(tokens);
    } else if (dimension === "typography" || dimension === "fontSize") {
      audit = auditTypographyTokens(tokens);
    } else {
      audit = auditGenericScale(tokens, dimension);
    }

    // Compare against principles if requested
    const comparisons: Array<{
      principle: string;
      compliant: boolean;
      issues: string[];
      suggestions: string[];
    }> = [];

    if (compareAgainst && compareAgainst.length > 0) {
      for (const principle of compareAgainst) {
        const result = compareAgainstPrinciple(
          audit.values,
          principle as keyof typeof DESIGN_PRINCIPLES,
        );
        comparisons.push({
          principle,
          ...result,
        });
      }
    }

    // Format response
    const response = {
      summary: {
        dimension: audit.dimension,
        tokenCount: audit.tokenCount,
        detectedStrategy: audit.analysis.detectedStrategy,
        confidence: `${(audit.analysis.confidence * 100).toFixed(0)}%`,
        outlierCount: audit.outliers.length,
      },
      analysis: {
        strategy: audit.analysis.detectedStrategy,
        confidence: audit.analysis.confidence,
        parameters: audit.analysis.parameters,
        values: audit.values,
      },
      outliers: audit.outliers.map((o) => {
        const result: any = {
          index: o.index,
          value: o.value,
        };
        if ('expected' in o && o.expected !== undefined) result.expected = o.expected;
        if ('deviation' in o && o.deviation !== undefined && o.deviation !== null && typeof o.deviation === 'number') {
          result.deviation = `${(o.deviation * 100).toFixed(1)}%`;
        }
        if ('reason' in o && o.reason) result.reason = o.reason;
        return result;
      }),
      suggestions: audit.suggestions,
      comparisons,
    };

    // Format as Markdown
    let markdown = `# Scale Analysis: ${dimension}\n\n`;
    markdown += `## Summary\n\n`;
    markdown += `- **Tokens:** ${audit.tokenCount}\n`;
    markdown += `- **Detected Strategy:** ${audit.analysis.detectedStrategy}\n`;
    markdown += `- **Confidence:** ${response.summary.confidence}\n`;
    markdown += `- **Outliers:** ${audit.outliers.length}\n\n`;

    if (audit.analysis.parameters) {
      markdown += `## Detected Parameters\n\n`;
      for (const [key, value] of Object.entries(audit.analysis.parameters)) {
        markdown += `- **${key}:** ${typeof value === "number" ? value.toFixed(3) : value}\n`;
      }
      markdown += `\n`;
    }

    if (audit.outliers.length > 0) {
      markdown += `## Outliers\n\n`;
      for (const outlier of audit.outliers) {
        const expectedText =
          'expected' in outlier && outlier.expected !== undefined
            ? ` (expected ${(outlier.expected as number).toFixed(2)})`
            : "";
        markdown += `- **Index ${outlier.index}:** ${outlier.value}${expectedText}\n`;
        if ('reason' in outlier && outlier.reason) {
          markdown += `  - ${outlier.reason as string}\n`;
        }
      }
      markdown += `\n`;
    }

    if (audit.suggestions.length > 0) {
      markdown += `## Suggestions\n\n`;
      for (const suggestion of audit.suggestions) {
        markdown += `- ${suggestion}\n`;
      }
      markdown += `\n`;
    }

    if (comparisons.length > 0) {
      markdown += `## Principle Comparisons\n\n`;
      for (const comp of comparisons) {
        markdown += `### ${comp.principle}\n\n`;
        markdown += `- **Compliant:** ${comp.compliant ? "✅ Yes" : "❌ No"}\n`;
        if (comp.issues.length > 0) {
          markdown += `\n**Issues:**\n`;
          for (const issue of comp.issues) {
            markdown += `- ${issue}\n`;
          }
        }
        if (comp.suggestions.length > 0) {
          markdown += `\n**Suggestions:**\n`;
          for (const suggestion of comp.suggestions) {
            markdown += `- ${suggestion}\n`;
          }
        }
        markdown += `\n`;
      }
    }

    return {
      content: [
        {
          type: "text" as const,
          text: markdown,
        },
      ],
      data: response,
    };
  },
};

/**
 * Tool 2: Generate a mathematical scale
 *
 * Creates a new scale from mathematical principles.
 */
export const generateScaleTool = {
  name: "generate_scale",
  description:
    "Generate a mathematical scale for design tokens. " +
    "Supports linear, modular (geometric), exponential, fibonacci, golden ratio, " +
    "harmonic, and hybrid strategies. Returns token-ready values.",
  inputSchema: z.object({
    strategy: z
      .enum([
        "linear",
        "modular",
        "exponential",
        "fibonacci",
        "golden",
        "harmonic",
        "hybrid",
      ])
      .describe("Mathematical scale strategy"),
    base: z.number().default(4).describe("Base/starting value"),
    count: z.number().default(8).describe("Number of scale steps"),
    ratio: z
      .number()
      .optional()
      .describe("Ratio for modular scales (e.g., 1.25, 1.5, 1.618)"),
    step: z.number().optional().describe("Step size for linear scales"),
    unit: z
      .enum(["px", "rem", "none"])
      .default("px")
      .describe("CSS unit for output"),
    labelPrefix: z
      .string()
      .optional()
      .describe("Prefix for generated labels (e.g., 'spacing')"),
    roundTo: z
      .enum(["integer", "half", "quarter", "none"])
      .default("integer")
      .describe("Rounding strategy"),
  }),

  execute: async (args: {
    strategy: ScaleStrategy;
    base: number;
    count: number;
    ratio?: number;
    step?: number;
    unit: string;
    labelPrefix?: string;
    roundTo: string;
  }) => {
    const { strategy, base, count, ratio, step, unit, labelPrefix, roundTo } =
      args;

    // Generate scale based on strategy
    let values: number[] = [];

    switch (strategy) {
      case "linear":
        values = generateLinearScale(base, step || 4, count);
        break;
      case "modular":
        values = generateModularScale(base, ratio || 1.25, count);
        break;
      case "exponential":
        values = generateExponentialScale(base, 2, count);
        break;
      case "fibonacci":
        values = generateFibonacciScale(base, count);
        break;
      case "golden":
        values = generateGoldenRatioScale(base, count);
        break;
      case "harmonic":
        values = generateHarmonicScale(base * count, count);
        break;
      case "hybrid":
        values = generateTailwindSpacing(unit === "rem" ? "rem" : "px");
        break;
    }

    // Apply rounding
    if (roundTo !== "none") {
      values = values.map((v) => {
        switch (roundTo) {
          case "integer":
            return Math.round(v);
          case "half":
            return Math.round(v * 2) / 2;
          case "quarter":
            return Math.round(v * 4) / 4;
          default:
            return v;
        }
      });
    }

    // Generate labels
    const dimensionForLabels: ScaleDimension =
      (labelPrefix as ScaleDimension) || "spacing";
    const labels = generateScaleLabels(values.length, dimensionForLabels);

    // Create tokens
    const tokens: Record<string, string> = {};
    const unitStr = unit === "none" ? "" : unit;

    for (let i = 0; i < values.length; i++) {
      const value = unit === "rem" ? values[i] / 16 : values[i];
      tokens[labels[i]] = `${value}${unitStr}`;
    }

    // Format response
    const response = {
      strategy,
      parameters: { base, count, ratio, step },
      values,
      tokens,
    };

    // Format as Markdown
    let markdown = `# Generated ${strategy} Scale\n\n`;
    markdown += `## Parameters\n\n`;
    markdown += `- **Strategy:** ${strategy}\n`;
    markdown += `- **Base:** ${base}${unit}\n`;
    markdown += `- **Count:** ${count}\n`;
    if (ratio) markdown += `- **Ratio:** ${ratio}\n`;
    if (step) markdown += `- **Step:** ${step}\n`;
    markdown += `\n## Generated Tokens\n\n`;
    markdown += `\`\`\`json\n${JSON.stringify(tokens, null, 2)}\n\`\`\`\n`;

    return {
      content: [
        {
          type: "text" as const,
          text: markdown,
        },
      ],
      data: response,
    };
  },
};

/**
 * Tool 3: Suggest optimal scale based on principles
 *
 * Recommends scale parameters based on design principles and use case.
 */
export const suggestScaleTool = {
  name: "suggest_scale",
  description:
    "Suggest optimal scale parameters based on design principles. " +
    "Combines Swiss style, Material Design, iOS HIG, financial UI, and other " +
    "industry standards to recommend strategy, ratio, base, and constraints.",
  inputSchema: z.object({
    principles: z
      .array(
        z.enum([
          "swiss-style",
          "financial-ui",
          "material-design",
          "ios-hig",
          "tailwind-css",
          "bootstrap",
          "minimalist",
        ]),
      )
      .describe("Design principles to apply"),
    dimension: z
      .enum(["spacing", "typography", "borderRadius", "lineHeight"])
      .describe("Token dimension"),
    useCase: z
      .string()
      .optional()
      .describe("Use case description (e.g., 'mobile app', 'financial dashboard')"),
  }),

  execute: async (args: {
    principles: string[];
    dimension: string;
    useCase?: string;
  }) => {
    const { principles, dimension, useCase } = args;

    // Collect principle data
    const principleData = principles.map(
      (p) => DESIGN_PRINCIPLES[p as keyof typeof DESIGN_PRINCIPLES],
    );

    // Determine strategy
    let strategy: ScaleStrategy = "modular";
    let ratio = 1.25;
    let base = 16;

    // Swiss + Financial = smaller ratio, compact
    if (
      principles.includes("swiss-style") &&
      principles.includes("financial-ui")
    ) {
      strategy = "modular";
      ratio = 1.125; // Swiss prefers 1.125-1.2
      base = dimension === "typography" ? 13 : 4;
    }
    // Material/iOS = 8px/8pt grid, linear spacing
    else if (
      principles.includes("material-design") ||
      principles.includes("ios-hig")
    ) {
      if (dimension === "spacing") {
        strategy = "linear";
        base = 8;
      } else {
        strategy = "modular";
        ratio = 1.25;
        base = 16;
      }
    }
    // Tailwind = hybrid linear-then-exponential
    else if (principles.includes("tailwind-css")) {
      strategy = "hybrid";
      base = 4;
    }
    // Minimalist = golden ratio, fewer steps
    else if (principles.includes("minimalist")) {
      strategy = "golden";
      ratio = 1.618;
      base = 16;
    }

    // Adjust for use case
    if (useCase) {
      const densityFactors = suggestDensityFactors(useCase);
      // Use rationale in suggestion
    }

    // Generate example scale
    let exampleValues: number[] = [];
    if (strategy === "linear") {
      exampleValues = generateLinearScale(base, 8, 8);
    } else if (strategy === "modular") {
      exampleValues = generateModularScale(base, ratio, 6);
    } else if (strategy === "golden") {
      exampleValues = generateGoldenRatioScale(base, 6);
    } else if (strategy === "hybrid") {
      exampleValues = generateTailwindSpacing("px");
    }

    const response = {
      recommendation: {
        strategy,
        base,
        ratio: strategy === "modular" || strategy === "golden" ? ratio : undefined,
        rationale: `Based on ${principles.join(", ")} principles for ${dimension}`,
      },
      exampleScale: exampleValues.slice(0, 8),
      principles: principleData,
    };

    // Format as Markdown
    let markdown = `# Scale Suggestion: ${dimension}\n\n`;
    markdown += `## Recommended Parameters\n\n`;
    markdown += `- **Strategy:** ${strategy}\n`;
    markdown += `- **Base:** ${base}${dimension === "typography" ? "px" : "px"}\n`;
    if (ratio) markdown += `- **Ratio:** ${ratio}\n`;
    markdown += `\n**Rationale:** ${response.recommendation.rationale}\n\n`;

    markdown += `## Example Scale\n\n`;
    markdown += `\`\`\`\n${exampleValues.slice(0, 8).map((v) => v.toFixed(2)).join(", ")}\n\`\`\`\n\n`;

    markdown += `## Applied Principles\n\n`;
    for (const p of principleData) {
      markdown += `### ${p.name}\n\n`;
      markdown += `${p.description}\n\n`;
      if ("recommendedRatios" in p && p.recommendedRatios) {
        markdown += `- **Recommended Ratios:** ${p.recommendedRatios.join("-")}\n`;
      }
      if ("baseUnit" in p && p.baseUnit) {
        markdown += `- **Base Unit:** ${p.baseUnit}px\n`;
      }
      markdown += `\n`;
    }

    return {
      content: [
        {
          type: "text" as const,
          text: markdown,
        },
      ],
      data: response,
    };
  },
};

/**
 * Tool 4: Derive density mode (compact/spacious)
 *
 * Algorithmically transforms tokens to a different density mode.
 */
export const deriveDensityModeTool = {
  name: "derive_density_mode",
  description:
    "Derive a new density mode (compact/spacious) from existing tokens. " +
    "Applies scale factors while respecting WCAG accessibility constraints " +
    "(44px minimum touch targets). Outputs conditional tokens.",
  inputSchema: z.object({
    sourceTokens: z
      .record(z.string(), z.string())
      .describe("Source tokens (base/comfortable density)"),
    sourceDensity: z
      .enum(["compact", "comfortable", "spacious"])
      .default("comfortable")
      .describe("Source density mode"),
    targetDensity: z
      .enum(["compact", "spacious"])
      .describe("Target density mode to derive"),
    minTouchTarget: z
      .number()
      .default(44)
      .describe("Minimum touch target size (WCAG 2.2: 44px)"),
    roundTo: z
      .enum(["integer", "half", "quarter", "none"])
      .default("integer")
      .describe("Rounding strategy"),
    generateConditional: z
      .boolean()
      .default(true)
      .describe("Generate tokens with com.mcp-ds.conditions extension"),
  }),

  execute: async (args: {
    sourceTokens: Record<string, string>;
    sourceDensity: DensityMode;
    targetDensity: DensityMode;
    minTouchTarget: number;
    roundTo: string;
    generateConditional: boolean;
  }) => {
    const {
      sourceTokens,
      sourceDensity,
      targetDensity,
      minTouchTarget,
      roundTo,
      generateConditional,
    } = args;

    // Transform density
    const transformed = transformDensity(sourceTokens, {
      sourceDensity,
      targetDensity: targetDensity as "compact" | "spacious",
      constraints: {
        minTouchTarget,
        preserveZero: true,
        roundTo: roundTo as any,
      },
    });

    // Validate against WCAG
    const validation = validateDensityTransform(
      sourceTokens,
      transformed,
      "wcag-2.2",
    );

    // Generate conditional tokens if requested
    let conditionalTokens: Record<string, any> = {};
    if (generateConditional) {
      conditionalTokens = generateConditionalDensityTokens(
        sourceDensity === "comfortable" ? sourceTokens : transformed,
        ["compact", "comfortable", "spacious"],
        { minTouchTarget, roundTo: roundTo as any },
      );
    }

    const response = {
      transformation: {
        from: sourceDensity,
        to: targetDensity,
        tokenCount: Object.keys(sourceTokens).length,
      },
      transformed: transformed,
      validation: {
        valid: validation.valid,
        violationCount: validation.violations.length,
        violations: validation.violations,
      },
      conditionalTokens: generateConditional ? conditionalTokens : undefined,
    };

    // Format as Markdown
    let markdown = `# Density Transformation: ${sourceDensity} → ${targetDensity}\n\n`;
    markdown += `## Summary\n\n`;
    markdown += `- **Tokens Transformed:** ${Object.keys(sourceTokens).length}\n`;
    markdown += `- **WCAG Compliant:** ${validation.valid ? "✅ Yes" : "❌ No"}\n`;
    markdown += `- **Violations:** ${validation.violations.length}\n\n`;

    if (validation.violations.length > 0) {
      markdown += `## Accessibility Violations\n\n`;
      for (const v of validation.violations) {
        markdown += `- **${v.token}:** ${v.value}px (${v.message})\n`;
      }
      markdown += `\n`;
    }

    markdown += `## Transformed Tokens\n\n`;
    markdown += `\`\`\`json\n${JSON.stringify(transformed, null, 2)}\n\`\`\`\n`;

    if (generateConditional) {
      markdown += `\n## Conditional Tokens (with com.mcp-ds.conditions)\n\n`;
      markdown += `\`\`\`json\n${JSON.stringify(conditionalTokens, null, 2)}\n\`\`\`\n`;
    }

    return {
      content: [
        {
          type: "text" as const,
          text: markdown,
        },
      ],
      data: response,
    };
  },
};

/**
 * Tool 5: Audit scale compliance
 *
 * Check tokens against WCAG, Material Design, iOS HIG standards.
 */
export const auditScaleComplianceTool = {
  name: "audit_scale_compliance",
  description:
    "Audit design token scales against accessibility and platform standards. " +
    "Checks WCAG 2.2 (44px touch targets, 1.5 line height), Material Design " +
    "(8dp grid), and iOS HIG (8pt grid) compliance.",
  inputSchema: z.object({
    tokens: z.record(z.string(), z.string()).describe("Tokens to audit"),
    standard: z
      .enum(["wcag-2.2", "material-design", "ios-hig", "all"])
      .default("wcag-2.2")
      .describe("Compliance standard to check"),
    dimension: z
      .string()
      .optional()
      .describe("Token dimension hint (e.g., 'spacing', 'button')"),
  }),

  execute: async (args: {
    tokens: Record<string, string>;
    standard: string;
    dimension?: string;
  }) => {
    const { tokens, standard, dimension } = args;

    // Extract numeric values
    const values: Array<{ token: string; value: number }> = [];
    for (const [key, val] of Object.entries(tokens)) {
      const num = parseFloat(val.replace(/px|rem|em|pt|%/gi, ""));
      if (isFinite(num)) {
        // Convert rem/em to px
        const pxValue = val.includes("rem") || val.includes("em") ? num * 16 : num;
        values.push({ token: key, value: pxValue });
      }
    }

    // Check compliance
    const violations: Array<{
      token: string;
      value: number;
      rule: string;
      severity: string;
      message: string;
    }> = [];

    // Get rules for validation
    const touchRule = WCAG_COMPLIANCE_RULES.find((r) => r.id === "touch-target-size");
    const gridRule = WCAG_COMPLIANCE_RULES.find((r) => r.id === "material-8dp-grid");
    const iosGridRule = WCAG_COMPLIANCE_RULES.find((r) => r.id === "ios-8pt-grid");
    const lineRule = WCAG_COMPLIANCE_RULES.find((r) => r.id === "line-height-minimum");

    const standards = standard === "all" 
      ? ["wcag-2.2", "material-design", "ios-hig"]
      : [standard];

    for (const std of standards) {
      for (const { token, value } of values) {
        if (std === "wcag-2.2" || std === "material-design" || std === "ios-hig") {
          // Check touch target (heuristic: contains button/touch/tap)
          const isTouchTarget = /button|touch|tap|click|interactive/i.test(token);
          if (isTouchTarget && touchRule) {
            const violation = touchRule.validate(value, { path: token });
            if (violation) {
              violations.push({
                token,
                value,
                rule: touchRule.id,
                severity: touchRule.severity,
                message: violation.message,
              });
            }
          }

          // Check grid alignment
          if (std === "material-design" && gridRule) {
            const violation = gridRule.validate(value, { path: token });
            if (violation && value > 0) {
              violations.push({
                token,
                value,
                rule: gridRule.id,
                severity: gridRule.severity,
                message: violation.message,
              });
            }
          }

          if (std === "ios-hig" && iosGridRule) {
            const violation = iosGridRule.validate(value, { path: token });
            if (violation && value > 0) {
              violations.push({
                token,
                value,
                rule: iosGridRule.id,
                severity: iosGridRule.severity,
                message: violation.message,
              });
            }
          }

          // Check line height (heuristic: contains lineHeight)
          if (/lineHeight/i.test(token) && lineRule) {
            const violation = lineRule.validate(value, { path: token });
            if (violation) {
              violations.push({
                token,
                value,
                rule: lineRule.id,
                severity: lineRule.severity,
                message: violation.message,
              });
            }
          }
        }
      }
    }

    const response = {
      compliance: {
        standard: standards,
        compliant: violations.length === 0,
        tokenCount: Object.keys(tokens).length,
        violationCount: violations.length,
      },
      violations,
    };

    // Format as Markdown
    let markdown = `# Compliance Audit: ${standards.join(", ")}\n\n`;
    markdown += `## Summary\n\n`;
    markdown += `- **Tokens Checked:** ${Object.keys(tokens).length}\n`;
    markdown += `- **Compliant:** ${violations.length === 0 ? "✅ Yes" : "❌ No"}\n`;
    markdown += `- **Violations:** ${violations.length}\n\n`;

    if (violations.length > 0) {
      markdown += `## Violations\n\n`;
      const errors = violations.filter((v) => v.severity === "error");
      const warnings = violations.filter((v) => v.severity === "warning");

      if (errors.length > 0) {
        markdown += `### Errors (${errors.length})\n\n`;
        for (const v of errors) {
          markdown += `- **${v.token}:** ${v.value}px\n`;
          markdown += `  - ${v.message}\n`;
        }
        markdown += `\n`;
      }

      if (warnings.length > 0) {
        markdown += `### Warnings (${warnings.length})\n\n`;
        for (const v of warnings) {
          markdown += `- **${v.token}:** ${v.value}px\n`;
          markdown += `  - ${v.message}\n`;
        }
        markdown += `\n`;
      }
    } else {
      markdown += `✅ All tokens pass ${standards.join(", ")} compliance checks.\n`;
    }

    return {
      content: [
        {
          type: "text" as const,
          text: markdown,
        },
      ],
      data: response,
    };
  },
};

/**
 * Tool 6: Generate fluid/responsive scale
 *
 * Creates CSS clamp() values for viewport-responsive tokens.
 */
export const generateFluidScaleTool = {
  name: "generate_fluid_scale",
  description:
    "Generate fluid/responsive scales using CSS clamp(). " +
    "Creates viewport-aware tokens that scale between min/max sizes. " +
    "Based on Utopia fluid typography methodology.",
  inputSchema: z.object({
    minSize: z
      .number()
      .describe("Minimum size (at minViewport)"),
    maxSize: z
      .number()
      .describe("Maximum size (at maxViewport)"),
    minViewport: z
      .number()
      .default(320)
      .describe("Minimum viewport width (px)"),
    maxViewport: z
      .number()
      .default(1920)
      .describe("Maximum viewport width (px)"),
    ratio: z
      .number()
      .optional()
      .describe("Modular ratio for multi-step scales (e.g., 1.25)"),
    steps: z
      .number()
      .default(6)
      .describe("Number of scale steps"),
    unit: z
      .enum(["px", "rem"])
      .default("rem")
      .describe("CSS unit"),
    labelPrefix: z
      .string()
      .optional()
      .describe("Label prefix (e.g., 'fluid-space')"),
  }),

  execute: async (args: {
    minSize: number;
    maxSize: number;
    minViewport: number;
    maxViewport: number;
    ratio?: number;
    steps: number;
    unit: string;
    labelPrefix?: string;
  }) => {
    const {
      minSize,
      maxSize,
      minViewport,
      maxViewport,
      ratio,
      steps,
      unit,
      labelPrefix,
    } = args;

    // Generate fluid scale
    let fluidValues: string[];
    if (ratio) {
      fluidValues = generateFluidScale({
        minBase: minSize,
        maxBase: maxSize,
        minViewport,
        maxViewport,
        ratio,
        steps,
        unit: unit as "px" | "rem",
      });
    } else {
      // Single fluid value
      const { generateFluidValue } = await import(
        "../lib/scales/generators/fluid.js"
      );
      fluidValues = [
        generateFluidValue(minSize, maxSize, minViewport, maxViewport, unit as any),
      ];
    }

    // Generate labels
    const dimensionForLabels: ScaleDimension =
      (labelPrefix as ScaleDimension) || "spacing";
    const labels = generateScaleLabels(fluidValues.length, dimensionForLabels);

    // Create tokens
    const tokens: Record<string, string> = {};
    for (let i = 0; i < fluidValues.length; i++) {
      tokens[labels[i]] = fluidValues[i];
    }

    const response = {
      configuration: {
        minSize,
        maxSize,
        minViewport,
        maxViewport,
        ratio,
        unit,
      },
      tokens,
      fluidValues,
    };

    // Format as Markdown
    let markdown = `# Fluid Scale\n\n`;
    markdown += `## Configuration\n\n`;
    markdown += `- **Min Size:** ${minSize}${unit} @ ${minViewport}px\n`;
    markdown += `- **Max Size:** ${maxSize}${unit} @ ${maxViewport}px\n`;
    if (ratio) markdown += `- **Ratio:** ${ratio}\n`;
    markdown += `- **Steps:** ${steps}\n\n`;

    markdown += `## Generated Tokens\n\n`;
    markdown += `\`\`\`json\n${JSON.stringify(tokens, null, 2)}\n\`\`\`\n\n`;

    markdown += `## Usage\n\n`;
    markdown += `These tokens use CSS \`clamp()\` for responsive scaling:\n\n`;
    markdown += `\`\`\`css\n`;
    markdown += `.element {\n`;
    markdown += `  font-size: ${fluidValues[0]};\n`;
    markdown += `}\n`;
    markdown += `\`\`\`\n`;

    return {
      content: [
        {
          type: "text" as const,
          text: markdown,
        },
      ],
      data: response,
    };
  },
};
