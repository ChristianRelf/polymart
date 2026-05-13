// ── Types ─────────────────────────────────────────────────────────────────────

export type StockDef = {
  name: string
  basePrice: number
  volatility: number
  trend: number
  sector: string
  mcap: "large" | "mid" | "small"
}

export type StockState = {
  name: string
  sector: string
  price: number
  prev: number
  open: number
  hi: number
  lo: number
  ath: number
  history: number[]
  vol: number
  streak: number
  ts: number
  rsi: number
  momentum: number
  insiderBias: number
  earningsCycle: number
}

export type MarketState = {
  fg: number
  idx: number
  idxP: number
  cc: number
  bc: number
  cu: number
  cd: number
  interestRate: number
  inflation: number
  gdpGrowth: number
}

export type SectorEntry = { s: number; m: number; newsStack: number }

export type MarketEvent = {
  text: string
  effect: number
  sector?: string
  weight: number
  time: number
}

// ── Static data ───────────────────────────────────────────────────────────────

export const SECTORS: Record<string, { label: string; icon: string }> = {
  tech:    { label: "Tech",         icon: "💻" },
  food:    { label: "Food & Bev",   icon: "🍔" },
  space:   { label: "Space",        icon: "🚀" },
  meme:    { label: "Meme",         icon: "🐸" },
  green:   { label: "Green Energy", icon: "🌿" },
  finance: { label: "Finance",      icon: "🏦" },
  gaming:  { label: "Gaming",       icon: "🎮" },
  health:  { label: "Health",       icon: "💊" },
  crypto:  { label: "Crypto",       icon: "₿"  },
  defence: { label: "Defence",      icon: "🛡️" },
  retail:  { label: "Retail",       icon: "🛒" },
  media:   { label: "Media",        icon: "📺" },
  auto:    { label: "Auto",         icon: "🚗" },
  realty:  { label: "Real Estate",  icon: "🏢" },
  travel:  { label: "Travel",       icon: "✈️" },
  ai:      { label: "AI & ML",      icon: "🤖" },
  bio:     { label: "Biotech",      icon: "🧬" },
  energy:  { label: "Energy",       icon: "⚡" },
  logistics:{ label: "Logistics",   icon: "📦" },
  agri:    { label: "Agriculture",  icon: "🌾" },
}

