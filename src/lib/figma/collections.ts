/**
 * Figma Collections Mapper — maps between Figma variable collections
 * and the multi-dimensional token system.
 *
 * Figma organises variables into:
 *   - Collections: groups of related variables (e.g. "Colors", "Sizing")
 *   - Modes:       variants within a collection (e.g. "Light", "Dark")
 *
 * This mapper:
 *   1. Maps Figma collection modes ↔ token dimensions
 *   2. Generates Figma-compatible export structures
 *   3. Parses Tokens Studio `$themes` / `$metadata` into dimensions
 */
import type {
  TokenDimension,
  ThemeCoordinate,
  ThemeDefinition,
  TokenSet,
  DimensionsConfig,
} from "../types.js";

// ---------------------------------------------------------------------------
// Figma ↔ Dimension mapping
// ---------------------------------------------------------------------------

/**
 * A mapping entry between a Figma collection mode and a dimensional coordinate.
 */
export interface FigmaCollectionMapping {
  /** Figma collection name. */
  collection: string;
  /** Figma mode name within the collection. */
  mode: string;
  /** Corresponding dimension id. */
  dimensionId: string;
  /** Corresponding dimension value. */
  dimensionValue: string;
}

/**
 * Infer dimension → Figma collection mappings from dimensions config.
 *
 * Uses the `figmaCollection` field on dimensions, and creates a mode
 * for each dimension value.
 */
export function inferFigmaMappings(
  dimensions: TokenDimension[],
): FigmaCollectionMapping[] {
  const mappings: FigmaCollectionMapping[] = [];

  for (const dim of dimensions) {
    const collection = dim.figmaCollection ?? dim.name;
    for (const value of dim.values) {
      mappings.push({
        collection,
        mode: value,
        dimensionId: dim.id,
        dimensionValue: value,
      });
    }
  }

  return mappings;
}

/**
 * Convert Figma collection+mode selections to dimensional coordinates.
 */
export function figmaSelectionToCoordinates(
  selections: Array<{ collection: string; mode: string }>,
  mappings: FigmaCollectionMapping[],
): ThemeCoordinate[] {
  const coords: ThemeCoordinate[] = [];

  for (const sel of selections) {
    const mapping = mappings.find(
      (m) => m.collection === sel.collection && m.mode === sel.mode,
    );
    if (mapping) {
      coords.push({
        dimension: mapping.dimensionId,
        value: mapping.dimensionValue,
      });
    }
  }

  return coords;
}

/**
 * Convert dimensional coordinates to Figma collection+mode selections.
 */
export function coordinatesToFigmaSelection(
  coords: ThemeCoordinate[],
  mappings: FigmaCollectionMapping[],
): Array<{ collection: string; mode: string }> {
  const selections: Array<{ collection: string; mode: string }> = [];

  for (const coord of coords) {
    const mapping = mappings.find(
      (m) =>
        m.dimensionId === coord.dimension &&
        m.dimensionValue === coord.value,
    );
    if (mapping) {
      selections.push({
        collection: mapping.collection,
        mode: mapping.mode,
      });
    }
  }

  return selections;
}

// ---------------------------------------------------------------------------
// Tokens Studio $themes / $metadata parsing
// ---------------------------------------------------------------------------

/**
 * Tokens Studio theme entry (from `$themes` array in token files).
 */
interface TokensStudioTheme {
  id: string;
  name: string;
  group?: string;
  selectedTokenSets: Record<string, "enabled" | "disabled" | "source">;
}

/**
 * Parse Tokens Studio `$themes` metadata into our DimensionsConfig.
 *
 * Tokens Studio groups themes into "groups" which map well to our
 * dimension concept. Each group becomes a dimension, each theme in
 * that group becomes a value.
 */
