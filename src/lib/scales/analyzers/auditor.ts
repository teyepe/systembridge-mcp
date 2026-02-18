/**
 * Token scale auditor.
 *
 * Analyzes existing design tokens and audits their scale properties
 * (spacing, typography, etc.).
 */

import type { ScaleAnalysis } from "../types.js";
import { detectScaleStrategy, suggestImprovement } from "./detector.js";
import { findOutliers } from "./outliers.js";
import { DESIGN_PRINCIPLES } from "../knowledge.js";

export interface TokenScaleAudit {
  dimension: string;
  tokenCount: number;
  values: number[];
  analysis: ScaleAnalysis;
  outliers: Array<{ index: number; value: number; reason: string }>;
  suggestions: string[];
  complianceIssues?: Array<{
    rule: string;
    severity: "error" | "warning";
    message: string;
  }>;
}

/**
 * Audit spacing tokens.
 *
 * @param tokens - Token map (e.g., { 'spacing-0': '0px', 'spacing-1': '4px' })
 * @returns Audit report
 *
 * @example
 * ```ts
 * auditSpacingTokens({
 *   'spacing-0': '0px',
 *   'spacing-1': '4px',
 *   'spacing-2': '8px',
 *   'spacing-3': '12px'
 * });
 * // → { dimension: 'spacing', values: [0,4,8,12], analysis: {...} }
 * ```
 */
export function auditSpacingTokens(
  tokens: Record<string, string>,
): TokenScaleAudit {
  const values = extractNumericValues(tokens);
  const detection = detectScaleStrategy(values);
  const outliers = findOutliers(values, detection);
  const suggestion = suggestImprovement(detection, values.length);

  const suggestions: string[] = [];

  // Check Material Design 8dp grid alignment
  const material = DESIGN_PRINCIPLES["material-design"];
  const nonAligned = values.filter((v) => v > 0 && v % 8 !== 0);
  if (nonAligned.length > 0) {
    suggestions.push(
      `${nonAligned.length} values not aligned to Material's 8dp grid: ${nonAligned.slice(0, 3).join(", ")}`,
    );
  }

  // Check iOS 8pt grid
  const ios = DESIGN_PRINCIPLES["ios-hig"];
  const nonAlignedIOS = values.filter((v) => v > 0 && v % 8 !== 0);
  if (nonAlignedIOS.length > 0 && nonAlignedIOS.length !== nonAligned.length) {
    suggestions.push(
      `Consider iOS 8pt grid for better cross-platform consistency`,
    );
  }

  // Add detection-based suggestion
  if (suggestion.reason !== "Scale is already well-formed") {
    suggestions.push(suggestion.reason);
  }

  return {
    dimension: "spacing",
    tokenCount: Object.keys(tokens).length,
    values,
    analysis: {
      detectedStrategy: detection.strategy,
      confidence: detection.confidence,
      parameters: detection.parameters,
      outliers: outliers.map((o) => ({
        index: o.index,
        value: o.value,
        expected: o.expected,
        deviation: o.deviation,
        reason: o.reason,
      })),
      suggestions: suggestions.length > 0 ? suggestions : ["Scale looks good"],
    },
    outliers,
    suggestions,
  };
}

/**
 * Audit typography (font-size) tokens.
 *
 * @param tokens - Font-size token map
 * @returns Audit report
 *
 * @example
 * ```ts
 * auditTypographyTokens({
 *   'font-size-sm': '12px',
 *   'font-size-base': '16px',
 *   'font-size-lg': '20px'
 * });
 * ```
 */
export function auditTypographyTokens(
  tokens: Record<string, string>,
): TokenScaleAudit {
  const values = extractNumericValues(tokens);
  const detection = detectScaleStrategy(values);
  const outliers = findOutliers(values, detection);
  const suggestion = suggestImprovement(detection, values.length);

  const suggestions: string[] = [];

  // Check Swiss style principles
  const swiss = DESIGN_PRINCIPLES["swiss-style"];
  if (detection.strategy === "modular" && detection.parameters?.ratio) {
    const ratio = detection.parameters.ratio;
    if (ratio < 1.125 || ratio > 1.2) {
      suggestions.push(
        `Swiss style recommends ratios between 1.125-1.2 for clarity. Current: ${ratio.toFixed(3)}`,
      );
    }
  }

  // Check scale length (Swiss style: max 7 steps)
  if (values.length > 7) {
    suggestions.push(
      `Swiss style recommends maximum 7 type sizes. Current: ${values.length}`,
    );
  }

  // Check minimum size (accessibility)
  const minSize = Math.min(...values);
  if (minSize < 12) {
    suggestions.push(
      `Minimum font size ${minSize}px is below WCAG recommended 12px for body text`,
    );
  }

  // Add detection-based suggestion
  if (suggestion.reason !== "Scale is already well-formed") {
    suggestions.push(suggestion.reason);
  }

  return {
    dimension: "typography",
    tokenCount: Object.keys(tokens).length,
    values,
    analysis: {
      detectedStrategy: detection.strategy,
      confidence: detection.confidence,
      parameters: detection.parameters,
      outliers: outliers.map((o) => ({
        index: o.index,
        value: o.value,
        expected: o.expected,
        deviation: o.deviation,
        reason: o.reason,
      })),
      suggestions: suggestions.length > 0 ? suggestions : ["Scale looks good"],
    },
    outliers,
    suggestions,
  };
}

