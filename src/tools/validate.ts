/**
 * validate_tokens tool — configurable token validation.
 *
 * Runs the validation engine against all loaded tokens and returns
 * a structured report.
 */
import type { McpDsConfig, ValidationPreset } from "../lib/types.js";
import { loadAllTokens, resolveReferences } from "../lib/parser.js";
import {
  validateTokens as runValidation,
  formatValidationReport,
  type ValidationReport,
} from "../lib/validators/engine.js";

export interface ValidateToolArgs {
  /** Override the config preset for this run. */
  preset?: ValidationPreset;
  /** Only validate tokens matching this path prefix. */
  pathPrefix?: string;
}

export async function validateTokensTool(
  args: ValidateToolArgs,
  projectRoot: string,
  config: McpDsConfig,
): Promise<{ report: ValidationReport; formatted: string }> {
  // Allow per-invocation preset override.
  const effectiveConfig = args.preset
    ? { ...config, validation: { ...config.validation, preset: args.preset } }
    : config;

  const tokenMap = await loadAllTokens(projectRoot, effectiveConfig);
  resolveReferences(tokenMap);

  let tokens = Array.from(tokenMap.values());

  // Optional path prefix filter.
  if (args.pathPrefix) {
    tokens = tokens.filter((t) => t.path.startsWith(args.pathPrefix!));
  }

  const report = runValidation(tokens, effectiveConfig);
  const formatted = formatValidationReport(report);
  return { report, formatted };
}
