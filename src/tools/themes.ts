/**
 * Theme tools — MCP tools for multi-dimensional theming.
 *
 * Tools:
 *   - list_dimensions:  Show available dimensions and their values
 *   - list_themes:      Show named theme presets
 *   - resolve_theme:    Resolve tokens for a given theme/coordinate set
 *   - diff_themes:      Compare tokens between two themes
 *   - create_theme:     Define a new named theme from coordinates
 */
import type { McpDsConfig, ThemeCoordinate, ThemeDefinition } from "../lib/types.js";
import {
  DimensionRegistry,
  projectTokens,
  diffProjections,
  type TokenDiff,
} from "../lib/themes/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRegistry(config: McpDsConfig): DimensionRegistry | null {
  if (!config.theming?.dimensions?.length) return null;
  return DimensionRegistry.fromConfig(config.theming);
}

function parseCoordinates(input: string): ThemeCoordinate[] {
  // Accept formats:
  //   "color-scheme=dark,density=compact"
  //   "color-scheme:dark density:compact"
  //   JSON array
  const trimmed = input.trim();

  // Try JSON first.
  if (trimmed.startsWith("[")) {
    return JSON.parse(trimmed) as ThemeCoordinate[];
  }

  // Key=value or key:value separated by comma or space.
  return trimmed
    .split(/[,\s]+/)
    .filter(Boolean)
    .map((pair) => {
      const [dimension, value] = pair.split(/[=:]/);
      return { dimension: dimension.trim(), value: value.trim() };
    });
}

// ---------------------------------------------------------------------------
// list_dimensions
// ---------------------------------------------------------------------------

export interface ListDimensionsResult {
  dimensions: Array<{
    id: string;
    name: string;
    description?: string;
    values: string[];
    defaultValue: string;
    figmaCollection?: string;
  }>;
  formatted: string;
}

export function listDimensionsTool(config: McpDsConfig): ListDimensionsResult {
  const registry = getRegistry(config);
  if (!registry) {
    return {
      dimensions: [],
      formatted: "No dimensions configured. Add a `theming.dimensions` array to your mcp-ds config.",
    };
  }

  const dims = registry.getAllDimensions();
  const lines: string[] = [`**${dims.length} dimension(s) configured:**\n`];

  for (const dim of dims) {
    lines.push(`  **${dim.name}** (\`${dim.id}\`)`);
    if (dim.description) lines.push(`    ${dim.description}`);
    lines.push(`    Values: ${dim.values.map((v) => (v === dim.defaultValue ? `**${v}** (default)` : v)).join(", ")}`);
    if (dim.figmaCollection) lines.push(`    Figma collection: ${dim.figmaCollection}`);
    lines.push("");
  }

  const combos = registry.enumerateAllCombinations();
  lines.push(`Total combinations: ${combos.length}`);

  return {
    dimensions: dims.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      values: d.values,
      defaultValue: d.defaultValue,
      figmaCollection: d.figmaCollection,
    })),
    formatted: lines.join("\n"),
  };
}

// ---------------------------------------------------------------------------
// list_themes
// ---------------------------------------------------------------------------

export interface ListThemesResult {
  themes: ThemeDefinition[];
  formatted: string;
}

export function listThemesTool(config: McpDsConfig): ListThemesResult {
  const registry = getRegistry(config);
  if (!registry) {
    return {
      themes: [],
      formatted: "No themes configured.",
    };
  }

  const themes = registry.getAllThemes();
  if (themes.length === 0) {
    return {
      themes: [],
      formatted: "No named themes defined. Themes can be defined in `theming.themes` in your config.",
    };
  }

  const lines: string[] = [`**${themes.length} named theme(s):**\n`];
  for (const theme of themes) {
    const coords = theme.coordinates
      .map((c) => `${c.dimension}=${c.value}`)
      .join(", ");
    lines.push(`  **${theme.name}** (\`${theme.id}\`)`);
    if (theme.description) lines.push(`    ${theme.description}`);
    lines.push(`    Coordinates: ${coords}`);
    lines.push("");
  }

  return { themes, formatted: lines.join("\n") };
}

// ---------------------------------------------------------------------------
// resolve_theme
// ---------------------------------------------------------------------------

export interface ResolveThemeArgs {
  /** Named theme id OR coordinate string like "color-scheme=dark,density=compact". */
  theme: string;
  /** Optional path prefix filter. */
  pathPrefix?: string;
  /** Max tokens to return (default: all). */
  limit?: number;
}

export interface ResolveThemeResult {
  coordinates: ThemeCoordinate[];
  count: number;
  tokens: Array<{
    path: string;
    value: unknown;
    resolvedValue?: unknown;
    type?: string;
  }>;
  formatted: string;
}

