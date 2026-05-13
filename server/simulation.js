// Polymart simulation engine - ported from Deno TypeScript edge function

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

export const STOCK_DEFS = {
  APEX: {name:"Apex AI Corp",basePrice:420,volatility:.11,trend:.002,sector:"tech",mcap:"large"},
  VOID: {name:"VoidTech Solutions",basePrice:550,volatility:.09,trend:-.001,sector:"tech",mcap:"large"},
  ROBO: {name:"RoboWaiter Ltd.",basePrice:180,volatility:.07,trend:.003,sector:"tech",mcap:"mid"},
  CHIP: {name:"ChipForge Semis",basePrice:290,volatility:.08,trend:.002,sector:"tech",mcap:"large"},
  QBIT: {name:"QubitCore Quantum",basePrice:340,volatility:.13,trend:.003,sector:"tech",mcap:"mid"},
  SYNC: {name:"SyncWave Systems",basePrice:95,volatility:.07,trend:.001,sector:"tech",mcap:"small"},
  CLOD: {name:"CloudNest Computing",basePrice:310,volatility:.09,trend:.002,sector:"tech",mcap:"large"},
  NETX: {name:"NetX Fiber Optics",basePrice:74,volatility:.06,trend:.001,sector:"tech",mcap:"mid"},
  SCAN: {name:"ScanSec Cyber",basePrice:142,volatility:.10,trend:.002,sector:"tech",mcap:"mid"},
  DBYT: {name:"DataByte Analytics",basePrice:220,volatility:.08,trend:.002,sector:"tech",mcap:"large"},
  PROX: {name:"ProxyShield VPN",basePrice:58,volatility:.07,trend:.001,sector:"tech",mcap:"small"},
  NOOD: {name:"Noodle Network Inc.",basePrice:15,volatility:.14,trend:-.001,sector:"food",mcap:"small"},
  FIZZ: {name:"FizzBuzz Beverages",basePrice:62,volatility:.07,trend:.001,sector:"food",mcap:"mid"},
  BURG: {name:"BurgerDAO",basePrice:38,volatility:.09,trend:.001,sector:"food",mcap:"small"},
  BREW: {name:"BrewChain Coffee",basePrice:48,volatility:.06,trend:.002,sector:"food",mcap:"mid"},
  SNAK: {name:"SnackVault Global",basePrice:72,volatility:.05,trend:.001,sector:"food",mcap:"mid"},
  MOON: {name:"MoonShot Aerospace",basePrice:320,volatility:.08,trend:.002,sector:"space",mcap:"large"},
  ORBT: {name:"OrbitX Logistics",basePrice:210,volatility:.08,trend:.001,sector:"space",mcap:"mid"},
  MARS: {name:"Mars Colony Inc.",basePrice:145,volatility:.12,trend:.003,sector:"space",mcap:"mid"},
  ASTR: {name:"AstroMine Resources",basePrice:88,volatility:.10,trend:.002,sector:"space",mcap:"small"},
  NOVA: {name:"NovaLaunch Systems",basePrice:260,volatility:.09,trend:.001,sector:"space",mcap:"large"},
  DOGE: {name:"DogeCorp Industries",basePrice:45,volatility:.12,trend:.001,sector:"meme",mcap:"small"},
  MEME: {name:"MemeVault Holdings",basePrice:8,volatility:.22,trend:0,sector:"meme",mcap:"small"},
  YOLO: {name:"YOLO Ventures",basePrice:5,volatility:.28,trend:-.002,sector:"meme",mcap:"small"},
  PEPE: {name:"PepeFinance Ltd.",basePrice:3,volatility:.30,trend:0,sector:"meme",mcap:"small"},
  STONK:{name:"StonkMarket Memes",basePrice:12,volatility:.25,trend:.001,sector:"meme",mcap:"small"},
  BONK: {name:"BonkCoin Corp",basePrice:2,volatility:.35,trend:0,sector:"meme",mcap:"small"},
  FOMO: {name:"FOMO Markets Ltd",basePrice:7,volatility:.30,trend:-.001,sector:"meme",mcap:"small"},
  LAMBO:{name:"LamboDAO",basePrice:4,volatility:.32,trend:.001,sector:"meme",mcap:"small"},
  QUAK: {name:"DuckPond Holdings",basePrice:6,volatility:.28,trend:.001,sector:"meme",mcap:"small"},
  GRDN: {name:"GreenGarden Bio",basePrice:95,volatility:.06,trend:.002,sector:"green",mcap:"mid"},
  SPRK: {name:"SparkEnergy Green",basePrice:75,volatility:.06,trend:.003,sector:"green",mcap:"mid"},
  LEAF: {name:"LeafWater Eco",basePrice:42,volatility:.05,trend:.002,sector:"green",mcap:"small"},
  WIND: {name:"WindForce Turbines",basePrice:110,volatility:.07,trend:.002,sector:"green",mcap:"mid"},
  SOLR: {name:"SolarGrid Corp",basePrice:135,volatility:.06,trend:.003,sector:"green",mcap:"large"},
  BNKR: {name:"BankerCoin Trust",basePrice:350,volatility:.05,trend:.001,sector:"finance",mcap:"large"},
  LEND: {name:"LendX Protocol",basePrice:120,volatility:.07,trend:.001,sector:"finance",mcap:"mid"},
  INSR: {name:"InsureAll Group",basePrice:85,volatility:.04,trend:.001,sector:"finance",mcap:"mid"},
  HEDG: {name:"HedgeFund Prime",basePrice:480,volatility:.06,trend:.001,sector:"finance",mcap:"large"},
  PAYX: {name:"PayXpress Digital",basePrice:65,volatility:.08,trend:.002,sector:"finance",mcap:"mid"},
  NBNK: {name:"NeoBank Pulse",basePrice:88,volatility:.09,trend:.002,sector:"finance",mcap:"mid"},
  STBL: {name:"StableX Protocol",basePrice:145,volatility:.06,trend:.001,sector:"finance",mcap:"mid"},
  WLTH: {name:"WealthBridge Fund",basePrice:320,volatility:.05,trend:.001,sector:"finance",mcap:"large"},
  TOKN: {name:"TokenVault Finance",basePrice:55,volatility:.12,trend:.002,sector:"finance",mcap:"small"},
  FRAG: {name:"FragStorm Studios",basePrice:110,volatility:.10,trend:.002,sector:"gaming",mcap:"mid"},
  LOOT: {name:"LootCrate Gaming",basePrice:28,volatility:.13,trend:0,sector:"gaming",mcap:"small"},
  PIXEL:{name:"PixelForge Games",basePrice:65,volatility:.09,trend:.001,sector:"gaming",mcap:"mid"},
  GGWP: {name:"GG Gaming League",basePrice:42,volatility:.11,trend:.002,sector:"gaming",mcap:"small"},
  VRTX: {name:"VortexVR Studios",basePrice:155,volatility:.10,trend:.002,sector:"gaming",mcap:"mid"},
  METV: {name:"MetaVerse Arena",basePrice:88,volatility:.13,trend:.002,sector:"gaming",mcap:"mid"},
  NFTR: {name:"NFT Realm Games",basePrice:22,volatility:.18,trend:0,sector:"gaming",mcap:"small"},
  ESPT: {name:"eSport Nation",basePrice:58,volatility:.11,trend:.002,sector:"gaming",mcap:"mid"},
  CURE: {name:"CureGen Pharma",basePrice:200,volatility:.08,trend:.002,sector:"health",mcap:"large"},
  VITA: {name:"VitaBoost Supps",basePrice:30,volatility:.06,trend:.001,sector:"health",mcap:"small"},
  MEDS: {name:"MedStar Biotech",basePrice:155,volatility:.10,trend:.001,sector:"health",mcap:"mid"},
  GENE: {name:"GeneEdit Labs",basePrice:280,volatility:.12,trend:.003,sector:"health",mcap:"mid"},
  RXAI: {name:"RxAI Diagnostics",basePrice:92,volatility:.09,trend:.002,sector:"health",mcap:"small"},
  TELE: {name:"TeleDoc Health",basePrice:112,volatility:.08,trend:.002,sector:"health",mcap:"mid"},
  WLLB: {name:"WellBot AI Clinics",basePrice:68,volatility:.10,trend:.003,sector:"health",mcap:"small"},
  DNTL: {name:"DentaChain Clinics",basePrice:44,volatility:.07,trend:.001,sector:"health",mcap:"small"},
  HODL: {name:"HodlCoin Exchange",basePrice:90,volatility:.18,trend:0,sector:"crypto",mcap:"mid"},
  DEFI: {name:"DeFi Dynamics",basePrice:55,volatility:.20,trend:.001,sector:"crypto",mcap:"small"},
  MINE: {name:"MineBros Digital",basePrice:135,volatility:.15,trend:-.001,sector:"crypto",mcap:"mid"},
  WHAL: {name:"WhalePool Capital",basePrice:220,volatility:.16,trend:.001,sector:"crypto",mcap:"mid"},
  NFTX: {name:"NFTVerse Markets",basePrice:18,volatility:.24,trend:-.001,sector:"crypto",mcap:"small"},
  TANK: {name:"TankTech Defence",basePrice:400,volatility:.04,trend:.002,sector:"defence",mcap:"large"},
  SHLD: {name:"ShieldWall Systems",basePrice:175,volatility:.05,trend:.002,sector:"defence",mcap:"mid"},
  DRNE: {name:"DroneStrike Aero",basePrice:250,volatility:.06,trend:.001,sector:"defence",mcap:"mid"},
  ARMO: {name:"ArmorPlate Inc.",basePrice:130,volatility:.04,trend:.001,sector:"defence",mcap:"mid"},
  SATL: {name:"SatelliteGuard Corp",basePrice:280,volatility:.05,trend:.002,sector:"defence",mcap:"large"},
  CYBX: {name:"CyberWarX Systems",basePrice:195,volatility:.07,trend:.002,sector:"defence",mcap:"mid"},
  RADS: {name:"RadarSense Tech",basePrice:118,volatility:.05,trend:.001,sector:"defence",mcap:"mid"},
  SHOP: {name:"ShopNet Global",basePrice:160,volatility:.07,trend:.002,sector:"retail",mcap:"large"},
  DLVR: {name:"DeliverFast Inc.",basePrice:78,volatility:.08,trend:.001,sector:"retail",mcap:"mid"},
  LUXE: {name:"LuxeBrand Holdings",basePrice:340,volatility:.06,trend:.001,sector:"retail",mcap:"large"},
  DEAL: {name:"DealHunter Markets",basePrice:22,volatility:.10,trend:0,sector:"retail",mcap:"small"},
  CART: {name:"CartWheelCommerce",basePrice:55,volatility:.07,trend:.002,sector:"retail",mcap:"mid"},
  STRM: {name:"StreamBox Media",basePrice:185,volatility:.09,trend:.001,sector:"media",mcap:"large"},
  BUZZ: {name:"BuzzFeed Social",basePrice:14,volatility:.16,trend:-.001,sector:"media",mcap:"small"},
  CAST: {name:"CastWave Podcasts",basePrice:38,volatility:.08,trend:.002,sector:"media",mcap:"small"},
  REEL: {name:"ReelTok Studios",basePrice:95,volatility:.11,trend:.002,sector:"media",mcap:"mid"},
  NEWS: {name:"NewsForge Digital",basePrice:52,volatility:.07,trend:0,sector:"media",mcap:"mid"},
  PODC: {name:"PodcastHub Global",basePrice:36,volatility:.09,trend:.001,sector:"media",mcap:"small"},
  LIVE: {name:"LiveStream Inc.",basePrice:72,volatility:.10,trend:.002,sector:"media",mcap:"mid"},
  ANIM: {name:"AnimaStudio Films",basePrice:88,volatility:.08,trend:.001,sector:"media",mcap:"mid"},
  EVOX: {name:"EvoX Electric Motors",basePrice:290,volatility:.10,trend:.003,sector:"auto",mcap:"large"},
  VOLT: {name:"VoltDrive Autos",basePrice:210,volatility:.09,trend:.002,sector:"auto",mcap:"large"},
  HYDR: {name:"HydroWheels Inc.",basePrice:88,volatility:.08,trend:.002,sector:"auto",mcap:"mid"},
  AUTN: {name:"AutoNova Robotics",basePrice:150,volatility:.10,trend:.003,sector:"auto",mcap:"mid"},
  PKLOT:{name:"ParkMesh Infra",basePrice:42,volatility:.06,trend:.001,sector:"auto",mcap:"small"},
  TRKR: {name:"TruckerX Fleet",basePrice:66,volatility:.07,trend:.001,sector:"auto",mcap:"small"},
  REIT: {name:"RealCoin REIT",basePrice:95,volatility:.05,trend:.001,sector:"realty",mcap:"large"},
  PROP: {name:"PropVault Group",basePrice:185,volatility:.04,trend:.001,sector:"realty",mcap:"large"},
  SPCX: {name:"SpaceEx Offices",basePrice:68,volatility:.06,trend:.001,sector:"realty",mcap:"mid"},
  LOFT: {name:"LoftDAO Residential",basePrice:38,volatility:.07,trend:.001,sector:"realty",mcap:"small"},
  BRIK: {name:"BrickChain Infra",basePrice:52,volatility:.05,trend:.001,sector:"realty",mcap:"mid"},
  SOAR: {name:"SoarAir Holdings",basePrice:175,volatility:.09,trend:.001,sector:"travel",mcap:"large"},
  CRUZ: {name:"CruzLine Cruises",basePrice:88,volatility:.10,trend:.001,sector:"travel",mcap:"mid"},
  STAY: {name:"StayNow Hotels",basePrice:120,volatility:.08,trend:.002,sector:"travel",mcap:"mid"},
  XPDT: {name:"XpeditionTours",basePrice:44,volatility:.11,trend:.001,sector:"travel",mcap:"small"},
  JETT: {name:"JetTrail Charter",basePrice:210,volatility:.09,trend:.001,sector:"travel",mcap:"mid"},
  RAIL: {name:"RailConnect Trains",basePrice:78,volatility:.06,trend:.001,sector:"travel",mcap:"mid"},
  GNAI: {name:"GenAI Systems",basePrice:480,volatility:.14,trend:.004,sector:"ai",mcap:"large"},
  LMAI: {name:"LLMart Corp",basePrice:360,volatility:.12,trend:.003,sector:"ai",mcap:"large"},
  NRAL: {name:"NeuralPath AI",basePrice:195,volatility:.13,trend:.003,sector:"ai",mcap:"mid"},
  VISI: {name:"VisonIQ Imaging",basePrice:108,volatility:.11,trend:.002,sector:"ai",mcap:"mid"},
  ORCH: {name:"Orchestron Agents",basePrice:68,volatility:.15,trend:.003,sector:"ai",mcap:"small"},
  SPKR: {name:"SpeakAI Transcription",basePrice:44,volatility:.12,trend:.002,sector:"ai",mcap:"small"},
  CRSP: {name:"CrisprGen Biolab",basePrice:310,volatility:.14,trend:.003,sector:"bio",mcap:"large"},
  PROT: {name:"ProteX Therapeutics",basePrice:175,volatility:.13,trend:.002,sector:"bio",mcap:"mid"},
  CELL: {name:"CellForge Bio",basePrice:92,volatility:.12,trend:.002,sector:"bio",mcap:"mid"},
  IMUN: {name:"ImmunoBoost Corp",basePrice:128,volatility:.11,trend:.002,sector:"bio",mcap:"mid"},
  SYNT: {name:"SynthBio Labs",basePrice:56,volatility:.15,trend:.003,sector:"bio",mcap:"small"},
  MRNA: {name:"mRNAtrix Research",basePrice:145,volatility:.13,trend:.003,sector:"bio",mcap:"mid"},
  PETR: {name:"PetroCrest Oil",basePrice:320,volatility:.07,trend:.001,sector:"energy",mcap:"large"},
  NUKE: {name:"NucleoGen Power",basePrice:240,volatility:.05,trend:.002,sector:"energy",mcap:"large"},
  GASX: {name:"GasFlex Pipelines",basePrice:112,volatility:.06,trend:.001,sector:"energy",mcap:"mid"},
  FUSE: {name:"FusionStar Reactor",basePrice:165,volatility:.11,trend:.003,sector:"energy",mcap:"mid"},
  HYDP: {name:"HydroPower Grid",basePrice:88,volatility:.04,trend:.001,sector:"energy",mcap:"mid"},
  COAL: {name:"CoalSeam Mining",basePrice:48,volatility:.08,trend:-.002,sector:"energy",mcap:"small"},
  SHPY: {name:"ShipYard Global",basePrice:195,volatility:.06,trend:.002,sector:"logistics",mcap:"large"},
  DRON: {name:"DroneDelivery Net",basePrice:78,volatility:.10,trend:.003,sector:"logistics",mcap:"mid"},
  FRTX: {name:"FreightX Express",basePrice:130,volatility:.07,trend:.002,sector:"logistics",mcap:"mid"},
  LAST: {name:"LastMile Robotics",basePrice:55,volatility:.11,trend:.003,sector:"logistics",mcap:"small"},
  WRHX: {name:"WareHouseX Auto",basePrice:44,volatility:.08,trend:.002,sector:"logistics",mcap:"small"},
  COLD: {name:"ColdChain Logistics",basePrice:68,volatility:.06,trend:.001,sector:"logistics",mcap:"mid"},
  FARM: {name:"FarmTech Robotics",basePrice:88,volatility:.07,trend:.002,sector:"agri",mcap:"mid"},
  SEED: {name:"SeedVault Genomics",basePrice:62,volatility:.09,trend:.002,sector:"agri",mcap:"mid"},
  AQUA: {name:"AquaFarm Systems",basePrice:38,volatility:.08,trend:.002,sector:"agri",mcap:"small"},
  FRTL: {name:"FertiLux Corp",basePrice:52,volatility:.06,trend:.001,sector:"agri",mcap:"small"},
  HVST: {name:"HarvestAI Drones",basePrice:75,volatility:.10,trend:.003,sector:"agri",mcap:"mid"},
  GRAI: {name:"GrainEx Trading",basePrice:44,volatility:.07,trend:.001,sector:"agri",mcap:"small"},
};

