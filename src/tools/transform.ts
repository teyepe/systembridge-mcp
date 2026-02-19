/**
 * transform_tokens tool — Style Dictionary transformation engine.
 *
 * Transforms design tokens into platform-specific outputs (CSS, SCSS, JS,
 * iOS, Android, etc.) using Style Dictionary v4.
 *
 * Supports:
 * - Built-in platform presets (css, scss, js, ios, android, etc.)
 * - Custom Style Dictionary config file from systembridge-mcp.config.json
 * - Dry-run / preview mode (shows what would be generated without writing)
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { McpDsConfig } from "../lib/types.js";
import { buildPlatformConfig } from "../lib/style-dictionary-config.js";

export interface TransformToolArgs {
  /** Platforms to build (e.g. ["css", "js"]).  Defaults to config. */
  platforms?: string[];
  /** Preview-only — don't write files, just show what would be generated. */
  dryRun?: boolean;
}

export interface TransformResult {
  platform: string;
  success: boolean;
  files: string[];
  error?: string;
}

/**
 * Run Style Dictionary transformation for the requested platforms.
 */
export async function transformTokensTool(
  args: TransformToolArgs,
  projectRoot: string,
  config: McpDsConfig,
): Promise<{ results: TransformResult[]; formatted: string }> {
  const platforms = args.platforms ?? config.transformation.platforms;
  const buildPath = config.transformation.buildPath ?? "build/";
  const results: TransformResult[] = [];

  // Dynamic import — Style Dictionary v4 is ESM-first
  const StyleDictionary = (await import("style-dictionary")).default;

  // Check for custom SD config file.
  let customSDConfig: Record<string, unknown> | null = null;
  if (config.transformation.styleDictionaryConfig) {
    const configPath = path.resolve(
      projectRoot,
      config.transformation.styleDictionaryConfig,
    );
    if (fs.existsSync(configPath)) {
      customSDConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }
  }

  for (const platform of platforms) {
    try {
      // If custom config exists and has this platform, use it.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customPlatforms = (customSDConfig as any)?.platforms;
      const platformConfig =
        customPlatforms?.[platform] ??
        buildPlatformConfig(platform, buildPath);

      if (!platformConfig) {
        results.push({
          platform,
          success: false,
          files: [],
          error: `Unknown platform "${platform}". Available: css, scss, js, ts, ios, ios-swift, android, compose`,
        });
        continue;
      }

      // Resolve token source paths.
      const source = config.tokenPaths.map((p) =>
        path.isAbsolute(p) ? p : path.join(projectRoot, p),
      );

      // Ensure buildPath is absolute.
      const absBuildPath = path.isAbsolute(platformConfig.buildPath as string)
        ? platformConfig.buildPath as string
        : path.join(projectRoot, platformConfig.buildPath as string);

      const sdConfig: Record<string, unknown> = {
        source,
        platforms: {
          [platform]: {
            ...platformConfig,
            buildPath: absBuildPath.endsWith("/")
              ? absBuildPath
              : absBuildPath + "/",
          },
        },
      };

      if (args.dryRun) {
        // In dry-run mode, report what files would be generated.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const files = (platformConfig as any).files as Array<{
          destination: string;
        }>;
        const filePaths = files.map(
          (f) => path.join(absBuildPath, f.destination),
        );
        results.push({
          platform,
          success: true,
          files: filePaths.map((f) => path.relative(projectRoot, f)),
        });
        continue;
      }

      // Actually build.
      const sd = new StyleDictionary(sdConfig);
      await sd.buildPlatform(platform);

      // Collect generated files.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const files = (platformConfig as any).files as Array<{
        destination: string;
      }>;
      const filePaths = files.map(
        (f) => path.join(absBuildPath, f.destination),
      );

      results.push({
        platform,
        success: true,
        files: filePaths
          .filter((f) => fs.existsSync(f))
          .map((f) => path.relative(projectRoot, f)),
      });
    } catch (err) {
      results.push({
        platform,
        success: false,
        files: [],
        error: (err as Error).message,
      });
    }
  }

  const formatted = formatTransformResults(results, args.dryRun);
  return { results, formatted };
}

function formatTransformResults(
  results: TransformResult[],
  dryRun?: boolean,
): string {
  const lines: string[] = [];
  const prefix = dryRun ? "[DRY RUN] " : "";

  lines.push(`${prefix}Token Transformation Results:\n`);

  for (const r of results) {
    if (r.success) {
      lines.push(`  ✓ ${r.platform}`);
      for (const f of r.files) {
        lines.push(`    → ${f}`);
      }
    } else {
      lines.push(`  ✗ ${r.platform}: ${r.error}`);
    }
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  lines.push(
    `\n${prefix}${succeeded} platform(s) succeeded, ${failed} failed`,
  );

  return lines.join("\n");
}
