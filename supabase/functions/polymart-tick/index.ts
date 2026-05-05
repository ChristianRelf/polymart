import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ── Static definitions ────────────────────────────────────────────────────────

const SECTORS: Record<string, { label: string; icon: string }> = {
  tech:     { label: "Tech",         icon: "💻" },
  food:     { label: "Food & Bev",   icon: "🍔" },
  space:    { label: "Space",        icon: "🚀" },
  meme:     { label: "Meme",         icon: "🐸" },
  green:    { label: "Green Energy", icon: "🌿" },
  finance:  { label: "Finance",      icon: "🏦" },
  gaming:   { label: "Gaming",       icon: "🎮" },
  health:   { label: "Health",       icon: "💊" },
  crypto:   { label: "Crypto",       icon: "₿"  },
  defence:  { label: "Defence",      icon: "🛡️" },
  retail:   { label: "Retail",       icon: "🛒" },
  media:    { label: "Media",        icon: "📺" },
  auto:     { label: "Auto",         icon: "🚗" },
  realty:   { label: "Real Estate",  icon: "🏢" },
  travel:   { label: "Travel",       icon: "✈️" },
  ai:       { label: "AI & ML",      icon: "🤖" },
  bio:      { label: "Biotech",      icon: "🧬" },
  energy:   { label: "Energy",       icon: "⚡" },
  logistics:{ label: "Logistics",    icon: "📦" },
  agri:     { label: "Agriculture",  icon: "🌾" },
};

type McapType = "large" | "mid" | "small";
type StockDef = { name: string; basePrice: number; volatility: number; trend: number; sector: string; mcap: McapType };

