/**
 * PolyAPI · DiscordBotAPI
 *
 * Bot-facing endpoints for the Polymart Discord bot integration.
 * All routes require a pre-shared bot API key — NOT a Clerk JWT.
 *
 * Authentication: Authorization: Bearer <BOT_API_KEY env var>
 *
 * Mount point: /api/v1/bot
 *
 * Routes:
 *   POST   /bot/discord/verify        — validate pairing code, link accounts
 *   GET    /bot/discord/user/:id      — fetch linked user profile + portfolios
 *   GET    /bot/discord/portfolio/:id — fetch positions + cash for default portfolio
 *   POST   /bot/discord/order         — execute a market order for a linked user
 *   DELETE /bot/discord/user/:id      — unlink a Discord account
 */

import { dbUser as pool, dbMarket } from '../db.js';
import { resolvePrice, isValidAssetType, isValidSymbol } from '../PolyEngine/AssetResolver.js';
import { executeMarketOrder } from '../PolyEngine/OrderExecutor.js';
import { createRouter } from './Router.js';
import { success, fail, guard, ERRORS, HTTP } from './Protocol.js';

const router = createRouter({ label: '[discord-bot-api]', logging: false, catch404: false });

// ── Bot auth middleware ───────────────────────────────────────────────────────

function requireBotAuth() {
  return (req, res, next) => {
    const key = process.env.BOT_API_KEY;
    if (!key) return fail(res, ERRORS.INTERNAL, 'Bot API key not configured on server');

    const auth = req.headers.authorization;
    if (!auth || auth !== `Bearer ${key}`) {
      return fail(res, ERRORS.UNAUTHENTICATED, 'Invalid or missing bot API key', HTTP.UNAUTHORIZED);
    }
    next();
  };
}

router.use(requireBotAuth());

// ── POST /discord/verify ──────────────────────────────────────────────────────
// Validates a 6-digit pairing code and links the Discord account to the Polymart
// user that generated the code.
//
// Body: { code, discordUserId, discordUsername }
// Returns: { polymartUserId, clerkId, displayName, defaultPortfolioId }

