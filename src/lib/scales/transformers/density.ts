/**
 * Density transformation.
 *
 * Transforms token values from one density mode to another
 * (e.g., comfortable → compact) while respecting accessibility constraints.
 */

import type { DensityTransformConfig } from "../types.js";
import { WCAG_COMPLIANCE_RULES, DESIGN_PRINCIPLES } from "../knowledge.js";

export type DensityMode = "compact" | "comfortable" | "spacious";

/**
 * Get the scale factor for a density transformation.
 *
 * @param sourceDensity - Source density mode
 * @param targetDensity - Target density mode
 * @returns Scale factor to apply
 *
 * @example
 * ```ts
 * getDensityFactor('comfortable', 'compact'); // → 0.75
 * getDensityFactor('comfortable', 'spacious'); // → 1.25
 * ```
 */
export function getDensityFactor(
  sourceDensity: DensityMode,
  targetDensity: DensityMode,
): number {
  const factors: Record<DensityMode, number> = {
    compact: 0.75,
    comfortable: 1.0,
    spacious: 1.25,
  };

  return factors[targetDensity] / factors[sourceDensity];
}

/**
 * Transform a single value with density constraints.
 *
 * @param value - Original value
 * @param factor - Density scale factor
 * @param constraints - Transformation constraints
 * @returns Transformed value
 *
 * @example
 * ```ts
 * transformValue(48, 0.75, { minTouchTarget: 44, preserveZero: true });
 * // → 44 (clamped to WCAG minimum)
 * ```
 */
export function transformValue(
  value: number,
  factor: number,
  constraints: DensityTransformConfig["constraints"] = {},
): number {
  const {
    minTouchTarget = 44, // WCAG 2.2 minimum
    preserveZero = true,
    roundTo = "integer",
  } = constraints;

  // Preserve zero values
  if (preserveZero && value === 0) {
    return 0;
  }

  // Apply factor
  let transformed = value * factor;

  // Apply minimum touch target constraint
  if (minTouchTarget && value >= minTouchTarget && transformed < minTouchTarget) {
    transformed = minTouchTarget;
  }

  // Apply rounding
  transformed = applyRounding(transformed, roundTo);

  return transformed;
}

/**
 * Transform a token map to a different density.
 *
 * @param tokens - Source tokens (e.g., { 'spacing-1': '4px', 'spacing-2': '8px' })
 * @param config - Transformation configuration
 * @returns Transformed tokens
 *
 * @example
 * ```ts
 * transformDensity(
 *   { 'spacing-sm': '8px', 'spacing-md': '16px', 'spacing-lg': '24px' },
 *   {
 *     sourceDensity: 'comfortable',
 *     targetDensity: 'compact',
 *     constraints: { minTouchTarget: 44 }
 *   }
 * );
 * // → { 'spacing-sm': '6px', 'spacing-md': '12px', 'spacing-lg': '18px' }
 * ```
 */
export function transformDensity(
  tokens: Record<string, string>,
  config: DensityTransformConfig,
): Record<string, string> {
  const {
    sourceDensity = "comfortable",
    targetDensity,
    constraints = {},
  } = config;
  const factor = getDensityFactor(
    sourceDensity as DensityMode,
    targetDensity as DensityMode,
  );

  const transformed: Record<string, string> = {};

  for (const [key, value] of Object.entries(tokens)) {
    const numeric = parseValue(value);
    if (numeric === null) {
      // Keep non-numeric values as-is
      transformed[key] = value;
      continue;
    }

    const unit = extractUnit(value);
    const newValue = transformValue(numeric, factor, constraints);
    transformed[key] = `${newValue}${unit}`;
  }

  return transformed;
}

/**
 * Generate conditional tokens for multiple density modes.
 *
 * Creates tokens with `com.mcp-ds.conditions` extension for density dimension.
 *
 * @param baseTokens - Base (comfortable) tokens
 * @param modes - Density modes to generate
 * @param constraints - Transformation constraints
 * @returns Token map with conditional values
 *
 * @example
 * ```ts
 * generateConditionalDensityTokens(
 *   { 'spacing-md': '16px' },
 *   ['compact', 'comfortable', 'spacious'],
 *   { minTouchTarget: 44 }
 * );
 * // → {
 * //   'spacing-md': {
 * //     $value: '16px',
 * //     'com.mcp-ds.conditions': {
 * //       compact: '12px',
 * //       comfortable: '16px',
 * //       spacious: '20px'
 * //     }
 * //   }
 * // }
 * ```
 */
export function generateConditionalDensityTokens(
  baseTokens: Record<string, string>,
  modes: DensityMode[] = ["compact", "comfortable", "spacious"],
  constraints: DensityTransformConfig["constraints"] = {},
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, baseValue] of Object.entries(baseTokens)) {
    const numeric = parseValue(baseValue);
    if (numeric === null) {
      result[key] = baseValue;
      continue;
    }

    const unit = extractUnit(baseValue);
    const conditions: Record<string, string> = {};

    for (const mode of modes) {
      const factor = getDensityFactor("comfortable", mode);
      const transformed = transformValue(numeric, factor, constraints);
      conditions[mode] = `${transformed}${unit}`;
    }

    result[key] = {
      $value: baseValue, // Default (comfortable)
      "com.mcp-ds.conditions": conditions,
    };
  }

  return result;
}

