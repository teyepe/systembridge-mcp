/**
 * Projection Engine — resolves tokens for a given set of dimensional coordinates.
 *
 * The projection engine takes the full token map (which may include conditional
 * values for different dimensions) and "projects" it down to a flat,
 * resolved token map for a specific point in the dimensional space.
 *
 * Resolution strategy (in priority order):
 *   1. Token set overlays: files mapped to coordinates override base values
 *   2. $extensions conditions: per-token conditional values
 *   3. Base values: the default when no condition matches
 */
import type {
  DesignToken,
  TokenMap,
  ThemeCoordinate,
  ConditionalTokenValue,
  TokenSet,
  McpDsConfig,
} from "../types.js";
import { loadAllTokens, resolveReferences } from "../parser.js";
import { DimensionRegistry } from "./dimensions.js";

// ---------------------------------------------------------------------------
// Conditional value resolution
// ---------------------------------------------------------------------------

/**
 * Score how well a set of conditions matches the target coordinates.
 * Returns -1 if the condition does NOT match (a coordinate conflicts).
 * Returns 0+ for the number of matching coordinates (higher = more specific).
 */
function scoreCondition(
  condition: ThemeCoordinate[],
  target: ThemeCoordinate[],
): number {
  const targetMap = new Map(target.map((c) => [c.dimension, c.value]));
  let score = 0;

  for (const cond of condition) {
    const targetValue = targetMap.get(cond.dimension);
    if (targetValue === undefined) {
      // Dimension not in target — condition doesn't apply but doesn't conflict.
      continue;
    }
    if (targetValue !== cond.value) {
      // Explicit conflict — this condition does NOT match.
      return -1;
    }
    score++;
  }

  return score;
}

/**
 * Resolve conditional values for a single token against target coordinates.
 *
 * Picks the condition with the highest score (most specific match).
 * If no conditions match, returns the token's base value.
 */
function resolveConditionalValue(
  token: DesignToken,
  targetCoords: ThemeCoordinate[],
): unknown {
  const conditions = token.extensions?.[
    "com.mcp-ds.conditions"
  ] as ConditionalTokenValue[] | undefined;

  if (!conditions || conditions.length === 0) {
    return token.value;
  }

  let bestScore = -1;
  let bestValue: unknown = token.value;

  for (const cond of conditions) {
    const score = scoreCondition(cond.when, targetCoords);
    if (score > bestScore) {
      bestScore = score;
      bestValue = cond.value;
    }
  }

  return bestValue;
}

// ---------------------------------------------------------------------------
// Token set loading
// ---------------------------------------------------------------------------

/**
 * Load tokens from specific token sets that match the target coordinates.
 *
 * Token sets are loaded in order of specificity: base sets first,
 * then more specific sets override.
 */
