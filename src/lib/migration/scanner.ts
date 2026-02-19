/**
 * Codebase Scanner
 *
 * Scans codebase for token references across various file types
 * (TypeScript, JavaScript, CSS, SCSS, etc.)
 *
 * Finds usages so we can update them during migrations.
 */

import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TokenReference {
  /** Token path being referenced */
  tokenPath: string;
  /** File containing the reference */
  filePath: string;
  /** Line number (1-based) */
  line: number;
  /** Column number (1-based) */
  column: number;
  /** Full line content */
  lineContent: string;
  /** Reference pattern matched */
  pattern: string;
  /** File type */
  fileType: "typescript" | "javascript" | "css" | "scss" | "json" | "other";
}

export interface ScanResult {
  /** Total files scanned */
  filesScanned: number;
  /** Total references found */
  referencesFound: number;
  /** References by token path */
  referencesByToken: Map<string, TokenReference[]>;
  /** References by file */
  referencesByFile: Map<string, TokenReference[]>;
  /** Scan errors */
  errors: string[];
}

export interface ScanOptions {
  /** Root directory to scan */
  rootDir: string;
  /** File patterns to include */
  include?: string[];
  /** File patterns to exclude */
  exclude?: string[];
  /** Token prefix to look for (e.g., 'color', 'semantic') */
  tokenPrefix?: string;
  /** Maximum depth to scan */
  maxDepth?: number;
}

// ---------------------------------------------------------------------------
// Scanner
// ---------------------------------------------------------------------------

/**
 * Scan codebase for token references.
 *
 * @param options - Scan options
 * @returns Scan result with all found references
 */
export async function scanTokenReferences(
  options: ScanOptions,
): Promise<ScanResult> {
  const result: ScanResult = {
    filesScanned: 0,
    referencesFound: 0,
    referencesByToken: new Map(),
    referencesByFile: new Map(),
    errors: [],
  };

  const defaultInclude = ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.css", "**/*.scss", "**/*.json"];
  const defaultExclude = ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.git/**"];

  const include = options.include ?? defaultInclude;
  const exclude = options.exclude ?? defaultExclude;

  try {
    // Walk directory tree
    await walkDirectory(
      options.rootDir,
      async (filePath: string) => {
        // Check if file should be included
        if (!shouldIncludeFile(filePath, include, exclude)) {
          return;
        }

        // Scan file
        const refs = await scanFile(filePath, options.tokenPrefix);
        result.filesScanned++;
        result.referencesFound += refs.length;

        // Group references
        for (const ref of refs) {
          // By token
          if (!result.referencesByToken.has(ref.tokenPath)) {
            result.referencesByToken.set(ref.tokenPath, []);
          }
          result.referencesByToken.get(ref.tokenPath)!.push(ref);

          // By file
          if (!result.referencesByFile.has(ref.filePath)) {
            result.referencesByFile.set(ref.filePath, []);
          }
          result.referencesByFile.get(ref.filePath)!.push(ref);
        }
      },
      options.maxDepth ?? 10,
    );
  } catch (error) {
    result.errors.push(`Scan error: ${error}`);
  }

  return result;
}

/**
 * Scan a single file for token references.
 */
async function scanFile(
  filePath: string,
  tokenPrefix?: string,
): Promise<TokenReference[]> {
  const references: TokenReference[] = [];

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const fileType = getFileType(filePath);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Different patterns based on file type
      const patterns = getPatterns(fileType, tokenPrefix);

      for (const pattern of patterns) {
        const regex = new RegExp(pattern.regex, "g");
        let match;

        while ((match = regex.exec(line)) !== null) {
          const tokenPath = match[pattern.captureGroup ?? 1];

          // Skip if prefix specified and doesn't match
          if (tokenPrefix && !tokenPath.startsWith(tokenPrefix)) {
            continue;
          }

          references.push({
            tokenPath,
            filePath,
            line: lineNum,
            column: match.index + 1,
            lineContent: line.trim(),
            pattern: pattern.name,
            fileType,
          });
        }
      }
    }
  } catch (error) {
    // Ignore scan errors for individual files
  }

  return references;
}

/**
 * Get file type from extension.
 */
