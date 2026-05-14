// Polymart forex simulation - 40 currency pairs (7 major, 14 minor, 19 exotic)

function gaussian() {
  const u1 = Math.random(), u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
  if (Math.random() < 0.05) return z * (2 + Math.random() * 1.5);
  return z;
}

// ── Pair definitions ──────────────────────────────────────────────────────────
// volatility: 1-sigma move per tick (in price units)
// spread: half-spread in price units
// decimals: display decimal places
// pipSize: 1 pip in price units
export const FOREX_PAIRS = {
  // ── Majors ─────────────────────────────────────────────────────────────────
  EURUSD: {
    base: "EUR", quote: "USD", category: "major", basePrice: 1.0850,
    volatility: 0.00038, trend: 0, spread: 0.00010, decimals: 4, pipSize: 0.0001,
    baseName: "Euro", quoteName: "US Dollar", baseCountry: "EU", quoteCountry: "US",
    description: "The most-traded currency pair in the world, representing ~23% of global daily FX volume. EUR/USD is a direct barometer of the relative strength of the Eurozone economy versus the United States.",
    economicDrivers: ["ECB vs Federal Reserve interest rate differential", "Eurozone GDP and PMI data", "US Non-Farm Payrolls and CPI", "Trade balance between EU and US"],
    factSheet: { dailyVolume: "$1.1T", avgSpread: "0.1 pips", sessions: "London/New York overlap most active", characteristics: "Most liquid, tightest spreads" },
  },
  GBPUSD: {
    base: "GBP", quote: "USD", category: "major", basePrice: 1.2650,
    volatility: 0.00048, trend: 0, spread: 0.00012, decimals: 4, pipSize: 0.0001,
    baseName: "British Pound", quoteName: "US Dollar", baseCountry: "GB", quoteCountry: "US",
    description: "Known as 'Cable' - one of the oldest pairs, historically traded via transatlantic telegraph cable. GBP/USD is highly sensitive to UK economic data, Bank of England policy, and geopolitical events.",
    economicDrivers: ["Bank of England monetary policy", "UK CPI and unemployment rate", "US Federal Reserve rate decisions", "UK trade balance and GDP growth"],
    factSheet: { dailyVolume: "$422B", avgSpread: "0.15 pips", sessions: "London session most active", characteristics: "High liquidity, volatile on UK news" },
  },
  USDJPY: {
    base: "USD", quote: "JPY", category: "major", basePrice: 149.50,
    volatility: 0.048, trend: 0, spread: 0.010, decimals: 2, pipSize: 0.01,
    baseName: "US Dollar", quoteName: "Japanese Yen", baseCountry: "US", quoteCountry: "JP",
    description: "Known as 'Gopher'. USD/JPY is a key safe-haven pair - the Yen strengthens during global risk-off events. Japan's yield curve control policy has been a defining force keeping this pair elevated.",
    economicDrivers: ["Bank of Japan yield curve control policy", "US-Japan interest rate differential", "Risk sentiment (JPY as global safe haven)", "Japanese trade data and CPI"],
    factSheet: { dailyVolume: "$554B", avgSpread: "0.2 pips", sessions: "Tokyo and New York most active", characteristics: "Safe-haven dynamics, central bank sensitive" },
  },
  USDCHF: {
    base: "USD", quote: "CHF", category: "major", basePrice: 0.8950,
    volatility: 0.00040, trend: 0, spread: 0.00013, decimals: 4, pipSize: 0.0001,
    baseName: "US Dollar", quoteName: "Swiss Franc", baseCountry: "US", quoteCountry: "CH",
    description: "Known as 'Swissie'. The Swiss Franc is a traditional safe-haven currency backed by Switzerland's political neutrality, sound fiscal policy, and robust banking system.",
    economicDrivers: ["Swiss National Bank policy and interventions", "European risk sentiment (CHF as safe haven)", "Gold prices (CHF historically linked to gold)", "Swiss CPI and trade balance"],
    factSheet: { dailyVolume: "$243B", avgSpread: "0.15 pips", sessions: "European session most active", characteristics: "Safe haven, SNB intervention risk" },
  },
  AUDUSD: {
    base: "AUD", quote: "USD", category: "major", basePrice: 0.6550,
    volatility: 0.00045, trend: 0, spread: 0.00015, decimals: 4, pipSize: 0.0001,
    baseName: "Australian Dollar", quoteName: "US Dollar", baseCountry: "AU", quoteCountry: "US",
    description: "Known as 'Aussie'. AUD/USD is a commodity-linked pair driven by iron ore, coal, and gold exports. Closely tracks Chinese economic health since China is Australia's largest trade partner.",
    economicDrivers: ["RBA interest rate decisions", "Iron ore and commodity prices", "Chinese GDP and industrial data", "Global risk sentiment (AUD as risk-on proxy)"],
    factSheet: { dailyVolume: "$223B", avgSpread: "0.15 pips", sessions: "Sydney/Tokyo and London overlap", characteristics: "Commodity-linked, China exposure" },
  },
  USDCAD: {
    base: "USD", quote: "CAD", category: "major", basePrice: 1.3650,
    volatility: 0.00042, trend: 0, spread: 0.00014, decimals: 4, pipSize: 0.0001,
    baseName: "US Dollar", quoteName: "Canadian Dollar", baseCountry: "US", quoteCountry: "CA",
    description: "Known as 'Loonie' (after the loon on the Canadian dollar coin). USD/CAD is inversely correlated with crude oil prices since Canada is one of the world's largest oil exporters.",
    economicDrivers: ["WTI crude oil prices", "Bank of Canada monetary policy", "US-Canada trade relationship (USMCA)", "Canadian employment and CPI data"],
    factSheet: { dailyVolume: "$165B", avgSpread: "0.2 pips", sessions: "North American session most active", characteristics: "Petro-currency, oil price correlation" },
  },
  NZDUSD: {
    base: "NZD", quote: "USD", category: "major", basePrice: 0.6050,
    volatility: 0.00050, trend: 0, spread: 0.00018, decimals: 4, pipSize: 0.0001,
    baseName: "New Zealand Dollar", quoteName: "US Dollar", baseCountry: "NZ", quoteCountry: "US",
    description: "Known as 'Kiwi'. NZD/USD is driven by New Zealand's agricultural exports (especially dairy and meat) and the country's relatively high interest rates. Often moves with AUD/USD.",
    economicDrivers: ["RBNZ interest rate decisions", "Dairy and agricultural commodity prices", "Chinese economic data", "Global risk appetite and carry flows"],
    factSheet: { dailyVolume: "$104B", avgSpread: "0.25 pips", sessions: "Sydney session most active", characteristics: "Commodity-linked, high carry appeal" },
  },

  // ── Minors ─────────────────────────────────────────────────────────────────
  EURGBP: {
    base: "EUR", quote: "GBP", category: "minor", basePrice: 0.8580,
    volatility: 0.00026, trend: 0, spread: 0.00015, decimals: 4, pipSize: 0.0001,
    baseName: "Euro", quoteName: "British Pound", baseCountry: "EU", quoteCountry: "GB",
    description: "EUR/GBP reflects the relative economic strength of the Eurozone versus the UK. The pair became especially volatile during and after Brexit negotiations, and remains sensitive to UK-EU trade relations.",
    economicDrivers: ["ECB vs Bank of England policy divergence", "UK-EU trade and regulatory relations", "Eurozone vs UK inflation differential", "Political developments in either region"],
    factSheet: { dailyVolume: "$98B", avgSpread: "0.15 pips", sessions: "London most active", characteristics: "Brexit-sensitive, tight range tendency" },
  },
  EURJPY: {
    base: "EUR", quote: "JPY", category: "minor", basePrice: 162.30,
    volatility: 0.058, trend: 0, spread: 0.015, decimals: 2, pipSize: 0.01,
    baseName: "Euro", quoteName: "Japanese Yen", baseCountry: "EU", quoteCountry: "JP",
    description: "EUR/JPY is popular for carry trades given historically wide interest rate differentials between the ECB and BoJ. It is more volatile than either EUR/USD or USD/JPY individually.",
    economicDrivers: ["ECB vs BoJ rate differential (carry trade driver)", "European and Japanese economic data", "Global risk sentiment", "European political events and bond spreads"],
    factSheet: { dailyVolume: "$79B", avgSpread: "0.3 pips", sessions: "European and Tokyo sessions", characteristics: "High carry, amplified volatility" },
  },
  EURCHF: {
    base: "EUR", quote: "CHF", category: "minor", basePrice: 0.9720,
    volatility: 0.00023, trend: 0, spread: 0.00018, decimals: 4, pipSize: 0.0001,
    baseName: "Euro", quoteName: "Swiss Franc", baseCountry: "EU", quoteCountry: "CH",
    description: "EUR/CHF reflects Eurozone vs Swiss economic health. The SNB has historically intervened to prevent excessive CHF appreciation, making this pair subject to sudden policy shocks (flash crashes).",
    economicDrivers: ["SNB intervention and negative rate policy", "Eurozone sovereign debt risk (CHF safe haven demand)", "Swiss-EU trade relations", "ECB vs SNB monetary policy divergence"],
    factSheet: { dailyVolume: "$36B", avgSpread: "0.2 pips", sessions: "European session most active", characteristics: "SNB intervention risk, safe-haven dynamics" },
  },
  EURAUD: {
    base: "EUR", quote: "AUD", category: "minor", basePrice: 1.6560,
    volatility: 0.00064, trend: 0, spread: 0.00022, decimals: 4, pipSize: 0.0001,
    baseName: "Euro", quoteName: "Australian Dollar", baseCountry: "EU", quoteCountry: "AU",
    description: "EUR/AUD combines a defensive currency (EUR) with a risk-sensitive commodity currency (AUD). Wide swings occur during global commodity price cycles or European risk events.",
    economicDrivers: ["Commodity cycle vs European industrial output", "ECB vs RBA policy divergence", "Chinese demand for Australian exports", "Global risk appetite"],
    factSheet: { dailyVolume: "$29B", avgSpread: "0.5 pips", sessions: "Sydney and European sessions", characteristics: "Wide swings, commodity vs defensive" },
  },
  GBPJPY: {
    base: "GBP", quote: "JPY", category: "minor", basePrice: 189.20,
    volatility: 0.072, trend: 0, spread: 0.020, decimals: 2, pipSize: 0.01,
    baseName: "British Pound", quoteName: "Japanese Yen", baseCountry: "GB", quoteCountry: "JP",
    description: "Known as 'The Dragon'. GBP/JPY is one of the most volatile major pairs, combining Cable's sensitivity to UK news with the Yen's safe-haven characteristics. Large moves are common.",
    economicDrivers: ["BoE vs BoJ rate differential", "UK economic surprises (CPI, NFP equivalents)", "Japanese risk sentiment and BoJ policy", "Brexit/geopolitical volatility"],
    factSheet: { dailyVolume: "$44B", avgSpread: "0.4 pips", sessions: "London most active (widest moves)", characteristics: "Very high volatility, wide daily ranges" },
  },
  GBPCHF: {
    base: "GBP", quote: "CHF", category: "minor", basePrice: 1.1330,
    volatility: 0.00044, trend: 0, spread: 0.00020, decimals: 4, pipSize: 0.0001,
    baseName: "British Pound", quoteName: "Swiss Franc", baseCountry: "GB", quoteCountry: "CH",
    description: "GBP/CHF combines two historically stable European economies. Both currencies are safe havens in different ways - GBP via UK economic strength, CHF via Swiss political neutrality.",
    economicDrivers: ["BoE vs SNB monetary policy divergence", "European risk events affecting both", "UK political landscape and stability", "Swiss trade surplus and capital flows"],
    factSheet: { dailyVolume: "$18B", avgSpread: "0.3 pips", sessions: "European session most active", characteristics: "Lower liquidity, safe haven blend" },
  },
  AUDJPY: {
    base: "AUD", quote: "JPY", category: "minor", basePrice: 97.90,
    volatility: 0.052, trend: 0, spread: 0.018, decimals: 2, pipSize: 0.01,
    baseName: "Australian Dollar", quoteName: "Japanese Yen", baseCountry: "AU", quoteCountry: "JP",
    description: "AUD/JPY is a classic risk sentiment barometer. It rises when investors are confident (buying risk-on AUD, selling safe-haven JPY) and falls sharply during financial crises and risk-off episodes.",
    economicDrivers: ["Global risk appetite (leading sentiment indicator)", "RBA vs BoJ interest rate differential", "Chinese commodity demand for Australia", "Carry trade flows"],
    factSheet: { dailyVolume: "$22B", avgSpread: "0.35 pips", sessions: "Sydney/Tokyo most active", characteristics: "Risk barometer, carry trade vehicle" },
  },
  CHFJPY: {
    base: "CHF", quote: "JPY", category: "minor", basePrice: 167.00,
    volatility: 0.050, trend: 0, spread: 0.018, decimals: 2, pipSize: 0.01,
    baseName: "Swiss Franc", quoteName: "Japanese Yen", baseCountry: "CH", quoteCountry: "JP",
    description: "CHF/JPY represents a clash of safe havens - both currencies strengthen during risk-off events. The pair is driven by relative central bank policy and subtle differences in safe-haven demand.",
    economicDrivers: ["SNB vs BoJ yield differentials", "Relative safe-haven demand dynamics", "Swiss and Japanese CPI data", "Global risk events and financial stress"],
    factSheet: { dailyVolume: "$12B", avgSpread: "0.35 pips", sessions: "European and Tokyo sessions", characteristics: "Dual safe-haven, policy-driven" },
  },
  CADJPY: {
    base: "CAD", quote: "JPY", category: "minor", basePrice: 109.50,
    volatility: 0.044, trend: 0, spread: 0.016, decimals: 2, pipSize: 0.01,
    baseName: "Canadian Dollar", quoteName: "Japanese Yen", baseCountry: "CA", quoteCountry: "JP",
    description: "CAD/JPY combines Canada's petro-currency with the Yen's safe-haven role. The pair rises when oil prices rise (boosting CAD) and global risk sentiment is positive (selling JPY). It falls sharply when oil drops or during crisis events.",
    economicDrivers: ["WTI crude oil prices", "Bank of Canada monetary policy", "Global risk appetite (JPY safe-haven flows)", "Canadian employment and trade data"],
    factSheet: { dailyVolume: "$18B", avgSpread: "0.3 pips", sessions: "Tokyo and North American sessions", characteristics: "Petro-currency vs safe haven, carry appeal" },
  },
  NZDJPY: {
    base: "NZD", quote: "JPY", category: "minor", basePrice: 90.45,
    volatility: 0.040, trend: 0, spread: 0.018, decimals: 2, pipSize: 0.01,
    baseName: "New Zealand Dollar", quoteName: "Japanese Yen", baseCountry: "NZ", quoteCountry: "JP",
    description: "NZD/JPY is a popular carry trade vehicle - New Zealand's higher interest rates attract yen funding. The pair tracks global risk sentiment closely, falling sharply during market stress and rising in risk-on environments.",
    economicDrivers: ["RBNZ vs BoJ rate differential (carry trade)", "Global risk appetite", "Commodity prices and NZ agricultural exports", "Chinese economic data"],
    factSheet: { dailyVolume: "$14B", avgSpread: "0.35 pips", sessions: "Sydney/Tokyo most active", characteristics: "High carry, risk-sentiment barometer" },
  },
  EURCAD: {
    base: "EUR", quote: "CAD", category: "minor", basePrice: 1.4810,
    volatility: 0.00055, trend: 0, spread: 0.00022, decimals: 4, pipSize: 0.0001,
    baseName: "Euro", quoteName: "Canadian Dollar", baseCountry: "EU", quoteCountry: "CA",
    description: "EUR/CAD pits Europe's defensive single currency against Canada's oil-sensitive Loonie. When crude oil rallies, CAD strengthens and EUR/CAD falls. ECB policy divergence from the Bank of Canada also drives the pair.",
    economicDrivers: ["Crude oil price correlation (CAD side)", "ECB vs BoC policy divergence", "Eurozone economic indicators", "Canada-EU trade flows"],
    factSheet: { dailyVolume: "$22B", avgSpread: "0.4 pips", sessions: "London and North American sessions", characteristics: "Oil-sensitive, policy-divergence driven" },
  },
  GBPAUD: {
    base: "GBP", quote: "AUD", category: "minor", basePrice: 1.9310,
    volatility: 0.00072, trend: 0, spread: 0.00030, decimals: 4, pipSize: 0.0001,
    baseName: "British Pound", quoteName: "Australian Dollar", baseCountry: "GB", quoteCountry: "AU",
    description: "Known as 'The Beast' by traders due to its notorious volatility. GBP/AUD combines the high-volatility Pound with the risk-sensitive Aussie, producing large daily ranges. Both react strongly to their respective central bank meetings.",
    economicDrivers: ["BoE vs RBA policy divergence", "UK economic data (CPI, GDP, jobs)", "Commodity prices and Chinese demand affecting AUD", "Global risk sentiment"],
    factSheet: { dailyVolume: "$20B", avgSpread: "0.6 pips", sessions: "London session produces biggest moves", characteristics: "Very high volatility - nicknamed The Beast" },
  },
  AUDNZD: {
    base: "AUD", quote: "NZD", category: "minor", basePrice: 1.0825,
    volatility: 0.00030, trend: 0, spread: 0.00020, decimals: 4, pipSize: 0.0001,
    baseName: "Australian Dollar", quoteName: "New Zealand Dollar", baseCountry: "AU", quoteCountry: "NZ",
    description: "AUD/NZD reflects relative performance between two closely linked antipodean economies. As neighbors with similar macro exposure, both track commodity cycles and China closely, resulting in a relatively tight-ranging pair.",
    economicDrivers: ["RBA vs RBNZ monetary policy divergence", "Relative dairy vs mining commodity prices", "Chinese economic data affecting both", "Trans-Tasman trade and migration flows"],
    factSheet: { dailyVolume: "$12B", avgSpread: "0.3 pips", sessions: "Sydney session most active", characteristics: "Tight ranges, closely correlated economies" },
  },
  AUDCAD: {
    base: "AUD", quote: "CAD", category: "minor", basePrice: 0.8940,
    volatility: 0.00038, trend: 0, spread: 0.00022, decimals: 4, pipSize: 0.0001,
    baseName: "Australian Dollar", quoteName: "Canadian Dollar", baseCountry: "AU", quoteCountry: "CA",
    description: "AUD/CAD matches two commodity-driven economies. Australia runs on iron ore and coal while Canada runs on oil - divergence between commodity cycles drives the pair. Both are also affected by Chinese growth expectations.",
    economicDrivers: ["Iron ore vs crude oil price divergence", "RBA vs BoC monetary policy", "Chinese demand for Australian commodities", "Risk appetite (both are risk-on currencies)"],
    factSheet: { dailyVolume: "$10B", avgSpread: "0.4 pips", sessions: "Sydney and North American sessions", characteristics: "Dual commodity currency, China-sensitive" },
  },

  // ── Exotics ─────────────────────────────────────────────────────────────────
  USDSEK: {
    base: "USD", quote: "SEK", category: "exotic", basePrice: 10.45,
    volatility: 0.0032, trend: 0, spread: 0.0025, decimals: 4, pipSize: 0.0001,
    baseName: "US Dollar", quoteName: "Swedish Krona", baseCountry: "US", quoteCountry: "SE",
    description: "USD/SEK reflects the US vs Swedish economy. Sweden's Riksbank is often a rate-setting trendsetter among smaller developed economies. The Krona is sensitive to global trade conditions and European risk.",
    economicDrivers: ["Riksbank vs Fed policy divergence", "Swedish export economy health", "EU economic conditions (major trade partner)", "Global risk sentiment"],
    factSheet: { dailyVolume: "$14B", avgSpread: "1.5 pips", sessions: "European session most active", characteristics: "Developed market exotic, EU-exposed" },
  },
  USDNOK: {
    base: "USD", quote: "NOK", category: "exotic", basePrice: 10.70,
    volatility: 0.0040, trend: 0, spread: 0.0030, decimals: 4, pipSize: 0.0001,
    baseName: "US Dollar", quoteName: "Norwegian Krone", baseCountry: "US", quoteCountry: "NO",
    description: "USD/NOK is Norway's petro-currency pair. The Krone tracks Brent crude oil closely since oil and gas exports represent ~40% of Norway's total exports. Norway's sovereign wealth fund also influences flows.",
    economicDrivers: ["Brent crude oil prices", "Norges Bank interest rate decisions", "Norwegian sovereign wealth fund (GPFG) flows", "Global risk appetite"],
    factSheet: { dailyVolume: "$11B", avgSpread: "2 pips", sessions: "European session most active", characteristics: "Oil-linked, petro-currency" },
  },
  USDSGD: {
    base: "USD", quote: "SGD", category: "exotic", basePrice: 1.3450,
    volatility: 0.00026, trend: 0, spread: 0.00020, decimals: 4, pipSize: 0.0001,
    baseName: "US Dollar", quoteName: "Singapore Dollar", baseCountry: "US", quoteCountry: "SG",
    description: "One of the most stable exotic pairs. The Monetary Authority of Singapore (MAS) manages the SGD through an undisclosed basket/band mechanism, limiting extreme volatility relative to other exotics.",
    economicDrivers: ["MAS exchange rate band policy (basket mechanism)", "Singapore entrepot trade flows", "US-Asia trade dynamics", "Asian regional risk sentiment"],
    factSheet: { dailyVolume: "$38B", avgSpread: "1 pip", sessions: "Asian session most active", characteristics: "Policy-managed stability, Asian hub" },
  },
  USDHKD: {
    base: "USD", quote: "HKD", category: "exotic", basePrice: 7.7850,
    volatility: 0.00010, trend: 0, spread: 0.00010, decimals: 4, pipSize: 0.0001,
    baseName: "US Dollar", quoteName: "Hong Kong Dollar", baseCountry: "US", quoteCountry: "HK",
    description: "USD/HKD operates under Hong Kong's Currency Board system with a strict peg (7.75–7.85). This makes it one of the world's most stable pairs - moves only occur when the peg is under systemic stress.",
    economicDrivers: ["HKMA currency board interventions", "Capital flow pressures into/out of HK", "US-China geopolitical tension", "Hong Kong financial system stability"],
    factSheet: { dailyVolume: "$59B", avgSpread: "0.5 pips", sessions: "Asian session most active", characteristics: "Pegged system, extremely stable" },
  },
  USDMXN: {
    base: "USD", quote: "MXN", category: "exotic", basePrice: 17.20,
    volatility: 0.0058, trend: 0, spread: 0.0040, decimals: 4, pipSize: 0.0001,
    baseName: "US Dollar", quoteName: "Mexican Peso", baseCountry: "US", quoteCountry: "MX",
    description: "The most liquid emerging market pair in the Americas. The Peso is deeply tied to the US economy via USMCA trade, remittance flows, and nearshoring investment. Higher carry rates attract global investors.",
    economicDrivers: ["Banxico interest rate decisions (high relative rates)", "US-Mexico trade volume (USMCA)", "Remittance inflows to Mexico", "Nearshoring investment trends"],
    factSheet: { dailyVolume: "$114B", avgSpread: "3 pips", sessions: "New York session most active", characteristics: "Highest liquidity EM, carry appeal" },
  },
  USDZAR: {
    base: "USD", quote: "ZAR", category: "exotic", basePrice: 18.90,
    volatility: 0.0070, trend: 0, spread: 0.0050, decimals: 4, pipSize: 0.0001,
    baseName: "US Dollar", quoteName: "South African Rand", baseCountry: "US", quoteCountry: "ZA",
    description: "One of the most volatile EM pairs. The Rand is heavily exposed to gold and platinum prices (South Africa mines ~70% of world platinum), power supply issues, and broader Africa political risk.",
    economicDrivers: ["Gold and platinum commodity prices", "SARB monetary policy", "Energy crisis and load shedding", "EM risk appetite and capital flows"],
    factSheet: { dailyVolume: "$21B", avgSpread: "5 pips", sessions: "London and New York sessions", characteristics: "Very volatile, commodity-linked EM" },
  },
  USDTRY: {
    base: "USD", quote: "TRY", category: "exotic", basePrice: 32.50,
    volatility: 0.0095, trend: 0.00025, spread: 0.0070, decimals: 4, pipSize: 0.0001,
    baseName: "US Dollar", quoteName: "Turkish Lira", baseCountry: "US", quoteCountry: "TR",
    description: "USD/TRY reflects Turkey's chronic inflation challenges. The Lira has depreciated structurally over years due to unconventional monetary policy, high inflation, and current account deficits.",
    economicDrivers: ["TCMB monetary policy (often unconventional)", "Turkish CPI (frequently 50-80% YoY)", "Current account deficit trajectory", "Geopolitical risk in the MENA region"],
    factSheet: { dailyVolume: "$16B", avgSpread: "7 pips", sessions: "London and New York sessions", characteristics: "Structural depreciation, very high vol" },
  },
  USDBRL: {
    base: "USD", quote: "BRL", category: "exotic", basePrice: 5.05,
    volatility: 0.0052, trend: 0, spread: 0.0040, decimals: 4, pipSize: 0.0001,
    baseName: "US Dollar", quoteName: "Brazilian Real", baseCountry: "US", quoteCountry: "BR",
    description: "USD/BRL reflects Brazil's commodity-export-driven economy. The Real is sensitive to iron ore and soybean prices, domestic fiscal policy, and global EM risk-on/risk-off flows.",
    economicDrivers: ["Banco Central do Brasil Selic rate", "Commodity prices (soy, iron ore, oil)", "Brazilian fiscal deficit and debt dynamics", "Global EM risk sentiment"],
    factSheet: { dailyVolume: "$19B", avgSpread: "4 pips", sessions: "New York session most active", characteristics: "Commodity-linked EM, fiscal-sensitive" },
  },
  USDINR: {
    base: "USD", quote: "INR", category: "exotic", basePrice: 83.50,
    volatility: 0.0016, trend: 0.00004, spread: 0.0012, decimals: 2, pipSize: 0.01,
    baseName: "US Dollar", quoteName: "Indian Rupee", baseCountry: "US", quoteCountry: "IN",
    description: "USD/INR reflects India's rapid economic growth story. The RBI actively manages volatility. India's large current account deficit (driven by oil imports) keeps structural pressure on the Rupee.",
    economicDrivers: ["RBI intervention to smooth volatility", "Indian current account balance", "Crude oil import costs (~80% of oil needs imported)", "Foreign institutional investor (FII) equity flows"],
    factSheet: { dailyVolume: "$59B", avgSpread: "2 pips", sessions: "Asian session most active", characteristics: "RBI-managed, growth story EM" },
  },
  USDCNY: {
    base: "USD", quote: "CNY", category: "exotic", basePrice: 7.2450,
    volatility: 0.00022, trend: 0, spread: 0.00018, decimals: 4, pipSize: 0.0001,
    baseName: "US Dollar", quoteName: "Chinese Yuan", baseCountry: "US", quoteCountry: "CN",
    description: "USD/CNY (onshore Yuan) is managed by the PBOC through a daily fixing mechanism with a ±2% trading band. Capital controls mean offshore USD/CNH often diverges during stress.",
    economicDrivers: ["PBOC daily fixing rate (primary price setter)", "US-China trade relations and tariff levels", "Chinese economic data (PMI, GDP, trade)", "Foreign reserve management by PBOC"],
    factSheet: { dailyVolume: "$115B", avgSpread: "1 pip", sessions: "Asian session only (capital controls)", characteristics: "Policy-managed, geopolitically sensitive" },
  },
  USDKRW: {
    base: "USD", quote: "KRW", category: "exotic", basePrice: 1340.0,
    volatility: 0.48, trend: 0, spread: 0.35, decimals: 2, pipSize: 0.01,
    baseName: "US Dollar", quoteName: "South Korean Won", baseCountry: "US", quoteCountry: "KR",
    description: "USD/KRW reflects South Korea's tech-driven export economy. The Won is sensitive to global semiconductor demand (Samsung, SK Hynix contribute heavily), EM flows, and geopolitical tensions.",
    economicDrivers: ["Bank of Korea monetary policy", "Semiconductor export volume and pricing", "Korean current account balance", "North Korea geopolitical risk"],
    factSheet: { dailyVolume: "$59B", avgSpread: "5 pips", sessions: "Asian session most active", characteristics: "Tech-linked, geopolitically sensitive" },
  },
  USDPLN: {
    base: "USD", quote: "PLN", category: "exotic", basePrice: 4.0250,
    volatility: 0.0034, trend: 0, spread: 0.0025, decimals: 4, pipSize: 0.0001,
    baseName: "US Dollar", quoteName: "Polish Zloty", baseCountry: "US", quoteCountry: "PL",
    description: "USD/PLN reflects Poland's status as Central Europe's largest economy. The Zloty is especially sensitive to Eastern European geopolitics, EU fund disbursements, and broader CEE regional risk.",
    economicDrivers: ["NBP monetary policy", "EU structural fund flows to Poland", "Eastern European geopolitical stability", "German industrial production (major trade partner)"],
    factSheet: { dailyVolume: "$8B", avgSpread: "3 pips", sessions: "European session most active", characteristics: "CEE risk barometer, EU-linked" },
  },
  USDHUF: {
    base: "USD", quote: "HUF", category: "exotic", basePrice: 360.0,
    volatility: 0.98, trend: 0, spread: 0.75, decimals: 2, pipSize: 0.01,
    baseName: "US Dollar", quoteName: "Hungarian Forint", baseCountry: "US", quoteCountry: "HU",
    description: "USD/HUF reflects Hungary's unique position within the EU. The MNB has been one of Europe's most aggressive rate-hiking central banks. The Forint is sensitive to EU disbursement disputes and regional EM flows.",
    economicDrivers: ["MNB interest rate policy (among highest in EU)", "Hungarian inflation dynamics", "EU fund disbursement disputes", "Regional CEE risk sentiment"],
    factSheet: { dailyVolume: "$6B", avgSpread: "5 pips", sessions: "European session most active", characteristics: "High carry, EU political risk" },
  },
  USDDKK: {
    base: "USD", quote: "DKK", category: "exotic", basePrice: 6.9050,
    volatility: 0.0018, trend: 0, spread: 0.0015, decimals: 4, pipSize: 0.0001,
    baseName: "US Dollar", quoteName: "Danish Krone", baseCountry: "US", quoteCountry: "DK",
    description: "USD/DKK is one of the most stable exotic pairs. Denmark's central bank (Danmarks Nationalbank) maintains a tight EUR/DKK peg (±2.25% band), meaning USD/DKK effectively mirrors EUR/USD movements with minimal independent volatility.",
    economicDrivers: ["Danmarks Nationalbank EUR/DKK peg maintenance", "EUR/USD rate (primary driver via peg)", "Danish current account surplus (persistent large surplus)", "Danish interest rate alignment with ECB"],
    factSheet: { dailyVolume: "$11B", avgSpread: "1 pip", sessions: "European session most active", characteristics: "EUR proxy via peg, very stable" },
  },
  USDTHB: {
    base: "USD", quote: "THB", category: "exotic", basePrice: 35.05,
    volatility: 0.0055, trend: 0, spread: 0.040, decimals: 2, pipSize: 0.01,
    baseName: "US Dollar", quoteName: "Thai Baht", baseCountry: "US", quoteCountry: "TH",
    description: "USD/THB reflects Thailand's tourism-heavy and electronics-export economy. The Bank of Thailand (BoT) intervenes regularly to limit excessive Baht volatility. The 1997 Baht crisis is a historical benchmark for EM currency risk.",
    economicDrivers: ["Bank of Thailand intervention and policy", "Thai tourism receipts (major GDP contributor)", "Electronics/automotive export performance", "Global EM risk sentiment and capital flows"],
    factSheet: { dailyVolume: "$16B", avgSpread: "3 pips", sessions: "Asian session most active", characteristics: "Tourism-linked, managed float" },
  },
  USDMYR: {
    base: "USD", quote: "MYR", category: "exotic", basePrice: 4.6500,
    volatility: 0.0018, trend: 0, spread: 0.0020, decimals: 4, pipSize: 0.0001,
    baseName: "US Dollar", quoteName: "Malaysian Ringgit", baseCountry: "US", quoteCountry: "MY",
    description: "USD/MYR reflects Malaysia's oil-exporting, manufacturing-hub economy. The Ringgit is sensitive to palm oil prices, LNG exports, and electronics supply chain dynamics. Bank Negara Malaysia actively manages volatility.",
    economicDrivers: ["Brent crude and palm oil prices", "Bank Negara Malaysia monetary policy", "Electronics and semiconductor export demand", "ASEAN regional risk flows"],
    factSheet: { dailyVolume: "$12B", avgSpread: "1.5 pips", sessions: "Asian session most active", characteristics: "Oil + palm oil linked, managed float" },
  },
  USDCZK: {
    base: "USD", quote: "CZK", category: "exotic", basePrice: 23.05,
    volatility: 0.0080, trend: 0, spread: 0.0050, decimals: 4, pipSize: 0.0001,
    baseName: "US Dollar", quoteName: "Czech Koruna", baseCountry: "US", quoteCountry: "CZ",
    description: "USD/CZK tracks Central Europe's most industrialised economy - the Czech Republic is tightly integrated into the German manufacturing supply chain. The CNB was among the first European central banks to aggressively hike rates post-pandemic.",
    economicDrivers: ["CNB monetary policy (proactive rate cycles)", "German industrial production (major trade partner)", "EUR/CZK baseline (EU accession expectations)", "Czech inflation and wage growth"],
    factSheet: { dailyVolume: "$6B", avgSpread: "3 pips", sessions: "European session most active", characteristics: "CEE industrial proxy, German supply chain" },
  },
  USDAED: {
    base: "USD", quote: "AED", category: "exotic", basePrice: 3.6725,
    volatility: 0.00004, trend: 0, spread: 0.00040, decimals: 4, pipSize: 0.0001,
    baseName: "US Dollar", quoteName: "UAE Dirham", baseCountry: "US", quoteCountry: "AE",
    description: "USD/AED is pegged by the UAE Central Bank at 3.6725 since 1997. As a result, the pair shows almost zero volatility under normal conditions. It is primarily used for settlement, hedging, and as a Middle East USD proxy.",
    economicDrivers: ["UAE Central Bank peg maintenance (3.6725)", "Oil export revenues supporting reserves", "Financial system stability in UAE", "US monetary policy (transmitted via peg)"],
    factSheet: { dailyVolume: "$14B", avgSpread: "0.3 pips", sessions: "Asian and London sessions", characteristics: "Hard-pegged, near-zero volatility" },
  },
  USDSAR: {
    base: "USD", quote: "SAR", category: "exotic", basePrice: 3.7500,
    volatility: 0.00003, trend: 0, spread: 0.00040, decimals: 4, pipSize: 0.0001,
    baseName: "US Dollar", quoteName: "Saudi Riyal", baseCountry: "US", quoteCountry: "SA",
    description: "USD/SAR has been pegged at 3.75 since 1986, sustained by Saudi Arabia's vast oil export revenues and foreign currency reserves. The peg is one of the world's longest-running, and has survived multiple oil price cycles.",
    economicDrivers: ["SAMA (Saudi Central Bank) peg defense", "Crude oil export revenues and reserves level", "Saudi Vision 2030 capital flows", "OPEC production decisions"],
    factSheet: { dailyVolume: "$16B", avgSpread: "0.3 pips", sessions: "Asian and London sessions", characteristics: "Hard-pegged 1986, oil-reserve backed" },
  },
};

