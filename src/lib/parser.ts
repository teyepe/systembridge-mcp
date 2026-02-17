/**
 * Token parser — discovers, reads, and normalises token files.
 *
 * This is the main entry-point for loading all tokens in a project.
 * It globs for files, reads them (JSON / JSON5 / YAML), detects the format,
 * and returns a flat TokenMap.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import fg from "fast-glob";
import JSON5 from "json5";
import YAML from "yaml";
import type { DesignToken, McpDsConfig, TokenMap } from "./types.js";
import { detectFormat, getAdapter } from "./formats/index.js";

// ---------------------------------------------------------------------------
// File reading helpers
// ---------------------------------------------------------------------------

function readFileContent(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, "utf-8");
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case ".yaml":
    case ".yml":
      return YAML.parse(raw);
    case ".json5":
      return JSON5.parse(raw);
    case ".json":
    default:
      // Try JSON first, fall back to JSON5 for lenient parsing
      try {
        return JSON.parse(raw);
      } catch {
        return JSON5.parse(raw);
      }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Discover all token files matching the configured globs and parse them into
 * a flat map of tokens.
 *
 * @param projectRoot  Absolute path to the project root.
 * @param config       Loaded MCP-DS config.
 * @returns            Map of token path → DesignToken.
 */
export async function loadAllTokens(
  projectRoot: string,
  config: McpDsConfig,
): Promise<TokenMap> {
  const tokenMap: TokenMap = new Map();

  // Resolve all globs relative to project root.
  const files = await fg(config.tokenPaths, {
    cwd: projectRoot,
    absolute: true,
    onlyFiles: true,
    ignore: ["**/node_modules/**"],
  });

  for (const file of files.sort()) {
    const relPath = path.relative(projectRoot, file);
    try {
      const data = readFileContent(file);

      // Pick the right adapter.
      const adapter = config.tokenFormat
        ? getAdapter(config.tokenFormat)
        : detectFormat(data);

      if (!adapter) {
        // Skip files we can't understand — don't crash, just log.
        console.error(`[mcp-ds] No format adapter matched: ${relPath}`);
        continue;
      }

      const tokens = adapter.parse(data, relPath);
      for (const token of tokens) {
        tokenMap.set(token.path, token);
      }
    } catch (err) {
      console.error(
        `[mcp-ds] Error parsing ${relPath}: ${(err as Error).message}`,
      );
    }
  }

  return tokenMap;
}

/**
 * Load tokens from a single file.
 */
export function loadTokensFromFile(
  filePath: string,
  projectRoot: string,
  config: McpDsConfig,
): DesignToken[] {
  const relPath = path.relative(projectRoot, filePath);
  const data = readFileContent(filePath);
  const adapter = config.tokenFormat
    ? getAdapter(config.tokenFormat)
    : detectFormat(data);

  if (!adapter) {
    throw new Error(`No format adapter matched for file: ${relPath}`);
  }

  return adapter.parse(data, relPath);
}

/**
 * Resolve token references (aliases).
 *
 * Design tokens commonly reference other tokens via syntax like
 * `{color.primary.500}`.  This resolves chains iteratively so that
 * A → B → C fully resolves to C's literal value.
 *
 * Performs up to `maxPasses` iterations to handle multi-level chains.
 */
export function resolveReferences(tokenMap: TokenMap): void {
  const refPattern = /\{([^}]+)\}/g;
  const MAX_PASSES = 10;

  // Initialise resolvedValue for non-string values.
  for (const token of tokenMap.values()) {
    if (typeof token.value !== "string") {
      token.resolvedValue = token.value;
    }
  }

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let changed = false;

    for (const token of tokenMap.values()) {
      // Work with the current best resolution (or original value).
      const current = token.resolvedValue ?? token.value;
      if (typeof current !== "string") continue;

      const str = current as string;
      const matches = [...str.matchAll(refPattern)];
      if (matches.length === 0) {
        if (token.resolvedValue === undefined) {
          token.resolvedValue = token.value;
        }
        continue;
      }

      let resolved: unknown;

      // Single full-string reference — preserve the referenced type.
      if (matches.length === 1 && matches[0][0] === str) {
        const refPath = matches[0][1];
        const refToken = tokenMap.get(refPath);
        resolved = refToken
          ? refToken.resolvedValue ?? refToken.value
          : str;
      } else {
        // Composite — substitute as strings.
        resolved = str.replace(refPattern, (_match, refPath: string) => {
          const refToken = tokenMap.get(refPath);
          return refToken
            ? String(refToken.resolvedValue ?? refToken.value)
            : `{${refPath}}`;
        });
      }

      if (resolved !== token.resolvedValue) {
        token.resolvedValue = resolved;
        changed = true;
      }
    }

    if (!changed) break;
  }
}
