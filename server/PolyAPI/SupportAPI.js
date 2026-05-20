/**
 * PolyAPI · SupportAPI
 *
 * Support ticket submission and retrieval routes.
 * All routes require authentication. Rate-limited to 3 tickets/hour.
 *
 * Mount point: /api/v1/support
 */

import { dbUser as pool } from '../db.js';
import { createRouter } from './Router.js';
import { requireAuth, rateLimit } from './Middleware.js';
import { success, fail, guard, ERRORS } from './Protocol.js';
import { schema, v } from './Validator.js';

// ── Router ────────────────────────────────────────────────────────────────────

const router = createRouter({ label: '[support-api]' });

router.use(requireAuth());

// ── POST /support/ticket ──────────────────────────────────────────────────────

const ticketSchema = schema({
  subject: v.string({ min: 1, max: 256, required: true }),
  message: v.string({ min: 1, max: 5000, required: true }),
});

router.post('/ticket',
  rateLimit({ windowMs: 3_600_000, max: 3, label: 'support-ticket' }),
  guard(async (req, res) => {
    const err = ticketSchema.first(req.body);
    if (err) return fail(res, ERRORS.VALIDATION_ERROR, err);

    const { subject, message } = req.body;
    const [[user]] = await pool.query(
      'SELECT email, display_name FROM user_profiles WHERE clerk_id = ?',
      [req.userId]
    );
    if (!user) return fail(res, ERRORS.NOT_FOUND, 'User profile not found');

    const [result] = await pool.query(
      'INSERT INTO support_tickets (clerk_id, email, subject, message) VALUES (?, ?, ?, ?)',
      [req.userId, user.email || '', subject.trim(), message.trim()]
    );

    // Fire-and-forget email notification
    const resendKey    = process.env.RESEND_API_KEY;
    const supportEmail = process.env.SUPPORT_EMAIL;
    if (resendKey && supportEmail) {
      import('resend').then(({ Resend }) => {
        new Resend(resendKey).emails.send({
          from:    'Polymart Support <noreply@polymart.app>',
          to:      supportEmail,
          subject: `[Support #${result.insertId}] ${subject.trim()}`,
          text:    [
            `From: ${(user.display_name || 'Unknown').replace(/[\r\n]/g, ' ')} <${user.email || 'no-email'}>`,
            `User ID: ${req.userId}`,
            `Ticket ID: ${result.insertId}`,
            '',
            message.trim(),
          ].join('\n'),
        });
      }).catch(e => console.error('[support-api] Email send failed:', e.message));
    }

    return success(res, { ok: true, ticketId: result.insertId }, undefined, 201);
  })
);

// ── GET /support/tickets ──────────────────────────────────────────────────────

router.get('/tickets', guard(async (req, res) => {
  const [tickets] = await pool.query(
    'SELECT id, subject, status, created_at FROM support_tickets WHERE clerk_id = ? ORDER BY created_at DESC LIMIT 20',
    [req.userId]
  );
  return success(res, tickets);
}));

export default router;
