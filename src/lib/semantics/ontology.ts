/**
 * Semantic Token Ontology
 *
 * Defines the structural knowledge model for semantic design tokens.
 * This ontology encodes the relationships between CSS property targets,
 * semantic intents, UX contexts, interaction states, and emphasis modifiers.
 *
 * The ontology is based on research across production design systems:
 * - VTEX Shoreline ($fg/$bg/$border + surface + modifier + state)
 * - GitLab Pajamas (constant → semantic → contextual, concept groups)
 * - Material Design 3 (color roles, surface containers, accessible pairing)
 * - Backbase (background/on-background/foreground/border/link/focus)
 * - ttoss ({ux}.{context}.{nature}.{state})
 * - EightShapes (taxonomy audit methodology, anti-pattern identification)
 */

// ---------------------------------------------------------------------------
// Property classes — CSS-destination axis
// ---------------------------------------------------------------------------

/**
 * A property class describes WHAT CSS property a token ultimately targets.
 * This is the most important structural decision for separation of concerns.
 */
export interface PropertyClass {
  /** Machine identifier, e.g. "background" */
  id: string;
  /** Human label */
  label: string;
  /** One-line description of the property class */
  description: string;
  /** CSS properties this class maps to */
  cssProperties: string[];
  /** Which token types (from DesignToken.type) are valid for this class */
  allowedTokenTypes: string[];
  /**
   * Accessibility pairing: which other property classes MUST have a
   * corresponding token when this one exists, to ensure contrast.
   * e.g. "background" requires "text" or "icon" to exist as pairable.
   */
  requiredPairings?: string[];
}

/** Built-in property classes covering the CSS color model */
export const COLOR_PROPERTY_CLASSES: PropertyClass[] = [
  {
    id: "background",
    label: "Background",
    description:
      "Surface fills and background colors. Maps to background-color, background.",
    cssProperties: ["background-color", "background"],
    allowedTokenTypes: ["color"],
    requiredPairings: ["text"],
  },
  {
    id: "text",
    label: "Text",
    description:
      "Text content color. Maps to CSS color property for text elements.",
    cssProperties: ["color"],
    allowedTokenTypes: ["color"],
    requiredPairings: ["background"],
  },
  {
    id: "icon",
    label: "Icon",
    description:
      "Icon and SVG fill color. Separated from text to allow independent emphasis control.",
    cssProperties: ["color", "fill"],
    allowedTokenTypes: ["color"],
    requiredPairings: ["background"],
  },
  {
    id: "border",
    label: "Border",
    description:
      "Border stroke color. Distinct from outline (focus rings) and from background fills.",
    cssProperties: ["border-color"],
    allowedTokenTypes: ["color"],
  },
  {
    id: "outline",
    label: "Outline / Focus",
    description:
      "Focus ring and outline color. Separated from border for interactive accessibility.",
    cssProperties: ["outline-color", "box-shadow"],
    allowedTokenTypes: ["color"],
  },
  {
    id: "shadow",
    label: "Shadow / Elevation",
    description: "Box shadow and elevation effects.",
    cssProperties: ["box-shadow"],
    allowedTokenTypes: ["shadow", "color"],
  },
];

/** Built-in property classes for spacing (block/inline model) */
export const SPACING_PROPERTY_CLASSES: PropertyClass[] = [
  {
    id: "spacing-inline",
    label: "Inline Spacing",
    description:
      "Horizontal / inline-axis spacing: padding-inline, margin-inline, column-gap.",
    cssProperties: [
      "padding-inline",
      "padding-inline-start",
      "padding-inline-end",
      "margin-inline",
      "margin-inline-start",
      "margin-inline-end",
      "column-gap",
    ],
    allowedTokenTypes: ["dimension"],
  },
  {
    id: "spacing-block",
    label: "Block Spacing",
    description:
      "Vertical / block-axis spacing: padding-block, margin-block, row-gap.",
    cssProperties: [
      "padding-block",
      "padding-block-start",
      "padding-block-end",
      "margin-block",
      "margin-block-start",
      "margin-block-end",
      "row-gap",
    ],
    allowedTokenTypes: ["dimension"],
  },
  {
    id: "gap",
    label: "Gap",
    description: "Uniform gap between flex/grid children.",
    cssProperties: ["gap"],
    allowedTokenTypes: ["dimension"],
  },
];

/** Built-in property classes for sizing */
export const SIZING_PROPERTY_CLASSES: PropertyClass[] = [
  {
    id: "sizing",
    label: "Sizing",
    description: "Width, height, min/max dimensions.",
    cssProperties: [
      "width",
      "height",
      "min-width",
      "min-height",
      "max-width",
      "max-height",
    ],
    allowedTokenTypes: ["dimension"],
  },
  {
    id: "radius",
    label: "Border Radius",
    description: "Corner rounding.",
    cssProperties: ["border-radius"],
    allowedTokenTypes: ["dimension"],
  },
];

