/**
 * PolyAPI · AdminAPI
 *
 * Admin-only management routes: users, tiers, support tickets, billing,
 * audit log, and community moderation. All routes require admin role.
 *
 * Mount point: /api/v1/admin
 */

import Stripe from 'stripe';
import { clerkClient } from '@clerk/express';
import { dbUser as pool } from '../db.js';
import TIER_CONFIG from '../tier-config.js';
import { createRouter } from './Router.js';
import { requireAdmin } from './Middleware.js';
import { success, fail, guard, ERRORS, HTTP } from './Protocol.js';
import { schema, v } from './Validator.js';

// ── Stripe singleton ──────────────────────────────────────────────────────────

let _stripe = null;
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

// ── Audit logger ──────────────────────────────────────────────────────────────

async function auditLog(adminClerkId, action, targetClerkId = null, details = null) {
  await pool.query(
    'INSERT INTO admin_audit_log (admin_clerk_id, action, target_clerk_id, details) VALUES (?,?,?,?)',
    [adminClerkId, action, targetClerkId, details ? JSON.stringify(details) : null]
  );
}

// ── Router ────────────────────────────────────────────────────────────────────

const router = createRouter({ label: '[admin-api]' });

router.use(requireAdmin());

// ── GET /admin/users ──────────────────────────────────────────────────────────

router.get('/users', guard(async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page) || 1);
  const limit  = Math.min(100, parseInt(req.query.limit) || 25);
  const { search, tier } = req.query;

  const clerkParams = { limit, offset: (page - 1) * limit };
  if (search) clerkParams.query = search;
  const { data: clerkUsers, totalCount } = await clerkClient.users.getUserList(clerkParams);

  if (!clerkUsers.length) return success(res, { users: [], page, limit, total: 0 });

  const ids      = clerkUsers.map(u => u.id);
  const [dbRows] = await pool.query(
    'SELECT clerk_id, tier, is_verified, created_at, stripe_subscription_id FROM user_profiles WHERE clerk_id IN (?)',
    [ids]
  );
  const dbMap = new Map(dbRows.map(u => [u.clerk_id, u]));

  let users = clerkUsers.map(cu => {
    const db = dbMap.get(cu.id) || {};
    return {
      clerk_id:               cu.id,
      display_name:           [cu.firstName, cu.lastName].filter(Boolean).join(' ') || cu.username || null,
      email:                  cu.emailAddresses?.[0]?.emailAddress || null,
      tier:                   db.tier || 'basic',
      is_verified:            db.is_verified ?? 0,
      created_at:             db.created_at || new Date(cu.createdAt).toISOString(),
      stripe_subscription_id: db.stripe_subscription_id || null,
    };
  });

  if (tier && (tier === 'basic' || tier === 'premium')) {
    users = users.filter(u => u.tier === tier);
  }

  return success(res, { users, page, limit, total: totalCount });
}));

// ── GET /admin/users/:clerkId ─────────────────────────────────────────────────

router.get('/users/:clerkId', guard(async (req, res) => {
  const { clerkId } = req.params;
  const [[user]]   = await pool.query('SELECT * FROM user_profiles WHERE clerk_id = ?', [clerkId]);
  if (!user) return fail(res, ERRORS.NOT_FOUND, 'User not found');

  const [portfolios] = await pool.query('SELECT id, name, cash_balance, created_at FROM portfolios WHERE clerk_id = ?', [clerkId]);
  const [tickets]    = await pool.query(
    'SELECT id, subject, status, created_at FROM support_tickets WHERE clerk_id = ? ORDER BY created_at DESC LIMIT 10',
    [clerkId]
  );
  const tierLimits = TIER_CONFIG[user.tier] || TIER_CONFIG.basic;
  return success(res, { ...user, tierLimits, portfolios, tickets });
}));

// ── PUT /admin/users/:clerkId/verify ─────────────────────────────────────────

