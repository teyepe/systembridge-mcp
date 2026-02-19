/**
 * Migration Validation
 *
 * Post-migration validation to ensure integrity, accessibility,
 * and correctness of migrated tokens.
 */

import type { DesignToken } from "../types.js";
import type { MigrationExecution, PhaseExecution } from "./executor.js";
import { parseSemanticPath } from "../semantics/ontology.js";
import { checkAccessibility } from "../color/index.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValidationReport {
  /** Overall validation status */
  status: "passed" | "warning" | "failed";
  /** Individual checks */
  checks: ValidationCheck[];
  /** Summary */
  summary: {
    passed: number;
    warnings: number;
    errors: number;
  };
  /** Migration execution being validated */
  execution: MigrationExecution;
}

export interface ValidationCheck {
  /** Check name */
  name: string;
  /** Category */
  category: "integrity" | "accessibility" | "naming" | "structure" | "references";
  /** Status */
  status: "passed" | "warning" | "failed";
  /** Details */
  details: string;
  /** Issues found */
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  /** Severity */
  severity: "error" | "warning" | "info";
  /** Token path */
  tokenPath: string;
  /** Description */
  description: string;
  /** Suggestion */
  suggestion?: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate a migration execution.
 *
 * @param tokens - Post-migration token map
 * @param execution - Migration execution to validate
 * @returns Validation report
 */
export async function validateMigration(
  tokens: Map<string, DesignToken>,
  execution: MigrationExecution,
): Promise<ValidationReport> {
  const checks: ValidationCheck[] = [];

  // Run all validation checks
  checks.push(await validateIntegrity(tokens, execution));
  checks.push(await validateReferences(tokens, execution));
  checks.push(await validateNamingConventions(tokens, execution));
  checks.push(await validateStructure(tokens, execution));
  checks.push(await validateAccessibility(tokens, execution));

  // Compute summary
  const passed = checks.filter(c => c.status === "passed").length;
  const warnings = checks.filter(c => c.status === "warning").length;
  const errors = checks.filter(c => c.status === "failed").length;

  return {
    status: errors > 0 ? "failed" : warnings > 0 ? "warning" : "passed",
    checks,
    summary: { passed, warnings, errors },
    execution,
  };
}

/**
 * Validate integrity: no duplicate tokens, all operations successful, etc.
 */
async function validateIntegrity(
  tokens: Map<string, DesignToken>,
  execution: MigrationExecution,
): Promise<ValidationCheck> {
  const issues: ValidationIssue[] = [];

  // Check for failed operations
  for (const phase of execution.phases) {
    for (const action of phase.actions) {
      const failed = action.operations.filter(op => !op.success);
      for (const op of failed) {
        issues.push({
          severity: "error",
          tokenPath: op.path,
          description: `Operation failed: ${op.error}`,
          suggestion: "Review operation and retry",
        });
      }
    }
  }

  // Check for duplicate paths
  const paths = Array.from(tokens.keys());
  const duplicates = paths.filter((p, i) => paths.indexOf(p) !== i);
  for (const dup of duplicates) {
    issues.push({
      severity: "error",
      tokenPath: dup,
      description: "Duplicate token path",
      suggestion: "Remove duplicate definitions",
    });
  }

  return {
    name: "Migration Integrity",
    category: "integrity",
    status: issues.length > 0 ? "failed" : "passed",
    details: `Checked ${execution.phases.length} phases, found ${issues.length} integrity issues`,
    issues,
  };
}

/**
 * Validate references: no broken references, no circular dependencies.
 */
async function validateReferences(
  tokens: Map<string, DesignToken>,
  execution: MigrationExecution,
): Promise<ValidationCheck> {
  const issues: ValidationIssue[] = [];

  // Build reference map
  const refMap = new Map<string, string[]>();
  for (const [path, token] of tokens) {
    const value = String(token.value);
    const match = value.match(/\{([^}]+)\}/);
    if (match) {
      const refPath = match[1];
      if (!refMap.has(path)) {
        refMap.set(path, []);
      }
      refMap.get(path)!.push(refPath);
    }
  }

  // Check for broken references
  for (const [path, refs] of refMap) {
    for (const ref of refs) {
      if (!tokens.has(ref)) {
        issues.push({
          severity: "error",
          tokenPath: path,
          description: `Broken reference to ${ref}`,
          suggestion: `Ensure ${ref} exists or update reference`,
        });
      }
    }
  }