/** All built-in property classes */
export const ALL_PROPERTY_CLASSES: PropertyClass[] = [
  ...COLOR_PROPERTY_CLASSES,
  ...SPACING_PROPERTY_CLASSES,
  ...SIZING_PROPERTY_CLASSES,
];

// ---------------------------------------------------------------------------
// Alias maps — common abbreviations & alternative naming conventions
// ---------------------------------------------------------------------------

/**
 * Maps common abbreviations, alternative names, and shorthand conventions
 * to canonical property class IDs.
 *
 * Sources of inspiration:
 * - VTEX Shoreline: $fg/$bg/$border
 * - Backbase: foreground/on-background  
 * - Material Design 3: on-surface, on-primary (container foreground)
 * - Tailwind: text-*, bg-*, border-*, ring-*
 * - Common shorthand: clr, colour, fill, stroke
 */
export const PROPERTY_CLASS_ALIASES: ReadonlyMap<string, string> = new Map([
  // background
  ["bg", "background"],
  ["surface", "background"],
  ["fill", "background"],
  ["canvas", "background"],
  ["container", "background"],
  ["on-background", "text"],       // MD3: "on-background" = foreground text
  ["on-surface", "text"],          // MD3: "on-surface" = surface foreground text
  ["on-primary", "text"],          // MD3: "on-primary" = primary container fg
  ["on-secondary", "text"],
  ["on-error", "text"],
  ["on-container", "text"],
  // text / foreground
  ["fg", "text"],
  ["foreground", "text"],
  ["label", "text"],
  ["content", "text"],
  ["heading", "text"],
  ["body", "text"],
  ["caption", "text"],
  ["placeholder", "text"],
  ["on", "text"],                  // Short form: color.accent.on → foreground on accent
  // icon
  ["glyph", "icon"],
  ["svg", "icon"],
  ["pictogram", "icon"],
  // border
  ["stroke", "border"],
  ["divider", "border"],
  ["separator", "border"],
  ["rule", "border"],
  // outline / focus
  ["focus-ring", "outline"],
  ["ring", "outline"],
  ["focus", "outline"],
  // shadow
  ["elevation", "shadow"],
  ["drop-shadow", "shadow"],
  // spacing
  ["padding", "spacing-inline"],
  ["margin", "spacing-inline"],
  ["space", "spacing-inline"],
  ["inset", "spacing-inline"],
  // sizing
  ["size", "sizing"],
  ["width", "sizing"],
  ["height", "sizing"],
  // radius
  ["rounded", "radius"],
  ["corner", "radius"],
  ["border-radius", "radius"],
]);

/**
 * Maps common intent aliases to canonical semantic intent IDs.
 */
export const INTENT_ALIASES: ReadonlyMap<string, string> = new Map([
  ["primary", "accent"],
  ["brand", "accent"],
  ["main", "accent"],
  ["secondary", "muted"],
  ["subtle", "muted"],
  ["tertiary", "muted"],
  ["neutral", "base"],
  ["default", "base"],
  ["normal", "base"],
  ["inverse", "inverted"],
  ["reversed", "inverted"],
  ["dark", "inverted"],
  ["positive", "success"],
  ["valid", "success"],
  ["confirmed", "success"],
  ["caution", "warning"],
  ["alert", "warning"],
  ["error", "danger"],
  ["critical", "danger"],
  ["destructive", "danger"],
  ["negative", "danger"],
  ["notice", "info"],
  ["informational", "info"],
  ["help", "info"],
]);

/**
 * Maps common UX context aliases to canonical context IDs.
 */
export const UX_CONTEXT_ALIASES: ReadonlyMap<string, string> = new Map([
  ["button", "action"],
  ["btn", "action"],
  ["cta", "action"],
  ["link", "action"],
  ["interactive", "action"],
  ["form", "input"],
  ["field", "input"],
  ["control", "input"],
  ["select", "input"],
  ["card", "surface"],
  ["modal", "surface"],
  ["panel", "surface"],
  ["page", "surface"],
  ["dialog", "surface"],
  ["popover", "surface"],
  ["tooltip", "surface"],
  ["alert", "feedback"],
  ["toast", "feedback"],
  ["notification", "feedback"],
  ["banner", "feedback"],
  ["message", "feedback"],
  ["nav", "navigation"],
  ["menu", "navigation"],
  ["tab", "navigation"],
  ["breadcrumb", "navigation"],
  ["table", "data"],
  ["list", "data"],
  ["badge", "data"],
  ["tag", "data"],
  ["grid", "data"],
]);

/**
 * Maps common state aliases to canonical interaction state IDs.
 */
export const STATE_ALIASES: ReadonlyMap<string, string> = new Map([
  ["pressed", "active"],
  ["clicked", "active"],
  ["checked", "selected"],
  ["chosen", "selected"],
  ["on", "selected"],
  ["inactive", "disabled"],
  ["readonly", "disabled"],
  ["focused", "focus"],
  ["hovered", "hover"],
]);

