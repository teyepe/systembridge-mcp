/**
 * Scoping Rules Engine
 *
 * Defines and enforces rules about how semantic tokens relate to each other.
 * This is where separation of concerns is codified — preventing cross-concern
 * violations, enforcing pairing requirements, and validating coverage.
 */

import type { DesignToken } from "../types.js";
import {
  ALL_PROPERTY_CLASSES,
  SEMANTIC_INTENTS,
  UX_CONTEXTS,
  INTERACTION_STATES,
  EMPHASIS_MODIFIERS,
  parseSemanticPath,
  parseSemanticPathLenient,
  normalizePropertyClass,
  type PropertyClass,
  type SemanticTokenName,
} from "./ontology.js";

// ---------------------------------------------------------------------------
// Scoping rule types
// ---------------------------------------------------------------------------

export type ScopingRuleSeverity = "error" | "warning" | "info";

export interface ScopingViolation {
  /** Rule that was violated */
  ruleId: string;
  /** Severity of the violation */
  severity: ScopingRuleSeverity;
  /** Human-readable explanation */
  message: string;
  /** Token path(s) involved */
  tokenPaths: string[];
  /** Suggested fix */
  suggestion?: string;
}

export interface ScopingRule {
  id: string;
  name: string;
  description: string;
  severity: ScopingRuleSeverity;
  /**
   * Evaluate this rule against the full set of semantic tokens.
   * Returns violations found (empty array if compliant).
   */
  evaluate(tokens: Map<string, DesignToken>): ScopingViolation[];
}

// ---------------------------------------------------------------------------
// Built-in rules
// ---------------------------------------------------------------------------

/**
 * Rule: Cross-concern violation detection.
 *
 * Detects tokens whose VALUE is shared with tokens of a different property
 * class but the names suggest they should be distinct. For example, if
 * `text.muted` and `border.muted` resolve to the exact same value, that
 * might indicate the token was copy-pasted rather than intentionally designed.
 *
 * Note: This is a soft rule (warning) because sometimes shared values are
 * intentional (e.g., accent color used for both text links and border accents).
 */
export const crossConcernRule: ScopingRule = {
  id: "cross-concern-shared-value",
  name: "Cross-concern shared value",
  description:
    "Warns when tokens from different property classes resolve to the exact " +
    "same value, which may indicate a cross-concern violation.",
  severity: "warning",
  evaluate(tokens) {
    const violations: ScopingViolation[] = [];
    // Group tokens by resolved value
    const byValue = new Map<string, { path: string; parsed: SemanticTokenName }[]>();
    for (const [path, token] of tokens) {
      const parsed = parseSemanticPath(path);
      if (!parsed) continue;
      const val = String(token.resolvedValue ?? token.value);
      if (!byValue.has(val)) byValue.set(val, []);
      byValue.get(val)!.push({ path, parsed });
    }

    for (const [_val, group] of byValue) {
      if (group.length < 2) continue;
      // Check if there are different property classes sharing this value
      const classes = new Set(group.map((g) => g.parsed.propertyClass));
      if (classes.size > 1) {
        violations.push({
          ruleId: "cross-concern-shared-value",
          severity: "warning",
          message: `Tokens from different property classes (${[...classes].join(", ")}) ` +
            `resolve to the same value. This may indicate a cross-concern violation ` +
            `where the same primitive is used for different CSS purposes.`,
          tokenPaths: group.map((g) => g.path),
          suggestion:
            "Ensure each property class references semantically appropriate primitives. " +
            "If the shared value is intentional, document the reason.",
        });
      }
    }

    return violations;
  },
};

/**
 * Rule: Background ↔ Text pairing requirement.
 *
 * Every background token should have a corresponding text (or icon) token
 * to ensure accessible contrast. For example:
 *   background.accent → needs text.accent or text.accent.on
 *
 * Follows Material Design 3's "container / on-container" pairing principle.
 */
