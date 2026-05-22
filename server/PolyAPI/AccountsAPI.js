/**
 * PolyAPI · AccountsAPI
 *
 * User account, portfolio, order, and watchlist routes.
 * All routes require authentication. The Clerk webhook handler is exported
 * separately (server.js mounts it with express.raw() before json()).
 *
 * Mount point: /api/v1/account
 */

import { Webhook }   from 'svix';
import { dbUser as pool, dbMarket } from '../db.js';
import TIER_CONFIG from '../tier-config.js';
import { resolvePrice, isValidAssetType, isValidSymbol } from '../PolyEngine/AssetResolver.js';
import { createRouter } from './Router.js';
import { requireAuth, rateLimit } from './Middleware.js';
import { success, fail, guard, ERRORS, HTTP } from './Protocol.js';
import { schema, v } from './Validator.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateProfileId() {
  // 16-digit string starting with 1-8, value always < Number.MAX_SAFE_INTEGER
  return Math.floor(Math.random() * 8e15 + 1e15).toString();
}

async function getUserTier(userId) {
  const [[row]] = await pool.query('SELECT tier FROM user_profiles WHERE clerk_id = ?', [userId]);
  return row?.tier || 'basic';
}

async function getOwnedPortfolio(portfolioId, userId) {
  const [[row]] = await pool.query(
    'SELECT * FROM portfolios WHERE id = ? AND clerk_id = ?',
    [portfolioId, userId]
  );
  return row || null;
}

// ── Clerk webhook handler ─────────────────────────────────────────────────────
// Exported separately — mount with express.raw() before express.json() in server.js.

export async function clerkWebhookHandler(req, res) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) return res.status(HTTP.INTERNAL).json({ error: 'Webhook secret not configured' });

  try {
    const wh      = new Webhook(secret);
    const payload = wh.verify(req.body, {
      'svix-id':        req.headers['svix-id'],
      'svix-timestamp': req.headers['svix-timestamp'],
      'svix-signature': req.headers['svix-signature'],
    });

    const { type, data } = payload;

    if (type === 'user.created' || type === 'user.updated') {
      const email        = data.email_addresses?.[0]?.email_address || null;
      const display_name = [data.first_name, data.last_name].filter(Boolean).join(' ') || null;
      const avatar_url   = data.image_url || null;
      const profile_id   = generateProfileId();

      await pool.query(
        `INSERT INTO user_profiles (clerk_id, profile_id, display_name, email, avatar_url)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           profile_id   = IF(profile_id IS NULL, VALUES(profile_id), profile_id),
           display_name = IF(? IS NULL, display_name, ?),
           email        = IF(? IS NULL, email, ?),
           avatar_url   = IF(? IS NULL, avatar_url, ?),
           updated_at   = NOW()`,
        [data.id, profile_id, display_name, email, avatar_url,
         display_name, display_name, email, email, avatar_url, avatar_url]
      );
    }

    if (type === 'user.deleted') {
      await pool.query('DELETE FROM user_profiles WHERE clerk_id = ?', [data.id]);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[account-api] Webhook error:', err.message);
    res.status(HTTP.BAD_REQUEST).json({ error: 'Invalid webhook signature' });
  }
}

// ── Router ────────────────────────────────────────────────────────────────────

const router = createRouter({ label: '[account-api]' });

router.use(
  requireAuth(),
  rateLimit({ windowMs: 60_000, max: 60, label: 'account-api' })
);

// ── GET /me ───────────────────────────────────────────────────────────────────

router.get('/me', guard(async (req, res) => {
  await pool.query(
    'INSERT IGNORE INTO user_profiles (clerk_id, profile_id) VALUES (?, ?)',
    [req.userId, generateProfileId()]
  );
  await pool.query(
    `UPDATE user_profiles SET profile_id = ?
     WHERE clerk_id = ? AND (profile_id IS NULL OR profile_id NOT REGEXP '^[0-9]{9,16}$')`,
    [generateProfileId(), req.userId]
  );
  const [[user]] = await pool.query(
    `SELECT clerk_id, profile_id, display_name, email, tier, avatar_url, bio,
            stripe_subscription_id, tier_expires_at, created_at
     FROM user_profiles WHERE clerk_id = ?`,
    [req.userId]
  );
  const tierLimits = TIER_CONFIG[user.tier] || TIER_CONFIG.basic;
  return success(res, { ...user, tierLimits });
}));

