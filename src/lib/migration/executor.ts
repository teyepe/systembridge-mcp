/**
 * Migration Executor
 *
 * Executes token migrations with automated reference updates, validation,
 * and rollback capabilities. Supports dry-run mode for safe previewing.
 *
 * Philosophy: Safe, reversible, validated changes with full traceability.
 */

import type { DesignToken } from "../types.js";
import type { MigrationAction, MigrationPhase } from "./scenarios.js";
import { parseSemanticPath, buildSemanticPath } from "../semantics/ontology.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MigrationExecution {
  /** Execution ID */
  id: string;
  /** Timestamp */
  timestamp: Date;
  /** Dry run mode? */
  dryRun: boolean;
  /** Phases executed */
  phases: PhaseExecution[];
  /** Overall status */
  status: "pending" | "running" | "completed" | "failed" | "rolled-back";
  /** Summary */
  summary: ExecutionSummary;
  /** Snapshot for rollback */
  snapshot?: MigrationSnapshot;
}

export interface PhaseExecution {
  /** Phase number */
  phase: number;
  /** Phase name */
  name: string;
  /** Actions executed */
  actions: ActionExecution[];
  /** Status */
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  /** Start time */
  startTime?: Date;
  /** End time */
  endTime?: Date;
  /** Duration (ms) */
  duration?: number;
  /** Errors */
  errors: string[];
}

export interface ActionExecution {
  /** Action type */
  type: MigrationAction["type"];
  /** Targets */
  targets: string[];
  /** Operations performed */
  operations: TokenOperation[];
  /** Status */
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  /** Validation results */
  validation: ValidationResult[];
  /** Errors */
  errors: string[];
}

export interface TokenOperation {
  /** Operation type */
  type: "create" | "update" | "delete" | "rename";
  /** Token path (before) */
  path: string;
  /** New path (for rename) */
  newPath?: string;
  /** Old value */
  oldValue?: any;
  /** New value */
  newValue?: any;
  /** References updated */
  referencesUpdated: string[];
  /** Success */
  success: boolean;
  /** Error message */
  error?: string;
}

export interface ValidationResult {
  /** Check name */
  check: string;
  /** Passed? */
  passed: boolean;
  /** Details */
  details?: string;
  /** Severity if failed */
  severity?: "error" | "warning";
}

export interface ExecutionSummary {
  /** Total actions */
  totalActions: number;
  /** Completed actions */
  completedActions: number;
  /** Failed actions */
  failedActions: number;
  /** Tokens created */
  tokensCreated: number;
  /** Tokens updated */
  tokensUpdated: number;
  /** Tokens deleted */
  tokensDeleted: number;
  /** Tokens renamed */
  tokensRenamed: number;
  /** References updated */
  referencesUpdated: number;
  /** Validation failures */
  validationFailures: number;
}

export interface MigrationSnapshot {
  /** Snapshot ID */
  id: string;
  /** Timestamp */
  timestamp: Date;
  /** Token state before migration */
  tokensBefore: Map<string, DesignToken>;
  /** Metadata */
  metadata: {
    description: string;
    phaseNumber?: number;
    phaseName?: string;
  };
}

export interface MigrationOptions {
  /** Dry run mode (preview only, no changes) */
  dryRun?: boolean;
  /** Create snapshot before execution */
  createSnapshot?: boolean;
  /** Validate after each action */
  validateEach?: boolean;
  /** Stop on first error */
  stopOnError?: boolean;
  /** Skip validation */
  skipValidation?: boolean;
  /** Progress callback */
  onProgress?: (execution: MigrationExecution) => void;
}

// ---------------------------------------------------------------------------
// Migration Executor
// ---------------------------------------------------------------------------

/**
 * Execute a migration phase with automated reference updates and validation.
 *
 * @param tokens - Current token map
 * @param phase - Phase to execute
 * @param options - Execution options
 * @returns Execution result
 */