// ── Country code → emoji flag ─────────────────────────────────────────────────
export const COUNTRY_FLAGS = {
  US: "🇺🇸", EU: "🇪🇺", GB: "🇬🇧", JP: "🇯🇵", CH: "🇨🇭",
  AU: "🇦🇺", CA: "🇨🇦", NZ: "🇳🇿", SE: "🇸🇪", NO: "🇳🇴",
  SG: "🇸🇬", HK: "🇭🇰", MX: "🇲🇽", ZA: "🇿🇦", TR: "🇹🇷",
  BR: "🇧🇷", IN: "🇮🇳", CN: "🇨🇳", KR: "🇰🇷", PL: "🇵🇱", HU: "🇭🇺",
  DK: "🇩🇰", TH: "🇹🇭", MY: "🇲🇾", CZ: "🇨🇿", AE: "🇦🇪", SA: "🇸🇦",
};

// ── Build initial forex state ──────────────────────────────────────────────────
export function buildInitialForex() {
  return Object.entries(FOREX_PAIRS).map(([pair, def]) => ({
    pair,
    base: def.base,
    quote: def.quote,
    category: def.category,
    price: def.basePrice,
    prev_price: def.basePrice,
    open_price: def.basePrice,
    hi_session: def.basePrice * 1.002,
    lo_session: def.basePrice * 0.998,
    hi52w: def.basePrice * 1.08,
    lo52w: def.basePrice * 0.92,
    spread: def.spread,
    bid: def.basePrice - def.spread,
    ask: def.basePrice + def.spread,
    volume: Math.floor(Math.random() * 500000 + 100000),
    rsi: 50,
    momentum: 0,
    atr: def.basePrice * 0.0008,
    ema12: def.basePrice,
    ema26: def.basePrice,
    macd: 0,
    macd_signal: 0,
    macd_hist: 0,
    bb_upper: def.basePrice * (1 + 0.002),
    bb_middle: def.basePrice,
    bb_lower: def.basePrice * (1 - 0.002),
    bb_bw: 0.004,
    sma20: def.basePrice,
    sma50: def.basePrice,
    candle_open: def.basePrice,
    candle_high: def.basePrice,
    candle_low: def.basePrice,
    candle_ticks: 0,
    history: Array.from({ length: 20 }, () => def.basePrice * (1 + (Math.random() - 0.5) * 0.005)),
    candles: [],
  }));
}