  // Check for circular dependencies
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const hasCycle = (path: string, chain: string[] = []): string[] | null => {
    if (recursionStack.has(path)) {
      return [...chain, path];
    }
    if (visited.has(path)) {
      return null;
    }

    visited.add(path);
    recursionStack.add(path);

    const refs = refMap.get(path) ?? [];
    for (const ref of refs) {
      const cycle = hasCycle(ref, [...chain, path]);
      if (cycle) {
        return cycle;
      }
    }

    recursionStack.delete(path);
    return null;
  };

  for (const path of tokens.keys()) {
    const cycle = hasCycle(path);
    if (cycle) {
      issues.push({
        severity: "error",
        tokenPath: path,
        description: `Circular dependency: ${cycle.join(" → ")}`,
        suggestion: "Break the circular chain by using direct values",
      });
      break; // Only report first cycle
    }
  }

  return {
    name: "Reference Validation",
    category: "references",
    status: issues.length > 0 ? "failed" : "passed",
    details: `Validated ${refMap.size} token references`,
    issues,
  };
}

/**
 * Validate naming conventions: tokens follow semantic ontology.
 */
async function validateNamingConventions(
  tokens: Map<string, DesignToken>,
  execution: MigrationExecution,
): Promise<ValidationCheck> {
  const issues: ValidationIssue[] = [];

  // Get all tokens affected by migration
  const affectedPaths = new Set<string>();
  for (const phase of execution.phases) {
    for (const action of phase.actions) {
      for (const op of action.operations) {
        affectedPaths.add(op.path);
        if (op.newPath) {
          affectedPaths.add(op.newPath);
        }
      }
    }
  }

  // Check affected tokens
  for (const path of affectedPaths) {
    if (!tokens.has(path)) continue;

    // Try to parse as semantic path
    const parsed = parseSemanticPath(path);
    if (!parsed) {
      // Check if it's a primitive (allowed)
      if (path.startsWith("color.") || path.startsWith("core.")) {
        continue;
      }

      issues.push({
        severity: "warning",
        tokenPath: path,
        description: "Token doesn't follow semantic naming convention",
        suggestion: "Consider restructuring to match schema: <property>.<context>.<intent>.<state>",
      });
    }
  }

  return {
    name: "Naming Convention Compliance",
    category: "naming",
    status: issues.length > 0 ? "warning" : "passed",
    details: `Validated ${affectedPaths.size} token names`,
    issues,
  };
}

/**
 * Validate structure: proper hierarchy, no orphaned tokens.
 */
async function validateStructure(
  tokens: Map<string, DesignToken>,
  execution: MigrationExecution,
): Promise<ValidationCheck> {
  const issues: ValidationIssue[] = [];

  // Build dependency graph
  const dependents = new Map<string, string[]>();
  const dependencies = new Map<string, string[]>();

  for (const [path, token] of tokens) {
    const value = String(token.value);
    const match = value.match(/\{([^}]+)\}/);
    if (match) {
      const refPath = match[1];

      if (!dependencies.has(path)) {
        dependencies.set(path, []);
      }
      dependencies.get(path)!.push(refPath);

      if (!dependents.has(refPath)) {
        dependents.set(refPath, []);
      }
      dependents.get(refPath)!.push(path);
    }
  }

  // Check for orphaned tokens (no dependents, not primitives)
  for (const [path, token] of tokens) {
    const hasDependents = (dependents.get(path)?.length ?? 0) > 0;
    const isPrimitive = path.startsWith("color.") || path.startsWith("core.");

    if (!hasDependents && !isPrimitive) {
      issues.push({
        severity: "info",
        tokenPath: path,
        description: "Orphaned token (no other tokens reference it)",
        suggestion: "Consider if this token is still needed",
      });
    }
  }

  // Check for deep nesting (>4 levels)
  for (const path of tokens.keys()) {
    const depth = calculateReferenceDepth(path, dependencies, new Set());
    if (depth > 4) {
      issues.push({
        severity: "warning",
        tokenPath: path,
        description: `Deep reference chain (depth ${depth})`,
        suggestion: "Consider flattening the reference hierarchy",
      });
    }
  }

  return {
    name: "Structure Validation",
    category: "structure",
    status: issues.some(i => i.severity === "warning") ? "warning" : "passed",
    details: `Analyzed token hierarchy and dependencies`,
    issues,
  };
}

