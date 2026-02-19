/**
 * Configuration loader.
 *
 * Looks for a config file in the project root and deep-merges it with
 * defaults.  Supports JSON and JSON5.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import JSON5 from "json5";
import type { McpDsConfig } from "../lib/types.js";
import { DEFAULT_CONFIG } from "./defaults.js";

export const CONFIG_FILENAMES = [
  "systembridge-mcp.config.json",
  "systembridge-mcp.config.json5",
  ".systembridge-mcp.json",
] as const;

/**
 * Resolve project root: env var takes precedence, then walk up from cwd
 * to find a directory with a config file, else fall back to cwd.
 */
export function resolveProjectRoot(): string {
  const envRoot = process.env.SYSTEMBRIDGE_MCP_PROJECT_ROOT;
  if (envRoot) return path.resolve(envRoot);

  let dir = process.cwd();
  const root = path.parse(dir).root;

  while (true) {
    for (const name of CONFIG_FILENAMES) {
      if (fs.existsSync(path.join(dir, name))) return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir || parent === root) break;
    dir = parent;
  }
  return process.cwd();
}

/**
 * Deep-merge source into target (simple — arrays are replaced, not merged).
 */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = target[key];
    if (
      sv &&
      typeof sv === "object" &&
      !Array.isArray(sv) &&
      tv &&
      typeof tv === "object" &&
      !Array.isArray(tv)
    ) {
      result[key] = deepMerge(
        tv as Record<string, unknown>,
        sv as Record<string, unknown>,
      );
    } else if (sv !== undefined) {
      result[key] = sv;
    }
  }
  return result;
}

/**
 * Load configuration from disk, falling back to defaults for any missing
 * values.
 *
 * @param projectRoot  Absolute path to the project root (where config lives).
 */
export function loadConfig(projectRoot: string): McpDsConfig {
  for (const filename of CONFIG_FILENAMES) {
    const filePath = path.join(projectRoot, filename);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON5.parse(raw) as Record<string, unknown>;
      return deepMerge(
        DEFAULT_CONFIG as unknown as Record<string, unknown>,
        parsed,
      ) as unknown as McpDsConfig;
    }
  }
  return { ...DEFAULT_CONFIG };
}
