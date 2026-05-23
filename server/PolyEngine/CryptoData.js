/**
 * PolyEngine · CryptoData
 *
 * Single source of truth for all static crypto market data:
 * category definitions, coin definitions, and crypto events.
 *
 * Nothing here is mutable at runtime. All simulation state lives in
 * CryptoSimulation. Import these as constants — never modify them.
 */

// ── Validation helpers ────────────────────────────────────────────────────────

function assertString(v, field) {
  if (typeof v !== 'string' || !v) throw new TypeError(`CryptoData: ${field} must be a non-empty string`);
}
function assertNumber(v, field, min = -Infinity, max = Infinity) {
  if (typeof v !== 'number' || !isFinite(v) || v < min || v > max)
    throw new RangeError(`CryptoData: ${field} must be a finite number in [${min}, ${max}], got ${v}`);
}
function assertOneOf(v, allowed, field) {
  if (!allowed.includes(v)) throw new TypeError(`CryptoData: ${field} must be one of [${allowed.join(', ')}], got "${v}"`);
}

// ── Category registry ─────────────────────────────────────────────────────────

/** @type {Record<string, { label: string; icon: string }>} */
export const CRYPTO_CATEGORIES = {
  l1:         { label: "Layer 1",        icon: "⛓️" },
  l2:         { label: "Layer 2",        icon: "🔗" },
  defi:       { label: "DeFi",           icon: "🏦" },
  meme:       { label: "Meme",           icon: "🐸" },
  gamefi:     { label: "GameFi",         icon: "🎮" },
  ai:         { label: "AI Crypto",      icon: "🤖" },
  privacy:    { label: "Privacy",        icon: "🔒" },
  infra:      { label: "Infrastructure", icon: "🏗️" },
  oracle:     { label: "Oracle",         icon: "🔮" },
  exchange:   { label: "Exchange",       icon: "💱" },
  metaverse:  { label: "Metaverse",      icon: "🌐" },
  stablecoin: { label: "Stablecoin",     icon: "🪙" },
};

export const CRYPTO_CATEGORY_KEYS = /** @type {const} */ (Object.freeze(Object.keys(CRYPTO_CATEGORIES)));

// ── Coin definition schema ────────────────────────────────────────────────────

/**
 * @typedef {Object} CryptoDef
 * @property {string}                     name
 * @property {string}                     category          Key in CRYPTO_CATEGORIES
 * @property {number}                     basePrice         USD price
 * @property {number}                     volatility        Per-tick 1-sigma fraction
 * @property {number}                     trend             Long-run drift per tick
 * @property {number}                     circulating_supply Units in circulation
 * @property {number}                     total_supply       Max supply (use 1e18 for uncapped)
 * @property {string}                     blockchain         Chain name
 * @property {string}                     consensus          Mechanism: PoW|PoS|PoH|DPoS|PoA|DAG|Hybrid
 * @property {"large"|"mid"|"small"}      mcap_tier
 * @property {string}                     description
 */

const MCAP_TIER_VALUES = ['large', 'mid', 'small'];
const CONSENSUS_VALUES = ['PoW', 'PoS', 'PoH', 'DPoS', 'PoA', 'DAG', 'Hybrid'];

/**
 * @param {string} symbol
 * @param {CryptoDef} d
 */
function validateCryptoDef(symbol, d) {
  assertString(symbol, 'CRYPTO_DEFS key');
  if (!/^[A-Z0-9]{2,8}$/.test(symbol))
    throw new TypeError(`CryptoData: symbol "${symbol}" must be 2-8 uppercase letters/digits`);
  assertString(d.name, `${symbol}.name`);
  if (!CRYPTO_CATEGORIES[d.category])
    throw new TypeError(`CryptoData: ${symbol}.category "${d.category}" is not a known category`);
  assertNumber(d.basePrice, `${symbol}.basePrice`, 1e-9, 1e9);
  assertNumber(d.volatility, `${symbol}.volatility`, 0, 1);
  assertNumber(d.trend, `${symbol}.trend`, -0.1, 0.1);
  assertNumber(d.circulating_supply, `${symbol}.circulating_supply`, 1, 1e21);
  assertNumber(d.total_supply, `${symbol}.total_supply`, 1, 1e21);
  assertString(d.blockchain, `${symbol}.blockchain`);
  assertOneOf(d.consensus, CONSENSUS_VALUES, `${symbol}.consensus`);
  assertOneOf(d.mcap_tier, MCAP_TIER_VALUES, `${symbol}.mcap_tier`);
  assertString(d.description, `${symbol}.description`);
}

// ── Coin definitions ──────────────────────────────────────────────────────────

