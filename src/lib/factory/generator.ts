/**
 * System Factory — generates token systems from templates and seed parameters.
 *
 * A template defines:
 *   - Parameters it expects (key color, base size, etc.)
 *   - Algorithms to apply (tonal palette, modular scale, etc.)
 *   - Output structure (which tokens to generate)
 *
 * The factory processes templates and produces a complete set of token
 * files that can be written to disk.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import JSON5 from "json5";
import YAML from "yaml";
import type {
  SystemTemplate,
  TemplateParameter,
  McpDsConfig,
  DesignToken,
} from "../types.js";
import {
  generateTonalPalette,
  generateModularScale,
  generateLinearScale,
  generateContrastPair,
} from "./algorithms.js";

// ---------------------------------------------------------------------------
// Template loading
// ---------------------------------------------------------------------------

/**
 * Load templates from config: both inline templates and file-based.
 */
export async function loadTemplates(
  projectRoot: string,
  config: McpDsConfig,
): Promise<SystemTemplate[]> {
  const templates: SystemTemplate[] = [];

  // Inline templates.
  if (config.factory?.templates) {
    templates.push(...config.factory.templates);
  }

  // File-based templates.
  if (config.factory?.templatePaths) {
    const fg = (await import("fast-glob")).default;
    const files = await fg(config.factory.templatePaths, {
      cwd: projectRoot,
      absolute: true,
    });

    for (const file of files) {
      try {
        const raw = fs.readFileSync(file, "utf-8");
        const ext = path.extname(file).toLowerCase();
        let data: unknown;

        if (ext === ".yaml" || ext === ".yml") {
          data = YAML.parse(raw);
        } else if (ext === ".json5") {
          data = JSON5.parse(raw);
        } else {
          data = JSON.parse(raw);
        }

        if (isTemplateArray(data)) {
          templates.push(...data);
        } else if (isTemplate(data)) {
          templates.push(data);
        }
      } catch (err) {
        console.error(
          `[systembridge-mcp] Error loading template ${file}: ${(err as Error).message}`,
        );
      }
    }
  }

  // Always include built-in templates.
  templates.push(...BUILTIN_TEMPLATES);

  // Deduplicate by id.
  const seen = new Set<string>();
  return templates.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
}

function isTemplate(v: unknown): v is SystemTemplate {
  return (
    typeof v === "object" &&
    v !== null &&
    "id" in v &&
    "name" in v &&
    "parameters" in v
  );
}

function isTemplateArray(v: unknown): v is SystemTemplate[] {
  return Array.isArray(v) && v.length > 0 && isTemplate(v[0]);
}

// ---------------------------------------------------------------------------
// Built-in templates
// ---------------------------------------------------------------------------