router.post('/discord/verify', guard(async (req, res) => {
  const { code, discordUserId, discordUsername } = req.body;

  if (!code || !/^\d{6}$/.test(String(code)))
    return fail(res, ERRORS.VALIDATION_ERROR, 'code must be a 6-digit number');
  if (!discordUserId || typeof discordUserId !== 'string')
    return fail(res, ERRORS.VALIDATION_ERROR, 'discordUserId is required');
  if (!discordUsername || typeof discordUsername !== 'string')
    return fail(res, ERRORS.VALIDATION_ERROR, 'discordUsername is required');

  // Atomically claim the code and write the link in one transaction.
  // The UPDATE with used=0 guard is the atomic claim — only one concurrent
  // request can get affectedRows=1; all others get 0 and receive 404.
  const conn = await pool.getConnection();
  let clerkUserId;
  try {
    await conn.beginTransaction();

    const [claim] = await conn.query(
      'UPDATE discord_link_codes SET used = 1 WHERE code = ? AND used = 0 AND expires_at > NOW()',
      [String(code)]
    );

    if (claim.affectedRows === 0) {
      await conn.rollback();
      return fail(res, ERRORS.NOT_FOUND, 'Code not found, expired, or already used', HTTP.NOT_FOUND);
    }

    const [[row]] = await conn.query(
      'SELECT clerk_user_id FROM discord_link_codes WHERE code = ?',
      [String(code)]
    );
    clerkUserId = row.clerk_user_id;

    // If this Discord account is already linked to a different Polymart user, clear the old link
    const [[existingLink]] = await conn.query(
      'SELECT clerk_id FROM user_profiles WHERE discord_id = ? LIMIT 1',
      [discordUserId]
    );
    if (existingLink && existingLink.clerk_id !== clerkUserId) {
      await conn.query(
        'UPDATE user_profiles SET discord_id = NULL, discord_username = NULL, discord_linked_at = NULL WHERE clerk_id = ?',
        [existingLink.clerk_id]
      );
    }

    await conn.query(
      'UPDATE user_profiles SET discord_id = ?, discord_username = ?, discord_linked_at = NOW() WHERE clerk_id = ?',
      [discordUserId, discordUsername.slice(0, 100), clerkUserId]
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  // Return enough info for the bot to cache locally
  const [[user]] = await pool.query(
    'SELECT clerk_id, profile_id, display_name FROM user_profiles WHERE clerk_id = ?',
    [clerkUserId]
  );

  // Default portfolio = oldest portfolio for this user
  const [[defaultPortfolio]] = await pool.query(
    'SELECT id, name, cash_balance FROM portfolios WHERE clerk_id = ? ORDER BY created_at ASC LIMIT 1',
    [clerkUserId]
  );

  return success(res, {
    polymartUserId:   user.profile_id,
    clerkId:          user.clerk_id,
    displayName:      user.display_name ?? 'Polymart User',
    defaultPortfolioId: defaultPortfolio?.id ?? null,
    portfolioName:    defaultPortfolio?.name ?? null,
    cashBalance:      defaultPortfolio ? Number(defaultPortfolio.cash_balance) : null,
  });
}));

// ── GET /discord/user/:discordId ──────────────────────────────────────────────
// Returns the linked Polymart user's profile + list of portfolios.
// 404 if no account is linked to this Discord ID.

router.get('/discord/user/:discordId', guard(async (req, res) => {
  const discordId = req.params.discordId;

  const [[user]] = await pool.query(
    `SELECT clerk_id, profile_id, display_name, tier, discord_username, discord_linked_at
     FROM user_profiles WHERE discord_id = ? LIMIT 1`,
    [discordId]
  );

  if (!user) return fail(res, ERRORS.NOT_FOUND, 'No Polymart account linked to this Discord user', HTTP.NOT_FOUND);

  const [portfolios] = await pool.query(
    'SELECT id, name, cash_balance, created_at FROM portfolios WHERE clerk_id = ? ORDER BY created_at ASC',
    [user.clerk_id]
  );

  return success(res, {
    clerkId:        user.clerk_id,
    profileId:      user.profile_id,
    displayName:    user.display_name ?? 'Polymart User',
    tier:           user.tier,
    discordUsername: user.discord_username,
    linkedAt:       user.discord_linked_at,
    portfolios:     portfolios.map(p => ({ id: p.id, name: p.name, cashBalance: Number(p.cash_balance) })),
  });
}));

// ── GET /discord/portfolio/:discordId ─────────────────────────────────────────
// Returns the default (oldest) portfolio's positions and cash balance.
// Optionally accepts ?portfolioId= to specify a non-default portfolio.

router.get('/discord/portfolio/:discordId', guard(async (req, res) => {
  const discordId = req.params.discordId;

  const [[user]] = await pool.query(
    'SELECT clerk_id FROM user_profiles WHERE discord_id = ? LIMIT 1',
    [discordId]
  );
  if (!user) return fail(res, ERRORS.NOT_FOUND, 'No Polymart account linked to this Discord user', HTTP.NOT_FOUND);

  // Resolve portfolio — use ?portfolioId= or fall back to oldest
  let portfolio;
  const requestedId = parseInt(req.query.portfolioId, 10);
  if (requestedId) {
    const [[p]] = await pool.query(
      'SELECT * FROM portfolios WHERE id = ? AND clerk_id = ? LIMIT 1',
      [requestedId, user.clerk_id]
    );
    portfolio = p;
  } else {
    const [[p]] = await pool.query(
      'SELECT * FROM portfolios WHERE clerk_id = ? ORDER BY created_at ASC LIMIT 1',
      [user.clerk_id]
    );
    portfolio = p;
  }

  if (!portfolio) return fail(res, ERRORS.NOT_FOUND, 'Portfolio not found', HTTP.NOT_FOUND);

  const [positions] = await pool.query(
    'SELECT * FROM positions WHERE portfolio_id = ? ORDER BY opened_at DESC',
    [portfolio.id]
  );

  return success(res, {
    portfolioId:  portfolio.id,
    portfolioName: portfolio.name,
    cashBalance:  Number(portfolio.cash_balance),
    positions:    positions.map(p => ({
      id:         p.id,
      assetType:  p.asset_type,
      symbol:     p.symbol,
      quantity:   Number(p.quantity),
      avgCost:    Number(p.avg_cost),
      openedAt:   p.opened_at,
    })),
  });
}));

// ── POST /discord/order ───────────────────────────────────────────────────────
// Executes a market order on behalf of a linked Discord user.
// Replicates the AccountsAPI market-order logic; no limit/stop orders from bot.
//
// Body: { discordUserId, portfolioId?, symbol, assetType, side, quantity }

router.post('/discord/order', guard(async (req, res) => {
  const { discordUserId, portfolioId: rawPortfolioId, symbol: rawSymbol, assetType, side, quantity: rawQty } = req.body;

  // Input validation
  if (!discordUserId || typeof discordUserId !== 'string')
    return fail(res, ERRORS.VALIDATION_ERROR, 'discordUserId is required');
  if (!isValidAssetType(assetType))
    return fail(res, ERRORS.INVALID_VALUE, `Invalid assetType: ${assetType}`);
  if (!isValidSymbol(rawSymbol))
    return fail(res, ERRORS.INVALID_VALUE, 'Invalid symbol');
  if (side !== 'buy' && side !== 'sell')
    return fail(res, ERRORS.INVALID_VALUE, 'side must be "buy" or "sell"');

  const symbol   = rawSymbol.toUpperCase();
  const quantity = parseFloat(rawQty);
  if (!isFinite(quantity) || quantity <= 0)
    return fail(res, ERRORS.INVALID_VALUE, 'quantity must be a positive number');
  if (quantity > 1_000_000)
    return fail(res, ERRORS.INVALID_VALUE, 'quantity too large (max 1,000,000)');

  // Resolve linked user
  const [[user]] = await pool.query(
    'SELECT clerk_id FROM user_profiles WHERE discord_id = ? LIMIT 1',
    [discordUserId]
  );
  if (!user) return fail(res, ERRORS.NOT_FOUND, 'No Polymart account linked to this Discord user', HTTP.NOT_FOUND);

  // Resolve portfolio
  let portfolio;
  const portfolioId = parseInt(rawPortfolioId, 10);
  if (portfolioId) {
    const [[p]] = await pool.query(
      'SELECT * FROM portfolios WHERE id = ? AND clerk_id = ? LIMIT 1',
      [portfolioId, user.clerk_id]
    );
    portfolio = p;
  } else {
    const [[p]] = await pool.query(
      'SELECT * FROM portfolios WHERE clerk_id = ? ORDER BY created_at ASC LIMIT 1',
      [user.clerk_id]
    );
    portfolio = p;
  }
  if (!portfolio) return fail(res, ERRORS.NOT_FOUND, 'Portfolio not found', HTTP.NOT_FOUND);

  // Fetch live price
  const currentPrice = await resolvePrice(assetType, symbol, dbMarket);
  if (currentPrice === null) return fail(res, ERRORS.NOT_FOUND, `Symbol "${symbol}" not found`);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let result;
    try {
      result = await executeMarketOrder(conn, {
        portfolioId:  portfolio.id,
        cashBalance:  Number(portfolio.cash_balance),
        assetType,
        symbol,
        side,
        quantity,
        currentPrice,
      });
    } catch (orderErr) {
      await conn.rollback();
      if (orderErr.type === 'INSUFFICIENT_BALANCE')
        return fail(res, ERRORS.VALIDATION_ERROR, 'Insufficient cash balance', HTTP.BAD_REQUEST);
      if (orderErr.type === 'INSUFFICIENT_POSITION')
        return fail(res, ERRORS.VALIDATION_ERROR,
          `Insufficient position: you hold ${orderErr.held} unit(s) of ${symbol}`,
          HTTP.BAD_REQUEST);
      throw orderErr;
    }

    await conn.commit();
    return success(res, {
      ok:             true,
      side,
      symbol,
      assetType,
      quantity,
      executedPrice:  currentPrice,
      total:          result.total,
      realizedPnl:    result.realizedPnl,
      newCashBalance: result.newCashBalance,
    });

  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}));

// ── Shared helper — resolve clerk_id from discordId ──────────────────────────

async function requireLinked(discordId, res) {
  const [[user]] = await pool.query(
    'SELECT clerk_id FROM user_profiles WHERE discord_id = ? LIMIT 1',
    [discordId]
  );
  if (!user) { fail(res, ERRORS.NOT_FOUND, 'No Polymart account linked to this Discord user', HTTP.NOT_FOUND); return null; }
  return user.clerk_id;
}

// ── GET /discord/history/:discordId ──────────────────────────────────────────
// Paginated filled order history for the user's default (or specified) portfolio.
// ?page=1&limit=20&portfolioId=

router.get('/discord/history/:discordId', guard(async (req, res) => {
  const clerkId = await requireLinked(req.params.discordId, res);
  if (!clerkId) return;

  const page        = Math.max(1, parseInt(req.query.page  || '1',  10));
  const limit       = Math.min(50, parseInt(req.query.limit || '20', 10));
  const portfolioId = parseInt(req.query.portfolioId, 10) || null;

  let pid = portfolioId;
  if (!pid) {
    const [[p]] = await pool.query('SELECT id FROM portfolios WHERE clerk_id = ? ORDER BY created_at ASC LIMIT 1', [clerkId]);
    if (!p) return fail(res, ERRORS.NOT_FOUND, 'No portfolios found');
    pid = p.id;
  } else {
    const [[p]] = await pool.query('SELECT id FROM portfolios WHERE id = ? AND clerk_id = ?', [pid, clerkId]);
    if (!p) return fail(res, ERRORS.NOT_FOUND, 'Portfolio not found');
  }

  const [orders] = await pool.query(
    `SELECT id, asset_type, symbol, side, quantity, price, total, realized_pnl,
            order_type, status, executed_at, created_at
     FROM orders WHERE portfolio_id = ? AND status = 'filled'
     ORDER BY executed_at DESC LIMIT ? OFFSET ?`,
    [pid, limit, (page - 1) * limit]
  );
  const [[{ total: totalCount }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM orders WHERE portfolio_id = ? AND status = 'filled'`, [pid]
  );

  return success(res, {
    portfolioId: pid, page, limit,
    total: Number(totalCount),
    pages: Math.ceil(Number(totalCount) / limit),
    orders: orders.map(o => ({
      id:          o.id,
      assetType:   o.asset_type,
      symbol:      o.symbol,
      side:        o.side,
      quantity:    Number(o.quantity),
      price:       Number(o.price),
      total:       Number(o.total),
      realizedPnl: o.realized_pnl != null ? Number(o.realized_pnl) : null,
      orderType:   o.order_type,
      executedAt:  o.executed_at,
    })),
  });
}));

// ── GET /discord/stats/:discordId ─────────────────────────────────────────────
// P&L stats across all portfolios for a linked user.

router.get('/discord/stats/:discordId', guard(async (req, res) => {
  const clerkId = await requireLinked(req.params.discordId, res);
  if (!clerkId) return;

  const [[{ totalCash }]] = await pool.query(
    'SELECT COALESCE(SUM(cash_balance), 0) AS totalCash FROM portfolios WHERE clerk_id = ?',
    [clerkId]
  );

  const [[orderStats]] = await pool.query(
    `SELECT
       COUNT(*)                                                              AS totalOrders,
       COUNT(CASE WHEN o.side = 'sell' AND o.realized_pnl IS NOT NULL THEN 1 END) AS totalClosed,
       COUNT(CASE WHEN o.side = 'sell' AND o.realized_pnl > 0          THEN 1 END) AS winningTrades,
       COALESCE(SUM(CASE WHEN o.side = 'sell' THEN o.realized_pnl END), 0)         AS realisedPnl,
       MAX(CASE WHEN o.side = 'sell' THEN o.realized_pnl END)                      AS bestTrade,
       MIN(CASE WHEN o.side = 'sell' THEN o.realized_pnl END)                      AS worstTrade
     FROM orders o
     JOIN portfolios p ON o.portfolio_id = p.id
     WHERE p.clerk_id = ? AND o.status = 'filled'`,
    [clerkId]
  );

  const [portfolios] = await pool.query(
    'SELECT id, name, cash_balance FROM portfolios WHERE clerk_id = ? ORDER BY created_at ASC',
    [clerkId]
  );

  const closed  = Number(orderStats.totalClosed) || 0;
  const winning = Number(orderStats.winningTrades) || 0;

  return success(res, {
    cashBalance:   Number(totalCash),
    portfolioCount: portfolios.length,
    portfolios:    portfolios.map(p => ({ id: p.id, name: p.name, cashBalance: Number(p.cash_balance) })),
    totalOrders:   Number(orderStats.totalOrders),
    totalClosed:   closed,
    winningTrades: winning,
    winRate:       closed > 0 ? parseFloat(((winning / closed) * 100).toFixed(1)) : null,
    realisedPnl:   parseFloat(Number(orderStats.realisedPnl).toFixed(2)),
    bestTrade:     orderStats.bestTrade  != null ? parseFloat(Number(orderStats.bestTrade).toFixed(2))  : null,
    worstTrade:    orderStats.worstTrade != null ? parseFloat(Number(orderStats.worstTrade).toFixed(2)) : null,
  });
}));

// ── GET /discord/watchlist/:discordId ─────────────────────────────────────────
// All items from the user's default watchlist.

router.get('/discord/watchlist/:discordId', guard(async (req, res) => {
  const clerkId = await requireLinked(req.params.discordId, res);
  if (!clerkId) return;

  const [[wl]] = await pool.query(
    'SELECT id, name FROM watchlists WHERE clerk_id = ? ORDER BY created_at ASC LIMIT 1',
    [clerkId]
  );
  if (!wl) return success(res, { watchlistId: null, name: null, items: [] });

  const [items] = await pool.query(
    'SELECT asset_type, symbol, added_at FROM watchlist_items WHERE watchlist_id = ? ORDER BY added_at ASC',
    [wl.id]
  );

  return success(res, {
    watchlistId: wl.id,
    name:        wl.name,
    items:       items.map(i => ({ assetType: i.asset_type, symbol: i.symbol, addedAt: i.added_at })),
  });
}));

// ── POST /discord/watchlist/:discordId ────────────────────────────────────────
// Add an asset to the user's default watchlist.
// Body: { symbol, assetType }

router.post('/discord/watchlist/:discordId', guard(async (req, res) => {
  const clerkId = await requireLinked(req.params.discordId, res);
  if (!clerkId) return;

  const { symbol: rawSymbol, assetType = 'stock' } = req.body;
  if (!isValidSymbol(rawSymbol))    return fail(res, ERRORS.INVALID_VALUE, 'Invalid symbol');
  if (!isValidAssetType(assetType)) return fail(res, ERRORS.INVALID_VALUE, `Invalid assetType: ${assetType}`);
  const symbol = rawSymbol.toUpperCase();

  let [[wl]] = await pool.query('SELECT id FROM watchlists WHERE clerk_id = ? ORDER BY created_at ASC LIMIT 1', [clerkId]);
  if (!wl) {
    const [r] = await pool.query('INSERT INTO watchlists (clerk_id, name) VALUES (?, ?)', [clerkId, 'My Watchlist']);
    wl = { id: r.insertId };
  }

  await pool.query(
    'INSERT IGNORE INTO watchlist_items (watchlist_id, asset_type, symbol) VALUES (?, ?, ?)',
    [wl.id, assetType, symbol]
  );
  return success(res, { ok: true, watchlistId: wl.id, symbol, assetType });
}));

// ── DELETE /discord/watchlist/:discordId ──────────────────────────────────────
// Remove an asset from the user's default watchlist.
// Body: { symbol, assetType }

router.delete('/discord/watchlist/:discordId', guard(async (req, res) => {
  const clerkId = await requireLinked(req.params.discordId, res);
  if (!clerkId) return;

  const { symbol: rawSymbol, assetType = 'stock' } = req.body;
  if (!isValidSymbol(rawSymbol)) return fail(res, ERRORS.INVALID_VALUE, 'Invalid symbol');
  const symbol = rawSymbol.toUpperCase();

  const [[wl]] = await pool.query('SELECT id FROM watchlists WHERE clerk_id = ? ORDER BY created_at ASC LIMIT 1', [clerkId]);
  if (!wl) return success(res, { ok: true });

  await pool.query(
    'DELETE FROM watchlist_items WHERE watchlist_id = ? AND asset_type = ? AND symbol = ?',
    [wl.id, assetType, symbol]
  );
  return success(res, { ok: true });
}));

// ── GET /discord/alerts/:discordId ────────────────────────────────────────────
// All untriggered price alerts for a user.

router.get('/discord/alerts/:discordId', guard(async (req, res) => {
  const clerkId = await requireLinked(req.params.discordId, res);
  if (!clerkId) return;

  const [alerts] = await pool.query(
    `SELECT id, asset_type, symbol, direction, threshold, note, created_at
     FROM server_price_alerts WHERE clerk_id = ? AND triggered = 0
     ORDER BY created_at DESC`,
    [clerkId]
  );

  return success(res, {
    count: alerts.length,
    alerts: alerts.map(a => ({
      id:        a.id,
      assetType: a.asset_type,
      symbol:    a.symbol,
      direction: a.direction,
      threshold: Number(a.threshold),
      note:      a.note ?? null,
      createdAt: a.created_at,
    })),
  });
}));

// ── POST /discord/alerts/:discordId ───────────────────────────────────────────
// Create a price alert stored server-side.
// Body: { symbol, assetType, direction, threshold, note? }

router.post('/discord/alerts/:discordId', guard(async (req, res) => {
  const clerkId = await requireLinked(req.params.discordId, res);
  if (!clerkId) return;

  const { symbol: rawSymbol, assetType = 'stock', direction, threshold: rawThreshold, note } = req.body;
  if (!isValidSymbol(rawSymbol))               return fail(res, ERRORS.INVALID_VALUE, 'Invalid symbol');
  if (!isValidAssetType(assetType))            return fail(res, ERRORS.INVALID_VALUE, `Invalid assetType: ${assetType}`);
  if (direction !== 'above' && direction !== 'below') return fail(res, ERRORS.INVALID_VALUE, 'direction must be "above" or "below"');
  const threshold = parseFloat(rawThreshold);
  if (!isFinite(threshold) || threshold <= 0)  return fail(res, ERRORS.INVALID_VALUE, 'threshold must be a positive number');

  // Limit: 10 active alerts per user
  const [[{ cnt }]] = await pool.query(
    'SELECT COUNT(*) AS cnt FROM server_price_alerts WHERE clerk_id = ? AND triggered = 0',
    [clerkId]
  );
  if (Number(cnt) >= 10) return fail(res, ERRORS.QUOTA_EXCEEDED, 'Maximum 10 active alerts per account');

  const [r] = await pool.query(
    `INSERT INTO server_price_alerts (clerk_id, asset_type, symbol, direction, threshold, note)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [clerkId, assetType, rawSymbol.toUpperCase(), direction, threshold, note?.slice(0, 200) || null]
  );

  return success(res, { id: r.insertId, symbol: rawSymbol.toUpperCase(), assetType, direction, threshold, note: note || null });
}));

// ── DELETE /discord/alerts/:discordId/:alertId ────────────────────────────────
// Delete an alert (user-requested or triggered by the bot poller).

router.delete('/discord/alerts/:discordId/:alertId', guard(async (req, res) => {
  const clerkId = await requireLinked(req.params.discordId, res);
  if (!clerkId) return;

  const alertId = parseInt(req.params.alertId, 10);
  const [r] = await pool.query(
    'DELETE FROM server_price_alerts WHERE id = ? AND clerk_id = ?',
    [alertId, clerkId]
  );
  if (r.affectedRows === 0) return fail(res, ERRORS.NOT_FOUND, 'Alert not found');
  return success(res, { ok: true });
}));

// ── GET /discord/alerts/pending ───────────────────────────────────────────────
// All untriggered alerts for every linked user — used by the bot's alert poller.
// Returns discord_user_id alongside each alert so the bot knows who to notify.

router.get('/discord/alerts/pending', guard(async (req, res) => {
  const [alerts] = await pool.query(
    `SELECT a.id, u.discord_id AS discordUserId,
            a.asset_type, a.symbol, a.direction, a.threshold, a.note
     FROM server_price_alerts a
     JOIN user_profiles u ON a.clerk_id = u.clerk_id
     WHERE a.triggered = 0 AND u.discord_id IS NOT NULL
     ORDER BY a.created_at ASC`
  );

  return success(res, {
    count: alerts.length,
    alerts: alerts.map(a => ({
      id:           a.id,
      discordUserId: a.discordUserId,
      assetType:    a.asset_type,
      symbol:       a.symbol,
      direction:    a.direction,
      threshold:    Number(a.threshold),
      note:         a.note ?? null,
    })),
  });
}));

// ── POST /discord/alerts/:alertId/trigger ─────────────────────────────────────
// Mark an alert as triggered (called by bot after firing the notification).

router.post('/discord/alerts/:alertId/trigger', guard(async (req, res) => {
  const alertId = parseInt(req.params.alertId, 10);
  if (!alertId) return fail(res, ERRORS.VALIDATION_ERROR, 'Invalid alertId');

  await pool.query(
    'UPDATE server_price_alerts SET triggered = 1, triggered_at = NOW() WHERE id = ? AND triggered = 0',
    [alertId]
  );
  return success(res, { ok: true });
}));

// ── GET /discord/pending/:discordId ───────────────────────────────────────────
// Pending (limit/stop) orders waiting to be filled.
// ?portfolioId= optionally scopes to one portfolio.

router.get('/discord/pending/:discordId', guard(async (req, res) => {
  const clerkId = await requireLinked(req.params.discordId, res);
  if (!clerkId) return;

  const portfolioId = parseInt(req.query.portfolioId, 10) || null;

  let portfolioFilter = '';
  const params = [clerkId];
  if (portfolioId) { portfolioFilter = 'AND o.portfolio_id = ?'; params.push(portfolioId); }

  const [orders] = await pool.query(
    `SELECT o.id, o.portfolio_id, p.name AS portfolioName,
            o.asset_type, o.symbol, o.side, o.quantity, o.order_type,
            o.trigger_price, o.created_at
     FROM orders o
     JOIN portfolios p ON o.portfolio_id = p.id
     WHERE p.clerk_id = ? AND o.status = 'pending' ${portfolioFilter}
     ORDER BY o.created_at DESC`,
    params
  );

  return success(res, {
    count: orders.length,
    orders: orders.map(o => ({
      id:            o.id,
      portfolioId:   o.portfolio_id,
      portfolioName: o.portfolioName,
      assetType:     o.asset_type,
      symbol:        o.symbol,
      side:          o.side,
      quantity:      Number(o.quantity),
      orderType:     o.order_type,
      triggerPrice:  Number(o.trigger_price),
      createdAt:     o.created_at,
    })),
  });
}));

// ── DELETE /discord/pending/:discordId/:orderId ────────────────────────────────
// Cancel a pending limit/stop order.

router.delete('/discord/pending/:discordId/:orderId', guard(async (req, res) => {
  const clerkId = await requireLinked(req.params.discordId, res);
  if (!clerkId) return;

  const orderId = parseInt(req.params.orderId, 10);
  if (!orderId) return fail(res, ERRORS.VALIDATION_ERROR, 'Invalid orderId');

  const [[order]] = await pool.query(
    `SELECT o.id FROM orders o
     JOIN portfolios p ON o.portfolio_id = p.id
     WHERE o.id = ? AND p.clerk_id = ? AND o.status = 'pending'`,
    [orderId, clerkId]
  );
  if (!order) return fail(res, ERRORS.NOT_FOUND, 'Pending order not found');

  await pool.query("UPDATE orders SET status = 'cancelled' WHERE id = ?", [orderId]);
  return success(res, { ok: true });
}));

// ── DELETE /discord/user/:discordId ──────────────────────────────────────────
// Removes the Discord link from a Polymart account.

router.delete('/discord/user/:discordId', guard(async (req, res) => {
  const discordId = req.params.discordId;

  const [result] = await pool.query(
    'UPDATE user_profiles SET discord_id = NULL, discord_username = NULL, discord_linked_at = NULL WHERE discord_id = ?',
    [discordId]
  );

  if (result.affectedRows === 0)
    return fail(res, ERRORS.NOT_FOUND, 'No account linked to this Discord user', HTTP.NOT_FOUND);

  return success(res, { ok: true });
}));

export default router;
