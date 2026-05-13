// Company profiles and dynamic news generator for all 132 Polymart tickers

const SECTOR_NEWS_TEMPLATES = {
  tech: [
    "{name} accelerates cloud migration strategy across enterprise verticals",
    "{ticker} opens new R&D centre - 500 engineering roles to be filled",
    "Patent filing reveals {name}'s next-generation architecture plans",
    "{name} deepens partnership with hyperscaler - multi-year contract signed",
    "Analyst upgrades {ticker} citing strong secular tailwinds in cloud adoption",
    "{name} wins $120M federal IT modernisation contract",
    "{ticker} CTO presents product roadmap at annual developer conference",
    "{name} rolls out new security suite amid industry-wide compliance push",
  ],
  food: [
    "{name} launches limited-edition product line - viral social media response",
    "Supply chain diversification strengthens {name}'s gross margin outlook",
    "{ticker} expands into 12 new international markets this quarter",
    "{name} acquires artisan brand to strengthen premium segment presence",
    "Commodity cost tailwinds benefit {ticker} profitability ahead of guidance",
    "{name} announces sustainability pledge - 100% renewable packaging by 2027",
  ],
  space: [
    "{name} secures launch manifest slot for Q3 - second mission this calendar year",
    "Regulatory approval clears path for {ticker}'s next orbital services contract",
    "{name} announces joint venture with European Space Agency partners",
    "{ticker} awarded reusable rocket recertification ahead of schedule",
    "{name} reveals next-gen propulsion test results - performance exceeds specification",
    "Defence partnership expands {ticker} revenue visibility by three years",
  ],
  meme: [
    "{ticker} trending on social media - retail trading activity spikes 4x",
    "Community governance vote greenlights {name}'s new tokenomics proposal",
    "{ticker} short interest climbs to 38% - squeeze potential under scrutiny",
    "Celebrity endorsement drives renewed retail interest in {name}",
    "Forum activity for {ticker} at 3-month high - community sentiment bullish",
  ],
  green: [
    "{name} signs 500MW power purchase agreement with national grid operator",
    "Government subsidy approval boosts {ticker}'s project pipeline by 40%",
    "{name} breaks efficiency record in latest commercial field deployment",
    "{ticker} secures EU Green Bond certification - first issuer in its sector",
    "{name} expands manufacturing capacity - new GW-scale facility breaks ground",
    "Carbon credit revenue stream provides {ticker} earnings upside this quarter",
  ],
  finance: [
    "{name} reports loan book quality above sector peers - NPL ratio at record low",
    "{ticker} announces $500M share buyback programme effective immediately",
    "{name} launches AI-powered digital wealth management platform for retail clients",
    "Regulatory stress test passed - {ticker} cleared for dividend increase",
    "{name} expands SME lending via embedded finance platform partnerships",
    "{ticker} net interest margin holds above 4% - analyst consensus turns constructive",
  ],
  gaming: [
    "{name} confirms next major title entering closed beta next quarter",
    "Live-service revenue for {ticker} up 28% quarter-on-quarter - above consensus",
    "{name} acquires indie studio to bolster owned IP library",
    "{ticker} mobile spinoff surpasses 10M downloads in launch week",
    "Esports division drives record community engagement and sponsorship for {name}",
    "{ticker} passes internal playtesting milestone - Q4 commercial launch on track",
  ],
  health: [
    "{name} initiates Phase 2 clinical study - data readout expected in 9 months",
    "{ticker} partners with NHS for large-scale real-world evidence programme",
    "{name} receives breakthrough device designation from FDA",
    "Payer coverage expanded for {ticker}'s flagship product - access widens",
    "{name} announces research collaboration with leading academic medical centre",
    "{ticker} patient volume grew 18% in Q3 - well above analyst estimates",
  ],
  crypto: [
    "{name} integrates Layer-2 scaling - transaction throughput triples overnight",
    "{ticker} treasury diversification announcement - BTC allocation increased",
    "{name} launches enhanced staking rewards programme for long-term holders",
    "On-chain analytics show {ticker} whale accumulation trend over 30 days",
    "{name} completes third-party security audit - zero critical findings reported",
    "{ticker} adds new institutional custody partnership with tier-1 bank",
  ],
  defence: [
    "{name} awarded multi-year maintenance contract for existing deployed fleet",
    "{ticker} production ramp cleared - delivery schedule met ahead of deadline",
    "{name} unveils next-generation system at international defence expo",
    "Export licence approved - {ticker} set to deliver hardware to allied nation",
    "{name} wins $2.4B contract extension - programme backlog at record levels",
    "{ticker} R&D spend rises to 14% of revenue - long-term capability investment",
  ],
  retail: [
    "{name} reports same-store sales growth of 4.2% - above analyst expectations",
    "{ticker} opens 50 new locations in Q3 - expansion programme ahead of plan",
    "{name} rolls out AI personalisation engine across all digital channels",
    "Loyalty programme membership at {ticker} crosses 20M milestone",
    "{name} supply chain optimisation initiative delivers $80M in annual savings",
    "{ticker} private label margin expansion drives consensus-beating earnings",
  ],
  media: [
    "{name} subscriber count reaches all-time high - churn rate at record low",
    "{ticker} inks exclusive content deal valued at $400M over three years",
    "{name} international expansion targets 8 new territories in H2",
    "Advertising revenue recovery boosts {ticker} Q3 earnings trajectory",
    "{name} podcast network surpasses 50M monthly active listeners milestone",
    "{ticker} original series receives 7 industry award nominations",
  ],
  auto: [
    "{name} hits quarterly production record - assembly line efficiency up 12%",
    "{ticker} reveals new vehicle platform - 600km WLTP certified range",
    "{name} battery supply agreement secured with tier-1 supplier through 2029",
    "{ticker} autonomous driving miles logged surpass 200M commercially",
    "{name} opens gigafactory phase 2 - 150GWh annual nameplate capacity",
    "Fleet order from major logistics operator adds significant backlog for {ticker}",
  ],
  realty: [
    "{name} reports 96.4% portfolio occupancy - strongest in two years",
    "{ticker} completes $1.2B acquisition - enters new metropolitan market",
    "{name} refinancing reduces weighted cost of debt by 40 basis points",
    "{ticker} development pipeline shows $3B in approved and permitted projects",
    "{name} dividend maintained at current level - coverage ratio robust at 1.4x",
  ],
  travel: [
    "{name} load factor hits 89% - capacity utilisation at post-2020 high",
    "{ticker} launches expanded route network - 15 new destinations added",
    "{name} premium cabin upgrade programme drives revenue per seat higher",
    "Corporate travel recovery provides strong forward booking support for {ticker}",
    "{name} loyalty programme redesign initiative boosts ancillary revenue mix",
    "{ticker} fleet renewal accelerates - 30 new-generation aircraft on order",
  ],
  ai: [
    "{name} releases new foundation model - benchmark scores top public leaderboard",
    "Enterprise pilot converts to full deployment - {ticker} ARR expands",
    "{name} secures $800M compute infrastructure deal with major cloud provider",
    "{ticker} model efficiency gains cut inference cost per token by 35%",
    "{name} publishes AI safety research - alignment framework gains industry traction",
    "{ticker} new API pricing tier attracts 2,000 enterprise clients in first month",
  ],
  bio: [
    "{name} positive interim data readout - probability of success raised to 68%",
    "{ticker} files IND application for next-generation pipeline candidate",
    "{name} manufacturing scale-up completed - commercial launch timeline confirmed",
    "Peer-reviewed publication validates {ticker}'s core mechanism of action",
    "{name} receives orphan drug designation - 7-year market exclusivity secured",
    "{ticker} M&A speculation rises as sector consolidation wave continues",
  ],
  energy: [
    "{name} production output exceeded quarterly guidance by 4%",
    "{ticker} cost-per-barrel falls to sector-low - operational efficiency improving",
    "{name} announces $2B capital return programme via buybacks and dividends",
    "New reserve certification adds 8 years to {ticker}'s production life estimate",
    "{name} emissions reduction target validated by Science Based Targets initiative",
    "{ticker} refinery throughput at 95% utilisation - crack spreads remain strong",
  ],
  logistics: [
    "{name} network expansion adds 12 new fulfilment centres across North America",
    "{ticker} on-time delivery rate reaches 97.8% - industry-leading performance",
    "{name} AI route optimisation deployment cuts fuel costs by 9% annually",
    "{ticker} B2B contract win adds $180M to annual recurring revenue",
    "{name} drone delivery network receives approval across 5 new urban zones",
    "{ticker} automation rollout reduces cost-per-parcel to new all-time low",
  ],
  agri: [
    "{name} harvest yield data shows 18% productivity improvement versus prior year",
    "{ticker} drought-resistant variety receives commercial cultivation certification",
    "{name} precision farming platform onboards 10,000 new farm operators",
    "{ticker} export volumes to Asia increase 30% on new bilateral trade agreement",
    "{name} vertical farming division reports first positive EBITDA quarter",
    "{ticker} soil health analytics platform wins Agriculture Innovation Award",
  ],
};

