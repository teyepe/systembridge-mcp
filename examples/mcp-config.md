# Example MCP Configuration Files

Copy these examples to your MCP configuration file. For per-client setup (Cursor, VS Code, Claude Desktop, Claude Code), see [Setup by Client](../docs/setup-by-client.md).

## Zero-path setup (recommended)

Add `systembridge-mcp` as a devDependency and use npx. No `SYSTEMBRIDGE_MCP_PROJECT_ROOT` needed when using project-level MCP config—the server discovers the project root by walking up to find a config file.

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

Place this in `.cursor/mcp.json` (Cursor) or your MCP config location. Add `.systembridge-mcp.json` or `systembridge-mcp.config.json` in your project root (optional; sensible defaults apply).

## For Cursor

Location: `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project)

### Zero-path (project-level)

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

## For VS Code

Location: `~/Library/Application Support/Code/User/mcp.json` (macOS)

### Zero-path

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

### With explicit workspace folder

```json
{
  "mcpServers": {
    "systembridge-mcp": {
      "command": "npx",
      "args": ["systembridge-mcp"],
      "env": {
        "SYSTEMBRIDGE_MCP_PROJECT_ROOT": "${workspaceFolder}"
      }
    }
  }
}
```

## For Claude Desktop

Location: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS). Claude Desktop has no workspace concept—set `SYSTEMBRIDGE_MCP_PROJECT_ROOT`.

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

## Multiple Token Projects

```json
{
  "mcpServers": {
    "systembridge-mcp-project-a": {
      "command": "npx",
      "args": ["systembridge-mcp"],
      "env": {
        "SYSTEMBRIDGE_MCP_PROJECT_ROOT": "/path/to/project-a/tokens"
      }
    },
    "systembridge-mcp-project-b": {
      "command": "npx",
      "args": ["systembridge-mcp"],
      "env": {
        "SYSTEMBRIDGE_MCP_PROJECT_ROOT": "/path/to/project-b/design-system"
      }
    }
  }
}
```

## Windows Paths

```json
{
  "mcpServers": {
    "systembridge-mcp": {
      "command": "npx",
      "args": ["systembridge-mcp"],
      "env": {
        "SYSTEMBRIDGE_MCP_PROJECT_ROOT": "C:/Projects/design-tokens"
      }
    }
  }
}
```