export const EVENTS_RAW = [
  // Macro
  {text:"Federal Reserve announces rate cut",effect:.05,weight:2,category:"macro"},
  {text:"Federal Reserve raises rates 50bp",effect:-.04,weight:2,category:"macro"},
  {text:"Inflation above expectations - CPI +0.6%",effect:-.04,weight:2,category:"macro"},
  {text:"Core inflation cools to 2.1% - below target",effect:.04,weight:2,category:"macro"},
  {text:"Bull market rally continues - S&P hits ATH",effect:.03,weight:1,category:"macro"},
  {text:"Recession fears escalate - yield curve inverts",effect:-.06,weight:2,category:"macro"},
  {text:"Global trade deal signed - tariffs cut 30%",effect:.05,weight:2,category:"macro"},
  {text:"Trade war escalation - new 25% tariffs imposed",effect:-.05,weight:2,category:"macro"},
  {text:"Oil prices surge 12% on OPEC cuts",effect:-.03,weight:1,category:"macro"},
  {text:"Brent crude hits $120 - energy costs spike",effect:-.03,weight:2,category:"macro"},
  {text:"Consumer confidence hits 10yr high",effect:.02,weight:1,category:"macro"},
  {text:"Consumer sentiment crashes - lowest since 2008",effect:-.04,weight:2,category:"macro"},
  {text:"Flash crash triggers circuit breakers",effect:-.09,weight:3,category:"macro"},
  {text:"Record IPO week - 12 listings raise $45B",effect:.03,weight:1,category:"macro"},
  {text:"Geopolitical tensions spike - conflict fears",effect:-.05,weight:2,category:"macro"},
  {text:"Ceasefire agreement - geopolitical risk off",effect:.04,weight:2,category:"macro"},
  {text:"GDP growth beats forecasts - 3.8% annualised",effect:.04,weight:2,category:"macro"},
  {text:"GDP contracts 0.4% - technical recession",effect:-.06,weight:3,category:"macro"},
  {text:"Bond yields invert 2s10s - recession signal",effect:-.04,weight:2,category:"macro"},
  {text:"$2T infrastructure package passes Congress",effect:.04,weight:2,category:"macro"},
  {text:"Government shutdown looms - debt ceiling stalls",effect:-.03,weight:2,category:"macro"},
  {text:"Supply chain crisis deepens - shipping costs +40%",effect:-.03,weight:1,category:"macro"},
  {text:"Unemployment at historic low 3.2%",effect:.03,weight:1,category:"macro"},
  {text:"Non-farm payrolls disappoint - +85K vs 200K exp",effect:-.03,weight:2,category:"macro"},
  {text:"Dollar weakens - DXY falls 2% on Fed pivot bets",effect:.02,weight:1,category:"macro"},
  {text:"Dollar spikes - DXY +2.5% risk-off rally",effect:-.02,weight:1,category:"macro"},
  {text:"10yr Treasury yield crosses 5% - risk selloff",effect:-.04,weight:2,category:"macro"},
  {text:"FOMC holds rates - dovish language surprises",effect:.03,weight:2,category:"macro"},
  {text:"Sovereign debt downgrade - Fitch cuts AAA",effect:-.05,weight:2,category:"macro"},
  {text:"IMF raises global growth outlook to 3.4%",effect:.03,weight:1,category:"macro"},
  // Tech
  {text:"AI breakthrough - GPT-6 surpasses human reasoning",effect:.08,sector:"tech",weight:3,category:"earnings"},
  {text:"Data breach exposes 500M accounts - SEC probe",effect:-.06,sector:"tech",weight:2,category:"event"},
  {text:"$100B tech buyback announced",effect:.05,sector:"tech",weight:2,category:"event"},
  {text:"DOJ antitrust breakup lawsuit filed",effect:-.05,sector:"tech",weight:2,category:"event"},
  {text:"Quantum computing - 1M qubit milestone",effect:.06,sector:"tech",weight:2,category:"event"},
  {text:"Semiconductor supply crunch - lead times +18wk",effect:-.04,sector:"tech",weight:2,category:"event"},
  {text:"Chip fab opens - $80B TSMC US plant online",effect:.04,sector:"tech",weight:2,category:"event"},
  {text:"Major cloud outage - AWS us-east down 6hrs",effect:-.05,sector:"tech",weight:2,category:"event"},
  {text:"Tech earnings season beats - avg EPS +18%",effect:.06,sector:"tech",weight:2,category:"earnings"},
  {text:"Tech earnings disappoint - revenue guidance cut",effect:-.06,sector:"tech",weight:2,category:"earnings"},
  // Food
  {text:"Superfood trend goes viral - quinoa +300%",effect:.04,sector:"food",weight:1,category:"event"},
  {text:"E. coli outbreak - 400K cases, mass recall",effect:-.06,sector:"food",weight:2,category:"event"},
  {text:"Lab-grown meat FDA approved - commercial launch",effect:.05,sector:"food",weight:2,category:"event"},
  {text:"Food inflation +8% - input costs surge",effect:-.03,sector:"food",weight:1,category:"macro"},
  // Space
  {text:"$80B NASA commercial contract awarded",effect:.07,sector:"space",weight:2,category:"event"},
  {text:"Rocket test catastrophic failure - crew ok",effect:-.07,sector:"space",weight:2,category:"event"},
  {text:"Commercial moon landing succeeds - first cargo",effect:.09,sector:"space",weight:3,category:"event"},
  {text:"Mars mission approval - $420B decade programme",effect:.08,sector:"space",weight:2,category:"event"},
  {text:"Satellite collision - $2B debris field",effect:-.05,sector:"space",weight:2,category:"event"},
  // Meme
  {text:"Meme stock frenzy erupts - WSB pile in",effect:.12,sector:"meme",weight:3,category:"event"},
  {text:"Viral TikTok pumps meme sector +20%",effect:.15,sector:"meme",weight:3,category:"event"},
  {text:"Meme bubble bursts - 60% intraday crash",effect:-.12,sector:"meme",weight:3,category:"event"},
  {text:"Influencer dumps position - fraud probe opened",effect:-.09,sector:"meme",weight:2,category:"event"},
  {text:"Short squeeze alert - 40% short interest",effect:.14,sector:"meme",weight:3,category:"event"},
  // Green
  {text:"$500B green subsidy package - IRA expansion",effect:.06,sector:"green",weight:2,category:"event"},
  {text:"Solid-state battery breakthrough - 800Wh/kg",effect:.07,sector:"green",weight:2,category:"event"},
  {text:"Carbon credit price collapses - fraud scandal",effect:-.05,sector:"green",weight:2,category:"event"},
  {text:"Solar panel efficiency record - 47.6%",effect:.05,sector:"green",weight:1,category:"event"},
  // Finance
  {text:"Central bank dovish pivot - balance sheet expands",effect:.04,sector:"finance",weight:2,category:"macro"},
  {text:"Major bank $8B trading loss - rogue desk",effect:-.06,sector:"finance",weight:2,category:"earnings"},
  {text:"Stress tests passed - banks cleared for buybacks",effect:.04,sector:"finance",weight:1,category:"event"},
  {text:"Credit default swaps spike - systemic risk fears",effect:-.07,sector:"finance",weight:3,category:"event"},
  {text:"Payment giant acquires neobank for $24B",effect:.05,sector:"finance",weight:2,category:"event"},
  {text:"Fintech earnings beat - revenue +35% YoY",effect:.05,sector:"finance",weight:2,category:"earnings"},
  {text:"Loan defaults spike 8% - credit quality drops",effect:-.05,sector:"finance",weight:2,category:"event"},
  // Gaming
  {text:"Blockbuster game launch - 50M copies day one",effect:.07,sector:"gaming",weight:2,category:"earnings"},
  {text:"E-sports $2B broadcast deal - Netflix + EA",effect:.06,sector:"gaming",weight:2,category:"event"},
  {text:"Gaming studio layoffs - 2,200 jobs cut",effect:-.05,sector:"gaming",weight:2,category:"event"},
  {text:"Console shortage resolved - supply normalises",effect:.04,sector:"gaming",weight:1,category:"event"},
  // Health
  {text:"FDA fast-tracks breakthrough drug approval",effect:.08,sector:"health",weight:2,category:"event"},
  {text:"Phase 3 trial fails - primary endpoint missed",effect:-.07,sector:"health",weight:2,category:"earnings"},
  {text:"CRISPR gene therapy - 95% efficacy confirmed",effect:.09,sector:"health",weight:3,category:"event"},
  {text:"Drug pricing reform bill passes - margin squeeze",effect:-.06,sector:"health",weight:2,category:"macro"},
  {text:"Health earnings season - avg EPS +12%",effect:.05,sector:"health",weight:2,category:"earnings"},
  {text:"WHO declares health emergency",effect:-.07,sector:"health",weight:2,category:"event"},
  // Crypto
  {text:"Bitcoin breaks $200K - halving rally continues",effect:.12,sector:"crypto",weight:3,category:"event"},
  {text:"Exchange hacked - $2B stolen, withdrawals frozen",effect:-.14,sector:"crypto",weight:3,category:"event"},
  {text:"SEC approves spot crypto ETF - $60B inflows",effect:.10,sector:"crypto",weight:3,category:"event"},
  {text:"Stablecoin de-pegs - $40B wiped in 24hrs",effect:-.12,sector:"crypto",weight:3,category:"event"},
  {text:"Crypto exchange bankruptcy - $8B creditor loss",effect:-.10,sector:"crypto",weight:3,category:"event"},
  {text:"Central bank digital currency launches",effect:-.05,sector:"crypto",weight:2,category:"macro"},
  // Defence
  {text:"Defence budget +12% YoY - geopolitical premium",effect:.05,sector:"defence",weight:2,category:"macro"},
  {text:"$30B hypersonic drone contract awarded",effect:.06,sector:"defence",weight:2,category:"event"},
  {text:"Arms export ban - allied nations sanctions",effect:-.05,sector:"defence",weight:2,category:"event"},
  {text:"Defence earnings - backlog hits record $420B",effect:.06,sector:"defence",weight:2,category:"earnings"},
  // Retail
  {text:"Holiday sales smash records - online +22%",effect:.06,sector:"retail",weight:2,category:"earnings"},
  {text:"500 store closures - foot traffic down 30%",effect:-.06,sector:"retail",weight:2,category:"event"},
  {text:"Luxury demand rebounds - China buying surge",effect:.05,sector:"retail",weight:2,category:"event"},
  {text:"Retail earnings miss - inventory glut builds",effect:-.05,sector:"retail",weight:2,category:"earnings"},
  // Media
  {text:"Streaming hits 500M subs - first profitability",effect:.07,sector:"media",weight:2,category:"earnings"},
  {text:"Ad revenue plummets - programmatic CPM -40%",effect:-.06,sector:"media",weight:2,category:"earnings"},
  {text:"Content strike ends - 8-month production halt over",effect:.04,sector:"media",weight:1,category:"event"},
  {text:"Social media regulation passed - algorithmic limits",effect:-.04,sector:"media",weight:2,category:"macro"},
  // AI
  {text:"AGI milestone declared - Turing test defeated",effect:.14,sector:"ai",weight:3,category:"event"},
  {text:"AI regulation framework - EU AI Act phase 2",effect:-.07,sector:"ai",weight:2,category:"macro"},
  {text:"AI safety benchmark - model alignment proven",effect:.06,sector:"ai",weight:2,category:"event"},
  {text:"AI copyright lawsuit - $120B class action",effect:-.05,sector:"ai",weight:2,category:"event"},
  {text:"AI data centre investment - $200B capex cycle",effect:.08,sector:"ai",weight:2,category:"event"},
  {text:"AI hallucination scandal - enterprise pullback",effect:-.06,sector:"ai",weight:2,category:"event"},
  // Biotech
  {text:"Universal cancer vaccine - Phase 3 success",effect:.12,sector:"bio",weight:3,category:"event"},
  {text:"Clinical trial halted - safety signal detected",effect:-.09,sector:"bio",weight:2,category:"event"},
  {text:"Longevity drug enters Phase 2 - 40yr lifespan ext",effect:.08,sector:"bio",weight:2,category:"event"},
  {text:"Biotech M&A wave - sector premium +20%",effect:.07,sector:"bio",weight:2,category:"event"},
  // Auto
  {text:"Self-driving Level 5 - full regulatory approval",effect:.09,sector:"auto",weight:3,category:"event"},
  {text:"Mass EV recall - 400K units, battery fire risk",effect:-.08,sector:"auto",weight:2,category:"event"},
  {text:"$50B EV charging network deal - nationwide",effect:.06,sector:"auto",weight:2,category:"event"},
  {text:"Battery fire scandal - 12 fatalities, DOT probe",effect:-.07,sector:"auto",weight:2,category:"event"},
  {text:"Auto earnings - EV margin turns positive first time",effect:.06,sector:"auto",weight:2,category:"earnings"},
  // Real Estate
  {text:"Mortgage rates hit decade low 3.2%",effect:.07,sector:"realty",weight:2,category:"macro"},
  {text:"Housing bubble fears - prices up 28% in 12mo",effect:-.06,sector:"realty",weight:2,category:"event"},
  {text:"Remote work suburban boom - exurb demand +45%",effect:.05,sector:"realty",weight:1,category:"event"},
  {text:"Commercial real estate defaults surge 15%",effect:-.07,sector:"realty",weight:2,category:"event"},
  // Travel
  {text:"Tourism hits post-pandemic record - 2B arrivals",effect:.07,sector:"travel",weight:2,category:"event"},
  {text:"Pandemic variant - new travel bans imposed",effect:-.08,sector:"travel",weight:2,category:"event"},
  {text:"Supersonic jet commercial launch - 3hr NY-London",effect:.06,sector:"travel",weight:2,category:"event"},
  {text:"Airline fuel costs spike - hedges expire",effect:-.05,sector:"travel",weight:2,category:"event"},
  // Energy
  {text:"OPEC+ cuts production 3M bpd - oil surges",effect:.08,sector:"energy",weight:3,category:"event"},
  {text:"Fusion reactor - 30-second sustained reaction",effect:.12,sector:"energy",weight:3,category:"event"},
  {text:"Carbon tax triples - fossil fuel margin squeeze",effect:-.06,sector:"energy",weight:2,category:"macro"},
  {text:"Major refinery explosion - 800K bpd offline",effect:-.07,sector:"energy",weight:2,category:"event"},
  {text:"Strategic petroleum reserve release - prices ease",effect:-.04,sector:"energy",weight:2,category:"event"},
  // Logistics
  {text:"Port strike halts $500B trade - 3wk blockage",effect:-.07,sector:"logistics",weight:2,category:"event"},
  {text:"Drone delivery fully legalized - 50 countries",effect:.09,sector:"logistics",weight:3,category:"event"},
  {text:"AI supply chain - 30% cost reduction benchmark",effect:.06,sector:"logistics",weight:2,category:"event"},
  {text:"Panama Canal drought - capacity down 40%",effect:-.06,sector:"logistics",weight:2,category:"event"},
  // Agriculture
  {text:"Global drought - wheat yields down 25%",effect:-.07,sector:"agri",weight:2,category:"event"},
  {text:"Vertical farming revolution - 10x yield density",effect:.07,sector:"agri",weight:2,category:"event"},
  {text:"Fertilizer shortage crisis - natural gas link",effect:-.06,sector:"agri",weight:2,category:"event"},
  {text:"Gene-edited crop approval - EU lifts GMO ban",effect:.08,sector:"agri",weight:2,category:"event"},
  {text:"Commodity supercycle - grain futures limit up",effect:.06,sector:"agri",weight:2,category:"event"},
];