// ── Technical indicators (shared logic) ──────────────────────────────────────
const CANDLE_PERIOD = 18;

function calcRSI(history) {
  if (history.length < 3) return 50;
  let gains = 0, losses = 0;
  const n = Math.min(14, history.length - 1);
  for (let i = history.length - n; i < history.length; i++) {
    const d = history[i] - history[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function ema(prev, cur, period) {
  const k = 2 / (period + 1);
  return cur * k + prev * (1 - k);
}

function calcBB(history, period = 20) {
  if (history.length < period) period = Math.max(2, history.length);
  const slice = history.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / slice.length;
  const std = Math.sqrt(variance);
  return { upper: mean + 2 * std, middle: mean, lower: mean - 2 * std, bw: std > 0 ? (4 * std) / mean : 0 };
}

function calcSMA(history, n) {
  if (history.length < n) n = history.length;
  const sl = history.slice(-n);
  return sl.reduce((a, b) => a + b, 0) / sl.length;
}

// ── Forex tick ────────────────────────────────────────────────────────────────
export function runForexTick(pairs) {
  const updated = pairs.map(p => {
    const def = FOREX_PAIRS[p.pair];
    if (!def) return p;

    const np_prev = p.price;
    const h = [...(Array.isArray(p.history) ? p.history : [p.price])];

    // GARCH-style rolling volatility
    let recentVol = 0;
    if (h.length >= 3) {
      const lookback = Math.min(8, h.length - 1);
      let sumSq = 0;
      for (let i = h.length - lookback; i < h.length; i++) {
        const ret = (h[i] - h[i - 1]) / h[i - 1];
        sumSq += ret * ret;
      }
      recentVol = Math.sqrt(sumSq / lookback);
    }
    const volCluster = 1 + recentVol * 18;

    // Category-based volatility multiplier
    const catMult = def.category === "exotic" ? 1.4 : def.category === "minor" ? 1.15 : 1.0;

    // Base move
    let np = np_prev + gaussian() * def.volatility * volCluster * catMult;

    // Stronger mean reversion for forex (currencies have purchasing power parity gravity)
    // Trend component for pairs like TRY that structurally depreciate
    const fairValue = def.basePrice * (1 + def.trend * (h.length / 200));
    np += -(np - fairValue) * 0.004;

    // Round to appropriate decimals
    const prec = def.decimals === 2 ? 100 : 10000;
    np = Math.round(np * prec) / prec;
    np = Math.max(def.basePrice * 0.5, Math.min(np, def.basePrice * 2.5));

    // Update history (keep 60)
    h.push(np);
    if (h.length > 60) h.splice(0, h.length - 60);

    // Indicators
    const newRsi = calcRSI(h);
    const newMomentum = p.momentum * 0.85 + (np - np_prev) / np_prev * 100 * 0.15;
    const newEma12 = ema(p.ema12, np, 12);
    const newEma26 = ema(p.ema26, np, 26);
    const newMacd = newEma12 - newEma26;
    const newMacdSignal = ema(p.macd_signal, newMacd, 9);
    const newBB = calcBB(h);
    const newSma20 = calcSMA(h, 20);
    const newSma50 = calcSMA(h, 50);

    // ATR (rolling average true range)
    const tr = Math.abs(np - np_prev);
    const newAtr = p.atr * 0.94 + tr * 0.06;

    // Session high/low
    const newHiSession = Math.max(p.hi_session, np);
    const newLoSession = Math.min(p.lo_session, np);

    // 52-week range
    const newHi52w = Math.max(p.hi52w, np);
    const newLo52w = Math.min(p.lo52w, np);

    // Spread (widens slightly in exotic volatility spikes)
    const spreadMult = 1 + (recentVol * 5);
    const newSpread = def.spread * Math.min(spreadMult, 3.0);
    const newBid = np - newSpread;
    const newAsk = np + newSpread;

    // Volume simulation
    const newVolume = p.volume + Math.floor(Math.random() * 50000 + 10000) * (def.category === "major" ? 5 : def.category === "minor" ? 2 : 1);

    // Candles
    let { candle_open, candle_high, candle_low, candle_ticks } = p;
    candle_ticks++;
    candle_high = Math.max(candle_high, np);
    candle_low  = Math.min(candle_low, np);

    const candles = Array.isArray(p.candles) ? [...p.candles] : [];
    if (candle_ticks >= CANDLE_PERIOD) {
      candles.push({ o: candle_open, h: candle_high, l: candle_low, c: np, v: Math.floor(newVolume * 0.01), t: Date.now() });
      if (candles.length > 48) candles.splice(0, candles.length - 48);
      candle_open = np; candle_high = np; candle_low = np; candle_ticks = 0;
    }

    return {
      ...p,
      prev_price: np_prev,
      price: np,
      hi_session: newHiSession,
      lo_session: newLoSession,
      hi52w: newHi52w,
      lo52w: newLo52w,
      spread: newSpread,
      bid: newBid,
      ask: newAsk,
      volume: newVolume,
      rsi: newRsi,
      momentum: newMomentum,
      atr: newAtr,
      ema12: newEma12,
      ema26: newEma26,
      macd: newMacd,
      macd_signal: newMacdSignal,
      macd_hist: newMacd - newMacdSignal,
      bb_upper: newBB.upper,
      bb_middle: newBB.middle,
      bb_lower: newBB.lower,
      bb_bw: newBB.bw,
      sma20: newSma20,
      sma50: newSma50,
      history: h,
      candles,
      candle_open,
      candle_high,
      candle_low,
      candle_ticks,
    };
  });

  return { pairs: updated };
}