/**
 * Validate a density transformation against accessibility rules.
 *
 * @param original - Original token values
 * @param transformed - Transformed token values
 * @param standard - Compliance standard ('wcag-2.2', 'material-design', 'ios-hig')
 * @returns Validation result
 *
 * @example
 * ```ts
 * validateDensityTransform(
 *   { 'button-height': '48px' },
 *   { 'button-height': '36px' },
 *   'wcag-2.2'
 * );
 * // → { valid: false, violations: [{ token: 'button-height', ... }] }
 * ```
 */
export function validateDensityTransform(
  original: Record<string, string>,
  transformed: Record<string, string>,
  standard: "wcag-2.2" | "material-design" | "ios-hig" = "wcag-2.2",
): {
  valid: boolean;
  violations: Array<{
    token: string;
    value: number;
    rule: string;
    message: string;
  }>;
} {
  const violations: Array<{
    token: string;
    value: number;
    rule: string;
    message: string;
  }> = [];

  // Get compliance rules for standard
  const touchTargetRule = WCAG_COMPLIANCE_RULES.find(
    (r) => r.id === "touch-target-size",
  );
  const material8dpRule = WCAG_COMPLIANCE_RULES.find(
    (r) => r.id === "material-8dp-grid",
  );
  const ios8ptRule = WCAG_COMPLIANCE_RULES.find(
    (r) => r.id === "ios-8pt-grid",
  );

  const rules =
    standard === "wcag-2.2"
      ? touchTargetRule
        ? [touchTargetRule]
        : []
      : standard === "material-design"
        ? [touchTargetRule, material8dpRule].filter(Boolean)
        : [touchTargetRule, ios8ptRule].filter(Boolean);

  for (const [key, value] of Object.entries(transformed)) {
    const numeric = parseValue(value);
    if (numeric === null) continue;

    // Check if it's a touch target (heuristic: contains 'button', 'touch', 'tap', etc.)
    const isTouchTarget = /button|touch|tap|click|interactive/i.test(key);

    for (const rule of rules) {
      if (!rule) continue; // Skip if rule is undefined
      
      const violation = rule.validate(numeric, { path: key });
      if (violation && (rule.id === "touch-target-size" ? isTouchTarget : true)) {
        violations.push({
          token: key,
          value: numeric,
          rule: rule.id,
          message: violation.message,
        });
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Suggest optimal density factors based on use case.
 *
 * @param useCase - Use case descriptor
 * @returns Recommended density factors
 */
export function suggestDensityFactors(useCase: string): {
  compact: number;
  comfortable: number;
  spacious: number;
  rationale: string;
} {
  const normalized = useCase.toLowerCase();

  // Financial/data-dense interfaces
  if (normalized.includes("financial") || normalized.includes("data")) {
    return {
      compact: 0.8,
      comfortable: 1.0,
      spacious: 1.15,
      rationale:
        "Financial UI needs more compact spacing for information density, but limited range for safety",
    };
  }

  // Touch-first interfaces
  if (normalized.includes("mobile") || normalized.includes("touch")) {
    return {
      compact: 0.85,
      comfortable: 1.0,
      spacious: 1.3,
      rationale:
        "Touch interfaces need larger minimum targets, wider spacious range for accessibility",
    };
  }

  // Reading/content interfaces
  if (normalized.includes("reading") || normalized.includes("content")) {
    return {
      compact: 0.9,
      comfortable: 1.0,
      spacious: 1.2,
      rationale:
        "Content interfaces benefit from subtle density variations to maintain readability",
    };
  }

  // Default
  return {
    compact: 0.75,
    comfortable: 1.0,
    spacious: 1.25,
    rationale: "Standard density range suitable for general-purpose interfaces",
  };
}

// Helper functions

function parseValue(value: string): number | null {
  const cleaned = value.replace(/px|rem|em|pt|%/gi, "").trim();
  const num = parseFloat(cleaned);

  if (isNaN(num)) return null;

  // Convert rem/em to px
  if (value.includes("rem") || value.includes("em")) {
    return num * 16;
  }

  return num;
}

function extractUnit(value: string): string {
  const match = value.match(/px|rem|em|pt|%/i);
  return match ? match[0] : "px";
}

function applyRounding(
  value: number,
  strategy: "integer" | "half" | "quarter" | "none",
): number {
  switch (strategy) {
    case "integer":
      return Math.round(value);
    case "half":
      return Math.round(value * 2) / 2;
    case "quarter":
      return Math.round(value * 4) / 4;
    case "none":
      return value;
  }
}
