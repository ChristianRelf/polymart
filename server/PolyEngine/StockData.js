/**
 * PolyEngine · StockData
 *
 * Single source of truth for all static stock market data:
 * sector definitions, stock definitions, and market events.
 *
 * Nothing here is mutable at runtime. All simulation state lives in
 * StockSimulation. Import these as constants — never modify them.
 */

// ── Validation helpers ────────────────────────────────────────────────────────

function assertString(v, field) {
  if (typeof v !== 'string' || !v) throw new TypeError(`StockData: ${field} must be a non-empty string`);
}
function assertNumber(v, field, min = -Infinity, max = Infinity) {
  if (typeof v !== 'number' || !isFinite(v) || v < min || v > max)
    throw new RangeError(`StockData: ${field} must be a finite number in [${min}, ${max}], got ${v}`);
}
function assertOneOf(v, allowed, field) {
  if (!allowed.includes(v)) throw new TypeError(`StockData: ${field} must be one of [${allowed.join(', ')}], got "${v}"`);
}

// ── Sector registry ───────────────────────────────────────────────────────────

/** @type {Record<string, { label: string; icon: string }>} */
export const SECTORS = {
  tech:      { label: "Tech",          icon: "💻" },
  food:      { label: "Food & Bev",    icon: "🍔" },
  space:     { label: "Space",         icon: "🚀" },
  meme:      { label: "Meme",          icon: "🐸" },
  green:     { label: "Green Energy",  icon: "🌿" },
  finance:   { label: "Finance",       icon: "🏦" },
  gaming:    { label: "Gaming",        icon: "🎮" },
  health:    { label: "Health",        icon: "💊" },
  crypto:    { label: "Crypto",        icon: "₿"  },
  defence:   { label: "Defence",       icon: "🛡️" },
  retail:    { label: "Retail",        icon: "🛒" },
  media:     { label: "Media",         icon: "📺" },
  auto:      { label: "Auto",          icon: "🚗" },
  realty:    { label: "Real Estate",   icon: "🏢" },
  travel:    { label: "Travel",        icon: "✈️" },
  ai:        { label: "AI & ML",       icon: "🤖" },
  bio:       { label: "Biotech",       icon: "🧬" },
  energy:    { label: "Energy",        icon: "⚡" },
  logistics: { label: "Logistics",     icon: "📦" },
  agri:      { label: "Agriculture",   icon: "🌾" },
};

export const SECTOR_KEYS = /** @type {const} */ (Object.freeze(Object.keys(SECTORS)));

// ── Stock definition schema ───────────────────────────────────────────────────

/**
 * @typedef {Object} StockDef
 * @property {string}                name       Full company name
 * @property {number}                basePrice  Starting/fair-value price
 * @property {number}                volatility Per-tick 1-sigma (fraction, e.g. 0.11)
 * @property {number}                trend      Long-run drift per tick (fraction)
 * @property {string}                sector     Must be a key in SECTORS
 * @property {"large"|"mid"|"small"} mcap       Market cap tier
 */

const MCAP_VALUES = ['large', 'mid', 'small'];

/**
 * Validate a single stock definition entry at load time.
 * Throws on any schema violation so bad data is caught immediately.
 * @param {string} ticker
 * @param {StockDef} d
 */
function validateStockDef(ticker, d) {
  assertString(ticker, `STOCK_DEFS key`);
  if (!/^[A-Z]{2,5}$/.test(ticker))
    throw new TypeError(`StockData: ticker "${ticker}" must be 2-5 uppercase letters`);
  assertString(d.name, `${ticker}.name`);
  assertNumber(d.basePrice, `${ticker}.basePrice`, 0.01, 100_000);
  assertNumber(d.volatility, `${ticker}.volatility`, 0, 1);
  assertNumber(d.trend, `${ticker}.trend`, -0.1, 0.1);
  if (!SECTORS[d.sector]) throw new TypeError(`StockData: ${ticker}.sector "${d.sector}" is not a known sector`);
  assertOneOf(d.mcap, MCAP_VALUES, `${ticker}.mcap`);
}

// ── Stock definitions ─────────────────────────────────────────────────────────