/** @type {Record<string, CryptoDef>} */
const _CRYPTO_DEFS_RAW = {
  // ── Layer 1 (18) ─────────────────────────────────────────────────────────────
  BTCX:   {name:"BitcoreX",              category:"l1", basePrice:68000, volatility:.08, trend:.001,  circulating_supply:19_700_000,    total_supply:21_000_000,      blockchain:"PolyChain",       consensus:"PoW",   mcap_tier:"large", description:"The original proof-of-work flagship; the benchmark for all crypto markets."},
  SOLX:   {name:"SolarChain Protocol",   category:"l1", basePrice:142,   volatility:.18, trend:.002,  circulating_supply:455_000_000,   total_supply:600_000_000,     blockchain:"SolarChain",      consensus:"PoH",   mcap_tier:"large", description:"High-throughput L1 using proof-of-history ordering for sub-second finality."},
  AVAX2:  {name:"AvalancheX",            category:"l1", basePrice:38,    volatility:.20, trend:.001,  circulating_supply:398_000_000,   total_supply:720_000_000,     blockchain:"AvalancheX",      consensus:"Hybrid",mcap_tier:"large", description:"Tri-chain architecture enabling sub-second settlement across subnets."},
  COSM:   {name:"CosmosHub",             category:"l1", basePrice:9.20,  volatility:.22, trend:.001,  circulating_supply:392_000_000,   total_supply:1e18,            blockchain:"CosmosHub",       consensus:"DPoS",  mcap_tier:"mid",   description:"Internet-of-blockchains hub enabling sovereign chains to interoperate."},
  ALGX:   {name:"AlgoNet",               category:"l1", basePrice:0.18,  volatility:.20, trend:.001,  circulating_supply:8_100_000_000, total_supply:10_000_000_000,  blockchain:"AlgoNet",         consensus:"PoS",   mcap_tier:"mid",   description:"Pure proof-of-stake L1 with instant transaction finality and low fees."},
  NEER:   {name:"NearProtocol",          category:"l1", basePrice:8.10,  volatility:.22, trend:.001,  circulating_supply:1_140_000_000, total_supply:1e18,            blockchain:"NearProtocol",    consensus:"DPoS",  mcap_tier:"mid",   description:"Sharded L1 with human-readable account names and developer-first tooling."},
  POLYX:  {name:"PolyDot Relay",         category:"l1", basePrice:10.50, volatility:.18, trend:.001,  circulating_supply:1_400_000_000, total_supply:1e18,            blockchain:"PolyDotRelay",    consensus:"DPoS",  mcap_tier:"large", description:"Heterogeneous multi-chain network connecting parachains under shared security."},
  CADO:   {name:"CardoNet",              category:"l1", basePrice:0.52,  volatility:.15, trend:.001,  circulating_supply:35_800_000_000,total_supply:45_000_000_000,  blockchain:"CardoNet",        consensus:"PoS",   mcap_tier:"large", description:"Research-driven L1 built on peer-reviewed cryptography and formal verification."},
  HBARS:  {name:"HexBarrier",            category:"l1", basePrice:0.12,  volatility:.20, trend:.001,  circulating_supply:35_000_000_000,total_supply:50_000_000_000,  blockchain:"HexBarrier",      consensus:"DAG",   mcap_tier:"mid",   description:"Enterprise-grade distributed ledger using hashgraph consensus for fair ordering."},
  SUIX:   {name:"SuiLayer",              category:"l1", basePrice:1.55,  volatility:.25, trend:.002,  circulating_supply:3_300_000_000, total_supply:10_000_000_000,  blockchain:"SuiLayer",        consensus:"DPoS",  mcap_tier:"mid",   description:"Object-centric Move-based L1 enabling parallel transaction processing."},
  APTX:   {name:"AptosNet",              category:"l1", basePrice:9.40,  volatility:.25, trend:.002,  circulating_supply:600_000_000,   total_supply:1e18,            blockchain:"AptosNet",        consensus:"PoS",   mcap_tier:"mid",   description:"High-performance Move L1 derived from Diem with Block-STM parallelism."},
  INJX:   {name:"InjectiveChain",        category:"l1", basePrice:35,    volatility:.25, trend:.002,  circulating_supply:96_000_000,    total_supply:100_000_000,     blockchain:"InjectiveChain",  consensus:"DPoS",  mcap_tier:"mid",   description:"Cosmos-based L1 purpose-built for decentralised derivatives trading."},
  SEIX:   {name:"SeiParallelNet",        category:"l1", basePrice:0.55,  volatility:.25, trend:.002,  circulating_supply:5_200_000_000, total_supply:10_000_000_000,  blockchain:"SeiParallelNet",  consensus:"DPoS",  mcap_tier:"mid",   description:"First parallelised EVM chain optimised for DeFi order-book matching."},
  TONX:   {name:"TonChain",              category:"l1", basePrice:7.20,  volatility:.18, trend:.001,  circulating_supply:3_450_000_000, total_supply:5_000_000_000,   blockchain:"TonChain",        consensus:"PoS",   mcap_tier:"large", description:"Massively-sharded L1 originally designed for a messaging superapplication."},
  KSMX:   {name:"KusamaRelay",           category:"l1", basePrice:32,    volatility:.25, trend:.001,  circulating_supply:10_800_000,    total_supply:1e18,            blockchain:"KusamaRelay",     consensus:"DPoS",  mcap_tier:"small", description:"Canary network relay chain where experimental parachains launch first."},
  DOTX:   {name:"DotRelay",              category:"l1", basePrice:8.40,  volatility:.18, trend:.001,  circulating_supply:1_450_000_000, total_supply:1e18,            blockchain:"DotRelay",        consensus:"DPoS",  mcap_tier:"large", description:"Interoperability relay chain supporting parachain slot auctions and XCM messaging."},
  ATOM2:  {name:"AtomHub",               category:"l1", basePrice:9.60,  volatility:.20, trend:.001,  circulating_supply:390_000_000,   total_supply:1e18,            blockchain:"AtomHub",         consensus:"DPoS",  mcap_tier:"mid",   description:"Gravity-powered hub token for the IBC ecosystem routing cross-chain liquidity."},
  EGLD2:  {name:"MultiversX",            category:"l1", basePrice:42,    volatility:.20, trend:.001,  circulating_supply:27_600_000,    total_supply:31_400_000,      blockchain:"MultiversX",      consensus:"PoS",   mcap_tier:"mid",   description:"Adaptive state-sharded L1 aiming for internet-scale throughput."},

  // ── Layer 2 (12) ─────────────────────────────────────────────────────────────
  ARBX:   {name:"ArbitrumOne",           category:"l2", basePrice:1.22,  volatility:.22, trend:.001,  circulating_supply:3_600_000_000, total_supply:10_000_000_000,  blockchain:"ArbitrumOne",     consensus:"PoA",   mcap_tier:"large", description:"Optimistic rollup L2 settling on PolyChain with 7-day fraud proofs."},
  OPTX:   {name:"OptimismNet",           category:"l2", basePrice:2.55,  volatility:.22, trend:.001,  circulating_supply:1_400_000_000, total_supply:4_300_000_000,   blockchain:"OptimismNet",     consensus:"PoA",   mcap_tier:"large", description:"Optimistic rollup powering the OP Superchain and retroactive public goods funding."},
  MNTX:   {name:"MantleLayer",           category:"l2", basePrice:0.95,  volatility:.22, trend:.001,  circulating_supply:9_500_000_000, total_supply:16_300_000_000,  blockchain:"MantleLayer",     consensus:"PoA",   mcap_tier:"mid",   description:"Modular optimistic rollup using EigenDA for lower-cost data availability."},
  BASEX:  {name:"BaseChain Token",       category:"l2", basePrice:0.48,  volatility:.25, trend:.001,  circulating_supply:2_200_000_000, total_supply:4_000_000_000,   blockchain:"BaseChain",       consensus:"PoA",   mcap_tier:"mid",   description:"Consumer-focused L2 built on the OP Stack and governed by a blue-chip sponsor."},
  ZKSX:   {name:"ZKSyncEra",             category:"l2", basePrice:0.28,  volatility:.28, trend:.001,  circulating_supply:3_600_000_000, total_supply:21_000_000_000,  blockchain:"ZKSyncEra",       consensus:"PoA",   mcap_tier:"mid",   description:"zkEVM rollup using PLONK proofs for trustless settlement without fraud windows."},
  LINEX:  {name:"LineaNet",              category:"l2", basePrice:0.12,  volatility:.28, trend:.001,  circulating_supply:2_500_000_000, total_supply:10_000_000_000,  blockchain:"LineaNet",        consensus:"PoA",   mcap_tier:"small", description:"Type-2 zkEVM rollup backed by a major blockchain infrastructure provider."},
  POLYG:  {name:"PolygonPOS",            category:"l2", basePrice:0.72,  volatility:.20, trend:.001,  circulating_supply:9_700_000_000, total_supply:10_000_000_000,  blockchain:"PolygonPOS",      consensus:"DPoS",  mcap_tier:"large", description:"Proof-of-stake sidechain and zkEVM rollup ecosystem secured by validator checkpoints."},
  IMMBX:  {name:"ImmutableX",            category:"l2", basePrice:2.20,  volatility:.22, trend:.001,  circulating_supply:1_100_000_000, total_supply:2_000_000_000,   blockchain:"ImmutableX",      consensus:"PoA",   mcap_tier:"mid",   description:"ZK-rollup purpose-built for gasless NFT minting and gaming asset settlements."},
  SCROLLX:{name:"ScrollZK",              category:"l2", basePrice:0.42,  volatility:.28, trend:.001,  circulating_supply:1_900_000_000, total_supply:10_000_000_000,  blockchain:"ScrollZK",        consensus:"PoA",   mcap_tier:"small", description:"Bytecode-compatible zkEVM rollup prioritising EVM equivalence for easy migration."},
  METAX:  {name:"MetisAndromeda",        category:"l2", basePrice:58,    volatility:.22, trend:.001,  circulating_supply:9_600_000,     total_supply:10_000_000,      blockchain:"MetisAndromeda",  consensus:"PoS",   mcap_tier:"small", description:"Optimistic rollup with decentralised sequencer and on-chain storage layer."},
  LOOPX:  {name:"LoopringZK",            category:"l2", basePrice:0.22,  volatility:.25, trend:0,     circulating_supply:1_320_000_000, total_supply:1_374_000_000,   blockchain:"LoopringZK",      consensus:"PoA",   mcap_tier:"small", description:"zkRollup DEX protocol enabling high-frequency trading at L1 security."},
  STRKX:  {name:"StarknetL2",            category:"l2", basePrice:1.62,  volatility:.25, trend:.001,  circulating_supply:1_300_000_000, total_supply:10_000_000_000,  blockchain:"StarknetL2",      consensus:"PoA",   mcap_tier:"mid",   description:"StarkWare STARK-powered L2 with Cairo VM for provably correct computation."},

  // ── DeFi (18) ────────────────────────────────────────────────────────────────
  UNIXS:  {name:"UniSwapX Protocol",     category:"defi", basePrice:11,   volatility:.20, trend:.001,  circulating_supply:580_000_000,   total_supply:1_000_000_000,   blockchain:"SolarChain",      consensus:"PoH",   mcap_tier:"large", description:"AMM-based DEX aggregator routing swaps across liquidity pools for best execution."},
  AAVEX:  {name:"AaveX Lending",         category:"defi", basePrice:115,  volatility:.18, trend:.001,  circulating_supply:15_100_000,    total_supply:16_000_000,      blockchain:"AvalancheX",      consensus:"Hybrid",mcap_tier:"large", description:"Overcollateralised lending protocol with flash loans and isolation mode."},
  CRVX:   {name:"CurveX Finance",        category:"defi", basePrice:0.42, volatility:.22, trend:.001,  circulating_supply:2_100_000_000, total_supply:3_300_000_000,   blockchain:"PolygonPOS",      consensus:"DPoS",  mcap_tier:"mid",   description:"Stable-asset AMM with vote-escrowed governance for liquidity wars."},
  MKRX:   {name:"MakerX DAO",            category:"defi", basePrice:2800, volatility:.15, trend:.001,  circulating_supply:902_000,       total_supply:1_005_577,       blockchain:"AvalancheX",      consensus:"Hybrid",mcap_tier:"large", description:"Decentralised credit platform issuing the DAIXS stablecoin against collateral."},
  COMPX:  {name:"CompoundX Finance",     category:"defi", basePrice:58,   volatility:.20, trend:.001,  circulating_supply:8_900_000,     total_supply:10_000_000,      blockchain:"ArbitrumOne",     consensus:"PoA",   mcap_tier:"mid",   description:"Algorithmic interest rate protocol with autonomous on-chain governance."},
  SUSHIX: {name:"SushiSwap",             category:"defi", basePrice:1.22, volatility:.25, trend:0,     circulating_supply:238_000_000,   total_supply:250_000_000,     blockchain:"PolygonPOS",      consensus:"DPoS",  mcap_tier:"small", description:"Community-forked AMM with cross-chain yield strategies and a lending arm."},
  BNCX:   {name:"BancorX Protocol",      category:"defi", basePrice:0.55, volatility:.25, trend:0,     circulating_supply:188_000_000,   total_supply:238_000_000,     blockchain:"AvalancheX",      consensus:"Hybrid",mcap_tier:"small", description:"Single-sided liquidity AMM using on-chain arbitrage to maintain token stability."},
  TRDRX:  {name:"TraderJoe DEX",         category:"defi", basePrice:0.38, volatility:.28, trend:0,     circulating_supply:410_000_000,   total_supply:500_000_000,     blockchain:"AvalancheX",      consensus:"Hybrid",mcap_tier:"small", description:"Multi-product DEX offering spot, leverage, and launchpad services on L1."},
  DYDXX:  {name:"dYdXChain",             category:"defi", basePrice:1.82, volatility:.22, trend:.001,  circulating_supply:300_000_000,   total_supply:1_000_000_000,   blockchain:"CosmosHub",       consensus:"DPoS",  mcap_tier:"mid",   description:"Sovereign Cosmos chain running a perpetuals DEX with off-chain order matching."},
  GMXP:   {name:"GMXPerps",              category:"defi", basePrice:28,   volatility:.22, trend:.001,  circulating_supply:9_200_000,     total_supply:13_250_000,      blockchain:"ArbitrumOne",     consensus:"PoA",   mcap_tier:"mid",   description:"Decentralised perpetuals exchange with real-yield sharing to GLP liquidity providers."},
  SYNX:   {name:"SynthetixNet",          category:"defi", basePrice:3.22, volatility:.22, trend:.001,  circulating_supply:308_000_000,   total_supply:1e18,            blockchain:"OptimismNet",     consensus:"PoA",   mcap_tier:"mid",   description:"Derivatives liquidity protocol minting synths backed by staked collateral."},
  VELX:   {name:"VelodromeSwap",         category:"defi", basePrice:0.082,volatility:.28, trend:0,     circulating_supply:4_200_000_000, total_supply:1e18,            blockchain:"OptimismNet",     consensus:"PoA",   mcap_tier:"small", description:"Ve(3,3) AMM model incentivising long-term liquidity with vote-escrowed rewards."},
  BALX:   {name:"BalancerX Pools",       category:"defi", basePrice:4.52, volatility:.22, trend:.001,  circulating_supply:46_500_000,    total_supply:96_150_000,      blockchain:"ArbitrumOne",     consensus:"PoA",   mcap_tier:"mid",   description:"Programmable liquidity protocol supporting multi-asset weighted pools."},
  YFIX:   {name:"YieldFix Finance",      category:"defi", basePrice:8820, volatility:.18, trend:.001,  circulating_supply:36_600,        total_supply:36_666,          blockchain:"AvalancheX",      consensus:"Hybrid",mcap_tier:"mid",   description:"Aggregated yield optimiser automatically compounding strategies across protocols."},
  ALPAX:  {name:"AlphaHomora",           category:"defi", basePrice:0.12, volatility:.30, trend:0,     circulating_supply:1_900_000_000, total_supply:2_000_000_000,   blockchain:"SolarChain",      consensus:"PoH",   mcap_tier:"small", description:"Leveraged yield farming protocol offering up to 8x amplified LP positions."},
  PENX:   {name:"PendleFinance",         category:"defi", basePrice:4.22, volatility:.25, trend:.001,  circulating_supply:270_000_000,   total_supply:281_527_448,     blockchain:"ArbitrumOne",     consensus:"PoA",   mcap_tier:"mid",   description:"Yield tokenisation protocol splitting assets into principal and yield tokens."},
  RDNTX:  {name:"RadiantCapital",        category:"defi", basePrice:0.082,volatility:.28, trend:0,     circulating_supply:1_000_000_000, total_supply:1_000_000_000,   blockchain:"ArbitrumOne",     consensus:"PoA",   mcap_tier:"small", description:"Cross-chain money market aggregating liquidity via LayerZero messaging."},
  JUPX:   {name:"JupiterDEX",            category:"defi", basePrice:1.12, volatility:.25, trend:.001,  circulating_supply:1_350_000_000, total_supply:10_000_000_000,  blockchain:"SolarChain",      consensus:"PoH",   mcap_tier:"large", description:"SolarChain's dominant swap aggregator routing through all on-chain liquidity."},

  // ── Meme (16) ────────────────────────────────────────────────────────────────
  DOGO:   {name:"DogeOG Coin",           category:"meme", basePrice:0.18, volatility:.35, trend:0,     circulating_supply:142_000_000_000,total_supply:1e18,            blockchain:"DogeOGChain",     consensus:"PoW",   mcap_tier:"large", description:"The original canine memecoin; perpetually fuelled by social media virality."},
  SHBI:   {name:"ShibaInu Classic",      category:"meme", basePrice:0.025,volatility:.40, trend:0,     circulating_supply:589_000_000_000_000,total_supply:999_983_000_000_000,blockchain:"ShibaNet",consensus:"PoS",   mcap_tier:"large", description:"Deflationary meme token with an ecosystem of DEX, NFTs, and metaverse land."},
  PEPY:   {name:"PepeVault",             category:"meme", basePrice:0.0082,volatility:.45,trend:0,     circulating_supply:420_690_000_000_000,total_supply:420_690_000_000_000,blockchain:"PolyChain",consensus:"PoW",  mcap_tier:"mid",   description:"Frog-themed meme token that became a top-10 cultural crypto phenomenon."},
  FLKX:   {name:"FlokiX Coin",           category:"meme", basePrice:0.22, volatility:.38, trend:0,     circulating_supply:9_700_000_000_000,total_supply:10_000_000_000_000,blockchain:"SolarChain",  consensus:"PoH",   mcap_tier:"mid",   description:"Celebrity-named meme token pivoting into GameFi and DeFi utility."},
  BONKX:  {name:"BonkToken",             category:"meme", basePrice:0.032,volatility:.42, trend:0,     circulating_supply:75_000_000_000_000,total_supply:100_000_000_000_000,blockchain:"SolarChain", consensus:"PoH",  mcap_tier:"mid",   description:"First SolarChain-native dog meme coin distributed as a community airdrop."},
  BABYX:  {name:"BabyDoge Classic",      category:"meme", basePrice:0.0045,volatility:.45,trend:0,     circulating_supply:420_000_000_000_000,total_supply:420_000_000_000_000,blockchain:"CardoNet", consensus:"PoS",   mcap_tier:"small", description:"Hyper-deflationary baby meme with automatic redistribution to holders."},
  WIFX:   {name:"dogwifhat",             category:"meme", basePrice:3.22, volatility:.38, trend:0,     circulating_supply:998_000_000,   total_supply:998_906_026,     blockchain:"SolarChain",      consensus:"PoH",   mcap_tier:"mid",   description:"A dog wearing a hat. Community-driven meme token with nothing but vibes."},
  BRETTX: {name:"BrettCoin",             category:"meme", basePrice:0.14, volatility:.42, trend:0,     circulating_supply:9_900_000_000, total_supply:10_000_000_000,  blockchain:"BaseChain",       consensus:"PoA",   mcap_tier:"mid",   description:"Base-native character meme with tight community and NFT collection integration."},
  MOGX:   {name:"MogCoin",               category:"meme", basePrice:0.0028,volatility:.45,trend:0,     circulating_supply:420_000_000_000_000,total_supply:420_000_000_000_000,blockchain:"PolyChain",consensus:"PoW",  mcap_tier:"small", description:"Based meme token that surged on an iconic photo of a dismissive expression."},
  PONKX:  {name:"Ponke",                 category:"meme", basePrice:0.0055,volatility:.45,trend:0,     circulating_supply:973_000_000,   total_supply:1_000_000_000,   blockchain:"SolarChain",      consensus:"PoH",   mcap_tier:"small", description:"Cartoon ape meme token capturing the culture of perpetual degens."},
  TURBOX: {name:"TurboToken",            category:"meme", basePrice:0.0082,volatility:.42,trend:0,     circulating_supply:69_000_000_000_000,total_supply:69_000_000_000_000,blockchain:"PolyChain",consensus:"PoW",  mcap_tier:"small", description:"GPT-written meme coin lore with an AI-generated bull mascot driving community."},
  DOGEX:  {name:"DogeExpress",           category:"meme", basePrice:0.0015,volatility:.48,trend:0,     circulating_supply:199_000_000_000,total_supply:200_000_000_000, blockchain:"ShibaNet",        consensus:"PoS",   mcap_tier:"small", description:"Dog-themed spin-off meme issued as a community reward for original DogeOG holders."},
  POPCAT: {name:"PopCatCoin",            category:"meme", basePrice:0.92, volatility:.40, trend:0,     circulating_supply:979_000_000,   total_supply:1_000_000_000,   blockchain:"SolarChain",      consensus:"PoH",   mcap_tier:"mid",   description:"Viral internet cat meme tokenised as the sound of BPOP sweeping social feeds."},
  NEIRO:  {name:"NeiroCoin",             category:"meme", basePrice:0.0012,volatility:.45,trend:0,     circulating_supply:420_000_000_000_000,total_supply:420_000_000_000_000,blockchain:"PolyChain",consensus:"PoW",  mcap_tier:"small", description:"Inspired by a famous dog's sister; spawned an ecosystem of sibling derivative tokens."},
  GOAT:   {name:"GoatOfTheMonth",        category:"meme", basePrice:0.58, volatility:.42, trend:0,     circulating_supply:996_000_000,   total_supply:1_000_000_000,   blockchain:"SolarChain",      consensus:"PoH",   mcap_tier:"mid",   description:"AI-generated GoaT character meme token that spiked on influencer endorsements."},
  MOODG:  {name:"MoodengToken",          category:"meme", basePrice:0.0038,volatility:.45,trend:0,     circulating_supply:420_000_000_000_000,total_supply:420_000_000_000_000,blockchain:"SolarChain",consensus:"PoH",  mcap_tier:"small", description:"Baby hippo viral sensation turned memecoin; top holder is the Dusit Zoo fund."},

  // ── GameFi (10) ──────────────────────────────────────────────────────────────
  AXIE2:  {name:"AxieInfinity2",         category:"gamefi", basePrice:7.52, volatility:.25, trend:.001, circulating_supply:270_000_000,  total_supply:270_000_000,     blockchain:"RonxChain",       consensus:"DPoS",  mcap_tier:"mid",   description:"Play-to-earn NFT battle game with collectible creatures and a scholarship economy."},
  SANDX:  {name:"SandboxX",              category:"gamefi", basePrice:0.45, volatility:.28, trend:.001, circulating_supply:2_400_000_000,total_supply:3_000_000_000,   blockchain:"PolygonPOS",      consensus:"DPoS",  mcap_tier:"large", description:"Voxel metaverse platform where players own land, create games, and sell NFTs."},
  MANAX:  {name:"DecentralManax",        category:"gamefi", basePrice:0.52, volatility:.25, trend:.001, circulating_supply:1_930_000_000,total_supply:2_194_000_000,   blockchain:"PolygonPOS",      consensus:"DPoS",  mcap_tier:"large", description:"3D virtual world where users own LAND parcels and run interactive experiences."},
  GALAX:  {name:"GalaxyCraft",           category:"gamefi", basePrice:0.038,volatility:.30, trend:0,    circulating_supply:25_000_000_000,total_supply:200_000_000_000,blockchain:"SolarChain",      consensus:"PoH",   mcap_tier:"mid",   description:"Web3 gaming credential network issuing on-chain achievements across partner games."},
  ILGX:   {name:"IlluviumX",             category:"gamefi", basePrice:0.042,volatility:.30, trend:0,    circulating_supply:8_000_000,    total_supply:10_000_000,      blockchain:"ImmutableX",      consensus:"PoA",   mcap_tier:"small", description:"AAA auto-battler RPG with collectible creatures and a player-owned economy."},
  STARX:  {name:"StarAtlasX",            category:"gamefi", basePrice:0.0025,volatility:.35,trend:0,    circulating_supply:36_000_000_000,total_supply:36_000_000_000, blockchain:"SolarChain",      consensus:"PoH",   mcap_tier:"small", description:"Space MMO with a real-time economy, territorial control, and faction governance."},
  BIGX:   {name:"BigTimeCoin",           category:"gamefi", basePrice:0.0015,volatility:.35,trend:0,    circulating_supply:5_000_000_000,total_supply:5_000_000_000,  blockchain:"ImmutableX",      consensus:"PoA",   mcap_tier:"small", description:"Multi-player action RPG with time-travel mechanics and communal resource vaults."},
  PIXLX:  {name:"PixelVerse",            category:"gamefi", basePrice:0.12, volatility:.28, trend:.001, circulating_supply:2_800_000_000,total_supply:5_000_000_000,  blockchain:"PolygonPOS",      consensus:"DPoS",  mcap_tier:"small", description:"Retro pixel-art metaverse game with player-owned characters and wearable NFTs."},
  VICTX:  {name:"VictoriaVR",            category:"gamefi", basePrice:0.95, volatility:.28, trend:.001, circulating_supply:8_000_000_000,total_supply:10_000_000_000, blockchain:"PolygonPOS",      consensus:"DPoS",  mcap_tier:"mid",   description:"Photorealistic VR metaverse powered by UE5 with token-gated districts."},
  RONX:   {name:"RonxChain",             category:"gamefi", basePrice:2.82, volatility:.25, trend:.001, circulating_supply:340_000_000,  total_supply:1_000_000_000,  blockchain:"RonxChain",       consensus:"DPoS",  mcap_tier:"mid",   description:"Ethereum-linked sidechain built for gaming with near-zero gas fees."},

  // ── AI Crypto (10) ───────────────────────────────────────────────────────────
  FETX:   {name:"FetchAI",               category:"ai", basePrice:2.52, volatility:.28, trend:.002,  circulating_supply:2_900_000_000, total_supply:2_630_547_141,   blockchain:"CosmosHub",       consensus:"DPoS",  mcap_tier:"large", description:"Autonomous AI agent network for smart contract-based machine economy tasks."},
  AGIX:   {name:"SingularityNET",        category:"ai", basePrice:0.86, volatility:.28, trend:.002,  circulating_supply:1_400_000_000, total_supply:2_000_000_000,   blockchain:"CardoNet",        consensus:"PoS",   mcap_tier:"large", description:"Decentralised marketplace for AI services enabling open AGI development."},
  RNDR2:  {name:"RenderNetwork",         category:"ai", basePrice:8.52, volatility:.25, trend:.002,  circulating_supply:388_000_000,   total_supply:532_000_000,     blockchain:"SolarChain",      consensus:"PoH",   mcap_tier:"large", description:"Distributed GPU rendering marketplace connecting creators with idle compute."},
  OCEANX: {name:"OceanProtocol",         category:"ai", basePrice:0.92, volatility:.28, trend:.001,  circulating_supply:613_000_000,   total_supply:1_410_000_000,   blockchain:"PolygonPOS",      consensus:"DPoS",  mcap_tier:"mid",   description:"Data marketplace enabling AI models to be trained on privacy-preserving datasets."},
  RSSAX:  {name:"RossaAI",               category:"ai", basePrice:0.42, volatility:.30, trend:.001,  circulating_supply:550_000_000,   total_supply:1_000_000_000,   blockchain:"AvalancheX",      consensus:"Hybrid",mcap_tier:"mid",   description:"On-chain AI inference coordination layer enabling trustless model execution."},
  CORTX:  {name:"CortexAI",              category:"ai", basePrice:0.18, volatility:.30, trend:.001,  circulating_supply:299_000_000,   total_supply:299_792_458,     blockchain:"PolyChain",       consensus:"PoW",   mcap_tier:"small", description:"Miner-assisted AI inference on-chain enabling smart contracts to call ML models."},
  NGLX:   {name:"NeuralGlue",            category:"ai", basePrice:0.055,volatility:.32, trend:.001,  circulating_supply:800_000_000,   total_supply:1_000_000_000,   blockchain:"ArbitrumOne",     consensus:"PoA",   mcap_tier:"small", description:"Connector protocol bridging web2 AI APIs with on-chain computation requests."},
  ATRSN:  {name:"Ataraxia Neuron",       category:"ai", basePrice:1.22, volatility:.28, trend:.001,  circulating_supply:220_000_000,   total_supply:500_000_000,     blockchain:"SuiLayer",        consensus:"DPoS",  mcap_tier:"mid",   description:"Decentralised LLM fine-tuning platform with proof-of-training verification."},
  CLIOX:  {name:"ClioX Protocol",        category:"ai", basePrice:0.28, volatility:.30, trend:.001,  circulating_supply:480_000_000,   total_supply:1_000_000_000,   blockchain:"SolarChain",      consensus:"PoH",   mcap_tier:"small", description:"AI data labelling DAO where contributors stake tokens and earn task rewards."},
  NUMT:   {name:"NumerToken",            category:"ai", basePrice:0.085,volatility:.30, trend:.001,  circulating_supply:950_000_000,   total_supply:1_000_000_000,   blockchain:"ArbitrumOne",     consensus:"PoA",   mcap_tier:"small", description:"Prediction market token for AI-driven financial model tournament scoring."},

  // ── Privacy (8) ──────────────────────────────────────────────────────────────
  XMRX:   {name:"MoneroX",               category:"privacy", basePrice:182, volatility:.15, trend:.001, circulating_supply:18_400_000,   total_supply:1e18,            blockchain:"MoneroXChain",    consensus:"PoW",   mcap_tier:"large", description:"Ring-signature privacy coin with stealth addresses and mandatory obfuscation."},
  ZCSX:   {name:"ZCashSpark",            category:"privacy", basePrice:24,  volatility:.18, trend:.001, circulating_supply:17_200_000,   total_supply:21_000_000,      blockchain:"ZCashSpark",      consensus:"PoW",   mcap_tier:"mid",   description:"zk-SNARK shielded transaction coin enabling selective disclosure proofs."},
  SCRT2:  {name:"SecretX Network",       category:"privacy", basePrice:1.82,volatility:.22, trend:.001, circulating_supply:216_000_000,  total_supply:1e18,            blockchain:"SecretXNet",      consensus:"DPoS",  mcap_tier:"mid",   description:"Privacy-preserving smart contract platform with encrypted state variables."},
  DSSX:   {name:"DashSecure",            category:"privacy", basePrice:0.32,volatility:.25, trend:0,    circulating_supply:11_500_000,   total_supply:18_900_000,      blockchain:"DashSecure",      consensus:"PoW",   mcap_tier:"small", description:"Instant payment coin with CoinJoin mixing and optional PrivateSend mode."},
  OASI:   {name:"OasisProtocol",         category:"privacy", basePrice:0.12,volatility:.25, trend:.001, circulating_supply:9_200_000_000,total_supply:10_000_000_000,  blockchain:"OasisNet",        consensus:"DPoS",  mcap_tier:"small", description:"Privacy-first L1 with TEE-based confidential computation and data tokenisation."},
  IRONX:  {name:"IronFishCoin",          category:"privacy", basePrice:0.068,volatility:.28,trend:0,    circulating_supply:61_000_000,   total_supply:256_970_400,     blockchain:"IronFishChain",   consensus:"PoW",   mcap_tier:"small", description:"ZKP-based fully shielded payment chain where every transaction is private."},
  PHALA:  {name:"PhalaNetwork",          category:"privacy", basePrice:0.15,volatility:.25, trend:.001, circulating_supply:966_000_000,  total_supply:1_000_000_000,   blockchain:"PhalaNet",        consensus:"PoA",   mcap_tier:"small", description:"TEE-secured confidential computing network for privacy-preserving AI workloads."},
  ANON2:  {name:"AnonSwap",              category:"privacy", basePrice:0.038,volatility:.30,trend:0,    circulating_supply:180_000_000,  total_supply:250_000_000,     blockchain:"MoneroXChain",    consensus:"PoW",   mcap_tier:"small", description:"Privacy DEX using zk proofs to conceal swap amounts and counterparty identities."},

  // ── Infrastructure (10) ──────────────────────────────────────────────────────
  LNKX:   {name:"ChainLinkX",            category:"infra", basePrice:18,  volatility:.18, trend:.001,  circulating_supply:587_000_000,  total_supply:1_000_000_000,   blockchain:"PolyChain",       consensus:"PoW",   mcap_tier:"large", description:"Decentralised oracle network providing tamper-proof external data to smart contracts."},
  FILEX:  {name:"FileStorX",             category:"infra", basePrice:6.52,volatility:.20, trend:.001,  circulating_supply:487_000_000,  total_supply:2_000_000_000,   blockchain:"FileStorNet",     consensus:"PoS",   mcap_tier:"mid",   description:"Incentivised distributed storage network where miners prove space-time commitments."},
  ARKX:   {name:"ArkProtocol",           category:"infra", basePrice:1.82,volatility:.22, trend:.001,  circulating_supply:150_000_000,  total_supply:167_000_000,     blockchain:"ArkNet",          consensus:"DPoS",  mcap_tier:"mid",   description:"Interoperability middleware enabling push-button deployable custom blockchains."},
  THORX:  {name:"ThorChain",             category:"infra", basePrice:5.22,volatility:.22, trend:.001,  circulating_supply:336_000_000,  total_supply:500_000_000,     blockchain:"ThorChain",       consensus:"DPoS",  mcap_tier:"mid",   description:"Cross-chain liquidity protocol enabling native asset swaps without wrapping."},
  KMNX:   {name:"KomodoChain",           category:"infra", basePrice:0.38,volatility:.25, trend:0,     circulating_supply:130_000_000,  total_supply:200_000_000,     blockchain:"KomodoChain",     consensus:"PoW",   mcap_tier:"small", description:"Multi-chain infrastructure stack with delayed proof-of-work security anchoring."},
  KEPLX:  {name:"KeplerRouter",          category:"infra", basePrice:0.95,volatility:.22, trend:.001,  circulating_supply:420_000_000,  total_supply:1_000_000_000,   blockchain:"CosmosHub",       consensus:"DPoS",  mcap_tier:"mid",   description:"IBC wallet and routing daemon enabling seamless cross-chain identity management."},
  EIGX:   {name:"EigenLayer",            category:"infra", basePrice:3.82,volatility:.22, trend:.001,  circulating_supply:770_000_000,  total_supply:1_670_000_000,   blockchain:"PolyChain",       consensus:"PoW",   mcap_tier:"large", description:"Restaking protocol that lets stakers extend crypto-economic security to new services."},
  LTOX:   {name:"LitecoinX",             category:"infra", basePrice:88,  volatility:.15, trend:0,     circulating_supply:74_500_000,   total_supply:84_000_000,      blockchain:"LitecoinXChain",  consensus:"PoW",   mcap_tier:"large", description:"Silver to BTCX's gold; fast and cheap PoW payments with a fixed 84M supply cap."},
  SSSX:   {name:"SuperstateX",           category:"infra", basePrice:0.22,volatility:.25, trend:.001,  circulating_supply:600_000_000,  total_supply:1_000_000_000,   blockchain:"ArbitrumOne",     consensus:"PoA",   mcap_tier:"small", description:"On-chain fund infrastructure tokenising T-bills and money market instruments."},
  NTRN:   {name:"NeutronChain",          category:"infra", basePrice:0.55,volatility:.25, trend:.001,  circulating_supply:810_000_000,  total_supply:1_000_000_000,   blockchain:"CosmosHub",       consensus:"DPoS",  mcap_tier:"small", description:"Smart-contract hub secured by the Cosmos Hub via interchain security."},

  // ── Oracle (6) ───────────────────────────────────────────────────────────────
  CHLNK:  {name:"ChainLinkX Oracle",     category:"oracle", basePrice:15,  volatility:.18, trend:.001, circulating_supply:587_000_000,  total_supply:1_000_000_000,   blockchain:"PolyChain",       consensus:"PoW",   mcap_tier:"large", description:"Distributed oracle network securing DeFi price feeds and off-chain data."},
  BANDX:  {name:"BandProtocolX",         category:"oracle", basePrice:1.52,volatility:.22, trend:.001, circulating_supply:195_000_000,  total_supply:100_000_000_000, blockchain:"CosmosHub",       consensus:"DPoS",  mcap_tier:"mid",   description:"Cross-chain data oracle providing aggregated data from multiple sources."},
  PYRX:   {name:"PyroOracle",            category:"oracle", basePrice:0.55,volatility:.25, trend:.001, circulating_supply:280_000_000,  total_supply:500_000_000,     blockchain:"AvalancheX",      consensus:"Hybrid",mcap_tier:"small", description:"On-chain random beacon and verifiable data feed using commit-reveal schemes."},
  UMBX:   {name:"UmbrellaN",             category:"oracle", basePrice:0.042,volatility:.28,trend:.001, circulating_supply:280_000_000,  total_supply:500_000_000,     blockchain:"PolyChain",       consensus:"PoW",   mcap_tier:"small", description:"Staking-secured oracle network with slashable validators ensuring data honesty."},
  TELR:   {name:"TellorX",               category:"oracle", basePrice:0.088,volatility:.28,trend:.001, circulating_supply:138_000_000,  total_supply:1e18,            blockchain:"PolyChain",       consensus:"PoW",   mcap_tier:"small", description:"Optimistic oracle where miners compete to submit correct data under challenge."},
  APIX:   {name:"APIXChain",             category:"oracle", basePrice:0.35,volatility:.25, trend:.001, circulating_supply:430_000_000,  total_supply:500_000_000,     blockchain:"CosmosHub",       consensus:"DPoS",  mcap_tier:"small", description:"First-party oracle protocol where data providers stake against their own feeds."},

  // ── Exchange (8) ─────────────────────────────────────────────────────────────
  BNKX2:  {name:"BinexChain",            category:"exchange", basePrice:582,  volatility:.12, trend:.001, circulating_supply:153_000_000,  total_supply:200_000_000,     blockchain:"BinexChain",      consensus:"DPoS",  mcap_tier:"large", description:"Utility and governance token for the world's highest-volume centralised exchange."},
  COINX:  {name:"CoinbaseX",             category:"exchange", basePrice:212,  volatility:.15, trend:.001, circulating_supply:280_000_000,  total_supply:600_000_000,     blockchain:"BaseChain",       consensus:"PoA",   mcap_tier:"large", description:"Publicly-listed exchange token with fee discounts and Base ecosystem incentives."},
  KUCNX:  {name:"KuCoinX",               category:"exchange", basePrice:11,   volatility:.18, trend:.001, circulating_supply:99_000_000,   total_supply:170_000_000,     blockchain:"KuCoinNet",       consensus:"PoS",   mcap_tier:"mid",   description:"KuCoin exchange token offering trading rebates and launchpad participation."},
  GATEX:  {name:"GateIoX",               category:"exchange", basePrice:1.62, volatility:.20, trend:.001, circulating_supply:300_000_000,  total_supply:1_000_000_000,   blockchain:"GateChain",       consensus:"PoS",   mcap_tier:"mid",   description:"Gate.io exchange token powering the HDR stablecoin and insurance fund."},
  BYBX:   {name:"BybitX",                category:"exchange", basePrice:0.52, volatility:.22, trend:.001, circulating_supply:900_000_000,  total_supply:1_000_000_000,   blockchain:"BybitChain",      consensus:"DPoS",  mcap_tier:"mid",   description:"Bybit exchange native token for reduced maker/taker fees and staking yields."},
  HYPX:   {name:"HyperliquidX",          category:"exchange", basePrice:28,   volatility:.18, trend:.002, circulating_supply:330_000_000,  total_supply:1_000_000_000,   blockchain:"HyperliquidNet",  consensus:"DPoS",  mcap_tier:"large", description:"On-chain perpetuals DEX with an order book matching 100k TPS throughput."},
  OVEX:   {name:"OKXChainToken",         category:"exchange", basePrice:3.52, volatility:.22, trend:.001, circulating_supply:120_000_000,  total_supply:300_000_000,     blockchain:"OKXChain",        consensus:"DPoS",  mcap_tier:"mid",   description:"OKX native token backing the OKXChain EVM compatible ecosystem."},
  DEXB:   {name:"DeXBlazer",             category:"exchange", basePrice:0.85, volatility:.25, trend:.001, circulating_supply:500_000_000,  total_supply:1_000_000_000,   blockchain:"ArbitrumOne",     consensus:"PoA",   mcap_tier:"small", description:"Hybrid on/off-chain exchange token combining CEX speed with DEX custody."},

  // ── Metaverse (8) ────────────────────────────────────────────────────────────
  DECX:   {name:"DecentralandX",         category:"metaverse", basePrice:0.42,volatility:.25, trend:.001, circulating_supply:1_856_000_000,total_supply:2_194_000_000,  blockchain:"PolygonPOS",      consensus:"DPoS",  mcap_tier:"large", description:"Ethereum-linked virtual world with user-governed LAND parcels and wearables."},
  AXSX:   {name:"AxieShardX",            category:"metaverse", basePrice:0.88,volatility:.25, trend:.001, circulating_supply:10_000_000_000,total_supply:21_000_000_000,blockchain:"RonxChain",       consensus:"DPoS",  mcap_tier:"large", description:"In-game currency for the Axie ecosystem used for breeding and marketplace trades."},
  EVIX:   {name:"EvilandX",              category:"metaverse", basePrice:0.082,volatility:.30,trend:0,    circulating_supply:3_800_000_000,total_supply:20_000_000_000, blockchain:"PolygonPOS",      consensus:"DPoS",  mcap_tier:"small", description:"Browser-playable metaverse with a DAO-controlled fund for world development."},
  SOMNX:  {name:"SomniumX",              category:"metaverse", basePrice:0.22,volatility:.28, trend:.001, circulating_supply:3_200_000_000,total_supply:5_000_000_000,  blockchain:"PolygonPOS",      consensus:"DPoS",  mcap_tier:"small", description:"VR-first metaverse with persistent avatars and live event hosting."},
  METAX2: {name:"MetaverseX2",           category:"metaverse", basePrice:0.038,volatility:.32,trend:0,    circulating_supply:1_900_000_000,total_supply:5_000_000_000,  blockchain:"CardoNet",        consensus:"PoS",   mcap_tier:"small", description:"Open-source metaverse SDK token rewarding world builders and content creators."},
  STARL:  {name:"StarLaunch",            category:"metaverse", basePrice:0.0012,volatility:.35,trend:0,   circulating_supply:8_100_000_000,total_supply:100_000_000_000,blockchain:"SolarChain",      consensus:"PoH",   mcap_tier:"small", description:"Massive-scale space metaverse where star systems are community-owned territory."},
  WILDS:  {name:"WildsWorld",            category:"metaverse", basePrice:0.38,volatility:.28, trend:.001, circulating_supply:4_800_000_000,total_supply:10_000_000_000, blockchain:"PolygonPOS",      consensus:"DPoS",  mcap_tier:"small", description:"Survival crafting metaverse with player-owned territories and creature breeding."},
  BLOX:   {name:"BloxVerseX",            category:"metaverse", basePrice:0.12,volatility:.28, trend:.001, circulating_supply:3_500_000_000,total_supply:7_000_000_000,  blockchain:"ArbitrumOne",     consensus:"PoA",   mcap_tier:"small", description:"Minecraft-inspired block-building metaverse with on-chain land title and ERC-1155 items."},

  // ── Stablecoin (8) ───────────────────────────────────────────────────────────
  USDX:   {name:"USDexCoin",             category:"stablecoin", basePrice:1.00, volatility:.003,trend:0,  circulating_supply:112_000_000_000,total_supply:1e18,           blockchain:"PolyChain",       consensus:"PoW",   mcap_tier:"large", description:"Fiat-backed stablecoin pegged 1:1 to the USD with monthly attestations."},
  DAIXS:  {name:"DaiXStable",            category:"stablecoin", basePrice:1.00, volatility:.004,trend:0,  circulating_supply:5_400_000_000, total_supply:1e18,           blockchain:"PolygonPOS",      consensus:"DPoS",  mcap_tier:"large", description:"Overcollateralised decentralised stablecoin governed by the MakerX DAO."},
  FRAXS:  {name:"FraxStable",            category:"stablecoin", basePrice:1.00, volatility:.003,trend:0,  circulating_supply:645_000_000,   total_supply:1e18,           blockchain:"OptimismNet",     consensus:"PoA",   mcap_tier:"mid",   description:"Partially algorithmic fractional-reserve stablecoin with AMO-controlled peg."},
  USDK:   {name:"USDKoin",               category:"stablecoin", basePrice:1.00, volatility:.002,trend:0,  circulating_supply:34_000_000_000,total_supply:1e18,           blockchain:"SolarChain",      consensus:"PoH",   mcap_tier:"mid",   description:"Regulated digital dollar issued by a licensed Circle-equivalent entity."},
  CRVUSD: {name:"CurveUSD",              category:"stablecoin", basePrice:1.00, volatility:.004,trend:0,  circulating_supply:420_000_000,   total_supply:1e18,           blockchain:"PolygonPOS",      consensus:"DPoS",  mcap_tier:"mid",   description:"CDP stablecoin using LLAMMA soft-liquidation to protect collateral positions."},
  SFRXS:  {name:"StakedFrax",            category:"stablecoin", basePrice:1.04, volatility:.004,trend:.0001,circulating_supply:120_000_000, total_supply:1e18,           blockchain:"OptimismNet",     consensus:"PoA",   mcap_tier:"small", description:"Yield-bearing stablecoin wrapper accruing frax staking rewards over time."},
  GHOS:   {name:"GHOStable",             category:"stablecoin", basePrice:1.00, volatility:.004,trend:0,  circulating_supply:180_000_000,   total_supply:1e18,           blockchain:"AvalancheX",      consensus:"Hybrid",mcap_tier:"small", description:"Native decentralised stablecoin minted by AaveX borrowers at governance rate."},
  PYUSD:  {name:"PayPalUSDX",            category:"stablecoin", basePrice:1.00, volatility:.002,trend:0,  circulating_supply:590_000_000,   total_supply:1e18,           blockchain:"SolarChain",      consensus:"PoH",   mcap_tier:"mid",   description:"Fiat-backed stablecoin issued by a payments giant for web3 consumer adoption."},
};