// ---------------------------------------------------------------------------
// Alias normalization helpers
// ---------------------------------------------------------------------------

/**
 * Normalize a segment to a canonical property class ID.
 * Returns the canonical ID if the segment matches a known alias or exact ID,
 * or undefined if no match.
 */
export function normalizePropertyClass(segment: string): string | undefined {
  const lower = segment.toLowerCase();
  if (ALL_PROPERTY_CLASSES.some((p) => p.id === lower)) return lower;
  return PROPERTY_CLASS_ALIASES.get(lower);
}

/**
 * Normalize a segment to a canonical semantic intent ID.
 */
export function normalizeIntent(segment: string): string | undefined {
  const lower = segment.toLowerCase();
  if (SEMANTIC_INTENTS.some((i) => i.id === lower)) return lower;
  return INTENT_ALIASES.get(lower);
}

/**
 * Normalize a segment to a canonical UX context ID.
 */
export function normalizeUxContext(segment: string): string | undefined {
  const lower = segment.toLowerCase();
  if (UX_CONTEXTS.some((u) => u.id === lower)) return lower;
  return UX_CONTEXT_ALIASES.get(lower);
}

/**
 * Normalize a segment to a canonical interaction state ID.
 */
export function normalizeState(segment: string): string | undefined {
  const lower = segment.toLowerCase();
  if (INTERACTION_STATES.some((s) => s.id === lower)) return lower;
  return STATE_ALIASES.get(lower);
}

// ---------------------------------------------------------------------------
// Semantic intents — meaning axis
// ---------------------------------------------------------------------------

/**
 * A semantic intent describes the MEANING a token carries — not its visual
 * appearance, but its communicative purpose.
 */
export interface SemanticIntent {
  id: string;
  label: string;
  description: string;
  /** Primitive hue families typically referenced (advisory, not enforcing) */
  typicalHues?: string[];
  /** Example token: "background.base" */
  exampleToken?: string;
}

export const SEMANTIC_INTENTS: SemanticIntent[] = [
  {
    id: "base",
    label: "Base / Neutral",
    description:
      "Default surface with no specific semantic weight. The starting point for most UI elements.",
    typicalHues: ["neutral", "gray"],
    exampleToken: "background.base",
  },
  {
    id: "accent",
    label: "Accent / Brand",
    description:
      "Primary brand emphasis. Reserved for the most important actions and elements " +
      "that need to stand out. Use sparingly to preserve attention hierarchy.",
    typicalHues: ["blue", "brand"],
    exampleToken: "background.accent",
  },
  {
    id: "muted",
    label: "Muted / Subtle",
    description:
      "De-emphasized elements. Secondary actions, placeholder text, disabled states. " +
      "Lower visual weight than base.",
    typicalHues: ["neutral", "gray"],
    exampleToken: "text.muted",
  },
  {
    id: "inverted",
    label: "Inverted",
    description:
      "Reverse of the base surface. Used sparingly for high-contrast attention " +
      "(e.g., modal backdrops, tooltips, snackbars).",
    typicalHues: [],
    exampleToken: "background.inverted",
  },
  {
    id: "success",
    label: "Success",
    description:
      "Positive outcome — action completed, validation passed. Implies no further action needed.",
    typicalHues: ["green"],
    exampleToken: "background.success",
  },
  {
    id: "warning",
    label: "Warning",
    description:
      "Caution — potentially unexpected behavior, non-critical issue. " +
      "Requires attention but not urgency.",
    typicalHues: ["yellow", "amber", "orange"],
    exampleToken: "background.warning",
  },
  {
    id: "danger",
    label: "Danger / Critical",
    description:
      "Error or destructive action — system failure, validation error, " +
      "irreversible action. Demands immediate attention.",
    typicalHues: ["red"],
    exampleToken: "background.danger",
  },
  {
    id: "info",
    label: "Informational",
    description:
      "Neutral informational message. Prominent but not urgent. " +
      "Announcements, progress feedback, tips.",
    typicalHues: ["blue", "cyan"],
    exampleToken: "background.info",
  },
];

// ---------------------------------------------------------------------------
// UX contexts — component-domain axis
// ---------------------------------------------------------------------------

/**
 * A UX context is a category of components that share interaction patterns
 * and therefore share a semantic token surface.
 */
export interface UxContext {
  id: string;
  label: string;
  description: string;
  /** Typical components in this context */
  components: string[];
  /**
   * Which property classes are essential for this context.
   * If a scaffolded system covers this context, these MUST be present.
   */
  requiredPropertyClasses: string[];
  /** Whether interactive states (hover/active/focus/disabled) are needed */
  interactive: boolean;
}

