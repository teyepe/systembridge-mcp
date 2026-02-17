/**
 * Format adapter registry.
 *
 * Adapters are tried in priority order: Tokens Studio first (most specific
 * detection), then W3C DT, then Style Dictionary (most permissive).
 */
export { styleDictionaryAdapter } from "./style-dictionary.js";
export { w3cDesignTokensAdapter } from "./w3c-dt.js";
export { tokensStudioAdapter } from "./tokens-studio.js";

import type { TokenFormatAdapter, TokenFormat } from "../types.js";
import { tokensStudioAdapter } from "./tokens-studio.js";
import { w3cDesignTokensAdapter } from "./w3c-dt.js";
import { styleDictionaryAdapter } from "./style-dictionary.js";

/** Ordered list — most specific detector first. */
const adapters: TokenFormatAdapter[] = [
  tokensStudioAdapter,
  w3cDesignTokensAdapter,
  styleDictionaryAdapter,
];

/**
 * Auto-detect which format a parsed token object uses and return the
 * matching adapter.
 */
export function detectFormat(data: unknown): TokenFormatAdapter | undefined {
  return adapters.find((a) => a.detect(data));
}

/**
 * Get adapter by explicit format name.
 */
export function getAdapter(format: TokenFormat): TokenFormatAdapter | undefined {
  return adapters.find((a) => a.format === format);
}
