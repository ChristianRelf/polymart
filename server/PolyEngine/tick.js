/**
 * PolyEngine · Tick
 *
 * Master tick orchestrator. Owns the simulation instances and the DataWrapper,
 * wires them together, and drives the tick loop.
 *
 * This is the only PolyEngine file that should be imported by the server entry
 * point (server.js). Everything else is internal.
 *
 * Usage:
 *   import { PolyEngineTick } from './PolyEngine/tick.js';
 *
 *   const engine = new PolyEngineTick({ db });
 *   await engine.init();            // load state from DB (or cold-start)
 *   engine.start(10_000);           // tick every 10 seconds
 *
 * The engine emits all data through DataWrapper subscribers:
 *   engine.data.subscribe('stocks',  payload => writeStocks(payload));
 *   engine.data.subscribe('forex',   payload => writeForex(payload));
 *   engine.data.subscribe('market',  payload => writeMarket(payload));
 *   engine.data.subscribe('events',  payload => logEvent(payload));
 */

import { StockSimulation } from './StockSimulation.js';
import { ForexSimulation  } from './ForexSimulation.js';
import { DataWrapper      } from './DataWrapper.js';

// ── Timing constants ──────────────────────────────────────────────────────────

const DEFAULT_INTERVAL_MS  = 10_000;
const STOCK_WARMUP_TICKS   = 60;
const FOREX_WARMUP_TICKS   = 40;
const MIN_TICK_INTERVAL_MS = 1_000;  // safety floor — never tick faster than 1s

// ── PolyEngineTick ────────────────────────────────────────────────────────────

export class PolyEngineTick {
  /**
   * @param {object} options
   * @param {object} [options.db]          DB adapter with loadState/saveState (optional — for future use)
   * @param {number} [options.intervalMs]  Tick interval in ms (default 10_000)
   * @param {boolean} [options.validate]   Run invariant checks each tick (default false — use in dev)
   */
  constructor({ db = null, intervalMs = DEFAULT_INTERVAL_MS, validate = false } = {}) {
    if (intervalMs < MIN_TICK_INTERVAL_MS)
      throw new RangeError(`PolyEngineTick: intervalMs must be >= ${MIN_TICK_INTERVAL_MS}ms`);

    this._db          = db;
    this._intervalMs  = intervalMs;
    this._validateEachTick = validate;

    this._stocks      = new StockSimulation();
    this._forex       = new ForexSimulation();
    this._data        = new DataWrapper();

    this._running     = false;
    this._ticking     = false;
    this._timer       = null;
    this._tickCount   = 0;
    this._errorCount  = 0;
    this._lastTickMs  = 0;
    this._lastTickDuration = 0;

    // Consecutive-error circuit breaker — triggers cold reinit after N failures
    this._consecutiveErrors    = 0;
    this._maxConsecutiveErrors = 5;
  }

  /** The DataWrapper — subscribe to channels here. */
  get data() { return this._data; }

  /** Underlying stock simulation (read-only access for tests/admin). */
  get stockSim() { return this._stocks; }

  /** Underlying forex simulation (read-only access for tests/admin). */
  get forexSim() { return this._forex; }

  // ── Initialisation ───────────────────────────────────────────────────────────

  /**
   * Initialise the engine. If a DB adapter is provided, loads existing state;
   * otherwise cold-starts with warm-up ticks.
   */
  async init() {
    if (this._db) {
      await this._loadFromDB();
    } else {
      this._coldStart();
    }
    console.log('[PolyEngine] Initialised — stocks:', this._stocks.stocks.length, '| forex:', this._forex.pairs.length);
  }

  _coldStart() {
    console.log('[PolyEngine] Cold start — running warm-up ticks...');
    this._stocks.warmUp(STOCK_WARMUP_TICKS);
    this._forex.warmUp(FOREX_WARMUP_TICKS);
    console.log(`[PolyEngine] Warm-up complete (stocks: ${STOCK_WARMUP_TICKS} ticks, forex: ${FOREX_WARMUP_TICKS} ticks)`);
  }

  async _loadFromDB() {
    if (!this._db.loadStockState || !this._db.loadForexState) {
      console.warn('[PolyEngine] DB adapter missing loadStockState/loadForexState — falling back to cold start');
      return this._coldStart();
    }
    try {
      const [stockState, forexState] = await Promise.all([
        this._db.loadStockState(),
        this._db.loadForexState(),
      ]);

      if (stockState) {
        this._stocks.loadState(stockState.market, stockState.stocks, stockState.sectors);
        console.log('[PolyEngine] Stock state loaded from DB');
      } else {
        this._stocks.warmUp(STOCK_WARMUP_TICKS);
        console.log('[PolyEngine] No stock state in DB — warm-up complete');
      }

      if (forexState && forexState.length > 0) {
        this._forex.loadState(forexState);
        console.log('[PolyEngine] Forex state loaded from DB');
      } else {
        this._forex.warmUp(FOREX_WARMUP_TICKS);
        console.log('[PolyEngine] No forex state in DB — warm-up complete');
      }
    } catch (err) {
      console.error('[PolyEngine] DB load failed — falling back to cold start:', err.message);
      this._coldStart();
    }
  }