export const UX_CONTEXTS: UxContext[] = [
  {
    id: "action",
    label: "Action",
    description:
      "Interactive elements that trigger user actions: buttons, CTAs, links, toggles.",
    components: [
      "button",
      "icon-button",
      "link",
      "toggle",
      "fab",
      "chip",
      "cta",
    ],
    requiredPropertyClasses: ["background", "text", "border", "outline"],
    interactive: true,
  },
  {
    id: "input",
    label: "Input / Control",
    description:
      "Form elements and data entry: text fields, selects, checkboxes, radios, sliders.",
    components: [
      "text-input",
      "textarea",
      "select",
      "checkbox",
      "radio",
      "switch",
      "slider",
      "date-picker",
      "file-input",
    ],
    requiredPropertyClasses: ["background", "text", "border", "outline"],
    interactive: true,
  },
  {
    id: "surface",
    label: "Surface / Display",
    description:
      "Content presentation and containers: pages, cards, panels, modals, sidebars.",
    components: [
      "page",
      "card",
      "panel",
      "modal",
      "dialog",
      "sidebar",
      "drawer",
      "popover",
      "tooltip",
      "sheet",
    ],
    requiredPropertyClasses: ["background", "text", "border", "shadow"],
    interactive: false,
  },
  {
    id: "feedback",
    label: "Feedback",
    description:
      "Status communication and user feedback: alerts, toasts, banners, notifications. " +
      "Typically transient — triggered by events or actions.",
    components: [
      "alert",
      "toast",
      "snackbar",
      "banner",
      "notification",
      "progress",
      "skeleton",
    ],
    requiredPropertyClasses: ["background", "text", "border", "icon"],
    interactive: false,
  },
  {
    id: "navigation",
    label: "Navigation",
    description:
      "Wayfinding elements: menus, tabs, breadcrumbs, pagination, nav bars.",
    components: [
      "navbar",
      "sidebar-nav",
      "tabs",
      "breadcrumb",
      "pagination",
      "menu",
      "dropdown-menu",
      "stepper",
    ],
    requiredPropertyClasses: ["background", "text", "border"],
    interactive: true,
  },
  {
    id: "data",
    label: "Data Display",
    description:
      "Structured data presentation: tables, lists, trees, grids, data cards.",
    components: [
      "table",
      "list",
      "tree",
      "grid",
      "data-card",
      "badge",
      "tag",
      "avatar",
    ],
    requiredPropertyClasses: ["background", "text", "border"],
    interactive: false,
  },
];

// ---------------------------------------------------------------------------
// Interaction states
// ---------------------------------------------------------------------------

export interface InteractionState {
  id: string;
  label: string;
  description: string;
  /** CSS pseudo-class or attribute selector this maps to */
  cssSelector: string;
  /** Whether this state is omitted from token name when it's the default */
  implicitDefault: boolean;
}

export const INTERACTION_STATES: InteractionState[] = [
  {
    id: "default",
    label: "Default",
    description: "Resting / idle state. Often omitted from token name.",
    cssSelector: "",
    implicitDefault: true,
  },
  {
    id: "hover",
    label: "Hover",
    description: "Pointer hovering over the element.",
    cssSelector: ":hover",
    implicitDefault: false,
  },
  {
    id: "active",
    label: "Active / Pressed",
    description: "Element is being clicked or tapped.",
    cssSelector: ":active",
    implicitDefault: false,
  },
  {
    id: "focus",
    label: "Focus",
    description: "Element has keyboard or programmatic focus.",
    cssSelector: ":focus-visible",
    implicitDefault: false,
  },
  {
    id: "disabled",
    label: "Disabled",
    description: "Element is non-interactive / unavailable.",
    cssSelector: ":disabled, [aria-disabled=true]",
    implicitDefault: false,
  },
  {
    id: "selected",
    label: "Selected",
    description: "Element is in a selected/checked/active-route state.",
    cssSelector: "[aria-selected=true], [aria-checked=true], :checked",
    implicitDefault: false,
  },
];

// ---------------------------------------------------------------------------
// Emphasis modifiers
// ---------------------------------------------------------------------------

export interface EmphasisModifier {
  id: string;
  label: string;
  description: string;
}

export const EMPHASIS_MODIFIERS: EmphasisModifier[] = [
  {
    id: "default",
    label: "Default",
    description: "Standard prominence. Often omitted from token name.",
  },
  {
    id: "strong",
    label: "Strong",
    description:
      "Higher prominence / darker tone. Primary actions, important borders.",
  },
  {
    id: "soft",
    label: "Soft / Subtle",
    description:
      "Lower prominence / lighter tone. Descriptions, secondary content.",
  },
  {
    id: "plain",
    label: "Plain",
    description:
      "Transparent or borderless in default state. Tertiary actions, ghost buttons.",
  },
];

// ---------------------------------------------------------------------------
// Naming formula
// ---------------------------------------------------------------------------

