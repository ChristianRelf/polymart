/**
 * PolyAPI · Middleware
 *
 * Composable Express middleware factories used by every PolyAPI router:
 *
 *   requireAuth()           - Clerk JWT check; attaches req.userId
 *   requireAdmin()          - Auth + admin role check via Clerk publicMetadata
 *   rateLimit(opts)         - Sliding-window per-user (or per-IP) rate limiter
 *   requestLogger(label)    - Prefixed console log with method, path, status, ms
 *   corsHeaders(origins)    - Fine-grained CORS with per-origin allow list
 *
 * All middleware call next()/respond consistently through Protocol helpers so
 * error shapes are always { ok: false, error: { code, message } }.
 */

import { getAuth, clerkClient } from '@clerk/express';
import { fail, ERRORS, HTTP } from './Protocol.js';

// ── requireAuth ───────────────────────────────────────────────────────────────

/**
 * Require a valid Clerk session. Attaches `req.userId` on success.
 * Returns 401 with UNAUTHENTICATED if the session is missing or invalid.
 */
export function requireAuth() {
  return (req, res, next) => {
    const { userId } = getAuth(req);
    if (!userId) return fail(res, ERRORS.UNAUTHENTICATED, 'Authentication required');
    req.userId = userId;
    next();
  };
}

// ── requireAdmin ──────────────────────────────────────────────────────────────

/**
 * Require auth AND admin role (publicMetadata.role === 'admin').
 * Fetches the Clerk user once per request - result is cached on req.clerkUser.
 */
export function requireAdmin() {
  return [
    requireAuth(),
    async (req, res, next) => {
      try {
        const user = await clerkClient.users.getUser(req.userId);
        req.clerkUser = user;
        if (user.publicMetadata?.role !== 'admin') {
          return fail(res, ERRORS.ADMIN_ONLY, 'Admin access required');
        }
        next();
      } catch (err) {
        console.error('[PolyAPI:requireAdmin] Clerk lookup failed:', err.message);
        fail(res, ERRORS.INTERNAL, 'Could not verify admin status');
      }
    },
  ];
}

// ── rateLimit ─────────────────────────────────────────────────────────────────

/**
 * Sliding-window in-memory rate limiter.
 *
 * @param {object} opts
 * @param {number}  opts.windowMs      Window size in ms (default 60_000)
 * @param {number}  opts.max           Max requests per window (default 60)
 * @param {number} [opts.cost]         Request cost (default 1). Set higher for heavy routes.
 * @param {'user'|'ip'} [opts.keyBy]   Key on userId (requires auth) or IP (default 'user')
 * @param {string} [opts.label]        Log prefix (default 'rateLimit')
 */
export function rateLimit({
  windowMs = 60_000,
  max      = 60,
  cost     = 1,
  keyBy    = 'user',
  label    = 'rateLimit',
} = {}) {
  /** @type {Map<string, { tokens: number; windowStart: number }>} */
  const store = new Map();

  // Periodic cleanup - evict stale entries every 10 minutes
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store) {
      if (now - v.windowStart > windowMs * 2) store.delete(k);
    }
  }, 10 * 60 * 1000);
  cleanup.unref?.(); // don't block process exit

  return (req, res, next) => {
    const key = keyBy === 'ip'
      ? (req.ip || req.headers['x-forwarded-for'] || 'unknown')
      : (req.userId || req.ip || 'anon');

    const now = Date.now();
    let entry = store.get(key);

    if (!entry || now - entry.windowStart > windowMs) {
      entry = { tokens: max, windowStart: now };
    }

    if (entry.tokens < cost) {
      const retryAfter = Math.ceil((entry.windowStart + windowMs - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return fail(res, ERRORS.RATE_LIMITED,
        `Rate limit exceeded. Retry in ${retryAfter}s`, HTTP.TOO_MANY_REQUESTS);
    }

    entry.tokens -= cost;
    store.set(key, entry);
    next();
  };
}

// ── requestLogger ─────────────────────────────────────────────────────────────

/**
 * Lightweight request logger. Logs on response finish.
 * @param {string} label  Prefix for the log line, e.g. '[billing-api]'
 */
export function requestLogger(label) {
  return (req, res, next) => {
    const t0 = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - t0;
      const uid = req.userId ? ` uid=${req.userId}` : '';
      console.log(`${label} ${req.method} ${req.path} → ${res.statusCode} (${ms}ms)${uid}`);
    });
    next();
  };
}

// ── corsHeaders ───────────────────────────────────────────────────────────────

/**
 * Fine-grained CORS. Allows requests from listed origins; blocks others.
 * Handles pre-flight OPTIONS automatically.
 *
 * @param {string[]} allowedOrigins  List of allowed origins (exact match)
 */
export function corsHeaders(allowedOrigins) {
  const set = new Set(allowedOrigins);

  return (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && set.has(origin)) {
      res.set('Access-Control-Allow-Origin',  origin);
      res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.set('Access-Control-Allow-Credentials', 'true');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(HTTP.NO_CONTENT);
    next();
  };
}

// ── notFound ──────────────────────────────────────────────────────────────────

/**
 * 404 handler - attach at the end of a router to catch unmatched routes.
 */
export function notFound() {
  return (req, res) => {
    fail(res, ERRORS.NOT_FOUND, `Route not found: ${req.method} ${req.path}`, HTTP.NOT_FOUND);
  };
}

// ── errorBoundary ─────────────────────────────────────────────────────────────

/**
 * Express error-handler middleware - catches anything passed to next(err).
 * Attach as app.use(errorBoundary()) after all routes.
 * @param {string} [label]
 */
export function errorBoundary(label = '[PolyAPI]') {
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, _next) => {
    console.error(`${label} Unhandled error:`, err);
    if (!res.headersSent) {
      fail(res, ERRORS.INTERNAL, 'An unexpected server error occurred');
    }
  };
}