const BUILTIN_TEMPLATES: SystemTemplate[] = [
  {
    id: "color-palette",
    name: "Color Palette Generator",
    description:
      "Generate a full tonal color palette (50–950) from a single key color. " +
      "Optionally generate semantic color mappings and accessible contrast pairs.",
    parameters: [
      {
        id: "keyColor",
        name: "Key Color",
        description: "The primary brand color in hex format",
        type: "color",
        defaultValue: "#2563EB",
      },
      {
        id: "paletteName",
        name: "Palette Name",
        description: "Name for the color palette (e.g. 'primary', 'brand')",
        type: "string",
        defaultValue: "primary",
      },
      {
        id: "includeSemantics",
        name: "Include Semantics",
        description: "Also generate semantic color tokens (text, background, border)",
        type: "boolean",
        defaultValue: true,
      },
    ],
    algorithms: ["tonal-palette", "contrast-pair"],
  },
  {
    id: "spacing-scale",
    name: "Spacing Scale Generator",
    description:
      "Generate a consistent spacing scale using either a modular (geometric) or " +
      "linear progression. Great for establishing rhythm and consistency.",
    parameters: [
      {
        id: "baseSize",
        name: "Base Size",
        description: "Base spacing value in rem",
        type: "number",
        defaultValue: 1,
        constraints: { min: 0.125, max: 4 },
      },
      {
        id: "scale",
        name: "Scale Type",
        description: "modular (geometric) or linear progression",
        type: "string",
        defaultValue: "modular",
        constraints: { enum: ["modular", "linear"] },
      },
      {
        id: "ratio",
        name: "Scale Ratio",
        description: "Ratio for modular scale (e.g. 1.25 = Major Third)",
        type: "number",
        defaultValue: 1.5,
        constraints: { min: 1.1, max: 2 },
      },
      {
        id: "steps",
        name: "Steps",
        description: "Number of steps above and below base",
        type: "number",
        defaultValue: 5,
        constraints: { min: 2, max: 8 },
      },
    ],
    algorithms: ["modular-scale", "linear-scale"],
  },
  {
    id: "full-system",
    name: "Full Design System Bootstrap",
    description:
      "Generate a complete design token system with colors, spacing, typography, " +
      "and component tokens. Perfect for bootstrapping a new design system.",
    parameters: [
      {
        id: "primaryColor",
        name: "Primary Color",
        description: "Main brand color in hex",
        type: "color",
        defaultValue: "#2563EB",
      },
      {
        id: "secondaryColor",
        name: "Secondary Color",
        description: "Secondary brand color in hex (optional)",
        type: "color",
        defaultValue: "#7C3AED",
      },
      {
        id: "errorColor",
        name: "Error Color",
        type: "color",
        defaultValue: "#DC2626",
      },
      {
        id: "successColor",
        name: "Success Color",
        type: "color",
        defaultValue: "#16A34A",
      },
      {
        id: "baseSpacing",
        name: "Base Spacing (rem)",
        type: "number",
        defaultValue: 1,
      },
      {
        id: "baseFontSize",
        name: "Base Font Size (rem)",
        type: "number",
        defaultValue: 1,
      },
      {
        id: "fontFamily",
        name: "Font Family",
        type: "string",
        defaultValue: "Inter, system-ui, sans-serif",
      },
    ],
    dimensions: ["color-scheme"],
    algorithms: ["tonal-palette", "modular-scale", "contrast-pair"],
  },
];

// ---------------------------------------------------------------------------
// Generation engine
// ---------------------------------------------------------------------------

export interface GeneratedTokenFile {
  /** Relative path for the output file. */
  path: string;
  /** Token data in W3C DT format. */
  content: Record<string, unknown>;
}

export interface GenerationResult {
  template: string;
  files: GeneratedTokenFile[];
  tokenCount: number;
}

/**
 * Generate tokens from a template and parameter values.
 */
export function generateFromTemplate(
  template: SystemTemplate,
  params: Record<string, unknown>,
): GenerationResult {
  // Validate and fill defaults.
  const resolvedParams = resolveParams(template.parameters, params);

  // Route to the appropriate generator.
  switch (template.id) {
    case "color-palette":
      return generateColorPalette(template, resolvedParams);
    case "spacing-scale":
      return generateSpacingScale(template, resolvedParams);
    case "full-system":
      return generateFullSystem(template, resolvedParams);
    default:
      // For custom templates, generate a basic structure.
      return generateCustom(template, resolvedParams);
  }
}