// Validate every definition at module load (not at runtime per tick).
for (const [symbol, def] of Object.entries(_CRYPTO_DEFS_RAW)) {
  validateCryptoDef(symbol, def);
}

/** Immutable coin definitions. */
export const CRYPTO_DEFS = Object.freeze(_CRYPTO_DEFS_RAW);

export const CRYPTO_SYMBOLS = Object.freeze(Object.keys(CRYPTO_DEFS));

// ── Event definition schema ───────────────────────────────────────────────────

/**
 * @typedef {Object} CryptoEventDef
 * @property {string}           text      Human-readable description
 * @property {number}           effect    Price impact fraction (-1..1)
 * @property {number}           weight    Relative frequency 1-10
 * @property {string}           category  "macro" | "regulation" | "event"
 * @property {string|undefined} sector    Affected category key (undefined = all)
 */

const CRYPTO_EVENT_CATEGORIES = ['macro', 'regulation', 'event'];

function validateCryptoEvent(e, i) {
  assertString(e.text, `CRYPTO_EVENTS[${i}].text`);
  assertNumber(e.effect, `CRYPTO_EVENTS[${i}].effect`, -1, 1);
  assertNumber(e.weight, `CRYPTO_EVENTS[${i}].weight`, 1, 10);
  assertOneOf(e.category, CRYPTO_EVENT_CATEGORIES, `CRYPTO_EVENTS[${i}].category`);
  if (e.sector !== undefined && !CRYPTO_CATEGORIES[e.sector])
    throw new TypeError(`CryptoData: CRYPTO_EVENTS[${i}].sector "${e.sector}" is not a known category`);
}

