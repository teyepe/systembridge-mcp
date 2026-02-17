/**
 * Factory tools — MCP tools for the system factory / template engine.
 *
 * Tools:
 *   - list_templates:     Show available system templates
 *   - generate_system:    Generate tokens from a template
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { McpDsConfig, SystemTemplate } from "../lib/types.js";
import {
  loadTemplates,
  generateFromTemplate,
  type GenerationResult,
} from "../lib/factory/index.js";

// ---------------------------------------------------------------------------
// list_templates
// ---------------------------------------------------------------------------

export interface ListTemplatesResult {
  templates: Array<{
    id: string;
    name: string;
    description?: string;
    parameters: Array<{
      id: string;
      name: string;
      type: string;
      defaultValue?: unknown;
      description?: string;
    }>;
    algorithms: string[];
  }>;
  formatted: string;
}

export async function listTemplatesTool(
  projectRoot: string,
  config: McpDsConfig,
): Promise<ListTemplatesResult> {
  const templates = await loadTemplates(projectRoot, config);

  const lines: string[] = [`**${templates.length} template(s) available:**\n`];

  for (const t of templates) {
    lines.push(`  **${t.name}** (\`${t.id}\`)`);
    if (t.description) lines.push(`    ${t.description}`);
    lines.push(`    Algorithms: ${t.algorithms.join(", ")}`);
    lines.push(`    Parameters:`);
    for (const p of t.parameters) {
      const def = p.defaultValue !== undefined ? ` (default: ${JSON.stringify(p.defaultValue)})` : " (required)";
      lines.push(`      - \`${p.id}\` (${p.type}): ${p.name}${def}`);
    }
    lines.push("");
  }

  return {
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      parameters: t.parameters.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        defaultValue: p.defaultValue,
        description: p.description,
      })),
      algorithms: t.algorithms,
    })),
    formatted: lines.join("\n"),
  };
}

// ---------------------------------------------------------------------------
// generate_system
// ---------------------------------------------------------------------------

export interface GenerateSystemArgs {
  /** Template id. */
  template: string;
  /** Parameter values as JSON object. */
  params?: Record<string, unknown>;
  /** Output directory (relative to project root). */
  outputDir?: string;
  /** If true, don't write files — just preview. */
  dryRun?: boolean;
}

export interface GenerateSystemResult {
  result: GenerationResult;
  filesWritten: string[];
  formatted: string;
}

export async function generateSystemTool(
  args: GenerateSystemArgs,
  projectRoot: string,
  config: McpDsConfig,
): Promise<GenerateSystemResult> {
  const templates = await loadTemplates(projectRoot, config);
  const template = templates.find((t) => t.id === args.template);

  if (!template) {
    return {
      result: { template: args.template, files: [], tokenCount: 0 },
      filesWritten: [],
      formatted: `Template "${args.template}" not found. Use list_templates to see available options.`,
    };
  }

  const params = args.params ?? {};
  const outputDir = args.outputDir ?? "";

  try {
    const result = generateFromTemplate(template, params);
    const filesWritten: string[] = [];

    if (!args.dryRun) {
      // Write generated files.
      for (const file of result.files) {
        const filePath = path.join(projectRoot, outputDir, file.path);
        const dir = path.dirname(filePath);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(
          filePath,
          JSON.stringify(file.content, null, 2) + "\n",
          "utf-8",
        );
        filesWritten.push(path.relative(projectRoot, filePath));
      }
    }

    const prefix = args.dryRun ? "[DRY RUN] " : "";
    const lines: string[] = [
      `${prefix}**Generated from "${template.name}"**`,
      `${result.tokenCount} token(s) across ${result.files.length} file(s):\n`,
    ];

    for (const file of result.files) {
      const tokens = countTokensInContent(file.content);
      lines.push(`  ${args.dryRun ? "Would write" : "✓"} ${path.join(outputDir, file.path)} (${tokens} tokens)`);
    }

    if (!args.dryRun) {
      lines.push(
        `\n${result.files.length} file(s) written to ${outputDir || projectRoot}`,
      );
    }

    return {
      result,
      filesWritten,
      formatted: lines.join("\n"),
    };
  } catch (err) {
    return {
      result: { template: args.template, files: [], tokenCount: 0 },
      filesWritten: [],
      formatted: `Error generating from template "${args.template}": ${(err as Error).message}`,
    };
  }
}

/**
 * Rough count of token leaves in a nested W3C DT object.
 */
function countTokensInContent(obj: unknown, depth = 0): number {
  if (typeof obj !== "object" || obj === null || depth > 10) return 0;
  const record = obj as Record<string, unknown>;

  if ("$value" in record) return 1;

  let count = 0;
  for (const [key, val] of Object.entries(record)) {
    if (key.startsWith("$")) continue;
    if (typeof val === "object" && val !== null) {
      count += countTokensInContent(val, depth + 1);
    }
  }
  return count;
}
