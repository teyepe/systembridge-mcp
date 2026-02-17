/**
 * Validation engine.
 *
 * Runs configured validation rules against a set of tokens and returns
 * a structured list of results.  Supports preset selection and per-rule
 * severity overrides from config.
 */
import type {
  DesignToken,
  McpDsConfig,
  ValidationResult,
  ValidationSeverity,
} from "../types.js";
import { ALL_RULES, PRESETS } from "./presets.js";

export interface ValidationReport {
  totalTokens: number;
  errors: number;
  warnings: number;
  infos: number;
  results: ValidationResult[];
  passed: boolean;
}

/**
 * Validate a set of tokens using the rules defined by the config.
 */
export function validateTokens(
  tokens: DesignToken[],
  config: McpDsConfig,
): ValidationReport {
  const presetName = config.validation.preset ?? "recommended";
  const enabledRuleIds = new Set(PRESETS[presetName] ?? PRESETS["recommended"]);
  const overrides = config.validation.overrides ?? {};

  // Apply overrides — can change severity or disable rules.
  const activeRules = ALL_RULES.filter((rule) => {
    const override = overrides[rule.id];
    if (override === false) return false; // disabled
    return enabledRuleIds.has(rule.id) || override !== undefined;
  }).map((rule) => {
    const override = overrides[rule.id];
    if (override !== undefined && override !== false) {
      return { ...rule, severity: override };
    }
    return rule;
  });

  // Run each active rule.
  const results: ValidationResult[] = [];
  for (const rule of activeRules) {
    const ruleResults = rule.validate(tokens);
    // Apply severity from the rule (which may have been overridden).
    for (const r of ruleResults) {
      results.push({ ...r, severity: rule.severity });
    }
  }

  // Aggregate counts.
  let errors = 0;
  let warnings = 0;
  let infos = 0;
  for (const r of results) {
    switch (r.severity) {
      case "error":
        errors++;
        break;
      case "warning":
        warnings++;
        break;
      case "info":
        infos++;
        break;
    }
  }

  return {
    totalTokens: tokens.length,
    errors,
    warnings,
    infos,
    results,
    passed: errors === 0,
  };
}

/**
 * Format a validation report as a human-readable string.
 */
export function formatValidationReport(report: ValidationReport): string {
  const lines: string[] = [];

  lines.push(
    `Validation: ${report.passed ? "PASSED ✓" : "FAILED ✗"}` +
      ` (${report.totalTokens} tokens checked)`,
  );
  lines.push(
    `  ${report.errors} error(s), ${report.warnings} warning(s), ${report.infos} info(s)`,
  );

  if (report.results.length === 0) {
    lines.push("\nNo issues found — all tokens look good!");
    return lines.join("\n");
  }

  lines.push("");

  // Group by severity for readability.
  const grouped: Record<string, ValidationResult[]> = {
    error: [],
    warning: [],
    info: [],
  };
  for (const r of report.results) {
    grouped[r.severity].push(r);
  }

  const icon: Record<string, string> = {
    error: "✗",
    warning: "⚠",
    info: "ℹ",
  };

  for (const sev of ["error", "warning", "info"] as const) {
    const items = grouped[sev];
    if (items.length === 0) continue;
    lines.push(`${icon[sev]} ${sev.toUpperCase()} (${items.length}):`);
    for (const item of items) {
      lines.push(`  [${item.rule}] ${item.message}`);
      if (item.file) lines.push(`    File: ${item.file}`);
      if (item.suggestion) lines.push(`    Fix: ${item.suggestion}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
