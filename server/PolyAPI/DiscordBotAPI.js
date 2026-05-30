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
