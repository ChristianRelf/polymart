/**
 * PolyAPI · BillingAPI
 *
 * Stripe billing routes: current billing info, checkout session, and webhooks.
 * All routes require authentication. The Stripe webhook handler is exported
 * separately (server.js mounts it before json() body parser).
 *
 * Mount point: /api/v1/billing
 */

import Stripe from 'stripe';
import { dbUser as pool } from '../db.js';
import TIER_CONFIG from '../tier-config.js';
import { createRouter } from './Router.js';
import { requireAuth, rateLimit } from './Middleware.js';
import { success, fail, guard, ERRORS, HTTP } from './Protocol.js';

// ── Stripe singleton ──────────────────────────────────────────────────────────

let _stripe = null;
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

// ── Stripe webhook handler ────────────────────────────────────────────────────
// Exported separately - server.js mounts this with express.raw() BEFORE json().

export async function stripeWebhookHandler(req, res) {
  const sig    = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return res.status(HTTP.BAD_REQUEST).json({ error: 'Webhook not configured' });

  let event;
  try {
    const stripe = getStripe();
    if (!stripe) return res.status(HTTP.INTERNAL).json({ error: 'Stripe not configured' });
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.error('[billing-api] Stripe webhook signature invalid:', err.message);
    return res.status(HTTP.BAD_REQUEST).json({ error: 'Invalid Stripe webhook signature' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session        = event.data.object;
        const clerkId        = session.metadata?.clerk_id;
        const customerId     = session.customer;
        const subscriptionId = session.subscription;
        if (clerkId && customerId) {
          await pool.query(
            `UPDATE user_profiles
             SET tier = 'premium', stripe_customer_id = ?, stripe_subscription_id = ?,
                 tier_expires_at = NULL, updated_at = NOW()
             WHERE clerk_id = ?`,
            [customerId, subscriptionId || null, clerkId]
          );
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub  = event.data.object;
        const tier = sub.status === 'active' ? 'premium' : 'basic';
        await pool.query(
          `UPDATE user_profiles SET tier = ?, updated_at = NOW()
           WHERE stripe_subscription_id = ? OR stripe_customer_id = ?`,
          [tier, sub.id, sub.customer]
        );
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await pool.query(
          `UPDATE user_profiles
           SET tier = 'basic', stripe_subscription_id = NULL, tier_expires_at = NULL, updated_at = NOW()
           WHERE stripe_subscription_id = ? OR stripe_customer_id = ?`,
          [sub.id, sub.customer]
        );
        break;
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('[billing-api] Stripe webhook handler error:', err.message);
    res.status(HTTP.INTERNAL).json({ error: 'Webhook handler failed' });
  }
}

// ── Router ────────────────────────────────────────────────────────────────────

const router = createRouter({ label: '[billing-api]' });

router.use(requireAuth());

// ── GET /billing ──────────────────────────────────────────────────────────────

router.get('/', guard(async (req, res) => {
  const [[user]] = await pool.query(
    'SELECT tier, stripe_customer_id, stripe_subscription_id, tier_expires_at FROM user_profiles WHERE clerk_id = ?',
    [req.userId]
  );
  if (!user) return fail(res, ERRORS.NOT_FOUND, 'User not found');

  let portalUrl = null;
  const stripe = getStripe();
  if (user.stripe_customer_id && stripe) {
    const session = await stripe.billingPortal.sessions.create({
      customer:   user.stripe_customer_id,
      return_url: `${process.env.APP_URL || 'http://localhost:5173'}/#/account`,
    });
    portalUrl = session.url;
  }

  const tierLimits = TIER_CONFIG[user.tier] || TIER_CONFIG.basic;
  return success(res, { tier: user.tier, tierLimits, portalUrl, tier_expires_at: user.tier_expires_at });
}));

// ── POST /billing/checkout ────────────────────────────────────────────────────

router.post('/checkout',
  rateLimit({ windowMs: 60_000, max: 5, label: 'checkout' }),
  guard(async (req, res) => {
    const [[user]] = await pool.query(
      'SELECT email, tier, stripe_customer_id FROM user_profiles WHERE clerk_id = ?',
      [req.userId]
    );
    if (!user) return fail(res, ERRORS.NOT_FOUND, 'User not found');
    if (user.tier === 'premium') return fail(res, ERRORS.CONFLICT, 'Already on Premium plan', HTTP.BAD_REQUEST);

    const priceId = process.env.STRIPE_PREMIUM_PRICE_ID;
    if (!priceId || !process.env.STRIPE_SECRET_KEY)
      return fail(res, ERRORS.SERVICE_UNAVAILABLE, 'Billing not configured');

    const appUrl       = process.env.APP_URL || 'http://localhost:5173';
    const sessionParams = {
      mode:        'subscription',
      line_items:  [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/#/dashboard?upgraded=1`,
      cancel_url:  `${appUrl}/#/account`,
      metadata:    { clerk_id: req.userId },
    };
    if (user.stripe_customer_id)  sessionParams.customer       = user.stripe_customer_id;
    else if (user.email)          sessionParams.customer_email = user.email;

    const stripe = getStripe();
    if (!stripe) return fail(res, ERRORS.SERVICE_UNAVAILABLE, 'Billing not configured');

    const session = await stripe.checkout.sessions.create(sessionParams);
    return success(res, { url: session.url });
  })
);

export default router;
