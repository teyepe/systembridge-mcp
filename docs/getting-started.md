# Getting Started

This guide walks you through installing systembridge-mcp and connecting it to your AI assistant.

## What You Need

- **Node.js 18+** — Check with `node --version`
- An AI assistant that supports MCP (e.g. [Claude Desktop](https://claude.ai/download), Cursor, VS Code with MCP extension)

## Installation

### Recommended: Install from npm

```bash
npm install -D systembridge-mcp
```

Then add `.cursor/mcp.json` (or your MCP config) with:

```json
{
  "mcpServers": {
    "systembridge-mcp": {
      "command": "npx",
      "args": ["systembridge-mcp"]
    }
  }
}
```

Add `.systembridge-mcp.json` or `systembridge-mcp.config.json` in your project root (optional). The server discovers the project root by walking up from cwd to find a config file—no path configuration needed.

### From source (development)

```bash
git clone https://github.com/teyepe/systembridge-mcp.git
cd systembridge-mcp
npm install && npm run build
npm link
```

## Connect to Your AI Assistant

**Client-specific setup:** See [Setup by Client](setup-by-client.md) for Cursor, VS Code, Claude Desktop, and Claude Code.

### Configuration File Locations

- **Claude Desktop (macOS):** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Claude Desktop (Windows):** `%APPDATA%\Claude\claude_desktop_config.json`
- **Cursor:** `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project)
- **VS Code:** `~/Library/Application Support/Code/User/mcp.json` or `.vscode/mcp.json`

### Zero-path setup (recommended)

When using project-level MCP config (e.g. `.cursor/mcp.json`), the MCP process cwd is typically the project root. Config-file discovery also finds the root by walking up from cwd. No `SYSTEMBRIDGE_MCP_PROJECT_ROOT` needed.

```json
{
  "mcpServers": {
    "systembridge-mcp": {
      "command": "npx",
      "args": ["systembridge-mcp"]
    }
  }
}
```

### Explicit path (Claude Desktop, etc.)

For clients without a workspace concept, set the project root:

```json
{
  "mcpServers": {
    "systembridge-mcp": {
      "command": "npx",
      "args": ["systembridge-mcp"],
      "env": {
        "SYSTEMBRIDGE_MCP_PROJECT_ROOT": "/path/to/your/design-tokens"
      }
    }
  }
}
```

## After Configuration

1. **Restart your AI assistant** so it picks up the new MCP server.
2. **Look for the MCP icon** — you should see 32 tools available from systembridge-mcp.

## Testing with Example Tokens

To try systembridge-mcp with the included example tokens, point `SYSTEMBRIDGE_MCP_PROJECT_ROOT` to the repository root, or run from that directory (config-file discovery will find it if `.systembridge-mcp.json` exists there).

See [TESTING.md](../TESTING.md) for local development with `npm link`.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SYSTEMBRIDGE_MCP_PROJECT_ROOT` | Absolute path to your design token project directory | Auto-discovered from cwd (walk up to find config file) |
| `SYSTEMBRIDGE_MCP_CACHE` | Set to `"false"` to disable token caching | Enabled |
| `SYSTEMBRIDGE_MCP_SKIP_VERSION_CHECK` | Set to `"true"` to disable update notifications | Enabled |

## Configuration File

The server looks for configuration in this order:

1. `systembridge-mcp.config.json`
2. `systembridge-mcp.config.json5`
3. `.systembridge-mcp.json`

If no config file is found, it uses sensible defaults and looks for tokens in `example-tokens/**/*.json`.

For all configuration details (config file structure, env vars, token paths, project-scoped settings): [Configuration](configuration.md).

**Optional:** [Agent Instructions](agent-instructions.md) — copy-paste templates for `.cursorrules` or `.claude/instructions` to improve AI token usage.

## Troubleshooting

**Command not found (when using npm link):**
- Ensure `npm link` completed successfully.
- Check that your npm bin directory is in your PATH: `echo $PATH | grep $(npm bin -g)`.

**Can't find tokens:**
- Add `.systembridge-mcp.json` or `systembridge-mcp.config.json` in your project root—the server discovers the root by walking up from cwd.
- Or set `SYSTEMBRIDGE_MCP_PROJECT_ROOT` to point to your token directory.
- Ensure `tokenPaths` in config matches your token file locations (see [configuration.md](./configuration.md)).

**Tools not appearing:**
- Restart your AI assistant after changing the config.
- Check that the config JSON is valid (no trailing commas, correct brackets).

**Changes not reflected:**
- Rebuild after code changes: `npm run build`.
- Restart your IDE or AI assistant.
