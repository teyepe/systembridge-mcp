# Figma Integration Guide

## Overview

The Figma integration module enables bi-directional analysis between Figma variables and local design tokens. It helps maintain consistency by:

1. **Mapping Figma variables to local tokens** using multiple strategies (exact, normalized, semantic, value matching)
2. **Cross-referencing** to identify sync discrepancies
3. **Detecting naming inconsistencies** and suggesting resolutions
4. **Analyzing component token coverage** (comparing expected vs. bound tokens)

## Architecture

### Module Structure

```
src/lib/figma/
├── usage-analyzer.ts  (NEW) - Figma variable mapping and analysis
├── collections.ts            - Figma variable export/import
└── index.ts                  - Public API exports
```

### Data Flow

```
Figma MCP Tool → Variable Definitions
         ↓
   parseFigmaVariables() 
         ↓
   mapVariablesToTokens()  ← Local tokens from parser
         ↓
   analyzeVariableUsage()
         ↓
   correlateTokensWithFigma()
         ↓
   CrossReferenceReport
```

## MCP Tool: `audit_figma_usage`

### Parameters

- **figmaFileUrl** (required): Figma file URL  
  Format: `https://www.figma.com/file/KEY/...`

- **figmaNodeId** (optional): Specific node to analyze  
  If omitted, analyzes entire file

- **figmaVariableDefs** (optional): Pre-fetched variable definitions  
  Format: `{ "variable/path/name": "#value", ... }`  
  Obtained via `mcp_figma_get_variable_defs`

### Workflow

1. **Fetch Figma variables** (requires Figma MCP):
   ```typescript
   // Call Figma MCP tool first
   const variableDefs = await mcp_figma_get_variable_defs({
     nodeUrl: "https://www.figma.com/file/ABC123/MyFile"
   });
   ```

2. **Run audit**:
   ```typescript
   const result = await audit_figma_usage({
     figmaFileUrl: "https://www.figma.com/file/ABC123/MyFile",
     figmaNodeId: "123:456", // optional
     figmaVariableDefs: variableDefs
   });
   ```

3. **Review sync status**:
   - **Synced** (95%+): Local tokens and Figma variables well aligned
   - **Partial** (70-95%): Some discrepancies, actionable items
   - **Diverged** (<70%): Significant misalignment, requires synchronization

## Mapping Strategies

The system uses 4 strategies to map Figma variables to local tokens:

### 1. Exact Match (confidence: 1.0)
```
Figma:  icon.default.secondary
Local:  icon.default.secondary
→ Perfect match
```

### 2. Normalized Match (confidence: 0.95)
Handles separator differences (`/` vs `.` vs `-` vs `_`)
```
Figma:  icon/default/secondary
Local:  icon.default.secondary
→ Match after normalization
```

### 3. Semantic Match (confidence: 0.75-1.0)
Parses both as semantic tokens and compares structure components
```
Figma:  color/button/primary/default
Local:  background.button.primary.idle
→ Matches: property-class (background), uxContext (button), intent (primary)
```

### 4. Value Match (confidence: 0.7)
Same resolved color value
```
Figma:  brandColor → #3B82F6
Local:  primary.500 → #3B82F6
→ Both resolve to same value
```

## Cross-Reference Analysis

### Unused in Figma
Local tokens defined but not bound in Figma:
- May be deprecated
- May be used elsewhere (code, other files)
- May need documentation explaining non-usage

### Missing Local Definitions
Figma variables without corresponding local tokens:
- Create local definitions
- Import from Figma
- Add to token files

### Naming Discrepancies
Similar but not identical names (similarity > 70%):
- **rename-figma**: Update Figma variable name to match local convention
- **rename-local**: Update local token path to match Figma convention
- **create-alias**: Add alias in local tokens for compatibility

## Integration with Audit System

The Figma cross-reference can be integrated into semantic token audits:

```typescript
// In audit.ts
const figmaReport = integrateFigmaAnalysis(
  tokens,
  figmaVariables,
  mappings
);

const auditResult = auditSemanticTokens(tokens, {
  figma: figmaReport  // Optional parameter
});

// Result includes figma section in summary
```

## Example Output

```markdown
## Figma Usage Analysis

**File:** https://www.figma.com/file/ABC123/DesignSystem

### Variable Mapping
- **Total Figma variables:** 156
- **Mapped to local tokens:** 142
- **Unmapped:** 14
- **Mapping rate:** 91.0%

### Sync Status: **PARTIAL**
- **Score:** 87.5%

#### Unused in Figma (8)
- `background.card.subtle.hover`
- `border.input.error.focused`
...

#### Missing Local Definitions (6)
- `color/component/badge/info`
- `spacing/layout/sidebar/padding`
...

#### Naming Discrepancies (3)
- `icon/default/secondary` ≈ `icon.default.secondary` (95% similar) → rename figma
- `color/text/label` ≈ `foreground.label` (78% similar) → create alias
...

### Recommendations
- ✏️ **Resolve 3 naming discrepancies** — Similar but not identical names detected.
- 📝 **Add 6 local token(s)** — These Figma variables don't have local definitions.
- 🔍 **Review 8 unused token(s)** — Consider deprecating or documenting.
```

## Component Token Coverage Analysis

Analyze if components have complete token coverage:

```typescript
const coverage = analyzeComponentCoverage(
  "Button",
  "123:456",
  ["background.button.primary.default", "foreground.button.primary.default"],
  COMPONENT_TOKEN_SURFACES.button
);

// Result:
// - expectedTokens: All tokens a button should have
// - boundTokens: Tokens actually bound in Figma
// - missingTokens: Gaps in coverage
// - hardcodedProperties: Properties using literal values
// - coverageScore: 0-1 ratio
```

## Future Enhancements

- **Real-time sync**: Watch Figma file changes and auto-update local tokens
- **Bidirectional sync**: Push local token changes to Figma
- **Component-level analysis**: Deep inspection of component variants
- **Usage tracking**: Which components/frames use which tokens
- **Migration suggestions**: Automated refactoring of hardcoded values to tokens

## Related Tools

- **audit_design**: Design handoff audits (includes Figma sync in context)
- **analyze_topology**: Token dependency and anti-pattern analysis
- **transform_tokens**: Format conversion and token manipulation
