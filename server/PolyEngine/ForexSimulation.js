/**
 * PolyEngine · ForexSimulation
 *
 * Encapsulates the forex market simulation: 40 currency pairs (major, minor,
 * exotic) with realistic spread, technical indicators, and session dynamics.
 *
 * Usage:
 *   const sim = new ForexSimulation();
 *   sim.warmUp(40);
 *   const result = sim.tick();   // returns { pairs: ForexPairState[] }
 */

// ── Math helpers ──────────────────────────────────────────────────────────────

function gaussian() {
  const u1 = Math.random(), u2 = Math.random();
  const z  = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
  return Math.random() < 0.05 ? z * (2 + Math.random() * 1.5) : z;
}

function ema(prev, cur, k) { return cur * k + prev * (1 - k); }

function sma(history, period) {
  const slice = history.slice(-Math.min(period, history.length));
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function computeMACD(history) {
  if (history.length < 2) {
    const p = history[0] || 0;
    return { macd: 0, signal: 0, hist: 0, ema12: p, ema26: p };
  }
  const k12 = 2 / 13, k26 = 2 / 27, k9 = 2 / 10;
  let e12 = history[0], e26 = history[0], sig = 0;
  for (let i = 1; i < history.length; i++) {
    e12 = ema(e12, history[i], k12);
    e26 = ema(e26, history[i], k26);
    sig = ema(sig, e12 - e26, k9);
  }
  const macdLine = e12 - e26;
  return { macd: macdLine, signal: sig, hist: macdLine - sig, ema12: e12, ema26: e26 };
}

function computeBB(history, period = 20, stdMult = 2) {
  const slice = history.slice(-Math.min(period, history.length));
  if (slice.length < 2) { const p = slice[0] || 0; return { upper: p, middle: p, lower: p, bw: 0 }; }
  const mean     = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / slice.length;
  const sd       = Math.sqrt(variance);
  const upper    = mean + stdMult * sd;
  const lower    = mean - stdMult * sd;
  return { upper, middle: mean, lower, bw: mean > 0 ? (upper - lower) / mean : 0 };
}

function computeATR(history, period = 14) {
  if (history.length < 2) return 0;
  const trs = [];
  for (let i = Math.max(1, history.length - period); i < history.length; i++) {
    trs.push(Math.abs(history[i] - history[i - 1]));
  }
  return trs.length > 0 ? trs.reduce((a, b) => a + b, 0) / trs.length : 0;
}

function computeStochastic(history, kPeriod = 14, dPeriod = 3) {
  const slice = history.slice(-Math.min(kPeriod, history.length));
  if (slice.length < 2) return { k: 50, d: 50 };
  const lo  = Math.min(...slice);
  const hi  = Math.max(...slice);
  const cur = slice[slice.length - 1];
  const k   = hi === lo ? 50 : ((cur - lo) / (hi - lo)) * 100;
  const dSlice = history.slice(-Math.min(kPeriod + dPeriod, history.length));
  const d   = dSlice.length < 2 ? k : dSlice.slice(-dPeriod).reduce((a, b) => a + b, 0) / Math.min(dPeriod, dSlice.length);
  return { k, d };
}

function computeCCI(history, period = 20) {
  const slice = history.slice(-Math.min(period, history.length));
  if (slice.length < 2) return 0;
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const mad  = slice.reduce((a, b) => a + Math.abs(b - mean), 0) / slice.length;
  return mad === 0 ? 0 : (slice[slice.length - 1] - mean) / (0.015 * mad);
}

// ── Active session by UTC hour ────────────────────────────────────────────────

function getActiveSession() {
  const h = new Date().getUTCHours();
  if (h >= 21 || h < 6)  return 'sydney';
  if (h >= 0  && h < 9)  return 'tokyo';
  if (h >= 7  && h < 16) return 'london';
  return 'new_york';
}

// ── Country flag lookup (ISO-2 → emoji) ──────────────────────────────────────

export const COUNTRY_FLAGS = {
  US: '🇺🇸', EU: '🇪🇺', GB: '🇬🇧', JP: '🇯🇵', CH: '🇨🇭',
  AU: '🇦🇺', CA: '🇨🇦', NZ: '🇳🇿', MX: '🇲🇽', ZA: '🇿🇦',
  TR: '🇹🇷', BR: '🇧🇷', SG: '🇸🇬', HK: '🇭🇰', CN: '🇨🇳',
  NO: '🇳🇴', SE: '🇸🇪', PL: '🇵🇱', CZ: '🇨🇿', HU: '🇭🇺',
  IN: '🇮🇳', TH: '🇹🇭', MY: '🇲🇾', ID: '🇮🇩', PH: '🇵🇭',
  KR: '🇰🇷', AE: '🇦🇪', SA: '🇸🇦', EG: '🇪🇬',
};

// ── Pair definitions ──────────────────────────────────────────────────────────

/**
 * @typedef {Object} PairDef
 * @property {string}   base
 * @property {string}   quote
 * @property {"major"|"minor"|"exotic"} category
 * @property {number}   basePrice   Starting price in quote currency per 1 base
 * @property {number}   volatility  Per-tick 1-sigma in price units
 * @property {number}   trend       Long-run drift per tick
 * @property {number}   spread      Half-spread in price units
 * @property {number}   decimals    Display precision
 * @property {number}   pipSize     1 pip in price units
 * @property {string}   baseName
 * @property {string}   quoteName
 * @property {string}   baseCountry ISO-2
 * @property {string}   quoteCountry ISO-2
 * @property {string}   description
 * @property {string[]} economicDrivers
 * @property {Object}   factSheet
 */

/** @type {Record<string, PairDef>} */
export const PAIR_DEFS = {
  // ── Majors ──────────────────────────────────────────────────────────────────
  EURUSD: { base:"EUR", quote:"USD", category:"major", basePrice:1.0850, volatility:0.00038, trend:0, spread:0.00010, decimals:4, pipSize:0.0001, baseName:"Euro", quoteName:"US Dollar", baseCountry:"EU", quoteCountry:"US", description:"The most-traded currency pair in the world.", economicDrivers:["ECB vs Fed rate differential","Eurozone GDP & PMI","US Non-Farm Payrolls & CPI","Trade balance"], factSheet:{dailyVolume:"$1.1T",avgSpread:"0.1 pips",sessions:"London/NY overlap most active"} },
  GBPUSD: { base:"GBP", quote:"USD", category:"major", basePrice:1.2650, volatility:0.00048, trend:0, spread:0.00012, decimals:4, pipSize:0.0001, baseName:"British Pound", quoteName:"US Dollar", baseCountry:"GB", quoteCountry:"US", description:"'Cable' — highly sensitive to Bank of England policy.", economicDrivers:["Bank of England policy","UK CPI & unemployment","US Fed rate decisions","UK-EU trade balance"], factSheet:{dailyVolume:"$422B",avgSpread:"0.15 pips",sessions:"London session most active"} },
  USDJPY: { base:"USD", quote:"JPY", category:"major", basePrice:149.50, volatility:0.048,   trend:0, spread:0.010,   decimals:2, pipSize:0.01,   baseName:"US Dollar", quoteName:"Japanese Yen", baseCountry:"US", quoteCountry:"JP", description:"'Gopher' — safe-haven pair; Yen strengthens on risk-off events.", economicDrivers:["BoJ yield curve control","US-Japan rate differential","Global risk sentiment","Japanese trade & CPI"], factSheet:{dailyVolume:"$554B",avgSpread:"0.2 pips",sessions:"Tokyo and NY most active"} },
  USDCHF: { base:"USD", quote:"CHF", category:"major", basePrice:0.8950, volatility:0.00040, trend:0, spread:0.00013, decimals:4, pipSize:0.0001, baseName:"US Dollar", quoteName:"Swiss Franc", baseCountry:"US", quoteCountry:"CH", description:"'Swissie' — CHF is a safe-haven backed by Swiss neutrality.", economicDrivers:["SNB policy & interventions","European risk sentiment","Gold prices","Swiss CPI & trade balance"], factSheet:{dailyVolume:"$243B",avgSpread:"0.15 pips",sessions:"European session most active"} },
  AUDUSD: { base:"AUD", quote:"USD", category:"major", basePrice:0.6550, volatility:0.00045, trend:0, spread:0.00015, decimals:4, pipSize:0.0001, baseName:"Australian Dollar", quoteName:"US Dollar", baseCountry:"AU", quoteCountry:"US", description:"'Aussie' — commodity-linked; tracks iron ore, coal, and Chinese demand.", economicDrivers:["RBA rate decisions","Iron ore & commodity prices","Chinese GDP & industrial data","Global risk sentiment"], factSheet:{dailyVolume:"$223B",avgSpread:"0.15 pips",sessions:"Sydney/Tokyo and London overlap"} },
  USDCAD: { base:"USD", quote:"CAD", category:"major", basePrice:1.3650, volatility:0.00042, trend:0, spread:0.00014, decimals:4, pipSize:0.0001, baseName:"US Dollar", quoteName:"Canadian Dollar", baseCountry:"US", quoteCountry:"CA", description:"'Loonie' — inversely correlated with crude oil prices.", economicDrivers:["WTI crude oil prices","Bank of Canada policy","US-Canada trade (USMCA)","Canadian employment & CPI"], factSheet:{dailyVolume:"$165B",avgSpread:"0.2 pips",sessions:"North American session most active"} },
  NZDUSD: { base:"NZD", quote:"USD", category:"major", basePrice:0.6050, volatility:0.00050, trend:0, spread:0.00018, decimals:4, pipSize:0.0001, baseName:"New Zealand Dollar", quoteName:"US Dollar", baseCountry:"NZ", quoteCountry:"US", description:"'Kiwi' — driven by dairy exports and RBNZ rate decisions.", economicDrivers:["RBNZ rate decisions","Dairy & agricultural commodity prices","Chinese economic data","Global risk appetite"], factSheet:{dailyVolume:"$104B",avgSpread:"0.25 pips",sessions:"Sydney session most active"} },
  // ── Minors ───────────────────────────────────────────────────────────────────
  EURGBP: { base:"EUR", quote:"GBP", category:"minor", basePrice:0.8580, volatility:0.00026, trend:0, spread:0.00015, decimals:4, pipSize:0.0001, baseName:"Euro", quoteName:"British Pound", baseCountry:"EU", quoteCountry:"GB", description:"Reflects ECB vs BoE policy divergence.", economicDrivers:["ECB vs BoE divergence","UK-EU trade relations","Inflation differentials","Political developments"], factSheet:{dailyVolume:"$171B",avgSpread:"0.15 pips",sessions:"London session most active"} },
  EURJPY: { base:"EUR", quote:"JPY", category:"minor", basePrice:162.00, volatility:0.052,   trend:0, spread:0.013,   decimals:2, pipSize:0.01,   baseName:"Euro", quoteName:"Japanese Yen", baseCountry:"EU", quoteCountry:"JP", description:"A risk sentiment barometer with wide intraday swings.", economicDrivers:["ECB vs BoJ divergence","European risk appetite","Eurozone economic data","Japanese monetary policy"], factSheet:{dailyVolume:"$86B",avgSpread:"0.4 pips",sessions:"London and Tokyo sessions"} },
  GBPJPY: { base:"GBP", quote:"JPY", category:"minor", basePrice:189.00, volatility:0.065,   trend:0, spread:0.018,   decimals:2, pipSize:0.01,   baseName:"British Pound", quoteName:"Japanese Yen", baseCountry:"GB", quoteCountry:"JP", description:"'The Dragon' — extremely volatile, beloved by day traders.", economicDrivers:["BoE vs BoJ policy","UK inflation and GDP","Japanese safe-haven flows","Global risk sentiment"], factSheet:{dailyVolume:"$49B",avgSpread:"0.7 pips",sessions:"London session most active"} },
  AUDJPY: { base:"AUD", quote:"JPY", category:"minor", basePrice:98.00,  volatility:0.046,   trend:0, spread:0.012,   decimals:2, pipSize:0.01,   baseName:"Australian Dollar", quoteName:"Japanese Yen", baseCountry:"AU", quoteCountry:"JP", description:"A leading risk barometer — rises in risk-on, falls in risk-off.", economicDrivers:["Global risk appetite","RBA vs BoJ divergence","Chinese economic health","Commodity prices"], factSheet:{dailyVolume:"$38B",avgSpread:"0.5 pips",sessions:"Tokyo and Sydney overlap"} },
  NZDJPY: { base:"NZD", quote:"JPY", category:"minor", basePrice:90.50,  volatility:0.050,   trend:0, spread:0.015,   decimals:2, pipSize:0.01,   baseName:"New Zealand Dollar", quoteName:"Japanese Yen", baseCountry:"NZ", quoteCountry:"JP", description:"High carry appeal with significant risk-off sensitivity.", economicDrivers:["RBNZ vs BoJ policy","Dairy commodity prices","Global risk sentiment","New Zealand GDP"], factSheet:{dailyVolume:"$15B",avgSpread:"0.7 pips",sessions:"Asian session most active"} },
  CADJPY: { base:"CAD", quote:"JPY", category:"minor", basePrice:109.50, volatility:0.048,   trend:0, spread:0.014,   decimals:2, pipSize:0.01,   baseName:"Canadian Dollar", quoteName:"Japanese Yen", baseCountry:"CA", quoteCountry:"JP", description:"Driven by oil-Canada linkage and Japanese safe-haven demand.", economicDrivers:["Crude oil prices","BoC vs BoJ policy","Canadian employment","Global risk sentiment"], factSheet:{dailyVolume:"$22B",avgSpread:"0.6 pips",sessions:"NY and Tokyo sessions"} },
  CHFJPY: { base:"CHF", quote:"JPY", category:"minor", basePrice:167.50, volatility:0.044,   trend:0, spread:0.016,   decimals:2, pipSize:0.01,   baseName:"Swiss Franc", quoteName:"Japanese Yen", baseCountry:"CH", quoteCountry:"JP", description:"Two safe-haven currencies — moves on relative risk positioning.", economicDrivers:["SNB vs BoJ policy","European vs Asian risk flows","Swiss CPI","Japanese trade data"], factSheet:{dailyVolume:"$18B",avgSpread:"0.6 pips",sessions:"London and Tokyo sessions"} },
  EURAUD: { base:"EUR", quote:"AUD", category:"minor", basePrice:1.6550, volatility:0.00052, trend:0, spread:0.00022, decimals:4, pipSize:0.0001, baseName:"Euro", quoteName:"Australian Dollar", baseCountry:"EU", quoteCountry:"AU", description:"Eurozone vs Australian economic cycles — risk-off bias.", economicDrivers:["ECB vs RBA divergence","Chinese demand for Australian exports","European risk sentiment","Commodity prices"], factSheet:{dailyVolume:"$25B",avgSpread:"0.4 pips",sessions:"London and Sydney sessions"} },
  EURCAD: { base:"EUR", quote:"CAD", category:"minor", basePrice:1.4800, volatility:0.00048, trend:0, spread:0.00021, decimals:4, pipSize:0.0001, baseName:"Euro", quoteName:"Canadian Dollar", baseCountry:"EU", quoteCountry:"CA", description:"Eurozone economic performance vs Canadian oil-economy health.", economicDrivers:["ECB vs BoC policy","WTI crude oil prices","Eurozone vs Canadian GDP","Trade flows"], factSheet:{dailyVolume:"$18B",avgSpread:"0.4 pips",sessions:"London and NY sessions"} },
  GBPAUD: { base:"GBP", quote:"AUD", category:"minor", basePrice:1.9350, volatility:0.00060, trend:0, spread:0.00025, decimals:4, pipSize:0.0001, baseName:"British Pound", quoteName:"Australian Dollar", baseCountry:"GB", quoteCountry:"AU", description:"High-volatility minor pair driven by commodity prices and UK data.", economicDrivers:["BoE vs RBA divergence","Iron ore and commodity prices","UK GDP and CPI","Chinese economic data"], factSheet:{dailyVolume:"$14B",avgSpread:"0.5 pips",sessions:"London and Sydney sessions"} },
  // ── Exotics ──────────────────────────────────────────────────────────────────
  USDMXN: { base:"USD", quote:"MXN", category:"exotic", basePrice:17.20,  volatility:0.042,   trend:0, spread:0.025,   decimals:2, pipSize:0.01,   baseName:"US Dollar", quoteName:"Mexican Peso", baseCountry:"US", quoteCountry:"MX", description:"High carry pair sensitive to US-Mexico trade relations.", economicDrivers:["Banxico vs Fed rate differential","US-Mexico trade (USMCA)","Remittances from US","Oil prices (Pemex revenue)"], factSheet:{dailyVolume:"$29B",avgSpread:"0.8 pips",sessions:"NY session most active"} },
  USDZAR: { base:"USD", quote:"ZAR", category:"exotic", basePrice:18.80,  volatility:0.055,   trend:0, spread:0.035,   decimals:2, pipSize:0.01,   baseName:"US Dollar", quoteName:"South African Rand", baseCountry:"US", quoteCountry:"ZA", description:"One of the most volatile EM pairs — political and commodity driven.", economicDrivers:["Gold and platinum prices","SARB monetary policy","South African political stability","Global risk appetite"], factSheet:{dailyVolume:"$22B",avgSpread:"1.2 pips",sessions:"London and NY overlap"} },
  USDTRY: { base:"USD", quote:"TRY", category:"exotic", basePrice:32.50,  volatility:0.085,   trend:0.002, spread:0.060, decimals:2, pipSize:0.01,  baseName:"US Dollar", quoteName:"Turkish Lira", baseCountry:"US", quoteCountry:"TR", description:"Extremely volatile — chronic inflation and unorthodox TCMB policy.", economicDrivers:["TCMB policy credibility","Turkish inflation (60%+ CPI)","Current account deficit","Geopolitical risk premium"], factSheet:{dailyVolume:"$19B",avgSpread:"2+ pips",sessions:"London session most active"} },
  USDBRL: { base:"USD", quote:"BRL", category:"exotic", basePrice:4.98,   volatility:0.038,   trend:0, spread:0.028,   decimals:2, pipSize:0.01,   baseName:"US Dollar", quoteName:"Brazilian Real", baseCountry:"US", quoteCountry:"BR", description:"Sensitive to commodity prices and Brazilian political risk.", economicDrivers:["Banco do Brasil policy","Soybean and iron ore prices","Brazilian fiscal policy","Global risk appetite"], factSheet:{dailyVolume:"$16B",avgSpread:"1 pip",sessions:"NY session most active"} },
  USDSGD: { base:"USD", quote:"SGD", category:"exotic", basePrice:1.3450, volatility:0.00028, trend:0, spread:0.00018, decimals:4, pipSize:0.0001, baseName:"US Dollar", quoteName:"Singapore Dollar", baseCountry:"US", quoteCountry:"SG", description:"Stable Asian pair managed by MAS exchange rate policy.", economicDrivers:["MAS monetary policy (exchange rate tool)","Singapore trade volume","Asia-Pacific risk sentiment","US-China trade dynamics"], factSheet:{dailyVolume:"$15B",avgSpread:"0.3 pips",sessions:"Asian session most active"} },
  USDHKD: { base:"USD", quote:"HKD", category:"exotic", basePrice:7.82,   volatility:0.0004,  trend:0, spread:0.0002,  decimals:4, pipSize:0.0001, baseName:"US Dollar", quoteName:"Hong Kong Dollar", baseCountry:"US", quoteCountry:"HK", description:"Near-peg to USD. Trades in a narrow 7.75–7.85 band.", economicDrivers:["HKMA linked exchange rate system","Hong Kong interbank rates","Capital flows into HK markets","China-US geopolitical tensions"], factSheet:{dailyVolume:"$11B",avgSpread:"0.05 pips",sessions:"Asian session most active"} },
  USDCNH: { base:"USD", quote:"CNH", category:"exotic", basePrice:7.25,   volatility:0.00035, trend:0, spread:0.00025, decimals:4, pipSize:0.0001, baseName:"US Dollar", quoteName:"Offshore Chinese Yuan", baseCountry:"US", quoteCountry:"CN", description:"Offshore CNH — more freely traded than onshore CNY.", economicDrivers:["PBOC USD/CNY fixing","China trade balance","US-China trade tensions","Foreign reserves and capital flows"], factSheet:{dailyVolume:"$22B",avgSpread:"0.2 pips",sessions:"Asian session most active"} },
  USDNOK: { base:"USD", quote:"NOK", category:"exotic", basePrice:10.65,  volatility:0.0045,  trend:0, spread:0.0030,  decimals:2, pipSize:0.01,   baseName:"US Dollar", quoteName:"Norwegian Krone", baseCountry:"US", quoteCountry:"NO", description:"'Nokkie' — strongly correlated with Brent crude oil prices.", economicDrivers:["Brent crude oil prices","Norges Bank rate decisions","Norwegian sovereign wealth fund flows","Global risk sentiment"], factSheet:{dailyVolume:"$12B",avgSpread:"0.8 pips",sessions:"London session most active"} },
  USDSEK: { base:"USD", quote:"SEK", category:"exotic", basePrice:10.45,  volatility:0.0042,  trend:0, spread:0.0028,  decimals:2, pipSize:0.01,   baseName:"US Dollar", quoteName:"Swedish Krona", baseCountry:"US", quoteCountry:"SE", description:"Sensitive to global risk appetite and Riksbank policy.", economicDrivers:["Riksbank monetary policy","Swedish export economy","Global risk sentiment","Eurozone economic health"], factSheet:{dailyVolume:"$11B",avgSpread:"0.8 pips",sessions:"London session most active"} },
  USDPLN: { base:"USD", quote:"PLN", category:"exotic", basePrice:3.92,   volatility:0.0038,  trend:0, spread:0.0025,  decimals:4, pipSize:0.0001, baseName:"US Dollar", quoteName:"Polish Zloty", baseCountry:"US", quoteCountry:"PL", description:"Reflects Poland's strong economic ties to the Eurozone.", economicDrivers:["NBP vs Fed divergence","Eurozone economic health","Polish GDP and inflation","EU fund flows"], factSheet:{dailyVolume:"$8B",avgSpread:"0.8 pips",sessions:"London session most active"} },
  USDCZK: { base:"USD", quote:"CZK", category:"exotic", basePrice:22.80,  volatility:0.0048,  trend:0, spread:0.0032,  decimals:2, pipSize:0.01,   baseName:"US Dollar", quoteName:"Czech Koruna", baseCountry:"US", quoteCountry:"CZ", description:"Stable Central European currency with strong manufacturing base.", economicDrivers:["CNB monetary policy","Czech export economy (auto sector)","Eurozone economic performance","German industrial output"], factSheet:{dailyVolume:"$7B",avgSpread:"0.9 pips",sessions:"London session most active"} },
  USDHUF: { base:"USD", quote:"HUF", category:"exotic", basePrice:358.00, volatility:0.55,    trend:0, spread:0.38,    decimals:0, pipSize:1,      baseName:"US Dollar", quoteName:"Hungarian Forint", baseCountry:"US", quoteCountry:"HU", description:"Higher-yielding Central European currency, sensitive to EU funds.", economicDrivers:["NBH monetary policy","Hungarian fiscal credibility","EU fund disbursements","Eurozone economic health"], factSheet:{dailyVolume:"$6B",avgSpread:"1 pip",sessions:"London session most active"} },
  USDINR: { base:"USD", quote:"INR", category:"exotic", basePrice:83.50,  volatility:0.022,   trend:0.001, spread:0.015, decimals:2, pipSize:0.01,  baseName:"US Dollar", quoteName:"Indian Rupee", baseCountry:"US", quoteCountry:"IN", description:"Managed float — RBI intervenes to limit excessive volatility.", economicDrivers:["RBI intervention and policy","Indian current account deficit","FII/FDI flows","Global oil prices (major importer)"], factSheet:{dailyVolume:"$50B",avgSpread:"0.3 pips",sessions:"Asian session most active"} },
  USDTHB: { base:"USD", quote:"THB", category:"exotic", basePrice:35.80,  volatility:0.018,   trend:0, spread:0.012,   decimals:2, pipSize:0.01,   baseName:"US Dollar", quoteName:"Thai Baht", baseCountry:"US", quoteCountry:"TH", description:"Tourism-sensitive; moves with global travel recovery.", economicDrivers:["Bank of Thailand policy","Thai tourism revenue","Current account balance","Global risk sentiment"], factSheet:{dailyVolume:"$9B",avgSpread:"0.4 pips",sessions:"Asian session most active"} },
  USDMYR: { base:"USD", quote:"MYR", category:"exotic", basePrice:4.72,   volatility:0.022,   trend:0, spread:0.015,   decimals:2, pipSize:0.01,   baseName:"US Dollar", quoteName:"Malaysian Ringgit", baseCountry:"US", quoteCountry:"MY", description:"Commodity-linked — sensitive to palm oil and LNG prices.", economicDrivers:["Bank Negara policy","Palm oil and LNG exports","Chinese economic demand","Global risk appetite"], factSheet:{dailyVolume:"$7B",avgSpread:"0.4 pips",sessions:"Asian session most active"} },
  USDIDR: { base:"USD", quote:"IDR", category:"exotic", basePrice:15800,  volatility:18.0,    trend:0, spread:15,      decimals:0, pipSize:1,      baseName:"US Dollar", quoteName:"Indonesian Rupiah", baseCountry:"US", quoteCountry:"ID", description:"Commodity-rich archipelago; sensitive to coal and nickel prices.", economicDrivers:["Bank Indonesia policy","Nickel and coal export prices","Chinese demand","FX reserves and current account"], factSheet:{dailyVolume:"$6B",avgSpread:"0.5 pips",sessions:"Asian session most active"} },
  USDPHP: { base:"USD", quote:"PHP", category:"exotic", basePrice:56.80,  volatility:0.028,   trend:0, spread:0.020,   decimals:2, pipSize:0.01,   baseName:"US Dollar", quoteName:"Philippine Peso", baseCountry:"US", quoteCountry:"PH", description:"Remittance-driven — one of the highest remittance-to-GDP ratios.", economicDrivers:["BSP monetary policy","OFW remittances from abroad","BPO sector revenues","Global risk sentiment"], factSheet:{dailyVolume:"$5B",avgSpread:"0.5 pips",sessions:"Asian session most active"} },
  USDKRW: { base:"USD", quote:"KRW", category:"exotic", basePrice:1340,   volatility:0.85,    trend:0, spread:0.60,    decimals:0, pipSize:1,      baseName:"US Dollar", quoteName:"South Korean Won", baseCountry:"US", quoteCountry:"KR", description:"Closely tracks global tech cycle (Samsung, SK Hynix).", economicDrivers:["Bank of Korea policy","Semiconductor and electronics exports","US-China tensions","Korean current account"], factSheet:{dailyVolume:"$30B",avgSpread:"0.3 pips",sessions:"Asian session most active"} },
  USDAED: { base:"USD", quote:"AED", category:"exotic", basePrice:3.673,  volatility:0.0002,  trend:0, spread:0.0001,  decimals:3, pipSize:0.001,  baseName:"US Dollar", quoteName:"UAE Dirham", baseCountry:"US", quoteCountry:"AE", description:"Near-peg to USD at 3.6725 — minimal volatility.", economicDrivers:["CBUAE peg management","Oil revenue and diversification","Dubai tourism and real estate","Geopolitical stability"], factSheet:{dailyVolume:"$4B",avgSpread:"0.05 pips",sessions:"Asian/London sessions"} },
  USDSAR: { base:"USD", quote:"SAR", category:"exotic", basePrice:3.750,  volatility:0.0002,  trend:0, spread:0.0001,  decimals:3, pipSize:0.001,  baseName:"US Dollar", quoteName:"Saudi Riyal", baseCountry:"US", quoteCountry:"SA", description:"Hard peg to USD — oil revenue funds the currency reserve.", economicDrivers:["Saudi Aramco oil revenues","SAMA peg management","Vision 2030 capital flows","Regional geopolitical stability"], factSheet:{dailyVolume:"$3B",avgSpread:"0.05 pips",sessions:"London session"} },
  USDEGP: { base:"USD", quote:"EGP", category:"exotic", basePrice:30.90,  volatility:0.045,   trend:0.001, spread:0.030, decimals:2, pipSize:0.01,  baseName:"US Dollar", quoteName:"Egyptian Pound", baseCountry:"US", quoteCountry:"EG", description:"High inflation, IMF-managed float with persistent devaluation risk.", economicDrivers:["IMF programme and reforms","Suez Canal revenues","Tourism receipts","Egyptian fiscal deficit"], factSheet:{dailyVolume:"$2B",avgSpread:"1 pip",sessions:"London session"} },
  USDNZD: { base:"USD", quote:"NZD", category:"minor", basePrice:1.6529, volatility:0.00055, trend:0, spread:0.00020, decimals:4, pipSize:0.0001, baseName:"US Dollar", quoteName:"New Zealand Dollar", baseCountry:"US", quoteCountry:"NZ", description:"Inverse of NZDUSD — dairy and agricultural commodity driven.", economicDrivers:["RBNZ policy vs Fed","New Zealand CPI & GDP","Agricultural export prices","Global risk appetite"], factSheet:{dailyVolume:"$104B",avgSpread:"0.25 pips",sessions:"Sydney session most active"} },
};

export const FOREX_PAIR_KEYS = Object.freeze(Object.keys(PAIR_DEFS));

// ── State builder ─────────────────────────────────────────────────────────────

function buildInitialPairState(pairKey) {
  const d = PAIR_DEFS[pairKey];
  if (!d) throw new RangeError(`ForexSimulation: unknown pair "${pairKey}"`);
  return {
    pair:         pairKey,
    base:         d.base,
    quote:        d.quote,
    category:     d.category,
    price:        d.basePrice,
    prev_price:   d.basePrice,
    open_price:   d.basePrice,
    hi_session:   d.basePrice,
    lo_session:   d.basePrice,
    hi52w:        d.basePrice,
    lo52w:        d.basePrice,
    spread:       d.spread,
    bid:          +(d.basePrice - d.spread).toFixed(d.decimals),
    ask:          +(d.basePrice + d.spread).toFixed(d.decimals),
    volume:       0,
    rsi:          50,
    momentum:     0,
    atr:          0,
    ema12:        d.basePrice,
    ema26:        d.basePrice,
    macd:         0,
    macd_signal:  0,
    macd_hist:    0,
    stoch_k:      50,
    stoch_d:      50,
    cci:          0,
    bb_upper:     d.basePrice,
    bb_middle:    d.basePrice,
    bb_lower:     d.basePrice,
    bb_bw:        0,
    sma20:        d.basePrice,
    sma50:        d.basePrice,
    candle_open:  d.basePrice,
    candle_high:  d.basePrice,
    candle_low:   d.basePrice,
    candle_ticks: 0,
    history:      [d.basePrice],
    candles:      [],
    active_session: getActiveSession(),
  };
}

// ── ForexSimulation ───────────────────────────────────────────────────────────

const CANDLE_PERIOD = 18;

export class ForexSimulation {
  constructor() {
    this._pairs = FOREX_PAIR_KEYS.map(buildInitialPairState);
  }

  get pairs() { return this._pairs; }

  /**
   * Replace state (used when loading from DB).
   * @param {object[]} pairs
   */
  loadState(pairs) {
    if (!Array.isArray(pairs)) throw new TypeError('loadState: pairs must be an array');
    this._pairs = pairs.map(p => {
      if (!p || typeof p.pair !== 'string' || !PAIR_DEFS[p.pair]) return null;
      const price = Number(p.price);
      const merged = {
        ...buildInitialPairState(p.pair),
        ...p,
        history: Array.isArray(p.history) ? p.history : [],
        candles: Array.isArray(p.candles) ? p.candles : [],
      };
      if (!isFinite(price) || price <= 0) {
        const fallback = PAIR_DEFS[p.pair].basePrice;
        console.warn(`[ForexSimulation] loadState: bad price for ${p.pair} (${p.price}) — reset to ${fallback}`);
        merged.price = fallback;
        merged.prev_price = fallback;
      }
      return merged;
    }).filter(Boolean);
    this._ensureMissingPairs();
  }

  _ensureMissingPairs() {
    const known = new Set(this._pairs.map(p => p.pair));
    for (const key of FOREX_PAIR_KEYS) {
      if (!known.has(key)) this._pairs.push(buildInitialPairState(key));
    }
  }

  /** @param {number} n */
  warmUp(n) {
    if (typeof n !== 'number' || n < 1) throw new RangeError('warmUp: n must be a positive integer');
    for (let i = 0; i < n; i++) this.tick();
  }

  /** @returns {{ pairs: object[] }} */
  tick() {
    const activeSession = getActiveSession();

    const newPairs = this._pairs.map(p => {
      try {
      const def = PAIR_DEFS[p.pair];
      if (!def) return p;

      const updated = { ...p };
      const h = Array.isArray(p.history) ? p.history : [];

      const n  = gaussian();
      const np_raw = p.price + def.volatility * n + def.trend;
      // NaN/Inf guard — corrupted gaussian or zero price falls back to base
      const np_safe = isFinite(np_raw) ? np_raw : p.price;
      const np = +(Math.max(p.price * 0.5, Math.min(p.price * 2, np_safe)).toFixed(def.decimals));

      updated.prev_price = p.price;
      updated.price      = np;

      // Session high/low reset at session change
      if (updated.active_session !== activeSession) {
        updated.hi_session = np;
        updated.lo_session = np;
        updated.active_session = activeSession;
      } else {
        updated.hi_session = Math.max(p.hi_session || np, np);
        updated.lo_session = Math.min(p.lo_session || np, np);
      }

      updated.hi52w = Math.max(p.hi52w || np, np);
      updated.lo52w = Math.min(p.lo52w || np, np);

      // Bid/ask
      updated.spread = def.spread;
      updated.bid    = +(np - def.spread).toFixed(def.decimals);
      updated.ask    = +(np + def.spread).toFixed(def.decimals);

      // Volume
      const priceMove = Math.abs(np - p.price) / (p.price || 1);
      updated.volume += Math.floor(1000 + priceMove * 500_000 + Math.random() * 2000);

      // History + indicators
      const newHistory = [...h, np].slice(-60);
      updated.history  = newHistory;
      updated.sma20    = +sma(newHistory, 20).toFixed(def.decimals);
      updated.sma50    = +sma(newHistory, 50).toFixed(def.decimals);
      updated.atr      = +computeATR(newHistory, 14).toFixed(def.decimals);

      // RSI
      let gains = 0, losses = 0;
      const lb = Math.min(14, newHistory.length - 1);
      for (let i = newHistory.length - lb; i < newHistory.length; i++) {
        const diff = newHistory[i] - newHistory[i - 1];
        if (diff > 0) gains += diff; else losses -= diff;
      }
      const rs = losses === 0 ? 100 : gains / losses;
      updated.rsi = 100 - 100 / (1 + rs);

      // Momentum
      const mom = newHistory.length >= 5
        ? (newHistory[newHistory.length - 1] - newHistory[newHistory.length - 5]) / (np || 1)
        : 0;
      updated.momentum = updated.momentum * 0.9 + mom * 0.1;

      if (newHistory.length >= 10) {
        const r         = computeMACD(newHistory);
        updated.ema12   = +r.ema12.toFixed(def.decimals);
        updated.ema26   = +r.ema26.toFixed(def.decimals);
        updated.macd    = +r.macd.toFixed(def.decimals + 2);
        updated.macd_signal = +r.signal.toFixed(def.decimals + 2);
        updated.macd_hist   = +r.hist.toFixed(def.decimals + 2);
      }
      if (newHistory.length >= 5) {
        const bb = computeBB(newHistory, 20, 2);
        updated.bb_upper  = +bb.upper.toFixed(def.decimals);
        updated.bb_middle = +bb.middle.toFixed(def.decimals);
        updated.bb_lower  = +bb.lower.toFixed(def.decimals);
        updated.bb_bw     = +bb.bw.toFixed(4);
      }

      const stoch = computeStochastic(newHistory);
      updated.stoch_k = +stoch.k.toFixed(2);
      updated.stoch_d = +stoch.d.toFixed(2);
      updated.cci     = +computeCCI(newHistory).toFixed(2);

      // Candles
      updated.candle_ticks = (p.candle_ticks || 0) + 1;
      updated.candle_high  = Math.max(p.candle_high || np, np);
      updated.candle_low   = Math.min(p.candle_low  || np, np);
      if (updated.candle_ticks >= CANDLE_PERIOD) {
        const candles = Array.isArray(p.candles) ? [...p.candles] : [];
        candles.push({ o: p.candle_open || p.price, h: updated.candle_high, l: updated.candle_low, c: np, v: updated.volume, t: Date.now() });
        updated.candles      = candles.slice(-48);
        updated.candle_open  = np;
        updated.candle_high  = np;
        updated.candle_low   = np;
        updated.candle_ticks = 0;
      }

      return updated;
      } catch (err) {
        console.error(`[ForexSimulation] Error on pair ${p.pair}:`, err.message);
        return p; // keep last-known-good state
      }
    });

    this._pairs = newPairs;
    return { pairs: newPairs };
  }

  /** Basic sanity check — throws on invariant violations. */
  validate() {
    for (const p of this._pairs) {
      if (!isFinite(p.price) || p.price <= 0)
        throw new RangeError(`Forex pair ${p.pair} has invalid price: ${p.price}`);
      const def = PAIR_DEFS[p.pair];
      if (def && (p.price > def.basePrice * 3 || p.price < def.basePrice * 0.3))
        throw new RangeError(`Forex pair ${p.pair} price ${p.price} is >3x or <0.3x base — possible runaway`);
    }
    return true;
  }
}