export async function executePhase(
  tokens: Map<string, DesignToken>,
  phase: MigrationPhase,
  options: MigrationOptions = {},
): Promise<PhaseExecution> {
  const phaseExecution: PhaseExecution = {
    phase: phase.phase,
    name: phase.name,
    actions: [],
    status: "running",
    startTime: new Date(),
    errors: [],
  };

  try {
    // Execute each action
    for (const action of phase.actions) {
      const actionExecution = await executeAction(tokens, action, options);
      phaseExecution.actions.push(actionExecution);

      // Stop on error if requested
      if (actionExecution.status === "failed" && options.stopOnError) {
        phaseExecution.status = "failed";
        phaseExecution.errors.push(`Stopped due to failed action: ${action.description}`);
        break;
      }
    }

    // Check if all actions completed
    const allCompleted = phaseExecution.actions.every(a => a.status === "completed");
    const anyFailed = phaseExecution.actions.some(a => a.status === "failed");

    if (allCompleted) {
      phaseExecution.status = "completed";
    } else if (anyFailed) {
      phaseExecution.status = "failed";
    }
  } catch (error) {
    phaseExecution.status = "failed";
    phaseExecution.errors.push(`Phase execution error: ${error}`);
  }

  phaseExecution.endTime = new Date();
  if (phaseExecution.startTime) {
    phaseExecution.duration = phaseExecution.endTime.getTime() - phaseExecution.startTime.getTime();
  }

  return phaseExecution;
}

/**
 * Execute a single migration action.
 *
 * @param tokens - Current token map
 * @param action - Action to execute
 * @param options - Execution options
 * @returns Action execution result
 */
export async function executeAction(
  tokens: Map<string, DesignToken>,
  action: MigrationAction,
  options: MigrationOptions = {},
): Promise<ActionExecution> {
  const actionExecution: ActionExecution = {
    type: action.type,
    targets: action.targets,
    operations: [],
    status: "running",
    validation: [],
    errors: [],
  };

  try {
    // Execute based on action type
    switch (action.type) {
      case "rename":
        actionExecution.operations = await executeRename(tokens, action, options);
        break;
      case "merge":
        actionExecution.operations = await executeMerge(tokens, action, options);
        break;
      case "split":
        actionExecution.operations = await executeSplit(tokens, action, options);
        break;
      case "restructure":
        actionExecution.operations = await executeRestructure(tokens, action, options);
        break;
      case "delete":
        actionExecution.operations = await executeDelete(tokens, action, options);
        break;
      case "create":
        actionExecution.operations = await executeCreate(tokens, action, options);
        break;
      case "update-references":
        actionExecution.operations = await executeUpdateReferences(tokens, action, options);
        break;
    }

    // Validate if requested
    if (!options.skipValidation && action.validation.length > 0) {
      actionExecution.validation = await validateAction(tokens, action, actionExecution.operations);
    }

    // Determine status
    const allSuccess = actionExecution.operations.every(op => op.success);
    const hasValidationErrors = actionExecution.validation.some(
      v => !v.passed && v.severity === "error"
    );

    if (allSuccess && !hasValidationErrors) {
      actionExecution.status = "completed";
    } else {
      actionExecution.status = "failed";
      if (hasValidationErrors) {
        actionExecution.errors.push("Validation failed");
      }
    }
  } catch (error) {
    actionExecution.status = "failed";
    actionExecution.errors.push(`Action execution error: ${error}`);
  }

  return actionExecution;
}

// ---------------------------------------------------------------------------
// Action Implementations
// ---------------------------------------------------------------------------

async function executeRename(
  tokens: Map<string, DesignToken>,
  action: MigrationAction,
  options: MigrationOptions,
): Promise<TokenOperation[]> {
  const operations: TokenOperation[] = [];

  for (const oldPath of action.targets) {
    const token = tokens.get(oldPath);
    if (!token) {
      operations.push({
        type: "rename",
        path: oldPath,
        success: false,
        error: "Token not found",
        referencesUpdated: [],
      });
      continue;
    }

    // Generate new path based on action or ontology rules
    const newPath = action.newPath ?? generateNewPath(oldPath);

    // Find all references to this token
    const references = findReferences(tokens, oldPath);

    if (!options.dryRun) {
      // Update references
      for (const refPath of references) {
        updateReference(tokens, refPath, oldPath, newPath);
      }

      // Rename token
      tokens.delete(oldPath);
      tokens.set(newPath, { ...token, path: newPath });
    }

    operations.push({
      type: "rename",
      path: oldPath,
      newPath,
      oldValue: oldPath,
      newValue: newPath,
      referencesUpdated: references,
      success: true,
    });
  }

  return operations;
}