/**
 * Audit a generic numeric token scale.
 *
 * @param tokens - Token map
 * @param dimension - Dimension name (e.g., 'border-radius')
 * @returns Audit report
 */
export function auditGenericScale(
  tokens: Record<string, string>,
  dimension: string,
): TokenScaleAudit {
  const values = extractNumericValues(tokens);
  const detection = detectScaleStrategy(values);
  const outliers = findOutliers(values, detection);
  const suggestion = suggestImprovement(detection, values.length);

  return {
    dimension,
    tokenCount: Object.keys(tokens).length,
    values,
    analysis: {
      detectedStrategy: detection.strategy,
      confidence: detection.confidence,
      parameters: detection.parameters,
      outliers: outliers.map((o) => ({
        index: o.index,
        value: o.value,
        expected: o.expected,
        deviation: o.deviation,
        reason: o.reason,
      })),
      suggestions:
        suggestion.reason !== "Scale is already well-formed"
          ? [suggestion.reason]
          : ["Scale looks good"],
    },
    outliers,
    suggestions:
      suggestion.reason !== "Scale is already well-formed"
        ? [suggestion.reason]
        : [],
  };
}

/**
 * Extract numeric values from token map.
 *
 * Handles: "16px", "1rem", "1.5", etc.
 */
function extractNumericValues(tokens: Record<string, string>): number[] {
  const values: number[] = [];

  for (const [key, value] of Object.entries(tokens)) {
    const num = parseTokenValue(value);
    if (num !== null && isFinite(num)) {
      values.push(num);
    }
  }

  // Sort ascending
  return values.sort((a, b) => a - b);
}

/**
 * Parse a token value to a number.
 *
 * @param value - Token value (e.g., "16px", "1rem", "1.5")
 * @returns Numeric value or null
 */
function parseTokenValue(value: string): number | null {
  // Remove units
  const cleaned = value.replace(/px|rem|em|pt|%/gi, "").trim();
  const num = parseFloat(cleaned);

  if (isNaN(num)) {
    return null;
  }

  // Convert rem to px (assuming 16px base)
  if (value.includes("rem")) {
    return num * 16;
  }

  // Convert em to px (assuming 16px base)
  if (value.includes("em")) {
    return num * 16;
  }

  return num;
}

/**
 * Audit all scales in a token collection.
 *
 * @param tokenGroups - Groups of tokens by dimension
 * @returns Array of audit reports
 *
 * @example
 * ```ts
 * auditAllScales({
 *   spacing: { ... },
 *   typography: { ... },
 *   borderRadius: { ... }
 * });
 * ```
 */
export function auditAllScales(
  tokenGroups: Record<string, Record<string, string>>,
): TokenScaleAudit[] {
  const reports: TokenScaleAudit[] = [];

  for (const [dimension, tokens] of Object.entries(tokenGroups)) {
    if (dimension === "spacing") {
      reports.push(auditSpacingTokens(tokens));
    } else if (dimension === "typography" || dimension === "fontSize") {
      reports.push(auditTypographyTokens(tokens));
    } else {
      reports.push(auditGenericScale(tokens, dimension));
    }
  }

  return reports;
}

/**
 * Compare a scale against a design principle.
 *
 * @param values - Scale values
 * @param principleName - Principle name from DESIGN_PRINCIPLES
 * @returns Compliance report
 */
export function compareAgainstPrinciple(
  values: number[],
  principleName: keyof typeof DESIGN_PRINCIPLES,
): {
  compliant: boolean;
  issues: string[];
  suggestions: string[];
} {
  const principle = DESIGN_PRINCIPLES[principleName];
  if (!principle) {
    return {
      compliant: false,
      issues: [`Unknown principle: ${principleName}`],
      suggestions: [],
    };
  }

  const detection = detectScaleStrategy(values);
  const issues: string[] = [];
  const suggestions: string[] = [];

  // Check recommended ratios
  if ('recommendedRatios' in principle && principle.recommendedRatios && detection.parameters?.ratio) {
    const ratio = detection.parameters.ratio;
    const [min, max] = principle.recommendedRatios;
    if (min !== undefined && max !== undefined && (ratio < min || ratio > max)) {
      issues.push(
        `Ratio ${ratio.toFixed(3)} outside recommended range [${min}, ${max}]`,
      );
      suggestions.push(
        `Consider using ratio between ${min} and ${max} for ${principleName} compliance`,
      );
    }
  }

  // Check base unit
  if ('baseUnit' in principle && principle.baseUnit && detection.parameters?.base) {
    const base = detection.parameters.base;
    if (base !== principle.baseUnit) {
      issues.push(
        `Base unit ${base}px differs from recommended ${principle.baseUnit}px`,
      );
      suggestions.push(`Consider ${principle.baseUnit}px base unit`);
    }
  }

  // Check grid alignment
  if ('minTouchTarget' in principle && principle.minTouchTarget) {
    const minTouch = principle.minTouchTarget as number;
    const tooSmall = values.filter((v) => v > 0 && v < minTouch);
    if (tooSmall.length > 0) {
      issues.push(
        `${tooSmall.length} values below minimum touch target ${minTouch}px`,
      );
    }
  }

  return {
    compliant: issues.length === 0,
    issues,
    suggestions,
  };
}
