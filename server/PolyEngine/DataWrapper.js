/**
 * PolyEngine · DataWrapper
 *
 * Protocol-based data routing layer. Subscribers register interest in a named
 * channel (e.g. "stocks", "forex", "market", "events") and receive validated
 * payloads whenever DataWrapper.publish() is called.
 *
 * Design goals:
 *  - Zero coupling between simulations and persistence: DataWrapper is the
 *    only thing that knows where data goes.
 *  - Schema validation before dispatch so bad data never reaches subscribers.
 *  - Synchronous fast-path for in-process listeners; async adapters for DB/HTTP.
 *
 * Usage:
 *   const dw = new DataWrapper();
 *
 *   // Register a subscriber (returns unsubscribe fn)
 *   const unsub = dw.subscribe('stocks', async (payload) => {
 *     await writeStocksToDB(payload.stocks);
 *   });
 *
 *   // Publish after a tick
 *   const result = stockSim.tick();
 *   dw.publish('stocks',  { stocks: result.stocks, marketState: result.marketState, sectors: result.sectors, event: result.newEvent });
 *   dw.publish('forex',   { pairs: forexResult.pairs });
 *   dw.publish('market',  result.marketState);
 *
 *   // Drain all pending async subscribers before the next tick
 *   await dw.drain();
 */

// ── Schema validators ─────────────────────────────────────────────────────────
// Each channel has a required validator that throws on bad data.
// This catches bugs at the boundary before they propagate to the DB.

function isFiniteNumber(v) {
  return typeof v === 'number' && isFinite(v);
}

function validateStocksPayload(payload) {
  if (!payload || typeof payload !== 'object')
    throw new TypeError('DataWrapper[stocks]: payload must be an object');
  if (!Array.isArray(payload.stocks))
    throw new TypeError('DataWrapper[stocks]: payload.stocks must be an array');
  if (!payload.marketState || typeof payload.marketState !== 'object')
    throw new TypeError('DataWrapper[stocks]: payload.marketState must be an object');
  if (!Array.isArray(payload.sectors))
    throw new TypeError('DataWrapper[stocks]: payload.sectors must be an array');

  for (const s of payload.stocks) {
    if (typeof s.ticker !== 'string')
      throw new TypeError(`DataWrapper[stocks]: stock missing ticker`);
    if (!isFiniteNumber(s.price) || s.price <= 0)
      throw new RangeError(`DataWrapper[stocks]: stock ${s.ticker} has invalid price ${s.price}`);
  }
}

function validateForexPayload(payload) {
  if (!payload || typeof payload !== 'object')
    throw new TypeError('DataWrapper[forex]: payload must be an object');
  if (!Array.isArray(payload.pairs))
    throw new TypeError('DataWrapper[forex]: payload.pairs must be an array');

  for (const p of payload.pairs) {
    if (typeof p.pair !== 'string')
      throw new TypeError(`DataWrapper[forex]: pair entry missing .pair`);
    if (!isFiniteNumber(p.price) || p.price <= 0)
      throw new RangeError(`DataWrapper[forex]: pair ${p.pair} has invalid price ${p.price}`);
  }
}

function validateMarketPayload(payload) {
  if (!payload || typeof payload !== 'object')
    throw new TypeError('DataWrapper[market]: payload must be an object');
  if (!isFiniteNumber(payload.fear_greed) || payload.fear_greed < 0 || payload.fear_greed > 100)
    throw new RangeError(`DataWrapper[market]: invalid fear_greed ${payload.fear_greed}`);
  if (!isFiniteNumber(payload.index_value) || payload.index_value < 0)
    throw new RangeError(`DataWrapper[market]: invalid index_value ${payload.index_value}`);
}