// ── PUT /me ───────────────────────────────────────────────────────────────────

const updateMeSchema = schema({
  display_name: v.optional(v.string({ min: 1, max: 128, required: false })),
  bio:          v.optional(v.string({ min: 0, max: 500, required: false })),
});

router.put('/me', guard(async (req, res) => {
  const err = updateMeSchema.first(req.body);
  if (err) return fail(res, ERRORS.VALIDATION_ERROR, err);

  const { display_name, bio } = req.body;
  await pool.query(
    'UPDATE user_profiles SET display_name = COALESCE(?, display_name), bio = COALESCE(?, bio), updated_at = NOW() WHERE clerk_id = ?',
    [display_name || null, bio !== undefined ? bio : null, req.userId]
  );
  return success(res, { ok: true });
}));

// ── GET /portfolios ───────────────────────────────────────────────────────────

router.get('/portfolios', guard(async (req, res) => {
  const [portfolios] = await pool.query(
    'SELECT * FROM portfolios WHERE clerk_id = ? ORDER BY created_at ASC',
    [req.userId]
  );
  const withCounts = await Promise.all(portfolios.map(async p => {
    const [[{ cnt }]] = await pool.query('SELECT COUNT(*) as cnt FROM positions WHERE portfolio_id = ?', [p.id]);
    const [posRows]   = await pool.query('SELECT symbol, asset_type FROM positions WHERE portfolio_id = ? LIMIT 5', [p.id]);
    const [[snap]]    = await pool.query('SELECT total_value FROM portfolio_snapshots WHERE portfolio_id = ? ORDER BY snapped_at DESC LIMIT 1', [p.id]);
    return { ...p, position_count: cnt, position_symbols: posRows, total_value: snap?.total_value ?? null };
  }));
  return success(res, withCounts);
}));

// ── POST /portfolios ──────────────────────────────────────────────────────────

router.post('/portfolios', guard(async (req, res) => {
  const { name, description } = req.body;
  if (!name || typeof name !== 'string' || !name.trim() || name.length > 128)
    return fail(res, ERRORS.VALIDATION_ERROR, 'name is required and must be under 128 characters');

  const tier        = await getUserTier(req.userId);
  const limits      = TIER_CONFIG[tier] || TIER_CONFIG.basic;
  const [[{ cnt }]] = await pool.query('SELECT COUNT(*) as cnt FROM portfolios WHERE clerk_id = ?', [req.userId]);

  if (cnt >= limits.maxPortfolios) {
    return fail(res, ERRORS.QUOTA_EXCEEDED,
      `Your ${limits.label} plan allows a maximum of ${limits.maxPortfolios} portfolio(s). Upgrade to create more.`,
      HTTP.FORBIDDEN
    );
  }

  const [result] = await pool.query(
    'INSERT INTO portfolios (clerk_id, name, description, cash_balance) VALUES (?, ?, ?, ?)',
    [req.userId, name.trim(), description?.trim() || null, limits.startingCash]
  );

  const [[{ wlCnt }]] = await pool.query('SELECT COUNT(*) as wlCnt FROM watchlists WHERE clerk_id = ?', [req.userId]);
  if (wlCnt === 0) {
    await pool.query('INSERT INTO watchlists (clerk_id, name) VALUES (?, ?)', [req.userId, 'My Watchlist']);
  }

  return success(res, {
    id: result.insertId, clerk_id: req.userId, name: name.trim(),
    description: description?.trim() || null, cash_balance: limits.startingCash,
  }, undefined, HTTP.CREATED);
}));

// ── GET /portfolios/:id ───────────────────────────────────────────────────────

router.get('/portfolios/:id', guard(async (req, res) => {
  const portfolioId = parseInt(req.params.id);
  if (!portfolioId) return fail(res, ERRORS.VALIDATION_ERROR, 'Invalid portfolio ID');

  const portfolio = await getOwnedPortfolio(portfolioId, req.userId);
  if (!portfolio) return fail(res, ERRORS.NOT_FOUND, 'Portfolio not found');

  const [positions]    = await pool.query('SELECT * FROM positions WHERE portfolio_id = ? ORDER BY opened_at DESC', [portfolioId]);
  const [recentOrders] = await pool.query('SELECT * FROM orders WHERE portfolio_id = ? ORDER BY executed_at DESC LIMIT 20', [portfolioId]);
  return success(res, { ...portfolio, positions, recentOrders });
}));