export const pairingRule: ScopingRule = {
  id: "pairing-requirement",
  name: "Background ↔ Text pairing",
  description:
    "Every background token must have a corresponding text/icon token " +
    "to ensure accessible foreground/background contrast.",
  severity: "error",
  evaluate(tokens) {
    const violations: ScopingViolation[] = [];
    const parsed = new Map<string, SemanticTokenName>();
    for (const [path] of tokens) {
      const p = parseSemanticPath(path) ?? parseSemanticPathLenient(path);
      if (p) parsed.set(path, p);
    }

    // Find all background tokens
    const backgrounds = [...parsed.entries()].filter(
      ([_, p]) => p.propertyClass === "background",
    );

    for (const [bgPath, bg] of backgrounds) {
      // Look for a matching text or icon token with same context+intent
      const hasTextPair = [...parsed.values()].some(
        (p) =>
          (p.propertyClass === "text" || p.propertyClass === "icon") &&
          p.intent === bg.intent &&
          (p.uxContext === bg.uxContext || !p.uxContext || !bg.uxContext),
      );

      if (!hasTextPair) {
        violations.push({
          ruleId: "pairing-requirement",
          severity: "error",
          message:
            `Background token "${bgPath}" has no corresponding text or icon token ` +
            `with intent "${bg.intent}". Without a paired foreground token, ` +
            `accessible contrast cannot be guaranteed.`,
          tokenPaths: [bgPath],
          suggestion:
            `Add a text token like "text.${bg.uxContext ? bg.uxContext + "." : ""}${bg.intent}".`,
        });
      }
    }

    return violations;
  },
};

/**
 * Rule: Ambiguous token naming.
 *
 * Detects tokens that don't follow the ontology naming convention —
 * missing property class prefix, using generic names like "primary"
 * without a property class, etc.
 */
export const ambiguityRule: ScopingRule = {
  id: "ambiguous-name",
  name: "Ambiguous token name",
  description:
    "Detects tokens whose names don't encode a property class, making it " +
    "unclear what CSS property they target.",
  severity: "warning",
  evaluate(tokens) {
    const violations: ScopingViolation[] = [];
    const propertyClassIds = new Set(
      ALL_PROPERTY_CLASSES.map((p) => p.id),
    );

    for (const [path] of tokens) {
      const segments = path.split(".");
      if (segments.length < 2) continue;

      // Check if the first segment (or first-two for compound) is a property class
      // Also check aliases (e.g. "bg" → "background", "fg" → "text")
      const firstIsClass = propertyClassIds.has(segments[0]) || !!normalizePropertyClass(segments[0]);
      const firstTwoAreClass =
        segments.length > 1 &&
        (propertyClassIds.has(`${segments[0]}-${segments[1]}`) ||
         !!normalizePropertyClass(`${segments[0]}-${segments[1]}`));

      if (!firstIsClass && !firstTwoAreClass) {
        // Check if ANY segment is a known property class or alias (misplaced)
        const misplacedClass = segments.find((s) =>
          propertyClassIds.has(s) || !!normalizePropertyClass(s),
        );
        const canonicalMisplaced = misplacedClass
          ? normalizePropertyClass(misplacedClass) ?? misplacedClass
          : undefined;

        violations.push({
          ruleId: "ambiguous-name",
          severity: "warning",
          message: canonicalMisplaced
            ? `Token "${path}" contains property class "${canonicalMisplaced}" (from "${misplacedClass}") but not as ` +
              `the first segment. The property class should lead the name for cognitive clarity.`
            : `Token "${path}" does not start with a recognized property class ` +
              `(${[...propertyClassIds].slice(0, 5).join(", ")}, ...). ` +
              `This makes it ambiguous what CSS property this token targets.`,
          tokenPaths: [path],
          suggestion: canonicalMisplaced
            ? `Restructure as "${canonicalMisplaced}.${segments.filter((s) => s !== misplacedClass).join(".")}".`
            : `Prefix the token with a property class: "background.${path}", "text.${path}", or "border.${path}".`,
        });
      }
    }

    return violations;
  },
};

