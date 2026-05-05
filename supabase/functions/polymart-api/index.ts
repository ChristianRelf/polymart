import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function fgLabel(v: number): string {
  if (v <= 12) return "Extreme Fear";
  if (v <= 25) return "Fear";
  if (v <= 40) return "Cautious";
  if (v <= 60) return "Neutral";
  if (v <= 75) return "Greed";
  if (v <= 88) return "High Greed";
  return "Extreme Greed";
}

const SECTOR_META: Record<string, { label: string; icon: string }> = {
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
};

const STOCK_DEFS: Record<string, { sector: string; mcap: string; volatility: number; trend: number; basePrice: number }> = {
  APEX:{basePrice:420,volatility:.11,trend:.002,sector:"tech",mcap:"large"},
  VOID:{basePrice:550,volatility:.09,trend:-.001,sector:"tech",mcap:"large"},
  ROBO:{basePrice:180,volatility:.07,trend:.003,sector:"tech",mcap:"mid"},
  CHIP:{basePrice:290,volatility:.08,trend:.002,sector:"tech",mcap:"large"},
  QBIT:{basePrice:340,volatility:.13,trend:.003,sector:"tech",mcap:"mid"},
  SYNC:{basePrice:95,volatility:.07,trend:.001,sector:"tech",mcap:"small"},
  NOOD:{basePrice:15,volatility:.14,trend:-.001,sector:"food",mcap:"small"},
  FIZZ:{basePrice:62,volatility:.07,trend:.001,sector:"food",mcap:"mid"},
  BURG:{basePrice:38,volatility:.09,trend:.001,sector:"food",mcap:"small"},
  BREW:{basePrice:48,volatility:.06,trend:.002,sector:"food",mcap:"mid"},
  SNAK:{basePrice:72,volatility:.05,trend:.001,sector:"food",mcap:"mid"},
  MOON:{basePrice:320,volatility:.08,trend:.002,sector:"space",mcap:"large"},
  ORBT:{basePrice:210,volatility:.08,trend:.001,sector:"space",mcap:"mid"},
  MARS:{basePrice:145,volatility:.12,trend:.003,sector:"space",mcap:"mid"},
  ASTR:{basePrice:88,volatility:.10,trend:.002,sector:"space",mcap:"small"},
  NOVA:{basePrice:260,volatility:.09,trend:.001,sector:"space",mcap:"large"},
  DOGE:{basePrice:45,volatility:.12,trend:.001,sector:"meme",mcap:"small"},
  MEME:{basePrice:8,volatility:.22,trend:0,sector:"meme",mcap:"small"},
  YOLO:{basePrice:5,volatility:.28,trend:-.002,sector:"meme",mcap:"small"},
  PEPE:{basePrice:3,volatility:.30,trend:0,sector:"meme",mcap:"small"},
  STONK:{basePrice:12,volatility:.25,trend:.001,sector:"meme",mcap:"small"},
  GRDN:{basePrice:95,volatility:.06,trend:.002,sector:"green",mcap:"mid"},
  SPRK:{basePrice:75,volatility:.06,trend:.003,sector:"green",mcap:"mid"},
  LEAF:{basePrice:42,volatility:.05,trend:.002,sector:"green",mcap:"small"},
  WIND:{basePrice:110,volatility:.07,trend:.002,sector:"green",mcap:"mid"},
  SOLR:{basePrice:135,volatility:.06,trend:.003,sector:"green",mcap:"large"},
  BNKR:{basePrice:350,volatility:.05,trend:.001,sector:"finance",mcap:"large"},
  LEND:{basePrice:120,volatility:.07,trend:.001,sector:"finance",mcap:"mid"},
  INSR:{basePrice:85,volatility:.04,trend:.001,sector:"finance",mcap:"mid"},
  HEDG:{basePrice:480,volatility:.06,trend:.001,sector:"finance",mcap:"large"},
  PAYX:{basePrice:65,volatility:.08,trend:.002,sector:"finance",mcap:"mid"},
  FRAG:{basePrice:110,volatility:.10,trend:.002,sector:"gaming",mcap:"mid"},
  LOOT:{basePrice:28,volatility:.13,trend:0,sector:"gaming",mcap:"small"},
  PIXEL:{basePrice:65,volatility:.09,trend:.001,sector:"gaming",mcap:"mid"},
  GGWP:{basePrice:42,volatility:.11,trend:.002,sector:"gaming",mcap:"small"},
  VRTX:{basePrice:155,volatility:.10,trend:.002,sector:"gaming",mcap:"mid"},
  CURE:{basePrice:200,volatility:.08,trend:.002,sector:"health",mcap:"large"},
  VITA:{basePrice:30,volatility:.06,trend:.001,sector:"health",mcap:"small"},
  MEDS:{basePrice:155,volatility:.10,trend:.001,sector:"health",mcap:"mid"},
  GENE:{basePrice:280,volatility:.12,trend:.003,sector:"health",mcap:"mid"},
  RXAI:{basePrice:92,volatility:.09,trend:.002,sector:"health",mcap:"small"},
  HODL:{basePrice:90,volatility:.18,trend:0,sector:"crypto",mcap:"mid"},
  DEFI:{basePrice:55,volatility:.20,trend:.001,sector:"crypto",mcap:"small"},
  MINE:{basePrice:135,volatility:.15,trend:-.001,sector:"crypto",mcap:"mid"},
  WHAL:{basePrice:220,volatility:.16,trend:.001,sector:"crypto",mcap:"mid"},
  NFTX:{basePrice:18,volatility:.24,trend:-.001,sector:"crypto",mcap:"small"},
  TANK:{basePrice:400,volatility:.04,trend:.002,sector:"defence",mcap:"large"},
  SHLD:{basePrice:175,volatility:.05,trend:.002,sector:"defence",mcap:"mid"},
  DRNE:{basePrice:250,volatility:.06,trend:.001,sector:"defence",mcap:"mid"},
  ARMO:{basePrice:130,volatility:.04,trend:.001,sector:"defence",mcap:"mid"},
  SHOP:{basePrice:160,volatility:.07,trend:.002,sector:"retail",mcap:"large"},
  DLVR:{basePrice:78,volatility:.08,trend:.001,sector:"retail",mcap:"mid"},
  LUXE:{basePrice:340,volatility:.06,trend:.001,sector:"retail",mcap:"large"},
  DEAL:{basePrice:22,volatility:.10,trend:0,sector:"retail",mcap:"small"},
  CART:{basePrice:55,volatility:.07,trend:.002,sector:"retail",mcap:"mid"},
  STRM:{basePrice:185,volatility:.09,trend:.001,sector:"media",mcap:"large"},
  BUZZ:{basePrice:14,volatility:.16,trend:-.001,sector:"media",mcap:"small"},
  CAST:{basePrice:38,volatility:.08,trend:.002,sector:"media",mcap:"small"},
  REEL:{basePrice:95,volatility:.11,trend:.002,sector:"media",mcap:"mid"},
  NEWS:{basePrice:52,volatility:.07,trend:0,sector:"media",mcap:"mid"},
};