export const STOCK_DEFS: Record<string, StockDef> = {
  APEX:{name:"Apex AI Corp",basePrice:420,volatility:.11,trend:.002,sector:"tech",mcap:"large"},
  VOID:{name:"VoidTech Solutions",basePrice:550,volatility:.09,trend:-.001,sector:"tech",mcap:"large"},
  ROBO:{name:"RoboWaiter Ltd.",basePrice:180,volatility:.07,trend:.003,sector:"tech",mcap:"mid"},
  CHIP:{name:"ChipForge Semis",basePrice:290,volatility:.08,trend:.002,sector:"tech",mcap:"large"},
  QBIT:{name:"QubitCore Quantum",basePrice:340,volatility:.13,trend:.003,sector:"tech",mcap:"mid"},
  SYNC:{name:"SyncWave Systems",basePrice:95,volatility:.07,trend:.001,sector:"tech",mcap:"small"},
  NOOD:{name:"Noodle Network Inc.",basePrice:15,volatility:.14,trend:-.001,sector:"food",mcap:"small"},
  FIZZ:{name:"FizzBuzz Beverages",basePrice:62,volatility:.07,trend:.001,sector:"food",mcap:"mid"},
  BURG:{name:"BurgerDAO",basePrice:38,volatility:.09,trend:.001,sector:"food",mcap:"small"},
  BREW:{name:"BrewChain Coffee",basePrice:48,volatility:.06,trend:.002,sector:"food",mcap:"mid"},
  SNAK:{name:"SnackVault Global",basePrice:72,volatility:.05,trend:.001,sector:"food",mcap:"mid"},
  MOON:{name:"MoonShot Aerospace",basePrice:320,volatility:.08,trend:.002,sector:"space",mcap:"large"},
  ORBT:{name:"OrbitX Logistics",basePrice:210,volatility:.08,trend:.001,sector:"space",mcap:"mid"},
  MARS:{name:"Mars Colony Inc.",basePrice:145,volatility:.12,trend:.003,sector:"space",mcap:"mid"},
  ASTR:{name:"AstroMine Resources",basePrice:88,volatility:.10,trend:.002,sector:"space",mcap:"small"},
  NOVA:{name:"NovaLaunch Systems",basePrice:260,volatility:.09,trend:.001,sector:"space",mcap:"large"},
  DOGE:{name:"DogeCorp Industries",basePrice:45,volatility:.12,trend:.001,sector:"meme",mcap:"small"},
  MEME:{name:"MemeVault Holdings",basePrice:8,volatility:.22,trend:0,sector:"meme",mcap:"small"},
  YOLO:{name:"YOLO Ventures",basePrice:5,volatility:.28,trend:-.002,sector:"meme",mcap:"small"},
  PEPE:{name:"PepeFinance Ltd.",basePrice:3,volatility:.30,trend:0,sector:"meme",mcap:"small"},
  STONK:{name:"StonkMarket Memes",basePrice:12,volatility:.25,trend:.001,sector:"meme",mcap:"small"},
  GRDN:{name:"GreenGarden Bio",basePrice:95,volatility:.06,trend:.002,sector:"green",mcap:"mid"},
  SPRK:{name:"SparkEnergy Green",basePrice:75,volatility:.06,trend:.003,sector:"green",mcap:"mid"},
  LEAF:{name:"LeafWater Eco",basePrice:42,volatility:.05,trend:.002,sector:"green",mcap:"small"},
  WIND:{name:"WindForce Turbines",basePrice:110,volatility:.07,trend:.002,sector:"green",mcap:"mid"},
  SOLR:{name:"SolarGrid Corp",basePrice:135,volatility:.06,trend:.003,sector:"green",mcap:"large"},
  BNKR:{name:"BankerCoin Trust",basePrice:350,volatility:.05,trend:.001,sector:"finance",mcap:"large"},
  LEND:{name:"LendX Protocol",basePrice:120,volatility:.07,trend:.001,sector:"finance",mcap:"mid"},
  INSR:{name:"InsureAll Group",basePrice:85,volatility:.04,trend:.001,sector:"finance",mcap:"mid"},
  HEDG:{name:"HedgeFund Prime",basePrice:480,volatility:.06,trend:.001,sector:"finance",mcap:"large"},
  PAYX:{name:"PayXpress Digital",basePrice:65,volatility:.08,trend:.002,sector:"finance",mcap:"mid"},
  FRAG:{name:"FragStorm Studios",basePrice:110,volatility:.10,trend:.002,sector:"gaming",mcap:"mid"},
  LOOT:{name:"LootCrate Gaming",basePrice:28,volatility:.13,trend:0,sector:"gaming",mcap:"small"},
  PIXEL:{name:"PixelForge Games",basePrice:65,volatility:.09,trend:.001,sector:"gaming",mcap:"mid"},
  GGWP:{name:"GG Gaming League",basePrice:42,volatility:.11,trend:.002,sector:"gaming",mcap:"small"},
  VRTX:{name:"VortexVR Studios",basePrice:155,volatility:.10,trend:.002,sector:"gaming",mcap:"mid"},
  CURE:{name:"CureGen Pharma",basePrice:200,volatility:.08,trend:.002,sector:"health",mcap:"large"},
  VITA:{name:"VitaBoost Supps",basePrice:30,volatility:.06,trend:.001,sector:"health",mcap:"small"},
  MEDS:{name:"MedStar Biotech",basePrice:155,volatility:.10,trend:.001,sector:"health",mcap:"mid"},
  GENE:{name:"GeneEdit Labs",basePrice:280,volatility:.12,trend:.003,sector:"health",mcap:"mid"},
  RXAI:{name:"RxAI Diagnostics",basePrice:92,volatility:.09,trend:.002,sector:"health",mcap:"small"},
  HODL:{name:"HodlCoin Exchange",basePrice:90,volatility:.18,trend:0,sector:"crypto",mcap:"mid"},
  DEFI:{name:"DeFi Dynamics",basePrice:55,volatility:.20,trend:.001,sector:"crypto",mcap:"small"},
  MINE:{name:"MineBros Digital",basePrice:135,volatility:.15,trend:-.001,sector:"crypto",mcap:"mid"},
  WHAL:{name:"WhalePool Capital",basePrice:220,volatility:.16,trend:.001,sector:"crypto",mcap:"mid"},
  NFTX:{name:"NFTVerse Markets",basePrice:18,volatility:.24,trend:-.001,sector:"crypto",mcap:"small"},
  TANK:{name:"TankTech Defence",basePrice:400,volatility:.04,trend:.002,sector:"defence",mcap:"large"},
  SHLD:{name:"ShieldWall Systems",basePrice:175,volatility:.05,trend:.002,sector:"defence",mcap:"mid"},
  DRNE:{name:"DroneStrike Aero",basePrice:250,volatility:.06,trend:.001,sector:"defence",mcap:"mid"},
  ARMO:{name:"ArmorPlate Inc.",basePrice:130,volatility:.04,trend:.001,sector:"defence",mcap:"mid"},
  SHOP:{name:"ShopNet Global",basePrice:160,volatility:.07,trend:.002,sector:"retail",mcap:"large"},
  DLVR:{name:"DeliverFast Inc.",basePrice:78,volatility:.08,trend:.001,sector:"retail",mcap:"mid"},
  LUXE:{name:"LuxeBrand Holdings",basePrice:340,volatility:.06,trend:.001,sector:"retail",mcap:"large"},
  DEAL:{name:"DealHunter Markets",basePrice:22,volatility:.10,trend:0,sector:"retail",mcap:"small"},
  CART:{name:"CartWheelCommerce",basePrice:55,volatility:.07,trend:.002,sector:"retail",mcap:"mid"},
  STRM:{name:"StreamBox Media",basePrice:185,volatility:.09,trend:.001,sector:"media",mcap:"large"},
  BUZZ:{name:"BuzzFeed Social",basePrice:14,volatility:.16,trend:-.001,sector:"media",mcap:"small"},
  CAST:{name:"CastWave Podcasts",basePrice:38,volatility:.08,trend:.002,sector:"media",mcap:"small"},
  REEL:{name:"ReelTok Studios",basePrice:95,volatility:.11,trend:.002,sector:"media",mcap:"mid"},
  NEWS:{name:"NewsForge Digital",basePrice:52,volatility:.07,trend:0,sector:"media",mcap:"mid"},

  // ── Tech extras ──
  CLOD:{name:"CloudNest Computing",basePrice:310,volatility:.09,trend:.002,sector:"tech",mcap:"large"},
  NETX:{name:"NetX Fiber Optics",basePrice:74,volatility:.06,trend:.001,sector:"tech",mcap:"mid"},
  SCAN:{name:"ScanSec Cyber",basePrice:142,volatility:.10,trend:.002,sector:"tech",mcap:"mid"},
  DBYT:{name:"DataByte Analytics",basePrice:220,volatility:.08,trend:.002,sector:"tech",mcap:"large"},
  PROX:{name:"ProxyShield VPN",basePrice:58,volatility:.07,trend:.001,sector:"tech",mcap:"small"},

  // ── AI & ML ──
  GNAI:{name:"GenAI Systems",basePrice:480,volatility:.14,trend:.004,sector:"ai",mcap:"large"},
  LMAI:{name:"LLMart Corp",basePrice:360,volatility:.12,trend:.003,sector:"ai",mcap:"large"},
  NRAL:{name:"NeuralPath AI",basePrice:195,volatility:.13,trend:.003,sector:"ai",mcap:"mid"},
  VISI:{name:"VisonIQ Imaging",basePrice:108,volatility:.11,trend:.002,sector:"ai",mcap:"mid"},
  ORCH:{name:"Orchestron Agents",basePrice:68,volatility:.15,trend:.003,sector:"ai",mcap:"small"},
  SPKR:{name:"SpeakAI Transcription",basePrice:44,volatility:.12,trend:.002,sector:"ai",mcap:"small"},

  // ── Biotech ──
  CRSP:{name:"CrisprGen Biolab",basePrice:310,volatility:.14,trend:.003,sector:"bio",mcap:"large"},
  PROT:{name:"ProteX Therapeutics",basePrice:175,volatility:.13,trend:.002,sector:"bio",mcap:"mid"},
  CELL:{name:"CellForge Bio",basePrice:92,volatility:.12,trend:.002,sector:"bio",mcap:"mid"},
  IMUN:{name:"ImmunoBoost Corp",basePrice:128,volatility:.11,trend:.002,sector:"bio",mcap:"mid"},
  SYNT:{name:"SynthBio Labs",basePrice:56,volatility:.15,trend:.003,sector:"bio",mcap:"small"},
  MRNA:{name:"mRNAtrix Research",basePrice:145,volatility:.13,trend:.003,sector:"bio",mcap:"mid"},

  // ── Auto ──
  EVOX:{name:"EvoX Electric Motors",basePrice:290,volatility:.10,trend:.003,sector:"auto",mcap:"large"},
  VOLT:{name:"VoltDrive Autos",basePrice:210,volatility:.09,trend:.002,sector:"auto",mcap:"large"},
  HYDR:{name:"HydroWheels Inc.",basePrice:88,volatility:.08,trend:.002,sector:"auto",mcap:"mid"},
  AUTN:{name:"AutoNova Robotics",basePrice:150,volatility:.10,trend:.003,sector:"auto",mcap:"mid"},
  PKLOT:{name:"ParkMesh Infra",basePrice:42,volatility:.06,trend:.001,sector:"auto",mcap:"small"},
  TRKR:{name:"TruckerX Fleet",basePrice:66,volatility:.07,trend:.001,sector:"auto",mcap:"small"},

  // ── Real Estate ──
  REIT:{name:"RealCoin REIT",basePrice:95,volatility:.05,trend:.001,sector:"realty",mcap:"large"},
  PROP:{name:"PropVault Group",basePrice:185,volatility:.04,trend:.001,sector:"realty",mcap:"large"},
  SPCX:{name:"SpaceEx Offices",basePrice:68,volatility:.06,trend:.001,sector:"realty",mcap:"mid"},
  LOFT:{name:"LoftDAO Residential",basePrice:38,volatility:.07,trend:.001,sector:"realty",mcap:"small"},
  BRIK:{name:"BrickChain Infra",basePrice:52,volatility:.05,trend:.001,sector:"realty",mcap:"mid"},

  // ── Travel ──
  SOAR:{name:"SoarAir Holdings",basePrice:175,volatility:.09,trend:.001,sector:"travel",mcap:"large"},
  CRUZ:{name:"CruzLine Cruises",basePrice:88,volatility:.10,trend:.001,sector:"travel",mcap:"mid"},
  STAY:{name:"StayNow Hotels",basePrice:120,volatility:.08,trend:.002,sector:"travel",mcap:"mid"},
  XPDT:{name:"XpeditionTours",basePrice:44,volatility:.11,trend:.001,sector:"travel",mcap:"small"},
  JETT:{name:"JetTrail Charter",basePrice:210,volatility:.09,trend:.001,sector:"travel",mcap:"mid"},
  RAIL:{name:"RailConnect Trains",basePrice:78,volatility:.06,trend:.001,sector:"travel",mcap:"mid"},

  // ── Energy ──
  PETR:{name:"PetroCrest Oil",basePrice:320,volatility:.07,trend:.001,sector:"energy",mcap:"large"},
  NUKE:{name:"NucleoGen Power",basePrice:240,volatility:.05,trend:.002,sector:"energy",mcap:"large"},
  GASX:{name:"GasFlex Pipelines",basePrice:112,volatility:.06,trend:.001,sector:"energy",mcap:"mid"},
  FUSE:{name:"FusionStar Reactor",basePrice:165,volatility:.11,trend:.003,sector:"energy",mcap:"mid"},
  HYDP:{name:"HydroPower Grid",basePrice:88,volatility:.04,trend:.001,sector:"energy",mcap:"mid"},
  COAL:{name:"CoalSeam Mining",basePrice:48,volatility:.08,trend:-.002,sector:"energy",mcap:"small"},

  // ── Logistics ──
  SHPY:{name:"ShipYard Global",basePrice:195,volatility:.06,trend:.002,sector:"logistics",mcap:"large"},
  DRON:{name:"DroneDelivery Net",basePrice:78,volatility:.10,trend:.003,sector:"logistics",mcap:"mid"},
  FRTX:{name:"FreightX Express",basePrice:130,volatility:.07,trend:.002,sector:"logistics",mcap:"mid"},
  LAST:{name:"LastMile Robotics",basePrice:55,volatility:.11,trend:.003,sector:"logistics",mcap:"small"},
  WRHX:{name:"WareHouseX Auto",basePrice:44,volatility:.08,trend:.002,sector:"logistics",mcap:"small"},
  COLD:{name:"ColdChain Logistics",basePrice:68,volatility:.06,trend:.001,sector:"logistics",mcap:"mid"},

  // ── Agriculture ──
  FARM:{name:"FarmTech Robotics",basePrice:88,volatility:.07,trend:.002,sector:"agri",mcap:"mid"},
  SEED:{name:"SeedVault Genomics",basePrice:62,volatility:.09,trend:.002,sector:"agri",mcap:"mid"},
  AQUA:{name:"AquaFarm Systems",basePrice:38,volatility:.08,trend:.002,sector:"agri",mcap:"small"},
  FRTL:{name:"FertiLux Corp",basePrice:52,volatility:.06,trend:.001,sector:"agri",mcap:"small"},
  HVST:{name:"HarvestAI Drones",basePrice:75,volatility:.10,trend:.003,sector:"agri",mcap:"mid"},
  GRAI:{name:"GrainEx Trading",basePrice:44,volatility:.07,trend:.001,sector:"agri",mcap:"small"},

  // ── Finance extras ──
  NBNK:{name:"NeoBank Pulse",basePrice:88,volatility:.09,trend:.002,sector:"finance",mcap:"mid"},
  STBL:{name:"StableX Protocol",basePrice:145,volatility:.06,trend:.001,sector:"finance",mcap:"mid"},
  WLTH:{name:"WealthBridge Fund",basePrice:320,volatility:.05,trend:.001,sector:"finance",mcap:"large"},
  TOKN:{name:"TokenVault Finance",basePrice:55,volatility:.12,trend:.002,sector:"finance",mcap:"small"},

  // ── Health extras ──
  TELE:{name:"TeleDoc Health",basePrice:112,volatility:.08,trend:.002,sector:"health",mcap:"mid"},
  WLLB:{name:"WellBot AI Clinics",basePrice:68,volatility:.10,trend:.003,sector:"health",mcap:"small"},
  DNTL:{name:"DentaChain Clinics",basePrice:44,volatility:.07,trend:.001,sector:"health",mcap:"small"},

  // ── Gaming extras ──
  METV:{name:"MetaVerse Arena",basePrice:88,volatility:.13,trend:.002,sector:"gaming",mcap:"mid"},
  NFTR:{name:"NFT Realm Games",basePrice:22,volatility:.18,trend:0,sector:"gaming",mcap:"small"},
  ESPT:{name:"eSport Nation",basePrice:58,volatility:.11,trend:.002,sector:"gaming",mcap:"mid"},

  // ── Media extras ──
  PODC:{name:"PodcastHub Global",basePrice:36,volatility:.09,trend:.001,sector:"media",mcap:"small"},
  LIVE:{name:"LiveStream Inc.",basePrice:72,volatility:.10,trend:.002,sector:"media",mcap:"mid"},
  ANIM:{name:"AnimaStudio Films",basePrice:88,volatility:.08,trend:.001,sector:"media",mcap:"mid"},

  // ── Meme extras ──
  BONK:{name:"BonkCoin Corp",basePrice:2,volatility:.35,trend:0,sector:"meme",mcap:"small"},
  FOMO:{name:"FOMO Markets Ltd",basePrice:7,volatility:.30,trend:-.001,sector:"meme",mcap:"small"},
  LAMBO:{name:"LamboDAO",basePrice:4,volatility:.32,trend:.001,sector:"meme",mcap:"small"},

  // ── Defence extras ──
  SATL:{name:"SatelliteGuard Corp",basePrice:280,volatility:.05,trend:.002,sector:"defence",mcap:"large"},
  CYBX:{name:"CyberWarX Systems",basePrice:195,volatility:.07,trend:.002,sector:"defence",mcap:"mid"},
  RADS:{name:"RadarSense Tech",basePrice:118,volatility:.05,trend:.001,sector:"defence",mcap:"mid"},
}

