# Testing systembridge-mcp Locally

This guide shows how to test systembridge-mcp in your IDE without hardcoding absolute paths.

## Quick Setup

1. **Build and link the server:**
   ```bash
   npm install
   npm run build
   npm link
   ```

2. **Add to your MCP configuration:**

   For **VS Code** (`~/Library/Application Support/Code/User/mcp.json`):
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

   For **Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
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

3. **Restart your IDE/app**

## Testing with Example Tokens

To test with the included example tokens:

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

Or simply omit `SYSTEMBRIDGE_MCP_PROJECT_ROOT` and let it use current directory:

```json
{
  "mcpServers": {
    "systembridge-mcp": {
      "command": "systembridge-mcp"
    }
  }
}
```

## Environment Variables

The server respects these environment variables:

- **`SYSTEMBRIDGE_MCP_PROJECT_ROOT`**: Absolute path to your design token project directory
- If not set, uses the current working directory (`process.cwd()`)

## Configuration File

The server looks for configuration in this order:
1. `systembridge-mcp.config.json`
2. `systembridge-mcp.config.json5`
3. `.systembridge-mcp.json`

If no config file is found, it uses sensible defaults and looks for tokens in `example-tokens/**/*.json`.

## Uninstalling

To remove the global link:
```bash
npm unlink -g systembridge-mcp
```

## Troubleshooting

**Command not found:**
- Ensure `npm link` completed successfully
- Check that your npm bin directory is in your PATH: `echo $PATH | grep $(npm bin -g)`

**Can't find tokens:**
- Set `SYSTEMBRIDGE_MCP_PROJECT_ROOT` to point to your token directory
- Or ensure you have a `systembridge-mcp.config.json` with `tokenPaths` configured

**Changes not reflected:**
- Rebuild after code changes: `npm run build`
- Restart your IDE/app
