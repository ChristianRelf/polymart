import { Router } from 'express';
import { requireAuth, getAuth } from '@clerk/express';
import { Webhook } from 'svix';
import pool from './db.js';
import TIER_CONFIG from './tier-config.js';
import { resolvePrice, isValidAssetType, isValidSymbol } from './asset-resolver.js';

const router = Router();

// ── Per-user rate limiter ─────────────────────────────────────────────────────
const userRateLimitMap = new Map();
const USER_RATE_LIMIT = 60;
const USER_RATE_WINDOW = 60_000;

function userRateLimit(req, res, next) {
  const { userId } = getAuth(req);
  if (!userId) return next();
  const now = Date.now();
  const entry = userRateLimitMap.get(userId);
  if (!entry || now - entry.resetAt > USER_RATE_WINDOW) {
    userRateLimitMap.set(userId, { count: 1, resetAt: now });
    return next();
  }
  if (entry.count >= USER_RATE_LIMIT) {
    return res.status(429).json({ error: 'Rate limit exceeded. Try again in a minute.' });
  }
  entry.count++;
  next();
}

// Separate rate limit for order placement (tighter: 10/min)
const orderRateLimitMap = new Map();
function orderRateLimit(req, res, next) {
  const { userId } = getAuth(req);
  if (!userId) return next();
  const now = Date.now();
  const entry = orderRateLimitMap.get(userId);
  if (!entry || now - entry.resetAt > USER_RATE_WINDOW) {
    orderRateLimitMap.set(userId, { count: 1, resetAt: now });
    return next();
  }
  if (entry.count >= 10) {
    return res.status(429).json({ error: 'Too many orders. Slow down.' });
  }
  entry.count++;
  next();
}

// ── Helper: get user tier ─────────────────────────────────────────────────────
async function getUserTier(userId) {
  const [[row]] = await pool.query(
    'SELECT tier FROM user_profiles WHERE clerk_id = ?',
    [userId]
  );
  return row?.tier || 'basic';
}

// ── Helper: verify portfolio ownership ───────────────────────────────────────
async function getOwnedPortfolio(portfolioId, userId) {
  const [[row]] = await pool.query(
    'SELECT * FROM portfolios WHERE id = ? AND clerk_id = ?',
    [portfolioId, userId]
  );
  return row || null;
}

// ── Clerk webhook handler (exported and mounted separately in server.js) ──────
// Requires express.raw() body parser — must be mounted BEFORE express.json().
export async function clerkWebhookHandler(req, res) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) return res.status(500).json({ error: 'Webhook secret not configured' });

  try {
    const wh = new Webhook(secret);
    const payload = wh.verify(req.body, {
      'svix-id': req.headers['svix-id'],
      'svix-timestamp': req.headers['svix-timestamp'],
      'svix-signature': req.headers['svix-signature'],
    });

    const { type, data } = payload;

    if (type === 'user.created' || type === 'user.updated') {
      const email = data.email_addresses?.[0]?.email_address || null;
      const display_name = [data.first_name, data.last_name].filter(Boolean).join(' ') || null;
      const avatar_url = data.image_url || null;

      await pool.query(
        `INSERT INTO user_profiles (clerk_id, display_name, email, avatar_url)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           display_name = IF(? IS NULL, display_name, ?),
           email        = IF(? IS NULL, email, ?),
           avatar_url   = IF(? IS NULL, avatar_url, ?),
           updated_at   = NOW()`,
        [
          data.id, display_name, email, avatar_url,
          display_name, display_name,
          email, email,
          avatar_url, avatar_url,
        ]
      );
    }

    if (type === 'user.deleted') {
      await pool.query('DELETE FROM user_profiles WHERE clerk_id = ?', [data.id]);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[account-api] Webhook error:', err.message);
    res.status(400).json({ error: 'Invalid webhook signature' });
  }
}

// ── All routes below require authentication ───────────────────────────────────
router.use(requireAuth(), userRateLimit);

