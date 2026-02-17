/**
 * Palette MCP tools
 *
 * Tools:
 *   - generate_palette:           Generate color palettes using pluggable strategies
 *   - map_palette_to_semantics:   Map palette scales to semantic tokens
 */

import type { McpDsConfig } from "../lib/types.js";
import { loadAllTokens, resolveReferences } from "../lib/parser.js";
import {
  generatePalette,
  mapPaletteToSemantics,
  MAPPING_PRESETS,
  DEFAULT_PALETTE_STEPS,
  type PaletteConfig,
  type PaletteScaleConfig,
  type PaletteMap,
  type SemanticMappingRule,
} from "../lib/palette/index.js";
import { writeTokenFiles } from "../lib/io/writer.js";
import type { SplitStrategy, MergeStrategy } from "../lib/io/writer.js";

// ---------------------------------------------------------------------------
// generate_palette — generate color palettes
// ---------------------------------------------------------------------------

export async function generatePaletteTool(
  args: {
    strategy?: string;
    scales: string;
    steps?: string;
    colorSpace?: string;
    smooth?: boolean;
  },
  projectRoot: string,
  config: McpDsConfig,
): Promise<{ formatted: string; palette: PaletteMap }> {
  const strategy = args.strategy ?? "hsl";

  // Parse scales from JSON string or simple format
  let scaleConfigs: PaletteScaleConfig[];
  try {
    scaleConfigs = JSON.parse(args.scales);
    if (!Array.isArray(scaleConfigs)) {
      scaleConfigs = [scaleConfigs];
    }
  } catch {
    // Try simple format: "brand:220:0.7, neutral:0:0.05, success:140:0.6"
    scaleConfigs = args.scales.split(",").map((s) => {
      const parts = s.trim().split(":");
      const name = parts[0].trim();
      const hue = parts[1] ? parseFloat(parts[1]) : undefined;
      const saturation = parts[2] ? parseFloat(parts[2]) : undefined;
      return { name, hue, saturation } satisfies PaletteScaleConfig;
    });
  }

  // Parse steps
  const steps = args.steps
    ? args.steps.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
    : DEFAULT_PALETTE_STEPS;

  // Load token map for import strategy
  let tokenMap;
  if (strategy === "import") {
    tokenMap = await loadAllTokens(projectRoot, config);
    resolveReferences(tokenMap);
  }

  const paletteConfig: PaletteConfig = {
    strategy: strategy as PaletteConfig["strategy"],
    scales: scaleConfigs,
    steps,
    leonardo: args.colorSpace || args.smooth !== undefined
      ? { colorSpace: args.colorSpace, smooth: args.smooth }
      : undefined,
  };

  const palette = await generatePalette(paletteConfig, tokenMap);

  // Format output
  const lines: string[] = [];
  lines.push("# Generated Palette");
  lines.push("");
  lines.push(`Strategy: **${strategy}** | Scales: **${scaleConfigs.length}** | Steps: **${steps.length}**`);
  lines.push("");

  for (const [name, scale] of Object.entries(palette.scales)) {
    lines.push(`## ${name}`);
    if (scale.hue !== undefined) lines.push(`Hue: ${scale.hue}°`);
    lines.push("");
    lines.push("| Step | Hex | Luminance | vs White | vs Black |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const step of scale.steps) {
      const lum = step.luminance?.toFixed(3) ?? "—";
      const cwh = step.contrastOnWhite?.toFixed(2) ?? "—";
      const cwb = step.contrastOnBlack?.toFixed(2) ?? "—";
      lines.push(`| ${step.step} | ${step.hex} | ${lum} | ${cwh}:1 | ${cwb}:1 |`);
    }
    lines.push("");
  }

  return { formatted: lines.join("\n"), palette };
}

// ---------------------------------------------------------------------------
// map_palette_to_semantics — map palette to semantic tokens
// ---------------------------------------------------------------------------

export async function mapPaletteToSemanticsTool(
  args: {
    palette: string;
    preset?: string;
    rules?: string;
    uxContexts?: string;
    states?: string;
    outputDir?: string;
    dryRun?: boolean;
    mergeStrategy?: string;
    splitStrategy?: string;
  },
  projectRoot: string,
  config: McpDsConfig,
): Promise<{ formatted: string; json: unknown }> {
  // Parse palette from JSON
  let palette: PaletteMap;
  try {
    palette = JSON.parse(args.palette);
  } catch {
    throw new Error(
      "The 'palette' argument must be a valid JSON string (the result of generate_palette).",
    );
  }

  // Resolve mapping rules
  let rules: SemanticMappingRule[] | string;
  if (args.preset) {
    rules = args.preset;
  } else if (args.rules) {
    try {
      rules = JSON.parse(args.rules);
    } catch {
      throw new Error("The 'rules' argument must be valid JSON array of SemanticMappingRule objects.");
    }
  } else {
    rules = "light-mode"; // default preset
  }

  const uxContexts = args.uxContexts
    ? args.uxContexts.split(",").map((c) => c.trim()).filter(Boolean)
    : undefined;

  const states = args.states
    ? args.states.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;

  const result = mapPaletteToSemantics(palette, rules, {
    uxContexts,
    states,
  });

  // Format output
  const lines: string[] = [];
  lines.push("# Palette → Semantic Token Mapping");
  lines.push("");
  lines.push(`Generated **${result.report.totalTokens}** semantic tokens.`);
  lines.push("");
  lines.push(`Scales used: ${result.report.scalesUsed.join(", ") || "none"}`);
  lines.push(`Intents matched: ${result.report.intentsMatched.join(", ") || "none"}`);
  if (result.report.unmappedIntents.length > 0) {
    lines.push(`⚠️ Unmapped intents (missing palette scales): ${result.report.unmappedIntents.join(", ")}`);
  }
  lines.push("");

  // ---- File writing (optional) ----
  if (args.outputDir) {
    const split = (args.splitStrategy as SplitStrategy) ?? "by-context";
    const merge = (args.mergeStrategy as MergeStrategy) ?? "additive";
    const dryRun = args.dryRun ?? false;

    const writeResult = writeTokenFiles(
      result.tokens,
      args.outputDir,
      projectRoot,
      { split, merge, dryRun, filePrefix: "semantic-mapped" },
    );

    lines.push("## File Output");
    lines.push("");
    lines.push(writeResult.summary);
    lines.push("");
  } else {
    // Show token list inline
    lines.push("## Generated Tokens");
    lines.push("");
    const entries = [...result.tokens.entries()].sort(([a], [b]) => a.localeCompare(b));
    for (const [path, token] of entries.slice(0, 100)) {
      lines.push(`- \`${path}\`: ${token.value}`);
    }
    if (entries.length > 100) {
      lines.push(`  ... and ${entries.length - 100} more.`);
    }
  }

  // Build JSON output
  const jsonTokens: Record<string, { $value: unknown; $type?: string; $description?: string }> = {};
  for (const [path, token] of result.tokens) {
    jsonTokens[path] = {
      $value: token.value,
      $type: token.type,
      $description: token.description,
    };
  }

  return {
    formatted: lines.join("\n"),
    json: jsonTokens,
  };
}
