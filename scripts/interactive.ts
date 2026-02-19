#!/usr/bin/env tsx
/**
 * Interactive CLI for testing mcp-ds search functionality
 * Inspired by Dialtone MCP Server's interactive tool
 *
 * Usage: npm run interactive
 */

import * as readline from "node:readline";
import * as path from "node:path";
import { loadConfig } from "../src/config/loader.js";
import { searchTokens, formatSearchResults } from "../src/tools/search.js";

const PROJECT_ROOT = process.env.MCP_DS_PROJECT_ROOT || process.cwd();
const config = loadConfig(PROJECT_ROOT);

// ANSI color codes for styled output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: `${colors.cyan}>${colors.reset} `,
});

// Track debug mode
let debugMode = false;

function showWelcome() {
  console.log(`${colors.bright}${colors.blue}`);
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║          mcp-ds Interactive Search                        ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");
  console.log(colors.reset);
  console.log(`${colors.dim}Project root: ${PROJECT_ROOT}${colors.reset}`);
  console.log(
    `${colors.dim}Token paths: ${config.tokenPaths.join(", ")}${colors.reset}`,
  );
  console.log();
  console.log(`${colors.green}Query Format:${colors.reset} Use keywords only, not questions`);
  console.log(`  ${colors.dim}✓ Good:${colors.reset} "color blue", "spacing 8", "button"`);
  console.log(`  ${colors.dim}✗ Bad:${colors.reset} "how do I find blue?", "what tokens exist?"`);
  console.log();
  console.log(`${colors.yellow}Commands:${colors.reset}`);
  console.log(`  ${colors.cyan}.help${colors.reset}     Show this help`);
  console.log(`  ${colors.cyan}.debug${colors.reset}    Toggle debug mode (show raw JSON)`);
  console.log(`  ${colors.cyan}.clear${colors.reset}    Clear screen`);
  console.log(`  ${colors.cyan}.quit${colors.reset}     Exit (or Ctrl+C)`);
  console.log();
}

function showHelp() {
  console.log();
  console.log(`${colors.bright}Search Examples:${colors.reset}`);
  console.log(`  ${colors.dim}Colors:${colors.reset}        "color blue", "background primary", "#007bff"`);
  console.log(`  ${colors.dim}Spacing:${colors.reset}       "spacing 8", "space 400", "gap 16"`);
  console.log(`  ${colors.dim}Typography:${colors.reset}    "font family", "text size", "weight bold"`);
  console.log(`  ${colors.dim}Components:${colors.reset}    "button", "input", "card"`);
  console.log(`  ${colors.dim}Semantic:${colors.reset}      "action accent", "surface danger"`);
  console.log();
  console.log(`${colors.bright}Filters (add to query):${colors.reset}`);
  console.log(`  ${colors.dim}type:color${colors.reset}     Only color tokens`);
  console.log(`  ${colors.dim}type:dimension${colors.reset} Only spacing/size tokens`);
  console.log(`  ${colors.dim}deprecated:false${colors.reset} Exclude deprecated tokens`);
  console.log();
}

async function handleQuery(query: string) {
  const startTime = Date.now();

  try {
    const results = await searchTokens(
      { text: query },
      PROJECT_ROOT,
      config,
    );

    const searchTime = Date.now() - startTime;
    
    // Limit displayed results to first 15
    const displayResults = results.slice(0, 15);

    if (results.length === 0) {
      console.log(`${colors.yellow}No results found for "${query}"${colors.reset}`);
      console.log(`${colors.dim}Try different keywords or broader terms${colors.reset}`);
    } else {
      console.log(
        `${colors.dim}Found ${results.length} result${results.length > 1 ? "s" : ""}${results.length > 15 ? " (showing first 15)" : ""} in ${searchTime}ms${colors.reset}`,
      );
      console.log();

      if (debugMode) {
        // Debug mode: show raw JSON
        console.log(`${colors.bright}Raw JSON:${colors.reset}`);
        console.log(JSON.stringify(displayResults, null, 2));
      } else {
        // Normal mode: formatted output
        const formatted = formatSearchResults(displayResults);
        console.log(formatted);
      }
    }
  } catch (error) {
    console.error(
      `${colors.red}Error:${colors.reset} ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  console.log();
}

function handleCommand(cmd: string) {
  switch (cmd) {
    case ".help":
      showHelp();
      break;
    case ".debug":
      debugMode = !debugMode;
      console.log(
        `${colors.yellow}Debug mode: ${debugMode ? "ON" : "OFF"}${colors.reset}`,
      );
      console.log();
      break;
    case ".clear":
      console.clear();
      showWelcome();
      break;
    case ".quit":
    case ".exit":
      console.log(`${colors.dim}Goodbye!${colors.reset}`);
      process.exit(0);
      break;
    default:
      console.log(
        `${colors.red}Unknown command: ${cmd}${colors.reset}`,
      );
      console.log(`${colors.dim}Type .help for available commands${colors.reset}`);
      console.log();
  }
}

async function main() {
  showWelcome();

  rl.on("line", async (line) => {
    const input = line.trim();

    if (!input) {
      rl.prompt();
      return;
    }

    // Handle commands
    if (input.startsWith(".")) {
      handleCommand(input);
      rl.prompt();
      return;
    }

    // Handle search query
    await handleQuery(input);
    rl.prompt();
  });

  rl.on("close", () => {
    console.log(`${colors.dim}Goodbye!${colors.reset}`);
    process.exit(0);
  });

  rl.prompt();
}

main().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