export const COMPANY_PROFILES = {
  // === TECH ===
  APEX:  { description: "Enterprise AI platform delivering real-time decision intelligence for Fortune 500 clients across finance, healthcare, and logistics.", founded: 2014, hq: "San Francisco, CA", ceo: "Marcus Chen", employees: 18500, exchange: "NASDAQ", industry: "Enterprise AI / Cloud Platforms" },
  VOID:  { description: "Security-focused cloud infrastructure provider with zero-trust architecture deployed across 92 countries.", founded: 2011, hq: "Seattle, WA", ceo: "Lena Kravitz", employees: 24000, exchange: "NASDAQ", industry: "Cloud Infrastructure / Cybersecurity" },
  ROBO:  { description: "Developer of autonomous service robots for restaurants, hotels, and healthcare facilities, with 12,000 units deployed globally.", founded: 2018, hq: "Austin, TX", ceo: "Hiroshi Tanaka", employees: 2800, exchange: "NYSE", industry: "Service Robotics / Automation" },
  CHIP:  { description: "Fabless semiconductor company specialising in AI accelerators and high-bandwidth memory controllers for data centres.", founded: 2009, hq: "Santa Clara, CA", ceo: "David Park", employees: 8200, exchange: "NASDAQ", industry: "Semiconductors / AI Chips" },
  QBIT:  { description: "Quantum computing hardware and software company working toward practical fault-tolerant quantum advantage.", founded: 2016, hq: "Cambridge, MA", ceo: "Dr. Elena Vasquez", employees: 1200, exchange: "NASDAQ", industry: "Quantum Computing" },
  SYNC:  { description: "B2B middleware and API orchestration platform connecting enterprise systems in real time with no-code workflow tooling.", founded: 2019, hq: "Denver, CO", ceo: "Priya Anand", employees: 650, exchange: "NYSE", industry: "Enterprise Integration / APIs" },
  CLOD:  { description: "Multi-cloud management platform enabling hybrid workload optimisation and cost governance for large enterprises.", founded: 2012, hq: "San Jose, CA", ceo: "Thomas Wren", employees: 11000, exchange: "NASDAQ", industry: "Cloud Management / IaaS" },
  NETX:  { description: "Next-generation fibre optic network operator providing dark fibre and wavelength services to telecoms and hyperscalers.", founded: 2007, hq: "Dallas, TX", ceo: "Sandra Moore", employees: 3400, exchange: "NYSE", industry: "Fibre Optics / Telecom Infrastructure" },
  SCAN:  { description: "AI-powered cybersecurity firm offering continuous attack surface monitoring and autonomous threat response at scale.", founded: 2017, hq: "McLean, VA", ceo: "James Okafor", employees: 1900, exchange: "NASDAQ", industry: "Cybersecurity / Threat Intelligence" },
  DBYT:  { description: "Cloud-native data analytics and warehousing platform processing over 5 exabytes of enterprise data monthly.", founded: 2013, hq: "New York, NY", ceo: "Asha Gupta", employees: 9500, exchange: "NASDAQ", industry: "Data Analytics / Business Intelligence" },
  PROX:  { description: "Consumer and enterprise VPN and privacy platform with 80M subscribers across 160 countries.", founded: 2020, hq: "Tallinn, Estonia", ceo: "Karl Müller", employees: 480, exchange: "NYSE", industry: "Privacy Software / VPN" },

  // === FOOD ===
  NOOD:  { description: "Tech-enabled noodle delivery chain using proprietary broth automation, operating 340 ghost kitchens nationwide.", founded: 2021, hq: "Los Angeles, CA", ceo: "Mei Liu", employees: 3200, exchange: "NYSE", industry: "Food Service / Ghost Kitchens" },
  FIZZ:  { description: "Premium functional beverage brand focused on adaptogenic and nootropic drinks sold through DTC and major retailers.", founded: 2018, hq: "Boulder, CO", ceo: "Jake Torres", employees: 720, exchange: "NASDAQ", industry: "Functional Beverages / FMCG" },
  BURG:  { description: "Decentralised burger franchise operating on a profit-sharing model with franchise operators as co-owners via token governance.", founded: 2022, hq: "Miami, FL", ceo: "Ryan Patel", employees: 1100, exchange: "NYSE", industry: "QSR / Franchise / DeFi Hybrid" },
  BREW:  { description: "Specialty coffee chain leveraging blockchain traceability from farm to cup, with 1,200 locations across 18 countries.", founded: 2016, hq: "Portland, OR", ceo: "Kira Holmberg", employees: 8900, exchange: "NASDAQ", industry: "Specialty Coffee / Retail Chain" },
  SNAK:  { description: "Global snack foods conglomerate with 40+ owned brands across 100 countries and a direct-to-consumer subscription platform.", founded: 2005, hq: "Chicago, IL", ceo: "Patricia Kim", employees: 22000, exchange: "NYSE", industry: "Packaged Foods / FMCG" },

  // === SPACE ===
  MOON:  { description: "Commercial aerospace company developing reusable heavy-lift launch vehicles and orbital transfer services for government and commercial clients.", founded: 2012, hq: "Hawthorne, CA", ceo: "Axel Brenner", employees: 14000, exchange: "NASDAQ", industry: "Launch Services / Aerospace" },
  ORBT:  { description: "Satellite logistics and in-orbit servicing company providing refuelling and maintenance for commercial satellite operators.", founded: 2019, hq: "Colorado Springs, CO", ceo: "Diane Walsh", employees: 2100, exchange: "NYSE", industry: "In-orbit Services / Space Logistics" },
  MARS:  { description: "Infrastructure developer for Mars surface habitation, life support systems, and in-situ resource utilisation.", founded: 2020, hq: "Houston, TX", ceo: "Dr. Raj Nair", employees: 900, exchange: "NASDAQ", industry: "Space Colonisation / Life Support" },
  ASTR:  { description: "Space resources company focused on asteroid prospecting and lunar regolith extraction technologies.", founded: 2021, hq: "Luxembourg City, Luxembourg", ceo: "Olga Novak", employees: 320, exchange: "NYSE", industry: "Space Mining / Resources" },
  NOVA:  { description: "Small satellite constellation operator providing global broadband internet with 1,800 LEO satellites in active orbit.", founded: 2015, hq: "Redmond, WA", ceo: "Ethan Cho", employees: 7600, exchange: "NASDAQ", industry: "Satellite Internet / LEO Broadband" },

  // === MEME ===
  DOGE:  { description: "Diversified holding company with viral social media brand equity spanning merchandise, NFTs, and community-funded startups.", founded: 2021, hq: "Las Vegas, NV", ceo: "Billy Nakamoto", employees: 280, exchange: "NYSE", industry: "Brand / Community Holdings" },
  MEME:  { description: "Digital content vault and IP licensing firm specialising in meme culture monetisation and internet phenomenon intellectual property.", founded: 2022, hq: "Austin, TX", ceo: "Zoe Larkins", employees: 95, exchange: "OTC", industry: "Digital IP / Content Licensing" },
  YOLO:  { description: "High-frequency speculative trading platform targeting retail investors with gamified portfolio tools and leaderboards.", founded: 2021, hq: "Miami, FL", ceo: "Chad Winters", employees: 140, exchange: "OTC", industry: "Retail Trading / Fintech" },
  PEPE:  { description: "Decentralised meme economy protocol enabling community-issued tokens tied to viral cultural moments.", founded: 2023, hq: "Cayman Islands", ceo: "Anonymous (DAO)", employees: 22, exchange: "OTC", industry: "DeFi / Meme Protocol" },
  STONK: { description: "Financial meme media company producing viral stock market commentary, education and entertainment content.", founded: 2020, hq: "Brooklyn, NY", ceo: "Jordan Fisk", employees: 68, exchange: "OTC", industry: "Financial Media / Entertainment" },
  BONK:  { description: "Failed education platform trying to make a resurgence.", founded: 2023, hq: "United Kingdom", ceo: "Billy", employees: 1, exchange: "OTC", industry: "Crypto / Social Rewards" },
  FOMO:  { description: "Algorithmic social sentiment fund exploiting retail herding behaviour in small-cap equities.", founded: 2021, hq: "Jersey City, NJ", ceo: "Alex Wu", employees: 55, exchange: "OTC", industry: "Quantitative / Social Sentiment" },
  LAMBO: { description: "Luxury asset tokenisation platform allowing fractional ownership of exotic cars, watches, and collectibles.", founded: 2022, hq: "Monaco", ceo: "Renée Dufort", employees: 48, exchange: "OTC", industry: "Asset Tokenisation / Luxury" },
  QUAK:  { description: "Former Prime minister pool of unused government funding. Central investment portfolio.", founded: 2022, hq: "Poland, Kirabati", ceo: "Guy Parmelin", employees: 12, exchange: "OTC", industry: "Community Investing / DAO" },

  // === GREEN ===
  GRDN:  { description: "Biotech-forward urban farming firm developing high-yield algae and plant-based biofertilisers for sustainable agriculture.", founded: 2016, hq: "Sacramento, CA", ceo: "Flora Chen", employees: 1800, exchange: "NASDAQ", industry: "Green Biotech / Sustainable Farming" },
  SPRK:  { description: "Grid-scale battery storage developer and operator providing 24-hour renewable dispatchability across 14 US states.", founded: 2017, hq: "Phoenix, AZ", ceo: "Marcus Johnson", employees: 2400, exchange: "NYSE", industry: "Battery Storage / Grid Infrastructure" },
  LEAF:  { description: "Atmospheric water generation company deploying solar-powered units to provide clean water in water-stressed regions globally.", founded: 2019, hq: "Nairobi, Kenya", ceo: "Amara Osei", employees: 560, exchange: "NYSE", industry: "Clean Water / Sustainable Tech" },
  WIND:  { description: "Offshore wind farm developer with 4.8GW of installed capacity across the North Sea and US Atlantic coast.", founded: 2011, hq: "Copenhagen, Denmark", ceo: "Lars Eriksen", employees: 5200, exchange: "NYSE", industry: "Offshore Wind / Renewable Energy" },
  SOLR:  { description: "Vertically integrated solar manufacturer and EPC contractor, operating the largest US utility-scale solar portfolio.", founded: 2008, hq: "Tempe, AZ", ceo: "Sunita Reddy", employees: 14000, exchange: "NYSE", industry: "Solar Energy / Renewables" },

  // === FINANCE ===
  BNKR:  { description: "Multinational investment bank and asset manager with $4.2T AUM serving sovereign wealth funds and global institutions.", founded: 1895, hq: "New York, NY", ceo: "William Grant", employees: 85000, exchange: "NYSE", industry: "Investment Banking / Asset Management" },
  LEND:  { description: "Decentralised lending protocol offering over-collateralised loans in 60+ digital assets with institutional-grade risk controls.", founded: 2019, hq: "Zug, Switzerland", ceo: "Dr. Yuki Tanaka", employees: 380, exchange: "NASDAQ", industry: "DeFi / Crypto Lending" },
  INSR:  { description: "Parametric insurance provider using smart contracts and satellite data for rapid pay-out on climate-related events.", founded: 2018, hq: "Bermuda", ceo: "Claire Drummond", employees: 920, exchange: "NYSE", industry: "InsurTech / Parametric Insurance" },
  HEDG:  { description: "Multi-strategy hedge fund operator managing $120B across macro, equity long/short, and quantitative strategies.", founded: 2001, hq: "Greenwich, CT", ceo: "Robert Ashford", employees: 1800, exchange: "NASDAQ", industry: "Hedge Funds / Alternative Assets" },
  PAYX:  { description: "Global digital payments network processing $2.1T annually across 190 countries via open banking APIs.", founded: 2015, hq: "Dublin, Ireland", ceo: "Niamh O'Sullivan", employees: 6200, exchange: "NYSE", industry: "Digital Payments / Open Banking" },
  NBNK:  { description: "Mobile-first neobank offering zero-fee accounts, earned-wage access, and AI-powered budgeting to 18M users.", founded: 2020, hq: "London, UK", ceo: "Sophie Ward", employees: 1400, exchange: "NASDAQ", industry: "Neobanking / Consumer Fintech" },
  STBL:  { description: "Regulated stablecoin issuer and payment rail operator with $22B in reserves managed by a Big Four audited trust.", founded: 2019, hq: "New York, NY", ceo: "Aaron Levitt", employees: 340, exchange: "NASDAQ", industry: "Stablecoin / Payment Infrastructure" },
  WLTH:  { description: "Digital wealth advisory platform combining human advisors with AI-driven portfolio construction, serving 1.2M clients.", founded: 2017, hq: "Boston, MA", ceo: "Rebecca Moss", employees: 3100, exchange: "NYSE", industry: "Wealth Management / Robo-Advisory" },
  TOKN:  { description: "Tokenisation platform enabling financial institutions to issue regulated digital securities on permissioned blockchain rails.", founded: 2020, hq: "Singapore", ceo: "Benjamin Lim", employees: 280, exchange: "NASDAQ", industry: "Security Tokenisation / DeFi" },

  // === GAMING ===
  FRAG:  { description: "AAA game developer known for the FragStorm franchise with 240M cumulative copies sold across PC and console platforms.", founded: 2003, hq: "Redmond, WA", ceo: "Chris Yamamoto", employees: 4800, exchange: "NASDAQ", industry: "AAA Game Development / Publishing" },
  LOOT:  { description: "In-game economy platform powering virtual item ecosystems and loot mechanics for 400 third-party game studios.", founded: 2018, hq: "Dublin, Ireland", ceo: "Patrick Byrne", employees: 650, exchange: "NYSE", industry: "In-game Economies / Gaming Platform" },
  PIXEL: { description: "Mid-size studio specialising in narrative RPG and indie-AA games with strong PC and Nintendo Switch communities.", founded: 2012, hq: "Montreal, Canada", ceo: "Isabelle Tremblay", employees: 1200, exchange: "NASDAQ", industry: "Indie-AA Game Development" },
  GGWP:  { description: "Esports league operator running 12 professional gaming franchises across FPS, MOBA, and battle royale titles.", founded: 2016, hq: "Los Angeles, CA", ceo: "Kyle Peterson", employees: 900, exchange: "NYSE", industry: "Esports / Gaming Events" },
  VRTX:  { description: "VR/AR game studio and platform provider with the VortexVR headset holding 18% market share in premium gaming VR.", founded: 2014, hq: "San Diego, CA", ceo: "Amanda Ng", employees: 2200, exchange: "NASDAQ", industry: "VR/AR Gaming / Hardware" },
  METV:  { description: "Metaverse gaming platform hosting 40M monthly active users across persistent virtual worlds and live events.", founded: 2019, hq: "Singapore", ceo: "Noah Park", employees: 3800, exchange: "NYSE", industry: "Metaverse / Social Gaming" },
  NFTR:  { description: "Blockchain gaming marketplace enabling true NFT ownership of in-game items across 80 integrated game titles.", founded: 2021, hq: "Malta", ceo: "Gabriel Cruz", employees: 180, exchange: "OTC", industry: "NFT Gaming / Web3" },
  ESPT:  { description: "Digital esports broadcast network reaching 220M unique viewers monthly across streaming and linear platforms.", founded: 2015, hq: "Los Angeles, CA", ceo: "Diana Lee", employees: 1500, exchange: "NASDAQ", industry: "Esports Media / Broadcast" },

  // === HEALTH ===
  CURE:  { description: "Oncology-focused biopharmaceutical company with 3 approved therapies and an 18-asset clinical pipeline.", founded: 2010, hq: "Cambridge, MA", ceo: "Dr. Priya Shah", employees: 9800, exchange: "NASDAQ", industry: "Oncology / Biopharmaceuticals" },
  VITA:  { description: "Science-backed nutritional supplements brand with clinical trial support for its flagship gut health and cognitive product range.", founded: 2017, hq: "Austin, TX", ceo: "Laura Stein", employees: 620, exchange: "NYSE", industry: "Nutraceuticals / Supplements" },
  MEDS:  { description: "Speciality biotech company developing RNA-targeted therapies for rare neurological and metabolic disorders.", founded: 2013, hq: "Basel, Switzerland", ceo: "Dr. Hans Weber", employees: 3400, exchange: "NASDAQ", industry: "RNA Therapeutics / Rare Disease" },
  GENE:  { description: "Precision medicine company applying whole-genome sequencing and AI-guided diagnostics to personalise oncology treatment.", founded: 2015, hq: "Palo Alto, CA", ceo: "Dr. Angela Foster", employees: 2100, exchange: "NASDAQ", industry: "Genomics / Precision Medicine" },
  RXAI:  { description: "AI diagnostics platform using deep learning on medical imaging data to detect disease with radiologist-level accuracy.", founded: 2018, hq: "Boston, MA", ceo: "Kevin Yap", employees: 780, exchange: "NASDAQ", industry: "Medical AI / Diagnostics" },
  TELE:  { description: "Telehealth platform connecting 12M patients to licensed physicians, therapists, and dieticians via app-based consultations.", founded: 2016, hq: "New York, NY", ceo: "Erica Powell", employees: 4200, exchange: "NYSE", industry: "Telehealth / Digital Health" },
  WLLB:  { description: "Autonomous AI clinic operator deploying kiosk-based primary care units with full diagnostic capability in retail settings.", founded: 2020, hq: "Minneapolis, MN", ceo: "Nadia Brooks", employees: 540, exchange: "NASDAQ", industry: "AI Clinics / Primary Care" },
  DNTL:  { description: "Dental care network and digital orthodontics company offering clear aligner treatment via 800 partnered clinic locations.", founded: 2019, hq: "Nashville, TN", ceo: "Dr. Mia Fontaine", employees: 1800, exchange: "NYSE", industry: "Dental Tech / Orthodontics" },

  // === CRYPTO ===
  HODL:  { description: "Regulated cryptocurrency exchange and custody platform serving 4M retail and institutional clients across 80 countries.", founded: 2017, hq: "Valletta, Malta", ceo: "Sven Hansen", employees: 1600, exchange: "NASDAQ", industry: "Crypto Exchange / Custody" },
  DEFI:  { description: "Non-custodial DeFi protocol aggregator providing optimised yield routing across 150 protocols on 12 EVM chains.", founded: 2020, hq: "Cayman Islands", ceo: "DeFi DAO", employees: 60, exchange: "OTC", industry: "DeFi Aggregation / Yield" },
  MINE:  { description: "Industrial-scale proof-of-work mining operator running 480MW of carbon-neutral hashrate across Iceland and Canada.", founded: 2018, hq: "Reykjavik, Iceland", ceo: "Lars Bjornsson", employees: 820, exchange: "NYSE", industry: "Crypto Mining / Bitcoin Infrastructure" },
  WHAL:  { description: "Institutional crypto prime brokerage providing OTC trading, lending, and structured products to family offices and funds.", founded: 2019, hq: "Hong Kong", ceo: "Grace Leung", employees: 420, exchange: "NASDAQ", industry: "Crypto Prime Brokerage / OTC" },
  NFTX:  { description: "NFT derivatives market and pricing oracle providing liquidity solutions for illiquid digital collectibles and art.", founded: 2021, hq: "Singapore", ceo: "Ryo Suzuki", employees: 90, exchange: "OTC", industry: "NFT Finance / Digital Collectibles" },

  // === DEFENCE ===
  TANK:  { description: "Prime defence contractor producing next-generation armoured combat vehicles and active protection systems for NATO allies.", founded: 1952, hq: "Arlington, VA", ceo: "Gen. (ret.) William Briggs", employees: 68000, exchange: "NYSE", industry: "Defence / Armoured Systems" },
  SHLD:  { description: "Electronic warfare and directed energy systems developer providing force protection capabilities to 28 allied nations.", founded: 1968, hq: "Huntsville, AL", ceo: "Margaret Collins", employees: 12000, exchange: "NASDAQ", industry: "Electronic Warfare / C4ISR" },
  DRNE:  { description: "Autonomous drone warfare systems company producing loitering munitions and swarm coordination platforms.", founded: 2016, hq: "Tel Aviv, Israel", ceo: "Yaron Katz", employees: 2800, exchange: "NYSE", industry: "Autonomous Weapons / Drones" },
  ARMO:  { description: "Specialist in ballistic protection materials, soldier equipment, and vehicle armour solutions for allied armed forces.", founded: 1978, hq: "Columbus, OH", ceo: "Richard Hawke", employees: 6400, exchange: "NYSE", industry: "Protective Materials / Defence Gear" },
  SATL:  { description: "Dual-use satellite intelligence company providing high-resolution SAR and optical imagery for government and commercial clients.", founded: 2009, hq: "Tysons Corner, VA", ceo: "Susan Pierce", employees: 4200, exchange: "NYSE", industry: "Satellite Intelligence / Earth Observation" },
  CYBX:  { description: "Offensive and defensive cyber operations contractor providing nation-state-grade persistent threat capabilities to allied governments.", founded: 2014, hq: "Cheltenham, UK", ceo: "Cdr. (ret.) James Rhodes", employees: 3100, exchange: "NASDAQ", industry: "Cyber Warfare / Government Cyber" },
  RADS:  { description: "Advanced radar and sensor fusion company producing AESA arrays and AI-driven situational awareness for military applications.", founded: 1991, hq: "Scottsdale, AZ", ceo: "Patricia Lane", employees: 5800, exchange: "NASDAQ", industry: "Radar / Sensor Systems" },

  // === RETAIL ===
  SHOP:  { description: "Global e-commerce marketplace and logistics network processing $420B in GMV annually across 190 countries.", founded: 2004, hq: "Seattle, WA", ceo: "Jennifer Moon", employees: 135000, exchange: "NASDAQ", industry: "E-commerce / Retail Marketplace" },
  DLVR:  { description: "On-demand last-mile delivery platform operating in 62 cities with 15-minute grocery and restaurant fulfilment.", founded: 2019, hq: "New York, NY", ceo: "Tariq Hassan", employees: 4800, exchange: "NYSE", industry: "Quick Commerce / Last Mile" },
  LUXE:  { description: "Multi-brand luxury goods holding company owning 22 iconic fashion, jewellery, and watch houses globally.", founded: 1987, hq: "Paris, France", ceo: "Henri Beaumont", employees: 42000, exchange: "NYSE", industry: "Luxury Goods / Fashion Conglomerate" },
  DEAL:  { description: "Hyper-discount off-price retail chain exploiting manufacturer overstock to offer 60–90% below MSRP across 1,800 stores.", founded: 2012, hq: "Cincinnati, OH", ceo: "Paul Archer", employees: 28000, exchange: "NYSE", industry: "Off-price Retail / Discount" },
  CART:  { description: "Social commerce platform enabling creator-led storefronts with shoppable video and AI-personalised product discovery.", founded: 2021, hq: "Los Angeles, CA", ceo: "Lily Zhang", employees: 1100, exchange: "NASDAQ", industry: "Social Commerce / Creator Economy" },

  // === MEDIA ===
  STRM:  { description: "Ad-supported and premium streaming service with 480M global subscribers and a $12B annual content budget.", founded: 2010, hq: "Los Angeles, CA", ceo: "Carlos Rivera", employees: 12500, exchange: "NASDAQ", industry: "Streaming / Entertainment" },
  BUZZ:  { description: "News and entertainment platform operating viral content verticals across social media with 800M monthly impressions.", founded: 2015, hq: "New York, NY", ceo: "Ashley Croft", employees: 1200, exchange: "NYSE", industry: "Digital Media / Social Publishing" },
  CAST:  { description: "Podcast hosting, monetisation, and distribution platform serving 200,000 independent creators globally.", founded: 2018, hq: "Austin, TX", ceo: "Marco Flores", employees: 480, exchange: "NASDAQ", industry: "Podcast / Creator Monetisation" },
  REEL:  { description: "Short-form video studio producing original content for streaming platforms and operating a major influencer talent agency.", founded: 2020, hq: "Los Angeles, CA", ceo: "Jenna Park", employees: 880, exchange: "NYSE", industry: "Short-form Video / Creator Studios" },
  NEWS:  { description: "Digital news aggregation and original journalism platform with AI-personalised delivery to 90M paid subscribers.", founded: 2013, hq: "Washington, DC", ceo: "Mark Thornton", employees: 3800, exchange: "NYSE", industry: "Digital Journalism / News Platform" },
  PODC:  { description: "Global podcast discovery network with curated editorial and exclusive shows reaching 120M weekly listeners.", founded: 2017, hq: "Stockholm, Sweden", ceo: "Emma Lindqvist", employees: 1100, exchange: "NASDAQ", industry: "Podcast Discovery / Audio Media" },
  LIVE:  { description: "Live streaming infrastructure and creator monetisation company powering 40,000 channels and $1B+ in annual creator earnings.", founded: 2016, hq: "San Francisco, CA", ceo: "Brian Ko", employees: 2200, exchange: "NASDAQ", industry: "Live Streaming / Creator Economy" },
  ANIM:  { description: "Oscar-nominated animation studio producing feature films, episodic series, and IP licensing for global family entertainment.", founded: 2008, hq: "Burbank, CA", ceo: "Dana Wells", employees: 1900, exchange: "NYSE", industry: "Animation Studio / Film / IP" },

  // === AUTO ===
  EVOX:  { description: "Vertically integrated electric vehicle manufacturer producing consumer, fleet, and commercial EVs with in-house battery chemistry.", founded: 2012, hq: "Palo Alto, CA", ceo: "Natasha Kim", employees: 58000, exchange: "NASDAQ", industry: "Electric Vehicles / Battery Tech" },
  VOLT:  { description: "Legacy automaker completing full electrification transition with $60B in planned EV investment through 2030.", founded: 1954, hq: "Detroit, MI", ceo: "Frank Morrison", employees: 92000, exchange: "NYSE", industry: "Electric Vehicles / Legacy OEM" },
  HYDR:  { description: "Hydrogen fuel cell vehicle developer targeting commercial trucking and bus markets with 1,200km zero-emission range.", founded: 2017, hq: "Salt Lake City, UT", ceo: "Carl Jensen", employees: 2800, exchange: "NASDAQ", industry: "Hydrogen Fuel Cell / Commercial Vehicles" },
  AUTN:  { description: "Autonomous vehicle software and robotaxi platform operator with 12M driverless miles logged in active commercial deployments.", founded: 2016, hq: "San Francisco, CA", ceo: "Dr. Wei Sun", employees: 5400, exchange: "NASDAQ", industry: "Autonomous Vehicles / Robotaxi" },
  PKLOT: { description: "Smart parking and urban mobility infrastructure company managing 2M parking spaces across 320 cities worldwide.", founded: 2015, hq: "Columbus, OH", ceo: "Ryan O'Brien", employees: 1400, exchange: "NYSE", industry: "Smart Parking / Urban Mobility" },
  TRKR:  { description: "Connected commercial fleet management platform providing telematics, route optimisation, and EV fleet conversion services.", founded: 2017, hq: "Memphis, TN", ceo: "Sarah Mitchell", employees: 1800, exchange: "NYSE", industry: "Fleet Management / Telematics" },

  // === REALTY ===
  REIT:  { description: "Diversified REIT holding $38B in commercial, industrial, and residential assets across 60 US metropolitan markets.", founded: 1997, hq: "Atlanta, GA", ceo: "Charles Brown", employees: 2400, exchange: "NYSE", industry: "REIT / Commercial Real Estate" },
  PROP:  { description: "Real estate technology platform enabling tokenised property ownership and AI-driven property valuation at scale.", founded: 2018, hq: "New York, NY", ceo: "Helen Zhang", employees: 1100, exchange: "NASDAQ", industry: "PropTech / Real Estate Tokenisation" },
  SPCX:  { description: "Flexible workspace and co-working operator managing 8M sqft of premium office space in 42 cities globally.", founded: 2014, hq: "London, UK", ceo: "Oliver Brown", employees: 3800, exchange: "NYSE", industry: "Flexible Workspace / PropTech" },
  LOFT:  { description: "DAO-governed residential property network offering fractional co-ownership of curated urban apartment portfolios.", founded: 2021, hq: "Lisbon, Portugal", ceo: "PropDAO Council", employees: 95, exchange: "OTC", industry: "Residential / Fractional Ownership" },
  BRIK:  { description: "Blockchain-powered property registry and mortgage automation platform reducing transaction costs by 80%.", founded: 2019, hq: "Dubai, UAE", ceo: "Omar Al-Rashid", employees: 420, exchange: "NASDAQ", industry: "Real Estate Tech / Blockchain" },

  // === TRAVEL ===
  SOAR:  { description: "International airline group operating 280 routes connecting 85 destinations across 6 continents with a fuel-efficient fleet.", founded: 1946, hq: "London, UK", ceo: "Victoria Hunt", employees: 38000, exchange: "NYSE", industry: "Commercial Aviation / Airlines" },
  CRUZ:  { description: "Luxury cruise line operating 22 vessels with itineraries across 600 destinations and a $4B ship-building programme.", founded: 1978, hq: "Miami, FL", ceo: "Antonio Vargas", employees: 24000, exchange: "NYSE", industry: "Luxury Cruises / Tourism" },
  STAY:  { description: "Global hotel technology company operating an asset-light branded network of 9,000 properties in 110 countries.", founded: 2001, hq: "Bethesda, MD", ceo: "Lisa Nguyen", employees: 18000, exchange: "NYSE", industry: "Hotels / Hospitality Tech" },
  XPDT:  { description: "Adventure and experiential travel platform curating off-the-beaten-path expeditions for high-net-worth travellers.", founded: 2019, hq: "Edinburgh, UK", ceo: "Duncan Fraser", employees: 380, exchange: "NASDAQ", industry: "Experiential Travel / Luxury Tourism" },
  JETT:  { description: "Private jet charter and fractional ownership operator with a fleet of 420 aircraft serving 1,800 departure airports.", founded: 2011, hq: "Fort Lauderdale, FL", ceo: "Ryan Cole", employees: 2900, exchange: "NYSE", industry: "Private Aviation / Charter" },
  RAIL:  { description: "High-speed intercity rail operator connecting 48 city pairs across the US northeast and west coast corridors.", founded: 2015, hq: "Washington, DC", ceo: "Carla Sanchez", employees: 6200, exchange: "NYSE", industry: "High-speed Rail / Passenger Transport" },

  // === AI ===
  GNAI:  { description: "Foundation model developer and AI cloud provider with the highest-rated general-purpose language and reasoning API.", founded: 2019, hq: "San Francisco, CA", ceo: "Dr. Samuel Wright", employees: 5200, exchange: "NASDAQ", industry: "Foundation Models / AI Cloud" },
  LMAI:  { description: "Open-source LLM company monetising via enterprise deployment tools, fine-tuning infrastructure, and managed inference.", founded: 2022, hq: "Menlo Park, CA", ceo: "Dr. Fiona Shen", employees: 1800, exchange: "NASDAQ", industry: "Open-source AI / LLM Infrastructure" },
  NRAL:  { description: "Neural pathway optimisation company deploying AI agents for autonomous process automation in enterprise workflows.", founded: 2020, hq: "London, UK", ceo: "James Whitfield", employees: 2400, exchange: "NYSE", industry: "AI Agents / Enterprise Automation" },
  VISI:  { description: "Computer vision AI platform providing real-time scene understanding for robotics, security, and industrial quality control.", founded: 2018, hq: "Munich, Germany", ceo: "Dr. Klaus Richter", employees: 1100, exchange: "NASDAQ", industry: "Computer Vision / Industrial AI" },
  ORCH:  { description: "Agentic AI orchestration framework developer enabling multi-agent task automation for software engineering and data ops.", founded: 2023, hq: "San Francisco, CA", ceo: "Mei Chen", employees: 420, exchange: "NASDAQ", industry: "AI Orchestration / Agentic Frameworks" },
  SPKR:  { description: "Real-time AI transcription and multilingual translation platform processing 2B minutes of audio monthly for enterprises.", founded: 2019, hq: "Toronto, Canada", ceo: "Anika Patel", employees: 680, exchange: "NASDAQ", industry: "AI Speech / Transcription" },

  // === BIOTECH ===
  CRSP:  { description: "CRISPR therapeutics pioneer with 4 gene-editing drugs in late-stage trials and a $2B research collaboration with NIH.", founded: 2013, hq: "Cambridge, MA", ceo: "Dr. Maria Santos", employees: 3200, exchange: "NASDAQ", industry: "CRISPR / Gene Therapy" },
  PROT:  { description: "Protein engineering company using directed evolution and AI to develop novel enzyme-based therapeutics and industrial catalysts.", founded: 2016, hq: "Gaithersburg, MD", ceo: "Dr. Alan Foster", employees: 1600, exchange: "NASDAQ", industry: "Protein Engineering / Biotechnology" },
  CELL:  { description: "Cell therapy developer applying CAR-T and NK cell platforms to haematological cancers and solid tumours.", founded: 2014, hq: "Philadelphia, PA", ceo: "Dr. Susan Park", employees: 2100, exchange: "NASDAQ", industry: "Cell Therapy / Immuno-oncology" },
  IMUN:  { description: "Immune system modulation company developing bispecific antibodies and checkpoint inhibitors for autoimmune diseases.", founded: 2015, hq: "New Haven, CT", ceo: "Dr. Carlos Mendez", employees: 1800, exchange: "NASDAQ", industry: "Immunology / Bispecific Antibodies" },
  SYNT:  { description: "Synthetic biology startup engineering microbial factories for sustainable chemical and pharmaceutical production.", founded: 2020, hq: "San Diego, CA", ceo: "Dr. Emily Zhao", employees: 360, exchange: "NASDAQ", industry: "Synthetic Biology / Industrial Biotech" },
  MRNA:  { description: "mRNA therapeutics platform developing personalised cancer vaccines and infectious disease treatments at industrial scale.", founded: 2017, hq: "Lexington, MA", ceo: "Dr. Patrick Lee", employees: 2800, exchange: "NASDAQ", industry: "mRNA Therapeutics / Vaccines" },

  // === ENERGY ===
  PETR:  { description: "Integrated supermajor oil and gas company with 28B barrels of proven reserves and a $15B clean energy transition fund.", founded: 1928, hq: "Houston, TX", ceo: "James Caldwell", employees: 72000, exchange: "NYSE", industry: "Oil & Gas / Energy Supermajor" },
  NUKE:  { description: "Nuclear power generation company operating 12 US reactors and developing next-generation small modular reactor technology.", founded: 1963, hq: "Charlotte, NC", ceo: "Robert Harmon", employees: 18000, exchange: "NYSE", industry: "Nuclear Power / SMR Technology" },
  GASX:  { description: "Natural gas pipeline and LNG export terminal operator with 28,000 miles of transmission infrastructure across North America.", founded: 1948, hq: "Houston, TX", ceo: "William Chambers", employees: 11000, exchange: "NYSE", industry: "Natural Gas / LNG Infrastructure" },
  FUSE:  { description: "Commercial fusion energy company pursuing inertial confinement and high-temperature plasma approaches to net energy gain.", founded: 2018, hq: "Los Angeles, CA", ceo: "Dr. Nadia Torres", employees: 880, exchange: "NASDAQ", industry: "Fusion Energy / Nuclear Research" },
  HYDP:  { description: "Hydropower and pumped-storage operator with 24GW of installed capacity across the Columbia River Basin and Rhine system.", founded: 1935, hq: "Portland, OR", ceo: "Carl Andrews", employees: 8400, exchange: "NYSE", industry: "Hydropower / Grid Storage" },
  COAL:  { description: "Diversified mining and thermal coal company transitioning its portfolio toward rare earth mineral extraction.", founded: 1922, hq: "Knoxville, TN", ceo: "Howard Trent", employees: 9200, exchange: "NYSE", industry: "Coal Mining / Rare Earth Minerals" },

  // === LOGISTICS ===
  SHPY:  { description: "Global container shipping group operating 680 vessels across 120 trade lanes with a digital freight marketplace.", founded: 1898, hq: "Copenhagen, Denmark", ceo: "Lars Hansen", employees: 82000, exchange: "NYSE", industry: "Container Shipping / Freight" },
  DRON:  { description: "FAA-certified fast acting drone delivery network. Ensuring packages are dropped from a minimum of 5,000 feet. Don't send fragile packages!", founded: 2018, hq: "Reno, NV", ceo: "Steven DronDrop", employees: 2200, exchange: "NASDAQ", industry: "Drone Delivery / Air Logistics" },
  FRTX:  { description: "Digital freight brokerage platform matching shippers and carriers via AI-powered load optimisation across the US trucking market.", founded: 2017, hq: "Chicago, IL", ceo: "Dan Murphy", employees: 3400, exchange: "NYSE", industry: "Digital Freight / Trucking" },
  LAST:  { description: "Sidewalk delivery robot operator deploying 8,000 autonomous pods in 120 university campuses and urban neighbourhoods.", founded: 2019, hq: "San Jose, CA", ceo: "Hana Ito", employees: 1100, exchange: "NASDAQ", industry: "Ground Delivery Robotics / Last Mile" },
  WRHX:  { description: "Warehouse automation integrator deploying AI-guided mobile robots, sorters, and automated pick stations for e-commerce fulfilment.", founded: 2016, hq: "Louisville, KY", ceo: "Tom Garrett", employees: 2800, exchange: "NYSE", industry: "Warehouse Automation / Robotics" },
  COLD:  { description: "Temperature-controlled cold chain logistics specialist managing pharmaceutical and perishable supply chains across 48 countries.", founded: 2008, hq: "Memphis, TN", ceo: "Anne Walsh", employees: 6800, exchange: "NYSE", industry: "Cold Chain / Specialty Logistics" },

  // === AGRICULTURE ===
  FARM:  { description: "Autonomous farming robotics company deploying AI-guided tractors and harvesting platforms to reduce labour costs by 60%.", founded: 2017, hq: "Fresno, CA", ceo: "David Howard", employees: 1400, exchange: "NASDAQ", industry: "AgriRobotics / Precision Farming" },
  SEED:  { description: "Genomics-driven seed company using CRISPR and AI trait stacking to develop climate-resilient crop varieties.", founded: 2016, hq: "Research Triangle Park, NC", ceo: "Dr. Kim Collins", employees: 1900, exchange: "NASDAQ", industry: "Crop Genomics / Ag Biotech" },
  AQUA:  { description: "Offshore and land-based aquaculture systems developer providing recirculating salmon and shrimp farming infrastructure.", founded: 2018, hq: "Bergen, Norway", ceo: "Erik Andersen", employees: 760, exchange: "NYSE", industry: "Aquaculture / Sustainable Food" },
  FRTL:  { description: "Next-generation fertiliser company producing ammonia via green hydrogen electrolysis, eliminating natural gas dependency.", founded: 2020, hq: "Rotterdam, Netherlands", ceo: "Stefan Van der Berg", employees: 940, exchange: "NYSE", industry: "Green Fertilisers / Clean Agri-Chem" },
  HVST:  { description: "Drone-based crop monitoring and precision spraying platform serving 45,000 farm operators across North America and Australia.", founded: 2019, hq: "Fargo, ND", ceo: "Sara Lee", employees: 680, exchange: "NASDAQ", industry: "AgriDrones / Crop Monitoring" },
  GRAI:  { description: "Digital grain trading exchange and physical commodity logistics platform connecting 120,000 farmers to global buyers.", founded: 2015, hq: "Kansas City, MO", ceo: "Thomas Wilkes", employees: 1200, exchange: "NYSE", industry: "Commodity Trading / Grain Markets" },
};

