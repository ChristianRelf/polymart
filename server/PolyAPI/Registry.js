/**
 * PolyAPI · Registry
 *
 * Central service registry. Tracks all registered API services, their health
 * state, and circuit-breaker status so the system can degrade gracefully.
 *
 * Usage:
 *   import { registry } from './PolyAPI/Registry.js';
 *
 *   // Register on startup (in server.js)
 *   registry.register('billing', billingRouter, { critical: true });
 *   registry.register('community', communityRouter);
 *
 *   // Wrap external calls with the circuit breaker
 *   const result = await registry.call('stripe', () => stripe.charges.create(...));
 *
 *   // Health snapshot (for a /healthz endpoint)
 *   const health = registry.health();
 */

// ── Circuit breaker states ────────────────────────────────────────────────────

const STATE = Object.freeze({ CLOSED: 'closed', OPEN: 'open', HALF_OPEN: 'half_open' });

// ── ServiceEntry ──────────────────────────────────────────────────────────────

class ServiceEntry {
  /**
   * @param {string}  name
   * @param {object}  [opts]
   * @param {boolean} [opts.critical=false]    If true, system health is degraded when this service is unhealthy
   * @param {number}  [opts.failureThreshold=5] Open breaker after N consecutive failures
   * @param {number}  [opts.resetTimeoutMs=30_000] Time before attempting HALF_OPEN
   */
  constructor(name, { critical = false, failureThreshold = 5, resetTimeoutMs = 30_000 } = {}) {
    this.name             = name;
    this.critical         = critical;
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs   = resetTimeoutMs;

    this._state           = STATE.CLOSED;
    this._failures        = 0;
    this._openedAt        = null;
    this._successCount    = 0;
    this._totalCalls      = 0;
    this._lastError       = null;
    this._registeredAt    = Date.now();
  }

  get state() { return this._state; }
  get isOpen() { return this._state === STATE.OPEN; }

  /**
   * Execute `fn` through the circuit breaker.
   * @param {Function} fn  Async function to call
   * @returns {Promise<unknown>}
   */
  async call(fn) {
    this._totalCalls++;

    if (this._state === STATE.OPEN) {
      if (Date.now() - this._openedAt >= this.resetTimeoutMs) {
        this._state = STATE.HALF_OPEN;
        console.log(`[Registry:${this.name}] Circuit HALF-OPEN — probing...`);
      } else {
        throw new Error(`Circuit breaker OPEN for service "${this.name}"`);
      }
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure(err);
      throw err;
    }
  }

  _onSuccess() {
    this._successCount++;
    this._failures = 0;
    if (this._state !== STATE.CLOSED) {
      console.log(`[Registry:${this.name}] Circuit CLOSED after successful probe`);
      this._state = STATE.CLOSED;
      this._openedAt = null;
    }
  }

  _onFailure(err) {
    this._lastError = err.message;
    this._failures++;
    if (this._failures >= this.failureThreshold && this._state === STATE.CLOSED) {
      this._state    = STATE.OPEN;
      this._openedAt = Date.now();
      console.error(
        `[Registry:${this.name}] Circuit OPEN after ${this._failures} failures — ` +
        `will retry in ${this.resetTimeoutMs / 1000}s`
      );
    }
  }

  snapshot() {
    return {
      name:          this.name,
      critical:      this.critical,
      state:         this._state,
      failures:      this._failures,
      threshold:     this.failureThreshold,
      successCount:  this._successCount,
      totalCalls:    this._totalCalls,
      lastError:     this._lastError,
      openedAt:      this._openedAt,
      registeredAt:  this._registeredAt,
    };
  }
}

// ── Registry ──────────────────────────────────────────────────────────────────

class Registry {
  constructor() {
    /** @type {Map<string, ServiceEntry>} */
    this._services = new Map();
  }

  /**
   * Register a named service. Safe to call multiple times — re-registration
   * resets the circuit breaker for that service.
   *
   * @param {string} name
   * @param {object} [opts]  ServiceEntry options
   */
  register(name, opts = {}) {
    if (this._services.has(name)) {
      console.warn(`[Registry] Re-registering service "${name}" — resetting circuit breaker`);
    }
    this._services.set(name, new ServiceEntry(name, opts));
    console.log(`[Registry] Registered service "${name}" (critical=${opts.critical ?? false})`);
  }

  /**
   * Execute a function through the named service's circuit breaker.
   * @param {string}   name  Service name (must be registered)
   * @param {Function} fn    Async call to make
   * @returns {Promise<unknown>}
   */
  call(name, fn) {
    const svc = this._services.get(name);
    if (!svc) throw new Error(`[Registry] Unknown service "${name}" — did you register it?`);
    return svc.call(fn);
  }

  /**
   * Force a service's breaker open (e.g. on startup health check failure).
   * @param {string} name
   */
  trip(name) {
    const svc = this._services.get(name);
    if (!svc) return;
    svc._state     = STATE.OPEN;
    svc._openedAt  = Date.now();
    svc._failures  = svc.failureThreshold;
    console.warn(`[Registry] Service "${name}" manually tripped OPEN`);
  }

  /**
   * Force a service's breaker closed (e.g. after manual remediation).
   * @param {string} name
   */
  reset(name) {
    const svc = this._services.get(name);
    if (!svc) return;
    svc._state    = STATE.CLOSED;
    svc._failures = 0;
    svc._openedAt = null;
    console.log(`[Registry] Service "${name}" manually reset to CLOSED`);
  }

  /**
   * Return a health snapshot of all registered services.
   * @returns {{ healthy: boolean; services: object[] }}
   */
  health() {
    const services = [...this._services.values()].map(s => s.snapshot());
    const healthy  = services.every(s => !s.critical || s.state === STATE.CLOSED);
    return { healthy, services };
  }

  /**
   * Return the circuit-breaker state for a single service.
   * @param {string} name
   * @returns {string|null}
   */
  stateOf(name) {
    return this._services.get(name)?._state ?? null;
  }

  /**
   * True if the named service's circuit breaker is open (not safe to call).
   * @param {string} name
   */
  isOpen(name) {
    return this._services.get(name)?.isOpen ?? false;
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────
// One shared Registry for the whole server process.

export const registry = new Registry();
export { Registry, ServiceEntry, STATE };
