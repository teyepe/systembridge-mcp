#!/usr/bin/env node
/**
 * mcp-ds — Design System MCP Server
 *
 * A Model Context Protocol server for design token management,
 * transformation, validation, and evolution.
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
  version: "0.1.0",
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
