/**
 * Brand tools — MCP tools for multi-brand token management.
 *
 * Tools:
 *   - list_brands:       Show configured brands
 *   - resolve_brand:     Resolve tokens for a specific brand (+theme)
 *   - diff_brands:       Compare tokens between two brands
 */
import type {
  McpDsConfig,
  BrandConfig,
  ThemeCoordinate,
} from "../lib/types.js";
import {
  DimensionRegistry,
  projectTokens,
  diffProjections,
  type TokenDiff,
} from "../lib/themes/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBrandConfig(
  config: McpDsConfig,
  brandId: string,
): BrandConfig | undefined {
  return config.brands?.brands.find((b) => b.id === brandId);
}

function buildBrandConfig(
  baseConfig: McpDsConfig,
  brand: BrandConfig,
): McpDsConfig {
  // Overlay brand-specific token paths on top of base paths.
  const tokenPaths = [
    ...baseConfig.tokenPaths,
    ...(brand.tokenPaths ?? []),
  ];

  return {
    ...baseConfig,
    tokenPaths,
  };
}

// ---------------------------------------------------------------------------
// list_brands
// ---------------------------------------------------------------------------

export interface ListBrandsResult {
  brands: BrandConfig[];
  defaultBrand?: string;
  formatted: string;
}

export function listBrandsTool(config: McpDsConfig): ListBrandsResult {
  const brands = config.brands?.brands ?? [];
  const defaultBrand = config.brands?.defaultBrand;

  if (brands.length === 0) {
    return {
      brands: [],
      formatted:
        "No brands configured. Add a `brands` section to your mcp-ds config.",
    };
  }

  const lines: string[] = [`**${brands.length} brand(s) configured:**\n`];

  for (const b of brands) {
    const isDefault = b.id === defaultBrand;
    lines.push(
      `  **${b.name}** (\`${b.id}\`)${isDefault ? " ← default" : ""}`,
    );
    if (b.description) lines.push(`    ${b.description}`);
    if (b.tokenPaths?.length) {
      lines.push(`    Extra token paths: ${b.tokenPaths.join(", ")}`);
    }
    if (b.tokenSets?.length) {
      lines.push(`    Token sets: ${b.tokenSets.join(", ")}`);
    }
    if (b.dimensionDefaults) {
      const defs = Object.entries(b.dimensionDefaults)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ");
      lines.push(`    Dimension defaults: ${defs}`);
    }
    lines.push("");
  }

  return { brands, defaultBrand, formatted: lines.join("\n") };
}

// ---------------------------------------------------------------------------
// resolve_brand
// ---------------------------------------------------------------------------

export interface ResolveBrandArgs {
  /** Brand id. */
  brand: string;
  /** Optional theme or coordinates to apply on top of brand. */
  theme?: string;
  /** Path prefix filter. */
  pathPrefix?: string;
  /** Max tokens to return. */
  limit?: number;
}

