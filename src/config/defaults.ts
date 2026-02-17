/**
 * Default configuration values.
 *
 * If no mcp-ds.config.json is found the server runs with these sensible
 * defaults.  They're intentionally permissive so the MCP works out of the box
 * on any project that has token JSON files anywhere.
 */
import type { McpDsConfig } from "../lib/types.js";

export const DEFAULT_CONFIG: McpDsConfig = {
  tokenPaths: [
    "tokens/**/*.json",
    "tokens/**/*.json5",
    "tokens/**/*.yaml",
    "tokens/**/*.yml",
    "design-tokens/**/*.json",
  ],

  validation: {
    preset: "recommended",
    customRules: [],
    overrides: {},
  },

  transformation: {
    platforms: ["css", "js"],
    buildPath: "build/",
  },

  migration: {
    updateCodePatterns: ["src/**/*.{css,scss,js,ts,jsx,tsx,vue,svelte}"],
    excludePaths: ["node_modules", "dist", "build", ".git"],
  },
};