// ── PUT /portfolios/:id ───────────────────────────────────────────────────────

router.put('/portfolios/:id', guard(async (req, res) => {
  const portfolioId = parseInt(req.params.id);
  const { name, description } = req.body;
  if (name !== undefined && (typeof name !== 'string' || !name.trim() || name.length > 128))
    return fail(res, ERRORS.VALIDATION_ERROR, 'name must be a non-empty string under 128 characters');

  const portfolio = await getOwnedPortfolio(portfolioId, req.userId);
  if (!portfolio) return fail(res, ERRORS.NOT_FOUND, 'Portfolio not found');

  await pool.query(
    'UPDATE portfolios SET name = COALESCE(?, name), description = ? WHERE id = ?',
    [name?.trim() ?? null, description?.trim() ?? null, portfolioId]
  );
  return success(res, { ok: true });
}));

// ── DELETE /portfolios/:id ────────────────────────────────────────────────────

router.delete('/portfolios/:id', guard(async (req, res) => {
  const portfolioId = parseInt(req.params.id);
  const portfolio   = await getOwnedPortfolio(portfolioId, req.userId);
  if (!portfolio) return fail(res, ERRORS.NOT_FOUND, 'Portfolio not found');

  await pool.query('DELETE FROM portfolios WHERE id = ?', [portfolioId]);
  return success(res, { ok: true });
}));

// ── POST /portfolios/:id/orders ───────────────────────────────────────────────