/**
 * Canonical naming formula for semantic tokens.
 *
 * Full form:  {propertyClass}.{uxContext}.{intent}.{modifier}.{state}
 * Minimal:    {propertyClass}.{intent}
 *
 * Examples:
 *   background.action.accent.strong.hover
 *   text.input.danger.default           → (state "default" may be omitted)
 *   border.surface.base
 *   icon.feedback.success
 *   spacing-inline.action               → (intent-free spacing)
 *
 * The formula is flexible:
 * - uxContext may be omitted for global semantics (background.base)
 * - modifier "default" is always omitted
 * - state "default" is always omitted
 * - For spacing/sizing, intent is often omitted (spacing-inline.action)
 */
export interface SemanticTokenName {
  propertyClass: string;
  uxContext?: string;
  intent: string;
  modifier?: string;
  state?: string;
}

/**
 * Build a canonical token path from structured name parts.
 * Omits "default" modifier and state.
 */
export function buildSemanticPath(name: SemanticTokenName): string {
  const parts = [name.propertyClass];
  if (name.uxContext) parts.push(name.uxContext);
  parts.push(name.intent);
  if (name.modifier && name.modifier !== "default") parts.push(name.modifier);
  if (name.state && name.state !== "default") parts.push(name.state);
  return parts.join(".");
}

/**
 * Attempt to parse a token path into semantic name parts.
 * Returns null if the path doesn't match the ontology.
 */
export function parseSemanticPath(
  path: string,
): SemanticTokenName | null {
  const segments = path.split(".");

  if (segments.length < 2) return null;

  const propertyClassIds = new Set(ALL_PROPERTY_CLASSES.map((p) => p.id));
  const uxContextIds = new Set(UX_CONTEXTS.map((u) => u.id));
  const intentIds = new Set(SEMANTIC_INTENTS.map((i) => i.id));
  const modifierIds = new Set(EMPHASIS_MODIFIERS.map((m) => m.id));
  const stateIds = new Set(INTERACTION_STATES.map((s) => s.id));

  // First segment must be a property class
  // Handle compound IDs like "spacing-inline"
  let propertyClass: string | undefined;
  let idx = 0;
  if (propertyClassIds.has(segments[0])) {
    propertyClass = segments[0];
    idx = 1;
  } else if (
    segments.length > 1 &&
    propertyClassIds.has(`${segments[0]}-${segments[1]}`)
  ) {
    propertyClass = `${segments[0]}-${segments[1]}`;
    idx = 2;
  }

  if (!propertyClass || idx >= segments.length) return null;

  // Next could be uxContext or intent
  let uxContext: string | undefined;
  if (uxContextIds.has(segments[idx])) {
    uxContext = segments[idx];
    idx++;
  }

  // Next must be intent
  if (idx >= segments.length) {
    // If no more segments, treat the uxContext as intent if valid
    if (uxContext && intentIds.has(uxContext)) {
      return { propertyClass, intent: uxContext };
    }
    return null;
  }

  let intent: string;
  if (intentIds.has(segments[idx])) {
    intent = segments[idx];
    idx++;
  } else if (!uxContext) {
    // Maybe it's an unknown intent — be lenient
    intent = segments[idx];
    idx++;
  } else {
    return null;
  }

  // Optionally modifier
  let modifier: string | undefined;
  if (idx < segments.length && modifierIds.has(segments[idx])) {
    modifier = segments[idx];
    idx++;
  }

  // Optionally state
  let state: string | undefined;
  if (idx < segments.length && stateIds.has(segments[idx])) {
    state = segments[idx];
    idx++;
  }

  return { propertyClass, uxContext, intent, modifier, state };
}

// ---------------------------------------------------------------------------
// Lenient / fuzzy semantic path parsing
// ---------------------------------------------------------------------------

/**
 * Extended result from lenient parsing, including confidence metadata.
 */
export interface LenientParseResult extends SemanticTokenName {
  /** Confidence score 0-1: how sure we are about this interpretation. */
  confidence: number;
  /**
   * Which alias mappings were used to reach this interpretation.
   * Empty for strict-parse matches.
   */
  aliasesUsed: Array<{ original: string; canonical: string; axis: string }>;
  /** The original segments that were skipped (namespace prefixes, etc.) */
  skippedPrefixes: string[];
}

/**
 * Attempt to infer a property-class role from a full token path by scanning
 * ALL segments (not just the first) for property class matches or aliases.
 *
 * This is the "read between the lines" layer — it handles naming conventions
 * like `color.bg.primary`, `semantic.color.fg.primary`, `brand.border.error`,
 * etc., where the property-class signal is buried inside the path.
 *
 * Returns the canonical property class ID and the index where it was found,
 * or undefined if no signal was detected.
 */
