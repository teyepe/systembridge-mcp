/**
 * Figma Token Validator
 *
 * Validates Figma variables against local token definitions, checking for
 * naming mismatches, type errors, missing mappings, and value discrepancies.
 */

import type { DesignToken } from "../types.js";
import type {
  FigmaTokenValidationOptions,
  FigmaTokenValidationResult,
  ValidationIssue,
} from "./types.js";
import {
  parseFigmaVariables,
  mapVariablesToTokens,
  correlateTokensWithFigma,
  type FigmaVariable,
  type VariableMapping,
} from "./usage-analyzer.js";
import { normalizeHex } from "../color/index.js";

// ---------------------------------------------------------------------------
// Main Validation Function
// ---------------------------------------------------------------------------

/**
 * Validate Figma variables against local token definitions.
 *
 * @param options Validation options
 * @returns  Validation result with errors, warnings, and statistics
 */
export async function validateFigmaTokens(
  options: FigmaTokenValidationOptions,
): Promise<FigmaTokenValidationResult> {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // Parse Figma variables
  const figmaVariables = parseFigmaVariables(
    options.figmaVariableDefs as Record<string, string>
  );

  // Map variables to tokens
  const mappings = mapVariablesToTokens(figmaVariables, options.localTokens);

  // Correlate and find discrepancies
  const correlation = correlateTokensWithFigma(
    options.localTokens,
    figmaVariables,
    mappings
  );

  // Extract mapped variables for easier lookup
  const mappedVariables = new Map<string, VariableMapping>();
  for (const mapping of mappings) {
    mappedVariables.set(mapping.figmaVariable, mapping);
  }

  // Validate each Figma variable
  for (const variable of figmaVariables) {
    const mapping = mappedVariables.get(variable.name);

    if (!mapping) {
      // No mapping found - variable exists in Figma but not locally
      const issue: ValidationIssue = {
        severity: options.strict ? "error" : "warning",
        category: "missing",
        figmaVariable: variable.name,
        message: `Figma variable "${variable.name}" has no local token definition`,
        suggestion: `Create a local token or add an alias mapping`,
      };

      if (options.strict) {
        errors.push(issue);
      } else {
        warnings.push(issue);
      }
      continue;
    }

    // Check mapping confidence
    if (mapping.confidence < 0.8) {
      warnings.push({
        severity: "warning",
        category: "naming",
        figmaVariable: variable.name,
        localToken: mapping.localToken,
        message: `Low confidence mapping (${(mapping.confidence * 100).toFixed(0)}%) between Figma variable and local token`,
        suggestion: `Consider renaming for clarity. Mapping strategy: ${mapping.strategy}`,
      });
    }

    // Get local token
    const localToken = options.localTokens.get(mapping.localToken);
    if (!localToken) {
      // This shouldn't happen, but handle it
      errors.push({
        severity: "error",
        category: "missing",
        figmaVariable: variable.name,
        localToken: mapping.localToken,
        message: `Mapped token "${mapping.localToken}" not found in local definitions`,
      });
      continue;
    }

    // Validate type consistency
    const figmaType = inferTypeFromValue(variable.value);
    if (localToken.type && figmaType !== localToken.type) {
      warnings.push({
        severity: "warning",
        category: "type",
        figmaVariable: variable.name,
        localToken: mapping.localToken,
        message: `Type mismatch: Figma appears to be "${figmaType}", local token is "${localToken.type}"`,
        suggestion: `Verify the token type is correct`,
      });
    }

    // Validate value consistency (for resolved values)
    if (localToken.resolvedValue !== undefined) {
      const valuesMatch = compareValues(
        variable.value,
        String(localToken.resolvedValue),
        localToken.type
      );

      if (!valuesMatch) {
        warnings.push({
          severity: "warning",
          category: "value",
          figmaVariable: variable.name,
          localToken: mapping.localToken,
          message: `Value mismatch: Figma="${variable.value}", Local="${localToken.resolvedValue}"`,
          suggestion: `Sync values or check for intentional override`,
        });
      }
    }
  }

  // Check for unused local tokens
  for (const discrepancy of correlation.namingDiscrepancies) {
    warnings.push({
      severity: "warning",
      category: "naming",
      figmaVariable: discrepancy.figmaName,
      localToken: discrepancy.localToken,
      message: `Naming discrepancy: similar names but not matched (${(discrepancy.similarity * 100).toFixed(0)}% similar)`,
      suggestion: `Action: ${discrepancy.action}`,
    });
  }

  // Add unused token warnings
  if (!options.strict) {
    for (const unusedToken of correlation.unusedInFigma) {
      warnings.push({
        severity: "warning",
        category: "unused",
        localToken: unusedToken,
        message: `Local token "${unusedToken}" is not used in Figma`,
        suggestion: `Consider if this token should be bound to Figma variables`,
      });
    }
  }

  // Calculate statistics
  const stats = {
    totalFigmaVariables: figmaVariables.length,
    totalLocalTokens: options.localTokens.size,
    matched: mappings.filter(m => m.confidence >= 0.8).length,
    mismatched: mappings.filter(m => m.confidence < 0.8).length,
    missingInFigma: correlation.unusedInFigma.length,
    missingLocally: correlation.missingLocalDefinitions.length,
  };

  // Determine overall validity
  const valid = errors.length === 0 && (options.strict ? warnings.length === 0 : true);

  return {
    valid,
    syncStatus: correlation.syncStatus,
    syncScore: correlation.syncScore,
    errors,
    warnings,
    stats,
  };
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Infer token type from Figma variable value.
 */
function inferTypeFromValue(value: string): string {
  const trimmed = value.trim();

  // Color detection
  if (
    trimmed.startsWith("#") ||
    trimmed.startsWith("rgb") ||
    trimmed.startsWith("hsl") ||
    /^[a-z]+$/i.test(trimmed)
  ) {
    return "color";
  }

  // Dimension detection
  if (/^\d+(\.\d+)?(px|rem|em|%|vh|vw|pt)$/.test(trimmed)) {
    return "dimension";
  }

  // Duration detection
  if (/^\d+(\.\d+)?(ms|s)$/.test(trimmed)) {
    return "duration";
  }

  // Number detection
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return "number";
  }

  return "string";
}