function validateEventPayload(payload) {
  if (payload === null) return; // null = no event fired this tick — valid
  if (!payload || typeof payload !== 'object')
    throw new TypeError('DataWrapper[events]: payload must be an object or null');
  if (typeof payload.text !== 'string' || !payload.text)
    throw new TypeError('DataWrapper[events]: event.text must be a non-empty string');
  if (!isFiniteNumber(payload.effect))
    throw new TypeError('DataWrapper[events]: event.effect must be a finite number');
}

function validateCryptoPayload(payload) {
  if (!payload || typeof payload !== 'object')
    throw new TypeError('DataWrapper[crypto]: payload must be an object');
  if (!Array.isArray(payload.coins))
    throw new TypeError('DataWrapper[crypto]: payload.coins must be an array');
  if (!Array.isArray(payload.categories))
    throw new TypeError('DataWrapper[crypto]: payload.categories must be an array');

  // Filter bad-price coins rather than throwing — keeps the tick loop alive
  // while the self-heal in CryptoSimulation corrects the state over subsequent ticks.
  const bad = payload.coins.filter(c => typeof c.symbol !== 'string' || !isFiniteNumber(c.price) || c.price <= 0);
  if (bad.length > 0) {
    for (const c of bad)
      console.error(`[DataWrapper] crypto: coin ${c.symbol ?? '?'} has invalid price ${c.price} — excluded from publish`);
    payload.coins = payload.coins.filter(c => typeof c.symbol === 'string' && isFiniteNumber(c.price) && c.price > 0);
  }
}

// ── Channel registry ──────────────────────────────────────────────────────────

/** @type {Record<string, (payload: unknown) => void>} */
const VALIDATORS = {
  stocks: validateStocksPayload,
  forex:  validateForexPayload,
  market: validateMarketPayload,
  events: validateEventPayload,
  crypto: validateCryptoPayload,
};

const KNOWN_CHANNELS = new Set(Object.keys(VALIDATORS));

// ── DataWrapper class ─────────────────────────────────────────────────────────

export class DataWrapper {
  /**
   * @param {object} [options]
   * @param {number} [options.drainTimeoutMs=5000]  Max ms to wait for async subscribers per tick.
   *                                                 Set to 0 to disable timeout (wait forever).
   */
  constructor({ drainTimeoutMs = 5_000 } = {}) {
    /** @type {Map<string, Set<Function>>} */
    this._subscribers = new Map();

    /** @type {Promise[]} Async work queued in this tick cycle */
    this._pending = [];

    /** @type {Map<string, number>} Publish counts per channel (for observability) */
    this._stats = new Map();

    this._drainTimeoutMs = drainTimeoutMs;
  }

  // ── Subscription ─────────────────────────────────────────────────────────────

  /**
   * Register a callback for a named channel. The callback may be sync or async.
   * Returns an unsubscribe function.
   *
   * @param {string}   channel  One of: "stocks" | "forex" | "market" | "events"
   * @param {Function} fn       Callback(payload) — may return a Promise
   * @returns {() => void}      Unsubscribe function
   */
  subscribe(channel, fn) {
    if (!KNOWN_CHANNELS.has(channel))
      throw new RangeError(`DataWrapper.subscribe: unknown channel "${channel}". Known: ${[...KNOWN_CHANNELS].join(', ')}`);
    if (typeof fn !== 'function')
      throw new TypeError('DataWrapper.subscribe: fn must be a function');

    if (!this._subscribers.has(channel)) this._subscribers.set(channel, new Set());
    this._subscribers.get(channel).add(fn);

    return () => this._subscribers.get(channel)?.delete(fn);
  }

  /**
   * Register a one-time callback that unsubscribes itself after the first call.
   * @param {string}   channel
   * @param {Function} fn
   */
  once(channel, fn) {
    const unsub = this.subscribe(channel, (...args) => { unsub(); fn(...args); });
    return unsub;
  }

  // ── Publishing ────────────────────────────────────────────────────────────────