export function inferPropertyRole(
  segments: string[],
): { propertyClass: string; index: number } | undefined {
  // First pass: exact ID match on any segment
  for (let i = 0; i < segments.length; i++) {
    const canonical = normalizePropertyClass(segments[i]);
    if (canonical) return { propertyClass: canonical, index: i };
  }
  return undefined;
}

/**
 * Lenient semantic path parser.
 *
 * Strategy:
 * 1. Try strict `parseSemanticPath` first — if it works, return with confidence 1.0.
 * 2. Try alias-aware first-segment matching (e.g. "fg" → "text").
 * 3. Scan all segments for property-class signals, treating everything before
 *    the signal as namespace prefixes (e.g. "semantic", "color", "palette").
 * 4. After finding the property class, try to identify intent, context, state
 *    using alias-aware matching on remaining segments.
 *
 * This lets the tool understand paths like:
 *   - `color.bg.primary`           → background + accent (via "primary" alias)
 *   - `color.fg.primary`           → text + accent
 *   - `semantic.color.text.primary` → text + accent (skip "semantic", "color")
 *   - `btn.bg.hover`               → background + action/base + hover
 *   - `feedback.error.background`   → background + danger + feedback
 */
export function parseSemanticPathLenient(
  path: string,
): LenientParseResult | null {
  // 1. Strict parse first
  const strict = parseSemanticPath(path);
  if (strict) {
    return {
      ...strict,
      confidence: 1.0,
      aliasesUsed: [],
      skippedPrefixes: [],
    };
  }

  const segments = path.split(".");
  if (segments.length < 2) return null;

  const aliasesUsed: LenientParseResult["aliasesUsed"] = [];

  // 2. Try alias on first segment
  const firstAlias = normalizePropertyClass(segments[0]);
  if (firstAlias) {
    aliasesUsed.push({
      original: segments[0],
      canonical: firstAlias,
      axis: "propertyClass",
    });
    const remaining = segments.slice(1);
    const parsed = parseRemainingSegments(remaining, firstAlias, aliasesUsed);
    if (parsed) {
      return {
        ...parsed,
        confidence: computeLenientConfidence(aliasesUsed, []),
        aliasesUsed,
        skippedPrefixes: [],
      };
    }
  }

  // 3. Scan all segments for property-class signals
  const inferred = inferPropertyRole(segments);
  if (inferred) {
    const skippedPrefixes = segments.slice(0, inferred.index);
    const originalSegment = segments[inferred.index];

    // Track alias if it wasn't an exact match
    if (originalSegment !== inferred.propertyClass) {
      aliasesUsed.push({
        original: originalSegment,
        canonical: inferred.propertyClass,
        axis: "propertyClass",
      });
    }

    const remaining = segments.slice(inferred.index + 1);
    const parsed = parseRemainingSegments(
      remaining,
      inferred.propertyClass,
      aliasesUsed,
    );
    if (parsed) {
      return {
        ...parsed,
        confidence: computeLenientConfidence(aliasesUsed, skippedPrefixes),
        aliasesUsed,
        skippedPrefixes,
      };
    }

    // Even with no remaining segments, return what we have
    // (e.g., a token that IS just a property class reference)
    return null;
  }

  return null;
}

/**
 * After finding the property class, parse the remaining segments for
 * uxContext, intent, modifier, and state — using alias-aware matching.
 */
function parseRemainingSegments(
  segments: string[],
  propertyClass: string,
  aliasesUsed: LenientParseResult["aliasesUsed"],
): SemanticTokenName | null {
  if (segments.length === 0) return null;

  let idx = 0;

  // Try uxContext (exact or alias)
  let uxContext: string | undefined;
  if (idx < segments.length) {
    const ctx = normalizeUxContext(segments[idx]);
    if (ctx) {
      if (segments[idx] !== ctx) {
        aliasesUsed.push({
          original: segments[idx],
          canonical: ctx,
          axis: "uxContext",
        });
      }
      uxContext = ctx;
      idx++;
    }
  }

  // Try intent (exact or alias)
  let intent: string | undefined;
  if (idx < segments.length) {
    const int = normalizeIntent(segments[idx]);
    if (int) {
      if (segments[idx] !== int) {
        aliasesUsed.push({
          original: segments[idx],
          canonical: int,
          axis: "intent",
        });
      }
      intent = int;
      idx++;
    }
  }

  // If no intent was found by alias, use the raw segment as an unknown intent
  if (!intent && idx < segments.length) {
    // Check if it's a state before assuming it's an intent
    const maybeState = normalizeState(segments[idx]);
    if (!maybeState) {
      intent = segments[idx];
      idx++;
    }
  }

  // If we only found a uxContext but no intent, flip it
  if (uxContext && !intent) {
    const intentFromCtx = normalizeIntent(uxContext);
    if (intentFromCtx) {
      intent = intentFromCtx;
      uxContext = undefined;
    } else {
      // Use uxContext as intent (best guess)
      intent = uxContext;
      uxContext = undefined;
    }
  }

  if (!intent) return null;

  // Try modifier
  let modifier: string | undefined;
  const modifierIds = new Set(EMPHASIS_MODIFIERS.map((m) => m.id));
  if (idx < segments.length && modifierIds.has(segments[idx])) {
    modifier = segments[idx];
    idx++;
  }

  // Try state (exact or alias)
  let state: string | undefined;
  if (idx < segments.length) {
    const st = normalizeState(segments[idx]);
    if (st) {
      if (segments[idx] !== st) {
        aliasesUsed.push({
          original: segments[idx],
          canonical: st,
          axis: "state",
        });
      }
      state = st;
      idx++;
    }
  }

  return { propertyClass, uxContext, intent, modifier, state };
}