/** @type {CryptoEventDef[]} */
const _CRYPTO_EVENTS_RAW = [
  // ── Macro / Market-wide ──────────────────────────────────────────────────────
  {text:"Bitcoin halving event cuts block reward — supply shock rally",          effect:.10,  weight:2, category:"macro"},
  {text:"Spot crypto ETF approved by regulator — institutional flood",           effect:.12,  weight:2, category:"macro"},
  {text:"Fed signals rate cuts — risk-on surge boosts crypto markets",           effect:.06,  weight:2, category:"macro"},
  {text:"Fed hikes 75bp — risk-off liquidations sweep leveraged longs",          effect:-.07, weight:2, category:"macro"},
  {text:"Crypto fear & greed index hits extreme greed — parabolic phase",        effect:.08,  weight:2, category:"macro"},
  {text:"Total crypto market cap breaks $3T — mainstream media frenzy",          effect:.07,  weight:1, category:"macro"},
  {text:"Whale wallet moves $2B in BTCX — market speculation ignites",           effect:.04,  weight:3, category:"macro"},
  {text:"Major exchange suffers $1.4B hack — withdrawal panic",                  effect:-.12, weight:3, category:"macro"},
  {text:"Exchange collapse announced — contagion spreads across markets",         effect:-.18, weight:2, category:"macro"},
  {text:"Stablecoin de-pegging crisis spreads fear — broad sell-off",            effect:-.10, weight:2, category:"macro"},
  {text:"Crypto market crashes 40% — leveraged longs liquidated en masse",       effect:-.15, weight:2, category:"macro"},
  {text:"Crypto bear market rally — shorts squeezed 20% in 24h",                effect:.09,  weight:2, category:"macro"},
  {text:"Record $5B in crypto futures liquidated in single hour",                effect:-.09, weight:2, category:"macro"},
  {text:"Global crypto adoption reaches 1B users milestone",                     effect:.06,  weight:1, category:"macro"},
  {text:"Layer-0 interoperability breakthrough announced — ecosystem boom",      effect:.05,  weight:2, category:"macro"},
  {text:"Quantum computing threat to elliptic curve crypto overstated — relief", effect:.03,  weight:2, category:"macro"},
  {text:"Inflation spikes — crypto narrative as digital gold strengthens",       effect:.05,  weight:2, category:"macro"},
  {text:"Deflationary crypto assets surge as fiat debasement fears rise",        effect:.04,  weight:2, category:"macro"},
  {text:"Cross-chain bridge catastrophic exploit — $800M drained",               effect:-.09, weight:3, category:"macro"},
  {text:"Central bank digital currency pilot threatens stablecoin dominance",    effect:-.05, weight:2, category:"macro"},
  {text:"Crypto derivatives open interest hits ATH — volatility incoming",       effect:.03,  weight:2, category:"macro"},
  {text:"Market-wide MEV attack drains gas — sentiment craters",                 effect:-.04, weight:2, category:"macro"},

  // ── Regulation ────────────────────────────────────────────────────────────────
  {text:"Major jurisdiction bans all crypto trading — market panic",             effect:-.14, weight:2, category:"regulation"},
  {text:"G20 announces crypto regulatory framework — clarity rally",             effect:.08,  weight:2, category:"regulation"},
  {text:"US Treasury sanctions major crypto mixer — privacy coin sell-off",      effect:-.06, weight:2, category:"regulation", sector:"privacy"},
  {text:"SEC charges DeFi protocol as unregistered securities exchange",         effect:-.08, weight:2, category:"regulation", sector:"defi"},
  {text:"MiCA crypto regulation passes EU — institutional confidence rises",     effect:.07,  weight:2, category:"regulation"},
  {text:"CFTC approves crypto commodity status — derivatives market opens",      effect:.06,  weight:2, category:"regulation"},
  {text:"Major bank freezes crypto business accounts — FUD spike",               effect:-.06, weight:3, category:"regulation"},
  {text:"Crypto tax guidance released — compliance rally on certainty",          effect:.03,  weight:2, category:"regulation"},
  {text:"NFT securities classification ruling sparks panic",                     effect:-.07, weight:2, category:"regulation", sector:"metaverse"},
  {text:"GameFi tokens ruled as gambling instruments in major market",           effect:-.08, weight:2, category:"regulation", sector:"gamefi"},
  {text:"Crypto-friendly presidential candidate wins — markets surge",           effect:.10,  weight:2, category:"regulation"},
  {text:"Privacy coins delisted by major exchanges under AML pressure",          effect:-.10, weight:3, category:"regulation", sector:"privacy"},
  {text:"AI token regulation bill proposed — sector-wide uncertainty",           effect:-.05, weight:2, category:"regulation", sector:"ai"},
  {text:"Decentralised exchange regulatory exemption confirmed",                 effect:.07,  weight:2, category:"regulation", sector:"defi"},
  {text:"Oracle data tampering criminalised — sector confidence boost",          effect:.05,  weight:1, category:"regulation", sector:"oracle"},

  // ── L1 Events ────────────────────────────────────────────────────────────────
  {text:"Major L1 mainnet upgrade goes live — throughput triples",              effect:.08,  weight:2, category:"event", sector:"l1"},
  {text:"L1 chain suffers 6-hour outage — confidence shaken",                   effect:-.08, weight:2, category:"event", sector:"l1"},
  {text:"Validator cartel detected on major L1 — decentralisation fear",        effect:-.06, weight:2, category:"event", sector:"l1"},
  {text:"Top L1 announces EVM compatibility — developer migration begins",       effect:.07,  weight:2, category:"event", sector:"l1"},
  {text:"L1 staking yield surges to 18% — massive validator inflow",            effect:.05,  weight:2, category:"event", sector:"l1"},
  {text:"L1 ecosystem fund deploys $500M — DApp boom incoming",                 effect:.06,  weight:2, category:"event", sector:"l1"},

  // ── L2 Events ────────────────────────────────────────────────────────────────
  {text:"L2 sequencer goes down — users stuck in withdrawal queue",             effect:-.06, weight:2, category:"event", sector:"l2"},
  {text:"L2 ZK proof verification time cut by 90% — massive fee drop",         effect:.07,  weight:2, category:"event", sector:"l2"},
  {text:"L2 token airdrop announced — massive activity spike",                  effect:.10,  weight:2, category:"event", sector:"l2"},
  {text:"L2 centralized sequencer controversy — decentralisation debate heats", effect:-.05, weight:2, category:"event", sector:"l2"},
  {text:"L2 TVL breaks $50B — scaling narrative dominates",                     effect:.06,  weight:2, category:"event", sector:"l2"},

  // ── DeFi Events ──────────────────────────────────────────────────────────────
  {text:"Top DeFi protocol hit by $200M flash loan exploit",                    effect:-.12, weight:3, category:"event", sector:"defi"},
  {text:"DeFi TVL breaks all-time high of $400B",                               effect:.08,  weight:2, category:"event", sector:"defi"},
  {text:"Yield farming APY spike — liquidity mining wars intensify",            effect:.07,  weight:2, category:"event", sector:"defi"},
  {text:"Rug pull drains $80M from anonymous DeFi protocol",                   effect:-.08, weight:3, category:"event", sector:"defi"},
  {text:"Oracle manipulation attack liquidates $120M in positions",             effect:-.09, weight:2, category:"event", sector:"defi"},
  {text:"DeFi blue-chip protocol achieves $10B in protocol revenue milestone",  effect:.05,  weight:1, category:"event", sector:"defi"},
  {text:"Governance attack captures major DeFi treasury",                       effect:-.08, weight:2, category:"event", sector:"defi"},

  // ── Meme Events ──────────────────────────────────────────────────────────────
  {text:"Celebrity tweets meme coin — 10x in 10 minutes",                       effect:.25,  weight:4, category:"event", sector:"meme"},
  {text:"Meme coin listed on top exchange — volume explodes 100x",              effect:.18,  weight:3, category:"event", sector:"meme"},
  {text:"Meme coin community burns 30% of supply — price rockets",              effect:.15,  weight:3, category:"event", sector:"meme"},
  {text:"Meme coin dev wallet dumped — community rug suspicion",                effect:-.20, weight:3, category:"event", sector:"meme"},
  {text:"Meme supercycle begins — all dog coins surge simultaneously",          effect:.20,  weight:2, category:"event", sector:"meme"},
  {text:"Meme coin bubble pops — 80% drawdown in 48 hours",                    effect:-.25, weight:3, category:"event", sector:"meme"},

  // ── GameFi Events ────────────────────────────────────────────────────────────
  {text:"AAA studio announces GameFi integration — mass-market adoption",       effect:.10,  weight:2, category:"event", sector:"gamefi"},
  {text:"GameFi economy collapses — play-to-earn model unsustainable",          effect:-.12, weight:2, category:"event", sector:"gamefi"},
  {text:"Top esports tournament prizes paid in GameFi tokens",                  effect:.07,  weight:2, category:"event", sector:"gamefi"},
  {text:"GameFi season 2 launch with NFT land sale — FOMO buying",              effect:.09,  weight:2, category:"event", sector:"gamefi"},
  {text:"Mobile gaming giant partners with GameFi protocol — 100M players",    effect:.12,  weight:1, category:"event", sector:"gamefi"},

  // ── AI Events ────────────────────────────────────────────────────────────────
  {text:"Major AI breakthrough integrated with on-chain inference",             effect:.10,  weight:2, category:"event", sector:"ai"},
  {text:"AI crypto tokens listed on major AI index fund",                       effect:.08,  weight:2, category:"event", sector:"ai"},
  {text:"On-chain AI model proves superior to GPT at lower cost",               effect:.09,  weight:1, category:"event", sector:"ai"},
  {text:"AI data poisoning attack undermines crypto oracle integrity",           effect:-.07, weight:2, category:"event", sector:"ai"},
  {text:"Decentralised AI network completes first autonomous governance vote",  effect:.06,  weight:2, category:"event", sector:"ai"},

  // ── Privacy Events ───────────────────────────────────────────────────────────
  {text:"Privacy coin added to sanctions list — panic delistings",              effect:-.15, weight:3, category:"event", sector:"privacy"},
  {text:"ZK-proof breakthrough cuts verification cost 99% — privacy boom",     effect:.12,  weight:2, category:"event", sector:"privacy"},
  {text:"Privacy protocol adds compliance mode — institutional adoption",       effect:.08,  weight:2, category:"event", sector:"privacy"},

  // ── Infrastructure Events ────────────────────────────────────────────────────
  {text:"Cross-chain bridge sets record $10B daily volume",                     effect:.06,  weight:2, category:"event", sector:"infra"},
  {text:"Decentralised storage passes 1 exabyte milestone",                    effect:.05,  weight:2, category:"event", sector:"infra"},
  {text:"Restaking protocol accumulates $20B in restaked assets",               effect:.07,  weight:2, category:"event", sector:"infra"},

  // ── Oracle Events ────────────────────────────────────────────────────────────
  {text:"Oracle front-running scandal liquidates $90M — trust crisis",         effect:-.09, weight:2, category:"event", sector:"oracle"},
  {text:"Oracle network expands to 50 new data feeds — DeFi integration surge",effect:.06,  weight:2, category:"event", sector:"oracle"},

  // ── Exchange Events ──────────────────────────────────────────────────────────
  {text:"Exchange token buyback programme burns 5% of supply",                  effect:.08,  weight:2, category:"event", sector:"exchange"},
  {text:"Exchange token utility expanded — trading fee elimination",            effect:.07,  weight:2, category:"event", sector:"exchange"},
  {text:"Exchange hacked — user funds at risk, token in freefall",             effect:-.18, weight:2, category:"event", sector:"exchange"},

  // ── Metaverse Events ─────────────────────────────────────────────────────────
  {text:"Metaverse virtual land sold for $5M — mainstream media coverage",     effect:.10,  weight:2, category:"event", sector:"metaverse"},
  {text:"Major fashion brand launches virtual store — wearable NFT surge",     effect:.08,  weight:2, category:"event", sector:"metaverse"},
  {text:"Metaverse daily active users collapse — hype narrative dies",         effect:-.10, weight:2, category:"event", sector:"metaverse"},
  {text:"Metaverse merger announcement — two top worlds combine ecosystems",   effect:.09,  weight:1, category:"event", sector:"metaverse"},

  // ── Stablecoin Events ────────────────────────────────────────────────────────
  {text:"Stablecoin loses $0.01 peg — algorithmic mechanism questioned",        effect:-.06, weight:3, category:"event", sector:"stablecoin"},
  {text:"Stablecoin bank run — $8B redeemed in 24h, peg holds",               effect:-.04, weight:2, category:"event", sector:"stablecoin"},
  {text:"Stablecoin issuer receives full banking licence — legitimacy boost",   effect:.05,  weight:2, category:"event", sector:"stablecoin"},
  {text:"Yield-bearing stablecoin APY spikes to 22% — massive inflows",        effect:.04,  weight:2, category:"event", sector:"stablecoin"},
];

for (let i = 0; i < _CRYPTO_EVENTS_RAW.length; i++) {
  validateCryptoEvent(_CRYPTO_EVENTS_RAW[i], i);
}

export const CRYPTO_EVENTS = Object.freeze(_CRYPTO_EVENTS_RAW);

// ── Weighted event pool (O(1) sampling) ──────────────────────────────────────

const _eventPool = [];
for (const evt of CRYPTO_EVENTS) {
  for (let w = 0; w < evt.weight; w++) _eventPool.push(evt);
}
Object.freeze(_eventPool);

/** @returns {CryptoEventDef} */
export function sampleCryptoEvent() {
  return _eventPool[Math.floor(Math.random() * _eventPool.length)];
}
