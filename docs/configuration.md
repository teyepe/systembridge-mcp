# Configuration

systembridge-mcp can be configured via a config file and environment variables.

## Config File Location

The server looks for configuration in this order:

1. `systembridge-mcp.config.json`
2. `systembridge-mcp.config.json5`
3. `.systembridge-mcp.json`

Place the file in your project root (or in the directory pointed to by `SYSTEMBRIDGE_MCP_PROJECT_ROOT`).

## Config File Structure

```json
{
  "tokenPaths": ["tokens/**/*.json"],
  "validation": {
    "preset": "recommended"
  },
  "transformation": {
    "platforms": ["css", "js"],
    "buildPath": "build/"
  },
  "theming": {
    "dimensions": [
      {
        "id": "color-scheme",
        "values": ["light", "dark"],
        "defaultValue": "light"
      }
    ],
    "themes": [
      {
        "id": "light",
        "coordinates": [{ "dimension": "color-scheme", "value": "light" }]
      }
    ]
  }
}
```

## Token Paths

- **tokenPaths:** Array of glob patterns for token files. Example: `["tokens/**/*.json", "design-tokens/*.json"]`
- Files can be anywhere; paths are relative to the project root.

## Token File Formats

Auto-detected formats:

- **W3C DTCG** — Design Token Community Group spec
- **Tokens Studio** — Figma plugin format
- **Style Dictionary** — Amazon's token format

## Project-Scoped Configuration

Create a `.systembridge-mcp.json` in your project root for team-wide search settings:

```json
{
  "tokenPaths": ["tokens/**/*.json"],
  "validation": {
    "preset": "recommended"
  },
  "search": {
    "includePrivate": false,
    "includeDraft": false,
    "showExamples": true,
    "defaultCategories": ["components", "semantic"]
  }
}
```

### Search Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `includePrivate` | `false` | Include private tokens by default |
| `includeDraft` | `false` | Include draft tokens by default |
| `showExamples` | `true` | Display usage examples in search results |
| `defaultCategories` | `null` | Filter to specific categories (omit for all) |

## Token Metadata Fields

Tokens can include metadata for richer search and guidance:

- **$lifecycle:** `draft` | `active` | `deprecated` — Token maturity state
- **$private:** `boolean` — Mark as internal (excluded from search by default)
- **$category:** `string` — Group tokens (e.g. "components", "semantic", "spacing")
- **$examples:** `array` — Usage examples in multiple frameworks (CSS, React, Vue, Tailwind)
- **$description:** `string` — Human-readable explanation

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SYSTEMBRIDGE_MCP_PROJECT_ROOT` | Absolute path to your design token project directory | Current working directory |
| `SYSTEMBRIDGE_MCP_CACHE` | Set to `"false"` to disable token caching | Enabled |
| `SYSTEMBRIDGE_MCP_SKIP_VERSION_CHECK` | Set to `"true"` to disable update notifications | Enabled |

Add these in your MCP server config under the `env` object.
