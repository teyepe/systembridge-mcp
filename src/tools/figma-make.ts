import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import { loadAllTokens } from "../lib/parser.js";
import { generateFigmaMakeDocs } from "../lib/figma/make-guidelines.js";
import type { McpDsConfig } from "../lib/types.js";

export const generateMakeGuidelinesTool = {
  name: "generate_make_guidelines",
  description:
    "Generate a structured 'guidelines/' folder for Figma Make. " +
    "Exports your design system's tokens and component rules into Markdown format " +
    "that Figma Make's AI can use to understand your system context.",
  inputSchema: z.object({
    outputDir: z
      .string()
      .optional()
      .describe(
        "Directory to write the guidelines to (relative to project root). " +
          "Default: 'figma-make-guidelines'",
      ),
    components: z
      .string()
      .optional()
      .describe(
        "Comma-separated list of component names to generate specific guidelines for. " +
          "If omitted, generates guidelines for all known components.",
      ),
  }),
  execute: async (
    args: { outputDir?: string; components?: string },
    projectRoot: string,
    config: McpDsConfig,
  ) => {
    const outputDir = args.outputDir || "figma-make-guidelines";
    const componentList = args.components
      ? args.components.split(",").map((c) => c.trim())
      : undefined;

    // 1. Load all tokens
    const tokens = await loadAllTokens(projectRoot, config);

    // 2. Generate docs
    const fileMap = generateFigmaMakeDocs(tokens, componentList);

    // 3. Write files
    const resolvedOutputDir = path.resolve(projectRoot, outputDir);
    const writtenFiles: string[] = [];

    // Create root guidelines folder
    if (!fs.existsSync(resolvedOutputDir)) {
      fs.mkdirSync(resolvedOutputDir, { recursive: true });
    }

    for (const [relativePath, content] of fileMap) {
      const fullPath = path.join(resolvedOutputDir, relativePath);
      const dir = path.dirname(fullPath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, content, "utf-8");
      writtenFiles.push(relativePath);
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Successfully generated Figma Make guidelines in '${outputDir}/'.\n\n` +
            `Created ${writtenFiles.length} files:\n` +
            writtenFiles.map(f => `- ${f}`).join("\n") +
            `\n\nTo use these in Figma Make:\n` +
            `1. Copy the contents of '${outputDir}/' to your Figma Make project's root.\n` +
            `2. Ensure the 'guidelines/' folder structure is preserved.`,
        },
      ],
    };
  },
};
