/**
 * Visualization Utilities for Token Topology
 *
 * Generates visual representations of token structures:
 * - Dependency graphs (Mermaid diagrams)
 * - Coverage heatmaps (ASCII tables)
 * - Token distribution charts (Markdown tables)
 */

import type {
  DependencyGraph,
  CoverageAnalysis,
  StructureAnalysis,
  AntiPatternReport,
} from "./audit.js";
import { UX_CONTEXTS, ALL_PROPERTY_CLASSES } from "./ontology.js";

/**
 * Generate a Mermaid diagram showing token dependency relationships
 */
export function visualizeDependencyGraph(
  graph: DependencyGraph,
  options?: {
    /** Maximum number of nodes to include (prevents overwhelming diagrams) */
    maxNodes?: number;
    /** Only show nodes with issues */
    issuesOnly?: boolean;
    /** Maximum depth to display */
    maxDepth?: number;
  },
): string {
  const maxNodes = options?.maxNodes ?? 50;
  const issuesOnly = options?.issuesOnly ?? false;
  const maxDepth = options?.maxDepth ?? 3;

  const lines: string[] = [];
  lines.push("```mermaid");
  lines.push("graph TD");
  lines.push("");

  // Filter nodes based on options
  let nodesToShow = graph.nodes;
  
  if (issuesOnly) {
    const problematicPaths = new Set(
      graph.issues.flatMap(issue => issue.tokenPaths)
    );
    nodesToShow = nodesToShow.filter(n => problematicPaths.has(n.path));
  }
  
  if (maxDepth < Infinity) {
    nodesToShow = nodesToShow.filter(n => n.depth <= maxDepth);
  }
  
  // Limit total nodes
  if (nodesToShow.length > maxNodes) {
    // Prioritize primitives and nodes with most references
    nodesToShow = nodesToShow
      .sort((a, b) => {
        if (a.nodeType === "primitive" && b.nodeType !== "primitive") return -1;
        if (a.nodeType !== "primitive" && b.nodeType === "primitive") return 1;
        return b.incomingRefs - a.incomingRefs;
      })
      .slice(0, maxNodes);
  }

  const nodePathSet = new Set(nodesToShow.map(n => n.path));

  // Define node styles based on type and status
  for (const node of nodesToShow) {
    const nodeId = sanitizeForMermaid(node.path);
    const label = truncatePath(node.path, 30);
    
    let style = "";
    let shape: [string, string] = ["[", "]"];
    
    if (node.nodeType === "primitive") {
      shape = ["([", "])"];
      style = ":::primitive";
    } else if (node.isolated) {
      shape = ["{{", "}}"];
      style = ":::isolated";
    }
    
    lines.push(`  ${nodeId}${shape[0]}"${label}"${shape[1]}${style}`);
  }

  lines.push("");

  // Add edges (only between visible nodes)
  const edgesToShow = graph.edges.filter(
    e => nodePathSet.has(e.from) && nodePathSet.has(e.to)
  );

  for (const edge of edgesToShow) {
    const fromId = sanitizeForMermaid(edge.from);
    const toId = sanitizeForMermaid(edge.to);
    
    if (edge.resolved) {
      lines.push(`  ${fromId} --> ${toId}`);
    } else {
      lines.push(`  ${fromId} -.->|broken| ${toId}:::broken`);
    }
  }

  // Add class definitions for styling
  lines.push("");
  lines.push("  classDef primitive fill:#e1f5fe,stroke:#01579b,stroke-width:2px");
  lines.push("  classDef isolated fill:#fff3e0,stroke:#e65100,stroke-width:2px");
  lines.push("  classDef broken fill:#ffebee,stroke:#c62828,stroke-width:2px,stroke-dasharray: 5 5");

  lines.push("```");
  lines.push("");
  lines.push(`_Showing ${nodesToShow.length} of ${graph.nodes.length} tokens_`);

  return lines.join("\n");
}

/**
 * Generate a coverage heatmap as an ASCII table
 */