/** @type {Record<string, StockDef>} */
const _STOCK_DEFS_RAW = {
  // Tech
  APEX: {name:"Apex AI Corp",          basePrice:420, volatility:.11, trend:.002,  sector:"tech",     mcap:"large"},
  VOID: {name:"VoidTech Solutions",    basePrice:550, volatility:.09, trend:-.001, sector:"tech",     mcap:"large"},
  ROBO: {name:"RoboWaiter Ltd.",       basePrice:180, volatility:.07, trend:.003,  sector:"tech",     mcap:"mid"},
  CHIP: {name:"ChipForge Semis",       basePrice:290, volatility:.08, trend:.002,  sector:"tech",     mcap:"large"},
  QBIT: {name:"QubitCore Quantum",     basePrice:340, volatility:.13, trend:.003,  sector:"tech",     mcap:"mid"},
  SYNC: {name:"SyncWave Systems",      basePrice:95,  volatility:.07, trend:.001,  sector:"tech",     mcap:"small"},
  CLOD: {name:"CloudNest Computing",   basePrice:310, volatility:.09, trend:.002,  sector:"tech",     mcap:"large"},
  NETX: {name:"NetX Fiber Optics",     basePrice:74,  volatility:.06, trend:.001,  sector:"tech",     mcap:"mid"},
  SCAN: {name:"ScanSec Cyber",         basePrice:142, volatility:.10, trend:.002,  sector:"tech",     mcap:"mid"},
  DBYT: {name:"DataByte Analytics",    basePrice:220, volatility:.08, trend:.002,  sector:"tech",     mcap:"large"},
  PROX: {name:"ProxyShield VPN",       basePrice:58,  volatility:.07, trend:.001,  sector:"tech",     mcap:"small"},
  // Food
  NOOD: {name:"Noodle Network Inc.",   basePrice:15,  volatility:.14, trend:-.001, sector:"food",     mcap:"small"},
  FIZZ: {name:"FizzBuzz Beverages",    basePrice:62,  volatility:.07, trend:.001,  sector:"food",     mcap:"mid"},
  BURG: {name:"BurgerDAO",             basePrice:38,  volatility:.09, trend:.001,  sector:"food",     mcap:"small"},
  BREW: {name:"BrewChain Coffee",      basePrice:48,  volatility:.06, trend:.002,  sector:"food",     mcap:"mid"},
  SNAK: {name:"SnackVault Global",     basePrice:72,  volatility:.05, trend:.001,  sector:"food",     mcap:"mid"},
  // Space
  MOON: {name:"MoonShot Aerospace",    basePrice:320, volatility:.08, trend:.002,  sector:"space",    mcap:"large"},
  ORBT: {name:"OrbitX Logistics",      basePrice:210, volatility:.08, trend:.001,  sector:"space",    mcap:"mid"},
  MARS: {name:"Mars Colony Inc.",      basePrice:145, volatility:.12, trend:.003,  sector:"space",    mcap:"mid"},
  ASTR: {name:"AstroMine Resources",   basePrice:88,  volatility:.10, trend:.002,  sector:"space",    mcap:"small"},
  NOVA: {name:"NovaLaunch Systems",    basePrice:260, volatility:.09, trend:.001,  sector:"space",    mcap:"large"},
  // Meme
  DOGE: {name:"DogeCorp Industries",   basePrice:45,  volatility:.12, trend:.001,  sector:"meme",     mcap:"small"},
  MEME: {name:"MemeVault Holdings",    basePrice:8,   volatility:.22, trend:0,     sector:"meme",     mcap:"small"},
  YOLO: {name:"YOLO Ventures",         basePrice:5,   volatility:.28, trend:-.002, sector:"meme",     mcap:"small"},
  PEPE: {name:"PepeFinance Ltd.",      basePrice:3,   volatility:.30, trend:0,     sector:"meme",     mcap:"small"},
  STONK:{name:"StonkMarket Memes",     basePrice:12,  volatility:.25, trend:.001,  sector:"meme",     mcap:"small"},
  BONK: {name:"BonkCoin Corp",         basePrice:2,   volatility:.35, trend:0,     sector:"meme",     mcap:"small"},
  FOMO: {name:"FOMO Markets Ltd",      basePrice:7,   volatility:.30, trend:-.001, sector:"meme",     mcap:"small"},
  LAMBO:{name:"LamboDAO",              basePrice:4,   volatility:.32, trend:.001,  sector:"meme",     mcap:"small"},
  QUAK: {name:"DuckPond Holdings",     basePrice:6,   volatility:.28, trend:.001,  sector:"meme",     mcap:"small"},
  // Green
  GRDN: {name:"GreenGarden Bio",       basePrice:95,  volatility:.06, trend:.002,  sector:"green",    mcap:"mid"},
  SPRK: {name:"SparkEnergy Green",     basePrice:75,  volatility:.06, trend:.003,  sector:"green",    mcap:"mid"},
  LEAF: {name:"LeafWater Eco",         basePrice:42,  volatility:.05, trend:.002,  sector:"green",    mcap:"small"},
  WIND: {name:"WindForce Turbines",    basePrice:110, volatility:.07, trend:.002,  sector:"green",    mcap:"mid"},
  SOLR: {name:"SolarGrid Corp",        basePrice:135, volatility:.06, trend:.003,  sector:"green",    mcap:"large"},
  // Finance
  BNKR: {name:"BankerCoin Trust",      basePrice:350, volatility:.05, trend:.001,  sector:"finance",  mcap:"large"},
  LEND: {name:"LendX Protocol",        basePrice:120, volatility:.07, trend:.001,  sector:"finance",  mcap:"mid"},
  INSR: {name:"InsureAll Group",       basePrice:85,  volatility:.04, trend:.001,  sector:"finance",  mcap:"mid"},
  HEDG: {name:"HedgeFund Prime",       basePrice:480, volatility:.06, trend:.001,  sector:"finance",  mcap:"large"},
  PAYX: {name:"PayXpress Digital",     basePrice:65,  volatility:.08, trend:.002,  sector:"finance",  mcap:"mid"},
  NBNK: {name:"NeoBank Pulse",         basePrice:88,  volatility:.09, trend:.002,  sector:"finance",  mcap:"mid"},
  STBL: {name:"StableX Protocol",      basePrice:145, volatility:.06, trend:.001,  sector:"finance",  mcap:"mid"},
  WLTH: {name:"WealthBridge Fund",     basePrice:320, volatility:.05, trend:.001,  sector:"finance",  mcap:"large"},
  TOKN: {name:"TokenVault Finance",    basePrice:55,  volatility:.12, trend:.002,  sector:"finance",  mcap:"small"},
  // Gaming
  FRAG: {name:"FragStorm Studios",     basePrice:110, volatility:.10, trend:.002,  sector:"gaming",   mcap:"mid"},
  LOOT: {name:"LootCrate Gaming",      basePrice:28,  volatility:.13, trend:0,     sector:"gaming",   mcap:"small"},
  PIXEL:{name:"PixelForge Games",      basePrice:65,  volatility:.09, trend:.001,  sector:"gaming",   mcap:"mid"},
  GGWP: {name:"GG Gaming League",      basePrice:42,  volatility:.11, trend:.002,  sector:"gaming",   mcap:"small"},
  VRTX: {name:"VortexVR Studios",      basePrice:155, volatility:.10, trend:.002,  sector:"gaming",   mcap:"mid"},
  METV: {name:"MetaVerse Arena",       basePrice:88,  volatility:.13, trend:.002,  sector:"gaming",   mcap:"mid"},
  NFTR: {name:"NFT Realm Games",       basePrice:22,  volatility:.18, trend:0,     sector:"gaming",   mcap:"small"},
  ESPT: {name:"eSport Nation",         basePrice:58,  volatility:.11, trend:.002,  sector:"gaming",   mcap:"mid"},
  // Health
  CURE: {name:"CureGen Pharma",        basePrice:200, volatility:.08, trend:.002,  sector:"health",   mcap:"large"},
  VITA: {name:"VitaBoost Supps",       basePrice:30,  volatility:.06, trend:.001,  sector:"health",   mcap:"small"},
  MEDS: {name:"MedStar Biotech",       basePrice:155, volatility:.10, trend:.001,  sector:"health",   mcap:"mid"},
  GENE: {name:"GeneEdit Labs",         basePrice:280, volatility:.12, trend:.003,  sector:"health",   mcap:"mid"},
  RXAI: {name:"RxAI Diagnostics",      basePrice:92,  volatility:.09, trend:.002,  sector:"health",   mcap:"small"},
  TELE: {name:"TeleDoc Health",        basePrice:112, volatility:.08, trend:.002,  sector:"health",   mcap:"mid"},
  WLLB: {name:"WellBot AI Clinics",    basePrice:68,  volatility:.10, trend:.003,  sector:"health",   mcap:"small"},
  DNTL: {name:"DentaChain Clinics",    basePrice:44,  volatility:.07, trend:.001,  sector:"health",   mcap:"small"},
  // Crypto
  HODL: {name:"HodlCoin Exchange",     basePrice:90,  volatility:.18, trend:0,     sector:"crypto",   mcap:"mid"},
  DEFI: {name:"DeFi Dynamics",         basePrice:55,  volatility:.20, trend:.001,  sector:"crypto",   mcap:"small"},
  MINE: {name:"MineBros Digital",      basePrice:135, volatility:.15, trend:-.001, sector:"crypto",   mcap:"mid"},
  WHAL: {name:"WhalePool Capital",     basePrice:220, volatility:.16, trend:.001,  sector:"crypto",   mcap:"mid"},
  NFTX: {name:"NFTVerse Markets",      basePrice:18,  volatility:.24, trend:-.001, sector:"crypto",   mcap:"small"},
  // Defence
  TANK: {name:"TankTech Defence",      basePrice:400, volatility:.04, trend:.002,  sector:"defence",  mcap:"large"},
  SHLD: {name:"ShieldWall Systems",    basePrice:175, volatility:.05, trend:.002,  sector:"defence",  mcap:"mid"},
  DRNE: {name:"DroneStrike Aero",      basePrice:250, volatility:.06, trend:.001,  sector:"defence",  mcap:"mid"},
  ARMO: {name:"ArmorPlate Inc.",       basePrice:130, volatility:.04, trend:.001,  sector:"defence",  mcap:"mid"},
  SATL: {name:"SatelliteGuard Corp",   basePrice:280, volatility:.05, trend:.002,  sector:"defence",  mcap:"large"},
  CYBX: {name:"CyberWarX Systems",     basePrice:195, volatility:.07, trend:.002,  sector:"defence",  mcap:"mid"},
  RADS: {name:"RadarSense Tech",       basePrice:118, volatility:.05, trend:.001,  sector:"defence",  mcap:"mid"},
  // Retail
  SHOP: {name:"ShopNet Global",        basePrice:160, volatility:.07, trend:.002,  sector:"retail",   mcap:"large"},
  DLVR: {name:"DeliverFast Inc.",      basePrice:78,  volatility:.08, trend:.001,  sector:"retail",   mcap:"mid"},
  LUXE: {name:"LuxeBrand Holdings",    basePrice:340, volatility:.06, trend:.001,  sector:"retail",   mcap:"large"},
  DEAL: {name:"DealHunter Markets",    basePrice:22,  volatility:.10, trend:0,     sector:"retail",   mcap:"small"},
  CART: {name:"CartWheelCommerce",     basePrice:55,  volatility:.07, trend:.002,  sector:"retail",   mcap:"mid"},
  // Media
  STRM: {name:"StreamBox Media",       basePrice:185, volatility:.09, trend:.001,  sector:"media",    mcap:"large"},
  BUZZ: {name:"BuzzFeed Social",       basePrice:14,  volatility:.16, trend:-.001, sector:"media",    mcap:"small"},
  CAST: {name:"CastWave Podcasts",     basePrice:38,  volatility:.08, trend:.002,  sector:"media",    mcap:"small"},
  REEL: {name:"ReelTok Studios",       basePrice:95,  volatility:.11, trend:.002,  sector:"media",    mcap:"mid"},
  NEWS: {name:"NewsForge Digital",     basePrice:52,  volatility:.07, trend:0,     sector:"media",    mcap:"mid"},
  PODC: {name:"PodcastHub Global",     basePrice:36,  volatility:.09, trend:.001,  sector:"media",    mcap:"small"},
  LIVE: {name:"LiveStream Inc.",       basePrice:72,  volatility:.10, trend:.002,  sector:"media",    mcap:"mid"},
  ANIM: {name:"AnimaStudio Films",     basePrice:88,  volatility:.08, trend:.001,  sector:"media",    mcap:"mid"},
  // Auto
  EVOX: {name:"EvoX Electric Motors",  basePrice:290, volatility:.10, trend:.003,  sector:"auto",     mcap:"large"},
  VOLT: {name:"VoltDrive Autos",       basePrice:210, volatility:.09, trend:.002,  sector:"auto",     mcap:"large"},
  HYDR: {name:"HydroWheels Inc.",      basePrice:88,  volatility:.08, trend:.002,  sector:"auto",     mcap:"mid"},
  AUTN: {name:"AutoNova Robotics",     basePrice:150, volatility:.10, trend:.003,  sector:"auto",     mcap:"mid"},
  PKLOT:{name:"ParkMesh Infra",        basePrice:42,  volatility:.06, trend:.001,  sector:"auto",     mcap:"small"},
  TRKR: {name:"TruckerX Fleet",        basePrice:66,  volatility:.07, trend:.001,  sector:"auto",     mcap:"small"},
  // Real Estate
  REIT: {name:"RealCoin REIT",         basePrice:95,  volatility:.05, trend:.001,  sector:"realty",   mcap:"large"},
  PROP: {name:"PropVault Group",       basePrice:185, volatility:.04, trend:.001,  sector:"realty",   mcap:"large"},
  SPCX: {name:"SpaceEx Offices",       basePrice:68,  volatility:.06, trend:.001,  sector:"realty",   mcap:"mid"},
  LOFT: {name:"LoftDAO Residential",   basePrice:38,  volatility:.07, trend:.001,  sector:"realty",   mcap:"small"},
  BRIK: {name:"BrickChain Infra",      basePrice:52,  volatility:.05, trend:.001,  sector:"realty",   mcap:"mid"},
  // Travel
  SOAR: {name:"SoarAir Holdings",      basePrice:175, volatility:.09, trend:.001,  sector:"travel",   mcap:"large"},
  CRUZ: {name:"CruzLine Cruises",      basePrice:88,  volatility:.10, trend:.001,  sector:"travel",   mcap:"mid"},
  STAY: {name:"StayNow Hotels",        basePrice:120, volatility:.08, trend:.002,  sector:"travel",   mcap:"mid"},
  XPDT: {name:"XpeditionTours",        basePrice:44,  volatility:.11, trend:.001,  sector:"travel",   mcap:"small"},
  JETT: {name:"JetTrail Charter",      basePrice:210, volatility:.09, trend:.001,  sector:"travel",   mcap:"mid"},
  RAIL: {name:"RailConnect Trains",    basePrice:78,  volatility:.06, trend:.001,  sector:"travel",   mcap:"mid"},
  // AI
  GNAI: {name:"GenAI Systems",         basePrice:480, volatility:.14, trend:.004,  sector:"ai",       mcap:"large"},
  LMAI: {name:"LLMart Corp",           basePrice:360, volatility:.12, trend:.003,  sector:"ai",       mcap:"large"},
  NRAL: {name:"NeuralPath AI",         basePrice:195, volatility:.13, trend:.003,  sector:"ai",       mcap:"mid"},
  VISI: {name:"VisonIQ Imaging",       basePrice:108, volatility:.11, trend:.002,  sector:"ai",       mcap:"mid"},
  ORCH: {name:"Orchestron Agents",     basePrice:68,  volatility:.15, trend:.003,  sector:"ai",       mcap:"small"},
  SPKR: {name:"SpeakAI Transcription", basePrice:44,  volatility:.12, trend:.002,  sector:"ai",       mcap:"small"},
  // Biotech
  CRSP: {name:"CrisprGen Biolab",      basePrice:310, volatility:.14, trend:.003,  sector:"bio",      mcap:"large"},
  PROT: {name:"ProteX Therapeutics",   basePrice:175, volatility:.13, trend:.002,  sector:"bio",      mcap:"mid"},
  CELL: {name:"CellForge Bio",         basePrice:92,  volatility:.12, trend:.002,  sector:"bio",      mcap:"mid"},
  IMUN: {name:"ImmunoBoost Corp",      basePrice:128, volatility:.11, trend:.002,  sector:"bio",      mcap:"mid"},
  SYNT: {name:"SynthBio Labs",         basePrice:56,  volatility:.15, trend:.003,  sector:"bio",      mcap:"small"},
  MRNA: {name:"mRNAtrix Research",     basePrice:145, volatility:.13, trend:.003,  sector:"bio",      mcap:"mid"},
  // Energy
  PETR: {name:"PetroCrest Oil",        basePrice:320, volatility:.07, trend:.001,  sector:"energy",   mcap:"large"},
  NUKE: {name:"NucleoGen Power",       basePrice:240, volatility:.05, trend:.002,  sector:"energy",   mcap:"large"},
  GASX: {name:"GasFlex Pipelines",     basePrice:112, volatility:.06, trend:.001,  sector:"energy",   mcap:"mid"},
  FUSE: {name:"FusionStar Reactor",    basePrice:165, volatility:.11, trend:.003,  sector:"energy",   mcap:"mid"},
  HYDP: {name:"HydroPower Grid",       basePrice:88,  volatility:.04, trend:.001,  sector:"energy",   mcap:"mid"},
  COAL: {name:"CoalSeam Mining",       basePrice:48,  volatility:.08, trend:-.002, sector:"energy",   mcap:"small"},
  // Logistics
  SHPY: {name:"ShipYard Global",       basePrice:195, volatility:.06, trend:.002,  sector:"logistics",mcap:"large"},
  DRON: {name:"DroneDelivery Net",     basePrice:78,  volatility:.10, trend:.003,  sector:"logistics",mcap:"mid"},
  FRTX: {name:"FreightX Express",      basePrice:130, volatility:.07, trend:.002,  sector:"logistics",mcap:"mid"},
  LAST: {name:"LastMile Robotics",     basePrice:55,  volatility:.11, trend:.003,  sector:"logistics",mcap:"small"},
  WRHX: {name:"WareHouseX Auto",       basePrice:44,  volatility:.08, trend:.002,  sector:"logistics",mcap:"small"},
  COLD: {name:"ColdChain Logistics",   basePrice:68,  volatility:.06, trend:.001,  sector:"logistics",mcap:"mid"},
  // Agriculture
  FARM: {name:"FarmTech Robotics",     basePrice:88,  volatility:.07, trend:.002,  sector:"agri",     mcap:"mid"},
  SEED: {name:"SeedVault Genomics",    basePrice:62,  volatility:.09, trend:.002,  sector:"agri",     mcap:"mid"},
  AQUA: {name:"AquaFarm Systems",      basePrice:38,  volatility:.08, trend:.002,  sector:"agri",     mcap:"small"},
  FRTL: {name:"FertiLux Corp",         basePrice:52,  volatility:.06, trend:.001,  sector:"agri",     mcap:"small"},
  HVST: {name:"HarvestAI Drones",      basePrice:75,  volatility:.10, trend:.003,  sector:"agri",     mcap:"mid"},
  GRAI: {name:"GrainEx Trading",       basePrice:44,  volatility:.07, trend:.001,  sector:"agri",     mcap:"small"},
};