router.post('/portfolios/:id/orders',
  rateLimit({ windowMs: 60_000, max: 10, label: 'orders', cost: 1 }),
  guard(async (req, res) => {
    const portfolioId = parseInt(req.params.id, 10);
    const { asset_type, symbol, side, quantity: rawQty, notes, order_type = 'market', trigger_price: rawTrigger } = req.body;

    if (!Number.isInteger(portfolioId) || portfolioId <= 0)
      return fail(res, ERRORS.VALIDATION_ERROR, 'Invalid portfolio ID');
    if (!isValidAssetType(asset_type))
      return fail(res, ERRORS.INVALID_VALUE, `Invalid asset_type: ${asset_type}`);
    if (!isValidSymbol(symbol))
      return fail(res, ERRORS.INVALID_VALUE, 'Invalid symbol');
    if (side !== 'buy' && side !== 'sell')
      return fail(res, ERRORS.INVALID_VALUE, 'side must be "buy" or "sell"');
    if (!['market', 'limit', 'stop'].includes(order_type))
      return fail(res, ERRORS.INVALID_VALUE, 'order_type must be "market", "limit", or "stop"');

    const quantity = parseFloat(rawQty);
    if (!isFinite(quantity) || quantity <= 0)
      return fail(res, ERRORS.INVALID_VALUE, 'quantity must be a positive number');
    if (quantity > 1_000_000)
      return fail(res, ERRORS.INVALID_VALUE, 'quantity too large (max 1,000,000)');
    if (notes && typeof notes === 'string' && notes.length > 1000)
      return fail(res, ERRORS.TOO_LONG, 'notes too long (max 1000 characters)');

    let triggerPrice = null;
    if (order_type !== 'market') {
      triggerPrice = parseFloat(rawTrigger);
      if (!isFinite(triggerPrice) || triggerPrice <= 0)
        return fail(res, ERRORS.INVALID_VALUE, 'trigger_price is required and must be a positive number for limit/stop orders');
    }

    const portfolio = await getOwnedPortfolio(portfolioId, req.userId);
    if (!portfolio) return fail(res, ERRORS.NOT_FOUND, 'Portfolio not found');

    const tier   = await getUserTier(req.userId);
    const limits = TIER_CONFIG[tier] || TIER_CONFIG.basic;

    if (!limits.assets[asset_type]) {
      return fail(res, ERRORS.FORBIDDEN,
        `Your ${limits.label} plan does not include ${asset_type} trading. Upgrade to Premium to unlock it.`
      );
    }

    // Validate symbol exists in market DB
    const currentPrice = await resolvePrice(asset_type, symbol, dbMarket);
    if (currentPrice === null) return fail(res, ERRORS.NOT_FOUND, `Symbol "${symbol}" not found`);

    // ── Pending order (limit / stop) ─────────────────────────────────────────
    if (order_type !== 'market') {
      await pool.query(
        `INSERT INTO orders (portfolio_id, asset_type, symbol, side, quantity, notes,
                             order_type, trigger_price, status, executed_at)
         VALUES (?,?,?,?,?,?,?,?,'pending',NULL)`,
        [portfolioId, asset_type, symbol.toUpperCase(), side, quantity, notes || null, order_type, triggerPrice]
      );
      return success(res, { ok: true, status: 'pending', order_type, trigger_price: triggerPrice });
    }

    // ── Market order (immediate execution) ──────────────────────────────────
    const total = parseFloat((currentPrice * quantity).toFixed(4));
    const conn  = await pool.getConnection();
    try {
      await conn.beginTransaction();

      let realizedPnl = null;

      if (side === 'buy') {
        if (Number(portfolio.cash_balance) < total) {
          await conn.rollback();
          return fail(res, ERRORS.VALIDATION_ERROR, 'Insufficient cash balance', HTTP.BAD_REQUEST);
        }

        const [[existing]] = await conn.query(
          'SELECT * FROM positions WHERE portfolio_id = ? AND asset_type = ? AND symbol = ?',
          [portfolioId, asset_type, symbol.toUpperCase()]
        );

        if (!existing) {
          const [[{ cnt }]] = await conn.query('SELECT COUNT(*) as cnt FROM positions WHERE portfolio_id = ?', [portfolioId]);
          if (cnt >= limits.maxPositions) {
            await conn.rollback();
            return fail(res, ERRORS.QUOTA_EXCEEDED,
              `Your ${limits.label} plan allows a maximum of ${limits.maxPositions} open positions per portfolio.`,
              HTTP.FORBIDDEN
            );
          }
          await conn.query(
            'INSERT INTO positions (portfolio_id, asset_type, symbol, quantity, avg_cost) VALUES (?,?,?,?,?)',
            [portfolioId, asset_type, symbol.toUpperCase(), quantity, currentPrice]
          );
        } else {
          const newQty = Number(existing.quantity) + quantity;
          const newAvg = (Number(existing.avg_cost) * Number(existing.quantity) + currentPrice * quantity) / newQty;
          await conn.query(
            'UPDATE positions SET quantity = ?, avg_cost = ? WHERE id = ?',
            [newQty, parseFloat(newAvg.toFixed(4)), existing.id]
          );
        }

        await conn.query('UPDATE portfolios SET cash_balance = cash_balance - ? WHERE id = ?', [total, portfolioId]);

      } else {
        const [[existing]] = await conn.query(
          'SELECT * FROM positions WHERE portfolio_id = ? AND asset_type = ? AND symbol = ?',
          [portfolioId, asset_type, symbol.toUpperCase()]
        );
        if (!existing || Number(existing.quantity) < quantity) {
          await conn.rollback();
          return fail(res, ERRORS.VALIDATION_ERROR, 'Insufficient position size to sell', HTTP.BAD_REQUEST);
        }

        realizedPnl = parseFloat(((currentPrice - Number(existing.avg_cost)) * quantity).toFixed(4));

        const newQty = parseFloat((Number(existing.quantity) - quantity).toFixed(4));
        if (newQty === 0) {
          await conn.query('DELETE FROM positions WHERE id = ?', [existing.id]);
        } else {
          await conn.query('UPDATE positions SET quantity = ? WHERE id = ?', [newQty, existing.id]);
        }

        await conn.query('UPDATE portfolios SET cash_balance = cash_balance + ? WHERE id = ?', [total, portfolioId]);
      }

      await conn.query(
        `INSERT INTO orders (portfolio_id, asset_type, symbol, side, quantity, price, total, notes,
                             order_type, status, realized_pnl, executed_at)
         VALUES (?,?,?,?,?,?,?,?,'market','filled',?,NOW())`,
        [portfolioId, asset_type, symbol.toUpperCase(), side, quantity, currentPrice, total, notes || null, realizedPnl]
      );

      await conn.commit();
      const [[updated]] = await pool.query('SELECT * FROM portfolios WHERE id = ?', [portfolioId]);
      return success(res, { ok: true, portfolio: updated, executedPrice: currentPrice, total });

    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  })
);

// ── DELETE /portfolios/:id/orders/:orderId ────────────────────────────────────

router.delete('/portfolios/:id/orders/:orderId', guard(async (req, res) => {
  const portfolioId = parseInt(req.params.id, 10);
  const orderId     = parseInt(req.params.orderId, 10);

  if (!portfolioId || !orderId)
    return fail(res, ERRORS.VALIDATION_ERROR, 'Invalid ID');

  const portfolio = await getOwnedPortfolio(portfolioId, req.userId);
  if (!portfolio) return fail(res, ERRORS.NOT_FOUND, 'Portfolio not found');

  const [[order]] = await pool.query(
    'SELECT id, status FROM orders WHERE id = ? AND portfolio_id = ?',
    [orderId, portfolioId]
  );
  if (!order) return fail(res, ERRORS.NOT_FOUND, 'Order not found');
  if (order.status !== 'pending') return fail(res, ERRORS.VALIDATION_ERROR, 'Only pending orders can be cancelled');

  await pool.query('UPDATE orders SET status = ? WHERE id = ?', ['cancelled', orderId]);
  return success(res, { ok: true });
}));

// ── GET /portfolios/:id/orders/pending ────────────────────────────────────────

router.get('/portfolios/:id/orders/pending', guard(async (req, res) => {
  const portfolioId = parseInt(req.params.id, 10);
  if (!portfolioId) return fail(res, ERRORS.VALIDATION_ERROR, 'Invalid portfolio ID');

  const portfolio = await getOwnedPortfolio(portfolioId, req.userId);
  if (!portfolio) return fail(res, ERRORS.NOT_FOUND, 'Portfolio not found');

  const [orders] = await pool.query(
    `SELECT * FROM orders WHERE portfolio_id = ? AND status = 'pending' ORDER BY created_at DESC`,
    [portfolioId]
  );
  return success(res, { orders });
}));

// ── GET /portfolios/:id/orders ────────────────────────────────────────────────

router.get('/portfolios/:id/orders', guard(async (req, res) => {
  const portfolioId = parseInt(req.params.id);
  const page        = Math.max(1, parseInt(req.query.page) || 1);
  const limit       = Math.min(50, parseInt(req.query.limit) || 20);
  const { asset_type } = req.query;

  const portfolio = await getOwnedPortfolio(portfolioId, req.userId);
  if (!portfolio) return fail(res, ERRORS.NOT_FOUND, 'Portfolio not found');

  let sql    = "SELECT * FROM orders WHERE portfolio_id = ? AND status = 'filled'";
  const params = [portfolioId];

  if (asset_type && isValidAssetType(asset_type)) { sql += ' AND asset_type = ?'; params.push(asset_type); }
  sql += ' ORDER BY executed_at DESC LIMIT ? OFFSET ?';
  params.push(limit, (page - 1) * limit);

  const [orders] = await pool.query(sql, params);
  return success(res, { orders, page, limit });
}));

// ── GET /portfolios/:id/snapshots ─────────────────────────────────────────────

router.get('/portfolios/:id/snapshots', guard(async (req, res) => {
  const portfolioId = parseInt(req.params.id);
  if (!portfolioId) return fail(res, ERRORS.VALIDATION_ERROR, 'Invalid portfolio ID');

  const portfolio = await getOwnedPortfolio(portfolioId, req.userId);
  if (!portfolio) return fail(res, ERRORS.NOT_FOUND, 'Portfolio not found');

  const [rows] = await pool.query(
    'SELECT total_value, snapped_at FROM portfolio_snapshots WHERE portfolio_id = ? ORDER BY snapped_at ASC LIMIT 90',
    [portfolioId]
  );
  return success(res, rows);
}));

// ── GET /watchlists ───────────────────────────────────────────────────────────

router.get('/watchlists', guard(async (req, res) => {
  const [lists] = await pool.query(
    'SELECT * FROM watchlists WHERE clerk_id = ? ORDER BY created_at ASC',
    [req.userId]
  );
  const withItems = await Promise.all(lists.map(async wl => {
    const [items] = await pool.query(
      'SELECT * FROM watchlist_items WHERE watchlist_id = ? ORDER BY added_at ASC',
      [wl.id]
    );
    return { ...wl, items };
  }));
  return success(res, withItems);
}));

// ── POST /watchlists ──────────────────────────────────────────────────────────

router.post('/watchlists', guard(async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim() || name.length > 128)
    return fail(res, ERRORS.VALIDATION_ERROR, 'name is required and must be under 128 characters');

  const tier        = await getUserTier(req.userId);
  const limits      = TIER_CONFIG[tier] || TIER_CONFIG.basic;
  const [[{ cnt }]] = await pool.query('SELECT COUNT(*) as cnt FROM watchlists WHERE clerk_id = ?', [req.userId]);

  if (cnt >= limits.maxWatchlists) {
    return fail(res, ERRORS.QUOTA_EXCEEDED,
      `Your ${limits.label} plan allows a maximum of ${limits.maxWatchlists} watchlist(s).`,
      HTTP.FORBIDDEN
    );
  }

  const [result] = await pool.query('INSERT INTO watchlists (clerk_id, name) VALUES (?, ?)', [req.userId, name.trim()]);
  return success(res, { id: result.insertId, clerk_id: req.userId, name: name.trim(), items: [] }, undefined, HTTP.CREATED);
}));