// ── GET /me ───────────────────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  const { userId } = getAuth(req);
  try {
    const [[user]] = await pool.query(
      'SELECT clerk_id, display_name, email, tier, avatar_url, bio, stripe_subscription_id, tier_expires_at, created_at FROM user_profiles WHERE clerk_id = ?',
      [userId]
    );
    if (!user) return res.status(404).json({ error: 'User profile not found. Try signing out and back in.' });
    const tierLimits = TIER_CONFIG[user.tier] || TIER_CONFIG.basic;
    res.json({ ...user, tierLimits });
  } catch (err) {
    console.error('[account-api] GET /me:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /me ───────────────────────────────────────────────────────────────────
router.put('/me', async (req, res) => {
  const { userId } = getAuth(req);
  const { display_name, bio } = req.body;

  if (display_name !== undefined && (typeof display_name !== 'string' || display_name.length > 128)) {
    return res.status(400).json({ error: 'display_name must be a string under 128 characters' });
  }
  if (bio !== undefined && (typeof bio !== 'string' || bio.length > 500)) {
    return res.status(400).json({ error: 'bio must be a string under 500 characters' });
  }

  try {
    await pool.query(
      'UPDATE user_profiles SET display_name = COALESCE(?, display_name), bio = COALESCE(?, bio), updated_at = NOW() WHERE clerk_id = ?',
      [display_name ?? null, bio ?? null, userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[account-api] PUT /me:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /portfolios ───────────────────────────────────────────────────────────
router.get('/portfolios', async (req, res) => {
  const { userId } = getAuth(req);
  try {
    const [portfolios] = await pool.query(
      'SELECT * FROM portfolios WHERE clerk_id = ? ORDER BY created_at ASC',
      [userId]
    );

    // Attach position count to each portfolio
    const withCounts = await Promise.all(portfolios.map(async p => {
      const [[{ cnt }]] = await pool.query(
        'SELECT COUNT(*) as cnt FROM positions WHERE portfolio_id = ?',
        [p.id]
      );
      return { ...p, position_count: cnt };
    }));

    res.json(withCounts);
  } catch (err) {
    console.error('[account-api] GET /portfolios:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /portfolios ──────────────────────────────────────────────────────────
router.post('/portfolios', async (req, res) => {
  const { userId } = getAuth(req);
  const { name, description } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 128) {
    return res.status(400).json({ error: 'name is required and must be under 128 characters' });
  }

  try {
    const tier = await getUserTier(userId);
    const limits = TIER_CONFIG[tier] || TIER_CONFIG.basic;

    const [[{ cnt }]] = await pool.query(
      'SELECT COUNT(*) as cnt FROM portfolios WHERE clerk_id = ?',
      [userId]
    );
    if (cnt >= limits.maxPortfolios) {
      return res.status(403).json({
        error: `Your ${limits.label} plan allows a maximum of ${limits.maxPortfolios} portfolio(s). Upgrade to create more.`,
        code: 'PORTFOLIO_LIMIT',
      });
    }

    const [result] = await pool.query(
      'INSERT INTO portfolios (clerk_id, name, description, cash_balance) VALUES (?, ?, ?, ?)',
      [userId, name.trim(), description?.trim() || null, limits.startingCash]
    );

    // Create a default watchlist for the user if they don't have one
    const [[{ wlCnt }]] = await pool.query(
      'SELECT COUNT(*) as wlCnt FROM watchlists WHERE clerk_id = ?',
      [userId]
    );
    if (wlCnt === 0) {
      await pool.query(
        'INSERT INTO watchlists (clerk_id, name) VALUES (?, ?)',
        [userId, 'My Watchlist']
      );
    }

    res.status(201).json({
      id: result.insertId,
      clerk_id: userId,
      name: name.trim(),
      description: description?.trim() || null,
      cash_balance: limits.startingCash,
    });
  } catch (err) {
    console.error('[account-api] POST /portfolios:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /portfolios/:id ───────────────────────────────────────────────────────
router.get('/portfolios/:id', async (req, res) => {
  const { userId } = getAuth(req);
  const portfolioId = parseInt(req.params.id);
  if (!portfolioId) return res.status(400).json({ error: 'Invalid portfolio ID' });

  try {
    const portfolio = await getOwnedPortfolio(portfolioId, userId);
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

    const [positions] = await pool.query(
      'SELECT * FROM positions WHERE portfolio_id = ? ORDER BY opened_at DESC',
      [portfolioId]
    );
    const [recentOrders] = await pool.query(
      'SELECT * FROM orders WHERE portfolio_id = ? ORDER BY executed_at DESC LIMIT 20',
      [portfolioId]
    );

    res.json({ ...portfolio, positions, recentOrders });
  } catch (err) {
    console.error('[account-api] GET /portfolios/:id:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /portfolios/:id ───────────────────────────────────────────────────────
router.put('/portfolios/:id', async (req, res) => {
  const { userId } = getAuth(req);
  const portfolioId = parseInt(req.params.id);
  const { name, description } = req.body;

  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0 || name.length > 128)) {
    return res.status(400).json({ error: 'name must be a non-empty string under 128 characters' });
  }

  try {
    const portfolio = await getOwnedPortfolio(portfolioId, userId);
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

    await pool.query(
      'UPDATE portfolios SET name = COALESCE(?, name), description = ? WHERE id = ?',
      [name?.trim() ?? null, description?.trim() ?? null, portfolioId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[account-api] PUT /portfolios/:id:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /portfolios/:id ────────────────────────────────────────────────────
router.delete('/portfolios/:id', async (req, res) => {
  const { userId } = getAuth(req);
  const portfolioId = parseInt(req.params.id);

  try {
    const portfolio = await getOwnedPortfolio(portfolioId, userId);
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

    await pool.query('DELETE FROM portfolios WHERE id = ?', [portfolioId]);
    res.json({ success: true });
  } catch (err) {
    console.error('[account-api] DELETE /portfolios/:id:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /portfolios/:id/orders ───────────────────────────────────────────────
router.post('/portfolios/:id/orders', orderRateLimit, async (req, res) => {
  const { userId } = getAuth(req);
  const portfolioId = parseInt(req.params.id);
  const { asset_type, symbol, side, quantity: rawQty, notes } = req.body;

  // Input validation
  if (!portfolioId) return res.status(400).json({ error: 'Invalid portfolio ID' });
  if (!isValidAssetType(asset_type)) return res.status(400).json({ error: `Invalid asset_type: ${asset_type}` });
  if (!isValidSymbol(symbol)) return res.status(400).json({ error: 'Invalid symbol' });
  if (side !== 'buy' && side !== 'sell') return res.status(400).json({ error: 'side must be "buy" or "sell"' });

  const quantity = parseFloat(rawQty);
  if (!isFinite(quantity) || quantity <= 0) return res.status(400).json({ error: 'quantity must be a positive number' });
  if (notes && typeof notes === 'string' && notes.length > 1000) return res.status(400).json({ error: 'notes too long' });

  try {
    const portfolio = await getOwnedPortfolio(portfolioId, userId);
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

    const tier = await getUserTier(userId);
    const limits = TIER_CONFIG[tier] || TIER_CONFIG.basic;

    // Check asset type access for this tier
    if (!limits.assets[asset_type]) {
      return res.status(403).json({
        error: `Your ${limits.label} plan does not include ${asset_type} trading. Upgrade to Premium to unlock it.`,
        code: 'ASSET_NOT_ALLOWED',
      });
    }

    // Look up current price from simulation DB
    const currentPrice = await resolvePrice(asset_type, symbol, pool);
    if (currentPrice === null) return res.status(404).json({ error: `Symbol "${symbol}" not found` });

    const total = parseFloat((currentPrice * quantity).toFixed(4));

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      if (side === 'buy') {
        if (Number(portfolio.cash_balance) < total) {
          await conn.rollback();
          return res.status(400).json({ error: 'Insufficient cash balance' });
        }

        // Check if position already exists
        const [[existing]] = await conn.query(
          'SELECT * FROM positions WHERE portfolio_id = ? AND asset_type = ? AND symbol = ?',
          [portfolioId, asset_type, symbol.toUpperCase()]
        );

        if (!existing) {
          // Check position limit (only counts when opening a new position)
          const [[{ cnt }]] = await conn.query(
            'SELECT COUNT(*) as cnt FROM positions WHERE portfolio_id = ?',
            [portfolioId]
          );
          if (cnt >= limits.maxPositions) {
            await conn.rollback();
            return res.status(403).json({
              error: `Your ${limits.label} plan allows a maximum of ${limits.maxPositions} open positions per portfolio.`,
              code: 'POSITION_LIMIT',
            });
          }
          await conn.query(
            'INSERT INTO positions (portfolio_id, asset_type, symbol, quantity, avg_cost) VALUES (?,?,?,?,?)',
            [portfolioId, asset_type, symbol.toUpperCase(), quantity, currentPrice]
          );
        } else {
          // Average down/up: weighted average cost
          const newQty = Number(existing.quantity) + quantity;
          const newAvg = (Number(existing.avg_cost) * Number(existing.quantity) + currentPrice * quantity) / newQty;
          await conn.query(
            'UPDATE positions SET quantity = ?, avg_cost = ? WHERE id = ?',
            [newQty, parseFloat(newAvg.toFixed(4)), existing.id]
          );
        }

        await conn.query(
          'UPDATE portfolios SET cash_balance = cash_balance - ? WHERE id = ?',
          [total, portfolioId]
        );

      } else {
        // sell
        const [[existing]] = await conn.query(
          'SELECT * FROM positions WHERE portfolio_id = ? AND asset_type = ? AND symbol = ?',
          [portfolioId, asset_type, symbol.toUpperCase()]
        );
        if (!existing || Number(existing.quantity) < quantity) {
          await conn.rollback();
          return res.status(400).json({ error: 'Insufficient position size to sell' });
        }

        const newQty = parseFloat((Number(existing.quantity) - quantity).toFixed(4));
        if (newQty === 0) {
          await conn.query('DELETE FROM positions WHERE id = ?', [existing.id]);
        } else {
          await conn.query('UPDATE positions SET quantity = ? WHERE id = ?', [newQty, existing.id]);
        }

        await conn.query(
          'UPDATE portfolios SET cash_balance = cash_balance + ? WHERE id = ?',
          [total, portfolioId]
        );
      }

      await conn.query(
        'INSERT INTO orders (portfolio_id, asset_type, symbol, side, quantity, price, total, notes) VALUES (?,?,?,?,?,?,?,?)',
        [portfolioId, asset_type, symbol.toUpperCase(), side, quantity, currentPrice, total, notes || null]
      );

      await conn.commit();

      const [[updated]] = await pool.query('SELECT * FROM portfolios WHERE id = ?', [portfolioId]);
      res.json({ success: true, portfolio: updated, executedPrice: currentPrice, total });

    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

  } catch (err) {
    console.error('[account-api] POST /portfolios/:id/orders:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /portfolios/:id/orders ────────────────────────────────────────────────
router.get('/portfolios/:id/orders', async (req, res) => {
  const { userId } = getAuth(req);
  const portfolioId = parseInt(req.params.id);
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const { asset_type } = req.query;

  try {
    const portfolio = await getOwnedPortfolio(portfolioId, userId);
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

    let sql = 'SELECT * FROM orders WHERE portfolio_id = ?';
    const params = [portfolioId];

    if (asset_type && isValidAssetType(asset_type)) {
      sql += ' AND asset_type = ?';
      params.push(asset_type);
    }

    sql += ' ORDER BY executed_at DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    const [orders] = await pool.query(sql, params);
    res.json({ orders, page, limit });
  } catch (err) {
    console.error('[account-api] GET /portfolios/:id/orders:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /watchlists ───────────────────────────────────────────────────────────
router.get('/watchlists', async (req, res) => {
  const { userId } = getAuth(req);
  try {
    const [lists] = await pool.query(
      'SELECT * FROM watchlists WHERE clerk_id = ? ORDER BY created_at ASC',
      [userId]
    );
    const withItems = await Promise.all(lists.map(async wl => {
      const [items] = await pool.query(
        'SELECT * FROM watchlist_items WHERE watchlist_id = ? ORDER BY added_at ASC',
        [wl.id]
      );
      return { ...wl, items };
    }));
    res.json(withItems);
  } catch (err) {
    console.error('[account-api] GET /watchlists:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /watchlists ──────────────────────────────────────────────────────────
router.post('/watchlists', async (req, res) => {
  const { userId } = getAuth(req);
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 128) {
    return res.status(400).json({ error: 'name is required and must be under 128 characters' });
  }
  try {
    const tier = await getUserTier(userId);
    const limits = TIER_CONFIG[tier] || TIER_CONFIG.basic;
    const [[{ cnt }]] = await pool.query(
      'SELECT COUNT(*) as cnt FROM watchlists WHERE clerk_id = ?',
      [userId]
    );
    if (cnt >= limits.maxWatchlists) {
      return res.status(403).json({
        error: `Your ${limits.label} plan allows a maximum of ${limits.maxWatchlists} watchlist(s).`,
        code: 'WATCHLIST_LIMIT',
      });
    }
    const [result] = await pool.query(
      'INSERT INTO watchlists (clerk_id, name) VALUES (?, ?)',
      [userId, name.trim()]
    );
    res.status(201).json({ id: result.insertId, clerk_id: userId, name: name.trim(), items: [] });
  } catch (err) {
    console.error('[account-api] POST /watchlists:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /watchlists/:id/items ────────────────────────────────────────────────
router.post('/watchlists/:id/items', async (req, res) => {
  const { userId } = getAuth(req);
  const watchlistId = parseInt(req.params.id);
  const { asset_type = 'stock', symbol } = req.body;

  if (!isValidAssetType(asset_type)) return res.status(400).json({ error: 'Invalid asset_type' });
  if (!isValidSymbol(symbol)) return res.status(400).json({ error: 'Invalid symbol' });

  try {
    const [[wl]] = await pool.query(
      'SELECT * FROM watchlists WHERE id = ? AND clerk_id = ?',
      [watchlistId, userId]
    );
    if (!wl) return res.status(404).json({ error: 'Watchlist not found' });

    const tier = await getUserTier(userId);
    const limits = TIER_CONFIG[tier] || TIER_CONFIG.basic;
    const [[{ cnt }]] = await pool.query(
      'SELECT COUNT(*) as cnt FROM watchlist_items WHERE watchlist_id = ?',
      [watchlistId]
    );
    if (cnt >= limits.maxWatchlistItems) {
      return res.status(403).json({
        error: `Your ${limits.label} plan allows a maximum of ${limits.maxWatchlistItems} items per watchlist.`,
      });
    }

    await pool.query(
      'INSERT IGNORE INTO watchlist_items (watchlist_id, asset_type, symbol) VALUES (?,?,?)',
      [watchlistId, asset_type, symbol.toUpperCase()]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[account-api] POST /watchlists/:id/items:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /watchlists/:id/items ──────────────────────────────────────────────
router.delete('/watchlists/:id/items', async (req, res) => {
  const { userId } = getAuth(req);
  const watchlistId = parseInt(req.params.id);
  const { asset_type = 'stock', symbol } = req.body;

  if (!isValidSymbol(symbol)) return res.status(400).json({ error: 'Invalid symbol' });

  try {
    const [[wl]] = await pool.query(
      'SELECT id FROM watchlists WHERE id = ? AND clerk_id = ?',
      [watchlistId, userId]
    );
    if (!wl) return res.status(404).json({ error: 'Watchlist not found' });

    await pool.query(
      'DELETE FROM watchlist_items WHERE watchlist_id = ? AND asset_type = ? AND symbol = ?',
      [watchlistId, asset_type, symbol.toUpperCase()]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[account-api] DELETE /watchlists/:id/items:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /watchlists/:id ────────────────────────────────────────────────────
router.delete('/watchlists/:id', async (req, res) => {
  const { userId } = getAuth(req);
  const watchlistId = parseInt(req.params.id);

  try {
    const [[wl]] = await pool.query(
      'SELECT id FROM watchlists WHERE id = ? AND clerk_id = ?',
      [watchlistId, userId]
    );
    if (!wl) return res.status(404).json({ error: 'Watchlist not found' });

    await pool.query('DELETE FROM watchlists WHERE id = ?', [watchlistId]);
    res.json({ success: true });
  } catch (err) {
    console.error('[account-api] DELETE /watchlists/:id:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
