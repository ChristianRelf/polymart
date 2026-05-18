import { Router } from 'express';
import Stripe from 'stripe';
import { getAuth, clerkClient } from '@clerk/express';
import pool from './db.js';
import TIER_CONFIG from './tier-config.js';

const router = Router();
let _stripe = null;
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

// ── Admin auth middleware ──────────────────────────────────────────────────────
// publicMetadata is not in the JWT by default - fetch it from Clerk's API directly.
// To grant admin: set publicMetadata = { role: 'admin' } in the Clerk dashboard.
async function requireAdmin(req, res, next) {
  const { userId } = getAuth(req);
  try {
    const user = await clerkClient.users.getUser(userId);
    if (user.publicMetadata?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  } catch {
    return res.status(403).json({ error: 'Forbidden' });
  }
}

// ── Audit logger ──────────────────────────────────────────────────────────────
async function auditLog(adminClerkId, action, targetClerkId = null, details = null) {
  await pool.query(
    'INSERT INTO admin_audit_log (admin_clerk_id, action, target_clerk_id, details) VALUES (?,?,?,?)',
    [adminClerkId, action, targetClerkId, details ? JSON.stringify(details) : null]
  );
}

// All admin routes require valid Clerk JWT + admin role
router.use((req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });
  next();
}, requireAdmin);