const STOCK_DEFS: Record<string, StockDef> = {
  // Tech
  APEX:{name:"Apex AI Corp",basePrice:420,volatility:.11,trend:.002,sector:"tech",mcap:"large"},
  VOID:{name:"VoidTech Solutions",basePrice:550,volatility:.09,trend:-.001,sector:"tech",mcap:"large"},
  ROBO:{name:"RoboWaiter Ltd.",basePrice:180,volatility:.07,trend:.003,sector:"tech",mcap:"mid"},
  CHIP:{name:"ChipForge Semis",basePrice:290,volatility:.08,trend:.002,sector:"tech",mcap:"large"},
  QBIT:{name:"QubitCore Quantum",basePrice:340,volatility:.13,trend:.003,sector:"tech",mcap:"mid"},
  SYNC:{name:"SyncWave Systems",basePrice:95,volatility:.07,trend:.001,sector:"tech",mcap:"small"},
  CLOD:{name:"CloudNest Computing",basePrice:310,volatility:.09,trend:.002,sector:"tech",mcap:"large"},
  NETX:{name:"NetX Fiber Optics",basePrice:74,volatility:.06,trend:.001,sector:"tech",mcap:"mid"},
  SCAN:{name:"ScanSec Cyber",basePrice:142,volatility:.10,trend:.002,sector:"tech",mcap:"mid"},
  DBYT:{name:"DataByte Analytics",basePrice:220,volatility:.08,trend:.002,sector:"tech",mcap:"large"},
  PROX:{name:"ProxyShield VPN",basePrice:58,volatility:.07,trend:.001,sector:"tech",mcap:"small"},
  // Food
  NOOD:{name:"Noodle Network Inc.",basePrice:15,volatility:.14,trend:-.001,sector:"food",mcap:"small"},
  FIZZ:{name:"FizzBuzz Beverages",basePrice:62,volatility:.07,trend:.001,sector:"food",mcap:"mid"},
  BURG:{name:"BurgerDAO",basePrice:38,volatility:.09,trend:.001,sector:"food",mcap:"small"},
  BREW:{name:"BrewChain Coffee",basePrice:48,volatility:.06,trend:.002,sector:"food",mcap:"mid"},
  SNAK:{name:"SnackVault Global",basePrice:72,volatility:.05,trend:.001,sector:"food",mcap:"mid"},
  // Space
  MOON:{name:"MoonShot Aerospace",basePrice:320,volatility:.08,trend:.002,sector:"space",mcap:"large"},
  ORBT:{name:"OrbitX Logistics",basePrice:210,volatility:.08,trend:.001,sector:"space",mcap:"mid"},
  MARS:{name:"Mars Colony Inc.",basePrice:145,volatility:.12,trend:.003,sector:"space",mcap:"mid"},
  ASTR:{name:"AstroMine Resources",basePrice:88,volatility:.10,trend:.002,sector:"space",mcap:"small"},
  NOVA:{name:"NovaLaunch Systems",basePrice:260,volatility:.09,trend:.001,sector:"space",mcap:"large"},
  // Meme
  DOGE:{name:"DogeCorp Industries",basePrice:45,volatility:.12,trend:.001,sector:"meme",mcap:"small"},
  MEME:{name:"MemeVault Holdings",basePrice:8,volatility:.22,trend:0,sector:"meme",mcap:"small"},
  YOLO:{name:"YOLO Ventures",basePrice:5,volatility:.28,trend:-.002,sector:"meme",mcap:"small"},
  PEPE:{name:"PepeFinance Ltd.",basePrice:3,volatility:.30,trend:0,sector:"meme",mcap:"small"},
  STONK:{name:"StonkMarket Memes",basePrice:12,volatility:.25,trend:.001,sector:"meme",mcap:"small"},
  BONK:{name:"BonkCoin Corp",basePrice:2,volatility:.35,trend:0,sector:"meme",mcap:"small"},
  FOMO:{name:"FOMO Markets Ltd",basePrice:7,volatility:.30,trend:-.001,sector:"meme",mcap:"small"},
  LAMBO:{name:"LamboDAO",basePrice:4,volatility:.32,trend:.001,sector:"meme",mcap:"small"},
  // Green Energy
  GRDN:{name:"GreenGarden Bio",basePrice:95,volatility:.06,trend:.002,sector:"green",mcap:"mid"},
  SPRK:{name:"SparkEnergy Green",basePrice:75,volatility:.06,trend:.003,sector:"green",mcap:"mid"},
  LEAF:{name:"LeafWater Eco",basePrice:42,volatility:.05,trend:.002,sector:"green",mcap:"small"},
  WIND:{name:"WindForce Turbines",basePrice:110,volatility:.07,trend:.002,sector:"green",mcap:"mid"},
  SOLR:{name:"SolarGrid Corp",basePrice:135,volatility:.06,trend:.003,sector:"green",mcap:"large"},
  // Finance
  BNKR:{name:"BankerCoin Trust",basePrice:350,volatility:.05,trend:.001,sector:"finance",mcap:"large"},
  LEND:{name:"LendX Protocol",basePrice:120,volatility:.07,trend:.001,sector:"finance",mcap:"mid"},
  INSR:{name:"InsureAll Group",basePrice:85,volatility:.04,trend:.001,sector:"finance",mcap:"mid"},
  HEDG:{name:"HedgeFund Prime",basePrice:480,volatility:.06,trend:.001,sector:"finance",mcap:"large"},
  PAYX:{name:"PayXpress Digital",basePrice:65,volatility:.08,trend:.002,sector:"finance",mcap:"mid"},
  NBNK:{name:"NeoBank Pulse",basePrice:88,volatility:.09,trend:.002,sector:"finance",mcap:"mid"},
  STBL:{name:"StableX Protocol",basePrice:145,volatility:.06,trend:.001,sector:"finance",mcap:"mid"},
  WLTH:{name:"WealthBridge Fund",basePrice:320,volatility:.05,trend:.001,sector:"finance",mcap:"large"},
  TOKN:{name:"TokenVault Finance",basePrice:55,volatility:.12,trend:.002,sector:"finance",mcap:"small"},
  // Gaming
  FRAG:{name:"FragStorm Studios",basePrice:110,volatility:.10,trend:.002,sector:"gaming",mcap:"mid"},
  LOOT:{name:"LootCrate Gaming",basePrice:28,volatility:.13,trend:0,sector:"gaming",mcap:"small"},
  PIXEL:{name:"PixelForge Games",basePrice:65,volatility:.09,trend:.001,sector:"gaming",mcap:"mid"},
  GGWP:{name:"GG Gaming League",basePrice:42,volatility:.11,trend:.002,sector:"gaming",mcap:"small"},
  VRTX:{name:"VortexVR Studios",basePrice:155,volatility:.10,trend:.002,sector:"gaming",mcap:"mid"},
  METV:{name:"MetaVerse Arena",basePrice:88,volatility:.13,trend:.002,sector:"gaming",mcap:"mid"},
  NFTR:{name:"NFT Realm Games",basePrice:22,volatility:.18,trend:0,sector:"gaming",mcap:"small"},
  ESPT:{name:"eSport Nation",basePrice:58,volatility:.11,trend:.002,sector:"gaming",mcap:"mid"},
  // Health
  CURE:{name:"CureGen Pharma",basePrice:200,volatility:.08,trend:.002,sector:"health",mcap:"large"},
  VITA:{name:"VitaBoost Supps",basePrice:30,volatility:.06,trend:.001,sector:"health",mcap:"small"},
  MEDS:{name:"MedStar Biotech",basePrice:155,volatility:.10,trend:.001,sector:"health",mcap:"mid"},
  GENE:{name:"GeneEdit Labs",basePrice:280,volatility:.12,trend:.003,sector:"health",mcap:"mid"},
  RXAI:{name:"RxAI Diagnostics",basePrice:92,volatility:.09,trend:.002,sector:"health",mcap:"small"},
  TELE:{name:"TeleDoc Health",basePrice:112,volatility:.08,trend:.002,sector:"health",mcap:"mid"},
  WLLB:{name:"WellBot AI Clinics",basePrice:68,volatility:.10,trend:.003,sector:"health",mcap:"small"},
  DNTL:{name:"DentaChain Clinics",basePrice:44,volatility:.07,trend:.001,sector:"health",mcap:"small"},
  // Crypto
  HODL:{name:"HodlCoin Exchange",basePrice:90,volatility:.18,trend:0,sector:"crypto",mcap:"mid"},
  DEFI:{name:"DeFi Dynamics",basePrice:55,volatility:.20,trend:.001,sector:"crypto",mcap:"small"},
  MINE:{name:"MineBros Digital",basePrice:135,volatility:.15,trend:-.001,sector:"crypto",mcap:"mid"},
  WHAL:{name:"WhalePool Capital",basePrice:220,volatility:.16,trend:.001,sector:"crypto",mcap:"mid"},
  NFTX:{name:"NFTVerse Markets",basePrice:18,volatility:.24,trend:-.001,sector:"crypto",mcap:"small"},
  // Defence
  TANK:{name:"TankTech Defence",basePrice:400,volatility:.04,trend:.002,sector:"defence",mcap:"large"},
  SHLD:{name:"ShieldWall Systems",basePrice:175,volatility:.05,trend:.002,sector:"defence",mcap:"mid"},
  DRNE:{name:"DroneStrike Aero",basePrice:250,volatility:.06,trend:.001,sector:"defence",mcap:"mid"},
  ARMO:{name:"ArmorPlate Inc.",basePrice:130,volatility:.04,trend:.001,sector:"defence",mcap:"mid"},
  SATL:{name:"SatelliteGuard Corp",basePrice:280,volatility:.05,trend:.002,sector:"defence",mcap:"large"},
  CYBX:{name:"CyberWarX Systems",basePrice:195,volatility:.07,trend:.002,sector:"defence",mcap:"mid"},
  RADS:{name:"RadarSense Tech",basePrice:118,volatility:.05,trend:.001,sector:"defence",mcap:"mid"},
  // Retail
  SHOP:{name:"ShopNet Global",basePrice:160,volatility:.07,trend:.002,sector:"retail",mcap:"large"},
  DLVR:{name:"DeliverFast Inc.",basePrice:78,volatility:.08,trend:.001,sector:"retail",mcap:"mid"},
  LUXE:{name:"LuxeBrand Holdings",basePrice:340,volatility:.06,trend:.001,sector:"retail",mcap:"large"},
  DEAL:{name:"DealHunter Markets",basePrice:22,volatility:.10,trend:0,sector:"retail",mcap:"small"},
  CART:{name:"CartWheelCommerce",basePrice:55,volatility:.07,trend:.002,sector:"retail",mcap:"mid"},
  // Media
  STRM:{name:"StreamBox Media",basePrice:185,volatility:.09,trend:.001,sector:"media",mcap:"large"},
  BUZZ:{name:"BuzzFeed Social",basePrice:14,volatility:.16,trend:-.001,sector:"media",mcap:"small"},
  CAST:{name:"CastWave Podcasts",basePrice:38,volatility:.08,trend:.002,sector:"media",mcap:"small"},
  REEL:{name:"ReelTok Studios",basePrice:95,volatility:.11,trend:.002,sector:"media",mcap:"mid"},
  NEWS:{name:"NewsForge Digital",basePrice:52,volatility:.07,trend:0,sector:"media",mcap:"mid"},
  PODC:{name:"PodcastHub Global",basePrice:36,volatility:.09,trend:.001,sector:"media",mcap:"small"},
  LIVE:{name:"LiveStream Inc.",basePrice:72,volatility:.10,trend:.002,sector:"media",mcap:"mid"},
  ANIM:{name:"AnimaStudio Films",basePrice:88,volatility:.08,trend:.001,sector:"media",mcap:"mid"},
  // Auto
  EVOX:{name:"EvoX Electric Motors",basePrice:290,volatility:.10,trend:.003,sector:"auto",mcap:"large"},
  VOLT:{name:"VoltDrive Autos",basePrice:210,volatility:.09,trend:.002,sector:"auto",mcap:"large"},
  HYDR:{name:"HydroWheels Inc.",basePrice:88,volatility:.08,trend:.002,sector:"auto",mcap:"mid"},
  AUTN:{name:"AutoNova Robotics",basePrice:150,volatility:.10,trend:.003,sector:"auto",mcap:"mid"},
  PKLOT:{name:"ParkMesh Infra",basePrice:42,volatility:.06,trend:.001,sector:"auto",mcap:"small"},
  TRKR:{name:"TruckerX Fleet",basePrice:66,volatility:.07,trend:.001,sector:"auto",mcap:"small"},
  // Real Estate
  REIT:{name:"RealCoin REIT",basePrice:95,volatility:.05,trend:.001,sector:"realty",mcap:"large"},
  PROP:{name:"PropVault Group",basePrice:185,volatility:.04,trend:.001,sector:"realty",mcap:"large"},
  SPCX:{name:"SpaceEx Offices",basePrice:68,volatility:.06,trend:.001,sector:"realty",mcap:"mid"},
  LOFT:{name:"LoftDAO Residential",basePrice:38,volatility:.07,trend:.001,sector:"realty",mcap:"small"},
  BRIK:{name:"BrickChain Infra",basePrice:52,volatility:.05,trend:.001,sector:"realty",mcap:"mid"},
  // Travel
  SOAR:{name:"SoarAir Holdings",basePrice:175,volatility:.09,trend:.001,sector:"travel",mcap:"large"},
  CRUZ:{name:"CruzLine Cruises",basePrice:88,volatility:.10,trend:.001,sector:"travel",mcap:"mid"},
  STAY:{name:"StayNow Hotels",basePrice:120,volatility:.08,trend:.002,sector:"travel",mcap:"mid"},
  XPDT:{name:"XpeditionTours",basePrice:44,volatility:.11,trend:.001,sector:"travel",mcap:"small"},
  JETT:{name:"JetTrail Charter",basePrice:210,volatility:.09,trend:.001,sector:"travel",mcap:"mid"},
  RAIL:{name:"RailConnect Trains",basePrice:78,volatility:.06,trend:.001,sector:"travel",mcap:"mid"},
  // AI & ML
  GNAI:{name:"GenAI Systems",basePrice:480,volatility:.14,trend:.004,sector:"ai",mcap:"large"},
  LMAI:{name:"LLMart Corp",basePrice:360,volatility:.12,trend:.003,sector:"ai",mcap:"large"},
  NRAL:{name:"NeuralPath AI",basePrice:195,volatility:.13,trend:.003,sector:"ai",mcap:"mid"},
  VISI:{name:"VisonIQ Imaging",basePrice:108,volatility:.11,trend:.002,sector:"ai",mcap:"mid"},
  ORCH:{name:"Orchestron Agents",basePrice:68,volatility:.15,trend:.003,sector:"ai",mcap:"small"},
  SPKR:{name:"SpeakAI Transcription",basePrice:44,volatility:.12,trend:.002,sector:"ai",mcap:"small"},
  // Biotech
  CRSP:{name:"CrisprGen Biolab",basePrice:310,volatility:.14,trend:.003,sector:"bio",mcap:"large"},
  PROT:{name:"ProteX Therapeutics",basePrice:175,volatility:.13,trend:.002,sector:"bio",mcap:"mid"},
  CELL:{name:"CellForge Bio",basePrice:92,volatility:.12,trend:.002,sector:"bio",mcap:"mid"},
  IMUN:{name:"ImmunoBoost Corp",basePrice:128,volatility:.11,trend:.002,sector:"bio",mcap:"mid"},
  SYNT:{name:"SynthBio Labs",basePrice:56,volatility:.15,trend:.003,sector:"bio",mcap:"small"},
  MRNA:{name:"mRNAtrix Research",basePrice:145,volatility:.13,trend:.003,sector:"bio",mcap:"mid"},
  // Energy
  PETR:{name:"PetroCrest Oil",basePrice:320,volatility:.07,trend:.001,sector:"energy",mcap:"large"},
  NUKE:{name:"NucleoGen Power",basePrice:240,volatility:.05,trend:.002,sector:"energy",mcap:"large"},
  GASX:{name:"GasFlex Pipelines",basePrice:112,volatility:.06,trend:.001,sector:"energy",mcap:"mid"},
  FUSE:{name:"FusionStar Reactor",basePrice:165,volatility:.11,trend:.003,sector:"energy",mcap:"mid"},
  HYDP:{name:"HydroPower Grid",basePrice:88,volatility:.04,trend:.001,sector:"energy",mcap:"mid"},
  COAL:{name:"CoalSeam Mining",basePrice:48,volatility:.08,trend:-.002,sector:"energy",mcap:"small"},
  // Logistics
  SHPY:{name:"ShipYard Global",basePrice:195,volatility:.06,trend:.002,sector:"logistics",mcap:"large"},
  DRON:{name:"DroneDelivery Net",basePrice:78,volatility:.10,trend:.003,sector:"logistics",mcap:"mid"},
  FRTX:{name:"FreightX Express",basePrice:130,volatility:.07,trend:.002,sector:"logistics",mcap:"mid"},
  LAST:{name:"LastMile Robotics",basePrice:55,volatility:.11,trend:.003,sector:"logistics",mcap:"small"},
  WRHX:{name:"WareHouseX Auto",basePrice:44,volatility:.08,trend:.002,sector:"logistics",mcap:"small"},
  COLD:{name:"ColdChain Logistics",basePrice:68,volatility:.06,trend:.001,sector:"logistics",mcap:"mid"},
  // Agriculture
  FARM:{name:"FarmTech Robotics",basePrice:88,volatility:.07,trend:.002,sector:"agri",mcap:"mid"},
  SEED:{name:"SeedVault Genomics",basePrice:62,volatility:.09,trend:.002,sector:"agri",mcap:"mid"},
  AQUA:{name:"AquaFarm Systems",basePrice:38,volatility:.08,trend:.002,sector:"agri",mcap:"small"},
  FRTL:{name:"FertiLux Corp",basePrice:52,volatility:.06,trend:.001,sector:"agri",mcap:"small"},
  HVST:{name:"HarvestAI Drones",basePrice:75,volatility:.10,trend:.003,sector:"agri",mcap:"mid"},
  GRAI:{name:"GrainEx Trading",basePrice:44,volatility:.07,trend:.001,sector:"agri",mcap:"small"},
};

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
  {text:"AGI milestone announced",effect:.14,sector:"ai",weight:3},
  {text:"AI regulation framework passes",effect:-.07,sector:"ai",weight:2},
  {text:"Landmark AI safety benchmark set",effect:.06,sector:"ai",weight:2},
  {text:"AI model copyright lawsuit",effect:-.05,sector:"ai",weight:2},
  {text:"Universal cancer vaccine approved",effect:.12,sector:"bio",weight:3},
  {text:"Clinical trial halt on safety",effect:-.09,sector:"bio",weight:2},
  {text:"Longevity drug enters Phase 2",effect:.08,sector:"bio",weight:2},
  {text:"Self-driving full approval granted",effect:.09,sector:"auto",weight:3},
  {text:"Mass EV recall issued",effect:-.08,sector:"auto",weight:2},
  {text:"$50B EV charging deal",effect:.06,sector:"auto",weight:2},
  {text:"Battery fire scandal",effect:-.07,sector:"auto",weight:2},
  {text:"Mortgage rates hit decade low",effect:.07,sector:"realty",weight:2},
  {text:"Housing bubble fears grow",effect:-.06,sector:"realty",weight:2},
  {text:"Remote work drives suburban boom",effect:.05,sector:"realty",weight:1},
  {text:"Tourism hits post-pandemic record",effect:.07,sector:"travel",weight:2},
  {text:"Pandemic travel ban fears",effect:-.08,sector:"travel",weight:2},
  {text:"Supersonic jet commercial launch",effect:.06,sector:"travel",weight:2},
  {text:"Oil cartel cuts production 20%",effect:.08,sector:"energy",weight:3},
  {text:"Fusion reactor sustained reaction",effect:.12,sector:"energy",weight:3},
  {text:"Carbon tax triples",effect:-.06,sector:"energy",weight:2},
  {text:"Major refinery explosion",effect:-.07,sector:"energy",weight:2},
  {text:"Port strike halts $500B trade",effect:-.07,sector:"logistics",weight:2},
  {text:"Drone delivery legalized globally",effect:.09,sector:"logistics",weight:3},
  {text:"Supply chain AI cuts costs 30%",effect:.06,sector:"logistics",weight:2},
  {text:"Global drought cuts yields 25%",effect:-.07,sector:"agri",weight:2},
  {text:"Vertical farming revolution",effect:.07,sector:"agri",weight:2},
  {text:"Fertilizer shortage crisis",effect:-.06,sector:"agri",weight:2},
  {text:"Gene-edited crops yield record",effect:.08,sector:"agri",weight:2},
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function gaussian(): number {
  const u1 = Math.random(), u2 = Math.random();
  return Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
}

