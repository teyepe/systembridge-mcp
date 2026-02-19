/**
 * Style Dictionary configuration builder.
 *
 * Generates SD v4 configs for common platforms.  Teams can override
 * via their own config file referenced in systembridge-mcp.config.json.
 */
import * as path from "node:path";

/**
 * Platform presets — each produces a different output format.
 *
 * Teams can extend or override these.  The key insight: we keep the
 * presets simple and composable so they're easy to change later.
 */
export function buildPlatformConfig(
  platform: string,
  buildPath: string,
): Record<string, unknown> | null {
  switch (platform) {
    case "css":
      return {
        transformGroup: "css",
        buildPath: path.join(buildPath, "css/"),
        files: [
          {
            destination: "variables.css",
            format: "css/variables",
            options: { outputReferences: true },
          },
        ],
      };

    case "scss":
      return {
        transformGroup: "scss",
        buildPath: path.join(buildPath, "scss/"),
        files: [
          {
            destination: "_variables.scss",
            format: "scss/variables",
            options: { outputReferences: true },
          },
        ],
      };

    case "js":
      return {
        transformGroup: "js",
        buildPath: path.join(buildPath, "js/"),
        files: [
          {
            destination: "tokens.js",
            format: "javascript/es6",
          },
          {
            destination: "tokens.json",
            format: "json/nested",
          },
        ],
      };

    case "ts":
      return {
        transformGroup: "js",
        buildPath: path.join(buildPath, "ts/"),
        files: [
          {
            destination: "tokens.js",
            format: "javascript/es6",
          },
          {
            destination: "tokens.json",
            format: "json/nested",
          },
        ],
      };

    case "ios":
      return {
        transformGroup: "ios",
        buildPath: path.join(buildPath, "ios/"),
        files: [
          {
            destination: "StyleDictionaryColor.h",
            format: "ios/colors.h",
            className: "StyleDictionaryColor",
            filter: { type: "color" },
          },
          {
            destination: "StyleDictionaryColor.m",
            format: "ios/colors.m",
            className: "StyleDictionaryColor",
            filter: { type: "color" },
          },
        ],
      };

    case "ios-swift":
      return {
        transformGroup: "ios-swift",
        buildPath: path.join(buildPath, "ios-swift/"),
        files: [
          {
            destination: "StyleDictionary+Class.swift",
            format: "ios-swift/class.swift",
            className: "StyleDictionary",
          },
        ],
      };

    case "android":
      return {
        transformGroup: "android",
        buildPath: path.join(buildPath, "android/"),
        files: [
          {
            destination: "colors.xml",
            format: "android/colors",
            resourceType: "color",
            filter: { type: "color" },
          },
          {
            destination: "dimens.xml",
            format: "android/dimens",
            resourceType: "dimen",
            filter: { type: "dimension" },
          },
        ],
      };

    case "compose":
      return {
        transformGroup: "compose",
        buildPath: path.join(buildPath, "compose/"),
        files: [
          {
            destination: "StyleDictionaryTokens.kt",
            format: "compose/object",
            className: "StyleDictionaryTokens",
          },
        ],
      };

    default:
      return null;
  }
}