// ── Math helpers ──────────────────────────────────────────────────────────────

export function gaussian() {
  const u1 = Math.random(), u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
  if (Math.random() < 0.08) return z * (2.5 + Math.random() * 1.5);
  return z;
}

function mcapMult(m) {
  return m === "large" ? 1 : m === "mid" ? 1.3 : 1.6;
}

function ema(prev, cur, k) {
  return cur * k + prev * (1 - k);
}

function computeMACD(history) {
  if (history.length < 2) return { macd: 0, signal: 0, hist: 0, ema12: history[0] || 0, ema26: history[0] || 0 };
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
  if (slice.length < 2) {
    const p = slice[0] || 0;
    return { upper: p, middle: p, lower: p, bw: 0 };
  }
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / slice.length;
  const sd = Math.sqrt(variance);
  const upper = mean + stdMult * sd;
  const lower = mean - stdMult * sd;
  return { upper, middle: mean, lower, bw: mean > 0 ? (upper - lower) / mean : 0 };
}

function sma(history, period) {
  const slice = history.slice(-Math.min(period, history.length));
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function computeATR(history, period = 14) {
  if (history.length < 2) return 0;
  const trs = [];
  for (let i = Math.max(1, history.length - period); i < history.length; i++) {
    trs.push(Math.abs(history[i] - history[i - 1]));
  }
  return trs.length > 0 ? trs.reduce((a, b) => a + b, 0) / trs.length : 0;
}

function computeBeta(stockHistory, period = 30) {
  const n = Math.min(period, stockHistory.length - 1);
  if (n < 4) return 1;
  const sRets = [];
  for (let i = stockHistory.length - n; i < stockHistory.length; i++) {
    sRets.push((stockHistory[i] - stockHistory[i - 1]) / stockHistory[i - 1]);
  }
  const sMean = sRets.reduce((a, b) => a + b, 0) / n;
  let cov = 0, mVar = 0;
  for (let i = 0; i < n; i++) {
    cov  += (sRets[i] - sMean) * (sRets[i] - sMean);
    mVar += (sRets[i] - sMean) ** 2;
  }
  return mVar > 0 ? cov / mVar : 1;
}

export function sessionPhase(tickCount) {
  const dayTick = tickCount % 1440;
  if (dayTick < 54)  return "pre";
  if (dayTick < 444) return "open";
  if (dayTick < 498) return "post";
  return "closed";
}

function volumeSessionMult(tickCount) {
  const dayTick = tickCount % 1440;
  const phase = sessionPhase(tickCount);
  if (phase === "closed") return 0.05;
  if (phase === "pre")    return 0.2;
  if (phase === "post")   return 0.3;
  const t = (dayTick - 54) / 390;
  return 0.4 + 1.2 * (Math.pow(2 * t - 1, 4));
}

function volatilitySessionMult(tickCount) {
  switch (sessionPhase(tickCount)) {
    case "pre":    return 1.6;
    case "open":   return 1.0;
    case "post":   return 1.3;
    case "closed": return 0.4;
  }
}

// ── Init builders ─────────────────────────────────────────────────────────────

export function buildInitialStocks() {
  return Object.entries(STOCK_DEFS).map(([ticker, d]) => ({
    ticker, name: d.name, sector: d.sector, mcap: d.mcap,
    price: d.basePrice, prev_price: d.basePrice, open_price: d.basePrice,
    hi52w: d.basePrice, lo52w: d.basePrice, ath: d.basePrice,
    volume: 0, buy_volume: 0, sell_volume: 0,
    rsi: 50, momentum: 0, insider_bias: 0, earnings_cycle: Math.random() * 100,
    streak: 0, beta: 1.0, atr: 0,
    ema12: d.basePrice, ema26: d.basePrice,
    macd: 0, macd_signal: 0, macd_hist: 0,
    bb_upper: d.basePrice, bb_middle: d.basePrice, bb_lower: d.basePrice, bb_bw: 0,
    sma20: d.basePrice, sma50: d.basePrice,
    bid: +(d.basePrice * 0.9995).toFixed(2), ask: +(d.basePrice * 1.0005).toFixed(2),
    spread_pct: 0.10,
    vwap: d.basePrice,
    session: "open",
    halted: false,
    candle_open: d.basePrice, candle_high: d.basePrice, candle_low: d.basePrice,
    candle_ticks: 0,
    history: [d.basePrice],
    candles: [],
  }));
}

export function buildInitialSectors() {
  return Object.entries(SECTORS).map(([key, v]) => ({
    sector_key: key, label: v.label, icon: v.icon,
    momentum: 0, trend: 0, news_stack: 0,
  }));
}

// ── Core tick ─────────────────────────────────────────────────────────────────

export function runTick(ms, stocks, sectors) {
  const m = { ...ms };
  const sec = {};
  for (const s of sectors) sec[s.sector_key] = { ...s };

  // ── Macro regime cycle ─────────────────────────────────────────────────────
  const REGIME_SEQUENCE = ['expansion','peak','contraction','trough','recovery'];
  const REGIME_DURATIONS = {
    expansion:   [900,  2400],
    peak:        [400,  800],
    contraction: [700,  1800],
    trough:      [300,  700],
    recovery:    [600,  1400],
  };
  if (!m.macro_regime) m.macro_regime = 'expansion';
  if (!m.regime_ticks_remaining || m.regime_ticks_remaining <= 0) {
    const ri = REGIME_SEQUENCE.indexOf(m.macro_regime);
    m.macro_regime = REGIME_SEQUENCE[(ri + 1) % REGIME_SEQUENCE.length];
    const [lo, hi] = REGIME_DURATIONS[m.macro_regime];
    m.regime_ticks_remaining = Math.floor(lo + Math.random() * (hi - lo));
  } else {
    m.regime_ticks_remaining--;
  }
  const regimeBias = {
    expansion:   { gdp: +0.012, inf: +0.003, rate: +0.002, fg: +0.15 },
    peak:        { gdp: -0.005, inf: +0.010, rate: +0.008, fg: -0.05 },
    contraction: { gdp: -0.018, inf: +0.004, rate: +0.003, fg: -0.30 },
    trough:      { gdp: -0.005, inf: -0.005, rate: -0.010, fg: -0.10 },
    recovery:    { gdp: +0.008, inf: -0.003, rate: -0.005, fg: +0.20 },
  }[m.macro_regime] || { gdp: 0, inf: 0, rate: 0, fg: 0 };

  // Macro drift (regime-biased)
  m.interest_rate = Math.max(0, Math.min(12, m.interest_rate + (Math.random() - .5) * .02 + regimeBias.rate));
  m.inflation     = Math.max(-.5, Math.min(8,  m.inflation     + (Math.random() - .5) * .01 + regimeBias.inf));
  m.gdp_growth    = Math.max(-3,  Math.min(7,  m.gdp_growth    + (Math.random() - .5) * .02 + regimeBias.gdp));
  m.fear_greed    = Math.max(0, Math.min(100,
    m.fear_greed
    + (Math.random() - 0.5) * 0.65            // wider random walk (was 0.22)
    + (50 - m.fear_greed) * 0.0008            // much weaker mean-reversion (was 0.004)
    + (m.gdp_growth - 2) * 0.06
    - (m.inflation - 2.5) * 0.04
    + regimeBias.fg                            // regime-driven sentiment push
  ));

  const session     = sessionPhase(m.tick_count);
  m.market_session  = session;
  const volMult     = volumeSessionMult(m.tick_count);
  const sesVolatMult = volatilitySessionMult(m.tick_count);

  const gs = (m.fear_greed - 50) / 50 * .003;
  const rp = -(m.interest_rate - 5) * .0005;
  const ip = -(m.inflation - 2.5) * .0004;
  const gb = (m.gdp_growth - 2.8) * .0003;

  const macroStress = Math.max(0, (m.interest_rate - 5) * 0.5 + (m.inflation - 3) * 0.8);
  m.vix = Math.max(8, Math.min(80, 40 - (m.fear_greed - 50) * 0.4 + macroStress + Math.random() * 2 - 1));

  // Event
  let newEvent = null;
  const eventProb = session === "closed" ? 0.02 : 0.03;
  if (Math.random() < eventProb) {
    const w = [];
    for (const e of EVENTS_RAW) for (let i = 0; i < (e.weight || 1); i++) w.push(e);
    newEvent = w[Math.floor(Math.random() * w.length)];
    m.fear_greed = Math.max(0, Math.min(100, m.fear_greed + newEvent.effect * 20));
    const es = newEvent.sector;
    if (es && sec[es]) sec[es].news_stack += newEvent.effect * .6;
  }

  // Sector dynamics
  for (const k of Object.keys(sec)) {
    const s = sec[k];
    s.news_stack *= .92;
    s.momentum = s.momentum * .96 + (Math.random() - .5) * .002;
    s.trend = Math.max(-.06, Math.min(.06, (s.trend + s.momentum + gs * .05 + s.news_stack * .02) * .99));
  }

  // Circuit breakers
  if (m.crash_cooldown > 0) m.crash_cooldown--;
  if (m.boom_cooldown > 0) m.boom_cooldown--;
  let cm = 1;
  if (!m.crash_cooldown && m.fear_greed < 8 && Math.random() < .015) {
    cm = -2.5; m.crash_cooldown = 80; m.fear_greed = 3;
    newEvent = { text: "MARKET CRASH - Circuit breakers triggered", effect: -.18, weight: 3, category: "macro" };
  }
  if (!m.boom_cooldown && m.fear_greed > 92 && Math.random() < .015) {
    cm = 1.8; m.boom_cooldown = 80; m.fear_greed = 95;
    newEvent = { text: "MARKET BOOM - Historic rally day", effect: .14, weight: 3, category: "macro" };
  }

  const CANDLE_PERIOD = 18;
  let idx = 0, newHighs = 0, newLows = 0, advances = 0, declines = 0;

  const newStocks = stocks.map(st => {
    const def = STOCK_DEFS[st.ticker];
    if (!def) return st;
    const updated = { ...st };
    const p = Number(st.price);
    const h = Array.isArray(st.history) ? st.history : [];

    const lastPct = p > 0 && st.prev_price > 0 ? Math.abs((p - st.prev_price) / st.prev_price) : 0;
    if (lastPct > 0.20 && session === "open") {
      updated.halted = true; updated.session = "halted"; idx += p; return updated;
    }
    if (updated.halted) updated.halted = false;
    updated.session = session;

    const n = gaussian();
    const se = sec[def.sector]?.trend || 0;
    const mcm = mcapMult(def.mcap);

    let ee = 0;
    if (newEvent) {
      const es = newEvent.sector;
      if (es === def.sector) ee = newEvent.effect * .18 * mcm;
      else if (!es) ee = newEvent.effect * .12;
      else ee = newEvent.effect * .02;
    }

    const nc = (sec[def.sector]?.news_stack || 0) * .008 * mcm;
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
    if (def.sector === "green")     cor = -(m.interest_rate - 5) * .0003 + (sec.energy?.trend || 0) * -.02;
    if (def.sector === "retail")    cor = (m.gdp_growth - 2.8) * .0004 - (m.inflation - 2.5) * .0003;
    if (def.sector === "media")     cor = (sec.tech?.trend || 0) * .02 + (sec.gaming?.trend || 0) * .01;
    if (def.sector === "finance")   cor = rp * .5 - (m.inflation - 2.5) * .0002;
    if (def.sector === "ai")        cor = (sec.tech?.trend || 0) * .05 + (sec.bio?.trend || 0) * .01;
    if (def.sector === "bio")       cor = (sec.health?.trend || 0) * .04 + (sec.ai?.trend || 0) * .01;
    if (def.sector === "auto")      cor = (m.gdp_growth - 2.8) * .0005 - (m.inflation - 2.5) * .0004 + (sec.energy?.trend || 0) * -.01;
    if (def.sector === "realty")    cor = rp * .6 - (m.inflation - 2.5) * .0003;
    if (def.sector === "travel")    cor = (m.gdp_growth - 2.8) * .0004 + (sec.retail?.trend || 0) * .02 + (sec.energy?.trend || 0) * -.01;
    if (def.sector === "energy")    cor = (m.inflation - 2.5) * .0005;
    if (def.sector === "logistics") cor = (sec.retail?.trend || 0) * .03 + (m.gdp_growth - 2.8) * .0003;
    if (def.sector === "agri")      cor = (m.inflation - 2.5) * .0004 - (m.gdp_growth - 2.8) * .0002;
    if (def.sector === "space")     cor = (sec.defence?.trend || 0) * .02 + (sec.ai?.trend || 0) * .01;
    if (def.sector === "food")      cor = -(m.inflation - 2.5) * .0002;
    if (def.sector === "health")    cor = (50 - m.fear_greed) / 50 * .0005;
    if (def.sector === "gaming")    cor = (sec.media?.trend || 0) * .02 + (sec.tech?.trend || 0) * .01;
    if (cm < 0) cor += 0.015;

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
    const clusterMult = def.sector === 'meme' ? 20 : 35;
    const volCluster = 1 + recentVol * clusterMult;
    const trendDrift = Math.min(1 + def.trend * (updated.earnings_cycle / 300), 10);
    const fairValue = def.basePrice * Math.max(0.1, trendDrift);

    const tv = def.volatility * .03 * mcm * sesVolatMult * volCluster;
    let np = p + p * (def.trend * .02 + tv * n * Math.abs(cm) + se * .04 + ee + nc + updated.momentum * .3 + sk + gs * .08 + cor + rsiP + updated.insider_bias + eE + rp + ip + gb) * (cm < 0 ? -1 : 1);

    np += -(np - fairValue) * 0.002;
    np = Math.round(Math.max(0.10, Math.min(np, def.basePrice * 10)) * 100) / 100;

    if (session === "open" && m.tick_count % 1440 === 54) {
      const gapShock = gaussian() * def.volatility * 0.5 + (sec[def.sector]?.trend || 0) * 2;
      np = Math.round(Math.max(0.10, np * (1 + gapShock)) * 100) / 100;
      updated.open_price = np; updated.candle_open = np;
      updated.candle_high = np; updated.candle_low = np; updated.candle_ticks = 0;
    }

    const priceMove = Math.abs(np - p) / p;
    const baseVol = Math.floor((600 + priceMove * 120000 + Math.random() * 3000) * volMult * mcm);
    const buyBias = (np >= p ? 0.55 : 0.45) + (Math.random() - 0.5) * 0.2;
    const buyVol  = Math.floor(baseVol * Math.max(0.1, Math.min(0.9, buyBias)));
    const sellVol = baseVol - buyVol;
    updated.volume     += baseVol;
    updated.buy_volume  = (updated.buy_volume || 0) + buyVol;
    updated.sell_volume = (updated.sell_volume || 0) + sellVol;

    const sessionStart = session === "open" && m.tick_count % 1440 === 54;
    if (sessionStart) {
      updated.vwap = np;
    } else {
      const totalVol = updated.volume;
      updated.vwap = totalVol > 0 ? (updated.vwap * (totalVol - baseVol) + np * baseVol) / totalVol : np;
    }
    updated.vwap = Math.round(updated.vwap * 100) / 100;

    const mcapSpreadBase = def.mcap === "large" ? 0.05 : def.mcap === "mid" ? 0.12 : 0.25;
    const spreadPct = Math.max(0.02, Math.min(2.0, mcapSpreadBase + def.volatility * 80 + (m.vix - 15) * 0.01 + (session !== "open" ? 0.3 : 0)));
    const halfSpread = np * spreadPct / 200;
    updated.bid = Math.round(Math.max(0.01, np - halfSpread) * 100) / 100;
    updated.ask = Math.round((np + halfSpread) * 100) / 100;
    updated.spread_pct = +spreadPct.toFixed(3);

    const newHistory = [...h, np].slice(-60);
    updated.sma20 = +sma(newHistory, 20).toFixed(2);
    updated.sma50 = +sma(newHistory, 50).toFixed(2);

    if (newHistory.length >= 10) {
      const r = computeMACD(newHistory.slice(-60));
      updated.ema12 = +r.ema12.toFixed(2); updated.ema26 = +r.ema26.toFixed(2);
      updated.macd = +r.macd.toFixed(4); updated.macd_signal = +r.signal.toFixed(4); updated.macd_hist = +r.hist.toFixed(4);
    }
    if (newHistory.length >= 5) {
      const bb = computeBB(newHistory, 20, 2);
      updated.bb_upper = +bb.upper.toFixed(2); updated.bb_middle = +bb.middle.toFixed(2);
      updated.bb_lower = +bb.lower.toFixed(2); updated.bb_bw = +bb.bw.toFixed(4);
    }
    updated.atr = +computeATR(newHistory, 14).toFixed(4);

    if (newHistory.length >= 20) {
      updated.beta = +computeBeta(newHistory, 30).toFixed(2);
      if (def.mcap === "large") updated.beta = +(updated.beta * 0.7 + 0.3).toFixed(2);
      else if (def.mcap === "small") updated.beta = +(updated.beta * 1.2).toFixed(2);
      updated.beta = Math.max(0.1, Math.min(4.0, updated.beta));
    }

    if (np > p) updated.streak = Math.max(0, updated.streak) + 1;
    else if (np < p) updated.streak = Math.min(0, updated.streak) - 1;
    else updated.streak = 0;

    updated.prev_price = p;
    updated.price = np;
    updated.history = newHistory;

    if (np > updated.hi52w) { updated.hi52w = np; newHighs++; }
    if (np < updated.lo52w) { updated.lo52w = np; newLows++; }
    if (np > updated.ath) updated.ath = np;
    if (np > p) advances++; else if (np < p) declines++;

    updated.candle_ticks = (updated.candle_ticks || 0) + 1;
    updated.candle_high = Math.max(updated.candle_high || np, np);
    updated.candle_low  = Math.min(updated.candle_low  || np, np);

    if (updated.candle_ticks >= CANDLE_PERIOD) {
      const candles = Array.isArray(st.candles) ? [...st.candles] : [];
      candles.push({ o: updated.candle_open || p, h: updated.candle_high, l: updated.candle_low, c: np, v: baseVol * CANDLE_PERIOD, t: m.tick_count });
      updated.candles = candles.slice(-48);
      updated.candle_open = np; updated.candle_high = np; updated.candle_low = np; updated.candle_ticks = 0;
    }

    idx += np;
    return updated;
  });

  m.index_prev  = m.index_value;
  m.index_value = Math.round(idx * 100) / 100;
  if (m.index_value > m.index_prev) { m.up_streak++; m.down_streak = 0; }
  else { m.down_streak++; m.up_streak = 0; }
  m.advance_decline = advances - declines;
  m.new_highs = newHighs;
  m.new_lows  = newLows;
  m.tick_count++;

  return { ms: m, stocks: newStocks, sectors: Object.values(sec), newEvent };
}