const EVENTS_RAW = [
  {text:"Federal Reserve announces rate cut",effect:.05,weight:2},
  {text:"Inflation above expectations",effect:-.04,weight:2},
  {text:"Bull market rally continues",effect:.03,weight:1},
  {text:"Recession fears escalate",effect:-.06,weight:2},
  {text:"Global trade deal signed",effect:.05,weight:2},
  {text:"Oil prices surge",effect:-.03,weight:1},
  {text:"Consumer confidence 10yr high",effect:.02,weight:1},
  {text:"Flash crash triggers circuit breakers",effect:-.09,weight:3},
  {text:"Record IPO week",effect:.03,weight:1},
  {text:"Geopolitical tensions spike",effect:-.05,weight:2},
  {text:"GDP growth beats forecasts",effect:.04,weight:2},
  {text:"Bond yields invert",effect:-.04,weight:2},
  {text:"$2T infrastructure package",effect:.04,weight:2},
  {text:"Supply chain crisis deepens",effect:-.03,weight:1},
  {text:"Unemployment at historic low",effect:.03,weight:1},
  {text:"AI breakthrough sends tech soaring",effect:.08,sector:"tech",weight:3},
  {text:"Data breach exposes 500M accounts",effect:-.06,sector:"tech",weight:2},
  {text:"$100B tech buyback announced",effect:.05,sector:"tech",weight:2},
  {text:"Antitrust lawsuit filed",effect:-.05,sector:"tech",weight:2},
  {text:"Quantum computing milestone",effect:.06,sector:"tech",weight:2},
  {text:"Superfood trend goes viral",effect:.04,sector:"food",weight:1},
  {text:"E. coli outbreak recall",effect:-.06,sector:"food",weight:2},
  {text:"Lab-grown meat FDA approved",effect:.05,sector:"food",weight:2},
  {text:"$80B space contract awarded",effect:.07,sector:"space",weight:2},
  {text:"Rocket test catastrophic failure",effect:-.07,sector:"space",weight:2},
  {text:"Commercial moon landing succeeds",effect:.09,sector:"space",weight:3},
  {text:"Meme stock frenzy erupts",effect:.12,sector:"meme",weight:3},
  {text:"Viral TikTok pumps memes",effect:.15,sector:"meme",weight:3},
  {text:"Meme bubble bursts",effect:-.12,sector:"meme",weight:3},
  {text:"Influencer dumps position",effect:-.09,sector:"meme",weight:2},
  {text:"$500B green subsidy package",effect:.06,sector:"green",weight:2},
  {text:"Battery storage breakthrough",effect:.07,sector:"green",weight:2},
  {text:"Central bank dovish pivot",effect:.04,sector:"finance",weight:2},
  {text:"Major bank $8B loss",effect:-.06,sector:"finance",weight:2},
  {text:"Blockbuster game breaks records",effect:.07,sector:"gaming",weight:2},
  {text:"E-sports $2B broadcast deal",effect:.06,sector:"gaming",weight:2},
  {text:"FDA fast-tracks breakthrough drug",effect:.08,sector:"health",weight:2},
  {text:"Phase 3 trial fails",effect:-.07,sector:"health",weight:2},
  {text:"CRISPR 95% efficacy",effect:.09,sector:"health",weight:3},
  {text:"Bitcoin new all-time high",effect:.12,sector:"crypto",weight:3},
  {text:"Exchange hacked for $2B",effect:-.14,sector:"crypto",weight:3},
  {text:"SEC approves crypto ETF",effect:.10,sector:"crypto",weight:3},
  {text:"Defence budget +12% YoY",effect:.05,sector:"defence",weight:2},
  {text:"$30B drone contract",effect:.06,sector:"defence",weight:2},
  {text:"Holiday sales smash records",effect:.06,sector:"retail",weight:2},
  {text:"500 store closures",effect:-.06,sector:"retail",weight:2},
  {text:"Streaming hits 500M subs",effect:.07,sector:"media",weight:2},
  {text:"Ad revenue plummets",effect:-.06,sector:"media",weight:2},
  // AI & ML
  {text:"AGI milestone announced",effect:.14,sector:"ai",weight:3},
  {text:"AI regulation framework passes",effect:-.07,sector:"ai",weight:2},
  {text:"Landmark AI safety benchmark set",effect:.06,sector:"ai",weight:2},
  {text:"AI model copyright lawsuit",effect:-.05,sector:"ai",weight:2},
  // Biotech
  {text:"Universal cancer vaccine approved",effect:.12,sector:"bio",weight:3},
  {text:"Clinical trial halt on safety",effect:-.09,sector:"bio",weight:2},
  {text:"Longevity drug enters Phase 2",effect:.08,sector:"bio",weight:2},
  // Auto
  {text:"Self-driving full approval granted",effect:.09,sector:"auto",weight:3},
  {text:"Mass EV recall issued",effect:-.08,sector:"auto",weight:2},
  {text:"$50B EV charging deal",effect:.06,sector:"auto",weight:2},
  {text:"Battery fire scandal",effect:-.07,sector:"auto",weight:2},
  // Real Estate
  {text:"Mortgage rates hit decade low",effect:.07,sector:"realty",weight:2},
  {text:"Housing bubble fears grow",effect:-.06,sector:"realty",weight:2},
  {text:"Remote work drives suburban boom",effect:.05,sector:"realty",weight:1},
  // Travel
  {text:"Tourism hits post-pandemic record",effect:.07,sector:"travel",weight:2},
  {text:"Pandemic travel ban fears",effect:-.08,sector:"travel",weight:2},
  {text:"Supersonic jet commercial launch",effect:.06,sector:"travel",weight:2},
  // Energy
  {text:"Oil cartel cuts production 20%",effect:.08,sector:"energy",weight:3},
  {text:"Fusion reactor sustained reaction",effect:.12,sector:"energy",weight:3},
  {text:"Carbon tax triples",effect:-.06,sector:"energy",weight:2},
  {text:"Major refinery explosion",effect:-.07,sector:"energy",weight:2},
  // Logistics
  {text:"Port strike halts $500B trade",effect:-.07,sector:"logistics",weight:2},
  {text:"Drone delivery legalized globally",effect:.09,sector:"logistics",weight:3},
  {text:"Supply chain AI cuts costs 30%",effect:.06,sector:"logistics",weight:2},
  // Agriculture
  {text:"Global drought cuts yields 25%",effect:-.07,sector:"agri",weight:2},
  {text:"Vertical farming revolution",effect:.07,sector:"agri",weight:2},
  {text:"Fertilizer shortage crisis",effect:-.06,sector:"agri",weight:2},
  {text:"Gene-edited crops yield record",effect:.08,sector:"agri",weight:2},
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function gaussian(): number {
  const u1 = Math.random(), u2 = Math.random()
  const z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2)
  if (Math.random() < 0.08) return z * (2.5 + Math.random() * 1.5)
  return z
}