/**
 * Compute a confidence score for lenient parsing based on how many
 * aliases were used and how many prefixes were skipped.
 */
function computeLenientConfidence(
  aliasesUsed: LenientParseResult["aliasesUsed"],
  skippedPrefixes: string[],
): number {
  let confidence = 0.95;

  // Each alias used reduces confidence slightly
  confidence -= aliasesUsed.length * 0.05;

  // Skipped namespace prefixes reduce confidence
  confidence -= skippedPrefixes.length * 0.08;

  // Property class aliases are more reliable than others
  const nonPropertyAliases = aliasesUsed.filter(
    (a) => a.axis !== "propertyClass",
  ).length;
  confidence -= nonPropertyAliases * 0.03;

  return Math.max(0.3, Math.min(1.0, confidence));
}

// ---------------------------------------------------------------------------
// Component → token surface mapping
// ---------------------------------------------------------------------------

/**
 * Defines the minimum token surface a component requires.
 * Used by the scaffold generator to know what to produce.
 */
export interface ComponentTokenSurface {
  /** Component name, e.g. "button" */
  component: string;
  /** Which UX context this component falls under */
  uxContext: string;
  /** Required semantic intents for this component */
  intents: string[];
  /** Which property classes are needed */
  propertyClasses: string[];
  /** Which states are needed */
  states: string[];
  /** Extra token slots specific to this component (e.g. "placeholder" for inputs) */
  extraSlots?: string[];
}

/**
 * Built-in component-to-token mappings.
 * These define the minimum viable semantic token surface for common components.
 */
