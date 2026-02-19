# Migration Executor Guide

Automated token migration execution system with dry-run, validation, and rollback capabilities.

## Overview

The migration executor implements the final step in the B→C migration pipeline:

```
Audit → Risk Assessment → Scenario Generation → **Execution**
```

It safely applies migration scenarios to your token system with:

- **Dry-run mode** (default): Preview changes before applying
- **Automated reference updates**: Finds and updates all token references
- **Validation**: Checks integrity, accessibility, and structure post-migration
- **Rollback**: Create snapshots before execution for easy rollback
- **Progress tracking**: Detailed reporting of each operation

## Architecture

### Core Components

1. **Executor** (`executor.ts`)
   - Phase execution orchestration
   - Action implementation (rename, merge, split, etc.)
   - Reference tracking and updates
   - Snapshot/rollback management

2. **Scanner** (`scanner.ts`)
   - Codebase scanning for token references
   - Multi-format support (TS/JS, CSS/SCSS, JSON)
   - Pattern matching for different reference styles
   - Bulk update capabilities

3. **Validator** (`validation.ts`)
   - Post-migration validation checks
   - Integrity verification (no broken refs, no circular deps)
   - Accessibility validation (WCAG contrast preservation)
   - Structural analysis (naming conventions, hierarchy)

## MCP Tool Usage

### execute_migration

Execute a migration scenario with safety features enabled by default.

```json
{
  "tool": "execute_migration",
  "args": {
    "scenarioId": "conservative-001",
    "phaseNumber": 1,
    "dryRun": true,
    "createSnapshot": true,
    "stopOnError": true,
    "skipValidation": false
  }
}
```

#### Parameters

- **scenarioId** (optional): ID from `generate_refactor_scenarios`. Default: uses conservative approach.
- **phaseNumber** (optional): Execute only this phase. Default: all phases.
- **dryRun** (optional): Preview mode (no changes applied). **DEFAULT: true** for safety.
- **createSnapshot** (optional): Create rollback snapshot. Default: true.
- **stopOnError** (optional): Stop on first error. Default: true.
- **skipValidation** (optional): Skip post-execution validation. Default: false.

#### Returns

Markdown report with:
- Phase-by-phase execution status
- Action results (rename, merge, split, etc.)
- Token operation details
- Reference update counts
- Validation results
- Summary statistics

## Execution Workflow

### 1. Preview (Dry Run)

Always start with dry run to see what will change:

```json
{
  "tool": "execute_migration",
  "args": {
    "scenarioId": "conservative-001",
    "dryRun": true
  }
}
```

**Output:**
```markdown
## Phase 1: Fix Critical Issues
✅ Status: completed
Actions: 3 (3 completed, 0 failed)

### Actions
✅ rename (12 targets)
  ✓ rename: `color.warning.background` → `background.feedback.warning`
     Updated 5 reference(s)
  ✓ rename: `text.error` → `text.feedback.danger`
     Updated 8 reference(s)
  ...

ℹ️ **This was a DRY RUN.** No changes were applied.
```

### 2. Execute Phase by Phase

Execute critical phases first, validate, then continue:

```json
{
  "tool": "execute_migration",
  "args": {
    "scenarioId": "conservative-001",
    "phaseNumber": 1,
    "dryRun": false,
    "createSnapshot": true
  }
}
```

**Output:**
```markdown
⚠️ LIVE EXECUTION
✅ Snapshot created: snapshot-1234567890

## Phase 1: Fix Critical Issues
✅ Status: completed
Duration: 1250ms

## Post-Execution Validation
✅ Migration Integrity: passed
✅ Reference Validation: passed
⚠️ Naming Convention Compliance: 2 warnings
✅ Structure Validation: passed
✅ Accessibility Validation: passed
```

### 3. Complete Migration

Once phases 1-N are validated, execute remaining:

```json
{
  "tool": "execute_migration",
  "args": {
    "scenarioId": "conservative-001",
    "dryRun": false
  }
}
```

## Migration Actions

The executor supports these action types:

### Rename
Renames token and updates all references.

```typescript
{
  type: "rename",
  targets: ["color.primary.text"],
  newPath: "text.action.default"
}
```

