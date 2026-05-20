/**
 * PolyAPI · Router
 *
 * Enhanced Express router factory that wires up standard PolyAPI middleware
 * automatically so individual API files only declare their routes.
 *
 * Usage:
 *   import { createRouter } from './PolyAPI/Router.js';
 *
 *   const router = createRouter({
 *     label:      '[billing-api]',
 *     rateLimit:  { windowMs: 60_000, max: 30 },
 *   });
 *
 *   router.get('/plans', guard(async (req, res) => { ... }));
 *   router.post('/subscribe', requireAuth(), guard(async (req, res) => { ... }));
 *
 *   export default router;
 *
 * The factory adds: requestLogger, optional CORS, and a 404 handler.
 * Auth and per-route rate-limiting are applied individually in the route file.
 */

import { Router } from 'express';
import { requestLogger, notFound } from './Middleware.js';

/**
 * @typedef {Object} RouterOptions
 * @property {string}   label           Log prefix, e.g. '[billing-api]'
 * @property {boolean} [logging=true]   Enable request logging (default true)
 * @property {boolean} [catch404=true]  Attach a 404 handler at the end (default true)
 */

/**
 * Create a pre-wired Express Router with PolyAPI defaults.
 *
 * @param {RouterOptions} opts
 * @returns {import('express').Router}
 */
export function createRouter({ label, logging = true, catch404 = true } = {}) {
  if (!label) throw new Error('createRouter: label is required');

  const router = Router();

  if (logging) {
    router.use(requestLogger(label));
  }

  if (catch404) {
    // Deferred — must be last; callers add their routes before export.
    // We use a trick: register a finaliser that attaches 404 after the module
    // finishes loading, on the next event loop tick.
    process.nextTick(() => {
      router.use(notFound());
    });
  }

  return router;
}