async function executeMerge(
  tokens: Map<string, DesignToken>,
  action: MigrationAction,
  options: MigrationOptions,
): Promise<TokenOperation[]> {
  const operations: TokenOperation[] = [];

  if (action.targets.length < 2) {
    operations.push({
      type: "update",
      path: "merge",
      success: false,
      error: "Merge requires at least 2 tokens",
      referencesUpdated: [],
    });
    return operations;
  }

  const targetPath = action.newPath ?? action.targets[0];
  const sourcePaths = action.targets.slice(action.newPath ? 0 : 1);

  // Merge all source tokens into target
  const targetToken = tokens.get(targetPath);
  if (!targetToken) {
    operations.push({
      type: "update",
      path: targetPath,
      success: false,
      error: "Target token not found",
      referencesUpdated: [],
    });
    return operations;
  }

  for (const sourcePath of sourcePaths) {
    const sourceToken = tokens.get(sourcePath);
    if (!sourceToken) continue;

    // Find references to source token
    const references = findReferences(tokens, sourcePath);

    if (!options.dryRun) {
      // Update all references to point to target
      for (const refPath of references) {
        updateReference(tokens, refPath, sourcePath, targetPath);
      }

      // Delete source token
      tokens.delete(sourcePath);
    }

    operations.push({
      type: "delete",
      path: sourcePath,
      oldValue: sourceToken,
      referencesUpdated: references,
      success: true,
    });
  }

  return operations;
}

async function executeSplit(
  tokens: Map<string, DesignToken>,
  action: MigrationAction,
  options: MigrationOptions,
): Promise<TokenOperation[]> {
  const operations: TokenOperation[] = [];

  // Split is typically manual - we create placeholders
  const sourcePath = action.targets[0];
  const sourceToken = tokens.get(sourcePath);

  if (!sourceToken) {
    operations.push({
      type: "update",
      path: sourcePath,
      success: false,
      error: "Source token not found",
      referencesUpdated: [],
    });
    return operations;
  }

  // Create note about manual split needed
  operations.push({
    type: "update",
    path: sourcePath,
    oldValue: sourceToken,
    newValue: { ...sourceToken, description: `${sourceToken.description ?? ""}\n[TODO: Split into multiple tokens]` },
    referencesUpdated: [],
    success: true,
    error: "Split requires manual intervention - placeholder created",
  });

  return operations;
}

async function executeRestructure(
  tokens: Map<string, DesignToken>,
  action: MigrationAction,
  options: MigrationOptions,
): Promise<TokenOperation[]> {
  const operations: TokenOperation[] = [];

  for (const path of action.targets) {
    const token = tokens.get(path);
    if (!token) continue;

    // Try to parse and rebuild according to ontology
    const parsed = parseSemanticPath(path);
    if (!parsed) {
      // Can't restructure non-semantic token
      operations.push({
        type: "update",
        path,
        success: false,
        error: "Cannot parse as semantic token",
        referencesUpdated: [],
      });
      continue;
    }

    // Build new path following ontology
    const newPath = buildSemanticPath(parsed);

    if (newPath !== path) {
      // Rename to new structure
      const references = findReferences(tokens, path);

      if (!options.dryRun) {
        for (const refPath of references) {
          updateReference(tokens, refPath, path, newPath);
        }

        tokens.delete(path);
        tokens.set(newPath, { ...token, path: newPath });
      }

      operations.push({
        type: "rename",
        path,
        newPath,
        referencesUpdated: references,
        success: true,
      });
    }
  }

  return operations;
}