/**
 * Validate accessibility: color contrasts still pass WCAG.
 */
async function validateAccessibility(
  tokens: Map<string, DesignToken>,
  execution: MigrationExecution,
): Promise<ValidationCheck> {
  const issues: ValidationIssue[] = [];

  // Find color tokens
  const colorTokens = Array.from(tokens.entries()).filter(
    ([path, token]) => token.type === "color" || path.includes("color")
  );

  // Check for common foreground/background pairs
  const fgPatterns = ["text", "foreground", "fg", "content"];
  const bgPatterns = ["background", "bg", "surface"];

  for (const [fgPath, fgToken] of colorTokens) {
    const isForeground = fgPatterns.some(p => fgPath.includes(p));
    if (!isForeground) continue;

    // Find potential backgrounds for this foreground
    for (const [bgPath, bgToken] of colorTokens) {
      const isBackground = bgPatterns.some(p => bgPath.includes(p));
      if (!isBackground) continue;

      // Check if they're in same context
      const fgContext = fgPath.split(".").slice(0, 2).join(".");
      const bgContext = bgPath.split(".").slice(0, 2).join(".");
      if (fgContext !== bgContext) continue;

      // Get resolved colors
      const fgColor = fgToken.resolvedValue ?? fgToken.value;
      const bgColor = bgToken.resolvedValue ?? bgToken.value;

      // Check contrast
      const a11y = checkAccessibility(String(fgColor), String(bgColor));

      if (!a11y.wcag.aa.normal) {
        issues.push({
          severity: "warning",
          tokenPath: fgPath,
          description: `Insufficient contrast with ${bgPath} (ratio: ${a11y.contrastRatio.toFixed(2)}:1)`,
          suggestion: "Adjust colors to meet WCAG AA (4.5:1 for normal text)",
        });
      }
    }
  }

  return {
    name: "Accessibility Validation",
    category: "accessibility",
    status: issues.length > 0 ? "warning" : "passed",
    details: `Checked ${colorTokens.length} color tokens for contrast`,
    issues,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calculateReferenceDepth(
  path: string,
  dependencies: Map<string, string[]>,
  visited: Set<string>,
): number {
  if (visited.has(path)) {
    return 0; // Break cycles
  }

  visited.add(path);

  const deps = dependencies.get(path) ?? [];
  if (deps.length === 0) {
    return 0;
  }

  const maxDepth = Math.max(
    ...deps.map(dep => calculateReferenceDepth(dep, dependencies, new Set(visited)))
  );

  return 1 + maxDepth;
}

/**
 * Generate a validation report in markdown.
 */
export function generateValidationReport(report: ValidationReport): string {
  const lines: string[] = [];

  lines.push("# Migration Validation Report");
  lines.push("");

  // Status badge
  const statusEmoji = report.status === "passed" ? "✅" : report.status === "warning" ? "⚠️" : "❌";
  lines.push(`**Status:** ${statusEmoji} ${report.status.toUpperCase()}`);
  lines.push("");

  // Summary
  lines.push("## Summary");
  lines.push("");
  lines.push(`- ✅ Passed: ${report.summary.passed}`);
  lines.push(`- ⚠️ Warnings: ${report.summary.warnings}`);
  lines.push(`- ❌ Errors: ${report.summary.errors}`);
  lines.push("");

  // Individual checks
  lines.push("## Validation Checks");
  lines.push("");

  for (const check of report.checks) {
    const icon = check.status === "passed" ? "✅" : check.status === "warning" ? "⚠️" : "❌";
    lines.push(`### ${icon} ${check.name}`);
    lines.push("");
    lines.push(`**Category:** ${check.category}`);
    lines.push(`**Status:** ${check.status}`);
    lines.push(`**Details:** ${check.details}`);
    lines.push("");

    if (check.issues.length > 0) {
      lines.push("**Issues:**");
      lines.push("");

      for (const issue of check.issues) {
        const severityIcon = issue.severity === "error" ? "❌" : issue.severity === "warning" ? "⚠️" : "ℹ️";
        lines.push(`${severityIcon} \`${issue.tokenPath}\`: ${issue.description}`);
        if (issue.suggestion) {
          lines.push(`  - *Suggestion:* ${issue.suggestion}`);
        }
      }

      lines.push("");
    }
  }

  return lines.join("\n");
}