// ── POST /watchlists/:id/items ────────────────────────────────────────────────

router.post('/watchlists/:id/items', guard(async (req, res) => {
  const watchlistId         = parseInt(req.params.id);
  const { asset_type = 'stock', symbol } = req.body;

  if (!isValidAssetType(asset_type)) return fail(res, ERRORS.INVALID_VALUE, 'Invalid asset_type');
  if (!isValidSymbol(symbol))         return fail(res, ERRORS.INVALID_VALUE, 'Invalid symbol');

  const [[wl]] = await pool.query('SELECT * FROM watchlists WHERE id = ? AND clerk_id = ?', [watchlistId, req.userId]);
  if (!wl) return fail(res, ERRORS.NOT_FOUND, 'Watchlist not found');

  const tier        = await getUserTier(req.userId);
  const limits      = TIER_CONFIG[tier] || TIER_CONFIG.basic;
  const [[{ cnt }]] = await pool.query('SELECT COUNT(*) as cnt FROM watchlist_items WHERE watchlist_id = ?', [watchlistId]);

  if (cnt >= limits.maxWatchlistItems) {
    return fail(res, ERRORS.QUOTA_EXCEEDED,
      `Your ${limits.label} plan allows a maximum of ${limits.maxWatchlistItems} items per watchlist.`,
      HTTP.FORBIDDEN
    );
  }

  await pool.query(
    'INSERT IGNORE INTO watchlist_items (watchlist_id, asset_type, symbol) VALUES (?,?,?)',
    [watchlistId, asset_type, symbol.toUpperCase()]
  );
  return success(res, { ok: true });
}));