export function fgLabel(v: number): string {
  if (v <= 12) return "Extreme Fear"
  if (v <= 25) return "Fear"
  if (v <= 40) return "Cautious"
  if (v <= 60) return "Neutral"
  if (v <= 75) return "Greed"
  if (v <= 88) return "High Greed"
  return "Extreme Greed"
}

function mcapMult(m: string): number {
  return m === "large" ? 1 : m === "mid" ? 1.3 : 1.6
}

// ── Init ──────────────────────────────────────────────────────────────────────

export function initStocks(): Record<string, StockState> {
  const s: Record<string, StockState> = {}
  for (const t of Object.keys(STOCK_DEFS)) {
    const d = STOCK_DEFS[t]
    s[t] = {
      name: d.name, sector: d.sector,
      price: d.basePrice, prev: d.basePrice, open: d.basePrice,
      hi: d.basePrice, lo: d.basePrice, ath: d.basePrice,
      history: [d.basePrice], vol: 0, streak: 0,
      ts: Date.now(), rsi: 50, momentum: 0, insiderBias: 0,
      earningsCycle: Math.random() * 100,
    }
  }
  return s
}

export function initMarket(): MarketState {
  return { fg: 50, idx: 1000, idxP: 1000, cc: 0, bc: 0, cu: 0, cd: 0, interestRate: 5.0, inflation: 2.5, gdpGrowth: 2.8 }
}

