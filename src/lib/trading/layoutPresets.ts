import type { SavedLayout, PanelDef } from "@/components/trading/types"

function panel(id: string, type: PanelDef["type"], col: number, row: number, colSpan: number, rowSpan: number): PanelDef {
  return { id, type, col, row, colSpan, rowSpan }
}

// 4-column grid. Row values use a 12-unit scale (×4 from old 3-unit scale).
// This means each 1-unit row ≈ 8% of viewport height (~75px on a 900px terminal),
// giving panels fine-grained resize granularity without needing fractional values.
// old row 1→1, old row 2→5, old row 3→9  |  old rowSpan 1→4, 2→8, 3→12
export const LAYOUT_PRESETS: SavedLayout[] = [
  {
    name: "Default",
    columns: 4,
    panels: [
      panel("watchlist",   "watchlist",   1, 1,  1, 12),
      panel("chart",       "chart",       2, 1,  2,  8),
      panel("positions",   "positions",   2, 9,  2,  4),
      panel("tradeform",   "tradeform",   4, 1,  1,  8),
      panel("signals",     "signals",     4, 9,  1,  4),
    ],
  },
  {
    name: "Day Trader",
    columns: 5,
    panels: [
      panel("chart",       "chart",       1, 1,  2, 8),
      panel("orderbook",   "orderbook",   3, 1,  1, 8),
      panel("domladder",   "domladder",   4, 1,  1, 8),
      panel("tradeform",   "tradeform",   5, 1,  1, 4),
      panel("timesales",   "timesales",   3, 9,  2, 4),
      panel("positions",   "positions",   1, 9,  2, 4),
      panel("orders",      "orders",      5, 5,  1, 8),
    ],
  },
  {
    name: "Swing Trader",
    columns: 4,
    panels: [
      panel("watchlist",   "watchlist",   1, 1,  1, 12),
      panel("chart",       "chart",       2, 1,  2,  8),
      panel("news",        "news",        4, 1,  1,  4),
      panel("calendar",    "calendar",    4, 5,  1,  4),
      panel("signals",     "signals",     2, 9,  1,  4),
      panel("notes",       "notes",       3, 9,  2,  4),
    ],
  },
  {
    name: "Scalper",
    columns: 5,
    panels: [
      panel("chart",       "chart",       1, 1,  2, 12),
      panel("orderbook",   "orderbook",   3, 1,  1,  4),
      panel("domladder",   "domladder",   4, 1,  1, 12),
      panel("timesales",   "timesales",   3, 5,  1,  8),
      panel("tradeform",   "tradeform",   5, 1,  1,  8),
      panel("positions",   "positions",   5, 9,  1,  4),
    ],
  },
  {
    name: "Macro View",
    columns: 4,
    panels: [
      panel("chart",       "chart",       1, 1,  2, 8),
      panel("heatmap",     "heatmap",     3, 1,  2, 4),
      panel("news",        "news",        3, 5,  1, 4),
      panel("calendar",    "calendar",    4, 5,  1, 4),
      panel("performance", "performance", 1, 9,  2, 4),
      panel("signals",     "signals",     3, 9,  2, 4),
    ],
  },
  {
    name: "Options Focus",
    columns: 4,
    panels: [
      panel("chart",       "chart",       1, 1,  2, 8),
      panel("scanner",     "scanner",     3, 1,  1, 8),
      panel("signals",     "signals",     4, 1,  1, 4),
      panel("calculator",  "calculator",  4, 5,  1, 4),
      panel("tradeform",   "tradeform",   1, 9,  2, 4),
      panel("orders",      "orders",      3, 9,  2, 4),
    ],
  },
]

export const DEFAULT_LAYOUT = LAYOUT_PRESETS[0]