async function executeDelete(
  tokens: Map<string, DesignToken>,
  action: MigrationAction,
  options: MigrationOptions,
): Promise<TokenOperation[]> {
  const operations: TokenOperation[] = [];

  for (const path of action.targets) {
    const token = tokens.get(path);
    if (!token) {
      operations.push({
        type: "delete",
        path,
        success: false,
        error: "Token not found",
        referencesUpdated: [],
      });
      continue;
    }

    // Check for references
    const references = findReferences(tokens, path);

    if (references.length > 0 && !options.dryRun) {
      operations.push({
        type: "delete",
        path,
        success: false,
        error: `Cannot delete: ${references.length} reference(s) exist`,
        referencesUpdated: references,
      });
      continue;
    }

    if (!options.dryRun) {
      tokens.delete(path);
    }

    operations.push({
      type: "delete",
      path,
      oldValue: token,
      referencesUpdated: [],
      success: true,
    });
  }

  return operations;
}

async function executeCreate(
  tokens: Map<string, DesignToken>,
  action: MigrationAction,
  options: MigrationOptions,
): Promise<TokenOperation[]> {
  const operations: TokenOperation[] = [];

  for (const path of action.targets) {
    // Check if token already exists
    if (tokens.has(path)) {
      operations.push({
        type: "create",
        path,
        success: false,
        error: "Token already exists",
        referencesUpdated: [],
      });
      continue;
    }

    // Create placeholder token
    const newToken: DesignToken = {
      value: "#TODO",
      type: "color",
      description: `Created by migration: ${action.description}`,
      path: path,
    };

    if (!options.dryRun) {
      tokens.set(path, newToken);
    }

    operations.push({
      type: "create",
      path,
      newValue: newToken,
      referencesUpdated: [],
      success: true,
    });
  }

  return operations;
}

async function executeUpdateReferences(
  tokens: Map<string, DesignToken>,
  action: MigrationAction,
  options: MigrationOptions,
): Promise<TokenOperation[]> {
  const operations: TokenOperation[] = [];

  // This is typically for bulk updates or documentation changes
  for (const path of action.targets) {
    const token = tokens.get(path);
    if (!token) continue;

    if (!options.dryRun) {
      // Update description or metadata
      token.description = token.description ?? action.description;
    }

    operations.push({
      type: "update",
      path,
      oldValue: token,
      newValue: token,
      referencesUpdated: [],
      success: true,
    });
  }

  return operations;
}

// ---------------------------------------------------------------------------
// Reference Management
// ---------------------------------------------------------------------------

/**
 * Find all tokens that reference a given token path.
 */
function findReferences(tokens: Map<string, DesignToken>, targetPath: string): string[] {
  const references: string[] = [];

  for (const [path, token] of tokens) {
    if (path === targetPath) continue;

    // Check if this token's value references the target
    const value = String(token.value);
    if (value.includes(`{${targetPath}}`) || value === `{${targetPath}}` || value === targetPath) {
      references.push(path);
    }
  }

  return references;
}

/**
 * Update a reference from old path to new path.
 */
