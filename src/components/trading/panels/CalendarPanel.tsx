const EVENTS = [
  { id: 1, time: "08:30", name: "Non-Farm Payrolls",     currency: "USD", impact: "high",   actual: "240K", forecast: "180K", previous: "195K" },
  { id: 2, time: "10:00", name: "ISM Manufacturing PMI", currency: "USD", impact: "medium", actual: "51.2", forecast: "50.8", previous: "50.1" },
  { id: 3, time: "10:30", name: "Crude Oil Inventories", currency: "USD", impact: "medium", actual: "-2.4M", forecast: "+0.5M", previous: "+1.2M" },
  { id: 4, time: "14:00", name: "FOMC Minutes",          currency: "USD", impact: "high",   actual: null,   forecast: "-",    previous: "-" },
  { id: 5, time: "03:00", name: "China Caixin PMI",      currency: "CNY", impact: "medium", actual: "49.8", forecast: "50.2", previous: "50.0" },
  { id: 6, time: "07:00", name: "UK CPI y/y",            currency: "GBP", impact: "high",   actual: null,   forecast: "3.2%", previous: "3.4%" },
  { id: 7, time: "13:30", name: "ECB Rate Decision",     currency: "EUR", impact: "high",   actual: null,   forecast: "3.75%", previous: "4.00%" },
  { id: 8, time: "08:30", name: "Initial Jobless Claims", currency: "USD", impact: "medium", actual: null,  forecast: "215K", previous: "228K" },
]

const impactColor = (impact: string) =>
  impact === "high" ? "bg-red-500" : impact === "medium" ? "bg-amber-400" : "bg-emerald-400"

export function CalendarPanel() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-1.5 border-b border-white/5 shrink-0">
        <p className="text-[10px] text-muted-foreground">Economic Calendar — Simulated data</p>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center gap-2 px-3 py-1 bg-[oklch(0.16_0.004_264)] border-b border-white/5 text-[9px] text-muted-foreground">
          <span className="w-10">Time</span>
          <span className="flex-1">Event</span>
          <span className="w-8 text-center">Cur</span>
          <span className="w-14 text-right">Actual</span>
          <span className="w-14 text-right">Fcst</span>
          <span className="w-14 text-right">Prev</span>
        </div>
        {EVENTS.map(ev => (
          <div key={ev.id} className="flex items-center gap-2 px-3 py-2 border-b border-white/3 hover:bg-white/3 transition-colors">
            <span className="w-10 text-[10px] font-mono text-muted-foreground shrink-0">{ev.time}</span>
            <div className="flex-1 min-w-0 flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${impactColor(ev.impact)}`} />
              <span className="text-[10px] text-foreground/85 truncate">{ev.name}</span>
            </div>
            <span className="w-8 text-center text-[9px] font-mono font-semibold text-muted-foreground shrink-0">{ev.currency}</span>
            <span className={`w-14 text-right text-[10px] font-mono shrink-0 ${ev.actual ? (ev.actual > ev.forecast ? "text-emerald-400" : "text-red-400") : "text-muted-foreground"}`}>
              {ev.actual ?? "—"}
            </span>
            <span className="w-14 text-right text-[10px] font-mono text-muted-foreground shrink-0">{ev.forecast}</span>
            <span className="w-14 text-right text-[10px] font-mono text-muted-foreground/60 shrink-0">{ev.previous}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