// ── Route handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: cors });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const url = new URL(req.url);
    // Strip function prefix: /polymart-api/api/v1/getMarket -> /api/v1/getMarket
    const path = url.pathname.replace(/^\/polymart-api/, "");

    // ── GET /api/v1/getMarket ────────────────────────────────────────────────
    if (path === "/api/v1/getMarket") {
      const [{ data: ms }, { data: stocks }] = await Promise.all([
        supabase.from("market_state").select("*").eq("id", 1).maybeSingle(),
        supabase.from("stocks_state").select("ticker,price,prev_price"),
      ]);
      if (!ms) return json({ error: "Simulation not yet initialised. Call /api/v1/admin/tick first." }, 503);

      let gainers = 0, losers = 0;
      let tG = { ticker: "", pct: -Infinity };
      let tL = { ticker: "", pct: Infinity };
      for (const s of (stocks || [])) {
        const pct = s.prev_price > 0 ? ((s.price - s.prev_price) / s.prev_price) * 100 : 0;
        if (pct > 0) gainers++; else if (pct < 0) losers++;
        if (pct > tG.pct) tG = { ticker: s.ticker, pct: +pct.toFixed(2) };
        if (pct < tL.pct) tL = { ticker: s.ticker, pct: +pct.toFixed(2) };
      }

      return json({
        index: +ms.index_value,
        indexChange: +(ms.index_value - ms.index_prev).toFixed(2),
        indexChangePct: ms.index_prev > 0 ? +((ms.index_value - ms.index_prev) / ms.index_prev * 100).toFixed(3) : 0,
        fearGreed: Math.round(ms.fear_greed),
        fearGreedLabel: fgLabel(ms.fear_greed),
        interestRate: +ms.interest_rate,
        inflation: +ms.inflation,
        gdpGrowth: +ms.gdp_growth,
        gainers,
        losers,
        unchanged: (stocks?.length ?? 0) - gainers - losers,
        totalStocks: stocks?.length ?? 0,
        topGainer: tG,
        topLoser: tL,
        upStreak: ms.up_streak,
        downStreak: ms.down_streak,
        tickCount: ms.tick_count,
        updatedAt: ms.updated_at,
      });
    }

    // ── GET /api/v1/getStocks ────────────────────────────────────────────────
    if (path === "/api/v1/getStocks") {
      const sector = url.searchParams.get("sector");
      let q = supabase.from("stocks_state").select("ticker,name,sector,mcap,price,prev_price,hi52w,lo52w,volume,rsi,streak").order("ticker");
      if (sector) q = q.eq("sector", sector.toLowerCase());
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 500);

      const result: Record<string, unknown> = {};
      for (const s of (data || [])) {
        const def = STOCK_DEFS[s.ticker];
        result[s.ticker] = {
          name: s.name,
          sector: s.sector,
          mcap: s.mcap,
          price: +s.price,
          change: s.prev_price > 0 ? +((s.price - s.prev_price) / s.prev_price * 100).toFixed(2) : 0,
          volume: s.volume,
          rsi: +s.rsi,
          streak: s.streak,
          hi52w: +s.hi52w,
          lo52w: +s.lo52w,
          volatility: def?.volatility ?? null,
          trend: def?.trend ?? null,
        };
      }
      return json(result);
    }

    // ── GET /api/v1/getStock?ticker=APEX ────────────────────────────────────
    if (path === "/api/v1/getStock") {
      const ticker = (url.searchParams.get("ticker") || "").toUpperCase();
      if (!ticker) return json({ error: "Missing ?ticker= parameter" }, 400);

      const { data: s } = await supabase.from("stocks_state").select("*").eq("ticker", ticker).maybeSingle();
      if (!s) return json({ error: `Ticker not found: ${ticker}` }, 404);

      const def = STOCK_DEFS[ticker];
      const pct = s.prev_price > 0 ? ((s.price - s.prev_price) / s.prev_price) * 100 : 0;
      const openPct = s.open_price > 0 ? ((s.price - s.open_price) / s.open_price) * 100 : 0;
      const peers = def ? Object.keys(STOCK_DEFS).filter(k => STOCK_DEFS[k].sector === def.sector && k !== ticker) : [];

      return json({
        ticker,
        name: s.name,
        sector: s.sector,
        mcap: s.mcap,
        price: +s.price,
        previousPrice: +s.prev_price,
        openPrice: +s.open_price,
        change: +pct.toFixed(2),
        changeSinceOpen: +openPct.toFixed(2),
        high52w: +s.hi52w,
        low52w: +s.lo52w,
        allTimeHigh: +s.ath,
        volume: s.volume,
        rsi: +s.rsi,
        momentum: +s.momentum,
        streak: s.streak,
        insiderBias: +s.insider_bias,
        volatility: def?.volatility ?? null,
        trend: def?.trend ?? null,
        history: Array.isArray(s.history) ? s.history : [],
        sectorPeers: peers,
        updatedAt: s.updated_at,
      });
    }

    // ── GET /api/v1/getSectors ───────────────────────────────────────────────
    if (path === "/api/v1/getSectors") {
      const [{ data: secRows }, { data: stockRows }] = await Promise.all([
        supabase.from("sector_state").select("*"),
        supabase.from("stocks_state").select("ticker,sector,price,prev_price"),
      ]);

      const result: Record<string, unknown> = {};
      for (const key of Object.keys(SECTOR_META)) {
        const meta = SECTOR_META[key];
        const secRow = (secRows || []).find((r: any) => r.sector_key === key);
        const tickers = Object.keys(STOCK_DEFS).filter(t => STOCK_DEFS[t].sector === key);
        let totalChange = 0, cnt = 0;
        for (const t of tickers) {
          const s = (stockRows || []).find((r: any) => r.ticker === t);
          if (s && s.prev_price > 0) { totalChange += (s.price - s.prev_price) / s.prev_price * 100; cnt++; }
        }
        result[key] = {
          label: meta.label,
          icon: meta.icon,
          avgChange: cnt > 0 ? +(totalChange / cnt).toFixed(2) : 0,
          newsStack: secRow ? +secRow.news_stack : 0,
          momentum: secRow ? +secRow.trend : 0,
          tickers,
          tickerCount: tickers.length,
        };
      }
      return json(result);
    }

    // ── GET /api/v1/getSector?sector=tech ────────────────────────────────────
    if (path === "/api/v1/getSector") {
      const sectorKey = (url.searchParams.get("sector") || "").toLowerCase();
      if (!sectorKey) return json({ error: "Missing ?sector= parameter" }, 400);
      const meta = SECTOR_META[sectorKey];
      if (!meta) return json({ error: `Unknown sector: ${sectorKey}. Valid: ${Object.keys(SECTOR_META).join(", ")}` }, 404);

      const tickers = Object.keys(STOCK_DEFS).filter(t => STOCK_DEFS[t].sector === sectorKey);
      const [{ data: secRow }, { data: stockRows }] = await Promise.all([
        supabase.from("sector_state").select("*").eq("sector_key", sectorKey).maybeSingle(),
        supabase.from("stocks_state").select("ticker,name,price,prev_price,volume,rsi,hi52w,lo52w,streak").in("ticker", tickers),
      ]);

      let totalChange = 0, cnt = 0;
      const stockList: unknown[] = [];
      for (const s of (stockRows || [])) {
        const pct = s.prev_price > 0 ? (s.price - s.prev_price) / s.prev_price * 100 : 0;
        totalChange += pct; cnt++;
        stockList.push({ ticker: s.ticker, name: s.name, price: +s.price, change: +pct.toFixed(2), volume: s.volume, rsi: +s.rsi });
      }

      return json({
        key: sectorKey,
        label: meta.label,
        icon: meta.icon,
        avgChange: cnt > 0 ? +(totalChange / cnt).toFixed(2) : 0,
        newsStack: secRow ? +secRow.news_stack : 0,
        momentum: secRow ? +secRow.trend : 0,
        stocks: stockList,
        updatedAt: secRow?.updated_at ?? null,
      });
    }

    // ── GET /api/v1/getEvents ────────────────────────────────────────────────
    if (path === "/api/v1/getEvents") {
      const limitParam = Math.min(parseInt(url.searchParams.get("limit") || "10"), 30);
      const sector = url.searchParams.get("sector");
      let q = supabase.from("events_log").select("*").order("fired_at", { ascending: false }).limit(limitParam);
      if (sector) q = q.eq("sector", sector.toLowerCase());
      const { data } = await q;
      return json((data || []).map((e: any) => ({
        id: e.id,
        text: e.event_text,
        effect: +e.effect,
        sector: e.sector ?? null,
        weight: e.weight,
        firedAt: e.fired_at,
      })));
    }

    // ── GET /api/v1/getTopMovers ─────────────────────────────────────────────
    if (path === "/api/v1/getTopMovers") {
      const limitParam = Math.min(parseInt(url.searchParams.get("limit") || "5"), 20);
      const { data: stocks } = await supabase.from("stocks_state")
        .select("ticker,name,sector,price,prev_price,volume,rsi");

      const withChange = (stocks || []).map((s: any) => ({
        ticker: s.ticker,
        name: s.name,
        sector: s.sector,
        price: +s.price,
        change: s.prev_price > 0 ? +((s.price - s.prev_price) / s.prev_price * 100).toFixed(2) : 0,
        volume: s.volume,
        rsi: +s.rsi,
      })).sort((a: any, b: any) => b.change - a.change);

      return json({
        gainers: withChange.slice(0, limitParam),
        losers: withChange.slice(-limitParam).reverse(),
      });
    }

    // ── GET /api/v1/getLeaderboard ───────────────────────────────────────────
    if (path === "/api/v1/getLeaderboard") {
      const by = url.searchParams.get("by") || "change";
      const limitParam = Math.min(parseInt(url.searchParams.get("limit") || "10"), 60);
      const dir = url.searchParams.get("dir") === "asc" ? true : false;

      const { data: stocks } = await supabase.from("stocks_state")
        .select("ticker,name,sector,mcap,price,prev_price,volume,rsi,ath,streak");

      const mapped = (stocks || []).map((s: any) => ({
        ticker: s.ticker,
        name: s.name,
        sector: s.sector,
        mcap: s.mcap,
        price: +s.price,
        change: s.prev_price > 0 ? +((s.price - s.prev_price) / s.prev_price * 100).toFixed(2) : 0,
        volume: s.volume,
        rsi: +s.rsi,
        ath: +s.ath,
        streak: s.streak,
      }));

      const sortKey = ["change", "price", "volume", "rsi", "ath", "streak"].includes(by) ? by : "change";
      mapped.sort((a: any, b: any) => dir ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]);

      return json({
        sortedBy: sortKey,
        direction: dir ? "asc" : "desc",
        count: limitParam,
        stocks: mapped.slice(0, limitParam),
      });
    }

    // ── GET /api/v1/getMacro ────────────────────────────────────────────────
    if (path === "/api/v1/getMacro") {
      const { data: ms } = await supabase.from("market_state").select("*").eq("id", 1).maybeSingle();
      if (!ms) return json({ error: "Simulation not yet initialised." }, 503);
      return json({
        interestRate: +ms.interest_rate,
        inflation: +ms.inflation,
        gdpGrowth: +ms.gdp_growth,
        fearGreed: Math.round(ms.fear_greed),
        fearGreedLabel: fgLabel(ms.fear_greed),
        crashCooldown: ms.crash_cooldown,
        boomCooldown: ms.boom_cooldown,
        updatedAt: ms.updated_at,
      });
    }

    // ── GET /api/v1/getHistory?ticker=APEX&limit=100 ─────────────────────────
    if (path === "/api/v1/getHistory") {
      const ticker = (url.searchParams.get("ticker") || "").toUpperCase();
      if (!ticker) return json({ error: "Missing ?ticker= parameter" }, 400);
      const limitParam = Math.min(parseInt(url.searchParams.get("limit") || "100"), 400);

      const { data: s } = await supabase.from("stocks_state")
        .select("ticker,name,history,updated_at").eq("ticker", ticker).maybeSingle();
      if (!s) return json({ error: `Ticker not found: ${ticker}` }, 404);

      const history = Array.isArray(s.history) ? s.history.slice(-limitParam) : [];
      return json({ ticker: s.ticker, name: s.name, count: history.length, history, updatedAt: s.updated_at });
    }

    // ── GET /api/v1/getHealth ────────────────────────────────────────────────
    if (path === "/api/v1/getHealth") {
      const { data: ms } = await supabase.from("market_state").select("tick_count,updated_at").eq("id", 1).maybeSingle();
      const secsAgo = ms ? Math.floor((Date.now() - new Date(ms.updated_at).getTime()) / 1000) : null;
      return json({
        status: ms ? "ok" : "uninitialised",
        tickCount: ms?.tick_count ?? 0,
        secondsSinceLastTick: secsAgo,
        stale: secsAgo !== null ? secsAgo > 30 : true,
        totalStocks: Object.keys(STOCK_DEFS).length,
        totalSectors: Object.keys(SECTOR_META).length,
        updatedAt: ms?.updated_at ?? null,
      });
    }

    // ── GET /api/v1/search?q=apex ────────────────────────────────────────────
    if (path === "/api/v1/search") {
      const q = (url.searchParams.get("q") || "").toLowerCase().trim();
      if (!q) return json({ error: "Missing ?q= parameter" }, 400);

      const { data: stocks } = await supabase.from("stocks_state")
        .select("ticker,name,sector,price,prev_price").order("ticker");

      const results = (stocks || [])
        .filter((s: any) =>
          s.ticker.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.sector.toLowerCase().includes(q)
        )
        .map((s: any) => ({
          ticker: s.ticker,
          name: s.name,
          sector: s.sector,
          price: +s.price,
          change: s.prev_price > 0 ? +((s.price - s.prev_price) / s.prev_price * 100).toFixed(2) : 0,
        }));

      return json({ query: q, count: results.length, results });
    }

    return json({ error: "Not found", validRoutes: [
      "/api/v1/getMarket",
      "/api/v1/getStocks",
      "/api/v1/getStock?ticker=APEX",
      "/api/v1/getSectors",
      "/api/v1/getSector?sector=tech",
      "/api/v1/getEvents",
      "/api/v1/getTopMovers",
      "/api/v1/getLeaderboard",
      "/api/v1/getMacro",
      "/api/v1/getHistory?ticker=APEX",
      "/api/v1/getHealth",
      "/api/v1/search?q=apex",
    ]}, 404);

  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
