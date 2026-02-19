# For Developers

This guide covers CLI usage, the MCP API, extending the server, and testing.

## CLI Usage

Run the server standalone for debugging:

```bash
# Start the server (STDIO mode)
npm start

# Development mode with auto-reload
npm run dev
```

## Interactive CLI

Test search functionality without running a full MCP client:

```bash
npm run interactive
```

**Example session:**

```
> color blue
Found 12 token(s):
  **color.primary.500**
    Value: "#3B82F6"
    Type: color
    Match: text matched in value

> spacing 8
Found 3 token(s):
  **spacing.2**
    Value: "8px"
    Type: dimension

> .help        # Show command reference
> .debug       # Toggle raw JSON output
> .quit        # Exit
```

## MCP Protocol

The server implements the [Model Context Protocol](https://modelcontextprotocol.io) over STDIO. Tools are exposed as JSON-RPC methods.

**Example: Search tokens**

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "search_tokens",
    "arguments": {
      "query": "blue",
      "type": "color"
    }
  },
  "id": 1
}
```

## Extending the Server

The codebase is modular:

- **Add tools:** Create functions in `src/tools/` and register in `src/index.ts`
- **Extend ontology:** Edit `src/lib/semantics/ontology.ts`
- **Add UI patterns:** Edit `src/lib/designer/patterns.ts`
- **Add palette strategies:** Implement in `src/lib/palette/strategies/`

See [AGENT_HANDOFF.md](./AGENT_HANDOFF.md) for architecture details.

## Testing

```bash
# Run all tests
npm test

# Watch mode (auto-rerun on changes)
npm run test:watch

# With coverage report
npm run test:coverage
```

**Test coverage includes:** color queries, spacing, typography, semantic queries, lifecycle filtering, private token filtering, category filtering, usage examples, path prefix, and result structure validation.

## Performance Benchmarking

```bash
npm run benchmark
```

Measures search speed with and without caching. Caching is enabled by default and typically yields ~50% faster queries for repeated calls.

## Version Checking

The server checks for updates on startup. To disable:

```json
{
  "mcpServers": {
    "systembridge-mcp": {
      "command": "node",
      "args": ["/path/to/systembridge-mcp/dist/index.js"],
      "env": {
        "SYSTEMBRIDGE_MCP_SKIP_VERSION_CHECK": "true"
      }
    }
  }
}
```

## Token Caching

Caching is enabled by default. To disable:

```json
{
  "mcpServers": {
    "systembridge-mcp": {
      "command": "node",
      "args": ["/path/to/systembridge-mcp/dist/index.js"],
      "env": {
        "SYSTEMBRIDGE_MCP_CACHE": "false"
      }
    }
  }
}
```

## Type Checking and Build

```bash
# Build and type check
npm run build

# Watch mode (auto-rebuild on changes)
npm run watch
```

## Manual MCP Testing

```bash
# Start server in STDIO mode
npm start

# In another terminal, send test messages
echo '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}' | npm start
```