/**
 * Compare two values considering type-specific rules.
 */
function compareValues(
  figmaValue: string,
  localValue: string,
  type?: string
): boolean {
  // Normalize for comparison
  const figmaNorm = figmaValue.trim().toLowerCase();
  const localNorm = localValue.trim().toLowerCase();

  // Exact match
  if (figmaNorm === localNorm) {
    return true;
  }

  // Type-specific comparison
  if (type === "color") {
    return compareColors(figmaValue, localValue);
  }

  if (type === "dimension" || type === "number") {
    return compareDimensions(figmaValue, localValue);
  }

  return false;
}

/**
 * Compare two color values (handles hex normalization).
 */
function compareColors(color1: string, color2: string): boolean {
  try {
    const norm1 = normalizeHex(color1);
    const norm2 = normalizeHex(color2);
    if (!norm1 || !norm2) {
      return color1.trim().toLowerCase() === color2.trim().toLowerCase();
    }
    return norm1.toLowerCase() === norm2.toLowerCase();
  } catch {
    // If normalization fails, fall back to string comparison
    return color1.trim().toLowerCase() === color2.trim().toLowerCase();
  }
}

/**
 * Compare two dimension values (handles unit conversion).
 */
function compareDimensions(dim1: string, dim2: string): boolean {
  // Extract numeric value
  const num1 = parseFloat(dim1);
  const num2 = parseFloat(dim2);

  if (isNaN(num1) || isNaN(num2)) {
    return false;
  }

  // Check if units are the same
  const unit1 = dim1.replace(/[\d.]/g, "").trim();
  const unit2 = dim2.replace(/[\d.]/g, "").trim();

  if (unit1 === unit2) {
    // Same units - compare numeric values with small tolerance
    return Math.abs(num1 - num2) < 0.001;
  }

  // Different units - can't reliably compare without context
  return false;
}

/**
 * Format validation result as markdown.
 */
export function formatValidationReport(result: FigmaTokenValidationResult): string {
  const lines: string[] = [];

  lines.push("# Figma Token Validation Report");
  lines.push("");
  lines.push(`**Status:** ${result.valid ? "✅ Valid" : "❌ Invalid"}`);
  lines.push(`**Sync:** ${result.syncStatus} (${(result.syncScore * 100).toFixed(1)}%)`);
  lines.push("");

  // Statistics
  lines.push("## Statistics");
  lines.push("");
  lines.push(`- **Figma Variables:** ${result.stats.totalFigmaVariables}`);
  lines.push(`- **Local Tokens:** ${result.stats.totalLocalTokens}`);
  lines.push(`- **Matched:** ${result.stats.matched}`);
  lines.push(`- **Mismatched:** ${result.stats.mismatched}`);
  lines.push(`- **Missing in Figma:** ${result.stats.missingInFigma}`);
  lines.push(`- **Missing Locally:** ${result.stats.missingLocally}`);
  lines.push("");

  // Errors
  if (result.errors.length > 0) {
    lines.push("## Errors");
    lines.push("");
    for (const error of result.errors) {
      lines.push(`### ${error.category}: ${error.message}`);
      if (error.figmaVariable) {
        lines.push(`- **Figma Variable:** \`${error.figmaVariable}\``);
      }
      if (error.localToken) {
        lines.push(`- **Local Token:** \`${error.localToken}\``);
      }
      if (error.suggestion) {
        lines.push(`- **Suggestion:** ${error.suggestion}`);
      }
      lines.push("");
    }
  }

  // Warnings
  if (result.warnings.length > 0) {
    lines.push("## Warnings");
    lines.push("");

    // Group by category
    const byCategory = new Map<string, ValidationIssue[]>();
    for (const warning of result.warnings) {
      const existing = byCategory.get(warning.category) || [];
      existing.push(warning);
      byCategory.set(warning.category, existing);
    }

    for (const [category, warnings] of byCategory) {
      lines.push(`### ${category.charAt(0).toUpperCase() + category.slice(1)} (${warnings.length})`);
      lines.push("");

      // Show first 5 in detail, summarize rest
      const toShow = warnings.slice(0, 5);
      for (const warning of toShow) {
        lines.push(`- ${warning.message}`);
        if (warning.suggestion) {
          lines.push(`  - *${warning.suggestion}*`);
        }
      }

      if (warnings.length > 5) {
        lines.push(`- ... and ${warnings.length - 5} more`);
      }
      lines.push("");
    }
  }

  if (result.errors.length === 0 && result.warnings.length === 0) {
    lines.push("✅ No issues found! Figma variables are in sync with local tokens.");
    lines.push("");
  }

  return lines.join("\n");
}