async function loadTokenSets(
  projectRoot: string,
  config: McpDsConfig,
  targetCoords: ThemeCoordinate[],
): Promise<TokenMap> {
  const sets = config.theming?.tokenSets ?? [];
  if (sets.length === 0) {
    // No token sets configured — load everything.
    return loadAllTokens(projectRoot, config);
  }

  // Score and sort sets: base (no coordinates) first, then by match score.
  const scoredSets: Array<{ set: TokenSet; score: number }> = [];
  for (const set of sets) {
    if (set.coordinates.length === 0) {
      // Base set — always included.
      scoredSets.push({ set, score: 0 });
      continue;
    }
    const score = scoreCondition(set.coordinates, targetCoords);
    if (score >= 0) {
      scoredSets.push({ set, score });
    }
  }

  scoredSets.sort((a, b) => a.score - b.score);

  // Load sets in order, later sets override earlier ones.
  const merged: TokenMap = new Map();
  for (const { set } of scoredSets) {
    const setConfig = { ...config, tokenPaths: set.paths };
    const setTokens = await loadAllTokens(projectRoot, setConfig);
    for (const [path, token] of setTokens) {
      merged.set(path, token);
    }
  }

  return merged;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ProjectionResult {
  /** The resolved token map for the given coordinates. */
  tokens: TokenMap;
  /** The fully-qualified coordinates used (with defaults filled in). */
  coordinates: ThemeCoordinate[];
  /** Coordinate key for caching. */
  key: string;
  /** Token count. */
  count: number;
}

/**
 * Project the token system to a specific point in dimensional space.
 *
 * @param projectRoot  Project root directory.
 * @param config       MCP-DS config.
 * @param registry     Dimension registry.
 * @param coordinates  Target coordinates or theme id.
 */
export async function projectTokens(
  projectRoot: string,
  config: McpDsConfig,
  registry: DimensionRegistry,
  coordinates: string | ThemeCoordinate[],
): Promise<ProjectionResult> {
  // 1. Resolve coordinates to a fully-qualified set.
  const resolvedCoords = registry.resolveCoordinates(coordinates);
  const key = registry.coordinateKey(resolvedCoords);

  // 2. Load tokens — either via token sets or all at once.
  const hasSets = (config.theming?.tokenSets?.length ?? 0) > 0;
  let tokenMap: TokenMap;

  if (hasSets) {
    tokenMap = await loadTokenSets(projectRoot, config, resolvedCoords);
  } else {
    tokenMap = await loadAllTokens(projectRoot, config);
  }

  // 3. Apply conditional values based on target coordinates.
  for (const [path, token] of tokenMap) {
    const condValue = resolveConditionalValue(token, resolvedCoords);
    if (condValue !== token.value) {
      tokenMap.set(path, { ...token, value: condValue });
    }
  }

  // 4. Resolve references after overlays.
  resolveReferences(tokenMap);

  return {
    tokens: tokenMap,
    coordinates: resolvedCoords,
    key,
    count: tokenMap.size,
  };
}

/**
 * Diff two projections — find tokens that differ between two coordinate sets.
 *
 * Useful for: "what changes between light and dark?"
 */
export interface TokenDiff {
  path: string;
  /** The value in projection A. */
  valueA: unknown;
  /** The value in projection B. */
  valueB: unknown;
  /** Whether the token only exists in one projection. */
  status: "changed" | "added" | "removed";
}

export async function diffProjections(
  projectRoot: string,
  config: McpDsConfig,
  registry: DimensionRegistry,
  coordsA: string | ThemeCoordinate[],
  coordsB: string | ThemeCoordinate[],
): Promise<{
  coordsA: ThemeCoordinate[];
  coordsB: ThemeCoordinate[];
  diffs: TokenDiff[];
  totalA: number;
  totalB: number;
}> {
  const [projA, projB] = await Promise.all([
    projectTokens(projectRoot, config, registry, coordsA),
    projectTokens(projectRoot, config, registry, coordsB),
  ]);

  const diffs: TokenDiff[] = [];
  const allPaths = new Set([
    ...projA.tokens.keys(),
    ...projB.tokens.keys(),
  ]);

  for (const path of allPaths) {
    const tokenA = projA.tokens.get(path);
    const tokenB = projB.tokens.get(path);

    if (!tokenA) {
      diffs.push({
        path,
        valueA: undefined,
        valueB: tokenB!.resolvedValue ?? tokenB!.value,
        status: "added",
      });
    } else if (!tokenB) {
      diffs.push({
        path,
        valueA: tokenA.resolvedValue ?? tokenA.value,
        valueB: undefined,
        status: "removed",
      });
    } else {
      const valA = JSON.stringify(tokenA.resolvedValue ?? tokenA.value);
      const valB = JSON.stringify(tokenB.resolvedValue ?? tokenB.value);
      if (valA !== valB) {
        diffs.push({
          path,
          valueA: tokenA.resolvedValue ?? tokenA.value,
          valueB: tokenB.resolvedValue ?? tokenB.value,
          status: "changed",
        });
      }
    }
  }

  return {
    coordsA: projA.coordinates,
    coordsB: projB.coordinates,
    diffs: diffs.sort((a, b) => a.path.localeCompare(b.path)),
    totalA: projA.count,
    totalB: projB.count,
  };
}
