import { Router } from 'express';
import Stripe from 'stripe';
import { getAuth } from '@clerk/express';
import pool from './db.js';
import TIER_CONFIG from './tier-config.js';

const router = Router();
let _stripe = null;
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

// ── Rate limit for checkout endpoint (5/min per user) ─────────────────────────
const checkoutRateMap = new Map();
function checkoutRateLimit(req, res, next) {
  const { userId } = getAuth(req);
  if (!userId) return next();
  const now = Date.now();
  const entry = checkoutRateMap.get(userId);
  if (!entry || now - entry.resetAt > 60_000) {
    checkoutRateMap.set(userId, { count: 1, resetAt: now });
    return next();
  }
  if (entry.count >= 5) {
    return res.status(429).json({ error: 'Too many checkout requests. Please wait a minute.' });
  }
  entry.count++;
  next();
}

// ── Stripe webhook handler (exported and mounted separately in server.js) ─────
// Requires express.raw() body parser - must be mounted BEFORE express.json().
export async function stripeWebhookHandler(req, res) {
  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return res.status(400).json({ error: 'Webhook not configured' });

  let event;
  try {
    const stripe = getStripe();
    if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.error('[billing-api] Stripe webhook signature invalid:', err.message);
    return res.status(400).json({ error: 'Invalid Stripe webhook signature' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const clerkId = session.metadata?.clerk_id;
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        if (clerkId && customerId) {
          await pool.query(
            `UPDATE user_profiles
             SET tier = 'premium', stripe_customer_id = ?, stripe_subscription_id = ?, tier_expires_at = NULL, updated_at = NOW()
             WHERE clerk_id = ?`,
            [customerId, subscriptionId || null, clerkId]
          );
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const tier = sub.status === 'active' ? 'premium' : 'basic';
        await pool.query(
          `UPDATE user_profiles
           SET tier = ?, updated_at = NOW()
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
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

// ── All routes below require authentication ───────────────────────────────────
router.use((req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });
  next();
});

// ── GET /billing ──────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { userId } = getAuth(req);
  try {
    const [[user]] = await pool.query(
      'SELECT tier, stripe_customer_id, stripe_subscription_id, tier_expires_at FROM user_profiles WHERE clerk_id = ?',
      [userId]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    let portalUrl = null;
    const stripe = getStripe();
    if (user.stripe_customer_id && stripe) {
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripe_customer_id,
        return_url: `${process.env.APP_URL || 'http://localhost:5173'}/#/account`,
      });
      portalUrl = session.url;
    }

    const tierLimits = TIER_CONFIG[user.tier] || TIER_CONFIG.basic;
    res.json({ tier: user.tier, tierLimits, portalUrl, tier_expires_at: user.tier_expires_at });
  } catch (err) {
    console.error('[billing-api] GET /billing:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /billing/checkout ────────────────────────────────────────────────────
router.post('/checkout', checkoutRateLimit, async (req, res) => {
  const { userId } = getAuth(req);
  try {
    const [[user]] = await pool.query(
      'SELECT email, tier, stripe_customer_id FROM user_profiles WHERE clerk_id = ?',
      [userId]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.tier === 'premium') return res.status(400).json({ error: 'Already on Premium plan' });

    const priceId = process.env.STRIPE_PREMIUM_PRICE_ID;
    if (!priceId || !process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({ error: 'Billing not configured' });
    }

    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const sessionParams = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/#/dashboard?upgraded=1`,
      cancel_url: `${appUrl}/#/account`,
      metadata: { clerk_id: userId },
    };
    if (user.stripe_customer_id) {
      sessionParams.customer = user.stripe_customer_id;
    } else if (user.email) {
      sessionParams.customer_email = user.email;
    }

    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ error: 'Billing not configured' });
    const session = await stripe.checkout.sessions.create(sessionParams);
    res.json({ url: session.url });
  } catch (err) {
    console.error('[billing-api] POST /billing/checkout:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