// ── DELETE /watchlists/:id/items ──────────────────────────────────────────────

router.delete('/watchlists/:id/items', guard(async (req, res) => {
  const watchlistId             = parseInt(req.params.id);
  const { asset_type = 'stock', symbol } = req.body;

  if (!isValidSymbol(symbol)) return fail(res, ERRORS.INVALID_VALUE, 'Invalid symbol');

  const [[wl]] = await pool.query('SELECT id FROM watchlists WHERE id = ? AND clerk_id = ?', [watchlistId, req.userId]);
  if (!wl) return fail(res, ERRORS.NOT_FOUND, 'Watchlist not found');

  await pool.query(
    'DELETE FROM watchlist_items WHERE watchlist_id = ? AND asset_type = ? AND symbol = ?',
    [watchlistId, asset_type, symbol.toUpperCase()]
  );
  return success(res, { ok: true });
}));

// ── DELETE /watchlists/:id ────────────────────────────────────────────────────

router.delete('/watchlists/:id', guard(async (req, res) => {
  const watchlistId = parseInt(req.params.id);
  const [[wl]]      = await pool.query('SELECT id FROM watchlists WHERE id = ? AND clerk_id = ?', [watchlistId, req.userId]);
  if (!wl) return fail(res, ERRORS.NOT_FOUND, 'Watchlist not found');

  await pool.query('DELETE FROM watchlists WHERE id = ?', [watchlistId]);
  return success(res, { ok: true });
}));

// ── GET /stats ────────────────────────────────────────────────────────────────