export interface ResolveBrandResult {
  brand: string;
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

export async function resolveBrandTool(
  args: ResolveBrandArgs,
  projectRoot: string,
  config: McpDsConfig,
): Promise<ResolveBrandResult> {
  const brand = getBrandConfig(config, args.brand);
  if (!brand) {
    return {
      brand: args.brand,
      coordinates: [],
      count: 0,
      tokens: [],
      formatted: `Brand "${args.brand}" not found. Use list_brands to see available brands.`,
    };
  }

  const brandConfig = buildBrandConfig(config, brand);

  // Build coordinates from brand dimension defaults + optional theme.
  let coordinates: ThemeCoordinate[] = [];
  if (brand.dimensionDefaults) {
    coordinates = Object.entries(brand.dimensionDefaults).map(
      ([dimension, value]) => ({ dimension, value }),
    );
  }

  // If theming is configured, use the registry.
  const hasDimensions = (config.theming?.dimensions?.length ?? 0) > 0;
  if (hasDimensions) {
    const registry = DimensionRegistry.fromConfig(config.theming!);

    // Merge theme coordinates on top of brand defaults.
    if (args.theme) {
      const theme = registry.getTheme(args.theme);
      if (theme) {
        // Named theme — merge its coordinates.
        for (const c of theme.coordinates) {
          const existing = coordinates.findIndex(
            (e) => e.dimension === c.dimension,
          );
          if (existing >= 0) {
            coordinates[existing] = c;
          } else {
            coordinates.push(c);
          }
        }
      }
    }

    const projection = await projectTokens(
      projectRoot,
      brandConfig,
      registry,
      coordinates,
    );

    let tokens = [...projection.tokens.values()];
    if (args.pathPrefix) {
      tokens = tokens.filter((t) => t.path.startsWith(args.pathPrefix!));
    }
    const limited = args.limit ? tokens.slice(0, args.limit) : tokens;

    const coordStr = projection.coordinates
      .map((c) => `${c.dimension}=${c.value}`)
      .join(", ");

    const lines: string[] = [
      `**Brand "${brand.name}" resolved** (${coordStr})`,
      `Showing ${limited.length} of ${tokens.length} tokens:\n`,
    ];

    for (const t of limited) {
      const val = t.resolvedValue ?? t.value;
      lines.push(`  \`${t.path}\`: ${JSON.stringify(val)}`);
    }

    return {
      brand: args.brand,
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

  // No dimensions — just load brand tokens directly.
  const { loadAllTokens, resolveReferences } = await import(
    "../lib/parser.js"
  );
  const tokenMap = await loadAllTokens(projectRoot, brandConfig);
  resolveReferences(tokenMap);

  let tokens = [...tokenMap.values()];
  if (args.pathPrefix) {
    tokens = tokens.filter((t) => t.path.startsWith(args.pathPrefix!));
  }
  const limited = args.limit ? tokens.slice(0, args.limit) : tokens;

  const lines: string[] = [
    `**Brand "${brand.name}" resolved**`,
    `Showing ${limited.length} of ${tokens.length} tokens:\n`,
  ];

  for (const t of limited) {
    const val = t.resolvedValue ?? t.value;
    lines.push(`  \`${t.path}\`: ${JSON.stringify(val)}`);
  }

  return {
    brand: args.brand,
    coordinates: [],
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
// diff_brands
// ---------------------------------------------------------------------------

export interface DiffBrandsArgs {
  brandA: string;
  brandB: string;
  /** Optional theme to apply to both brands. */
  theme?: string;
  pathPrefix?: string;
}

export interface DiffBrandsResult {
  diffs: TokenDiff[];
  formatted: string;
}

export async function diffBrandsTool(
  args: DiffBrandsArgs,
  projectRoot: string,
  config: McpDsConfig,
): Promise<DiffBrandsResult> {
  // Resolve both brands independently and diff the results.
  const [resultA, resultB] = await Promise.all([
    resolveBrandTool(
      { brand: args.brandA, theme: args.theme, pathPrefix: args.pathPrefix },
      projectRoot,
      config,
    ),
    resolveBrandTool(
      { brand: args.brandB, theme: args.theme, pathPrefix: args.pathPrefix },
      projectRoot,
      config,
    ),
  ]);

  // Build a simple diff from the resolved token lists.
  const mapA = new Map(resultA.tokens.map((t) => [t.path, t]));
  const mapB = new Map(resultB.tokens.map((t) => [t.path, t]));
  const allPaths = new Set([...mapA.keys(), ...mapB.keys()]);

  const diffs: TokenDiff[] = [];
  for (const path of [...allPaths].sort()) {
    const tA = mapA.get(path);
    const tB = mapB.get(path);

    if (!tA) {
      diffs.push({
        path,
        valueA: undefined,
        valueB: tB!.resolvedValue ?? tB!.value,
        status: "added",
      });
    } else if (!tB) {
      diffs.push({
        path,
        valueA: tA.resolvedValue ?? tA.value,
        valueB: undefined,
        status: "removed",
      });
    } else {
      const valA = JSON.stringify(tA.resolvedValue ?? tA.value);
      const valB = JSON.stringify(tB.resolvedValue ?? tB.value);
      if (valA !== valB) {
        diffs.push({
          path,
          valueA: tA.resolvedValue ?? tA.value,
          valueB: tB.resolvedValue ?? tB.value,
          status: "changed",
        });
      }
    }
  }

  const lines: string[] = [
    `**Brand Diff: ${args.brandA} ↔ ${args.brandB}**`,
    `${diffs.length} difference(s):\n`,
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
  }

  if (added.length > 0) {
    lines.push(`  **Only in ${args.brandB} (${added.length}):**`);
    for (const d of added) {
      lines.push(`    \`${d.path}\`: ${JSON.stringify(d.valueB)}`);
    }
  }

  if (removed.length > 0) {
    lines.push(`  **Only in ${args.brandA} (${removed.length}):**`);
    for (const d of removed) {
      lines.push(`    \`${d.path}\`: ${JSON.stringify(d.valueA)}`);
    }
  }

  if (diffs.length === 0) {
    lines.push("  Brands are identical for the selected tokens.");
  }

  return { diffs, formatted: lines.join("\n") };
}
