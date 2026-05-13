import { useState } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Search, TrendingUp, Code as Code2, Bot,
  ChartBar as BarChart2, BookOpen, Layers,
  GraduationCap, Wrench, ArrowRight,
  TriangleAlert as AlertTriangle,
} from "lucide-react"

type Route = "home" | "market" | "api" | "terms" | "privacy" | "education" | "changelog" | "products" | "help"

interface Props {
  onNavigate: (r: Route) => void
}

// ── Articles ───────────────────────────────────────────────────────────────────

type Article = { category: string; q: string; a: React.ReactNode; search: string }

const ARTICLES: Article[] = [

  // ── Getting Started ────────────────────────────────────────────────────────
  {
    category: "Getting Started",
    q: "What is Polymart?",
    a: "Polymart is a persistent simulated stock exchange. A continuous price engine drives 132 fictional tickers across 20 sectors, updating every 5 seconds. Everything — companies, prices, events — is entirely fictional. It exists for learning, building, and experimenting with market mechanics without any real financial risk.",
    search: "what is polymart intro overview",
  },
  {
    category: "Getting Started",
    q: "Is Polymart free to use?",
    a: "Yes. The website, live market view, and full REST API are completely free with no account required.",
    search: "free cost price paid subscription",
  },
  {
    category: "Getting Started",
    q: "Do I need to create an account?",
    a: "No. You can browse the market, view charts, and call every API endpoint without signing up or logging in.",
    search: "account login sign up register",
  },
  {
    category: "Getting Started",
    q: "Is any of this real financial data?",
    a: "No. Every ticker, company name, price, and market event is entirely fictional. Polymart is a simulation only. Nothing on this platform constitutes financial advice or reflects real market conditions.",
    search: "real data financial advice stocks",
  },
  {
    category: "Getting Started",
    q: "What can I build with Polymart?",
    a: "Common use cases include: Discord bots that post live prices and leaderboards, custom trading dashboards and screeners, algorithmic trading experiments and backtests, machine learning datasets, university projects, and classroom demonstrations of market mechanics.",
    search: "build create project ideas use cases",
  },
  {
    category: "Getting Started",
    q: "How do I get started with the API?",
    a: (
      <span>
        Make a GET request to{" "}
        <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-[11px] font-mono">https://polymart.co/api/v1/getStocks</code>.
        No authentication needed. The full documentation is on the API Docs page.
      </span>
    ),
    search: "get started api first request",
  },
  {
    category: "Getting Started",
    q: "Is Polymart suitable for a school or university project?",
    a: "Yes, it's designed for exactly this. You get a live, consistent data feed without needing to scrape real markets or pay for data. It's been used in algo trading courses, finance classes, and CS capstone projects.",
    search: "school university course class student",
  },
  {
    category: "Getting Started",
    q: "Does the simulation ever reset?",
    a: "No. The simulation runs continuously and persists indefinitely. Prices, streaks, 52-week highs, and tick counts are maintained without resets. Only the events log is pruned after 24 hours to keep storage clean.",
    search: "reset restart persist continuous",
  },
  {
    category: "Getting Started",
    q: "What browsers does Polymart support?",
    a: "Any modern browser: Chrome, Firefox, Safari, and Edge are all supported. The site is fully responsive and works on mobile, though the detailed chart view is best on desktop.",
    search: "browser chrome firefox safari mobile",
  },
  {
    category: "Getting Started",
    q: "How do I follow Polymart updates?",
    a: "Check the Changelog page for a full list of releases. The Discord server gets announcements first.",
    search: "updates news changelog follow release",
  },
  {
    category: "Getting Started",
    q: "Where can I report a bug or suggest a feature?",
    a: "The best places are the GitHub issues page or the Discord server. Both are checked regularly.",
    search: "bug report issue feedback suggestion",
  },
  {
    category: "Getting Started",
    q: "Does Polymart have a mobile app?",
    a: "No native app. The website is fully responsive and works well on mobile browsers, but there is no App Store or Play Store listing.",
    search: "mobile app ios android",
  },

  // ── The Market ─────────────────────────────────────────────────────────────
  {
    category: "The Market",
    q: "How does the price simulation work?",
    a: "Each tick applies a combination of: base volatility (each stock has its own profile), momentum carry-over from previous ticks, RSI mean-reversion pressure (overbought stocks face downward bias), order flow imbalance from buy vs. sell volume, macro sensitivity (sectors respond differently to interest rates and inflation), and random market events like earnings surprises, sector shocks, and analyst upgrades.",
    search: "simulation price engine how works algorithm",
  },
  {
    category: "The Market",
    q: "How often do prices update?",
    a: "The simulation ticks every 5 seconds. The market page polls for fresh data on the same interval and updates charts, prices, and indicators in real time.",
    search: "update frequency interval tick refresh",
  },
  {
    category: "The Market",
    q: "What sectors are covered?",
    a: "Twenty sectors: Technology, AI & Machine Learning, Biotech, Crypto, Space & Defence, Meme Stocks, Energy, Automotive, Real Estate, Travel & Leisure, Logistics, Agriculture, Healthcare, Finance, Gaming, Green Energy, Consumer Goods, Media, Industrials, and Telecommunications.",
    search: "sectors list categories industries",
  },
  {
    category: "The Market",
    q: "What is the Fear & Greed index?",
    a: "A synthetic sentiment score between 0 (extreme fear) and 100 (extreme greed). It is derived from market-wide momentum, breadth, and volatility. A high score pushes prices upward across all stocks; a low score adds downward pressure. It is displayed on the main market view and returned by the /getMarket endpoint.",
    search: "fear greed sentiment score index",
  },
  {
    category: "The Market",
    q: "What are macro variables and how do they affect stocks?",
    a: "Three macro variables drift slowly over time: interest rate, inflation, and GDP growth. Different sectors are sensitive to them in different ways. Green Energy underperforms when interest rates rise (capital-intensive businesses). Finance tends to benefit from higher rates. Consumer Goods are more sensitive to inflation. The variables are applied as multipliers on each sector's tick calculation.",
    search: "macro interest rate inflation gdp variables economy",
  },
  {
    category: "The Market",
    q: "What is the Market Composite Index?",
    a: "A market-cap-weighted average of all 132 tickers. It gives a single number summarising overall market direction, similar in concept to a broad index like the S&P 500 or FTSE All-World.",
    search: "index composite market cap weighted average",
  },
  {
    category: "The Market",
    q: "How do I read the candlestick chart?",
    a: "Each candle covers a fixed tick period. The body spans from open to close (green = close higher than open, red = lower). The wicks show the high and low for that period. Toggle between line view and candle view using the chart header button. Bollinger Bands, VWAP, and SMA lines can also be overlaid.",
    search: "candlestick chart ohlc candle line read",
  },
  {
    category: "The Market",
    q: "What does the streak counter mean?",
    a: "The streak is the number of consecutive ticks a stock has moved in the same direction. A streak of +6 means the price has closed higher than the previous tick six times in a row. Long streaks feed into RSI and can affect price pressure on the following ticks.",
    search: "streak consecutive ticks direction",
  },
  {
    category: "The Market",
    q: "What is order flow imbalance?",
    a: "Each tick records buy volume and sell volume separately. Order flow imbalance is the ratio of (buy − sell) / (buy + sell). A strongly positive value means more buy-side activity, which adds upward pressure to the next tick's price.",
    search: "order flow buy sell volume imbalance",
  },
  {
    category: "The Market",
    q: "What causes a stock to be halted?",
    a: "A circuit breaker triggers automatically when a stock's price moves beyond a set threshold in a single tick. The halt lasts for a few ticks to allow the simulation to stabilise. Halted stocks are flagged in the market table and via the API.",
    search: "halted halt circuit breaker suspend",
  },
  {
    category: "The Market",
    q: "What is insider bias?",
    a: "A hidden per-stock directional pressure, not visible in the UI, that influences price over multiple ticks. It's exposed in the /getStock API response as insiderBias. Values range from roughly -0.01 to 0.01 and decay over time.",
    search: "insider bias hidden pressure api field",
  },
  {
    category: "The Market",
    q: "How are 52-week highs and lows tracked?",
    a: "They are maintained as running extremes across the entire life of the simulation — not a rolling calendar year. As prices update every tick, the 52-week high and low update whenever the current price sets a new extreme.",
    search: "52 week high low range extreme",
  },
  {
    category: "The Market",
    q: "What is ATH (All-Time High)?",
    a: "The all-time simulated high price since the simulation started. Unlike the 52-week high, this never resets. It is shown on the stock detail view and returned by the API as allTimeHigh.",
    search: "all time high ath price record",
  },
  {
    category: "The Market",
    q: "Why do stocks in the same sector move together?",
    a: "Each sector has a shared momentum value and a news impact stack. Market events that affect a sector apply pressure to every stock in it simultaneously. Sector-wide momentum carries over between ticks, causing correlated movement.",
    search: "sector correlation move together correlated",
  },
  {
    category: "The Market",
    q: "What market events can occur?",
    a: "Events fire randomly with varying probability depending on market session. Examples include: earnings beats and misses, analyst upgrades and downgrades, FDA approvals for biotech, geopolitical tension affecting defence stocks, meme frenzies, sector booms and flash crashes. Recent events are shown in the events ticker on the market page.",
    search: "events crash boom earnings analyst upgrade",
  },

  // ── API ────────────────────────────────────────────────────────────────────
  {
    category: "API",
    q: "Where do I find the API documentation?",
    a: "The full reference is on the API Docs page, accessible from the main navigation. It covers every endpoint, all parameters, and example responses.",
    search: "documentation docs reference api",
  },
  {
    category: "API",
    q: "Do I need an API key?",
    a: "No. All current endpoints are completely open. Make GET requests from any HTTP client without headers or authentication.",
    search: "api key auth token authentication",
  },
  {
    category: "API",
    q: "What is the base URL?",
    a: (
      <span>
        <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-[11px] font-mono">
          https://polymart.co/api/v1/
        </code>
        . All endpoints are GET requests and return JSON.
      </span>
    ),
    search: "base url endpoint root host",
  },
  {
    category: "API",
    q: "What endpoints are available?",
    a: (
      <ul className="space-y-1.5 mt-1">
        {[
          ["/getMarket", "Global market snapshot, Fear & Greed, macro variables"],
          ["/getStocks", "All 132 tickers with key fields"],
          ["/getStock?ticker=APEX", "Full detail for a single stock"],
          ["/getSectors", "All 20 sectors with aggregate data"],
          ["/getSector?sector=tech", "Single sector with constituent stocks"],
          ["/getEvents", "Recent market events log"],
          ["/getTopMovers", "Top gainers and losers"],
          ["/getLeaderboard", "All stocks ranked by any field"],
          ["/getHistory?ticker=APEX", "Price history for a stock"],
          ["/getMacro", "Macro variables only"],
          ["/getHealth", "Simulation status and staleness check"],
          ["/search?q=moon", "Full-text search across tickers, names, sectors"],
          ["/info?ticker=APEX", "Company profile, analyst rating, news"],
          ["/sims", "Available simulation types and their status"],
        ].map(([ep, desc]) => (
          <li key={ep} className="flex items-start gap-2 flex-wrap">
            <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0">{ep}</code>
            <span className="text-xs text-muted-foreground">{desc}</span>
          </li>
        ))}
      </ul>
    ),
    search: "endpoints list all api routes",
  },
  {
    category: "API",
    q: "Is there a rate limit?",
    a: "Yes — a sliding window of 60 tokens per minute per IP. Lightweight endpoints cost 1 token per call. The /getStocks and /getHistory endpoints cost 3 tokens due to payload size. For typical use (polling every 5 seconds) the limit is never reached. Exceeding it returns HTTP 429.",
    search: "rate limit 429 too many requests throttle",
  },
  {
    category: "API",
    q: "Can I call the API from a browser?",
    a: "Yes. The API sends permissive CORS headers. You can call it directly from client-side JavaScript using fetch() or any HTTP library without a proxy.",
    search: "cors browser fetch client side javascript",
  },
  {
    category: "API",
    q: "How do I get full data for a single stock?",
    a: (
      <span>
        Use{" "}
        <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-[11px] font-mono">GET /api/v1/getStock?ticker=APEX</code>.
        This returns the complete data object including all indicators, order flow, candle data, and sector peers.
      </span>
    ),
    search: "single stock detail full data ticker",
  },
  {
    category: "API",
    q: "How do I get price history?",
    a: (
      <span>
        Use{" "}
        <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-[11px] font-mono">GET /api/v1/getHistory?ticker=APEX&limit=100</code>.
        Returns up to 400 data points, oldest first. Each point is a price at that tick.
      </span>
    ),
    search: "history price historical data points",
  },
  {
    category: "API",
    q: "How do I filter stocks by sector?",
    a: (
      <span>
        Pass a{" "}
        <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-[11px] font-mono">sector</code>{" "}
        query param to{" "}
        <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-[11px] font-mono">/getStocks</code>:
        for example{" "}
        <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-[11px] font-mono">/api/v1/getStocks?sector=tech</code>.
      </span>
    ),
    search: "filter sector query param stocks",
  },
  {
    category: "API",
    q: "What does /getHealth return?",
    a: "It returns the simulation's live status: whether it is running, the total tick count, how many seconds since the last tick, and a stale flag (true if the last tick was more than 30 seconds ago). Use this in your bot or dashboard to detect if the simulation engine is down.",
    search: "health status stale running check uptime",
  },
  {
    category: "API",
    q: "How does the leaderboard endpoint work?",
    a: (
      <span>
        <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-[11px] font-mono">GET /api/v1/getLeaderboard?by=change&dir=desc&limit=10</code>.
        Sort by any numeric field: change, price, volume, rsi, ath, streak, atr, or beta. Returns up to 132 stocks.
      </span>
    ),
    search: "leaderboard rank sort top bottom",
  },
  {
    category: "API",
    q: "How do I search for a stock by name?",
    a: (
      <span>
        Use{" "}
        <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-[11px] font-mono">GET /api/v1/search?q=moon</code>.
        It searches across ticker symbols, company names, and sector keys. Returns matching stocks with current prices.
      </span>
    ),
    search: "search find ticker name query",
  },
  {
    category: "API",
    q: "What does the /info endpoint return?",
    a: "Company profile data (name, description, founded year, HQ, CEO, employees, exchange), a live market snapshot, an analyst consensus rating derived from RSI and price trend, and 3–5 dynamically generated news items. It powers the company info pages at /market/{ticker}/info.",
    search: "info company profile analyst news",
  },
  {
    category: "API",
    q: "What is the /sims endpoint?",
    a: "It returns the list of all simulation types (stocks, crypto, forex) with their live status, description, and metadata like asset count and tick interval. Use it to check which simulations are available before building an integration.",
    search: "sims simulations available types list",
  },
  {
    category: "API",
    q: "What does the API response format look like?",
    a: "All responses are JSON. Prices and percentages are returned as numbers (not strings). Timestamps are ISO 8601. Errors return { error: 'message' } with an appropriate HTTP status code.",
    search: "response format json shape types",
  },
  {
    category: "API",
    q: "Can I self-host Polymart?",
    a: "The simulation engine is not open-source, but the public API is available to anyone. If you want a local copy for experiments, the data can be pulled from the hosted API and stored in your own database.",
    search: "self host local run own server",
  },

  // ── Discord ────────────────────────────────────────────────────────────────
  {
    category: "Discord",
    q: "How do I add the Polymart bot to my server?",
    a: "Click 'Add to Discord' in the top-right of the navigation. This opens Discord's standard bot authorisation flow. Select your server and click Authorise. No further configuration is needed.",
    search: "add bot discord server invite authorise",
  },
  {
    category: "Discord",
    q: "What commands does the bot support?",
    a: (
      <ul className="space-y-1.5 mt-1">
        {[
          ["/price [ticker]", "Current price, % change, RSI, and trend direction"],
          ["/stock [ticker]", "Full detail card with all key indicators"],
          ["/market", "Top movers, sector performance, and Fear & Greed"],
          ["/index", "Composite market index current value"],
          ["/sector [name]", "Sector summary with top performers"],
          ["/leaderboard", "Top gainers and losers right now"],
          ["/search [query]", "Find a stock by name or keyword"],
        ].map(([cmd, desc]) => (
          <li key={cmd} className="flex items-start gap-2 flex-wrap">
            <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0">{cmd}</code>
            <span className="text-xs text-muted-foreground">{desc}</span>
          </li>
        ))}
      </ul>
    ),
    search: "commands slash price stock market sector",
  },
  {
    category: "Discord",
    q: "What permissions does the bot need?",
    a: "The bot needs permission to send messages and embed links in the channels where it is used. It does not need administrator access, the ability to read message history beyond its own responses, or any sensitive permissions.",
    search: "permissions admin roles channels bot",
  },
  {
    category: "Discord",
    q: "Can I restrict the bot to certain channels?",
    a: "Yes. Use Discord's built-in channel permission overrides to prevent the bot from sending messages or being used in specific channels. The bot itself has no per-channel configuration.",
    search: "restrict channel permissions disable",
  },
  {
    category: "Discord",
    q: "The bot isn't responding — what do I do?",
    a: "First check the bot is still in your server (Server Settings → Integrations). Then try /price APEX as a test — this command always works if the bot is online. If there is no response, the bot may be restarting; try again in a minute.",
    search: "bot not responding offline down broken",
  },
  {
    category: "Discord",
    q: "Can I use the bot in DMs?",
    a: "No. Slash commands are only available in servers. If you want direct market queries without a server, use the REST API directly.",
    search: "dm direct message private bot",
  },
  {
    category: "Discord",
    q: "How fresh is the bot's data?",
    a: "Each command makes a live request to the API, so responses are as fresh as the last simulation tick — typically within 5 seconds. There is no caching layer in the bot.",
    search: "fresh data latency delay cache bot",
  },
  {
    category: "Discord",
    q: "Is there an official Telegram or Slack bot?",
    a: "Not officially. Community members have built Telegram bots using the public API. Check the Discord server's #projects channel for community-built integrations.",
    search: "telegram slack other platform bot community",
  },

  // ── Technical Indicators ───────────────────────────────────────────────────
  {
    category: "Indicators",
    q: "What is RSI and how does it work here?",
    a: "RSI (Relative Strength Index) measures price momentum on a 0–100 scale. Readings above 70 signal a stock is potentially overbought; below 30 signals potentially oversold. In Polymart's simulation, RSI feeds back into price movement — an overbought stock accumulates incremental downward bias each tick, and an oversold stock gains upward bias.",
    search: "rsi relative strength index overbought oversold",
  },
  {
    category: "Indicators",
    q: "What are Bollinger Bands?",
    a: "Bollinger Bands plot a 20-period simple moving average (the middle band) with upper and lower bands set 2 standard deviations away. When price touches the upper band, the stock may be extended. Touching the lower band may signal oversold conditions. The gap between the bands (bandwidth) reflects current volatility — a squeeze often precedes a breakout.",
    search: "bollinger bands upper lower middle squeeze bandwidth",
  },
  {
    category: "Indicators",
    q: "What is MACD?",
    a: "MACD (Moving Average Convergence/Divergence) is the difference between the 12-period EMA and the 26-period EMA. The signal line is a 9-period EMA of MACD itself. The histogram shows the gap between MACD and the signal line. A MACD line crossing above the signal line is typically a bullish sign; crossing below is bearish.",
    search: "macd moving average convergence divergence histogram signal",
  },
  {
    category: "Indicators",
    q: "What does ATR measure?",
    a: "ATR (Average True Range) measures volatility — specifically the average of the high-low range over the last 14 periods. A rising ATR means the market is becoming more volatile. A falling ATR signals calmer, more range-bound conditions. It is useful for setting stop-loss distances.",
    search: "atr average true range volatility range",
  },
  {
    category: "Indicators",
    q: "What is VWAP?",
    a: "VWAP (Volume-Weighted Average Price) is the average price weighted by volume across the session. A price above VWAP suggests the stock is trading at a premium to its volume-weighted average; below suggests a discount. It is a common benchmark for algorithmic order execution.",
    search: "vwap volume weighted average price session",
  },
  {
    category: "Indicators",
    q: "What is SMA 20 vs SMA 50?",
    a: "Both are simple moving averages calculated by averaging the last N closing prices. SMA 20 responds faster to recent price action. SMA 50 is slower and better represents the medium-term trend. A price above both averages is generally considered bullish alignment.",
    search: "sma 20 50 simple moving average",
  },
  {
    category: "Indicators",
    q: "What is EMA and how does it differ from SMA?",
    a: "EMA (Exponential Moving Average) applies a heavier weight to more recent prices, making it more responsive than a simple moving average of the same period. Polymart tracks EMA 12 and EMA 26, which are the inputs for MACD.",
    search: "ema exponential moving average weighted",
  },
  {
    category: "Indicators",
    q: "What does Beta mean?",
    a: "Beta measures how much a stock tends to move relative to the overall market. A beta of 1.5 means the stock has historically moved 50% more than the market index in either direction. High-beta stocks amplify both gains and losses. Meme stocks typically have high betas; utilities tend to be low.",
    search: "beta market sensitivity volatility correlation",
  },
  {
    category: "Indicators",
    q: "What is BB Bandwidth (BBW)?",
    a: "BB Bandwidth is (Upper Band − Lower Band) / Middle Band. It quantifies how compressed or expanded the Bollinger Bands are at any moment. A very low BBW value (squeeze) often precedes a sharp move in either direction. It is exposed in the API as bbBw.",
    search: "bb bandwidth squeeze bbw bollinger",
  },
  {
    category: "Indicators",
    q: "What is the momentum field?",
    a: "Momentum is the rate of price change — specifically a weighted average of recent per-tick returns. It is separate from RSI and decays over time. A strong positive momentum means the stock has been accelerating upward across recent ticks.",
    search: "momentum rate of change price acceleration",
  },
  {
    category: "Indicators",
    q: "What is the spread?",
    a: "Each stock has a bid and ask price forming a spread. The spread percentage (spreadPct) is (ask − bid) / mid-price × 100. Smaller, more liquid stocks tend to have tighter spreads. The spread reflects simulated market liquidity.",
    search: "spread bid ask liquidity",
  },
  {
    category: "Indicators",
    q: "Are indicators calculated from real formulas?",
    a: "Yes. RSI, MACD, Bollinger Bands, EMA, SMA, ATR, and VWAP all use their standard textbook formulas, applied to the simulated price and volume data. The inputs are synthetic, but the math is the same as in a real terminal.",
    search: "formula calculation standard indicator math",
  },

  // ── Education & Research ───────────────────────────────────────────────────
  {
    category: "Education",
    q: "Can I use Polymart for a university project?",
    a: "Yes. When citing: use \"Polymart simulated market data, polymart.co\" and note that all data is synthetic. Many students use it for algorithmic trading capstones, finance data science projects, and ML experiments.",
    search: "university project cite reference academic",
  },
  {
    category: "Education",
    q: "How do I export data for machine learning?",
    a: (
      <span>
        Use{" "}
        <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-[11px] font-mono">/getStocks</code>{" "}
        for a snapshot of all 132 tickers, or loop{" "}
        <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-[11px] font-mono">/getHistory?ticker=X</code>{" "}
        for per-ticker time series. Collect periodically and store in your own database for a richer dataset.
      </span>
    ),
    search: "machine learning export data csv dataset ml",
  },
  {
    category: "Education",
    q: "Is Polymart good for teaching algorithmic trading?",
    a: "Yes. Students can build and test strategies against a live feed without any financial risk or the need to paper-trade on a real brokerage platform. The API is intentionally simple, and the simulation includes realistic mechanics like RSI feedback, macro variables, and market events.",
    search: "algo algorithmic trading teach learn strategy",
  },
  {
    category: "Education",
    q: "Can I use it as a backtesting data source?",
    a: "The simulation provides up to 400 ticks of price history per stock via /getHistory, which is good for short-term strategy testing. For longer backtests you would need to collect and store data over time yourself, since the history window is a rolling buffer.",
    search: "backtest historical data strategy test",
  },
  {
    category: "Education",
    q: "How should I cite Polymart in academic work?",
    a: "Suggested citation: Polymart (polymart.co). Synthetic simulated market data. Accessed [date]. Be sure to clarify in your methodology section that all data is generated by a deterministic simulation engine and not sourced from real exchanges.",
    search: "cite citation reference academic paper",
  },
  {
    category: "Education",
    q: "Can I get bulk historical data for all tickers at once?",
    a: (
      <span>
        Not in a single request. Use a loop over all tickers calling{" "}
        <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-[11px] font-mono">/getHistory?ticker=X&limit=400</code>.
        Be mindful of the rate limit — space requests out or run during off-peak hours.
      </span>
    ),
    search: "bulk historical all tickers export loop",
  },
  {
    category: "Education",
    q: "How does Polymart compare to real market data?",
    a: "Qualitatively similar dynamics: RSI, MACD, sector correlation, macro sensitivity, and volatility clustering all behave realistically. Key differences: no real earnings calendars, no actual news events, no dividends, and prices are wholly synthetic. It's ideal for learning indicator mechanics and strategy logic, but not for validating real-world trading approaches.",
    search: "real market comparison difference similar",
  },
  {
    category: "Education",
    q: "Are there lesson plans or course materials available?",
    a: "Check the Education page for resources about using Polymart in the classroom. Community-submitted lesson plans may also be available on the Community page once it launches.",
    search: "lesson plan course material classroom curriculum",
  },

  // ── Troubleshooting ────────────────────────────────────────────────────────
  {
    category: "Troubleshooting",
    q: "The market page isn't loading — what do I do?",
    a: "Try a hard refresh (Ctrl+Shift+R or Cmd+Shift+R). If that doesn't help, open the browser console and check for network errors. The page connects to the API on load; if the API is unreachable, it will show a loading spinner indefinitely.",
    search: "loading spinner not loading page broken",
  },
  {
    category: "Troubleshooting",
    q: "Why does the API sometimes return stale data?",
    a: (
      <span>
        Call{" "}
        <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-[11px] font-mono">/api/v1/getHealth</code>{" "}
        and check the{" "}
        <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-[11px] font-mono">secondsSinceLastTick</code>{" "}
        and{" "}
        <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-[11px] font-mono">stale</code>{" "}
        fields. If stale is true, the simulation engine is likely restarting. It typically recovers within 30 seconds.
      </span>
    ),
    search: "stale data old delay not updating",
  },
  {
    category: "Troubleshooting",
    q: "My chart isn't updating — why?",
    a: "The chart polls every 5 seconds. If it stops updating, check your network tab in the browser dev tools for failed requests. If requests are succeeding but the chart is frozen, try navigating away and back.",
    search: "chart frozen not updating refresh stuck",
  },
  {
    category: "Troubleshooting",
    q: "I'm getting 429 Too Many Requests from the API",
    a: "You've exceeded 60 tokens per minute. Slow down your request rate. If you're polling /getStocks every second, note that it costs 3 tokens per call — you'd hit the limit in 20 seconds. Poll every 5–10 seconds instead.",
    search: "429 rate limit too many requests throttle",
  },
  {
    category: "Troubleshooting",
    q: "Why is a stock halted?",
    a: "A circuit breaker fires when price movement in a single tick exceeds a safety threshold. The stock is flagged as halted for a few ticks to let the simulation stabilise. It resumes automatically — no manual intervention needed.",
    search: "halted halt stock circuit breaker resume",
  },
  {
    category: "Troubleshooting",
    q: "The simulation seems paused — is it down?",
    a: (
      <span>
        Call{" "}
        <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-[11px] font-mono">/api/v1/getHealth</code>.
        If stale is true and secondsSinceLastTick is large, the engine is likely restarting. This is usually self-healing within a minute. If it persists, report it in Discord.
      </span>
    ),
    search: "paused down offline health engine restart",
  },
  {
    category: "Troubleshooting",
    q: "Prices seem unrealistically extreme — is that normal?",
    a: "Occasionally. The simulation can experience flash crashes or booms triggered by event cascades — multiple high-impact events firing close together. Check the events ticker on the market page. Prices typically mean-revert within a few minutes.",
    search: "extreme price crash boom unrealistic event",
  },
  {
    category: "Troubleshooting",
    q: "I'm getting CORS errors when calling the API",
    a: "Ensure you are calling https://polymart.co/api/v1/ and not a different origin. If you are running a proxy or have misconfigured the base URL, the CORS headers won't apply. Requests from localhost to polymart.co should work without issues.",
    search: "cors error cross origin headers localhost",
  },
  {
    category: "Troubleshooting",
    q: "My Discord bot is getting stale prices",
    a: "Make sure each command triggers a fresh API request rather than returning a cached response. If you are caching the result of /getStocks across commands, the data will go stale. Fetch per-command or refresh your cache on a 5-second interval.",
    search: "bot stale cache discord price old",
  },
]

