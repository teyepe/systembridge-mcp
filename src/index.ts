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
} from "./tools/semantics.js";

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
  version: "0.3.0",
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