router.put('/users/:clerkId/verify', guard(async (req, res) => {
  const { clerkId }   = req.params;
  const { is_verified } = req.body;
  if (typeof is_verified !== 'boolean' && is_verified !== 0 && is_verified !== 1)
    return fail(res, ERRORS.VALIDATION_ERROR, 'is_verified must be a boolean');

  const [[user]] = await pool.query('SELECT clerk_id FROM user_profiles WHERE clerk_id = ?', [clerkId]);
  if (!user) return fail(res, ERRORS.NOT_FOUND, 'User not found');

  const value = is_verified ? 1 : 0;
  await pool.query('UPDATE user_profiles SET is_verified = ? WHERE clerk_id = ?', [value, clerkId]);
  await auditLog(req.userId, value ? 'verify_user' : 'unverify_user', clerkId);
  return success(res, { ok: true, is_verified: value });
}));

// ── PUT /admin/users/:clerkId/tier ────────────────────────────────────────────

const tierSchema = schema({ tier: v.enum(['basic', 'premium']) });

router.put('/users/:clerkId/tier', guard(async (req, res) => {
  const { clerkId } = req.params;
  const err = tierSchema.first(req.body);
  if (err) return fail(res, ERRORS.VALIDATION_ERROR, err);

  const { tier, expires_at } = req.body;
  const [[user]] = await pool.query('SELECT clerk_id FROM user_profiles WHERE clerk_id = ?', [clerkId]);
  if (!user) return fail(res, ERRORS.NOT_FOUND, 'User not found');

  await pool.query(
    'UPDATE user_profiles SET tier = ?, tier_expires_at = ?, updated_at = NOW() WHERE clerk_id = ?',
    [tier, expires_at || null, clerkId]
  );
  await auditLog(req.userId, 'tier_override', clerkId, { tier, expires_at: expires_at || null });
  return success(res, { ok: true });
}));

// ── POST /admin/users/:clerkId/reset-portfolio/:portfolioId ───────────────────

router.post('/users/:clerkId/reset-portfolio/:portfolioId', guard(async (req, res) => {
  const { clerkId, portfolioId } = req.params;
  const [[portfolio]] = await pool.query(
    'SELECT * FROM portfolios WHERE id = ? AND clerk_id = ?',
    [portfolioId, clerkId]
  );
  if (!portfolio) return fail(res, ERRORS.NOT_FOUND, 'Portfolio not found for this user');

  const [[user]] = await pool.query('SELECT tier FROM user_profiles WHERE clerk_id = ?', [clerkId]);
  const limits   = TIER_CONFIG[user?.tier || 'basic'];

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM positions WHERE portfolio_id = ?', [portfolioId]);
    await conn.query('UPDATE portfolios SET cash_balance = ? WHERE id = ?', [limits.startingCash, portfolioId]);
    await conn.commit();
  } catch (e) {
    await conn.rollback(); throw e;
  } finally {
    conn.release();
  }

  await auditLog(req.userId, 'portfolio_reset', clerkId, { portfolioId, restoredCash: limits.startingCash });
  return success(res, { ok: true, restoredCash: limits.startingCash });
}));

// ── GET /admin/tickets ────────────────────────────────────────────────────────

router.get('/tickets', guard(async (req, res) => {
  const { status } = req.query;
  const page   = Math.max(1, parseInt(req.query.page) || 1);
  const limit  = Math.min(100, parseInt(req.query.limit) || 25);

  let sql      = 'SELECT t.*, u.display_name FROM support_tickets t LEFT JOIN user_profiles u ON t.clerk_id = u.clerk_id WHERE 1=1';
  const params = [];

  if (status && ['open', 'in_progress', 'resolved'].includes(status)) {
    sql += ' AND t.status = ?'; params.push(status);
  }
  sql += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, (page - 1) * limit);

  const [tickets] = await pool.query(sql, params);
  return success(res, { tickets, page, limit });
}));

// ── GET /admin/tickets/:id ────────────────────────────────────────────────────

router.get('/tickets/:id', guard(async (req, res) => {
  const ticketId = parseInt(req.params.id);
  const [[ticket]] = await pool.query(
    `SELECT t.*, u.display_name, u.tier FROM support_tickets t
     LEFT JOIN user_profiles u ON t.clerk_id = u.clerk_id WHERE t.id = ?`,
    [ticketId]
  );
  if (!ticket) return fail(res, ERRORS.NOT_FOUND, 'Ticket not found');

  const [notes] = await pool.query(
    `SELECT n.*, u.display_name as admin_name FROM ticket_notes n
     LEFT JOIN user_profiles u ON n.admin_clerk_id = u.clerk_id
     WHERE n.ticket_id = ? ORDER BY n.created_at ASC`,
    [ticketId]
  );
  return success(res, { ...ticket, notes });
}));