**Operations:**
- Updates token path in token map
- Finds all references across codebase
- Updates references in all files
- Validates no broken links remain

### Merge
Combines multiple tokens into one, redirecting all references.

```typescript
{
  type: "merge",
  targets: ["color.success", "color.positive"],
  newPath: "semantic.feedback.success"
}
```

**Operations:**
- Picks target token as survivor
- Redirects all source token references to target
- Deletes source tokens
- Validates no orphaned references

### Split
Marks token for manual split (creates placeholder).

```typescript
{
  type: "split",
  targets: ["color.primary"], // Used for too many purposes
}
```

**Operations:**
- Adds TODO note to token description
- Flags for manual review
- Requires human decision on split criteria

### Restructure
Rebuilds token path to match semantic ontology.

```typescript
{
  type: "restructure",
  targets: ["text.danger.bold"], // Non-standard structure
}
```

**Operations:**
- Parses token path components
- Rebuilds using ontology rules
- Updates token and references
- Validates new structure

### Delete
Removes unused token (only if no references exist).

```typescript
{
  type: "delete",
  targets: ["legacy.color.old"],
}
```

**Operations:**
- Checks for references (blocks if found)
- Removes token from map
- Validates no broken dependencies

### Create
Creates new semantic token placeholder.

```typescript
{
  type: "create",
  targets: ["background.feedback.info"],
}
```

**Operations:**
- Creates token with placeholder value
- Adds migration description
- Flags for value assignment

## Reference Scanning

The scanner finds token references across multiple file types:

### TypeScript/JavaScript Patterns

```typescript
// Import references
import { color } from './tokens';

// Object access
tokens['color.primary']
tokens.color.primary

// Function calls
getToken('color.primary')
useToken('color.primary')

// CSS-in-JS
theme.colors.primary
```

### CSS/SCSS Patterns

```css
/* CSS variables */
var(--color-primary)

/* SCSS variables */
$color-primary

/* Custom properties */
--color-primary: #007bff;
```

### JSON Patterns

```json
{
  "value": "{color.primary}",
  "color.primary": "#007bff"
}
```

### Scanner Usage

```typescript
import { scanTokenReferences } from './lib/migration/scanner.js';

const result = await scanTokenReferences({
  rootDir: './src',
  tokenPrefix: 'semantic',
  include: ['**/*.ts', '**/*.css'],
  exclude: ['**/node_modules/**'],
});

console.log(`Found ${result.referencesFound} references in ${result.filesScanned} files`);
```

## Validation Checks

Post-migration validation ensures system integrity:

### 1. Migration Integrity
- All operations completed successfully
- No duplicate token paths
- No failed actions

### 2. Reference Validation
- No broken references (all refs resolve)
- No circular dependencies
- All reference chains terminate

### 3. Naming Convention Compliance
- Tokens follow semantic ontology
- Proper structure: `<property>.<context>.<intent>.<state>`
- Primitives exempted (core.*, color.*)

### 4. Structure Validation
- No orphaned tokens (unless primitives)
- Reasonable reference depth (<4 levels)
- Proper hierarchy maintained

### 5. Accessibility Validation
- Color contrast ratios preserved
- WCAG AA compliance maintained (4.5:1)
- Foreground/background pairs checked

### Validation Output

```markdown
# Migration Validation Report

**Status:** ⚠️ WARNING

## Summary
- ✅ Passed: 4
- ⚠️ Warnings: 1
- ❌ Errors: 0

## Validation Checks

### ✅ Migration Integrity
**Category:** integrity
**Status:** passed
**Details:** Checked 3 phases, found 0 integrity issues

### ⚠️ Accessibility Validation
**Category:** accessibility
**Status:** warning
**Details:** Checked 42 color tokens for contrast

**Issues:**
⚠️ `text.feedback.warning`: Insufficient contrast with background.feedback.warning (ratio: 3.2:1)
  - *Suggestion:* Adjust colors to meet WCAG AA (4.5:1 for normal text)
```

## Snapshot & Rollback

### Creating Snapshots

Snapshots capture token state before migration:

```typescript
import { createSnapshot } from './lib/migration/executor.js';

const snapshot = createSnapshot(tokens, {
  description: 'Before Phase 1 execution',
  phaseNumber: 1,
  phaseName: 'Fix Critical Issues',
});

console.log(`Snapshot ID: ${snapshot.id}`);
```

### Rollback

If validation fails or issues arise, rollback to snapshot:

```typescript
import { rollback } from './lib/migration/executor.js';

rollback(tokens, snapshot);
console.log('Rolled back to previous state');
```

**Note:** Snapshots are in-memory. For persistent backups, commit to git before migration.

## Safety Features

### 1. Dry Run by Default
All executions default to dry-run mode. Must explicitly set `dryRun: false`.

### 2. Stop on Error
First failure stops execution, preventing cascade issues.

### 3. Automatic Snapshots
Creates snapshot before execution (can be disabled).

### 4. Validation Gates
Post-execution validation catches issues before committing.

### 5. Phase-by-Phase Execution
Execute one phase at a time, validate, then continue.

## Best Practices

### Start Conservative
1. Run dry-run on entire scenario
2. Execute Phase 1 only (critical fixes)
3. Validate thoroughly
4. Execute remaining phases if clean

### Git Integration
```bash
# Before migration
git checkout -b migration/semantic-refactor
git commit -am "Snapshot before migration"

# Execute phase
npm run mcp-tool execute_migration -- \
  --scenarioId conservative-001 \
  --phaseNumber 1 \
  --dryRun false

# If successful
git commit -am "Phase 1: Fix critical issues"

# If failed
git reset --hard HEAD
```

### Iterative Validation
- Validate after each phase
- Check visual regression if available
- Test against component library
- Review accessibility metrics

### Team Workflow
1. **Plan**: Generate scenarios, review with team
2. **Preview**: Dry-run execution, review changes
3. **Execute**: Phase-by-phase with validation
4. **Verify**: Manual testing of key components
5. **Document**: Update design system docs

## Troubleshooting

### "Cannot delete: N reference(s) exist"

**Cause:** Token marked for deletion still referenced.

**Solution:**
1. Run reference scan to find usages
2. Update references or remove from deletion list
3. Re-execute

### "Circular dependency detected"

**Cause:** Token references form a loop.

**Solution:**
1. Check validation report for cycle path
2. Break cycle by using direct value
3. Re-execute with restructured refs

### "Insufficient contrast"

**Cause:** Color changes violated WCAG contrast requirements.

**Solution:**
1. Review color pairs in validation report
2. Adjust color values to meet 4.5:1 ratio
3. Re-execute

### "Validation failed"

**Cause:** Post-migration checks found issues.

**Solution:**
1. Review validation report details
2. Rollback if needed: use snapshot ID
3. Fix issues in scenario
4. Re-execute

## API Reference

### executePhase()

Execute a single migration phase.

```typescript
async function executePhase(
  tokens: Map<string, DesignToken>,
  phase: MigrationPhase,
  options?: MigrationOptions,
): Promise<PhaseExecution>
```

### scanTokenReferences()

Scan codebase for token references.

```typescript
async function scanTokenReferences(
  options: ScanOptions,
): Promise<ScanResult>
```

### validateMigration()

Validate post-migration token system.

```typescript
async function validateMigration(
  tokens: Map<string, DesignToken>,
  execution: MigrationExecution,
): Promise<ValidationReport>
```

### createSnapshot()

Create token state snapshot for rollback.

```typescript
function createSnapshot(
  tokens: Map<string, DesignToken>,
  metadata: MigrationSnapshot['metadata'],
): MigrationSnapshot
```

### rollback()

Restore tokens to snapshot state.

```typescript
function rollback(
  tokens: Map<string, DesignToken>,
  snapshot: MigrationSnapshot,
): void
```

## Next Steps

- **Phase 5**: Codebase integration (build configs, CI/CD)
- **Phase 6**: Visual regression testing
- **Phase 7**: Documentation updates
- **Phase 8**: Team training and handoff

See [migration-system.md](./migration-system.md) for scenario generation and risk assessment.