  // ── Tick ─────────────────────────────────────────────────────────────────────

  /**
   * Execute a single tick: advance both simulations, validate (optional),
   * publish through DataWrapper, then drain async subscribers.
   *
   * Safe to call concurrently — re-entrant ticks are skipped.
   *
   * @returns {Promise<{stockResult: object; forexResult: object; durationMs: number} | null>}
   */
  async tick() {
    if (this._ticking) {
      console.warn('[PolyEngine] Tick skipped — previous tick still running');
      return null;
    }
    this._ticking = true;
    const t0 = Date.now();

    try {
      // ── Simulate ───────────────────────────────────────────────────────────
      const stockResult = this._stocks.tick();
      const forexResult = this._forex.tick();

      // ── Optional validation ────────────────────────────────────────────────
      if (this._validateEachTick) {
        this._stocks.validate();
        this._forex.validate();
      }

      // ── Publish ────────────────────────────────────────────────────────────
      this._data.publishTick(stockResult, forexResult);

      // ── Await async subscribers (DB writes) ────────────────────────────────
      await this._data.drain();

      const durationMs = Date.now() - t0;
      this._tickCount++;
      this._lastTickMs       = t0;
      this._lastTickDuration = durationMs;
      this._consecutiveErrors = 0; // reset on success

      const ms  = stockResult.marketState;
      const evt = stockResult.newEvent;
      const budgetMs = this._intervalMs * 0.8;
      if (durationMs > budgetMs) {
        console.warn(
          `[PolyEngine] Tick #${this._tickCount} took ${durationMs}ms — ` +
          `exceeds 80% of ${this._intervalMs}ms interval (budget: ${budgetMs}ms)`
        );
      }
      console.log(
        `[PolyEngine] #${ms.tick_count} session=${ms.market_session} ` +
        `vix=${ms.vix.toFixed(1)} fg=${Math.round(ms.fear_greed)} ` +
        `stocks=${this._stocks.stocks.length} forex=${this._forex.pairs.length} ` +
        `${evt ? '| EVENT: ' + evt.text.slice(0, 40) : ''} (${durationMs}ms)`
      );

      return { stockResult, forexResult, durationMs };
    } catch (err) {
      this._errorCount++;
      this._consecutiveErrors++;
      console.error(
        `[PolyEngine] Tick #${this._tickCount + 1} error ` +
        `(consecutive: ${this._consecutiveErrors}/${this._maxConsecutiveErrors}, total: ${this._errorCount}):`,
        err
      );
      if (this._consecutiveErrors >= this._maxConsecutiveErrors) {
        console.error('[PolyEngine] Too many consecutive errors — triggering cold reinit');
        this._consecutiveErrors = 0;
        try { this._coldStart(); } catch (e) {
          console.error('[PolyEngine] Cold reinit also failed:', e.message);
        }
      }
      return null;
    } finally {
      this._ticking = false;
    }
  }

  // ── Loop control ──────────────────────────────────────────────────────────────

  /**
   * Start the recurring tick loop.
   * @param {number} [intervalMs] Override the instance interval for this run.
   */
  start(intervalMs) {
    if (this._running) {
      console.warn('[PolyEngine] start() called on already-running engine');
      return;
    }
    const ms = intervalMs ?? this._intervalMs;
    if (ms < MIN_TICK_INTERVAL_MS)
      throw new RangeError(`PolyEngineTick.start: intervalMs must be >= ${MIN_TICK_INTERVAL_MS}ms`);

    this._running  = true;
    this._intervalMs = ms;

    console.log(`[PolyEngine] Starting tick loop every ${ms / 1000}s`);
    this.tick(); // fire immediately
    this._timer = setInterval(() => this.tick(), ms);
  }

  /**
   * Stop the tick loop gracefully.
   * Any in-progress tick completes; no new ticks will start.
   */
  stop() {
    if (!this._running) return;
    this._running = false;
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    console.log(`[PolyEngine] Stopped after ${this._tickCount} ticks`);
  }

  // ── Observability ─────────────────────────────────────────────────────────────

  /**
   * Current engine health snapshot.
   * @returns {object}
   */
  status() {
    return {
      running:          this._running,
      ticking:          this._ticking,
      tickCount:        this._tickCount,
      errorCount:       this._errorCount,
      lastTickMs:       this._lastTickMs,
      lastTickDuration: this._lastTickDuration,
      intervalMs:       this._intervalMs,
      subscriberCount:  this._data.subscriberCount(),
      publishStats:     this._data.stats(),
    };
  }
}

// ── Convenience factory ───────────────────────────────────────────────────────

/**
 * Create and start a PolyEngineTick with a DB adapter in one call.
 * Mirrors the existing startTickLoop(intervalMs) API shape for easy migration.
 *
 * @param {object} options
 * @returns {Promise<PolyEngineTick>}
 */
export async function createAndStart(options = {}) {
  const engine = new PolyEngineTick(options);
  await engine.init();
  engine.start(options.intervalMs);
  return engine;
}