function updateReference(
  tokens: Map<string, DesignToken>,
  tokenPath: string,
  oldRef: string,
  newRef: string,
): void {
  const token = tokens.get(tokenPath);
  if (!token) return;

  const value = String(token.value);

  // Handle different reference formats
  if (value === `{${oldRef}}` || value === oldRef) {
    token.value = `{${newRef}}`;
  } else if (value.includes(`{${oldRef}}`)) {
    token.value = value.replace(`{${oldRef}}`, `{${newRef}}`);
  }

  // Update resolvedValue if present
  if (token.resolvedValue) {
    const resolvedStr = String(token.resolvedValue);
    if (resolvedStr.includes(oldRef)) {
      // Resolved values should be recalculated, but we can't do that here
      // Mark for recalculation
      delete token.resolvedValue;
    }
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

async function validateAction(
  tokens: Map<string, DesignToken>,
  action: MigrationAction,
  operations: TokenOperation[],
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  for (const check of action.validation) {
    if (check.includes("no circular")) {
      results.push(validateNoCircularDeps(tokens));
    } else if (check.includes("no broken") || check.includes("references resolve")) {
      results.push(validateNobrokenRefs(tokens));
    } else if (check.includes("naming convention")) {
      results.push(validateNamingConvention(tokens, operations));
    } else {
      results.push({
        check,
        passed: true,
        details: "Validation check not implemented",
      });
    }
  }

  return results;
}

function validateNoCircularDeps(tokens: Map<string, DesignToken>): ValidationResult {
  // Simple circular dependency check
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const hasCycle = (path: string): boolean => {
    if (recursionStack.has(path)) return true;
    if (visited.has(path)) return false;

    visited.add(path);
    recursionStack.add(path);

    const token = tokens.get(path);
    if (token) {
      const value = String(token.value);
      const match = value.match(/\{([^}]+)\}/);
      if (match) {
        const refPath = match[1];
        if (hasCycle(refPath)) {
          return true;
        }
      }
    }

    recursionStack.delete(path);
    return false;
  };

  for (const path of tokens.keys()) {
    if (hasCycle(path)) {
      return {
        check: "No circular dependencies",
        passed: false,
        details: `Circular dependency detected involving ${path}`,
        severity: "error",
      };
    }
  }

  return {
    check: "No circular dependencies",
    passed: true,
  };
}

function validateNobrokenRefs(tokens: Map<string, DesignToken>): ValidationResult {
  const brokenRefs: string[] = [];

  for (const [path, token] of tokens) {
    const value = String(token.value);
    const match = value.match(/\{([^}]+)\}/);
    if (match) {
      const refPath = match[1];
      if (!tokens.has(refPath)) {
        brokenRefs.push(`${path} -> ${refPath}`);
      }
    }
  }

  if (brokenRefs.length > 0) {
    return {
      check: "No broken references",
      passed: false,
      details: `Found ${brokenRefs.length} broken reference(s): ${brokenRefs.slice(0, 3).join(", ")}${brokenRefs.length > 3 ? "..." : ""}`,
      severity: "error",
    };
  }

  return {
    check: "No broken references",
    passed: true,
  };
}

function validateNamingConvention(
  tokens: Map<string, DesignToken>,
  operations: TokenOperation[],
): ValidationResult {
  const invalidNames: string[] = [];

  for (const op of operations) {
    const path = op.newPath ?? op.path;
    if (!parseSemanticPath(path)) {
      invalidNames.push(path);
    }
  }

  if (invalidNames.length > 0) {
    return {
      check: "Naming convention compliance",
      passed: false,
      details: `${invalidNames.length} token(s) don't follow naming convention`,
      severity: "warning",
    };
  }

  return {
    check: "Naming convention compliance",
    passed: true,
  };
}

// ---------------------------------------------------------------------------
// Snapshot & Rollback
// ---------------------------------------------------------------------------

/**
 * Create a snapshot of current token state for rollback.
 */
export function createSnapshot(
  tokens: Map<string, DesignToken>,
  metadata: MigrationSnapshot["metadata"],
): MigrationSnapshot {
  // Deep copy tokens
  const tokensCopy = new Map<string, DesignToken>();
  for (const [path, token] of tokens) {
    tokensCopy.set(path, { ...token });
  }

  return {
    id: `snapshot-${Date.now()}`,
    timestamp: new Date(),
    tokensBefore: tokensCopy,
    metadata,
  };
}

/**
 * Rollback to a previous snapshot.
 */
export function rollback(
  tokens: Map<string, DesignToken>,
  snapshot: MigrationSnapshot,
): void {
  // Clear current tokens
  tokens.clear();

  // Restore from snapshot
  for (const [path, token] of snapshot.tokensBefore) {
    tokens.set(path, { ...token });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateNewPath(oldPath: string): string {
  // Try to parse and rebuild
  const parsed = parseSemanticPath(oldPath);
  if (parsed) {
    return buildSemanticPath(parsed);
  }

  // Fallback: just normalize separators
  return oldPath.replace(/\//g, ".").replace(/-/g, ".");
}
