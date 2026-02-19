# Example MCP Configuration Files

Copy these examples to your MCP configuration file.

## For VS Code

Location: `~/Library/Application Support/Code/User/mcp.json` (macOS)

### Using npm link (recommended for development)

```json
{
  "mcpServers": {
    "mcp-ds": {
      "command": "mcp-ds",
      "env": {
        "MCP_DS_PROJECT_ROOT": "${workspaceFolder}"
      }
    }
  }
}
```

### Using direct path

```json
{
  "mcpServers": {
    "mcp-ds": {
      "command": "node",
      "args": ["/Users/tasos.dervenagas/Documents/repos/mcp-ds/dist/index.js"],
      "env": {
        "MCP_DS_PROJECT_ROOT": "${workspaceFolder}"
      }
    }
  }
}
```

## For Claude Desktop

Location: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

### Using npm link

```json
{
  "mcpServers": {
    "mcp-ds": {
      "command": "mcp-ds",
      "env": {
        "MCP_DS_PROJECT_ROOT": "/path/to/your/design-tokens"
      }
    }
  }
}
```

### Testing with example tokens

```json
{
  "mcpServers": {
    "mcp-ds": {
      "command": "mcp-ds",
      "env": {
        "MCP_DS_PROJECT_ROOT": "/Users/tasos.dervenagas/Documents/repos/mcp-ds"
      }
    }
  }
}
```

### Using current directory (auto-detect)

```json
{
  "mcpServers": {
    "mcp-ds": {
      "command": "mcp-ds"
    }
  }
}
```

## Multiple Token Projects

You can configure multiple instances pointing to different token projects:

```json
{
  "mcpServers": {
    "mcp-ds-project-a": {
      "command": "mcp-ds",
      "env": {
        "MCP_DS_PROJECT_ROOT": "/path/to/project-a/tokens"
      }
    },
    "mcp-ds-project-b": {
      "command": "mcp-ds",
      "env": {
        "MCP_DS_PROJECT_ROOT": "/path/to/project-b/design-system"
      }
    }
  }
}
```

## Windows Paths

For Windows users, use double backslashes or forward slashes:

```json
{
  "mcpServers": {
    "mcp-ds": {
      "command": "node",
      "args": ["C:/Users/YourName/mcp-ds/dist/index.js"],
      "env": {
        "MCP_DS_PROJECT_ROOT": "C:/Projects/design-tokens"
      }
    }
  }
}
```
