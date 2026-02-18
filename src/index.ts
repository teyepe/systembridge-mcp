#!/usr/bin/env node
/**
 * mcp-ds — Design System MCP Server
 *
 * A Model Context Protocol server for design token management,
 * transformation, validation, evolution, multi-dimensional theming,
 * multi-brand support, system generation, and semantic token intelligence.
 *
 * Transport: STDIO (compatible with Claude Desktop and other MCP clients).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as path from "node:path";

import { loadConfig } from "./config/loader.js";
import {
  listTokenResources,
  readTokenResource,
} from "./resources/tokens.js";
import {
  searchTokens,
  formatSearchResults,
} from "./tools/search.js";
import { validateTokensTool } from "./tools/validate.js";
import { transformTokensTool } from "./tools/transform.js";
import {
  listDimensionsTool,
  listThemesTool,
  resolveThemeTool,
  diffThemesTool,
} from "./tools/themes.js";
import {
  listBrandsTool,
  resolveBrandTool,
  diffBrandsTool,
} from "./tools/brands.js";
import {
  listTemplatesTool,
  generateSystemTool,
} from "./tools/factory.js";
import {
  describeOntologyTool,
  scaffoldSemanticsTool,
  auditSemanticsTool,
  analyzeCoverageTool,
  checkContrastTool,
} from "./tools/semantics.js";
import {
  generatePaletteTool,
  mapPaletteToSemanticsTool,
} from "./tools/palette.js";
import {
  planFlowTool,
  auditDesignTool,
  analyzeUiTool,
} from "./tools/designer.js";
import {
  analyzeScalesTool,
  generateScaleTool,
  suggestScaleTool,
  deriveDensityModeTool,
  auditScaleComplianceTool,
  generateFluidScaleTool,
} from "./tools/scales.js";

// ---------------------------------------------------------------------------
// Resolve project root
// ---------------------------------------------------------------------------

const PROJECT_ROOT = process.env.MCP_DS_PROJECT_ROOT
  ? path.resolve(process.env.MCP_DS_PROJECT_ROOT)
  : process.cwd();

const config = loadConfig(PROJECT_ROOT);

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "mcp-ds",
  version: "0.4.0",
});

// ---------------------------------------------------------------------------
// Resources — token data
// ---------------------------------------------------------------------------

server.resource(
  "tokens",
  "tokens://{category}",
  {
    description:
      "Design tokens grouped by category. Use 'all' for everything, or a category name like 'color', 'spacing', 'typography'.",
  },
  async (uri) => {
    const content = await readTokenResource(
      uri.href,
      PROJECT_ROOT,
      config,
    );
    return {
      contents: [
        {
          uri: content.uri,
          mimeType: content.mimeType,
          text: content.text,
        },
      ],
    };
  },
);

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

// ---- search_tokens --------------------------------------------------------

server.tool(
  "search_tokens",
  "Search and discover design tokens by name, type, value, or other criteria. " +
    "Use this to answer questions like 'What color tokens exist?', " +
    "'Find all spacing tokens', or 'Show deprecated tokens'.",
  {
    text: z
      .string()
      .optional()
      .describe(
        "Free-text search against token paths, descriptions, and values",
      ),
    type: z
      .enum([
        "color",
        "dimension",
        "fontFamily",
        "fontWeight",
        "fontStyle",
        "duration",
        "cubicBezier",
        "number",
        "string",
        "boolean",
        "shadow",
        "border",
        "gradient",
        "typography",
        "transition",
        "custom",
      ])
      .optional()
      .describe("Filter by token type"),
    pathPrefix: z
      .string()
      .optional()
      .describe(
        "Filter by token path prefix (e.g. 'color.semantic' or 'spacing')",
      ),
    deprecated: z
      .boolean()
      .optional()
      .describe("Filter for deprecated (true) or non-deprecated (false) tokens"),
    valuePattern: z
      .string()
      .optional()
      .describe("Regex pattern to match against token values"),
  },
  async (args) => {
    const results = await searchTokens(args, PROJECT_ROOT, config);
    const formatted = formatSearchResults(results);
    return {
      content: [
        {
          type: "text" as const,
          text: formatted,
        },
      ],
    };
  },
);

// ---- validate_tokens ------------------------------------------------------

server.tool(
  "validate_tokens",
  "Validate design tokens against configurable rules. " +
    "Checks naming conventions, value formats, type requirements, " +
    "deprecated references, and architectural patterns. " +
    "Returns a structured report with errors, warnings, and suggestions.",
  {
    preset: z
      .enum(["relaxed", "recommended", "strict"])
      .optional()
      .describe(
        "Validation preset to use. 'relaxed' = minimal checks, " +
          "'recommended' = sensible defaults, 'strict' = all rules enforced",
      ),
    pathPrefix: z
      .string()
      .optional()
      .describe("Only validate tokens matching this path prefix"),
  },
  async (args) => {
    const { formatted } = await validateTokensTool(args, PROJECT_ROOT, config);
    return {
      content: [
        {
          type: "text" as const,
          text: formatted,
        },
      ],
    };
  },
);

// ---- transform_tokens -----------------------------------------------------

server.tool(
  "transform_tokens",
  "Transform design tokens into platform-specific output files using " +
    "Style Dictionary. Generates CSS custom properties, SCSS variables, " +
    "JavaScript modules, iOS/Swift code, Android XML, Compose code, etc. " +
    "Use dryRun=true to preview without writing files.",
  {
    platforms: z
      .array(
        z.enum([
          "css",
          "scss",
          "js",
          "ts",
          "ios",
          "ios-swift",
          "android",
          "compose",
        ]),
      )
      .optional()
      .describe(
        "Platforms to build for (defaults to config). " +
          "Available: css, scss, js, ts, ios, ios-swift, android, compose",
      ),
    dryRun: z
      .boolean()
      .optional()
      .describe(
        "Preview mode — show what files would be generated without writing them",
      ),
  },
  async (args) => {
    const { formatted } = await transformTokensTool(
      args,
      PROJECT_ROOT,
      config,
    );
    return {
      content: [
        {
          type: "text" as const,
          text: formatted,
        },
      ],
    };
  },
);

// ---- list_dimensions ------------------------------------------------------

server.tool(
  "list_dimensions",
  "List all variation dimensions (e.g. color-scheme, density) defined in your " +
    "design-token theming config, with their allowed values and defaults.",
  {},
  async () => {
    const { formatted } = listDimensionsTool(config);
    return { content: [{ type: "text" as const, text: formatted }] };
  },
);

// ---- list_themes ----------------------------------------------------------

server.tool(
  "list_themes",
  "List all named themes defined in config. Each theme is a specific " +
    "combination of dimension values (e.g. dark + compact).",
  {},
  async () => {
    const { formatted } = listThemesTool(config);
    return { content: [{ type: "text" as const, text: formatted }] };
  },
);

// ---- resolve_theme --------------------------------------------------------

server.tool(
  "resolve_theme",
  "Resolve the full set of design tokens for a specific theme (or " +
    "arbitrary coordinate set). Shows how tokens change from the default.",
  {
    theme: z
      .string()
      .describe(
        "Theme name from config, or inline coordinates like " +
          "'color-scheme=dark,density=compact'",
      ),
    pathPrefix: z
      .string()
      .optional()
      .describe("Only return tokens matching this path prefix, e.g. 'color.semantic'"),
    limit: z
      .number()
      .optional()
      .describe("Max number of tokens to return (default 100)"),
  },
  async (args) => {
    const { formatted } = await resolveThemeTool(args, PROJECT_ROOT, config);
    return { content: [{ type: "text" as const, text: formatted }] };
  },
);

// ---- diff_themes ----------------------------------------------------------

server.tool(
  "diff_themes",
  "Compare two themes side-by-side and show which tokens differ, " +
    "which are added, and which are removed.",
  {
    themeA: z.string().describe("First theme name or coordinates"),
    themeB: z.string().describe("Second theme name or coordinates"),
    pathPrefix: z
      .string()
      .optional()
      .describe("Only diff tokens matching this path prefix"),
  },
  async (args) => {
    const { formatted } = await diffThemesTool(args, PROJECT_ROOT, config);
    return { content: [{ type: "text" as const, text: formatted }] };
  },
);

// ---- list_brands ----------------------------------------------------------

server.tool(
  "list_brands",
  "List all brands defined in config, showing their token paths, " +
    "token-set overrides, and dimension defaults.",
  {},
  async () => {
    const { formatted } = listBrandsTool(config);
    return { content: [{ type: "text" as const, text: formatted }] };
  },
);

// ---- resolve_brand --------------------------------------------------------

server.tool(
  "resolve_brand",
  "Resolve design tokens for a specific brand, optionally combined " +
    "with a theme. Shows how brand overrides affect the token system.",
  {
    brand: z.string().describe("Brand ID from config"),
    theme: z
      .string()
      .optional()
      .describe("Optional theme name or coordinates to combine with the brand"),
    pathPrefix: z
      .string()
      .optional()
      .describe("Only return tokens matching this path prefix"),
    limit: z
      .number()
      .optional()
      .describe("Max number of tokens to return (default 100)"),
  },
  async (args) => {
    const { formatted } = await resolveBrandTool(args, PROJECT_ROOT, config);
    return { content: [{ type: "text" as const, text: formatted }] };
  },
);

// ---- diff_brands ----------------------------------------------------------

server.tool(
  "diff_brands",
  "Compare two brands side-by-side, showing which tokens differ " +
    "between them. Optionally resolves both under the same theme.",
  {
    brandA: z.string().describe("First brand ID"),
    brandB: z.string().describe("Second brand ID"),
    theme: z
      .string()
      .optional()
      .describe("Optional theme to apply to both brands before diffing"),
    pathPrefix: z
      .string()
      .optional()
      .describe("Only diff tokens matching this path prefix"),
  },
  async (args) => {
    const { formatted } = await diffBrandsTool(args, PROJECT_ROOT, config);
    return { content: [{ type: "text" as const, text: formatted }] };
  },
);

// ---- list_templates -------------------------------------------------------

server.tool(
  "list_templates",
  "List all available factory templates for generating new token systems. " +
    "Shows required parameters and built-in algorithm options.",
  {},
  async () => {
    const { formatted } = await listTemplatesTool(PROJECT_ROOT, config);
    return { content: [{ type: "text" as const, text: formatted }] };
  },
);

// ---- generate_system ------------------------------------------------------

server.tool(
  "generate_system",
  "Generate a new design-token system from a template. Supports color palettes, " +
    "spacing scales, and full systems. Use dryRun=true to preview first.",
  {
    template: z.string().describe("Template ID, e.g. 'color-palette', 'spacing-scale', 'full-system'"),
    params: z
      .string()
      .optional()
      .describe(
        "JSON string of template parameters, e.g. " +
          "'{\"primaryColor\":\"#3B82F6\",\"steps\":11}'",
      ),
    outputDir: z
      .string()
      .optional()
      .describe("Directory to write generated files (relative to project root)"),
    dryRun: z
      .boolean()
      .optional()
      .describe("Preview mode — show generated tokens without writing files"),
  },
  async (args) => {
    const parsedArgs = {
      ...args,
      params: args.params ? JSON.parse(args.params) : undefined,
    };
    const { formatted } = await generateSystemTool(
      parsedArgs,
      PROJECT_ROOT,
      config,
    );
    return { content: [{ type: "text" as const, text: formatted }] };
  },
);

// ---------------------------------------------------------------------------
// Tools — semantic token intelligence
// ---------------------------------------------------------------------------

server.tool(
  "describe_ontology",
  "Explain the semantic token naming model — property classes (CSS targets), " +
    "semantic intents, UX contexts, interaction states, emphasis modifiers, " +
    "and the canonical naming formula. Use this to understand how semantic tokens " +
    "should be structured.",
  {},
  async () => {
    const { formatted } = describeOntologyTool();
    return { content: [{ type: "text" as const, text: formatted }] };
  },
);

server.tool(
  "scaffold_semantics",
  "Generate a minimum viable semantic token set from a component inventory. " +
    "Provide a comma-separated list of components (e.g. 'button, text-input, card, alert') " +
    "and get properly structured tokens with CSS property class separation, " +
    "intent coverage, and state completeness.",
  {
    components: z
      .string()
      .describe(
        "Comma-separated component names, e.g. 'button, text-input, card, alert, tabs'",
      ),
    includeModifiers: z
      .boolean()
      .optional()
      .describe(
        "Include emphasis modifiers (strong/soft/plain) for each intent. Default: false (start minimal).",
      ),
    includeGlobalTokens: z
      .boolean()
      .optional()
      .describe(
        "Include global (context-free) semantic tokens like background.base, text.accent. Default: true.",
      ),
    additionalIntents: z
      .string()
      .optional()
      .describe(
        "Comma-separated additional intents beyond defaults, e.g. 'warning,info'.",
      ),
    valueStrategy: z
      .enum(["reference", "placeholder", "empty"])
      .optional()
      .describe(
        "How to fill placeholder values: 'reference' (core token refs), 'placeholder' (#TODO), 'empty'. Default: reference.",
      ),
    format: z
      .enum(["flat", "nested"])
      .optional()
      .describe("Output format: 'flat' or 'nested' (W3C DT). Default: flat."),
    outputDir: z
      .string()
      .optional()
      .describe(
        "Directory to write generated token files to (relative to project root). " +
          "If omitted, tokens are returned inline without writing to disk.",
      ),
    dryRun: z
      .boolean()
      .optional()
      .describe(
        "If true, show what would be written without actually writing files. Default: false.",
      ),
    mergeStrategy: z
      .enum(["additive", "overwrite", "skip"])
      .optional()
      .describe(
        "How to handle existing files: 'additive' (add new, keep existing), " +
          "'overwrite', or 'skip'. Default: additive.",
      ),
    splitStrategy: z
      .enum(["single", "by-context", "by-property"])
      .optional()
      .describe(
        "How to split tokens across files: 'single' (one file), " +
          "'by-context' (per UX context), 'by-property' (per property class). Default: by-context.",
      ),
  },
  async (args) => {
    const { formatted } = await scaffoldSemanticsTool(
      args,
      PROJECT_ROOT,
      config,
    );
    return { content: [{ type: "text" as const, text: formatted }] };
  },
);

server.tool(
  "audit_semantics",
  "Run a comprehensive semantic token audit on your existing token set. " +
    "Analyzes naming compliance, property-class separation, coverage gaps, " +
    "scoping violations, accessibility pairing, and suggests migrations. " +
    "Returns a health score (0-100) and detailed report.",
  {
    pathPrefix: z
      .string()
      .optional()
      .describe(
        "Only audit tokens starting with this path prefix, e.g. 'semantic' or 'color.semantic'. " +
          "Comma-separated for multiple prefixes.",
      ),
    skipRules: z
      .string()
      .optional()
      .describe(
        "Comma-separated rule IDs to skip, e.g. 'over-abstraction,cross-concern-shared-value'.",
      ),
  },
  async (args) => {
    const { formatted } = await auditSemanticsTool(
      args,
      PROJECT_ROOT,
      config,
    );
    return { content: [{ type: "text" as const, text: formatted }] };
  },
);

server.tool(
  "analyze_coverage",
  "Show the semantic token coverage matrix — which UX contexts have " +
    "which property classes covered, and where the gaps are. " +
    "Displays a table of contexts × property classes with status indicators.",
  {
    pathPrefix: z
      .string()
      .optional()
      .describe(
        "Only analyze tokens starting with this path prefix.",
      ),
  },
  async (args) => {
    const { formatted } = await analyzeCoverageTool(
      args,
      PROJECT_ROOT,
      config,
    );
    return { content: [{ type: "text" as const, text: formatted }] };
  },
);

// ---- check_contrast -------------------------------------------------------

server.tool(
  "check_contrast",
  "Check color contrast ratios using WCAG 2.1 and/or APCA algorithms. " +
    "Two modes: (1) provide explicit foreground + background colors, or " +
    "(2) scan your token set for all foreground/background pairs and report failures.",
  {
    foreground: z
      .string()
      .optional()
      .describe(
        "Foreground color value (hex, rgb, hsl). If provided with 'background', checks that single pair.",
      ),
    background: z
      .string()
      .optional()
      .describe(
        "Background color value (hex, rgb, hsl). Required if 'foreground' is provided.",
      ),
    pathPrefix: z
      .string()
      .optional()
      .describe(
        "When scanning tokens, only check pairs under this path prefix. Comma-separated for multiple.",
      ),
    algorithm: z
      .enum(["wcag21", "apca", "both"])
      .optional()
      .describe("Which algorithm(s) to use. Default: both."),
    threshold: z
      .string()
      .optional()
      .describe(
        "Minimum WCAG contrast ratio to consider passing (e.g. '4.5' for AA normal text). " +
          "Only affects which pairs are flagged in scan mode.",
      ),
  },
  async (args) => {
    const { formatted } = await checkContrastTool(
      args,
      PROJECT_ROOT,
      config,
    );
    return { content: [{ type: "text" as const, text: formatted }] };
  },
);

// ---- generate_palette -----------------------------------------------------

server.tool(
  "generate_palette",
  "Generate color palettes using pluggable strategies. " +
    "Supports HSL ramp (built-in), Leonardo (optional), manual hex values, " +
    "or importing from existing tokens. Returns tonal scales with contrast metadata.",
  {
    strategy: z
      .enum(["hsl", "leonardo", "manual", "import"])
      .optional()
      .describe("Palette generation strategy. Default: hsl."),
    scales: z
      .string()
      .describe(
        "Scale definitions. Simple format: 'brand:220:0.7, neutral:0:0.05' (name:hue:saturation). " +
          "Or full JSON: [{\"name\":\"brand\",\"hue\":220,\"saturation\":0.7}]",
      ),
    steps: z
      .string()
      .optional()
      .describe(
        "Comma-separated step values, e.g. '0,100,200,...,900'. " +
          "Default: 0,50,100,...,950 (19 steps).",
      ),
    colorSpace: z
      .string()
      .optional()
      .describe("Color space for Leonardo strategy (e.g. 'CAM02', 'LAB'). Default: CAM02."),
    smooth: z
      .boolean()
      .optional()
      .describe("Enable smoothing for Leonardo strategy. Default: true."),
  },
  async (args) => {
    const { formatted } = await generatePaletteTool(
      args,
      PROJECT_ROOT,
      config,
    );
    return { content: [{ type: "text" as const, text: formatted }] };
  },
);

// ---- map_palette_to_semantics ---------------------------------------------

server.tool(
  "map_palette_to_semantics",
  "Map generated palette scales to semantic tokens using configurable rules. " +
    "Includes built-in presets for light-mode and dark-mode mappings. " +
    "Can write output to disk with merge and split strategies.",
  {
    palette: z
      .string()
      .describe(
        "The palette JSON from generate_palette (the 'palette' field from the result).",
      ),
    preset: z
      .enum(["light-mode", "dark-mode"])
      .optional()
      .describe("Use a built-in mapping preset. Default: light-mode."),
    rules: z
      .string()
      .optional()
      .describe(
        "Custom mapping rules as JSON array. Each rule: " +
          "{\"propertyClass\":\"background\",\"intent\":\"accent\",\"paletteScale\":\"brand\",\"defaultStep\":500}",
      ),
    uxContexts: z
      .string()
      .optional()
      .describe(
        "Comma-separated UX contexts to generate for, e.g. 'action,input,surface'. " +
          "If omitted, generates only global (context-free) tokens.",
      ),
    states: z
      .string()
      .optional()
      .describe(
        "Comma-separated additional states, e.g. 'hover,active,focus,disabled'.",
      ),
    outputDir: z
      .string()
      .optional()
      .describe(
        "Directory to write generated files to (relative to project root). " +
          "If omitted, tokens are returned inline.",
      ),
    dryRun: z
      .boolean()
      .optional()
      .describe("Show what would be written without actually writing. Default: false."),
    mergeStrategy: z
      .enum(["additive", "overwrite", "skip"])
      .optional()
      .describe("How to handle existing files. Default: additive."),
    splitStrategy: z
      .enum(["single", "by-context", "by-property"])
      .optional()
      .describe("How to split tokens across files. Default: by-context."),
  },
  async (args) => {
    const { formatted } = await mapPaletteToSemanticsTool(
      args,
      PROJECT_ROOT,
      config,
    );
    return { content: [{ type: "text" as const, text: formatted }] };
  },
);

// ---------------------------------------------------------------------------
// Tools — designer-centric intelligence
// ---------------------------------------------------------------------------

// ---- plan_flow ------------------------------------------------------------

server.tool(
  "plan_flow",
  "Solve 'blank canvas syndrome' — describe a screen, feature, or user problem " +
    "in plain language and get back suggested UI patterns, component inventories, " +
    "token surface requirements, and next steps. Perfect for starting a new design " +
    "or understanding what a feature needs from the design system.",
  {
    description: z
      .string()
      .describe(
        "Natural language description of the screen, feature, or problem. " +
          "e.g. 'I need a login page with social sign-in options' or " +
          "'An admin dashboard to manage user accounts with data tables'",
      ),
    maxPatterns: z
      .number()
      .optional()
      .describe("Maximum number of UI patterns to suggest (default: 5)"),
    includeScaffold: z
      .boolean()
      .optional()
      .describe(
        "Include a preview of how many tokens scaffold_semantics would generate. Default: false.",
      ),
  },
  async (args) => {
    const { formatted } = await planFlowTool(args, PROJECT_ROOT, config);
    return { content: [{ type: "text" as const, text: formatted }] };
  },
);

// ---- audit_design ---------------------------------------------------------

server.tool(
  "audit_design",
  "Audit a partial or complete design against the design system. " +
    "Provide the components used in your design and get a gap analysis: " +
    "missing tokens, naming issues, accessibility problems, and concrete fixes. " +
    "Use this before handoff to ensure design-system coverage.",
  {
    components: z
      .string()
      .describe(
        "Comma-separated list of components in the design, " +
          "e.g. 'button, text-input, card, modal, tabs'",
      ),
    description: z
      .string()
      .optional()
      .describe("Optional description of the design being audited"),
    checkAccessibility: z
      .boolean()
      .optional()
      .describe(
        "Include accessibility contrast analysis. Default: true.",
      ),
  },
  async (args) => {
    const { formatted } = await auditDesignTool(args, PROJECT_ROOT, config);
    return { content: [{ type: "text" as const, text: formatted }] };
  },
);

// ---- analyze_ui -----------------------------------------------------------

server.tool(
  "analyze_ui",
  "Analyze UI elements and colors against the design system. " +
    "Describe the components you see and the colors used — get back which " +
    "components are in the system, which colors match existing tokens " +
    "(using perceptual color distance), and what gaps exist. " +
    "Useful for reverse-engineering a screenshot or mockup into system terms.",
  {
    components: z
      .string()
      .describe(
        "Comma-separated list of UI components visible, " +
          "e.g. 'button, card, text-input, badge, avatar'",
      ),
    colors: z
      .string()
      .optional()
      .describe(
        "Comma-separated hex colors observed in the UI, " +
          "e.g. '#3B82F6, #EF4444, #F3F4F6, #1F2937'",
      ),
    description: z
      .string()
      .optional()
      .describe(
        "Optional description of the UI being analyzed, " +
          "e.g. 'Dashboard with sidebar navigation and data cards'",
      ),
  },
  async (args) => {
    const { formatted } = await analyzeUiTool(args, PROJECT_ROOT, config);
    return { content: [{ type: "text" as const, text: formatted }] };
  },
);

// ---- analyze_scales -------------------------------------------------------

server.tool(
  analyzeScalesTool.name,
  analyzeScalesTool.description,
  analyzeScalesTool.inputSchema.shape,
  async (args) => {
    return await analyzeScalesTool.execute(args as any);
  },
);

// ---- generate_scale -------------------------------------------------------

server.tool(
  generateScaleTool.name,
  generateScaleTool.description,
  generateScaleTool.inputSchema.shape,
  async (args) => {
    return await generateScaleTool.execute(args as any);
  },
);

// ---- suggest_scale --------------------------------------------------------

server.tool(
  suggestScaleTool.name,
  suggestScaleTool.description,
  suggestScaleTool.inputSchema.shape,
  async (args) => {
    return await suggestScaleTool.execute(args as any);
  },
);

// ---- derive_density_mode --------------------------------------------------

server.tool(
  deriveDensityModeTool.name,
  deriveDensityModeTool.description,
  deriveDensityModeTool.inputSchema.shape,
  async (args) => {
    return await deriveDensityModeTool.execute(args as any);
  },
);

// ---- audit_scale_compliance -----------------------------------------------

server.tool(
  auditScaleComplianceTool.name,
  auditScaleComplianceTool.description,
  auditScaleComplianceTool.inputSchema.shape,
  async (args) => {
    return await auditScaleComplianceTool.execute(args as any);
  },
);

// ---- generate_fluid_scale -------------------------------------------------

server.tool(
  generateFluidScaleTool.name,
  generateFluidScaleTool.description,
  generateFluidScaleTool.inputSchema.shape,
  async (args) => {
    return await generateFluidScaleTool.execute(args as any);
  },
);

// ---------------------------------------------------------------------------
// Prompts — guided workflows
// ---------------------------------------------------------------------------

server.prompt(
  "create-token",
  "Guided workflow to create a new design token with proper naming, typing, " +
    "and documentation. Checks for duplicates and suggests alternatives.",
  {
    name: z
      .string()
      .describe("Token name/path, e.g. 'color.semantic.error.background'"),
    value: z.string().describe("Token value, e.g. '#DC2626' or '{color.red.600}'"),
    type: z
      .string()
      .optional()
      .describe("Token type: color, dimension, fontFamily, etc."),
    description: z
      .string()
      .optional()
      .describe("Human-readable description of the token's purpose"),
  },
  async (args) => {
    return {
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text:
              `I want to create a new design token with these details:\n\n` +
              `- **Path**: ${args.name}\n` +
              `- **Value**: ${args.value}\n` +
              (args.type ? `- **Type**: ${args.type}\n` : "") +
              (args.description
                ? `- **Description**: ${args.description}\n`
                : "") +
              `\nPlease:\n` +
              `1. Use search_tokens to check if a similar token already exists\n` +
              `2. Use validate_tokens to check naming conventions\n` +
              `3. If everything looks good, show me the JSON I should add to my token files\n` +
              `4. Suggest the appropriate file location based on the token category\n` +
              `5. Show what the resolved value would be if it's a reference`,
          },
        },
      ],
    };
  },
);

server.prompt(
  "audit-tokens",
  "Run a comprehensive audit of your design token architecture. " +
    "Checks for issues, suggests improvements, and identifies areas for evolution.",
  {},
  async () => {
    return {
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text:
              `Please run a comprehensive audit of my design token architecture:\n\n` +
              `1. Use search_tokens with no filters to see all tokens\n` +
              `2. Use validate_tokens with preset "strict" to check all rules\n` +
              `3. Analyze the results and provide:\n` +
              `   - Token architecture health score (1-10)\n` +
              `   - Key issues found\n` +
              `   - Recommendations for improvement\n` +
              `   - Suggested next steps\n` +
              `4. Pay special attention to:\n` +
              `   - Token naming consistency\n` +
              `   - Proper layering (primitive → semantic → component)\n` +
              `   - Deprecated tokens still in use\n` +
              `   - Missing descriptions/types\n` +
              `   - Duplicate values that could be consolidated`,
          },
        },
      ],
    };
  },
);

server.prompt(
  "design-semantic-tokens",
  "Guided workflow to design semantic tokens for your component inventory. " +
    "Understands your components, scaffolds the right token surface, and audits for gaps.",
  {
    components: z
      .string()
      .optional()
      .describe(
        "Comma-separated component names, e.g. 'button, text-input, card, alert'",
      ),
  },
  async (args) => {
    return {
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text:
              `I need help designing semantic tokens for my design system.\n\n` +
              (args.components
                ? `My component inventory: ${args.components}\n\n`
                : `I haven't specified components yet — please ask me about my component inventory.\n\n`) +
              `Please follow this workflow:\n\n` +
              `1. Use describe_ontology to understand the naming model\n` +
              `2. Use scaffold_semantics with my components to generate a starting token set\n` +
              `3. Use audit_semantics to check my existing tokens (if any) for issues\n` +
              `4. Use analyze_coverage to show the coverage matrix\n` +
              `5. Based on all findings, provide:\n` +
              `   - The recommended semantic token structure\n` +
              `   - Specific token files I should create\n` +
              `   - Any tokens I need to rename or restructure\n` +
              `   - Gaps I need to fill\n` +
              `   - Accessibility pairing recommendations\n` +
              `6. Pay special attention to:\n` +
              `   - CSS property class separation (background ≠ text ≠ border)\n` +
              `   - Every background needs a paired text/icon for contrast\n` +
              `   - Interactive components need full state coverage\n` +
              `   - Don't over-engineer — start with minimum viable tokens`,
          },
        },
      ],
    };
  },
);

server.prompt(
  "design-color-palette",
  "Guided workflow to generate a color palette and map it to semantic tokens. " +
    "Walks through palette generation, preview, and semantic mapping with contrast checking.",
  {
    scales: z
      .string()
      .optional()
      .describe(
        "Color scales to generate, e.g. 'brand:220:0.7, neutral:0:0.05, success:140:0.6'",
      ),
    strategy: z
      .string()
      .optional()
      .describe("Palette strategy: hsl, leonardo, manual, import"),
  },
  async (args) => {
    return {
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text:
              `I need help creating a color palette and mapping it to semantic tokens.\n\n` +
              (args.scales
                ? `My desired color scales: ${args.scales}\n`
                : `I haven't specified color scales yet — please ask me about my brand colors.\n`) +
              (args.strategy
                ? `Strategy: ${args.strategy}\n`
                : "") +
              `\nPlease follow this workflow:\n\n` +
              `1. Use generate_palette to create the tonal scales\n` +
              `2. Review the generated palette for adequate contrast range\n` +
              `3. Use map_palette_to_semantics with the 'light-mode' preset\n` +
              `4. Use check_contrast to verify all generated pairs pass WCAG 2.1 AA\n` +
              `5. Report:\n` +
              `   - The full palette with contrast ratios\n` +
              `   - Semantic token mapping summary\n` +
              `   - Any contrast failures and how to fix them\n` +
              `   - Recommendations for dark-mode mapping\n` +
              `6. If I want to write files, use scaffold_semantics with outputDir`,
          },
        },
      ],
    };
  },
);

server.prompt(
  "design-from-scratch",
  "Start a new design from a problem description. Identifies UI patterns, " +
    "suggests components, resolves token requirements, and walks through " +
    "scaffolding the complete token surface.",
  {
    description: z
      .string()
      .describe(
        "Describe the screen, feature, or problem you want to design, " +
          "e.g. 'A settings page where users manage their notification preferences'",
      ),
  },
  async (args) => {
    return {
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text:
              `I'm starting a new design from scratch and need help planning it.\n\n` +
              `**My description:** ${args.description}\n\n` +
              `Please follow this workflow:\n\n` +
              `1. Use plan_flow with my description to identify UI patterns and components\n` +
              `2. Review the suggested patterns and component inventory\n` +
              `3. Use scaffold_semantics with the identified components to generate tokens\n` +
              `4. Use audit_semantics to check if my existing token system already covers some needs\n` +
              `5. Use analyze_coverage to show the coverage matrix\n` +
              `6. Provide a complete plan:\n` +
              `   - Which UI patterns to follow\n` +
              `   - Component list with token requirements\n` +
              `   - Which tokens already exist vs need to be created\n` +
              `   - Recommended color palette if no tokens exist yet\n` +
              `   - Accessibility considerations\n` +
              `   - Step-by-step implementation order`,
          },
        },
      ],
    };
  },
);

server.prompt(
  "design-handoff-review",
  "Review a design before developer handoff. Audits component coverage, " +
    "token completeness, naming compliance, and accessibility.",
  {
    components: z
      .string()
      .describe(
        "Comma-separated components in the design, e.g. 'button, card, text-input, tabs, modal'",
      ),
    description: z
      .string()
      .optional()
      .describe("Optional description of the design being reviewed"),
  },
  async (args) => {
    return {
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text:
              `I need to review a design before handing it off to developers.\n\n` +
              `**Components in the design:** ${args.components}\n` +
              (args.description ? `**Description:** ${args.description}\n` : "") +
              `\nPlease follow this workflow:\n\n` +
              `1. Use audit_design with the components to get a gap analysis\n` +
              `2. Use check_contrast to verify all color pairs pass WCAG 2.1 AA\n` +
              `3. Use analyze_coverage to see the full coverage matrix\n` +
              `4. If there are gaps, use scaffold_semantics to generate missing tokens\n` +
              `5. Provide a handoff-ready report:\n` +
              `   - Overall design-system compliance score\n` +
              `   - Missing tokens that need to be created\n` +
              `   - Naming issues that need fixing\n` +
              `   - Accessibility status (contrast, pairing)\n` +
              `   - Files that need to be updated\n` +
              `   - A checklist for the developer`,
          },
        },
      ],
    };
  },
);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[mcp-ds] Server started — project root: ${PROJECT_ROOT}`);
  console.error(
    `[mcp-ds] Token paths: ${config.tokenPaths.join(", ")}`,
  );
}

main().catch((err) => {
  console.error("[mcp-ds] Fatal error:", err);
  process.exit(1);
});