// Validate every definition at module load (not at runtime per tick).
for (const [ticker, def] of Object.entries(_STOCK_DEFS_RAW)) {
  validateStockDef(ticker, def);
}

/** Immutable stock definitions. */
export const STOCK_DEFS = Object.freeze(_STOCK_DEFS_RAW);

export const TICKERS = Object.freeze(Object.keys(STOCK_DEFS));

// ── Event definition schema ───────────────────────────────────────────────────

/**
 * @typedef {Object} EventDef
 * @property {string}          text     Human-readable description
 * @property {number}          effect   Market-wide price impact fraction (-1..1)
 * @property {number}          weight   Relative frequency (higher = more common)
 * @property {string}          category "macro" | "earnings" | "event"
 * @property {string|undefined} sector  Affected sector key (undefined = all sectors)
 */

/**
 * @param {number} i
 * @param {EventDef} e
 */
function validateEvent(e, i) {
  assertString(e.text, `EVENTS[${i}].text`);
  assertNumber(e.effect, `EVENTS[${i}].effect`, -1, 1);
  assertNumber(e.weight, `EVENTS[${i}].weight`, 1, 10);
  assertOneOf(e.category, ['macro', 'earnings', 'event'], `EVENTS[${i}].category`);
  if (e.sector !== undefined && !SECTORS[e.sector])
    throw new TypeError(`StockData: EVENTS[${i}].sector "${e.sector}" is not a known sector`);
}

