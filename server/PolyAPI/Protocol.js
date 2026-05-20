/**
 * PolyAPI · Protocol
 *
 * Defines the standard request/response envelope, error code registry,
 * and HTTP status constants used by every PolyAPI route handler.
 *
 * All API responses flow through one of two shapes:
 *
 *   success(res, data, meta?)   → { ok: true,  data, meta?, ts }
 *   fail(res, code, message, status?) → { ok: false, error: { code, message }, ts }
 *
 * The `code` strings in fail() are always one of the ERRORS constants below,
 * so clients can branch on a stable string rather than parse message text.
 */

// ── HTTP status shorthands ────────────────────────────────────────────────────

export const HTTP = Object.freeze({
  OK:                  200,
  CREATED:             201,
  NO_CONTENT:          204,
  BAD_REQUEST:         400,
  UNAUTHORIZED:        401,
  FORBIDDEN:           403,
  NOT_FOUND:           404,
  CONFLICT:            409,
  UNPROCESSABLE:       422,
  TOO_MANY_REQUESTS:   429,
  INTERNAL:            500,
  SERVICE_UNAVAILABLE: 503,
});

// ── Error code registry ───────────────────────────────────────────────────────
// Stable string codes that clients can switch on.

export const ERRORS = Object.freeze({
  // Auth
  UNAUTHENTICATED:   'UNAUTHENTICATED',    // no valid Clerk session
  FORBIDDEN:         'FORBIDDEN',           // authenticated but lacks permission
  ADMIN_ONLY:        'ADMIN_ONLY',          // route requires admin role

  // Input
  VALIDATION_ERROR:  'VALIDATION_ERROR',    // field failed schema check
  MISSING_FIELD:     'MISSING_FIELD',       // required field absent
  INVALID_TYPE:      'INVALID_TYPE',        // wrong type for field
  INVALID_VALUE:     'INVALID_VALUE',       // value out of range or not in enum
  TOO_LONG:          'TOO_LONG',            // string exceeds max length
  TOO_SHORT:         'TOO_SHORT',           // string below min length

  // Resource
  NOT_FOUND:         'NOT_FOUND',           // requested resource does not exist
  CONFLICT:          'CONFLICT',            // duplicate / unique constraint
  GONE:              'GONE',               // resource existed but was deleted

  // Rate / quota
  RATE_LIMITED:      'RATE_LIMITED',        // sliding-window rate limit hit
  QUOTA_EXCEEDED:    'QUOTA_EXCEEDED',      // hard quota exceeded

  // Server
  INTERNAL:          'INTERNAL',            // unhandled server error
  DB_ERROR:          'DB_ERROR',            // database query failed
  UPSTREAM_ERROR:    'UPSTREAM_ERROR',      // external service (Stripe, Resend…) failed
  NOT_IMPLEMENTED:   'NOT_IMPLEMENTED',     // route stub not yet built
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE', // circuit breaker open
});

// ── Response envelope helpers ─────────────────────────────────────────────────

/**
 * Send a successful response.
 *
 * @param {import('express').Response} res
 * @param {unknown}  data     Payload — any serialisable value
 * @param {object}  [meta]   Optional metadata (pagination, counts, etc.)
 * @param {number}  [status] HTTP status (default 200)
 */
export function success(res, data, meta = undefined, status = HTTP.OK) {
  const body = { ok: true, data, ts: Date.now() };
  if (meta !== undefined) body.meta = meta;
  return res.status(status).json(body);
}

/**
 * Send a failure response.
 *
 * @param {import('express').Response} res
 * @param {string}  code     One of ERRORS.*
 * @param {string}  message  Human-readable explanation
 * @param {number} [status]  HTTP status (default derived from code)
 */
export function fail(res, code, message, status) {
  const httpStatus = status ?? statusForCode(code);
  return res.status(httpStatus).json({
    ok:    false,
    error: { code, message },
    ts:    Date.now(),
  });
}

/**
 * Map an error code to a sensible default HTTP status.
 * @param {string} code
 * @returns {number}
 */
export function statusForCode(code) {
  switch (code) {
    case ERRORS.UNAUTHENTICATED:    return HTTP.UNAUTHORIZED;
    case ERRORS.FORBIDDEN:
    case ERRORS.ADMIN_ONLY:         return HTTP.FORBIDDEN;
    case ERRORS.NOT_FOUND:
    case ERRORS.GONE:               return HTTP.NOT_FOUND;
    case ERRORS.CONFLICT:           return HTTP.CONFLICT;
    case ERRORS.VALIDATION_ERROR:
    case ERRORS.MISSING_FIELD:
    case ERRORS.INVALID_TYPE:
    case ERRORS.INVALID_VALUE:
    case ERRORS.TOO_LONG:
    case ERRORS.TOO_SHORT:          return HTTP.BAD_REQUEST;
    case ERRORS.RATE_LIMITED:
    case ERRORS.QUOTA_EXCEEDED:     return HTTP.TOO_MANY_REQUESTS;
    case ERRORS.NOT_IMPLEMENTED:    return HTTP.INTERNAL;
    case ERRORS.SERVICE_UNAVAILABLE: return HTTP.SERVICE_UNAVAILABLE;
    default:                        return HTTP.INTERNAL;
  }
}

/**
 * Wrap an async Express handler so unhandled promise rejections are caught
 * and returned as { ok: false, error: { code: 'INTERNAL', message } }.
 *
 * Usage:
 *   router.get('/path', guard(async (req, res) => { ... }));
 *
 * @param {Function} fn  async (req, res, next) => ...
 * @returns {Function}
 */
export function guard(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      console.error('[PolyAPI] Unhandled error in route handler:', err);
      if (!res.headersSent) {
        fail(res, ERRORS.INTERNAL, 'An unexpected server error occurred');
      }
    }
  };
}