  /**
   * Validate and dispatch a payload to all subscribers of the given channel.
   * Async subscribers are tracked via drain().
   *
   * @param {string}  channel
   * @param {unknown} payload
   */
  publish(channel, payload) {
    if (!KNOWN_CHANNELS.has(channel))
      throw new RangeError(`DataWrapper.publish: unknown channel "${channel}"`);

    // Validate before dispatch — throws on schema violations
    VALIDATORS[channel](payload);

    // Track stats
    this._stats.set(channel, (this._stats.get(channel) || 0) + 1);

    const subs = this._subscribers.get(channel);
    if (!subs || subs.size === 0) return;

    for (const fn of subs) {
      try {
        const result = fn(payload);
        // If the subscriber returned a Promise, track it so drain() can await it
        if (result && typeof result.then === 'function') {
          this._pending.push(result.catch(err => {
            console.error(`[DataWrapper] async subscriber on "${channel}" failed:`, err.message);
          }));
        }
      } catch (err) {
        console.error(`[DataWrapper] sync subscriber on "${channel}" threw:`, err.message);
      }
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  /**
   * Await all pending async subscribers from the last publish cycle.
   * Atomically swaps _pending so any publish() calls that arrive during drain
   * are queued for the NEXT drain, not lost.
   *
   * If drainTimeoutMs > 0 and subscribers stall, we abort waiting and warn —
   * the stalled promises continue running in the background but won't block ticks.
   *
   * @returns {Promise<void>}
   */
  async drain() {
    if (this._pending.length === 0) return;

    // Atomic swap — new publish()es during await go into fresh array
    const batch = this._pending;
    this._pending = [];

    if (this._drainTimeoutMs <= 0) {
      await Promise.allSettled(batch);
      return;
    }

    let timedOut = false;
    let timer;
    const timeoutP = new Promise(resolve => {
      timer = setTimeout(() => { timedOut = true; resolve(); }, this._drainTimeoutMs);
    });

    await Promise.race([Promise.allSettled(batch), timeoutP]);
    clearTimeout(timer);

    if (timedOut) {
      console.warn(
        `[DataWrapper] drain() timed out after ${this._drainTimeoutMs}ms — ` +
        `${batch.length} subscriber promise(s) still pending (continuing without them)`
      );
    }
  }

  /**
   * Publish a complete tick result in one call — convenience wrapper that
   * publishes to all channels atomically (before drain).
   *
   * @param {{ stocks: object[]; marketState: object; sectors: object[]; newEvent: object|null }} stockResult
   * @param {{ pairs: object[] }} forexResult
   * @param {{ coins: object[]; categories: object[]; newEvent: object|null }} cryptoResult
   */
  publishTick(stockResult, forexResult, cryptoResult) {
    this.publish('stocks', {
      stocks:      stockResult.stocks,
      marketState: stockResult.marketState,
      sectors:     stockResult.sectors,
    });
    this.publish('forex',  { pairs: forexResult.pairs });
    this.publish('market', stockResult.marketState);
    if (stockResult.newEvent !== undefined) {
      this.publish('events', stockResult.newEvent);
    }
    if (cryptoResult) {
      this.publish('crypto', { coins: cryptoResult.coins, categories: cryptoResult.categories });
      if (cryptoResult.newEvent) {
        this.publish('events', cryptoResult.newEvent);
      }
    }
  }

  // ── Observability ─────────────────────────────────────────────────────────────

  /**
   * Return a snapshot of publish counts per channel.
   * @returns {Record<string, number>}
   */
  stats() {
    return Object.fromEntries(this._stats);
  }

  /**
   * Number of subscribers currently registered across all channels.
   * @returns {number}
   */
  subscriberCount() {
    let n = 0;
    for (const s of this._subscribers.values()) n += s.size;
    return n;
  }

  /**
   * Remove all subscribers and clear pending promises.
   * Use in tests for clean teardown.
   */
  reset() {
    this._subscribers.clear();
    this._pending = [];
    this._stats.clear();
  }
}