export async function resolveThemeTool(
  args: ResolveThemeArgs,
  projectRoot: string,
  config: McpDsConfig,
): Promise<ResolveThemeResult> {
  const registry = getRegistry(config);
  if (!registry) {
    return {
      coordinates: [],
      count: 0,
      tokens: [],
      formatted: "No dimensions configured. Cannot resolve themes.",
    };
  }

  // Determine if args.theme is a named theme or coordinates.
  let coordinates: string | ThemeCoordinate[];
  const theme = registry.getTheme(args.theme);
  if (theme) {
    coordinates = args.theme;
  } else {
    coordinates = parseCoordinates(args.theme);
  }

  const projection = await projectTokens(
    projectRoot,
    config,
    registry,
    coordinates,
  );

  let tokens = [...projection.tokens.values()];

  // Apply path prefix filter.
  if (args.pathPrefix) {
    tokens = tokens.filter((t) =>
      t.path.startsWith(args.pathPrefix!),
    );
  }

  // Apply limit.
  const limited = args.limit ? tokens.slice(0, args.limit) : tokens;

  // Format output.
  const coordStr = projection.coordinates
    .map((c) => `${c.dimension}=${c.value}`)
    .join(", ");

  const lines: string[] = [
    `**Theme resolved** (${coordStr})`,
    `Showing ${limited.length} of ${tokens.length} tokens:\n`,
  ];

  for (const t of limited) {
    const val = t.resolvedValue ?? t.value;
    const ref =
      t.resolvedValue !== undefined && t.resolvedValue !== t.value
        ? ` (ref: ${JSON.stringify(t.value)})`
        : "";
    lines.push(`  \`${t.path}\`: ${JSON.stringify(val)}${ref}`);
  }

  if (args.limit && tokens.length > args.limit) {
    lines.push(`\n  ... and ${tokens.length - args.limit} more`);
  }

  return {
    coordinates: projection.coordinates,
    count: tokens.length,
    tokens: limited.map((t) => ({
      path: t.path,
      value: t.value,
      resolvedValue: t.resolvedValue,
      type: t.type,
    })),
    formatted: lines.join("\n"),
  };
}

// ---------------------------------------------------------------------------
// diff_themes
// ---------------------------------------------------------------------------

export interface DiffThemesArgs {
  /** First theme (named id or coordinates). */
  themeA: string;
  /** Second theme (named id or coordinates). */
  themeB: string;
  /** Only show diffs for tokens matching this path prefix. */
  pathPrefix?: string;
}

export interface DiffThemesResult {
  diffs: TokenDiff[];
  formatted: string;
}

export async function diffThemesTool(
  args: DiffThemesArgs,
  projectRoot: string,
  config: McpDsConfig,
): Promise<DiffThemesResult> {
  const registry = getRegistry(config);
  if (!registry) {
    return {
      diffs: [],
      formatted: "No dimensions configured. Cannot diff themes.",
    };
  }

  const resolveInput = (s: string): string | ThemeCoordinate[] => {
    const theme = registry.getTheme(s);
    return theme ? s : parseCoordinates(s);
  };

  const result = await diffProjections(
    projectRoot,
    config,
    registry,
    resolveInput(args.themeA),
    resolveInput(args.themeB),
  );

  let diffs = result.diffs;

  // Apply path prefix filter.
  if (args.pathPrefix) {
    diffs = diffs.filter((d) => d.path.startsWith(args.pathPrefix!));
  }

  const labelA = args.themeA;
  const labelB = args.themeB;

  const lines: string[] = [
    `**Theme Diff: ${labelA} ↔ ${labelB}**`,
    `${diffs.length} difference(s) found:\n`,
  ];

  const changed = diffs.filter((d) => d.status === "changed");
  const added = diffs.filter((d) => d.status === "added");
  const removed = diffs.filter((d) => d.status === "removed");

  if (changed.length > 0) {
    lines.push(`  **Changed (${changed.length}):**`);
    for (const d of changed) {
      lines.push(
        `    \`${d.path}\`: ${JSON.stringify(d.valueA)} → ${JSON.stringify(d.valueB)}`,
      );
    }
    lines.push("");
  }

  if (added.length > 0) {
    lines.push(`  **Added in ${labelB} (${added.length}):**`);
    for (const d of added) {
      lines.push(`    \`${d.path}\`: ${JSON.stringify(d.valueB)}`);
    }
    lines.push("");
  }

  if (removed.length > 0) {
    lines.push(`  **Removed from ${labelB} (${removed.length}):**`);
    for (const d of removed) {
      lines.push(`    \`${d.path}\`: ${JSON.stringify(d.valueA)}`);
    }
    lines.push("");
  }

  if (diffs.length === 0) {
    lines.push("  No differences found — the themes are identical.");
  }

  return {
    diffs,
    formatted: lines.join("\n"),
  };
}
