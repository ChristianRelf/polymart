/**
 * PolyAPI · LeaderboardAPI
 *
 * Public community leaderboard ranked by total portfolio value.
 * No authentication required.
 *
 * Mount point: /api/v1/leaderboard
 */

import { dbUser as pool, dbMarket } from '../db.js';
import { createRouter } from './Router.js';
import { success, guard } from './Protocol.js';

const router = createRouter({ label: '[leaderboard-api]' });

// ── GET /leaderboard ──────────────────────────────────────────────────────────

router.get('/', guard(async (req, res) => {
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit)  || 50));
  const offset = Math.max(0,              parseInt(req.query.offset) || 0);

  // 1. All opted-in users with all their portfolios
  const [portfolioRows] = await pool.query(
    `SELECT up.profile_id, up.display_name, up.avatar_url, up.is_verified,
            p.id AS portfolio_id, p.name AS portfolio_name, p.cash_balance
     FROM user_profiles up
     JOIN portfolios p ON p.clerk_id = up.clerk_id
     WHERE up.show_on_leaderboard = 1`
  );

  if (!portfolioRows.length) {
    return success(res, { entries: [], total: 0, limit, offset });
  }

  // 2. All positions for those portfolios
  const portfolioIds = portfolioRows.map(r => r.portfolio_id);
  const [positions] = await pool.query(
    'SELECT portfolio_id, asset_type, symbol, quantity FROM positions WHERE portfolio_id IN (?)',
    [portfolioIds]
  );

  // 3. Batch-fetch live prices grouped by asset type
  const priceMap = {};

  const stockSymbols  = [...new Set(positions.filter(p => p.asset_type === 'stock').map(p => p.symbol))];
  const forexSymbols  = [...new Set(positions.filter(p => p.asset_type === 'forex').map(p => p.symbol))];
  const cryptoSymbols = [...new Set(positions.filter(p => p.asset_type === 'crypto').map(p => p.symbol))];

  const priceQueries = [];
  if (stockSymbols.length) {
    priceQueries.push(
      dbMarket.query('SELECT ticker AS sym, price FROM stocks_state WHERE ticker IN (?)', [stockSymbols])
        .then(([rows]) => { for (const r of rows) priceMap[`stock:${r.sym}`]  = Number(r.price); })
    );
  }
  if (forexSymbols.length) {
    priceQueries.push(
      dbMarket.query('SELECT pair AS sym, price FROM forex_state WHERE pair IN (?)', [forexSymbols])
        .then(([rows]) => { for (const r of rows) priceMap[`forex:${r.sym}`]  = Number(r.price); })
    );
  }
  if (cryptoSymbols.length) {
    priceQueries.push(
      dbMarket.query('SELECT symbol AS sym, price FROM crypto_state WHERE symbol IN (?)', [cryptoSymbols])
        .then(([rows]) => { for (const r of rows) priceMap[`crypto:${r.sym}`] = Number(r.price); })
    );
  }
  await Promise.all(priceQueries);

  // 4. Compute position value and count per portfolio
  const posValueByPortfolio = {};
  const posCountByPortfolio = {};
  for (const pos of positions) {
    const price = priceMap[`${pos.asset_type}:${pos.symbol}`] ?? 0;
    posValueByPortfolio[pos.portfolio_id] = (posValueByPortfolio[pos.portfolio_id] ?? 0) + Number(pos.quantity) * price;
    posCountByPortfolio[pos.portfolio_id] = (posCountByPortfolio[pos.portfolio_id] ?? 0) + 1;
  }

  // 5. Per user, keep only their best portfolio by total value
  const bestByProfile = {};
  for (const p of portfolioRows) {
    const posValue  = posValueByPortfolio[p.portfolio_id] ?? 0;
    const totalValue = Number(p.cash_balance) + posValue;
    if (!bestByProfile[p.profile_id] || totalValue > bestByProfile[p.profile_id].total_value) {
      bestByProfile[p.profile_id] = {
        profile_id:     p.profile_id,
        display_name:   p.display_name,
        avatar_url:     p.avatar_url,
        is_verified:    !!p.is_verified,
        portfolio_name: p.portfolio_name,
        cash_balance:   Number(p.cash_balance),
        position_count: posCountByPortfolio[p.portfolio_id] ?? 0,
        total_value:    totalValue,
      };
    }
  }

  // 6. Sort descending, paginate, assign rank
  const sorted = Object.values(bestByProfile).sort((a, b) => b.total_value - a.total_value);
  const total  = sorted.length;
  const page   = sorted.slice(offset, offset + limit);

  const entries = page.map((entry, i) => ({
    rank:           offset + i + 1,
    profile_id:     entry.profile_id,
    display_name:   entry.display_name,
    avatar_url:     entry.avatar_url,
    is_verified:    entry.is_verified,
    portfolio_name: entry.portfolio_name,
    total_value:    parseFloat(entry.total_value.toFixed(2)),
    position_count: entry.position_count,
    cash_balance:   parseFloat(entry.cash_balance.toFixed(2)),
  }));

  return success(res, { entries, total, limit, offset });
}));

export default router;