function resolveParams(
  defs: TemplateParameter[],
  provided: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const def of defs) {
    const value = provided[def.id] ?? def.defaultValue;
    if (value === undefined) {
      throw new Error(
        `Required parameter "${def.id}" not provided and has no default.`,
      );
    }

    // Basic validation.
    if (def.constraints) {
      if (
        def.constraints.min !== undefined &&
        typeof value === "number" &&
        value < def.constraints.min
      ) {
        throw new Error(
          `Parameter "${def.id}" value ${value} is below minimum ${def.constraints.min}`,
        );
      }
      if (
        def.constraints.max !== undefined &&
        typeof value === "number" &&
        value > def.constraints.max
      ) {
        throw new Error(
          `Parameter "${def.id}" value ${value} is above maximum ${def.constraints.max}`,
        );
      }
      if (
        def.constraints.enum &&
        !def.constraints.enum.includes(String(value))
      ) {
        throw new Error(
          `Parameter "${def.id}" value "${value}" not in allowed values: ${def.constraints.enum.join(", ")}`,
        );
      }
    }

    result[def.id] = value;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Template generators
// ---------------------------------------------------------------------------

function generateColorPalette(
  template: SystemTemplate,
  params: Record<string, unknown>,
): GenerationResult {
  const keyColor = params.keyColor as string;
  const paletteName = params.paletteName as string;
  const includeSemantics = params.includeSemantics as boolean;

  const palette = generateTonalPalette(keyColor);

  // Build W3C DT format.
  const coreTokens: Record<string, unknown> = {
    color: {
      [paletteName]: {
        $type: "color",
      },
    },
  };

  for (const [step, hex] of Object.entries(palette)) {
    (coreTokens.color as Record<string, unknown>)[paletteName] = {
      ...((coreTokens.color as Record<string, unknown>)[paletteName] as Record<string, unknown>),
      [step]: {
        $value: hex,
        $description: `${paletteName} ${step}`,
      },
    };
  }

  const files: GeneratedTokenFile[] = [
    {
      path: `generated/core/${paletteName}.json`,
      content: coreTokens,
    },
  ];

  let tokenCount = Object.keys(palette).length;

  if (includeSemantics) {
    const contrastDefault = generateContrastPair(palette["500"] ?? keyColor);

    const semanticTokens: Record<string, unknown> = {
      semantic: {
        color: {
          $type: "color",
          [paletteName]: {
            default: {
              $value: `{color.${paletteName}.500}`,
              $description: `Default ${paletteName} color`,
            },
            hover: {
              $value: `{color.${paletteName}.600}`,
              $description: `Hover state`,
            },
            active: {
              $value: `{color.${paletteName}.700}`,
              $description: `Active/pressed state`,
            },
            subtle: {
              $value: `{color.${paletteName}.50}`,
              $description: `Subtle background tint`,
            },
            "on-${paletteName}": {
              $value: contrastDefault.foreground,
              $description: `Text on ${paletteName} background (${contrastDefault.ratio}:1 contrast)`,
            },
          },
        },
      },
    };

    files.push({
      path: `generated/semantic/${paletteName}.json`,
      content: semanticTokens,
    });

    tokenCount += 5;
  }

  return { template: template.id, files, tokenCount };
}

function generateSpacingScale(
  template: SystemTemplate,
  params: Record<string, unknown>,
): GenerationResult {
  const baseSize = params.baseSize as number;
  const scaleType = params.scale as string;
  const ratio = params.ratio as number;
  const steps = params.steps as number;

  let scale: Record<string, string>;
  if (scaleType === "linear") {
    scale = generateLinearScale(baseSize / 4, baseSize / 4, steps * 2 + 1);
  } else {
    scale = generateModularScale(baseSize, ratio, steps);
  }

  const tokens: Record<string, unknown> = {
    spacing: {
      $type: "dimension",
    },
  };

  for (const [name, value] of Object.entries(scale)) {
    (tokens.spacing as Record<string, unknown>)[name] = {
      $value: value,
      $description: `Spacing ${name}`,
    };
  }

  return {
    template: template.id,
    files: [
      {
        path: "generated/core/spacing.json",
        content: tokens,
      },
    ],
    tokenCount: Object.keys(scale).length,
  };
}

function generateFullSystem(
  template: SystemTemplate,
  params: Record<string, unknown>,
): GenerationResult {
  const files: GeneratedTokenFile[] = [];
  let tokenCount = 0;

  // --- Colors ---
  const colorNames = [
    { key: "primaryColor", name: "primary" },
    { key: "secondaryColor", name: "secondary" },
    { key: "errorColor", name: "error" },
    { key: "successColor", name: "success" },
  ];

  // Neutral palette (gray).
  const grayPalette = generateTonalPalette("#6B7280");
  const grayTokens: Record<string, unknown> = {
    color: { gray: { $type: "color" } },
  };
  for (const [step, hex] of Object.entries(grayPalette)) {
    (grayTokens.color as Record<string, unknown>).gray = {
      ...((grayTokens.color as Record<string, unknown>).gray as Record<string, unknown>),
      [step]: { $value: hex },
    };
  }
  // Add white and black.
  (grayTokens.color as Record<string, unknown>).white = {
    $type: "color",
    $value: "#FFFFFF",
  };
  (grayTokens.color as Record<string, unknown>).black = {
    $type: "color",
    $value: "#000000",
  };

  files.push({ path: "generated/core/colors-gray.json", content: grayTokens });
  tokenCount += Object.keys(grayPalette).length + 2;

  // Named color palettes.
  for (const { key, name } of colorNames) {
    const hex = params[key] as string;
    if (!hex) continue;
    const palette = generateTonalPalette(hex);
    const tokens: Record<string, unknown> = {
      color: { [name]: { $type: "color" } },
    };
    for (const [step, val] of Object.entries(palette)) {
      (tokens.color as Record<string, unknown>)[name] = {
        ...((tokens.color as Record<string, unknown>)[name] as Record<string, unknown>),
        [step]: { $value: val },
      };
    }
    files.push({ path: `generated/core/colors-${name}.json`, content: tokens });
    tokenCount += Object.keys(palette).length;
  }

  // --- Spacing ---
  const baseSpacing = params.baseSpacing as number;
  const spacingScale = generateModularScale(baseSpacing, 1.5, 5);
  const spacingTokens: Record<string, unknown> = {
    spacing: { $type: "dimension" },
  };
  for (const [name, value] of Object.entries(spacingScale)) {
    (spacingTokens.spacing as Record<string, unknown>)[name] = {
      $value: value,
    };
  }
  files.push({ path: "generated/core/spacing.json", content: spacingTokens });
  tokenCount += Object.keys(spacingScale).length;

  // --- Typography ---
  const baseFontSize = params.baseFontSize as number;
  const fontFamily = params.fontFamily as string;
  const fontSizeScale = generateModularScale(baseFontSize, 1.25, 4);
  const typographyTokens: Record<string, unknown> = {
    font: {
      family: {
        $type: "fontFamily",
        sans: { $value: fontFamily, $description: "Primary font family" },
        mono: {
          $value: "'Fira Code', 'Cascadia Code', monospace",
          $description: "Monospace font family",
        },
      },
      size: { $type: "dimension" },
      weight: {
        $type: "fontWeight",
        regular: { $value: "400" },
        medium: { $value: "500" },
        semibold: { $value: "600" },
        bold: { $value: "700" },
      },
      "line-height": { $type: "number" },
    },
  };

  for (const [name, value] of Object.entries(fontSizeScale)) {
    (typographyTokens.font as Record<string, unknown>).size = {
      ...((typographyTokens.font as Record<string, unknown>).size as Record<string, unknown>),
      [name]: { $value: value },
    };
  }

  // Line heights.
  const lineHeights: Record<string, number> = {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  };
  for (const [name, value] of Object.entries(lineHeights)) {
    (typographyTokens.font as Record<string, unknown>)["line-height"] = {
      ...((typographyTokens.font as Record<string, unknown>)["line-height"] as Record<string, unknown>),
      [name]: { $value: value },
    };
  }

  files.push({
    path: "generated/core/typography.json",
    content: typographyTokens,
  });
  tokenCount +=
    Object.keys(fontSizeScale).length + 2 + 4 + Object.keys(lineHeights).length;

  // --- Semantic layer (light theme defaults) ---
  const semanticTokens: Record<string, unknown> = {
    semantic: {
      color: {
        $type: "color",
        text: {
          primary: {
            $value: "{color.gray.900}",
            $description: "Primary text",
          },
          secondary: { $value: "{color.gray.600}" },
          disabled: { $value: "{color.gray.400}" },
          inverse: { $value: "{color.white}" },
        },
        background: {
          primary: { $value: "{color.white}" },
          secondary: { $value: "{color.gray.50}" },
          inverse: { $value: "{color.gray.900}" },
        },
        border: {
          default: { $value: "{color.gray.200}" },
          strong: { $value: "{color.gray.400}" },
        },
        interactive: {
          primary: {
            default: { $value: "{color.primary.500}" },
            hover: { $value: "{color.primary.600}" },
            active: { $value: "{color.primary.700}" },
          },
        },
      },
    },
  };

  files.push({
    path: "generated/semantic/colors.json",
    content: semanticTokens,
  });
  tokenCount += 12;

  // --- Dark theme overlay (conditional values) ---
  const darkSemanticTokens: Record<string, unknown> = {
    semantic: {
      color: {
        $type: "color",
        text: {
          primary: {
            $value: "{color.gray.100}",
            $extensions: {
              "com.systembridge-mcp.conditions": [
                {
                  when: [{ dimension: "color-scheme", value: "dark" }],
                  value: "{color.gray.100}",
                },
              ],
            },
          },
          secondary: {
            $value: "{color.gray.400}",
            $extensions: {
              "com.systembridge-mcp.conditions": [
                {
                  when: [{ dimension: "color-scheme", value: "dark" }],
                  value: "{color.gray.400}",
                },
              ],
            },
          },
          inverse: {
            $value: "{color.gray.900}",
            $extensions: {
              "com.systembridge-mcp.conditions": [
                {
                  when: [{ dimension: "color-scheme", value: "dark" }],
                  value: "{color.gray.900}",
                },
              ],
            },
          },
        },
        background: {
          primary: {
            $value: "{color.gray.900}",
            $extensions: {
              "com.systembridge-mcp.conditions": [
                {
                  when: [{ dimension: "color-scheme", value: "dark" }],
                  value: "{color.gray.900}",
                },
              ],
            },
          },
          secondary: {
            $value: "{color.gray.800}",
            $extensions: {
              "com.systembridge-mcp.conditions": [
                {
                  when: [{ dimension: "color-scheme", value: "dark" }],
                  value: "{color.gray.800}",
                },
              ],
            },
          },
          inverse: {
            $value: "{color.white}",
            $extensions: {
              "com.systembridge-mcp.conditions": [
                {
                  when: [{ dimension: "color-scheme", value: "dark" }],
                  value: "{color.white}",
                },
              ],
            },
          },
        },
      },
    },
  };

  files.push({
    path: "generated/themes/dark.json",
    content: darkSemanticTokens,
  });
  tokenCount += 6;

  return { template: template.id, files, tokenCount };
}

function generateCustom(
  template: SystemTemplate,
  params: Record<string, unknown>,
): GenerationResult {
  // For custom templates, generate tokens based on algorithms.
  const files: GeneratedTokenFile[] = [];
  let tokenCount = 0;

  for (const algo of template.algorithms) {
    switch (algo) {
      case "tonal-palette": {
        const color = (params.keyColor ?? params.color ?? "#2563EB") as string;
        const name = (params.name ?? "generated") as string;
        const palette = generateTonalPalette(color);
        const tokens: Record<string, unknown> = {
          color: { [name]: { $type: "color" } },
        };
        for (const [step, hex] of Object.entries(palette)) {
          (tokens.color as Record<string, unknown>)[name] = {
            ...((tokens.color as Record<string, unknown>)[name] as Record<string, unknown>),
            [step]: { $value: hex },
          };
        }
        files.push({
          path: `generated/${name}-palette.json`,
          content: tokens,
        });
        tokenCount += Object.keys(palette).length;
        break;
      }

      case "modular-scale": {
        const base = (params.baseSize ?? 1) as number;
        const ratio = (params.ratio ?? 1.25) as number;
        const scale = generateModularScale(base, ratio);
        const tokens: Record<string, unknown> = {
          size: { $type: "dimension" },
        };
        for (const [name, value] of Object.entries(scale)) {
          (tokens.size as Record<string, unknown>)[name] = {
            $value: value,
          };
        }
        files.push({
          path: "generated/scale.json",
          content: tokens,
        });
        tokenCount += Object.keys(scale).length;
        break;
      }

      case "linear-scale": {
        const base = (params.baseSize ?? 0.25) as number;
        const step = (params.step ?? 0.25) as number;
        const count = (params.count ?? 12) as number;
        const scale = generateLinearScale(base, step, count);
        const tokens: Record<string, unknown> = {
          size: { $type: "dimension" },
        };
        for (const [name, value] of Object.entries(scale)) {
          (tokens.size as Record<string, unknown>)[name] = {
            $value: value,
          };
        }
        files.push({
          path: "generated/linear-scale.json",
          content: tokens,
        });
        tokenCount += Object.keys(scale).length;
        break;
      }
    }
  }

  return { template: template.id, files, tokenCount };
}
