import { useState } from "react"
import { ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react"

const HEADLINES = [
  { id: 1, title: "Fed signals potential rate pause as inflation data cools", source: "Reuters", time: "2m ago", sentiment: "neutral" },
  { id: 2, title: "Tech giants rally on strong earnings beats, NASDAQ up 1.4%", source: "Bloomberg", time: "8m ago", sentiment: "positive" },
  { id: 3, title: "Oil prices drop on surprise inventory build, WTI -2.3%", source: "MarketWatch", time: "15m ago", sentiment: "negative" },
  { id: 4, title: "Dollar strengthens against major currencies amid safe-haven demand", source: "FX Street", time: "22m ago", sentiment: "neutral" },
  { id: 5, title: "Crypto market rebounds: Bitcoin reclaims $65K level", source: "CoinDesk", time: "31m ago", sentiment: "positive" },
  { id: 6, title: "Consumer confidence hits 6-month high in latest survey", source: "CNBC", time: "45m ago", sentiment: "positive" },
  { id: 7, title: "Banking sector under pressure following regional lender concerns", source: "FT", time: "1h ago", sentiment: "negative" },
  { id: 8, title: "Gold holds near all-time highs as geopolitical tensions persist", source: "Kitco", time: "1h ago", sentiment: "neutral" },
  { id: 9, title: "Jobs report beats expectations: 240K added vs 180K forecast", source: "WSJ", time: "2h ago", sentiment: "positive" },
  { id: 10, title: "China PMI data disappoints, raising growth concerns in Asia", source: "Bloomberg", time: "2h ago", sentiment: "negative" },
]

const SentimentIcon = ({ s }: { s: string }) =>
  s === "positive" ? <TrendingUp className="w-3 h-3 text-emerald-400" /> :
  s === "negative" ? <TrendingDown className="w-3 h-3 text-red-400" /> :
  <Minus className="w-3 h-3 text-muted-foreground" />

export function NewsPanel() {
  const [filter, setFilter] = useState<"all" | "positive" | "negative" | "neutral">("all")
  const items = filter === "all" ? HEADLINES : HEADLINES.filter(h => h.sentiment === filter)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-white/5 shrink-0">
        {(["all","positive","negative","neutral"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-2 py-0.5 rounded text-[9px] capitalize cursor-pointer border-0 transition-colors ${filter === f ? "bg-indigo-600 text-white" : "bg-white/5 text-muted-foreground hover:text-foreground"}`}>{f}</button>
        ))}
        <span className="ml-auto text-[9px] text-muted-foreground">Simulated</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {items.map(item => (
          <div key={item.id} className="px-3 py-2.5 border-b border-white/5 hover:bg-white/3 transition-colors group">
            <div className="flex items-start gap-2">
              <SentimentIcon s={item.sentiment} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] leading-snug text-foreground/85 group-hover:text-foreground transition-colors">{item.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] font-medium text-muted-foreground">{item.source}</span>
                  <span className="text-[9px] text-muted-foreground/60">{item.time}</span>
                </div>
              </div>
              <ExternalLink className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0 mt-0.5 transition-colors cursor-pointer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
