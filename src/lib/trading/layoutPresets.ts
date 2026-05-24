import type { SavedLayout, LayoutNode, PanelLeaf, SplitPane } from "@/components/trading/types"
import type { PanelType } from "@/components/trading/types"

function leaf(type: PanelType, id?: string): PanelLeaf {
  return { kind: "panel", id: id ?? type, type }
}

function row(...children: [number, LayoutNode][]): SplitPane {
  const total = children.reduce((s, [n]) => s + n, 0)
  return { kind: "split", dir: "row", children: children.map(([n, node]) => ({ size: n / total, node })) }
}

function col(...children: [number, LayoutNode][]): SplitPane {
  const total = children.reduce((s, [n]) => s + n, 0)
  return { kind: "split", dir: "col", children: children.map(([n, node]) => ({ size: n / total, node })) }
}

export const LAYOUT_PRESETS: SavedLayout[] = [
  {
    name: "Default",
    root: row(
      [1,  leaf("watchlist")],
      [3,  col(
        [2, row([3, leaf("chart")], [1, leaf("tradeform")])],
        [1, row([3, leaf("positions")], [1, leaf("signals")])]
      )]
    ),
  },
  {
    name: "Day Trader",
    root: row(
      [2, col(
        [2, leaf("chart")],
        [1, row([1, leaf("positions")], [1, leaf("timesales")])]
      )],
      [1, col(
        [2, leaf("orderbook")],
        [1, leaf("domladder")]
      )],
      [1, col(
        [1, leaf("tradeform")],
        [1, leaf("orders")]
      )]
    ),
  },
  {
    name: "Swing Trader",
    root: row(
      [1, leaf("watchlist")],
      [3, col(
        [2, row([3, leaf("chart")], [1, col([1, leaf("news")], [1, leaf("calendar")])])],
        [1, row([1, leaf("signals")], [2, leaf("notes")])]
      )]
    ),
  },
  {
    name: "Scalper",
    root: row(
      [2, leaf("chart")],
      [1, col(
        [1, leaf("orderbook")],
        [2, leaf("timesales")]
      )],
      [1, leaf("domladder")],
      [1, col(
        [2, leaf("tradeform")],
        [1, leaf("positions")]
      )]
    ),
  },
  {
    name: "Macro View",
    root: row(
      [2, col(
        [2, leaf("chart")],
        [1, row([1, leaf("performance")], [1, leaf("signals")])]
      )],
      [2, col(
        [1, leaf("heatmap")],
        [1, row([1, leaf("news")], [1, leaf("calendar")])]
      )]
    ),
  },
  {
    name: "Options Focus",
    root: row(
      [2, col(
        [2, leaf("chart")],
        [1, row([1, leaf("tradeform")], [1, leaf("orders")])]
      )],
      [1, leaf("scanner")],
      [1, col(
        [1, leaf("signals")],
        [1, leaf("calculator")]
      )]
    ),
  },
]

export const DEFAULT_LAYOUT = LAYOUT_PRESETS[0]