function mcapMult(m: string): number {
  return m === "large" ? 1 : m === "mid" ? 1.3 : 1.6;
}

// ── Init helpers (first run only) ─────────────────────────────────────────────

function buildInitialStocks() {
  return Object.entries(STOCK_DEFS).map(([ticker, d]) => ({
    ticker,
    name: d.name,
    sector: d.sector,
    mcap: d.mcap,
    price: d.basePrice,
    prev_price: d.basePrice,
    open_price: d.basePrice,
    hi52w: d.basePrice,
    lo52w: d.basePrice,
    ath: d.basePrice,
    volume: 0,
    rsi: 50,
    momentum: 0,
    insider_bias: 0,
    earnings_cycle: Math.random() * 100,
    streak: 0,
    history: JSON.stringify([d.basePrice]),
  }));
}

function buildInitialSectors() {
  return Object.entries(SECTORS).map(([key, v]) => ({
    sector_key: key,
    label: v.label,
    icon: v.icon,
    momentum: 0,
    trend: 0,
    news_stack: 0,
  }));
}

// ── Core tick ─────────────────────────────────────────────────────────────────

interface DBMarket {
  index_value: number; index_prev: number; fear_greed: number;
  interest_rate: number; inflation: number; gdp_growth: number;
  crash_cooldown: number; boom_cooldown: number;
  up_streak: number; down_streak: number; tick_count: number;
}