export function parseTokensStudioThemes(
  themes: TokensStudioTheme[],
  tokenSetsMetadata?: Record<string, unknown>,
): Partial<DimensionsConfig> {
  // Group themes by their group name.
  const groups = new Map<string, TokensStudioTheme[]>();

  for (const theme of themes) {
    const group = theme.group ?? "default";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(theme);
  }

  const dimensions: TokenDimension[] = [];
  const themeDefinitions: ThemeDefinition[] = [];
  const tokenSets: TokenSet[] = [];

  for (const [group, groupThemes] of groups) {
    // Each group → one dimension.
    const dimId = group.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const values = groupThemes.map((t) => t.name.toLowerCase());

    dimensions.push({
      id: dimId,
      name: group,
      values,
      defaultValue: values[0],
      figmaCollection: group,
    });

    // Each theme → one named ThemeDefinition with a single coordinate.
    for (const theme of groupThemes) {
      const themeId = `${dimId}-${theme.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      themeDefinitions.push({
        id: themeId,
        name: theme.name,
        coordinates: [
          {
            dimension: dimId,
            value: theme.name.toLowerCase(),
          },
        ],
      });

      // Map selected token sets to this coordinate.
      for (const [setName, status] of Object.entries(
        theme.selectedTokenSets,
      )) {
        if (status === "enabled" || status === "source") {
          // See if we already have a token set for this.
          let existing = tokenSets.find((s) => s.id === setName);
          if (!existing) {
            existing = {
              id: setName,
              name: setName,
              paths: [`${setName}/**/*.json`, `${setName}/**/*.json5`],
              coordinates: [],
            };
            tokenSets.push(existing);
          }

          // Only add the coordinate if this set isn't a "source" (base) set.
          if (status === "enabled") {
            existing.coordinates.push({
              dimension: dimId,
              value: theme.name.toLowerCase(),
            });
          }
        }
      }
    }
  }

  return {
    dimensions,
    themes: themeDefinitions,
    tokenSets,
  };
}

// ---------------------------------------------------------------------------
// Figma export structure
// ---------------------------------------------------------------------------

/**
 * Generate a Figma-compatible variable structure from tokens and dimensions.
 *
 * Returns a structure that can be used with the Figma Variables REST API
 * or Figma plugin APIs.
 */
export interface FigmaVariableExport {
  collections: Array<{
    name: string;
    modes: string[];
    variables: Array<{
      name: string;
      type: string;
      valuesByMode: Record<string, unknown>;
    }>;
  }>;
}

export function generateFigmaExport(
  tokensByCoordinate: Map<string, Map<string, unknown>>,
  mappings: FigmaCollectionMapping[],
  dimensions: TokenDimension[],
): FigmaVariableExport {
  // Group mappings by collection.
  const collectionMap = new Map<
    string,
    Array<{ mode: string; dimId: string; dimValue: string }>
  >();

  for (const m of mappings) {
    if (!collectionMap.has(m.collection)) {
      collectionMap.set(m.collection, []);
    }
    collectionMap.get(m.collection)!.push({
      mode: m.mode,
      dimId: m.dimensionId,
      dimValue: m.dimensionValue,
    });
  }

  const collections: FigmaVariableExport["collections"] = [];

  for (const [collectionName, modes] of collectionMap) {
    const modeNames = modes.map((m) => m.mode);

    // Gather all unique token paths across all modes.
    const allPaths = new Set<string>();
    for (const mode of modes) {
      const key = `${mode.dimId}=${mode.dimValue}`;
      const tokens = tokensByCoordinate.get(key);
      if (tokens) {
        for (const path of tokens.keys()) {
          allPaths.add(path);
        }
      }
    }

    const variables: FigmaVariableExport["collections"][number]["variables"] =
      [];

    for (const tokenPath of [...allPaths].sort()) {
      const valuesByMode: Record<string, unknown> = {};
      let varType = "STRING";

      for (const mode of modes) {
        const key = `${mode.dimId}=${mode.dimValue}`;
        const tokens = tokensByCoordinate.get(key);
        const value = tokens?.get(tokenPath);

        if (value !== undefined) {
          valuesByMode[mode.mode] = value;

          // Infer Figma variable type.
          if (typeof value === "string" && value.startsWith("#")) {
            varType = "COLOR";
          } else if (typeof value === "number") {
            varType = "FLOAT";
          } else if (typeof value === "boolean") {
            varType = "BOOLEAN";
          }
        }
      }

      variables.push({
        name: tokenPath.replace(/\./g, "/"),
        type: varType,
        valuesByMode,
      });
    }

    collections.push({
      name: collectionName,
      modes: modeNames,
      variables,
    });
  }

  return { collections };
}
