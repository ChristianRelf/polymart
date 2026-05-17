import { Router } from 'express';
import { getAuth } from '@clerk/express';
import pool from './db.js';

const router = Router();

// ── Rate limit for ticket submission (3/hour per user) ────────────────────────
const ticketRateMap = new Map();
function ticketRateLimit(req, res, next) {
  const { userId } = getAuth(req);
  if (!userId) return next();
  const now = Date.now();
  const entry = ticketRateMap.get(userId);
  if (!entry || now - entry.resetAt > 3_600_000) {
    ticketRateMap.set(userId, { count: 1, resetAt: now });
    return next();
  }
  if (entry.count >= 3) {
    return res.status(429).json({ error: 'You can submit a maximum of 3 support tickets per hour.' });
  }
  entry.count++;
  next();
}

// ── All routes require authentication ─────────────────────────────────────────
router.use((req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });
  next();
});

// ── POST /support/ticket ──────────────────────────────────────────────────────
// Email address is taken from the verified Clerk user profile, never from the body.
router.post('/ticket', ticketRateLimit, async (req, res) => {
  const { userId } = getAuth(req);
  const { subject, message } = req.body;

  if (!subject || typeof subject !== 'string' || subject.trim().length === 0 || subject.length > 256) {
    return res.status(400).json({ error: 'subject is required and must be under 256 characters' });
  }
  if (!message || typeof message !== 'string' || message.trim().length === 0 || message.length > 5000) {
    return res.status(400).json({ error: 'message is required and must be under 5000 characters' });
  }

  try {
    const [[user]] = await pool.query(
      'SELECT email, display_name FROM user_profiles WHERE clerk_id = ?',
      [userId]
    );
    if (!user) return res.status(404).json({ error: 'User profile not found' });

    const [result] = await pool.query(
      'INSERT INTO support_tickets (clerk_id, email, subject, message) VALUES (?, ?, ?, ?)',
      [userId, user.email || '', subject.trim(), message.trim()]
    );

    // Send email notification if Resend is configured
    const resendKey = process.env.RESEND_API_KEY;
    const supportEmail = process.env.SUPPORT_EMAIL;
    if (resendKey && supportEmail) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: 'Polymart Support <noreply@polymart.app>',
          to: supportEmail,
          subject: `[Support #${result.insertId}] ${subject.trim()}`,
          text: [
            `From: ${user.display_name || 'Unknown'} <${user.email || 'no-email'}>`,
            `User ID: ${userId}`,
            `Ticket ID: ${result.insertId}`,
            '',
            message.trim(),
          ].join('\n'),
        });
      } catch (emailErr) {
        // Don't fail the request if email send fails - ticket is already stored
        console.error('[support-api] Email send failed:', emailErr.message);
      }
    }

    res.status(201).json({ success: true, ticketId: result.insertId });
  } catch (err) {
    console.error('[support-api] POST /ticket:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /support/tickets (own tickets only) ───────────────────────────────────
router.get('/tickets', async (req, res) => {
  const { userId } = getAuth(req);
  try {
    const [tickets] = await pool.query(
      'SELECT id, subject, status, created_at FROM support_tickets WHERE clerk_id = ? ORDER BY created_at DESC LIMIT 20',
      [userId]
    );
    res.json(tickets);
  } catch (err) {
    console.error('[support-api] GET /tickets:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