router.get('/stats', guard(async (req, res) => {
  const [[{ total_cash }]] = await pool.query(
    'SELECT COALESCE(SUM(cash_balance), 0) as total_cash FROM portfolios WHERE clerk_id = ?',
    [req.userId]
  );
  const [rawPositions] = await pool.query(`
    SELECT p.quantity, p.avg_cost, p.asset_type, p.symbol
    FROM positions p
    JOIN portfolios port ON p.portfolio_id = port.id
    WHERE port.clerk_id = ?
  `, [req.userId]);

  let position_value = 0;
  let cost_basis = 0;

  if (rawPositions.length > 0) {
    const stocks = [...new Set(rawPositions.filter(p => p.asset_type === 'stock').map(p => p.symbol))];
    const forex  = [...new Set(rawPositions.filter(p => p.asset_type === 'forex').map(p => p.symbol))];
    const priceMap = {};

    if (stocks.length > 0) {
      const [rows] = await dbMarket.query('SELECT ticker, price FROM stocks_state WHERE ticker IN (?)', [stocks]);
      for (const r of rows) priceMap[`stock:${r.ticker}`] = Number(r.price);
    }
    if (forex.length > 0) {
      const [rows] = await dbMarket.query('SELECT pair, price FROM forex_state WHERE pair IN (?)', [forex]);
      for (const r of rows) priceMap[`forex:${r.pair}`] = Number(r.price);
    }

    for (const p of rawPositions) {
      const current_price = priceMap[`${p.asset_type}:${p.symbol}`] ?? Number(p.avg_cost);
      position_value += Number(p.quantity) * current_price;
      cost_basis     += Number(p.quantity) * Number(p.avg_cost);
    }
  }

  const total_value    = Number(total_cash) + position_value;
  const unrealised_pnl = position_value - cost_basis;

  const [[orderStats]] = await pool.query(
    `SELECT
       COUNT(*) AS total_orders,
       COUNT(CASE WHEN o.side = 'sell' AND o.realized_pnl IS NOT NULL THEN 1 END) AS total_closed,
       COUNT(CASE WHEN o.side = 'sell' AND o.realized_pnl > 0 THEN 1 END) AS winning_trades,
       AVG(CASE WHEN o.side = 'sell' AND o.realized_pnl IS NOT NULL THEN o.realized_pnl END) AS avg_pnl,
       MAX(CASE WHEN o.side = 'sell' THEN o.realized_pnl END) AS best_trade,
       MIN(CASE WHEN o.side = 'sell' THEN o.realized_pnl END) AS worst_trade
     FROM orders o
     JOIN portfolios port ON o.portfolio_id = port.id
     WHERE port.clerk_id = ? AND o.status = 'filled'`,
    [req.userId]
  );
  const [[userRow]] = await pool.query('SELECT created_at FROM user_profiles WHERE clerk_id = ?', [req.userId]);

  const total_closed   = Number(orderStats.total_closed) || 0;
  const winning_trades = Number(orderStats.winning_trades) || 0;
  const win_rate       = total_closed > 0 ? parseFloat(((winning_trades / total_closed) * 100).toFixed(1)) : null;

  return success(res, {
    total_value, total_cash: Number(total_cash), position_value,
    unrealised_pnl,
    total_orders: Number(orderStats.total_orders),
    total_closed,
    winning_trades,
    win_rate,
    avg_pnl:    orderStats.avg_pnl    != null ? parseFloat(Number(orderStats.avg_pnl).toFixed(2))    : null,
    best_trade: orderStats.best_trade != null ? parseFloat(Number(orderStats.best_trade).toFixed(2)) : null,
    worst_trade:orderStats.worst_trade!= null ? parseFloat(Number(orderStats.worst_trade).toFixed(2)): null,
    created_at: userRow?.created_at ?? null,
  });
}));

// ── GET /orders/recent ────────────────────────────────────────────────────────

router.get('/orders/recent', guard(async (req, res) => {
  const [orders] = await pool.query(
    `SELECT o.id, o.asset_type, o.symbol, o.side, o.quantity, o.price, o.total,
            o.order_type, o.realized_pnl, o.executed_at,
            port.id as portfolio_id, port.name as portfolio_name
     FROM orders o
     JOIN portfolios port ON o.portfolio_id = port.id
     WHERE port.clerk_id = ? AND o.status = 'filled'
     ORDER BY o.executed_at DESC LIMIT 10`,
    [req.userId]
  );
  return success(res, orders);
}));

export default router;