interface DBStock {
  ticker: string; name: string; sector: string; mcap: string;
  price: number; prev_price: number; open_price: number;
  hi52w: number; lo52w: number; ath: number;
  volume: number; rsi: number; momentum: number;
  insider_bias: number; earnings_cycle: number; streak: number;
  history: number[];
}

interface DBSector {
  sector_key: string; momentum: number; trend: number; news_stack: number;
}

function runTick(
  ms: DBMarket,
  stocks: DBStock[],
  sectors: DBSector[],
): { ms: DBMarket; stocks: DBStock[]; sectors: DBSector[]; newEvent: typeof EVENTS_RAW[0] & { sector?: string } | null } {
  const m = { ...ms };
  const sec: Record<string, DBSector> = {};
  for (const s of sectors) sec[s.sector_key] = { ...s };

  m.interest_rate = Math.max(0, Math.min(12, m.interest_rate + (Math.random() - .5) * .02));
  m.inflation     = Math.max(-.5, Math.min(8, m.inflation + (Math.random() - .5) * .01));
  m.gdp_growth    = Math.max(-3, Math.min(7, m.gdp_growth + (Math.random() - .5) * .02));
  m.fear_greed    = Math.max(0, Math.min(100,
    m.fear_greed + (Math.random() - .49) * .8 + (m.gdp_growth - 2) * .1 - (m.inflation - 2.5) * .08
  ));

  const gs = (m.fear_greed - 50) / 50 * .003;
  const rp = -(m.interest_rate - 5) * .0005;
  const ip = -(m.inflation - 2.5) * .0004;
  const gb = (m.gdp_growth - 2.8) * .0003;

  let newEvent: (typeof EVENTS_RAW[0] & { sector?: string }) | null = null;
  if (Math.random() < .10) {
    const w: typeof EVENTS_RAW = [];
    for (const e of EVENTS_RAW) for (let i = 0; i < (e.weight || 1); i++) w.push(e);
    newEvent = w[Math.floor(Math.random() * w.length)] as typeof EVENTS_RAW[0] & { sector?: string };
    m.fear_greed = Math.max(0, Math.min(100, m.fear_greed + newEvent.effect * 35));
    const es = (newEvent as any).sector as string | undefined;
    if (es && sec[es]) sec[es].news_stack += newEvent.effect * .6;
  }

  for (const k of Object.keys(sec)) {
    const s = sec[k];
    s.news_stack *= .92;
    s.momentum = s.momentum * .96 + (Math.random() - .5) * .002;
    s.trend = Math.max(-.06, Math.min(.06, (s.trend + s.momentum + gs * .05 + s.news_stack * .02) * .99));
  }

  if (m.crash_cooldown > 0) m.crash_cooldown--;
  if (m.boom_cooldown > 0) m.boom_cooldown--;
  let cm = 1;
  if (!m.crash_cooldown && m.fear_greed < 8 && Math.random() < .015) {
    cm = -2.5; m.crash_cooldown = 80; m.fear_greed = 3;
    newEvent = { text: "MARKET CRASH!", effect: -.18, weight: 3 };
  }
  if (!m.boom_cooldown && m.fear_greed > 92 && Math.random() < .015) {
    cm = 1.8; m.boom_cooldown = 80; m.fear_greed = 95;
    newEvent = { text: "MARKET BOOM!", effect: .14, weight: 3 };
  }

  let idx = 0;
  const newStocks = stocks.map(st => {
    const def = STOCK_DEFS[st.ticker];
    if (!def) return st;
    const updated = { ...st };
    const p = Number(st.price);
    const n = gaussian();
    const se = sec[def.sector]?.trend || 0;
    const mcm = mcapMult(def.mcap);

    let ee = 0;
    if (newEvent) {
      const es = (newEvent as any).sector as string | undefined;
      if (es === def.sector) ee = newEvent.effect * .18 * mcm;
      else if (!es) ee = newEvent.effect * .12;
      else ee = newEvent.effect * .02;
    }

    const nc = (sec[def.sector]?.news_stack || 0) * .008 * mcm;
    const h = Array.isArray(st.history) ? st.history : [];
    const mom = h.length >= 12 ? (h[h.length - 1] - h[h.length - 12]) / p * .006 : 0;
    updated.momentum = updated.momentum * .9 + mom * .1;

    let gains = 0, losses = 0;
    const lb = Math.min(14, h.length - 1);
    for (let i = h.length - lb; i < h.length; i++) {
      const diff = h[i] - h[i - 1];
      if (diff > 0) gains += diff; else losses -= diff;
    }
    const rs = losses === 0 ? 100 : gains / losses;
    updated.rsi = 100 - 100 / (1 + rs);

    const rsiP = updated.rsi > 75 ? -(updated.rsi - 75) * .0002 : updated.rsi < 25 ? (25 - updated.rsi) * .0002 : 0;
    updated.insider_bias = Math.max(-.01, Math.min(.01, (updated.insider_bias + (Math.random() - .5) * .003) * .95));
    updated.earnings_cycle += .3;
    const eE = Math.sin(updated.earnings_cycle * Math.PI / 50) * .001;
    const sk = Math.max(-6, Math.min(6, updated.streak || 0)) * .0003;

    let cor = 0;
    if (def.sector === "crypto")    cor = (sec.meme?.trend || 0) * .04 + (sec.tech?.trend || 0) * .02;
    if (def.sector === "meme")      cor = (sec.crypto?.trend || 0) * .04 + (sec.media?.trend || 0) * .02;
    if (def.sector === "defence")   cor = (50 - m.fear_greed) / 50 * .0015;
    if (def.sector === "green")     cor = -(m.interest_rate - 5) * .0003;
    if (def.sector === "retail")    cor = (m.gdp_growth - 2.8) * .0004 - (m.inflation - 2.5) * .0003;
    if (def.sector === "media")     cor = (sec.tech?.trend || 0) * .02;
    if (def.sector === "finance")   cor = rp * .5;
    if (def.sector === "ai")        cor = (sec.tech?.trend || 0) * .05 + (sec.bio?.trend || 0) * .01;
    if (def.sector === "bio")       cor = (sec.health?.trend || 0) * .04;
    if (def.sector === "auto")      cor = (m.gdp_growth - 2.8) * .0005 - (m.inflation - 2.5) * .0004;
    if (def.sector === "realty")    cor = rp * .6 - (m.inflation - 2.5) * .0003;
    if (def.sector === "travel")    cor = (m.gdp_growth - 2.8) * .0004 + (sec.retail?.trend || 0) * .02;
    if (def.sector === "energy")    cor = (m.inflation - 2.5) * .0005;
    if (def.sector === "logistics") cor = (sec.retail?.trend || 0) * .03 + (m.gdp_growth - 2.8) * .0003;
    if (def.sector === "agri")      cor = (m.inflation - 2.5) * .0004 - (m.gdp_growth - 2.8) * .0002;

    const tv = def.volatility * .03 * mcm;
    let np = p + p * (def.trend * .02 + tv * n * Math.abs(cm) + se * .04 + ee + nc + updated.momentum * .3 + sk + gs * .08 + cor + rsiP + updated.insider_bias + eE + rp + ip + gb) * (cm < 0 ? -1 : 1);
    np += -(np - def.basePrice) / def.basePrice * def.basePrice * .007;
    np = Math.round(Math.max(.25, Math.min(np, def.basePrice * 6)) * 100) / 100;

    updated.volume += Math.floor(600 + Math.abs(np - p) / p * 100000 + Math.random() * 3000);
    if (np > p) updated.streak = Math.max(0, updated.streak) + 1;
    else if (np < p) updated.streak = Math.min(0, updated.streak) - 1;
    else updated.streak = 0;

    updated.prev_price = p;
    updated.price = np;
    const newHistory = [...h, np].slice(-400);
    updated.history = newHistory;
    if (np > updated.hi52w) updated.hi52w = np;
    if (np < updated.lo52w) updated.lo52w = np;
    if (np > updated.ath) updated.ath = np;

    idx += np;
    return updated;
  });

  m.index_prev = m.index_value;
  m.index_value = Math.round(idx * 100) / 100;
  if (m.index_value > m.index_prev) { m.up_streak++; m.down_streak = 0; }
  else { m.down_streak++; m.up_streak = 0; }
  m.tick_count++;

  return { ms: m, stocks: newStocks, sectors: Object.values(sec), newEvent };
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Load or seed state ────────────────────────────────────────────────────
    const [{ data: marketRows }, { data: stockRows }, { data: sectorRows }] = await Promise.all([
      supabase.from("market_state").select("*").eq("id", 1),
      supabase.from("stocks_state").select("*"),
      supabase.from("sector_state").select("*"),
    ]);

    let ms: DBMarket;
    let stocks: DBStock[];
    let sectors: DBSector[];

    const knownTickers = new Set((stockRows || []).map((s: any) => s.ticker));
    const missingTickers = Object.keys(STOCK_DEFS).filter(t => !knownTickers.has(t));
    const knownSectorKeys = new Set((sectorRows || []).map((s: any) => s.sector_key));
    const missingSectors = Object.keys(SECTORS).filter(k => !knownSectorKeys.has(k));

    const isFirstRun = !marketRows || marketRows.length === 0;

    if (isFirstRun) {
      ms = {
        index_value: 1000, index_prev: 1000, fear_greed: 50,
        interest_rate: 5.0, inflation: 2.5, gdp_growth: 2.8,
        crash_cooldown: 0, boom_cooldown: 0, up_streak: 0, down_streak: 0, tick_count: 0,
      };
      const initStocks = buildInitialStocks();
      const initSectors = buildInitialSectors();

      await Promise.all([
        supabase.from("market_state").insert({ id: 1, ...ms }),
        supabase.from("stocks_state").insert(initStocks.map(s => ({ ...s, history: s.history }))),
        supabase.from("sector_state").insert(initSectors),
      ]);

      stocks = initStocks.map(s => ({ ...s, history: [STOCK_DEFS[s.ticker].basePrice] }));
      sectors = initSectors.map(s => ({ sector_key: s.sector_key, momentum: 0, trend: 0, news_stack: 0 }));

      // Warm up with 60 silent ticks
      for (let i = 0; i < 60; i++) {
        const r = runTick(ms, stocks, sectors);
        ms = r.ms; stocks = r.stocks; sectors = r.sectors;
      }
    } else {
      ms = marketRows![0] as DBMarket;
      stocks = (stockRows || []).map((s: any) => ({
        ...s,
        history: Array.isArray(s.history) ? s.history : [],
      })) as DBStock[];
      sectors = (sectorRows || []) as DBSector[];

      // Insert any new stocks added since last deploy
      if (missingTickers.length > 0) {
        const newStockRows = missingTickers.map(ticker => {
          const d = STOCK_DEFS[ticker];
          return {
            ticker, name: d.name, sector: d.sector, mcap: d.mcap,
            price: d.basePrice, prev_price: d.basePrice, open_price: d.basePrice,
            hi52w: d.basePrice, lo52w: d.basePrice, ath: d.basePrice,
            volume: 0, rsi: 50, momentum: 0, insider_bias: 0,
            earnings_cycle: Math.random() * 100, streak: 0,
            history: JSON.stringify([d.basePrice]),
          };
        });
        await supabase.from("stocks_state").insert(newStockRows);
        stocks.push(...missingTickers.map(ticker => {
          const d = STOCK_DEFS[ticker];
          return {
            ticker, name: d.name, sector: d.sector, mcap: d.mcap,
            price: d.basePrice, prev_price: d.basePrice, open_price: d.basePrice,
            hi52w: d.basePrice, lo52w: d.basePrice, ath: d.basePrice,
            volume: 0, rsi: 50, momentum: 0, insider_bias: 0,
            earnings_cycle: Math.random() * 100, streak: 0, history: [d.basePrice],
          } as DBStock;
        }));
      }

      // Insert any new sectors added since last deploy
      if (missingSectors.length > 0) {
        const newSectorRows = missingSectors.map(key => ({
          sector_key: key, label: SECTORS[key].label, icon: SECTORS[key].icon,
          momentum: 0, trend: 0, news_stack: 0,
        }));
        await supabase.from("sector_state").insert(newSectorRows);
        sectors.push(...missingSectors.map(key => ({
          sector_key: key, momentum: 0, trend: 0, news_stack: 0,
        })));
      }
    }

    // ── Run one tick ──────────────────────────────────────────────────────────
    const { ms: newMs, stocks: newStocks, sectors: newSectors, newEvent } = runTick(ms, stocks, sectors);

    // ── Write back ────────────────────────────────────────────────────────────
    await Promise.all([
      supabase.from("market_state").upsert({
        id: 1,
        index_value: newMs.index_value,
        index_prev: newMs.index_prev,
        fear_greed: newMs.fear_greed,
        interest_rate: newMs.interest_rate,
        inflation: newMs.inflation,
        gdp_growth: newMs.gdp_growth,
        crash_cooldown: newMs.crash_cooldown,
        boom_cooldown: newMs.boom_cooldown,
        up_streak: newMs.up_streak,
        down_streak: newMs.down_streak,
        tick_count: newMs.tick_count,
        updated_at: new Date().toISOString(),
      }),
      ...newStocks.map(s =>
        supabase.from("stocks_state").upsert({
          ticker: s.ticker,
          name: s.name,
          sector: s.sector,
          mcap: s.mcap,
          price: s.price,
          prev_price: s.prev_price,
          open_price: s.open_price,
          hi52w: s.hi52w,
          lo52w: s.lo52w,
          ath: s.ath,
          volume: s.volume,
          rsi: s.rsi,
          momentum: s.momentum,
          insider_bias: s.insider_bias,
          earnings_cycle: s.earnings_cycle,
          streak: s.streak,
          history: s.history,
          updated_at: new Date().toISOString(),
        })
      ),
      ...newSectors.map(s =>
        supabase.from("sector_state").upsert({
          sector_key: s.sector_key,
          momentum: s.momentum,
          trend: s.trend,
          news_stack: s.news_stack,
          updated_at: new Date().toISOString(),
        })
      ),
    ]);

    // ── Log event if one fired ────────────────────────────────────────────────
    if (newEvent) {
      await supabase.from("events_log").insert({
        event_text: newEvent.text,
        effect: newEvent.effect,
        sector: (newEvent as any).sector ?? null,
        weight: newEvent.weight,
        fired_at: new Date().toISOString(),
      });
      const { data: oldEvents } = await supabase
        .from("events_log")
        .select("id")
        .order("fired_at", { ascending: false })
        .range(30, 1000);
      if (oldEvents && oldEvents.length > 0) {
        await supabase.from("events_log").delete().in("id", oldEvents.map((e: any) => e.id));
      }
    }

    return new Response(JSON.stringify({ ok: true, tick: newMs.tick_count, firstRun: isFirstRun, stocks: newStocks.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