function getFileType(filePath: string): TokenReference["fileType"] {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".ts":
    case ".tsx":
      return "typescript";
    case ".js":
    case ".jsx":
      return "javascript";
    case ".css":
      return "css";
    case ".scss":
    case ".sass":
      return "scss";
    case ".json":
      return "json";
    default:
      return "other";
  }
}

/**
 * Get regex patterns for finding token references based on file type.
 */
function getPatterns(
  fileType: TokenReference["fileType"],
  tokenPrefix?: string,
): Array<{ name: string; regex: string; captureGroup?: number }> {
  const patterns: Array<{ name: string; regex: string; captureGroup?: number }> = [];

  switch (fileType) {
    case "typescript":
    case "javascript":
      // Import statements: import { color } from './tokens'
      patterns.push({
        name: "import",
        regex: String.raw`import\s+\{[^}]*\b(color|semantic|typography|spacing|component)(?:\.[a-zA-Z0-9._-]+)?\b`,
        captureGroup: 1,
      });

      // Object access: tokens['color.primary']
      patterns.push({
        name: "object-bracket",
        regex: String.raw`tokens\[['"]([a-zA-Z0-9._/-]+)['"]\]`,
      });

      // Object access: tokens.color.primary
      patterns.push({
        name: "object-dot",
        regex: String.raw`tokens\.([a-zA-Z0-9._-]+(?:\.[a-zA-Z0-9._-]+)*)`,
      });

      // Function calls: getToken('color.primary')
      patterns.push({
        name: "function-call",
        regex: String.raw`(?:getToken|useToken|token)\s*\(\s*['"]([a-zA-Z0-9._/-]+)['"]\s*\)`,
      });

      // CSS-in-JS: color: theme.colors.primary
      patterns.push({
        name: "css-in-js",
        regex: String.raw`(?:theme|tokens)\.(?:colors?|semantic|typography|spacing)\.([a-zA-Z0-9._-]+)`,
        captureGroup: 1,
      });

      break;

    case "css":
    case "scss":
      // CSS variables: var(--color-primary)
      patterns.push({
        name: "css-var",
        regex: String.raw`var\(--([a-zA-Z0-9_-]+)\)`,
      });

      // CSS custom properties definition: --color-primary: ...
      patterns.push({
        name: "css-custom-prop",
        regex: String.raw`--([a-zA-Z0-9_-]+)\s*:`,
      });

      // SCSS variables: $color-primary
      patterns.push({
        name: "scss-var",
        regex: String.raw`\$([a-zA-Z0-9_-]+)`,
      });

      break;

    case "json":
      // JSON references: { "value": "{color.primary}" }
      patterns.push({
        name: "json-ref",
        regex: String.raw`\{([a-zA-Z0-9._/-]+)\}`,
      });

      // JSON property names: "color.primary": ...
      patterns.push({
        name: "json-prop",
        regex: String.raw`"([a-zA-Z0-9._/-]+)"\s*:`,
      });

      break;
  }

  return patterns;
}

/**
 * Walk directory tree recursively.
 */
async function walkDirectory(
  dir: string,
  callback: (filePath: string) => Promise<void>,
  maxDepth: number,
  currentDepth: number = 0,
): Promise<void> {
  if (currentDepth >= maxDepth) return;

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await walkDirectory(fullPath, callback, maxDepth, currentDepth + 1);
      } else if (entry.isFile()) {
        await callback(fullPath);
      }
    }
  } catch (error) {
    // Ignore directory access errors
  }
}

/**
 * Check if file should be included based on patterns.
 */
function shouldIncludeFile(
  filePath: string,
  include: string[],
  exclude: string[],
): boolean {
  // Convert glob patterns to regex (simplified)
  const toRegex = (pattern: string): RegExp => {
    let regex = pattern
      .replace(/\./g, String.raw`\.`)
      .replace(/\*\*/g, ".*")
      .replace(/\*/g, "[^/]*")
      .replace(/\?/g, ".");
    return new RegExp(`^${regex}$`);
  };

  // Check exclude first
  for (const pattern of exclude) {
    if (toRegex(pattern).test(filePath)) {
      return false;
    }
  }

  // Check include
  for (const pattern of include) {
    if (toRegex(pattern).test(filePath)) {
      return true;
    }
  }

  return false;
}

