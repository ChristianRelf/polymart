import { Router } from 'express';
import Stripe from 'stripe';
import { requireAuth, getAuth } from '@clerk/express';
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
// Admin role is set server-side in Clerk publicMetadata — users cannot self-elevate.
// To grant admin: clerkClient.users.updateUserMetadata(userId, { publicMetadata: { role: 'admin' } })
function requireAdmin(req, res, next) {
  const { sessionClaims } = getAuth(req);
  const role = sessionClaims?.publicMetadata?.role;
  if (role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

// ── Audit logger ──────────────────────────────────────────────────────────────
async function auditLog(adminClerkId, action, targetClerkId = null, details = null) {
  await pool.query(
    'INSERT INTO admin_audit_log (admin_clerk_id, action, target_clerk_id, details) VALUES (?,?,?,?)',
    [adminClerkId, action, targetClerkId, details ? JSON.stringify(details) : null]
  );
}

// All admin routes require valid Clerk JWT + admin role
router.use(requireAuth(), requireAdmin);

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

export default router;
