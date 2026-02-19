# Setup by Client

Setup instructions for each MCP client. Project root is discovered automatically when you add a config file (`.systembridge-mcp.json` or `systembridge-mcp.config.json`) in your project—no path configuration needed.

## Cursor

### Config locations

- **Global:** `~/.cursor/mcp.json`
- **Project:** `.cursor/mcp.json` (recommended—committable, team-sharable)

### Zero-path setup (recommended)

1. Add systembridge-mcp as a devDependency:
   ```bash
   npm install -D systembridge-mcp
   ```

2. Add a config file in your project root (optional; sensible defaults apply):
   ```json
   // .systembridge-mcp.json or systembridge-mcp.config.json
   {
     "tokenPaths": ["tokens/**/*.json", "design-tokens/**/*.json"]
   }
   ```

3. Create `.cursor/mcp.json` in your project:
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

With project-level config, Cursor typically uses the project directory as the MCP process cwd. Config-file discovery also finds the project root by walking up from cwd.

**Note:** Cursor does not support `${workspaceFolder}` in env. Use project-level config instead.

---

## VS Code

### Config locations

- **User:** `~/Library/Application Support/Code/User/mcp.json` (macOS) or `%APPDATA%\Code\User\mcp.json` (Windows)
- **Workspace:** `.vscode/mcp.json` (if supported)

### Zero-path setup

**Option A: Project config + npx**
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

**Option B: Explicit cwd with `${workspaceFolder}`**
```json
{
  "mcpServers": {
    "systembridge-mcp": {
      "command": "npx",
      "args": ["systembridge-mcp"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

**Option C: Explicit project root via env**
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

VS Code supports `${workspaceFolder}` in `env` and `cwd`.

---

## Claude Desktop

### Config locations

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

### Setup (path required)

Claude Desktop does not have a workspace concept. You must set `SYSTEMBRIDGE_MCP_PROJECT_ROOT`:

```json
{
  "mcpServers": {
    "systembridge-mcp": {
      "command": "npx",
      "args": ["systembridge-mcp"],
      "env": {
        "SYSTEMBRIDGE_MCP_PROJECT_ROOT": "/absolute/path/to/your/design-tokens"
      }
    }
  }
}
```

For Windows:
```json
"SYSTEMBRIDGE_MCP_PROJECT_ROOT": "C:/Projects/your-design-tokens"
```

---

## Claude Code

### Config location

- **Project:** `.claude/mcp.json` (project root)

### Zero-path setup

When using project-level config, Claude Code typically runs the MCP with the project directory as cwd:

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

Add `.systembridge-mcp.json` or `systembridge-mcp.config.json` in the project root for config-file-based discovery.

---

## Summary

| Client            | Zero-path? | Notes                                                |
|-------------------|------------|------------------------------------------------------|
| Cursor            | Yes        | Use project-level `.cursor/mcp.json`; no `${workspaceFolder}` |
| VS Code           | Yes        | `${workspaceFolder}` supported in env/cwd            |
| Claude Desktop    | No         | Must set `SYSTEMBRIDGE_MCP_PROJECT_ROOT`             |
| Claude Code       | Yes        | Project config; cwd typically project root           |

For optional AI usage guidance: [Agent Instructions](agent-instructions.md)