/**
 * Update token references in a file.
 *
 * @param filePath - File to update
 * @param oldPath - Old token path
 * @param newPath - New token path
 * @returns Success status
 */
export async function updateReferencesInFile(
  filePath: string,
  oldPath: string,
  newPath: string,
): Promise<boolean> {
  try {
    let content = fs.readFileSync(filePath, "utf-8");
    const fileType = getFileType(filePath);

    // Build replacement patterns
    const replacements = buildReplacements(oldPath, newPath, fileType);

    // Apply replacements
    for (const [pattern, replacement] of replacements) {
      content = content.replace(new RegExp(pattern, "g"), replacement);
    }

    // Write back
    fs.writeFileSync(filePath, content, "utf-8");
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Build replacement patterns for different file types.
 */
function buildReplacements(
  oldPath: string,
  newPath: string,
  fileType: TokenReference["fileType"],
): Array<[string, string]> {
  const replacements: Array<[string, string]> = [];

  // Escape regex special characters
  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  const oldEscaped = escapeRegex(oldPath);

  switch (fileType) {
    case "typescript":
    case "javascript":
      // Object bracket notation
      replacements.push([
        `tokens\\[(['"])${oldEscaped}\\1\\]`,
        `tokens[$1${newPath}$1]`,
      ]);

      // Object dot notation (tricky - need word boundaries)
      const oldParts = oldPath.split(".");
      const newParts = newPath.split(".");
      if (oldParts.length === newParts.length) {
        replacements.push([
          `tokens\\.${oldParts.join(String.raw`\.`)}\\b`,
          `tokens.${newParts.join(".")}`,
        ]);
      }

      // Function calls
      replacements.push([
        `(['"])${oldEscaped}\\1`,
        `$1${newPath}$1`,
      ]);

      break;

    case "css":
    case "scss":
      // CSS variables: convert . to -
      const oldCss = oldPath.replace(/\./g, "-");
      const newCss = newPath.replace(/\./g, "-");

      replacements.push([
        `--${escapeRegex(oldCss)}\\b`,
        `--${newCss}`,
      ]);

      replacements.push([
        String.raw`\$${escapeRegex(oldCss)}\b`,
        `$${newCss}`,
      ]);

      break;

    case "json":
      // JSON references
      replacements.push([
        `\\{${oldEscaped}\\}`,
        `{${newPath}}`,
      ]);

      // JSON property names
      replacements.push([
        `"${oldEscaped}"(\\s*:)`,
        `"${newPath}"$1`,
      ]);

      break;
  }

  return replacements;
}

/**
 * Generate a scan summary report.
 */
export function generateScanReport(result: ScanResult): string {
  const lines: string[] = [];

  lines.push("# Token Reference Scan");
  lines.push("");
  lines.push(`**Files Scanned:** ${result.filesScanned}`);
  lines.push(`**References Found:** ${result.referencesFound}`);
  lines.push("");

  if (result.errors.length > 0) {
    lines.push("## Errors");
    lines.push("");
    for (const error of result.errors) {
      lines.push(`- ${error}`);
    }
    lines.push("");
  }

  // Top tokens by reference count
  const tokenCounts = Array.from(result.referencesByToken.entries())
    .map(([token, refs]) => ({ token, count: refs.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  if (tokenCounts.length > 0) {
    lines.push("## Most Referenced Tokens");
    lines.push("");
    lines.push("| Token | References |");
    lines.push("|-------|------------|");
    for (const { token, count } of tokenCounts) {
      lines.push(`| \`${token}\` | ${count} |`);
    }
    lines.push("");
  }

  // File types breakdown
  const fileTypes = new Map<string, number>();
  for (const refs of result.referencesByFile.values()) {
    for (const ref of refs) {
      fileTypes.set(ref.fileType, (fileTypes.get(ref.fileType) ?? 0) + 1);
    }
  }

  if (fileTypes.size > 0) {
    lines.push("## References by File Type");
    lines.push("");
    lines.push("| Type | Count |");
    lines.push("|------|-------|");
    for (const [type, count] of Array.from(fileTypes.entries()).sort((a, b) => b[1] - a[1])) {
      lines.push(`| ${type} | ${count} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
