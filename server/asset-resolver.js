// Resolves the current simulated price for any asset type.
// To add a new product: add a case here and a corresponding state table in schema.sql.

import TIER_CONFIG from './tier-config.js';

const VALID_ASSET_TYPES = new Set(
  Object.keys(TIER_CONFIG.basic.assets)
);

export function isValidAssetType(asset_type) {
  return VALID_ASSET_TYPES.has(asset_type);
}

const SYMBOL_RE = /^[A-Z0-9/._-]{1,16}$/i;
export function isValidSymbol(symbol) {
  return typeof symbol === 'string' && SYMBOL_RE.test(symbol);
}

export async function resolvePrice(asset_type, symbol, pool) {
  if (asset_type === 'stock') {
    const [[row]] = await pool.query(
      'SELECT price FROM stocks_state WHERE ticker = ?',
      [symbol.toUpperCase()]
    );
    return row ? Number(row.price) : null;
  }

  if (asset_type === 'forex') {
    const [[row]] = await pool.query(
      'SELECT price FROM forex_state WHERE pair = ?',
      [symbol.toUpperCase()]
    );
    return row ? Number(row.price) : null;
  }

  // Future products: add cases here
  throw new Error(`Unknown asset_type: ${asset_type}`);
}
