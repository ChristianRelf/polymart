import type { SavedLayout, PanelDef } from "@/components/trading/types"

function panel(id: string, type: PanelDef["type"], col: number, row: number, colSpan: number, rowSpan: number): PanelDef {
  return { id, type, col, row, colSpan, rowSpan }
}

// 4-column grid, rows are proportional height units
export const LAYOUT_PRESETS: SavedLayout[] = [
  {
    name: "Default",
    columns: 4,
    panels: [
      panel("watchlist",   "watchlist",   1, 1, 1, 3),
      panel("chart",       "chart",       2, 1, 2, 2),
      panel("positions",   "positions",   2, 3, 2, 1),
      panel("tradeform",   "tradeform",   4, 1, 1, 2),
      panel("signals",     "signals",     4, 3, 1, 1),
    ],
  },
  {
    name: "Day Trader",
    columns: 5,
    panels: [
      panel("chart",       "chart",       1, 1, 2, 2),
      panel("orderbook",   "orderbook",   3, 1, 1, 2),
      panel("domladder",   "domladder",   4, 1, 1, 2),
      panel("tradeform",   "tradeform",   5, 1, 1, 1),
      panel("timesales",   "timesales",   3, 3, 2, 1),
      panel("positions",   "positions",   1, 3, 2, 1),
      panel("orders",      "orders",      5, 2, 1, 2),
    ],
  },
  {
    name: "Swing Trader",
    columns: 4,
    panels: [
      panel("watchlist",   "watchlist",   1, 1, 1, 3),
      panel("chart",       "chart",       2, 1, 2, 2),
      panel("news",        "news",        4, 1, 1, 1),
      panel("calendar",    "calendar",    4, 2, 1, 1),
      panel("signals",     "signals",     2, 3, 1, 1),
      panel("notes",       "notes",       3, 3, 2, 1),
    ],
  },
  {
    name: "Scalper",
    columns: 5,
    panels: [
      panel("chart",       "chart",       1, 1, 2, 3),
      panel("orderbook",   "orderbook",   3, 1, 1, 2),
      panel("domladder",   "domladder",   4, 1, 1, 3),
      panel("timesales",   "timesales",   3, 2, 1, 2),
      panel("tradeform",   "tradeform",   5, 1, 1, 2),
      panel("positions",   "positions",   5, 3, 1, 1),
    ],
  },
  {
    name: "Macro View",
    columns: 4,
    panels: [
      panel("chart",       "chart",       1, 1, 2, 2),
      panel("heatmap",     "heatmap",     3, 1, 2, 1),
      panel("news",        "news",        3, 2, 1, 1),
      panel("calendar",    "calendar",    4, 2, 1, 1),
      panel("performance", "performance", 1, 3, 2, 1),
      panel("signals",     "signals",     3, 3, 2, 1),
    ],
  },
  {
    name: "Options Focus",
    columns: 4,
    panels: [
      panel("chart",       "chart",       1, 1, 2, 2),
      panel("scanner",     "scanner",     3, 1, 1, 2),
      panel("signals",     "signals",     4, 1, 1, 1),
      panel("calculator",  "calculator",  4, 2, 1, 1),
      panel("tradeform",   "tradeform",   1, 3, 2, 1),
      panel("orders",      "orders",      3, 3, 2, 1),
    ],
  },
]

export const DEFAULT_LAYOUT = LAYOUT_PRESETS[0]