export function visualizeCoverageMatrix(
  coverage: CoverageAnalysis,
  options?: {
    /** Show token counts in cells */
    showCounts?: boolean;
    /** Only show covered contexts */
    coveredOnly?: boolean;
  },
): string {
  const showCounts = options?.showCounts ?? false;
  const coveredOnly = options?.coveredOnly ?? false;

  const lines: string[] = [];
  lines.push("### Coverage Matrix");
  lines.push("");

  // Get contexts to show
  const contexts = coveredOnly 
    ? coverage.coveredContexts 
    : UX_CONTEXTS;

  // Build table header
  const propertyClasses = ALL_PROPERTY_CLASSES.slice(0, 6); // Limit for readability
  const header = ["Context", ...propertyClasses.map(pc => pc.substring(0, 8))];
  const separator = header.map(h => "-".repeat(h.length));

  lines.push(`| ${header.join(" | ")} |`);
  lines.push(`| ${separator.join(" | ")} |`);

  // Build table rows
  for (const context of contexts) {
    const row = [context.substring(0, 10)];
    
    for (const propertyClass of propertyClasses) {
      const cell = coverage.matrix.find(
        c => c.uxContext === context && c.propertyClass === propertyClass
      );
      
      if (!cell) {
        row.push("—");
      } else if (cell.present) {
        if (showCounts) {
          row.push(`✓ (${cell.tokenCount})`);
        } else {
          row.push("✓");
        }
      } else if (cell.required) {
        row.push("❌");
      } else {
        row.push("—");
      }
    }
    
    lines.push(`| ${row.join(" | ")} |`);
  }

  lines.push("");
  lines.push("_Legend: ✓ = covered, ❌ = required but missing, — = not applicable_");

  return lines.join("\n");
}

/**
 * Generate token distribution charts as Markdown tables
 */
