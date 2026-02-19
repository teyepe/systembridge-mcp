# Example MCP Configuration Files

Copy these examples to your MCP configuration file.

## For VS Code

Location: `~/Library/Application Support/Code/User/mcp.json` (macOS)

### Using npm link (recommended for development)

```json
{
  "mcpServers": {
    "systembridge-mcp": {
      "command": "systembridge-mcp",
      "env": {
        "SYSTEMBRIDGE_MCP_PROJECT_ROOT": "${workspaceFolder}"
      }
    }
  }
}
```

### Using direct path

```json
{
  "mcpServers": {
    "systembridge-mcp": {
      "command": "node",
      "args": ["/Users/tasos.dervenagas/Documents/repos/systembridge-mcp/dist/index.js"],
      "env": {
        "SYSTEMBRIDGE_MCP_PROJECT_ROOT": "${workspaceFolder}"
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
    "systembridge-mcp": {
      "command": "systembridge-mcp",
      "env": {
        "SYSTEMBRIDGE_MCP_PROJECT_ROOT": "/path/to/your/design-tokens"
      }
    }
  }
}
```

### Testing with example tokens

```json
{
  "mcpServers": {
    "systembridge-mcp": {
      "command": "systembridge-mcp",
      "env": {
        "SYSTEMBRIDGE_MCP_PROJECT_ROOT": "/Users/tasos.dervenagas/Documents/repos/systembridge-mcp"
      }
    }
  }
}
```

### Using current directory (auto-detect)

```json
{
  "mcpServers": {
    "systembridge-mcp": {
      "command": "systembridge-mcp"
    }
  }
}
```

## Multiple Token Projects

You can configure multiple instances pointing to different token projects:

```json
{
  "mcpServers": {
    "systembridge-mcp-project-a": {
      "command": "systembridge-mcp",
      "env": {
        "SYSTEMBRIDGE_MCP_PROJECT_ROOT": "/path/to/project-a/tokens"
      }
    },
    "systembridge-mcp-project-b": {
      "command": "systembridge-mcp",
      "env": {
        "SYSTEMBRIDGE_MCP_PROJECT_ROOT": "/path/to/project-b/design-system"
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
    "systembridge-mcp": {
      "command": "node",
      "args": ["C:/Users/YourName/systembridge-mcp/dist/index.js"],
      "env": {
        "SYSTEMBRIDGE_MCP_PROJECT_ROOT": "C:/Projects/design-tokens"
      }
    }
  }
}
```