// ── Category config ────────────────────────────────────────────────────────────

const CATS: { id: string; icon: React.ElementType; desc: string }[] = [
  { id: "Getting Started", icon: BookOpen,     desc: "New to Polymart?" },
  { id: "The Market",      icon: TrendingUp,   desc: "Simulation mechanics" },
  { id: "API",             icon: Code2,        desc: "Endpoints & integration" },
  { id: "Discord",         icon: Bot,          desc: "Bot setup & commands" },
  { id: "Indicators",      icon: BarChart2,    desc: "RSI, MACD, Bands & more" },
  { id: "Education",       icon: GraduationCap, desc: "Research & coursework" },
  { id: "Troubleshooting", icon: Wrench,       desc: "Fixes & common errors" },
]

// ── Main page ──────────────────────────────────────────────────────────────────

export default function HelpCenterPage({ onNavigate }: Props) {
  const [query, setQuery] = useState("")

  const q = query.trim().toLowerCase()
  const filtered = q
    ? ARTICLES.filter(a =>
        a.q.toLowerCase().includes(q) ||
        a.search.includes(q) ||
        (typeof a.a === "string" && a.a.toLowerCase().includes(q))
      )
    : ARTICLES

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })

  return (
    <div className="max-w-[860px] mx-auto px-4 sm:px-8 py-12 sm:py-20">

      {/* ── Hero + search ── */}
      <div className="text-center mb-12">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">Help Center</p>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4">
          How can we help?
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          {ARTICLES.length} articles across {CATS.length} categories
        </p>

        {/* Big search bar */}
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search articles..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="h-14 pl-14 pr-5 text-base bg-card border-border rounded-2xl"
            autoFocus={false}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Category cards (shown when not searching) ── */}
      {!q && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-14">
          {CATS.map(cat => {
            const count = ARTICLES.filter(a => a.category === cat.id).length
            return (
              <button
                key={cat.id}
                onClick={() => scrollTo(cat.id)}
                className="bg-card border border-border rounded-xl p-4 text-left hover:border-ring transition-colors cursor-pointer group"
              >
                <cat.icon className="w-4 h-4 text-muted-foreground mb-3 group-hover:text-foreground transition-colors" />
                <p className="text-sm font-semibold text-foreground mb-0.5 leading-snug">{cat.id}</p>
                <p className="text-[11px] text-muted-foreground">{count} articles</p>
              </button>
            )
          })}
          <button
            onClick={() => onNavigate("api")}
            className="bg-card border border-border rounded-xl p-4 text-left hover:border-ring transition-colors cursor-pointer group"
          >
            <ArrowRight className="w-4 h-4 text-muted-foreground mb-3 group-hover:text-foreground transition-colors" />
            <p className="text-sm font-semibold text-foreground mb-0.5">API Docs</p>
            <p className="text-[11px] text-muted-foreground">Full reference</p>
          </button>
        </div>
      )}

      {/* ── Disclaimer (shown when not searching) ── */}
      {!q && (
        <div className="flex items-start gap-3 border border-border rounded-xl p-4 mb-10">
          <AlertTriangle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Polymart is a simulation. All tickers, companies, prices, and events are entirely fictional.
            Nothing on this platform constitutes financial advice or represents real market conditions.
          </p>
        </div>
      )}

      {/* ── Search results ── */}
      {q && (
        <div className="mb-2">
          <p className="text-sm text-muted-foreground mb-6">
            {filtered.length === 0
              ? `No results for "${query}"`
              : `${filtered.length} result${filtered.length !== 1 ? "s" : ""} for "${query}"`}
          </p>
          {filtered.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl p-12 text-center">
              <Search className="w-7 h-7 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground mb-1">Nothing found</p>
              <p className="text-xs text-muted-foreground">Try a different term, or browse by category below.</p>
              <button
                onClick={() => setQuery("")}
                className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0 underline underline-offset-2"
              >
                Clear search
              </button>
            </div>
          ) : (
            <Accordion type="single" collapsible className="space-y-2">
              {filtered.map((item, i) => (
                <AccordionItem
                  key={i}
                  value={String(i)}
                  className="bg-card border border-border rounded-xl px-5 data-[state=open]:border-ring transition-colors"
                >
                  <AccordionTrigger className="text-sm font-semibold text-foreground py-4 hover:no-underline text-left gap-3">
                    <span className="flex-1">{item.q}</span>
                    <span className={cn(
                      "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded shrink-0 border border-border text-muted-foreground"
                    )}>
                      {item.category}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      )}

      {/* ── Grouped articles (shown when not searching) ── */}
      {!q && (
        <div className="space-y-12">
          {CATS.map(cat => {
            const items = ARTICLES.filter(a => a.category === cat.id)
            return (
              <div key={cat.id} id={cat.id}>
                <div className="flex items-center gap-2.5 mb-5">
                  <cat.icon className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-bold text-foreground">{cat.id}</p>
                  <span className="text-[10px] text-muted-foreground/50 font-mono ml-1">{items.length}</span>
                </div>
                <Accordion type="single" collapsible className="space-y-2">
                  {items.map((item, i) => (
                    <AccordionItem
                      key={i}
                      value={String(i)}
                      className="bg-card border border-border rounded-xl px-5 data-[state=open]:border-ring transition-colors"
                    >
                      <AccordionTrigger className="text-sm font-semibold text-foreground py-4 hover:no-underline text-left">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Footer CTA ── */}
      <div className="mt-16 border border-border rounded-xl px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground mb-0.5">Still have questions?</p>
          <p className="text-xs text-muted-foreground">The API docs cover every endpoint in full detail.</p>
        </div>
        <button
          onClick={() => onNavigate("api")}
          className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg text-sm font-semibold cursor-pointer border-0 hover:opacity-90 transition-opacity shrink-0"
        >
          API Docs <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  )
}
