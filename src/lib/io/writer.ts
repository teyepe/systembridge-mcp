/**
 * Token File Writer
 *
 * Shared utility for writing generated tokens to disk with:
 *   - Path sandboxing (never writes outside project root)
 *   - Multiple merge strategies (skip, overwrite, additive)
 *   - Dry-run mode (returns what would be written without touching disk)
 *   - Split strategies (single file, by UX context, by property class)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { DesignToken } from "../types.js";
import { tokensToNestedJson } from "../semantics/scaffold.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** How to handle files that already exist on disk. */
export type MergeStrategy =
  /** Skip tokens whose paths already exist in the file (additive-only). */
  | "additive"
  /** Overwrite the entire file with the new tokens. */
  | "overwrite"
  /** Skip writing to files that already exist at all. */
  | "skip";

/** How to split generated tokens across files. */
export type SplitStrategy =
  /** All tokens → one file. */
  | "single"
  /** One file per UX context (e.g., action.json, input.json, surface.json). */
  | "by-context"
  /** One file per property class (e.g., background.json, text.json). */
  | "by-property";

/** Describes a single file to be written. */
export interface WritePlan {
  /** Absolute path to the file. */
  filePath: string;
  /** Relative path from output dir (for display). */
  relativePath: string;
  /** Number of tokens in this file. */
  tokenCount: number;
  /** The nested JSON content that would be written. */
  content: Record<string, unknown>;
  /** Whether this file already exists on disk. */
  existsOnDisk: boolean;
  /** Action taken: created, merged, skipped, overwritten. */
  action: "create" | "merge" | "skip" | "overwrite";
}

/** Result of a write operation. */
export interface WriteResult {
  /** All files that were (or would be) affected. */
  files: WritePlan[];
  /** Total tokens written. */
  totalTokens: number;
  /** Whether this was a dry run (nothing written to disk). */
  dryRun: boolean;
  /** Human-readable summary. */
  summary: string;
}

// ---------------------------------------------------------------------------
// Core writer
// ---------------------------------------------------------------------------

/**
 * Write design tokens to disk.
 *
 * @param tokens     - The flat token map to write
 * @param outputDir  - Absolute path to the output directory
 * @param projectRoot - Absolute path to the project root (for sandboxing)
 * @param options    - Writer configuration
 */
export function writeTokenFiles(
  tokens: Map<string, DesignToken>,
  outputDir: string,
  projectRoot: string,
  options?: {
    split?: SplitStrategy;
    merge?: MergeStrategy;
    dryRun?: boolean;
    filePrefix?: string;
  },
): WriteResult {
  const split = options?.split ?? "single";
  const merge = options?.merge ?? "additive";
  const dryRun = options?.dryRun ?? false;
  const filePrefix = options?.filePrefix ?? "semantic-tokens";

  // Resolve and sandbox the output directory
  const resolvedOutputDir = path.resolve(projectRoot, outputDir);
  if (!resolvedOutputDir.startsWith(path.resolve(projectRoot))) {
    throw new Error(
      `Output directory "${outputDir}" escapes the project root. ` +
      `Resolved to "${resolvedOutputDir}" which is outside "${projectRoot}".`,
    );
  }

  // Split tokens into file groups
  const fileGroups = splitTokens(tokens, split, filePrefix);

  // Build write plans
  const files: WritePlan[] = [];

  for (const [fileName, groupTokens] of fileGroups) {
    const filePath = path.join(resolvedOutputDir, fileName);
    const relativePath = path.relative(projectRoot, filePath);
    const existsOnDisk = fs.existsSync(filePath);
    const content = tokensToNestedJson(groupTokens);

    let action: WritePlan["action"];
    let finalContent = content;

    if (!existsOnDisk) {
      action = "create";
    } else if (merge === "skip") {
      action = "skip";
    } else if (merge === "overwrite") {
      action = "overwrite";
    } else {
      // additive merge
      action = "merge";
      const existing = readJsonFile(filePath);
      if (existing) {
        finalContent = deepMerge(existing, content);
      }
    }

    files.push({
      filePath,
      relativePath,
      tokenCount: groupTokens.size,
      content: finalContent,
      existsOnDisk,
      action,
    });

    // Actually write unless dry-run or skipped
    if (!dryRun && action !== "skip") {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(finalContent, null, 2) + "\n", "utf-8");
    }
  }

  const totalTokens = files
    .filter((f) => f.action !== "skip")
    .reduce((sum, f) => sum + f.tokenCount, 0);

  const summary = buildWriteSummary(files, totalTokens, dryRun);

  return { files, totalTokens, dryRun, summary };
}

// ---------------------------------------------------------------------------
// Split strategies
// ---------------------------------------------------------------------------

function splitTokens(
  tokens: Map<string, DesignToken>,
  strategy: SplitStrategy,
  filePrefix: string,
): Map<string, Map<string, DesignToken>> {
  const groups = new Map<string, Map<string, DesignToken>>();

  if (strategy === "single") {
    groups.set(`${filePrefix}.json`, tokens);
    return groups;
  }

  for (const [tokenPath, token] of tokens) {
    const segments = tokenPath.split(".");
    let groupKey: string;

    if (strategy === "by-context") {
      // Second segment is the UX context if present, else "_global"
      groupKey = segments.length > 2 ? segments[1] : "_global";
    } else {
      // by-property: first segment is the property class
      groupKey = segments[0] ?? "_unknown";
    }

    const fileName = `${filePrefix}.${groupKey}.json`;
    if (!groups.has(fileName)) {
      groups.set(fileName, new Map());
    }
    groups.get(fileName)!.set(tokenPath, token);
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readJsonFile(filePath: string): Record<string, unknown> | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Deep merge: existing values are NOT overwritten (additive-only).
 * New keys/paths are added.
 */
function deepMerge(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...existing };

  for (const [key, value] of Object.entries(incoming)) {
    if (!(key in result)) {
      result[key] = value;
    } else if (
      typeof result[key] === "object" &&
      result[key] !== null &&
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(result[key]) &&
      !Array.isArray(value)
    ) {
      // Both are objects — recursively merge
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    }
    // else: existing wins (additive-only)
  }

  return result;
}

function buildWriteSummary(
  files: WritePlan[],
  totalTokens: number,
  dryRun: boolean,
): string {
  const lines: string[] = [];
  const prefix = dryRun ? "[DRY RUN] " : "";

  lines.push(`${prefix}Token file write summary:`);

  const created = files.filter((f) => f.action === "create");
  const merged = files.filter((f) => f.action === "merge");
  const overwritten = files.filter((f) => f.action === "overwrite");
  const skipped = files.filter((f) => f.action === "skip");

  if (created.length > 0) {
    lines.push(`  Created: ${created.length} file(s)`);
    for (const f of created) lines.push(`    + ${f.relativePath} (${f.tokenCount} tokens)`);
  }
  if (merged.length > 0) {
    lines.push(`  Merged: ${merged.length} file(s)`);
    for (const f of merged) lines.push(`    ~ ${f.relativePath} (${f.tokenCount} tokens)`);
  }
  if (overwritten.length > 0) {
    lines.push(`  Overwritten: ${overwritten.length} file(s)`);
    for (const f of overwritten) lines.push(`    ! ${f.relativePath} (${f.tokenCount} tokens)`);
  }
  if (skipped.length > 0) {
    lines.push(`  Skipped: ${skipped.length} file(s)`);
    for (const f of skipped) lines.push(`    - ${f.relativePath} (already exists)`);
  }

  lines.push(`  Total tokens: ${totalTokens}`);

  return lines.join("\n");
}