export function initSectors(): Record<string, SectorEntry> {
  const s: Record<string, SectorEntry> = {}
  for (const k of Object.keys(SECTORS)) s[k] = { s: 0, m: 0, newsStack: 0 }
  return s
}

// ── Tick ──────────────────────────────────────────────────────────────────────

export function simTick(
  stocks: Record<string, StockState>,
  ms: MarketState,
  ss: Record<string, SectorEntry>,
  evts: MarketEvent[],
): { stocks: Record<string, StockState>; ms: MarketState; ss: Record<string, SectorEntry>; ev: MarketEvent[] } {
  // deep clone
  const d: Record<string, StockState> = JSON.parse(JSON.stringify(stocks))
  const m: MarketState = { ...ms }
  const sec: Record<string, SectorEntry> = JSON.parse(JSON.stringify(ss))
  const ev = evts.slice()

  m.interestRate = Math.max(0, Math.min(12, m.interestRate + (Math.random() - .5) * .02))
  m.inflation    = Math.max(-.5, Math.min(8, m.inflation + (Math.random() - .5) * .01))
  m.gdpGrowth    = Math.max(-3, Math.min(7, m.gdpGrowth + (Math.random() - .5) * .02))
  m.fg = Math.max(0, Math.min(100,
    m.fg
    + (Math.random() - 0.5) * 0.65
    + (50 - m.fg) * 0.0008
    + (m.gdpGrowth - 2) * 0.06
    - (m.inflation - 2.5) * 0.04
  ))

  const gs = (m.fg - 50) / 50 * .003
  const rp = -(m.interestRate - 5) * .0005
  const ip = -(m.inflation - 2.5) * .0004
  const gb = (m.gdpGrowth - 2.8) * .0003

  let event: typeof EVENTS_RAW[0] | null = null
  if (Math.random() < .10) {
    const w: typeof EVENTS_RAW = []
    EVENTS_RAW.forEach(e => { for (let i = 0; i < (e.weight || 1); i++) w.push(e) })
    event = w[Math.floor(Math.random() * w.length)]
    ev.push({ ...event, time: Date.now() })
    if (ev.length > 30) ev.shift()
    m.fg = Math.max(0, Math.min(100, m.fg + event.effect * 35))
    const sec_ = (event as any).sector as string | undefined
    if (sec_ && sec[sec_]) sec[sec_].newsStack += event.effect * .6
  }

  for (const k of Object.keys(sec)) {
    const s = sec[k]
    s.newsStack *= .92
    s.m = s.m * .96 + (Math.random() - .5) * .002
    s.s = Math.max(-.06, Math.min(.06, (s.s + s.m + gs * .05 + s.newsStack * .02) * .99))
  }

  if (m.cc > 0) m.cc--
  if (m.bc > 0) m.bc--
  let cm = 1
  if (!m.cc && m.fg < 8 && Math.random() < .015) { cm = -2.5; ev.push({ text: "MARKET CRASH!", effect: -.18, time: Date.now(), weight: 3 }); m.cc = 80; m.fg = 3 }
  if (!m.bc && m.fg > 92 && Math.random() < .015) { cm = 1.8; ev.push({ text: "MARKET BOOM!", effect: .14, time: Date.now(), weight: 3 }); m.bc = 80; m.fg = 95 }

  let idx = 0
  for (const t of Object.keys(STOCK_DEFS)) {
    const def = STOCK_DEFS[t]
    const st = d[t]
    if (!st) continue
    const p = st.price
    const n = gaussian()
    const se = (sec[def.sector] || {}).s || 0
    const mcm = mcapMult(def.mcap)

    let ee = 0
    if (event) {
      const es = (event as any).sector as string | undefined
      if (es === def.sector) ee = event.effect * .18 * mcm
      else if (!es) ee = event.effect * .12
      else ee = event.effect * .02
    }

    const nc = ((sec[def.sector] || {}).newsStack || 0) * .008 * mcm
    const h = st.history
    const mom = h.length >= 12 ? (h[h.length - 1] - h[h.length - 12]) / p * .006 : 0
    st.momentum = st.momentum * .9 + mom * .1

    let gains = 0, losses = 0
    const lb = Math.min(14, h.length - 1)
    for (let i = h.length - lb; i < h.length; i++) {
      const diff = h[i] - h[i - 1]
      if (diff > 0) gains += diff; else losses -= diff
    }
    const rs = losses === 0 ? 100 : gains / losses
    st.rsi = 100 - 100 / (1 + rs)

    const rsiP = st.rsi > 75 ? -(st.rsi - 75) * .0002 : st.rsi < 25 ? (25 - st.rsi) * .0002 : 0
    st.insiderBias = Math.max(-.01, Math.min(.01, (st.insiderBias + (Math.random() - .5) * .003) * .95))
    st.earningsCycle += .3
    const eE = Math.sin(st.earningsCycle * Math.PI / 50) * .001
    const sk = Math.max(-6, Math.min(6, st.streak || 0)) * .0003

    let cor = 0
    if (def.sector === "crypto")    cor = ((sec.meme || {}).s || 0) * .04 + ((sec.tech || {}).s || 0) * .02
    if (def.sector === "meme")      cor = ((sec.crypto || {}).s || 0) * .04 + ((sec.media || {}).s || 0) * .02
    if (def.sector === "defence")   cor = (50 - m.fg) / 50 * .0015
    if (def.sector === "green")     cor = -(m.interestRate - 5) * .0003
    if (def.sector === "retail")    cor = (m.gdpGrowth - 2.8) * .0004 - (m.inflation - 2.5) * .0003
    if (def.sector === "media")     cor = ((sec.tech || {}).s || 0) * .02
    if (def.sector === "finance")   cor = rp * .5
    if (def.sector === "ai")        cor = ((sec.tech || {}).s || 0) * .05 + ((sec.bio || {}).s || 0) * .01
    if (def.sector === "bio")       cor = ((sec.health || {}).s || 0) * .04
    if (def.sector === "auto")      cor = (m.gdpGrowth - 2.8) * .0005 - (m.inflation - 2.5) * .0004
    if (def.sector === "realty")    cor = rp * .6 - (m.inflation - 2.5) * .0003
    if (def.sector === "travel")    cor = (m.gdpGrowth - 2.8) * .0004 + ((sec.retail || {}).s || 0) * .02
    if (def.sector === "energy")    cor = (m.inflation - 2.5) * .0005
    if (def.sector === "logistics") cor = ((sec.retail || {}).s || 0) * .03 + (m.gdpGrowth - 2.8) * .0003
    if (def.sector === "agri")      cor = (m.inflation - 2.5) * .0004 - (m.gdpGrowth - 2.8) * .0002

    const tv = def.volatility * .03 * mcm
    const trendDrift = Math.min(1 + def.trend * (st.earningsCycle / 300), 10)
    const fairValue = def.basePrice * Math.max(0.1, trendDrift)
    let np = p + p * (def.trend * .02 + tv * n * Math.abs(cm) + se * .04 + ee + nc + st.momentum * .3 + sk + gs * .08 + cor + rsiP + st.insiderBias + eE + rp + ip + gb) * (cm < 0 ? -1 : 1)
    np += -(np - fairValue) * 0.002
    np = Math.round(Math.max(0.10, Math.min(np, def.basePrice * 10)) * 100) / 100

    st.vol += Math.floor(600 + Math.abs(np - p) / p * 100000 + Math.random() * 3000)

    if (np > p) st.streak = Math.max(0, st.streak || 0) + 1
    else if (np < p) st.streak = Math.min(0, st.streak || 0) - 1
    else st.streak = 0

    st.prev = p
    st.price = np
    st.history.push(np)
    if (st.history.length > 400) st.history = st.history.slice(-400)
    if (np > st.hi) st.hi = np
    if (np < st.lo) st.lo = np
    if (np > st.ath) st.ath = np
    st.ts = Date.now()
    idx += np
  }

  m.idxP = m.idx
  m.idx = Math.round(idx * 100) / 100
  if (m.idx > m.idxP) { m.cu++; m.cd = 0 } else { m.cd++; m.cu = 0 }

  return { stocks: d, ms: m, ss: sec, ev }
}