const SOURCES = ["MarketPulse", "TradeWire", "PolyDesk", "TechAnalyst Weekly", "MomentumTracker", "MacroView", "RateWatch", "IndustryBrief", "SectorPulse", "EquityAlert", "StockBrief"];

function fill(template, name, ticker) {
  return template.replace(/\{name\}/g, name).replace(/\{ticker\}/g, ticker);
}

export function generateNews(ticker, stock, macro, sector) {
  const profile = COMPANY_PROFILES[ticker];
  if (!profile) return [];

  const { name } = profile;
  const pct    = typeof stock.change === "number" ? stock.change : 0;
  const rsi    = typeof stock.rsi    === "number" ? stock.rsi    : 50;
  const streak = typeof stock.streak === "number" ? stock.streak : 0;
  const fg     = typeof macro.fearGreed      === "number" ? macro.fearGreed      : 50;
  const rate   = typeof macro.interestRate   === "number" ? macro.interestRate   : 5;

  const now = Date.now();
  const news = [];

  // 1. Price-movement headline (always included)
  if (Math.abs(pct) >= 3) {
    const verb = pct > 0 ? "surges" : "tumbles";
    news.push({
      headline:    `${name} ${verb} ${Math.abs(pct).toFixed(1)}% - ${pct > 0 ? "bulls" : "sellers"} dominate session`,
      sentiment:   pct > 0 ? "positive" : "negative",
      source:      "MarketPulse",
      publishedAt: new Date(now - (Math.floor(Math.random() * 20) + 5) * 60000).toISOString(),
    });
  } else if (Math.abs(pct) >= 0.8) {
    news.push({
      headline:    pct > 0
        ? `${ticker} extends gains - buying interest persists into the session`
        : `${ticker} slips back as profit-taking accelerates`,
      sentiment:   pct > 0 ? "positive" : "negative",
      source:      "TradeWire",
      publishedAt: new Date(now - (Math.floor(Math.random() * 40) + 10) * 60000).toISOString(),
    });
  } else {
    news.push({
      headline:    `${ticker} trades sideways as investors await a fresh catalyst`,
      sentiment:   "neutral",
      source:      "PolyDesk",
      publishedAt: new Date(now - (Math.floor(Math.random() * 60) + 20) * 60000).toISOString(),
    });
  }

  // 2. Technical conditions (RSI / streak)
  if (rsi > 75) {
    news.push({
      headline:    `Technical warning: ${ticker} RSI at ${Math.round(rsi)} - analysts flag overbought conditions`,
      sentiment:   "neutral",
      source:      "TechAnalyst Weekly",
      publishedAt: new Date(now - (Math.floor(Math.random() * 90) + 30) * 60000).toISOString(),
    });
  } else if (rsi < 25) {
    news.push({
      headline:    `${ticker} oversold: RSI dips to ${Math.round(rsi)} - contrarian buyers watching closely`,
      sentiment:   "neutral",
      source:      "TechAnalyst Weekly",
      publishedAt: new Date(now - (Math.floor(Math.random() * 90) + 30) * 60000).toISOString(),
    });
  }

  if (streak >= 5) {
    news.push({
      headline:    `${name} posts ${streak}-session winning streak - momentum traders add exposure`,
      sentiment:   "positive",
      source:      "MomentumTracker",
      publishedAt: new Date(now - (Math.floor(Math.random() * 120) + 60) * 60000).toISOString(),
    });
  } else if (streak <= -5) {
    news.push({
      headline:    `${ticker} loses ground for ${Math.abs(streak)} straight sessions - support levels under pressure`,
      sentiment:   "negative",
      source:      "MomentumTracker",
      publishedAt: new Date(now - (Math.floor(Math.random() * 120) + 60) * 60000).toISOString(),
    });
  }

  // 3. Macro / market-wide context
  if (fg < 25) {
    news.push({
      headline:    `Fear grips market - ${profile.industry} stocks including ${ticker} face broad selling pressure`,
      sentiment:   "negative",
      source:      "MacroView",
      publishedAt: new Date(now - (Math.floor(Math.random() * 180) + 60) * 60000).toISOString(),
    });
  } else if (fg > 75) {
    news.push({
      headline:    `Risk-on sentiment lifts ${profile.industry} names - ${ticker} among session beneficiaries`,
      sentiment:   "positive",
      source:      "MacroView",
      publishedAt: new Date(now - (Math.floor(Math.random() * 180) + 60) * 60000).toISOString(),
    });
  } else if (rate > 6) {
    news.push({
      headline:    `Elevated rates weigh on ${profile.industry} valuations - ${ticker} navigates cost-of-capital pressure`,
      sentiment:   "negative",
      source:      "RateWatch",
      publishedAt: new Date(now - (Math.floor(Math.random() * 240) + 120) * 60000).toISOString(),
    });
  }

  // 4. Sector-specific items from static pool (1–2, deterministic per hour)
  const templates = SECTOR_NEWS_TEMPLATES[sector] || [];
  if (templates.length > 0 && news.length < 5) {
    const seed = ticker.split("").reduce((a, c) => a + c.charCodeAt(0), 0) + Math.floor(now / 3_600_000);
    const idx1 = seed % templates.length;
    const idx2 = (seed + Math.floor(templates.length / 2) + 1) % templates.length;

    news.push({
      headline:    fill(templates[idx1], name, ticker),
      sentiment:   "neutral",
      source:      SOURCES[seed % SOURCES.length],
      publishedAt: new Date(now - ((seed % 10) + 3) * 3_600_000).toISOString(),
    });

    if (idx1 !== idx2 && news.length < 5) {
      news.push({
        headline:    fill(templates[idx2], name, ticker),
        sentiment:   "neutral",
        source:      SOURCES[(seed + 4) % SOURCES.length],
        publishedAt: new Date(now - ((seed % 16) + 6) * 3_600_000).toISOString(),
      });
    }
  }

  return news.slice(0, 5);
}