// ── GET /admin/users ──────────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 25);
  const { search, tier } = req.query;

  try {
    let sql = 'SELECT clerk_id, display_name, email, tier, created_at, stripe_subscription_id FROM user_profiles WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (display_name LIKE ? OR email LIKE ?)';
      const q = `%${search}%`;
      params.push(q, q);
    }
    if (tier && (tier === 'basic' || tier === 'premium')) {
      sql += ' AND tier = ?';
      params.push(tier);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    const [users] = await pool.query(sql, params);
    res.json({ users, page, limit });
  } catch (err) {
    console.error('[admin-api] GET /users:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /admin/users/:clerkId ─────────────────────────────────────────────────
router.get('/users/:clerkId', async (req, res) => {
  const { clerkId } = req.params;
  try {
    const [[user]] = await pool.query(
      'SELECT * FROM user_profiles WHERE clerk_id = ?',
      [clerkId]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [portfolios] = await pool.query(
      'SELECT id, name, cash_balance, created_at FROM portfolios WHERE clerk_id = ?',
      [clerkId]
    );
    const [tickets] = await pool.query(
      'SELECT id, subject, status, created_at FROM support_tickets WHERE clerk_id = ? ORDER BY created_at DESC LIMIT 10',
      [clerkId]
    );
    const tierLimits = TIER_CONFIG[user.tier] || TIER_CONFIG.basic;

    res.json({ ...user, tierLimits, portfolios, tickets });
  } catch (err) {
    console.error('[admin-api] GET /users/:clerkId:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /admin/users/:clerkId/tier ────────────────────────────────────────────
router.put('/users/:clerkId/tier', async (req, res) => {
  const { userId: adminId } = getAuth(req);
  const { clerkId } = req.params;
  const { tier, expires_at } = req.body;

  if (!['basic', 'premium'].includes(tier)) {
    return res.status(400).json({ error: 'tier must be "basic" or "premium"' });
  }

  try {
    const [[user]] = await pool.query('SELECT clerk_id FROM user_profiles WHERE clerk_id = ?', [clerkId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await pool.query(
      'UPDATE user_profiles SET tier = ?, tier_expires_at = ?, updated_at = NOW() WHERE clerk_id = ?',
      [tier, expires_at || null, clerkId]
    );

    await auditLog(adminId, 'tier_override', clerkId, { tier, expires_at: expires_at || null });
    res.json({ success: true });
  } catch (err) {
    console.error('[admin-api] PUT /users/:clerkId/tier:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /admin/users/:clerkId/reset-portfolio/:portfolioId ───────────────────
router.post('/users/:clerkId/reset-portfolio/:portfolioId', async (req, res) => {
  const { userId: adminId } = getAuth(req);
  const { clerkId, portfolioId } = req.params;

  try {
    const [[portfolio]] = await pool.query(
      'SELECT * FROM portfolios WHERE id = ? AND clerk_id = ?',
      [portfolioId, clerkId]
    );
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found for this user' });

    const [[user]] = await pool.query('SELECT tier FROM user_profiles WHERE clerk_id = ?', [clerkId]);
    const limits = TIER_CONFIG[user?.tier || 'basic'];

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM positions WHERE portfolio_id = ?', [portfolioId]);
      await conn.query(
        'UPDATE portfolios SET cash_balance = ? WHERE id = ?',
        [limits.startingCash, portfolioId]
      );
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    await auditLog(adminId, 'portfolio_reset', clerkId, { portfolioId, restoredCash: limits.startingCash });
    res.json({ success: true, restoredCash: limits.startingCash });
  } catch (err) {
    console.error('[admin-api] POST reset-portfolio:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /admin/tickets ────────────────────────────────────────────────────────
router.get('/tickets', async (req, res) => {
  const { status } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 25);

  try {
    let sql = 'SELECT t.*, u.display_name FROM support_tickets t LEFT JOIN user_profiles u ON t.clerk_id = u.clerk_id WHERE 1=1';
    const params = [];

    if (status && ['open', 'in_progress', 'resolved'].includes(status)) {
      sql += ' AND t.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    const [tickets] = await pool.query(sql, params);
    res.json({ tickets, page, limit });
  } catch (err) {
    console.error('[admin-api] GET /tickets:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /admin/tickets/:id ────────────────────────────────────────────────────
router.get('/tickets/:id', async (req, res) => {
  const ticketId = parseInt(req.params.id);
  try {
    const [[ticket]] = await pool.query(
      'SELECT t.*, u.display_name, u.tier FROM support_tickets t LEFT JOIN user_profiles u ON t.clerk_id = u.clerk_id WHERE t.id = ?',
      [ticketId]
    );
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const [notes] = await pool.query(
      'SELECT n.*, u.display_name as admin_name FROM ticket_notes n LEFT JOIN user_profiles u ON n.admin_clerk_id = u.clerk_id WHERE n.ticket_id = ? ORDER BY n.created_at ASC',
      [ticketId]
    );

    res.json({ ...ticket, notes });
  } catch (err) {
    console.error('[admin-api] GET /tickets/:id:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /admin/tickets/:id ────────────────────────────────────────────────────
router.put('/tickets/:id', async (req, res) => {
  const { userId: adminId } = getAuth(req);
  const ticketId = parseInt(req.params.id);
  const { status, note } = req.body;

  if (status && !['open', 'in_progress', 'resolved'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const [[ticket]] = await pool.query('SELECT id FROM support_tickets WHERE id = ?', [ticketId]);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    if (status) {
      await pool.query('UPDATE support_tickets SET status = ? WHERE id = ?', [status, ticketId]);
    }
    if (note && typeof note === 'string' && note.trim().length > 0) {
      await pool.query(
        'INSERT INTO ticket_notes (ticket_id, admin_clerk_id, note) VALUES (?, ?, ?)',
        [ticketId, adminId, note.trim()]
      );
    }

    await auditLog(adminId, 'ticket_update', null, { ticketId, status: status || null });
    res.json({ success: true });
  } catch (err) {
    console.error('[admin-api] PUT /tickets/:id:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /admin/billing/refund ────────────────────────────────────────────────
router.post('/billing/refund', async (req, res) => {
  const { userId: adminId } = getAuth(req);
  const { charge_id, reason } = req.body;

  if (!charge_id || typeof charge_id !== 'string') {
    return res.status(400).json({ error: 'charge_id is required' });
  }
  if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: 'Billing not configured' });

  try {
    const refund = await getStripe().refunds.create({
      charge: charge_id,
      reason: reason || 'requested_by_customer',
    });
    await auditLog(adminId, 'stripe_refund', null, { charge_id, refundId: refund.id, amount: refund.amount });
    res.json({ success: true, refundId: refund.id });
  } catch (err) {
    console.error('[admin-api] POST /billing/refund:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /admin/billing/cancel/:clerkId ──────────────────────────────────────
router.post('/billing/cancel/:clerkId', async (req, res) => {
  const { userId: adminId } = getAuth(req);
  const { clerkId } = req.params;

  if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: 'Billing not configured' });

  try {
    const [[user]] = await pool.query(
      'SELECT stripe_subscription_id FROM user_profiles WHERE clerk_id = ?',
      [clerkId]
    );
    if (!user?.stripe_subscription_id) {
      return res.status(404).json({ error: 'No active subscription found for this user' });
    }

    await getStripe().subscriptions.cancel(user.stripe_subscription_id);
    await pool.query(
      "UPDATE user_profiles SET tier = 'basic', stripe_subscription_id = NULL, updated_at = NOW() WHERE clerk_id = ?",
      [clerkId]
    );
    await auditLog(adminId, 'subscription_cancel', clerkId, { subscriptionId: user.stripe_subscription_id });
    res.json({ success: true });
  } catch (err) {
    console.error('[admin-api] POST /billing/cancel:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /admin/audit-log ──────────────────────────────────────────────────────
router.get('/audit-log', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 25);
  try {
    const [rows] = await pool.query(
      `SELECT l.*, u.display_name as admin_name
       FROM admin_audit_log l
       LEFT JOIN user_profiles u ON l.admin_clerk_id = u.clerk_id
       ORDER BY l.created_at DESC LIMIT ? OFFSET ?`,
      [limit, (page - 1) * limit]
    );
    res.json({ entries: rows, page, limit });
  } catch (err) {
    console.error('[admin-api] GET /audit-log:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /admin/community-reports ─────────────────────────────────────────────
router.get('/community-reports', async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page) || 1);
  const limit  = 50;
  const offset = (page - 1) * limit;
  try {
    const [rows] = await pool.query(
      `SELECT cr.id, cr.post_id, cr.reporter_clerk_id, cr.reason, cr.created_at,
              cp.title AS post_title, cp.is_removed,
              c.id AS community_id, c.slug AS community_slug, c.display_name AS community_name,
              COALESCE(rp.display_name, cr.reporter_clerk_id) AS reporter_name
       FROM community_reports cr
       JOIN community_posts cp ON cp.id = cr.post_id
       JOIN communities c ON c.id = cp.community_id
       LEFT JOIN user_profiles rp ON rp.clerk_id = cr.reporter_clerk_id
       ORDER BY cr.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM community_reports cr
       JOIN community_posts cp ON cp.id = cr.post_id
       WHERE cp.community_id IS NOT NULL`
    );
    res.json({ reports: rows, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[admin-api] GET /community-reports:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /admin/communities ────────────────────────────────────────────────────
router.get('/communities', async (req, res) => {
  const q      = req.query.q?.trim() || '';
  const page   = Math.max(1, parseInt(req.query.page) || 1);
  const limit  = Math.min(100, parseInt(req.query.limit) || 50);
  const offset = (page - 1) * limit;
  try {
    const where  = q ? 'WHERE c.slug LIKE ? OR c.display_name LIKE ?' : '';
    const params = q ? [`%${q}%`, `%${q}%`] : [];
    const [rows] = await pool.query(
      `SELECT c.id, c.slug, c.display_name, c.icon_url,
              c.member_count, c.post_count, c.owner_clerk_id, c.created_at, c.verification_type,
              COUNT(cr.id) AS open_reports
       FROM communities c
       LEFT JOIN community_posts cp ON cp.community_id = c.id AND cp.is_removed = 0
       LEFT JOIN community_reports cr ON cr.post_id = cp.id
       ${where}
       GROUP BY c.id
       ORDER BY open_reports DESC, c.member_count DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM communities c ${where}`,
      params
    );
    res.json({ communities: rows, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[admin-api] GET /communities:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /admin/communities/:slug/verification ─────────────────────────────────
router.put('/communities/:slug/verification', async (req, res) => {
  const { slug } = req.params;
  const { verification_type } = req.body;
  const { userId } = getAuth(req);
  if (!['none', 'verified', 'official'].includes(verification_type)) {
    return res.status(400).json({ error: 'Invalid verification_type' });
  }
  try {
    const [[c]] = await pool.query('SELECT id FROM communities WHERE slug = ?', [slug]);
    if (!c) return res.status(404).json({ error: 'Community not found' });
    await pool.query('UPDATE communities SET verification_type = ? WHERE slug = ?', [verification_type, slug]);
    await auditLog(userId, 'set_community_verification', null, JSON.stringify({ slug, verification_type }));
    res.json({ ok: true });
  } catch (err) {
    console.error('[admin-api] PUT /communities/:slug/verification:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /admin/communities/:slug ──────────────────────────────────────────
router.delete('/communities/:slug', async (req, res) => {
  const { slug } = req.params;
  const { userId } = getAuth(req);
  const [[c]] = await pool.query('SELECT id, display_name FROM communities WHERE slug = ?', [slug]);
  if (!c) return res.status(404).json({ error: 'Community not found' });

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
    await auditLog(userId, 'delete_community', null, JSON.stringify({ slug, display_name: c.display_name }));
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    console.error('[admin-api] DELETE /communities/:slug:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
});

// ── POST /admin/community-posts/:postId/remove ────────────────────────────────
router.post('/community-posts/:postId/remove', async (req, res) => {
  const postId = parseInt(req.params.postId);
  const { userId } = getAuth(req);
  try {
    await pool.query('UPDATE community_posts SET is_removed = 1 WHERE id = ?', [postId]);
    await auditLog(userId, 'admin_remove_community_post', null, JSON.stringify({ postId }));
    res.json({ ok: true });
  } catch (err) {
    console.error('[admin-api] POST /community-posts/:postId/remove:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
