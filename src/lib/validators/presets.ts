/**
 * Built-in validation rule presets.
 *
 * Rules are composable and configurable.  Teams pick a preset and override
 * individual rule severities via config.
 */
import type {
  DesignToken,
  ValidationRule,
  ValidationResult,
} from "../../lib/types.js";

// ---------------------------------------------------------------------------
// Individual rules
// ---------------------------------------------------------------------------

const namingKebabCase: ValidationRule = {
  id: "naming/kebab-case",
  name: "Kebab-case naming",
  description: "Token path segments should use kebab-case (e.g. 'font-size' not 'fontSize')",
  severity: "warning",
  validate(tokens) {
    const results: ValidationResult[] = [];
    const camelRe = /[a-z][A-Z]/;
    for (const t of tokens) {
      const segments = t.path.split(".");
      for (const seg of segments) {
        if (camelRe.test(seg)) {
          results.push({
            severity: this.severity,
            rule: this.id,
            message: `Segment "${seg}" uses camelCase — consider kebab-case`,
            tokenPath: t.path,
            file: t.source,
            suggestion: `Rename "${seg}" to "${seg.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()}"`,
          });
          break;
        }
      }
    }
    return results;
  },
};

const requireDescription: ValidationRule = {
  id: "docs/require-description",
  name: "Require description",
  description: "Every token should have a description explaining its purpose",
  severity: "warning",
  validate(tokens) {
    return tokens
      .filter((t) => !t.description)
      .map((t) => ({
        severity: this.severity,
        rule: this.id,
        message: `Token "${t.path}" has no description`,
        tokenPath: t.path,
        file: t.source,
        suggestion: "Add a description explaining when and why to use this token",
      }));
  },
};

const requireType: ValidationRule = {
  id: "schema/require-type",
  name: "Require type",
  description: "Every token should declare its type (color, dimension, etc.)",
  severity: "warning",
  validate(tokens) {
    return tokens
      .filter((t) => !t.type)
      .map((t) => ({
        severity: this.severity,
        rule: this.id,
        message: `Token "${t.path}" has no type specified`,
        tokenPath: t.path,
        file: t.source,
        suggestion: "Add a $type or type property to the token",
      }));
  },
};

const noEmptyValue: ValidationRule = {
  id: "schema/no-empty-value",
  name: "No empty values",
  description: "Token values should not be empty strings, null, or undefined",
  severity: "error",
  validate(tokens) {
    return tokens
      .filter(
        (t) =>
          t.value === "" ||
          t.value === null ||
          t.value === undefined,
      )
      .map((t) => ({
        severity: this.severity,
        rule: this.id,
        message: `Token "${t.path}" has an empty or null value`,
        tokenPath: t.path,
        file: t.source,
      }));
  },
};

const colorFormatHex: ValidationRule = {
  id: "format/color-hex",
  name: "Color format",
  description: "Color tokens should use valid hex format (#RGB, #RRGGBB, or #RRGGBBAA)",
  severity: "warning",
  validate(tokens) {
    const hexRe = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
    return tokens
      .filter(
        (t) =>
          t.type === "color" &&
          typeof t.value === "string" &&
          t.value.startsWith("#") &&
          !hexRe.test(t.value),
      )
      .map((t) => ({
        severity: this.severity,
        rule: this.id,
        message: `Token "${t.path}" has malformed hex color: ${t.value}`,
        tokenPath: t.path,
        file: t.source,
        suggestion: "Use #RGB, #RRGGBB, or #RRGGBBAA format",
      }));
  },
};

const noDuplicateValues: ValidationRule = {
  id: "architecture/no-duplicate-values",
  name: "No duplicate values",
  description: "Warn when multiple tokens have the exact same resolved value (may indicate tokens that should reference a common primitive)",
  severity: "info",
  validate(tokens) {
    const valueMap = new Map<string, DesignToken[]>();
    for (const t of tokens) {
      const val = JSON.stringify(t.resolvedValue ?? t.value);
      if (!valueMap.has(val)) valueMap.set(val, []);
      valueMap.get(val)!.push(t);
    }

    const results: ValidationResult[] = [];
    for (const [val, group] of valueMap) {
      if (group.length > 1) {
        // Don't flag references — only tokens with literal same values
        const nonRefs = group.filter(
          (t) => typeof t.value !== "string" || !t.value.includes("{"),
        );
        if (nonRefs.length > 1) {
          results.push({
            severity: this.severity,
            rule: this.id,
            message: `${nonRefs.length} tokens share the same value ${val}: ${nonRefs.map((t) => t.path).join(", ")}`,
            suggestion:
              "Consider creating a shared primitive token and referencing it",
          });
        }
      }
    }
    return results;
  },
};

const deprecatedUsage: ValidationRule = {
  id: "lifecycle/deprecated-reference",
  name: "Deprecated reference",
  description: "Warn when a token references a deprecated token",
  severity: "warning",
  validate(tokens) {
    const deprecatedPaths = new Set(
      tokens.filter((t) => t.deprecated).map((t) => t.path),
    );
    const refPattern = /\{([^}]+)\}/g;
    const results: ValidationResult[] = [];

    for (const t of tokens) {
      if (typeof t.value !== "string") continue;
      for (const match of t.value.matchAll(refPattern)) {
        const refPath = match[1];
        if (deprecatedPaths.has(refPath)) {
          const depToken = tokens.find((dt) => dt.path === refPath);
          results.push({
            severity: this.severity,
            rule: this.id,
            message: `Token "${t.path}" references deprecated token "${refPath}"`,
            tokenPath: t.path,
            file: t.source,
            suggestion: depToken?.deprecated?.alternative
              ? `Use "${depToken.deprecated.alternative}" instead`
              : `Replace reference to "${refPath}" with a non-deprecated token`,
          });
        }
      }
    }
    return results;
  },
};

const maxNestingDepth: ValidationRule = {
  id: "architecture/max-nesting",
  name: "Max nesting depth",
  description: "Token paths should not exceed 5 levels of nesting",
  severity: "warning",
  validate(tokens) {
    const MAX_DEPTH = 5;
    return tokens
      .filter((t) => t.path.split(".").length > MAX_DEPTH)
      .map((t) => ({
        severity: this.severity,
        rule: this.id,
        message: `Token "${t.path}" has ${t.path.split(".").length} levels of nesting (max ${MAX_DEPTH})`,
        tokenPath: t.path,
        file: t.source,
        suggestion: "Flatten token hierarchy or reorganise categories",
      }));
  },
};

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

/** All available rules. */
export const ALL_RULES: ValidationRule[] = [
  noEmptyValue,
  requireType,
  requireDescription,
  namingKebabCase,
  colorFormatHex,
  noDuplicateValues,
  deprecatedUsage,
  maxNestingDepth,
];

export const PRESETS: Record<string, string[]> = {
  relaxed: [
    "schema/no-empty-value",
  ],
  recommended: [
    "schema/no-empty-value",
    "schema/require-type",
    "naming/kebab-case",
    "format/color-hex",
    "lifecycle/deprecated-reference",
    "architecture/no-duplicate-values",
  ],
  strict: ALL_RULES.map((r) => r.id),
};