// ── PUT /admin/tickets/:id ────────────────────────────────────────────────────

router.put('/tickets/:id', guard(async (req, res) => {
  const ticketId  = parseInt(req.params.id);
  const { status, note } = req.body;

  if (status && !['open', 'in_progress', 'resolved'].includes(status))
    return fail(res, ERRORS.INVALID_VALUE, 'Invalid status');

  const [[ticket]] = await pool.query('SELECT id FROM support_tickets WHERE id = ?', [ticketId]);
  if (!ticket) return fail(res, ERRORS.NOT_FOUND, 'Ticket not found');

  if (status) await pool.query('UPDATE support_tickets SET status = ? WHERE id = ?', [status, ticketId]);
  if (note && typeof note === 'string' && note.trim().length > 0) {
    await pool.query(
      'INSERT INTO ticket_notes (ticket_id, admin_clerk_id, note) VALUES (?, ?, ?)',
      [ticketId, req.userId, note.trim()]
    );
  }

  await auditLog(req.userId, 'ticket_update', null, { ticketId, status: status || null });
  return success(res, { ok: true });
}));

// ── POST /admin/billing/refund ────────────────────────────────────────────────

router.post('/billing/refund', guard(async (req, res) => {
  const { charge_id, reason } = req.body;
  if (!charge_id || typeof charge_id !== 'string')
    return fail(res, ERRORS.MISSING_FIELD, 'charge_id is required');
  if (!process.env.STRIPE_SECRET_KEY)
    return fail(res, ERRORS.SERVICE_UNAVAILABLE, 'Billing not configured');

  const stripe = getStripe();
  const refund = await stripe.refunds.create({
    charge: charge_id,
    reason: reason || 'requested_by_customer',
  });
  await auditLog(req.userId, 'stripe_refund', null, { charge_id, refundId: refund.id, amount: refund.amount });
  return success(res, { ok: true, refundId: refund.id });
}));

// ── POST /admin/billing/cancel/:clerkId ──────────────────────────────────────

router.post('/billing/cancel/:clerkId', guard(async (req, res) => {
  const { clerkId } = req.params;
  if (!process.env.STRIPE_SECRET_KEY)
    return fail(res, ERRORS.SERVICE_UNAVAILABLE, 'Billing not configured');

  const [[user]] = await pool.query(
    'SELECT stripe_subscription_id FROM user_profiles WHERE clerk_id = ?',
    [clerkId]
  );
  if (!user?.stripe_subscription_id)
    return fail(res, ERRORS.NOT_FOUND, 'No active subscription found for this user');

  await getStripe().subscriptions.cancel(user.stripe_subscription_id);
  await pool.query(
    "UPDATE user_profiles SET tier = 'basic', stripe_subscription_id = NULL, updated_at = NOW() WHERE clerk_id = ?",
    [clerkId]
  );
  await auditLog(req.userId, 'subscription_cancel', clerkId, { subscriptionId: user.stripe_subscription_id });
  return success(res, { ok: true });
}));

// ── GET /admin/audit-log ──────────────────────────────────────────────────────

router.get('/audit-log', guard(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 25);
  const [rows] = await pool.query(
    `SELECT l.*, u.display_name as admin_name
     FROM admin_audit_log l
     LEFT JOIN user_profiles u ON l.admin_clerk_id = u.clerk_id
     ORDER BY l.created_at DESC LIMIT ? OFFSET ?`,
    [limit, (page - 1) * limit]
  );
  return success(res, { entries: rows, page, limit });
}));

// ── GET /admin/community-reports ─────────────────────────────────────────────

