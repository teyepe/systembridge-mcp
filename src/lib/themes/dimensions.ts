/**
 * Dimension Registry — manages the axes along which tokens can vary.
 *
 * A "dimension" is an independent axis of variation:
 *   - color-scheme: light | dark
 *   - density:      compact | comfortable | spacious
 *   - contrast:     standard | high
 *   - brand:        alpha | beta
 *
 * The registry validates, stores, and queries these dimensions.
 */
import type {
  TokenDimension,
  ThemeDefinition,
  ThemeCoordinate,
  DimensionsConfig,
} from "../types.js";

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export class DimensionRegistry {
  private dimensions = new Map<string, TokenDimension>();
  private themes = new Map<string, ThemeDefinition>();

  // ---- Construction -------------------------------------------------------

  /**
   * Build a registry from a DimensionsConfig block.
   * Validates all dimensions and themes at load time.
   */
  static fromConfig(config: DimensionsConfig): DimensionRegistry {
    const reg = new DimensionRegistry();

    for (const dim of config.dimensions) {
      reg.registerDimension(dim);
    }

    if (config.themes) {
      for (const theme of config.themes) {
        reg.registerTheme(theme);
      }
    }

    return reg;
  }

  // ---- Dimensions ---------------------------------------------------------

  registerDimension(dim: TokenDimension): void {
    if (dim.values.length === 0) {
      throw new Error(
        `Dimension "${dim.id}" must have at least one value.`,
      );
    }
    if (!dim.values.includes(dim.defaultValue)) {
      throw new Error(
        `Dimension "${dim.id}" default "${dim.defaultValue}" is not in values: ${dim.values.join(", ")}`,
      );
    }
    this.dimensions.set(dim.id, dim);
  }

  getDimension(id: string): TokenDimension | undefined {
    return this.dimensions.get(id);
  }

  getAllDimensions(): TokenDimension[] {
    return [...this.dimensions.values()].sort(
      (a, b) => (a.priority ?? 0) - (b.priority ?? 0),
    );
  }

  /** Validate that a set of coordinates reference real dimensions and values. */
  validateCoordinates(coords: ThemeCoordinate[]): string[] {
    const errors: string[] = [];
    for (const c of coords) {
      const dim = this.dimensions.get(c.dimension);
      if (!dim) {
        errors.push(`Unknown dimension: "${c.dimension}"`);
        continue;
      }
      if (!dim.values.includes(c.value)) {
        errors.push(
          `Invalid value "${c.value}" for dimension "${c.dimension}". Valid: ${dim.values.join(", ")}`,
        );
      }
    }
    return errors;
  }

  // ---- Themes -------------------------------------------------------------

  registerTheme(theme: ThemeDefinition): void {
    const errors = this.validateCoordinates(theme.coordinates);
    if (errors.length > 0) {
      throw new Error(
        `Theme "${theme.id}" has invalid coordinates:\n  ${errors.join("\n  ")}`,
      );
    }
    this.themes.set(theme.id, theme);
  }

  getTheme(id: string): ThemeDefinition | undefined {
    return this.themes.get(id);
  }

  getAllThemes(): ThemeDefinition[] {
    return [...this.themes.values()];
  }

  /**
   * Resolve a theme id or set of coordinates into a fully-qualified
   * coordinate set, filling in defaults for any dimension not specified.
   */
  resolveCoordinates(
    themeIdOrCoords: string | ThemeCoordinate[],
  ): ThemeCoordinate[] {
    let coords: ThemeCoordinate[];

    if (typeof themeIdOrCoords === "string") {
      const theme = this.themes.get(themeIdOrCoords);
      if (!theme) {
        throw new Error(`Unknown theme: "${themeIdOrCoords}"`);
      }
      coords = [...theme.coordinates];
    } else {
      coords = [...themeIdOrCoords];
    }

    // Fill defaults for any missing dimensions.
    const specified = new Set(coords.map((c) => c.dimension));
    for (const dim of this.dimensions.values()) {
      if (!specified.has(dim.id)) {
        coords.push({ dimension: dim.id, value: dim.defaultValue });
      }
    }

    return coords;
  }

  /**
   * Get the default coordinate set (all dimensions at their default values).
   */
  getDefaultCoordinates(): ThemeCoordinate[] {
    return this.getAllDimensions().map((dim) => ({
      dimension: dim.id,
      value: dim.defaultValue,
    }));
  }

  /**
   * Compute a stable "coordinate key" for caching / lookup.
   * Dimensions are sorted by id for deterministic ordering.
   */
  coordinateKey(coords: ThemeCoordinate[]): string {
    return [...coords]
      .sort((a, b) => a.dimension.localeCompare(b.dimension))
      .map((c) => `${c.dimension}=${c.value}`)
      .join(",");
  }

  /**
   * Enumerate all possible coordinate combinations.
   * Useful for build-all / CI jobs.
   */
  enumerateAllCombinations(): ThemeCoordinate[][] {
    const dims = this.getAllDimensions();
    if (dims.length === 0) return [[]];

    let combos: ThemeCoordinate[][] = [[]];
    for (const dim of dims) {
      const next: ThemeCoordinate[][] = [];
      for (const combo of combos) {
        for (const value of dim.values) {
          next.push([...combo, { dimension: dim.id, value }]);
        }
      }
      combos = next;
    }
    return combos;
  }
}