/**
 * Rule: State coverage consistency.
 *
 * Within an interactive UX context (action, input, navigation), if any
 * token defines a state (e.g., hover), then ALL property classes for
 * that context+intent should also define that state.
 *
 * Example: if `background.action.accent.hover` exists, then
 * `text.action.accent.hover` and `border.action.accent.hover` should too.
 */
export const stateCoverageRule: ScopingRule = {
  id: "state-coverage",
  name: "State coverage consistency",
  description:
    "When an interactive context defines a state for one property class, " +
    "all other property classes in that context should also define it.",
  severity: "warning",
  evaluate(tokens) {
    const violations: ScopingViolation[] = [];

    // Parse all tokens
    const parsed: Array<{ path: string; name: SemanticTokenName }> = [];
    for (const [path] of tokens) {
      const p = parseSemanticPath(path);
      if (p) parsed.push({ path, name: p });
    }

    // Group by context + intent
    const groups = new Map<string, Array<{ path: string; name: SemanticTokenName }>>();
    for (const item of parsed) {
      if (!item.name.uxContext || !item.name.state) continue;
      const key = `${item.name.uxContext}.${item.name.intent}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }

    for (const [key, group] of groups) {
      // Collect all states and property classes in this group
      const statesByClass = new Map<string, Set<string>>();
      for (const item of group) {
        const cls = item.name.propertyClass;
        if (!statesByClass.has(cls)) statesByClass.set(cls, new Set());
        statesByClass.get(cls)!.add(item.name.state!);
      }

      // Union of all states
      const allStates = new Set<string>();
      for (const states of statesByClass.values()) {
        for (const s of states) allStates.add(s);
      }

      // Check each class has all states
      for (const [cls, states] of statesByClass) {
        for (const state of allStates) {
          if (!states.has(state)) {
            violations.push({
              ruleId: "state-coverage",
              severity: "warning",
              message:
                `In context "${key}", state "${state}" is defined for some property ` +
                `classes but missing for "${cls}". This creates an inconsistent ` +
                `state coverage matrix.`,
              tokenPaths: group
                .filter(
                  (g) =>
                    g.name.state === state ||
                    g.name.propertyClass === cls,
                )
                .map((g) => g.path),
              suggestion:
                `Add "${cls}.${key}.${state}" or remove the "${state}" state from other classes.`,
            });
          }
        }
      }
    }

    return violations;
  },
};

/**
 * Rule: Over-abstraction detection.
 *
 * Detects tokens with overly generic names that suggest they might be
 * doing too much (e.g., "layer-1", "level-1", "variant-a") or that
 * they don't carry enough semantic meaning.
 */
export const overAbstractionRule: ScopingRule = {
  id: "over-abstraction",
  name: "Over-abstraction",
  description:
    "Detects tokens with generic numbered/lettered names that suggest " +
    "insufficient semantic meaning.",
  severity: "info",
  evaluate(tokens) {
    const violations: ScopingViolation[] = [];
    const genericPatterns = [
      /\blayer[-.]?\d+/i,
      /\blevel[-.]?\d+/i,
      /\bvariant[-.]?[a-d]/i,
      /\btype[-.]?\d+/i,
      /\bstyle[-.]?\d+/i,
      /\bcolor[-.]?\d+/i,
    ];

    for (const [path] of tokens) {
      for (const pattern of genericPatterns) {
        if (pattern.test(path)) {
          violations.push({
            ruleId: "over-abstraction",
            severity: "info",
            message:
              `Token "${path}" uses a generic numbered/lettered name, which ` +
              `suggests it might be over-abstracted. Semantic tokens should ` +
              `carry clear intent (e.g., "base", "accent", "muted") rather ` +
              `than positional labels.`,
            tokenPaths: [path],
            suggestion:
              `Replace the generic suffix with a semantic intent: ` +
              `"base", "accent", "muted", "inverted", "success", "warning", "danger", "info".`,
          });
          break;
        }
      }
    }

    return violations;
  },
};

/**
 * Rule: Unreferenced property class.
 *
 * For each UX context present in the token set, check that all required
 * property classes (as defined in the UX_CONTEXTS config) are present.
 */
export const coverageRule: ScopingRule = {
  id: "coverage-gap",
  name: "Property class coverage gap",
  description:
    "Detects UX contexts that are missing required property classes " +
    "(e.g., an action context with backgrounds but no text tokens).",
  severity: "error",
  evaluate(tokens) {
    const violations: ScopingViolation[] = [];

    // Parse and group by uxContext
    const byContext = new Map<string, Set<string>>();
    const pathsByContext = new Map<string, string[]>();
    for (const [path] of tokens) {
      const p = parseSemanticPath(path);
      if (!p?.uxContext) continue;
      if (!byContext.has(p.uxContext)) {
        byContext.set(p.uxContext, new Set());
        pathsByContext.set(p.uxContext, []);
      }
      byContext.get(p.uxContext)!.add(p.propertyClass);
      pathsByContext.get(p.uxContext)!.push(path);
    }

    // Cross-reference with ontology requirements
    for (const [ctxId, classes] of byContext) {
      const uxDef = UX_CONTEXTS.find((u) => u.id === ctxId);
      if (!uxDef) continue;

      for (const required of uxDef.requiredPropertyClasses) {
        if (!classes.has(required)) {
          violations.push({
            ruleId: "coverage-gap",
            severity: "error",
            message:
              `UX context "${ctxId}" (${uxDef.label}) is missing required property ` +
              `class "${required}". ${uxDef.label} components need ${uxDef.requiredPropertyClasses.join(", ")} tokens.`,
            tokenPaths: pathsByContext.get(ctxId) ?? [],
            suggestion:
              `Add "${required}.${ctxId}.base" (and intents as needed) to close the coverage gap.`,
          });
        }
      }
    }

    return violations;
  },
};

// ---------------------------------------------------------------------------
// Rule registry
// ---------------------------------------------------------------------------

/** All built-in scoping rules */
export const ALL_SCOPING_RULES: ScopingRule[] = [
  crossConcernRule,
  pairingRule,
  ambiguityRule,
  stateCoverageRule,
  overAbstractionRule,
  coverageRule,
];

/**
 * Run all scoping rules against a token set.
 *
 * @param tokens - Map of path → DesignToken (should be semantic tokens only)
 * @param ruleIds - If provided, run only these rules. Otherwise run all.
 * @returns List of violations found
 */
export function evaluateScoping(
  tokens: Map<string, DesignToken>,
  ruleIds?: string[],
): ScopingViolation[] {
  const rulesToRun = ruleIds
    ? ALL_SCOPING_RULES.filter((r) => ruleIds.includes(r.id))
    : ALL_SCOPING_RULES;

  const violations: ScopingViolation[] = [];
  for (const rule of rulesToRun) {
    violations.push(...rule.evaluate(tokens));
  }

  return violations;
}

/**
 * Summarize violations into a structured report.
 */
export interface ScopingReport {
  totalViolations: number;
  errors: number;
  warnings: number;
  infos: number;
  violations: ScopingViolation[];
  /** Quick summary string */
  summary: string;
}

export function generateScopingReport(
  violations: ScopingViolation[],
): ScopingReport {
  const errors = violations.filter((v) => v.severity === "error").length;
  const warnings = violations.filter((v) => v.severity === "warning").length;
  const infos = violations.filter((v) => v.severity === "info").length;

  const parts: string[] = [];
  if (errors > 0) parts.push(`${errors} error(s)`);
  if (warnings > 0) parts.push(`${warnings} warning(s)`);
  if (infos > 0) parts.push(`${infos} info(s)`);

  return {
    totalViolations: violations.length,
    errors,
    warnings,
    infos,
    violations,
    summary: violations.length === 0
      ? "All scoping rules pass. The semantic token set is well-structured."
      : `Found ${violations.length} issue(s): ${parts.join(", ")}.`,
  };
}