router.get('/community-reports', guard(async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page) || 1);
  const limit  = 50;
  const offset = (page - 1) * limit;

  const [rows] = await pool.query(
    `SELECT cr.id, cr.post_id, cr.reporter_clerk_id, cr.reason, cr.created_at,
            cp.title AS post_title, cp.is_removed,
            c.id AS community_id, c.slug AS community_slug, c.display_name AS community_name,
            COALESCE(rp.display_name, cr.reporter_clerk_id) AS reporter_name
     FROM community_reports cr
     JOIN community_posts cp ON cp.id = cr.post_id
     JOIN communities c ON c.id = cp.community_id
     LEFT JOIN user_profiles rp ON rp.clerk_id = cr.reporter_clerk_id
     ORDER BY cr.created_at DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM community_reports cr
     JOIN community_posts cp ON cp.id = cr.post_id WHERE cp.community_id IS NOT NULL`
  );
  return success(res, { reports: rows, total, pages: Math.ceil(total / limit) });
}));

// ── GET /admin/communities ────────────────────────────────────────────────────

router.get('/communities', guard(async (req, res) => {
  const q      = req.query.q?.trim() || '';
  const page   = Math.max(1, parseInt(req.query.page) || 1);
  const limit  = Math.min(100, parseInt(req.query.limit) || 50);
  const offset = (page - 1) * limit;

  const where  = q ? 'WHERE c.slug LIKE ? OR c.display_name LIKE ?' : '';
  const params = q ? [`%${q}%`, `%${q}%`] : [];
  const [rows] = await pool.query(
    `SELECT c.id, c.slug, c.display_name, c.icon_url, c.member_count, c.post_count,
            c.owner_clerk_id, c.created_at, c.verification_type, COUNT(cr.id) AS open_reports
     FROM communities c
     LEFT JOIN community_posts cp ON cp.community_id = c.id AND cp.is_removed = 0
     LEFT JOIN community_reports cr ON cr.post_id = cp.id
     ${where}
     GROUP BY c.id ORDER BY open_reports DESC, c.member_count DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM communities c ${where}`, params);
  return success(res, { communities: rows, total, page, pages: Math.ceil(total / limit) });
}));

// ── PUT /admin/communities/:slug/verification ─────────────────────────────────

router.put('/communities/:slug/verification', guard(async (req, res) => {
  const { slug }             = req.params;
  const { verification_type } = req.body;
  if (!['none', 'verified', 'official'].includes(verification_type))
    return fail(res, ERRORS.INVALID_VALUE, 'verification_type must be none, verified, or official');

  const [[c]] = await pool.query('SELECT id FROM communities WHERE slug = ?', [slug]);
  if (!c) return fail(res, ERRORS.NOT_FOUND, 'Community not found');

  await pool.query('UPDATE communities SET verification_type = ? WHERE slug = ?', [verification_type, slug]);
  await auditLog(req.userId, 'set_community_verification', null, { slug, verification_type });
  return success(res, { ok: true });
}));

// ── DELETE /admin/communities/:slug ───────────────────────────────────────────

router.delete('/communities/:slug', guard(async (req, res) => {
  const { slug } = req.params;
  const [[c]]    = await pool.query('SELECT id, display_name FROM communities WHERE slug = ?', [slug]);
  if (!c) return fail(res, ERRORS.NOT_FOUND, 'Community not found');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM community_bans              WHERE community_id = ?', [c.id]);
    await conn.query('DELETE FROM community_memberships       WHERE community_id = ?', [c.id]);
    await conn.query('DELETE FROM community_rules             WHERE community_id = ?', [c.id]);
    await conn.query('DELETE FROM community_mod_log           WHERE community_id = ?', [c.id]);
    await conn.query('DELETE FROM community_community_reports WHERE community_id = ?', [c.id]);
    await conn.query('UPDATE community_posts SET community_id = NULL WHERE community_id = ?', [c.id]);
    await conn.query('DELETE FROM communities WHERE id = ?', [c.id]);
    await conn.commit();
    await auditLog(req.userId, 'delete_community', null, { slug, display_name: c.display_name });
    return success(res, { ok: true });
  } catch (err) {
    await conn.rollback(); throw err;
  } finally {
    conn.release();
  }
}));

// ── POST /admin/community-posts/:postId/remove ────────────────────────────────

router.post('/community-posts/:postId/remove', guard(async (req, res) => {
  const postId = parseInt(req.params.postId);
  await pool.query('UPDATE community_posts SET is_removed = 1 WHERE id = ?', [postId]);
  await auditLog(req.userId, 'admin_remove_community_post', null, { postId });
  return success(res, { ok: true });
}));

export default router;