export const COMPONENT_TOKEN_SURFACES: ComponentTokenSurface[] = [
  // ---- Action components --------------------------------------------------
  {
    component: "button",
    uxContext: "action",
    intents: ["accent", "base", "danger"],
    propertyClasses: ["background", "text", "border", "outline"],
    states: ["default", "hover", "active", "focus", "disabled"],
  },
  {
    component: "icon-button",
    uxContext: "action",
    intents: ["base", "accent"],
    propertyClasses: ["background", "icon", "border", "outline"],
    states: ["default", "hover", "active", "focus", "disabled"],
  },
  {
    component: "link",
    uxContext: "action",
    intents: ["accent", "base"],
    propertyClasses: ["text", "outline"],
    states: ["default", "hover", "active", "focus"],
  },
  {
    component: "chip",
    uxContext: "action",
    intents: ["base", "accent"],
    propertyClasses: ["background", "text", "border"],
    states: ["default", "hover", "active", "selected"],
  },

  // ---- Input / Control components -----------------------------------------
  {
    component: "text-input",
    uxContext: "input",
    intents: ["base", "danger", "success"],
    propertyClasses: ["background", "text", "border", "outline"],
    states: ["default", "hover", "focus", "disabled"],
    extraSlots: ["placeholder"],
  },
  {
    component: "textarea",
    uxContext: "input",
    intents: ["base", "danger"],
    propertyClasses: ["background", "text", "border", "outline"],
    states: ["default", "hover", "focus", "disabled"],
    extraSlots: ["placeholder"],
  },
  {
    component: "select",
    uxContext: "input",
    intents: ["base", "danger"],
    propertyClasses: ["background", "text", "border", "outline", "icon"],
    states: ["default", "hover", "focus", "disabled"],
  },
  {
    component: "checkbox",
    uxContext: "input",
    intents: ["base", "accent", "danger"],
    propertyClasses: ["background", "border", "icon", "outline"],
    states: ["default", "hover", "focus", "disabled", "selected"],
  },
  {
    component: "radio",
    uxContext: "input",
    intents: ["base", "accent"],
    propertyClasses: ["background", "border", "icon", "outline"],
    states: ["default", "hover", "focus", "disabled", "selected"],
  },
  {
    component: "switch",
    uxContext: "input",
    intents: ["base", "accent"],
    propertyClasses: ["background", "border", "icon"],
    states: ["default", "hover", "disabled", "selected"],
  },

  // ---- Surface / Display components ---------------------------------------
  {
    component: "card",
    uxContext: "surface",
    intents: ["base", "accent"],
    propertyClasses: ["background", "text", "border", "shadow"],
    states: ["default"],
  },
  {
    component: "modal",
    uxContext: "surface",
    intents: ["base"],
    propertyClasses: ["background", "text", "border", "shadow"],
    states: ["default"],
    extraSlots: ["overlay"],
  },
  {
    component: "tooltip",
    uxContext: "surface",
    intents: ["inverted"],
    propertyClasses: ["background", "text"],
    states: ["default"],
  },
  {
    component: "page",
    uxContext: "surface",
    intents: ["base"],
    propertyClasses: ["background", "text"],
    states: ["default"],
  },

  // ---- Feedback components ------------------------------------------------
  {
    component: "alert",
    uxContext: "feedback",
    intents: ["success", "warning", "danger", "info"],
    propertyClasses: ["background", "text", "border", "icon"],
    states: ["default"],
  },
  {
    component: "toast",
    uxContext: "feedback",
    intents: ["success", "warning", "danger", "info"],
    propertyClasses: ["background", "text", "icon"],
    states: ["default"],
  },
  {
    component: "banner",
    uxContext: "feedback",
    intents: ["info", "warning"],
    propertyClasses: ["background", "text", "border", "icon"],
    states: ["default"],
  },

  // ---- Navigation components ----------------------------------------------
  {
    component: "tabs",
    uxContext: "navigation",
    intents: ["base", "accent"],
    propertyClasses: ["background", "text", "border"],
    states: ["default", "hover", "selected", "disabled"],
  },
  {
    component: "menu",
    uxContext: "navigation",
    intents: ["base"],
    propertyClasses: ["background", "text", "border", "icon"],
    states: ["default", "hover", "active", "selected", "disabled"],
  },
  {
    component: "breadcrumb",
    uxContext: "navigation",
    intents: ["base", "muted"],
    propertyClasses: ["text", "icon"],
    states: ["default", "hover"],
  },
  {
    component: "pagination",
    uxContext: "navigation",
    intents: ["base", "accent"],
    propertyClasses: ["background", "text", "border"],
    states: ["default", "hover", "selected", "disabled"],
  },

  // ---- Data display components --------------------------------------------
  {
    component: "table",
    uxContext: "data",
    intents: ["base"],
    propertyClasses: ["background", "text", "border"],
    states: ["default", "hover", "selected"],
    extraSlots: ["header", "stripe"],
  },
  {
    component: "badge",
    uxContext: "data",
    intents: ["accent", "success", "warning", "danger", "info", "muted"],
    propertyClasses: ["background", "text"],
    states: ["default"],
  },
  {
    component: "tag",
    uxContext: "data",
    intents: ["base", "accent"],
    propertyClasses: ["background", "text", "border"],
    states: ["default"],
  },
  {
    component: "avatar",
    uxContext: "data",
    intents: ["accent", "muted"],
    propertyClasses: ["background", "text", "border"],
    states: ["default"],
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

const _propertyClassMap = new Map(ALL_PROPERTY_CLASSES.map((p) => [p.id, p]));
const _intentMap = new Map(SEMANTIC_INTENTS.map((i) => [i.id, i]));
const _uxContextMap = new Map(UX_CONTEXTS.map((u) => [u.id, u]));
const _stateMap = new Map(INTERACTION_STATES.map((s) => [s.id, s]));
const _modifierMap = new Map(EMPHASIS_MODIFIERS.map((m) => [m.id, m]));

export function getPropertyClass(id: string): PropertyClass | undefined {
  return _propertyClassMap.get(id);
}
export function getIntent(id: string): SemanticIntent | undefined {
  return _intentMap.get(id);
}
export function getUxContext(id: string): UxContext | undefined {
  return _uxContextMap.get(id);
}
export function getInteractionState(
  id: string,
): InteractionState | undefined {
  return _stateMap.get(id);
}
export function getEmphasisModifier(
  id: string,
): EmphasisModifier | undefined {
  return _modifierMap.get(id);
}

/**
 * Find which UX context a component belongs to.
 * Returns undefined if the component isn't in the built-in registry.
 */
export function findComponentContext(
  componentName: string,
): UxContext | undefined {
  const lower = componentName.toLowerCase().replace(/\s+/g, "-");
  for (const ctx of UX_CONTEXTS) {
    if (ctx.components.some((c) => c === lower)) return ctx;
  }
  // Fuzzy: check if any context's component list partially matches
  for (const ctx of UX_CONTEXTS) {
    if (ctx.components.some((c) => lower.includes(c) || c.includes(lower))) {
      return ctx;
    }
  }
  return undefined;
}

/**
 * Get the ComponentTokenSurface for a given component name.
 */
export function getComponentSurface(
  componentName: string,
): ComponentTokenSurface | undefined {
  const lower = componentName.toLowerCase().replace(/\s+/g, "-");
  return COMPONENT_TOKEN_SURFACES.find((s) => s.component === lower);
}
