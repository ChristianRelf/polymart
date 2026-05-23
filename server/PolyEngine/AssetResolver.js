/**
 * PolyEngine · AssetResolver
 *
 * Resolves current simulated prices for any asset class, and validates
 * asset-type / symbol inputs before they reach the DB.
 *
 * Asset types are derived from tier-config so adding a new product only
 * requires adding it to TIER_CONFIG.basic.assets — no changes here needed.
 *
 * Public API:
 *   isValidAssetType(asset_type)              → boolean
 *   isValidSymbol(symbol)                     → boolean
 *   resolvePrice(asset_type, symbol, pool)    → Promise<number | null>
 *   resolvePrices(requests, pool)             → Promise<Map<string, number>>
 */

import TIER_CONFIG from '../tier-config.js';

// ── Asset-type registry ───────────────────────────────────────────────────────

const VALID_ASSET_TYPES = new Set(Object.keys(TIER_CONFIG.basic.assets));

export function isValidAssetType(asset_type) {
  return VALID_ASSET_TYPES.has(asset_type);
}

// ── Symbol validation ─────────────────────────────────────────────────────────

const SYMBOL_RE = /^[A-Z0-9/._-]{1,16}$/i;

export function isValidSymbol(symbol) {
  return typeof symbol === 'string' && SYMBOL_RE.test(symbol);
}

// ── Price resolution ──────────────────────────────────────────────────────────

const PRICE_QUERIES = {
  stock:  'SELECT price FROM stocks_state WHERE ticker = ?',
  forex:  'SELECT price FROM forex_state WHERE pair = ?',
  crypto: 'SELECT price FROM crypto_state WHERE symbol = ?',
};

/**
 * Fetch the live simulated price for a single asset.
 * Returns null if the symbol is not found.
 * Throws if asset_type is not registered.
 *
 * @param {'stock'|'forex'} asset_type
 * @param {string} symbol
 * @param {import('mysql2/promise').Pool} pool  dbMarket pool
 * @returns {Promise<number | null>}
 */
export async function resolvePrice(asset_type, symbol, pool) {
  const query = PRICE_QUERIES[asset_type];
  if (!query) throw new Error(`Unknown asset_type: ${asset_type}`);

  const [[row]] = await pool.query(query, [symbol.toUpperCase()]);
  return row ? Number(row.price) : null;
}

/**
 * Batch-resolve prices for multiple assets in parallel.
 * Missing symbols are omitted from the result map.
 *
 * @param {{ asset_type: string, symbol: string }[]} requests
 * @param {import('mysql2/promise').Pool} pool  dbMarket pool
 * @returns {Promise<Map<string, number>>}  keyed by "asset_type:SYMBOL"
 */
export async function resolvePrices(requests, pool) {
  const results = await Promise.all(
    requests.map(async ({ asset_type, symbol }) => {
      const price = await resolvePrice(asset_type, symbol, pool);
      return price !== null ? [`${asset_type}:${symbol.toUpperCase()}`, price] : null;
    })
  );
  return new Map(results.filter(Boolean));
}