/** @type {EventDef[]} */
const _EVENTS_RAW = [
  // ── Macro ──────────────────────────────────────────────────────────────────
  {text:"Federal Reserve announces rate cut",                   effect:.05,  weight:2, category:"macro"},
  {text:"Federal Reserve raises rates 50bp",                   effect:-.04, weight:2, category:"macro"},
  {text:"Inflation above expectations - CPI +0.6%",            effect:-.04, weight:2, category:"macro"},
  {text:"Core inflation cools to 2.1% - below target",         effect:.04,  weight:2, category:"macro"},
  {text:"Bull market rally continues - S&P hits ATH",          effect:.03,  weight:1, category:"macro"},
  {text:"Recession fears escalate - yield curve inverts",      effect:-.06, weight:2, category:"macro"},
  {text:"Global trade deal signed - tariffs cut 30%",          effect:.05,  weight:2, category:"macro"},
  {text:"Trade war escalation - new 25% tariffs imposed",      effect:-.05, weight:2, category:"macro"},
  {text:"Oil prices surge 12% on OPEC cuts",                   effect:-.03, weight:1, category:"macro"},
  {text:"Brent crude hits $120 - energy costs spike",          effect:-.03, weight:2, category:"macro"},
  {text:"Consumer confidence hits 10yr high",                  effect:.02,  weight:1, category:"macro"},
  {text:"Consumer sentiment crashes - lowest since 2008",      effect:-.04, weight:2, category:"macro"},
  {text:"Flash crash triggers circuit breakers",               effect:-.09, weight:3, category:"macro"},
  {text:"Record IPO week - 12 listings raise $45B",            effect:.03,  weight:1, category:"macro"},
  {text:"Geopolitical tensions spike - conflict fears",        effect:-.05, weight:2, category:"macro"},
  {text:"Ceasefire agreement - geopolitical risk off",         effect:.04,  weight:2, category:"macro"},
  {text:"GDP growth beats forecasts - 3.8% annualised",        effect:.04,  weight:2, category:"macro"},
  {text:"GDP contracts 0.4% - technical recession",            effect:-.06, weight:3, category:"macro"},
  {text:"Bond yields invert 2s10s - recession signal",         effect:-.04, weight:2, category:"macro"},
  {text:"$2T infrastructure package passes Congress",          effect:.04,  weight:2, category:"macro"},
  {text:"Government shutdown looms - debt ceiling stalls",     effect:-.03, weight:2, category:"macro"},
  {text:"Supply chain crisis deepens - shipping costs +40%",   effect:-.03, weight:1, category:"macro"},
  {text:"Unemployment at historic low 3.2%",                   effect:.03,  weight:1, category:"macro"},
  {text:"Non-farm payrolls disappoint - +85K vs 200K exp",     effect:-.03, weight:2, category:"macro"},
  {text:"Dollar weakens - DXY falls 2% on Fed pivot bets",     effect:.02,  weight:1, category:"macro"},
  {text:"Dollar spikes - DXY +2.5% risk-off rally",            effect:-.02, weight:1, category:"macro"},
  {text:"10yr Treasury yield crosses 5% - risk selloff",       effect:-.04, weight:2, category:"macro"},
  {text:"FOMC holds rates - dovish language surprises",        effect:.03,  weight:2, category:"macro"},
  {text:"Sovereign debt downgrade - Fitch cuts AAA",           effect:-.05, weight:2, category:"macro"},
  {text:"IMF raises global growth outlook to 3.4%",            effect:.03,  weight:1, category:"macro"},
  // ── Tech ───────────────────────────────────────────────────────────────────
  {text:"AI breakthrough - GPT-6 surpasses human reasoning",  effect:.08,  weight:3, category:"earnings", sector:"tech"},
  {text:"Data breach exposes 500M accounts - SEC probe",       effect:-.06, weight:2, category:"event",    sector:"tech"},
  {text:"$100B tech buyback announced",                        effect:.05,  weight:2, category:"event",    sector:"tech"},
  {text:"DOJ antitrust breakup lawsuit filed",                 effect:-.05, weight:2, category:"event",    sector:"tech"},
  {text:"Quantum computing - 1M qubit milestone",              effect:.06,  weight:2, category:"event",    sector:"tech"},
  {text:"Semiconductor supply crunch - lead times +18wk",      effect:-.04, weight:2, category:"event",    sector:"tech"},
  {text:"Chip fab opens - $80B TSMC US plant online",          effect:.04,  weight:2, category:"event",    sector:"tech"},
  {text:"Major cloud outage - AWS us-east down 6hrs",          effect:-.05, weight:2, category:"event",    sector:"tech"},
  {text:"Tech earnings season beats - avg EPS +18%",           effect:.06,  weight:2, category:"earnings", sector:"tech"},
  {text:"Tech earnings disappoint - revenue guidance cut",     effect:-.06, weight:2, category:"earnings", sector:"tech"},
  // ── Food ───────────────────────────────────────────────────────────────────
  {text:"Superfood trend goes viral - quinoa +300%",           effect:.04,  weight:1, category:"event",    sector:"food"},
  {text:"E. coli outbreak - 400K cases, mass recall",          effect:-.06, weight:2, category:"event",    sector:"food"},
  {text:"Lab-grown meat FDA approved - commercial launch",     effect:.05,  weight:2, category:"event",    sector:"food"},
  {text:"Food inflation +8% - input costs surge",              effect:-.03, weight:1, category:"macro",    sector:"food"},
  // ── Space ──────────────────────────────────────────────────────────────────
  {text:"$80B NASA commercial contract awarded",               effect:.07,  weight:2, category:"event",    sector:"space"},
  {text:"Rocket test catastrophic failure - crew ok",          effect:-.07, weight:2, category:"event",    sector:"space"},
  {text:"Commercial moon landing succeeds - first cargo",      effect:.09,  weight:3, category:"event",    sector:"space"},
  {text:"Mars mission approval - $420B decade programme",      effect:.08,  weight:2, category:"event",    sector:"space"},
  {text:"Satellite collision - $2B debris field",              effect:-.05, weight:2, category:"event",    sector:"space"},
  // ── Meme ───────────────────────────────────────────────────────────────────
  {text:"Meme stock frenzy erupts - WSB pile in",              effect:.12,  weight:3, category:"event",    sector:"meme"},
  {text:"Viral TikTok pumps meme sector +20%",                 effect:.15,  weight:3, category:"event",    sector:"meme"},
  {text:"Meme bubble bursts - 60% intraday crash",             effect:-.12, weight:3, category:"event",    sector:"meme"},
  {text:"Influencer dumps position - fraud probe opened",      effect:-.09, weight:2, category:"event",    sector:"meme"},
  {text:"Short squeeze alert - 40% short interest",            effect:.14,  weight:3, category:"event",    sector:"meme"},
  // ── Green ──────────────────────────────────────────────────────────────────
  {text:"$500B green subsidy package - IRA expansion",         effect:.06,  weight:2, category:"event",    sector:"green"},
  {text:"Solid-state battery breakthrough - 800Wh/kg",         effect:.07,  weight:2, category:"event",    sector:"green"},
  {text:"Carbon credit price collapses - fraud scandal",       effect:-.05, weight:2, category:"event",    sector:"green"},
  {text:"Solar panel efficiency record - 47.6%",               effect:.05,  weight:1, category:"event",    sector:"green"},
  // ── Finance ────────────────────────────────────────────────────────────────
  {text:"Central bank dovish pivot - balance sheet expands",   effect:.04,  weight:2, category:"macro",    sector:"finance"},
  {text:"Major bank $8B trading loss - rogue desk",            effect:-.06, weight:2, category:"earnings", sector:"finance"},
  {text:"Stress tests passed - banks cleared for buybacks",    effect:.04,  weight:1, category:"event",    sector:"finance"},
  {text:"Credit default swaps spike - systemic risk fears",    effect:-.07, weight:3, category:"event",    sector:"finance"},
  {text:"Payment giant acquires neobank for $24B",             effect:.05,  weight:2, category:"event",    sector:"finance"},
  {text:"Fintech earnings beat - revenue +35% YoY",            effect:.05,  weight:2, category:"earnings", sector:"finance"},
  {text:"Loan defaults spike 8% - credit quality drops",       effect:-.05, weight:2, category:"event",    sector:"finance"},
  // ── Gaming ─────────────────────────────────────────────────────────────────
  {text:"Blockbuster game launch - 50M copies day one",        effect:.07,  weight:2, category:"earnings", sector:"gaming"},
  {text:"E-sports $2B broadcast deal - Netflix + EA",          effect:.06,  weight:2, category:"event",    sector:"gaming"},
  {text:"Gaming studio layoffs - 2,200 jobs cut",              effect:-.05, weight:2, category:"event",    sector:"gaming"},
  {text:"Console shortage resolved - supply normalises",       effect:.04,  weight:1, category:"event",    sector:"gaming"},
  // ── Health ─────────────────────────────────────────────────────────────────
  {text:"FDA fast-tracks breakthrough drug approval",          effect:.08,  weight:2, category:"event",    sector:"health"},
  {text:"Phase 3 trial fails - primary endpoint missed",       effect:-.07, weight:2, category:"earnings", sector:"health"},
  {text:"CRISPR gene therapy - 95% efficacy confirmed",        effect:.09,  weight:3, category:"event",    sector:"health"},
  {text:"Drug pricing reform bill passes - margin squeeze",    effect:-.06, weight:2, category:"macro",    sector:"health"},
  {text:"Health earnings season - avg EPS +12%",               effect:.05,  weight:2, category:"earnings", sector:"health"},
  {text:"WHO declares health emergency",                       effect:-.07, weight:2, category:"event",    sector:"health"},
  // ── Crypto ─────────────────────────────────────────────────────────────────
  {text:"Bitcoin breaks $200K - halving rally continues",      effect:.12,  weight:3, category:"event",    sector:"crypto"},
  {text:"Exchange hacked - $2B stolen, withdrawals frozen",    effect:-.14, weight:3, category:"event",    sector:"crypto"},
  {text:"SEC approves spot crypto ETF - $60B inflows",         effect:.10,  weight:3, category:"event",    sector:"crypto"},
  {text:"Stablecoin de-pegs - $40B wiped in 24hrs",            effect:-.12, weight:3, category:"event",    sector:"crypto"},
  {text:"Crypto exchange bankruptcy - $8B creditor loss",      effect:-.10, weight:3, category:"event",    sector:"crypto"},
  {text:"Central bank digital currency launches",              effect:-.05, weight:2, category:"macro",    sector:"crypto"},
  // ── Defence ────────────────────────────────────────────────────────────────
  {text:"Defence budget +12% YoY - geopolitical premium",     effect:.05,  weight:2, category:"macro",    sector:"defence"},
  {text:"$30B hypersonic drone contract awarded",              effect:.06,  weight:2, category:"event",    sector:"defence"},
  {text:"Arms export ban - allied nations sanctions",          effect:-.05, weight:2, category:"event",    sector:"defence"},
  {text:"Defence earnings - backlog hits record $420B",        effect:.06,  weight:2, category:"earnings", sector:"defence"},
  // ── Retail ─────────────────────────────────────────────────────────────────
  {text:"Holiday sales smash records - online +22%",           effect:.06,  weight:2, category:"earnings", sector:"retail"},
  {text:"500 store closures - foot traffic down 30%",          effect:-.06, weight:2, category:"event",    sector:"retail"},
  {text:"Luxury demand rebounds - China buying surge",         effect:.05,  weight:2, category:"event",    sector:"retail"},
  {text:"Retail earnings miss - inventory glut builds",        effect:-.05, weight:2, category:"earnings", sector:"retail"},
  // ── Media ──────────────────────────────────────────────────────────────────
  {text:"Streaming hits 500M subs - first profitability",      effect:.07,  weight:2, category:"earnings", sector:"media"},
  {text:"Ad revenue plummets - programmatic CPM -40%",         effect:-.06, weight:2, category:"earnings", sector:"media"},
  {text:"Content strike ends - 8-month production halt over",  effect:.04,  weight:1, category:"event",    sector:"media"},
  {text:"Social media regulation passed - algorithmic limits", effect:-.04, weight:2, category:"macro",    sector:"media"},
  // ── AI ─────────────────────────────────────────────────────────────────────
  {text:"AGI milestone declared - Turing test defeated",       effect:.14,  weight:3, category:"event",    sector:"ai"},
  {text:"AI regulation framework - EU AI Act phase 2",         effect:-.07, weight:2, category:"macro",    sector:"ai"},
  {text:"AI safety benchmark - model alignment proven",        effect:.06,  weight:2, category:"event",    sector:"ai"},
  {text:"AI copyright lawsuit - $120B class action",           effect:-.05, weight:2, category:"event",    sector:"ai"},
  {text:"AI data centre investment - $200B capex cycle",       effect:.08,  weight:2, category:"event",    sector:"ai"},
  {text:"AI hallucination scandal - enterprise pullback",      effect:-.06, weight:2, category:"event",    sector:"ai"},
  // ── Biotech ────────────────────────────────────────────────────────────────
  {text:"Universal cancer vaccine - Phase 3 success",          effect:.12,  weight:3, category:"event",    sector:"bio"},
  {text:"Clinical trial halted - safety signal detected",      effect:-.09, weight:2, category:"event",    sector:"bio"},
  {text:"Longevity drug enters Phase 2 - 40yr lifespan ext",   effect:.08,  weight:2, category:"event",    sector:"bio"},
  {text:"Biotech M&A wave - sector premium +20%",              effect:.07,  weight:2, category:"event",    sector:"bio"},
  // ── Auto ───────────────────────────────────────────────────────────────────
  {text:"Self-driving Level 5 - full regulatory approval",     effect:.09,  weight:3, category:"event",    sector:"auto"},
  {text:"Mass EV recall - 400K units, battery fire risk",      effect:-.08, weight:2, category:"event",    sector:"auto"},
  {text:"$50B EV charging network deal - nationwide",          effect:.06,  weight:2, category:"event",    sector:"auto"},
  {text:"Battery fire scandal - 12 fatalities, DOT probe",     effect:-.07, weight:2, category:"event",    sector:"auto"},
  {text:"Auto earnings - EV margin turns positive first time", effect:.06,  weight:2, category:"earnings", sector:"auto"},
  // ── Real Estate ────────────────────────────────────────────────────────────
  {text:"Mortgage rates hit decade low 3.2%",                  effect:.07,  weight:2, category:"macro",    sector:"realty"},
  {text:"Housing bubble fears - prices up 28% in 12mo",        effect:-.06, weight:2, category:"event",    sector:"realty"},
  {text:"Remote work suburban boom - exurb demand +45%",       effect:.05,  weight:1, category:"event",    sector:"realty"},
  {text:"Commercial real estate defaults surge 15%",           effect:-.07, weight:2, category:"event",    sector:"realty"},
  // ── Travel ─────────────────────────────────────────────────────────────────
  {text:"Tourism hits post-pandemic record - 2B arrivals",     effect:.07,  weight:2, category:"event",    sector:"travel"},
  {text:"Pandemic variant - new travel bans imposed",          effect:-.08, weight:2, category:"event",    sector:"travel"},
  {text:"Supersonic jet commercial launch - 3hr NY-London",    effect:.06,  weight:2, category:"event",    sector:"travel"},
  {text:"Airline fuel costs spike - hedges expire",            effect:-.05, weight:2, category:"event",    sector:"travel"},
  // ── Energy ─────────────────────────────────────────────────────────────────
  {text:"OPEC+ cuts production 3M bpd - oil surges",           effect:.08,  weight:3, category:"event",    sector:"energy"},
  {text:"Fusion reactor - 30-second sustained reaction",       effect:.12,  weight:3, category:"event",    sector:"energy"},
  {text:"Carbon tax triples - fossil fuel margin squeeze",     effect:-.06, weight:2, category:"macro",    sector:"energy"},
  {text:"Major refinery explosion - 800K bpd offline",         effect:-.07, weight:2, category:"event",    sector:"energy"},
  {text:"Strategic petroleum reserve release - prices ease",   effect:-.04, weight:2, category:"event",    sector:"energy"},
  // ── Logistics ──────────────────────────────────────────────────────────────
  {text:"Port strike halts $500B trade - 3wk blockage",        effect:-.07, weight:2, category:"event",    sector:"logistics"},
  {text:"Drone delivery fully legalized - 50 countries",       effect:.09,  weight:3, category:"event",    sector:"logistics"},
  {text:"AI supply chain - 30% cost reduction benchmark",      effect:.06,  weight:2, category:"event",    sector:"logistics"},
  {text:"Panama Canal drought - capacity down 40%",            effect:-.06, weight:2, category:"event",    sector:"logistics"},
  // ── Agriculture ────────────────────────────────────────────────────────────
  {text:"Global drought - wheat yields down 25%",              effect:-.07, weight:2, category:"event",    sector:"agri"},
  {text:"Vertical farming revolution - 10x yield density",     effect:.07,  weight:2, category:"event",    sector:"agri"},
  {text:"Fertilizer shortage crisis - natural gas link",       effect:-.06, weight:2, category:"event",    sector:"agri"},
  {text:"Gene-edited crop approval - EU lifts GMO ban",        effect:.08,  weight:2, category:"event",    sector:"agri"},
  {text:"Commodity supercycle - grain futures limit up",       effect:.06,  weight:2, category:"event",    sector:"agri"},
];

_EVENTS_RAW.forEach(validateEvent);

export const EVENTS = Object.freeze(_EVENTS_RAW);

// ── Weighted event sampler ────────────────────────────────────────────────────

/** Pre-built weighted pool: each event repeated `weight` times for O(1) sampling. */
const _WEIGHTED_POOL = Object.freeze(
  _EVENTS_RAW.flatMap(e => Array.from({ length: e.weight }, () => e))
);

/**
 * Sample a random event from the weighted pool.
 * Returns null to represent "no event this tick" — callers should call this
 * conditionally based on their desired event probability.
 * @returns {EventDef}
 */
export function sampleEvent() {
  return _WEIGHTED_POOL[Math.floor(Math.random() * _WEIGHTED_POOL.length)];
}

// ── Market cap multiplier ─────────────────────────────────────────────────────

/**
 * Larger caps are more stable; smaller caps are more volatile.
 * @param {"large"|"mid"|"small"} mcap
 * @returns {number}
 */
export function mcapVolatilityMultiplier(mcap) {
  if (mcap === 'large')  return 1.0;
  if (mcap === 'mid')    return 1.3;
  if (mcap === 'small')  return 1.6;
  throw new RangeError(`Unknown mcap: ${mcap}`);
}
