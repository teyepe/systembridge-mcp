/**
 * Style extraction tools.
 *
 * extract_styles: Reverse-engineer design tokens from CSS/SCSS files.
 */

import * as path from "node:path";
import type { DesignToken, McpDsConfig } from "../lib/types.js";
import { extractStyles } from "../lib/styles/extractor.js";
import { writeTokenFiles } from "../lib/io/writer.js";
import {
  tokensToW3C,
  tokensToTokensStudio,
} from "../lib/figma/extractor.js";

export interface ExtractStylesToolResult {
  formatted: string;
  json: {
    tokens: Array<{ path: string; value: unknown; type?: string }>;
    summary: {
      total: number;
      byType: Record<string, number>;
      byCollection: Record<string, number>;
      filesScanned: number;
    };
    collections: string[];
    warnings: string[];
    filesWritten?: string[];
  };
}

const DEFAULT_STYLE_PATHS = [
  "src/**/*.css",
  "src/**/*.scss",
  "styles/**/*.css",
  "styles/**/*.scss",
];

/**
 * Extract design tokens from CSS and SCSS files.
 */
export async function extractStylesTool(
  args: {
    stylePaths?: string[];
    outputFormat?: "w3c-design-tokens" | "tokens-studio" | "flat";
    writeToTokens?: boolean;
  },
  projectRoot: string,
  config: McpDsConfig,
): Promise<ExtractStylesToolResult> {
  const stylePaths =
    args.stylePaths && args.stylePaths.length > 0
      ? args.stylePaths
      : config.stylePaths ?? DEFAULT_STYLE_PATHS;

  const outputFormat = args.outputFormat ?? "w3c-design-tokens";
  const writeToTokens = args.writeToTokens ?? false;

  const result = await extractStyles({
    projectRoot,
    stylePaths,
    excludePaths: config.migration?.excludePaths,
  });

  const lines: string[] = [];
  lines.push("# Style Token Extraction");
  lines.push("");
  lines.push(
    `**Total Tokens:** ${result.summary.total} from **${result.summary.filesScanned}** file(s)`
  );
  lines.push(`**Format:** ${outputFormat}`);
  lines.push("");

  lines.push("## By Type");
  lines.push("");
  for (const [type, count] of Object.entries(result.summary.byType)) {
    lines.push(`- **${type}:** ${count}`);
  }
  lines.push("");

  lines.push("## By Collection");
  lines.push("");
  for (const [collection, count] of Object.entries(result.summary.byCollection)) {
    lines.push(`- **${collection}:** ${count}`);
  }
  lines.push("");

  if (result.warnings.length > 0) {
    lines.push("## Warnings");
    lines.push("");
    for (const warning of result.warnings) {
      lines.push(`- ${warning}`);
    }
    lines.push("");
  }

  let filesWritten: string[] | undefined;

  if (writeToTokens && result.tokens.length > 0) {
    const tokenMap = new Map<string, DesignToken>();
    for (const t of result.tokens) {
      tokenMap.set(t.path, t);
    }
    const outputDir = inferOutputDir(config);
    const writeResult = writeTokenFiles(
      tokenMap,
      outputDir,
      projectRoot,
      { split: "single", merge: "overwrite", dryRun: false, filePrefix: "extracted-from-styles" }
    );
    filesWritten = writeResult.files.map((f) => path.relative(projectRoot, f.filePath));
    lines.push("## Files Written");
    lines.push("");
    for (const f of filesWritten) {
      lines.push(`- \`${f}\``);
    }
    lines.push("");
  }

  if (result.tokens.length > 0) {
    lines.push("## Sample Tokens (first 10)");
    lines.push("");
    lines.push("```json");
    const sample = result.tokens.slice(0, 10);
    let formatted: Record<string, unknown>;
    if (outputFormat === "w3c-design-tokens") {
      formatted = tokensToW3C(sample);
    } else if (outputFormat === "tokens-studio") {
      formatted = tokensToTokensStudio(sample);
    } else {
      formatted = {};
      for (const token of sample) {
        formatted[token.path] = token.value;
      }
    }
    lines.push(JSON.stringify(formatted, null, 2));
    lines.push("```");
    lines.push("");
  }

  lines.push("---");
  if (writeToTokens && filesWritten && filesWritten.length > 0) {
    lines.push("");
    lines.push(`Tokens written to ${filesWritten.join(", ")}.`);
  } else {
    lines.push("");
    lines.push(
      "Set `writeToTokens: true` to save extracted tokens to your tokenPaths directory."
    );
  }

  return {
    formatted: lines.join("\n"),
    json: {
      tokens: result.tokens.map((t) => ({
        path: t.path,
        value: t.value,
        type: t.type,
      })),
      summary: result.summary,
      collections: result.collections,
      warnings: result.warnings,
      filesWritten,
    },
  };
}

function inferOutputDir(config: McpDsConfig): string {
  const tokenPaths = config.tokenPaths ?? ["tokens/**/*.json"];
  const first = tokenPaths[0];
  if (!first) return "tokens";
  const parts = first.split("/");
  if (parts[0] && !parts[0].includes("*")) {
    return parts[0];
  }
  return "tokens";
}