export function visualizeTokenDistribution(
  structure: StructureAnalysis,
  options?: {
    /** Maximum bar length in characters */
    maxBarLength?: number;
  },
): string {
  const maxBarLength = options?.maxBarLength ?? 40;

  const lines: string[] = [];
  lines.push("### Token Distribution");
  lines.push("");

  // Property class distribution
  if (Object.keys(structure.propertyClassDistribution).length > 0) {
    lines.push("#### By Property Class");
    lines.push("");
    
    const pcEntries = Object.entries(structure.propertyClassDistribution)
      .sort((a, b) => b[1] - a[1]);
    const maxCount = Math.max(...pcEntries.map(([, count]) => count));
    
    for (const [propertyClass, count] of pcEntries) {
      const percentage = Math.round((count / structure.totalTokens) * 100);
      const barLength = Math.round((count / maxCount) * maxBarLength);
      const bar = "█".repeat(barLength);
      
      lines.push(`- **${propertyClass}**: ${count} (${percentage}%) ${bar}`);
    }
    
    lines.push("");
  }

  // Intent distribution
  if (Object.keys(structure.intentDistribution).length > 0) {
    lines.push("#### By Intent");
    lines.push("");
    
    const intentEntries = Object.entries(structure.intentDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8); // Top 8
    const maxCount = Math.max(...intentEntries.map(([, count]) => count));
    
    for (const [intent, count] of intentEntries) {
      const percentage = Math.round((count / structure.totalTokens) * 100);
      const barLength = Math.round((count / maxCount) * maxBarLength);
      const bar = "█".repeat(barLength);
      
      lines.push(`- **${intent}**: ${count} (${percentage}%) ${bar}`);
    }
    
    lines.push("");
  }

  // State distribution
  if (Object.keys(structure.stateDistribution).length > 0) {
    lines.push("#### By State");
    lines.push("");
    
    const stateEntries = Object.entries(structure.stateDistribution)
      .sort((a, b) => b[1] - a[1]);
    const maxCount = Math.max(...stateEntries.map(([, count]) => count));
    
    for (const [state, count] of stateEntries) {
      const percentage = Math.round((count / structure.totalTokens) * 100);
      const barLength = Math.round((count / maxCount) * maxBarLength);
      const bar = "█".repeat(barLength);
      
      lines.push(`- **${state}**: ${count} (${percentage}%) ${bar}`);
    }
    
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Generate anti-pattern report visualization
 */
export function visualizeAntiPatterns(
  report: AntiPatternReport,
  options?: {
    /** Maximum patterns to show per type */
    maxPerType?: number;
  },
): string {
  const maxPerType = options?.maxPerType ?? 5;

  const lines: string[] = [];
  lines.push("### Anti-Pattern Details");
  lines.push("");

  if (report.summary.total === 0) {
    lines.push("✅ No anti-patterns detected!");
    return lines.join("\n");
  }

  // Group patterns by type
  const byType = new Map<string, typeof report.patterns>();
  
  for (const pattern of report.patterns) {
    if (!byType.has(pattern.type)) {
      byType.set(pattern.type, []);
    }
    byType.get(pattern.type)!.push(pattern);
  }

  // Show each type's patterns
  for (const [type, patterns] of byType) {
    const severityEmoji = patterns[0].severity === "error" ? "❌" : 
                         patterns[0].severity === "warning" ? "⚠️" : "ℹ️";
    
    lines.push(`#### ${severityEmoji} ${formatTypeName(type)} (${patterns.length})`);
    lines.push("");

    const patternsToShow = patterns.slice(0, maxPerType);
    
    for (const pattern of patternsToShow) {
      lines.push(`- ${pattern.message}`);
      
      if (pattern.tokenPaths.length <= 3) {
        lines.push(`  - Tokens: ${pattern.tokenPaths.map(p => `\`${p}\``).join(", ")}`);
      } else {
        lines.push(`  - Tokens: ${pattern.tokenPaths.length} affected`);
      }
      
      if (pattern.suggestion) {
        lines.push(`  - 💡 ${pattern.suggestion}`);
      }
      
      lines.push("");
    }

    if (patterns.length > maxPerType) {
      lines.push(`_... and ${patterns.length - maxPerType} more_`);
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Generate a complete topology report with all visualizations
 */
export function generateTopologyReport(
  structure: StructureAnalysis,
  coverage: CoverageAnalysis,
  dependencies: DependencyGraph,
  antiPatterns: AntiPatternReport,
): string {
  const lines: string[] = [];
  
  lines.push("# Token Topology Report");
  lines.push("");
  lines.push("## Overview");
  lines.push("");
  lines.push(`- **Total Tokens**: ${structure.totalTokens}`);
  lines.push(`- **Primitives**: ${dependencies.metrics.primitiveCount}`);
  lines.push(`- **Semantic**: ${dependencies.metrics.semanticCount}`);
  lines.push(`- **Coverage**: ${Math.round(coverage.coverageScore * 100)}%`);
  lines.push("");

  // Distribution
  lines.push(visualizeTokenDistribution(structure));
  lines.push("");

  // Coverage matrix
  lines.push(visualizeCoverageMatrix(coverage, { showCounts: true }));
  lines.push("");

  // Dependency graph
  lines.push("## Dependency Graph");
  lines.push("");
  lines.push(visualizeDependencyGraph(dependencies, { maxNodes: 30, maxDepth: 3 }));
  lines.push("");

  // Anti-patterns
  if (antiPatterns.summary.total > 0) {
    lines.push(visualizeAntiPatterns(antiPatterns, { maxPerType: 3 }));
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Sanitize token path for use as Mermaid node ID
 */
function sanitizeForMermaid(path: string): string {
  return path
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/^(\d)/, "n$1"); // Mermaid IDs can't start with numbers
}

/**
 * Truncate long paths for diagram readability
 */
function truncatePath(path: string, maxLength: number): string {
  if (path.length <= maxLength) return path;
  
  const parts = path.split(".");
  if (parts.length <= 2) return path.substring(0, maxLength) + "...";
  
  // Keep first and last parts
  return `${parts[0]}...${parts[parts.length - 1]}`;
}

/**
 * Format anti-pattern type name for display
 */
function formatTypeName(type: string): string {
  return type
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
