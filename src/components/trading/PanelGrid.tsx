import { useState, useRef, useEffect, useCallback } from "react"
import { X, Maximize2, ExternalLink } from "lucide-react"
import type { LayoutNode, PanelLeaf, SplitPane, SplitChild, PanelType } from "./types"

const POPPABLE: PanelType[] = ["orderbook", "timesales", "heatmap", "scanner", "domladder", "news", "calendar"]
const MIN_PANE = 0.08  // minimum 8% before a pane stops shrinking

interface PanelGridProps {
  layout: LayoutNode
  onUpdateLayout: (layout: LayoutNode) => void
  renderPanel: (type: PanelType, id: string) => React.ReactNode
  panelTitles: Record<PanelType, string>
  lockedTypes?: PanelType[]
  onPopOut?: (type: PanelType) => void
}

type DividerDrag = {
  path: number[]          // indices into the tree to reach the parent SplitPane
  index: number           // divider sits between children[index] and children[index+1]
  dir: "row" | "col"
  startPos: number        // clientX or clientY at drag start
  startSizes: number[]    // snapshot of all sibling sizes at drag start
  containerPx: number     // total px of parent container (width or height)
}

// ── Tree helpers ───────────────────────────────────────────────────────────────

function updateSizes(root: LayoutNode, path: number[], newSizes: number[]): LayoutNode {
  if (path.length === 0) {
    if (root.kind !== "split") return root
    return { ...root, children: root.children.map((c, i) => ({ ...c, size: newSizes[i] })) }
  }
  if (root.kind !== "split") return root
  const [head, ...rest] = path
  return {
    ...root,
    children: root.children.map((c, i) =>
      i === head ? { ...c, node: updateSizes(c.node, rest, newSizes) } : c
    ),
  }
}

function removeLeaf(root: LayoutNode, id: string): LayoutNode | null {
  if (root.kind === "panel") return root.id === id ? null : root
  const kept: SplitChild[] = []
  for (const child of root.children) {
    const next = removeLeaf(child.node, id)
    if (next !== null) kept.push({ ...child, node: next })
  }
  if (kept.length === 0) return null
  if (kept.length === 1) return kept[0].node  // unwrap single remaining child
  const removed = root.children.reduce((s, c) => s + c.size, 0) - kept.reduce((s, c) => s + c.size, 0)
  const bonus = removed / kept.length
  return { ...root, children: kept.map(c => ({ ...c, size: c.size + bonus })) }
}

function findLeaf(root: LayoutNode, id: string): PanelLeaf | null {
  if (root.kind === "panel") return root.id === id ? root : null
  for (const c of root.children) {
    const f = findLeaf(c.node, id)
    if (f) return f
  }
  return null
}

function collectTypes(root: LayoutNode): PanelType[] {
  if (root.kind === "panel") return [root.type]
  return root.children.flatMap(c => collectTypes(c.node))
}

export function getPanelTypes(root: LayoutNode): PanelType[] {
  return collectTypes(root)
}

// ── Component ──────────────────────────────────────────────────────────────────

export function PanelGrid({
  layout, onUpdateLayout, renderPanel, panelTitles, lockedTypes = ["chart"], onPopOut,
}: PanelGridProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [drag, setDrag] = useState<DividerDrag | null>(null)
  const layoutRef = useRef(layout)
  useEffect(() => { layoutRef.current = layout }, [layout])

  // ── Divider drag ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!drag) return
    document.body.style.userSelect = "none"
    document.body.style.cursor = drag.dir === "row" ? "col-resize" : "row-resize"

    const onMove = (e: MouseEvent) => {
      const pos   = drag.dir === "row" ? e.clientX : e.clientY
      const delta = (pos - drag.startPos) / drag.containerPx
      const i     = drag.index
      const s     = drag.startSizes
      // clamp so neither side goes below MIN_PANE
      const maxTransfer = s[i] - MIN_PANE
      const maxReceive  = s[i + 1] - MIN_PANE
      const d     = Math.max(-maxReceive, Math.min(maxTransfer, delta))
      const newSizes = s.map((v, j) => j === i ? v + d : j === i + 1 ? v - d : v)
      onUpdateLayout(updateSizes(layoutRef.current, drag.path, newSizes))
    }
    const onUp = () => setDrag(null)
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      document.body.style.userSelect = ""
      document.body.style.cursor = ""
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, [drag, onUpdateLayout])

  // ── Panel actions ──────────────────────────────────────────────────────────
  const handleRemove = useCallback((id: string) => {
    const next = removeLeaf(layoutRef.current, id)
    if (next) onUpdateLayout(next)
  }, [onUpdateLayout])

  // ── Fullscreen mode ────────────────────────────────────────────────────────
  if (expandedId) {
    const leaf = findLeaf(layout, expandedId)
    if (leaf) return (
      <div className="h-full flex flex-col bg-[oklch(0.13_0.004_264)]">
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/10 bg-[oklch(0.16_0.004_264)] shrink-0">
          <span className="text-xs font-semibold text-foreground/80">{panelTitles[leaf.type]}</span>
          <button type="button" onClick={() => setExpandedId(null)}
            className="ml-auto flex items-center gap-1 px-2 py-1 rounded text-[10px] text-muted-foreground hover:text-foreground bg-white/5 hover:bg-white/10 transition-colors border-0 cursor-pointer">
            <Maximize2 className="w-3 h-3" /> Exit fullscreen
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">{renderPanel(leaf.type, leaf.id)}</div>
      </div>
    )
  }

  // ── Recursive renderer ─────────────────────────────────────────────────────
  function renderNode(node: LayoutNode, path: number[]): React.ReactNode {
    // ── Panel leaf ───────────────────────────────────────────────────────────
    if (node.kind === "panel") {
      return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-[oklch(0.14_0.004_264)]">
          <div className="flex items-center gap-1.5 px-2 py-1 border-b border-white/5 bg-[oklch(0.16_0.004_264)] shrink-0 select-none">
            <span className="text-[10px] font-semibold text-foreground/50 uppercase tracking-wider truncate">
              {panelTitles[node.type]}
            </span>
            <div className="ml-auto flex items-center gap-0.5 shrink-0">
              {onPopOut && POPPABLE.includes(node.type) && (
                <button type="button" onClick={() => onPopOut(node.type)}
                  className="p-0.5 rounded hover:bg-white/10 text-white/30 hover:text-white/70 transition-colors border-0 bg-transparent cursor-pointer"
                  title="Pop out to window">
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              )}
              <button type="button" onClick={() => setExpandedId(node.id)}
                className="p-0.5 rounded hover:bg-white/10 text-white/30 hover:text-white/70 transition-colors border-0 bg-transparent cursor-pointer"
                title="Fullscreen">
                <Maximize2 className="w-2.5 h-2.5" />
              </button>
              {!lockedTypes.includes(node.type) && (
                <button type="button" onClick={() => handleRemove(node.id)}
                  className="p-0.5 rounded hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors border-0 bg-transparent cursor-pointer"
                  title="Close panel">
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            {renderPanel(node.type, node.id)}
          </div>
        </div>
      )
    }

    // ── Split pane ───────────────────────────────────────────────────────────
    const isRow = node.dir === "row"
    const items: React.ReactNode[] = []

    node.children.forEach((child, i) => {
      const childKey = child.node.kind === "panel" ? child.node.id : `split-${path.join("-")}-${i}`
      items.push(
        <div
          key={childKey}
          className={isRow ? "h-full min-w-0 overflow-hidden" : "w-full min-h-0 overflow-hidden"}
          style={{ [isRow ? "width" : "height"]: `${child.size * 100}%` }}
        >
          {renderNode(child.node, [...path, i])}
        </div>
      )

      if (i < node.children.length - 1) {
        items.push(
          <div
            key={`div-${path.join("-")}-${i}`}
            className={[
              "shrink-0 bg-[oklch(0.09_0.004_264)] transition-colors",
              "hover:bg-indigo-500/50 active:bg-indigo-500/70",
              isRow ? "w-[3px] h-full cursor-col-resize" : "h-[3px] w-full cursor-row-resize",
            ].join(" ")}
            onMouseDown={(e) => {
              e.preventDefault()
              const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect()
              setDrag({
                path,
                index: i,
                dir: node.dir,
                startPos: isRow ? e.clientX : e.clientY,
                startSizes: node.children.map(c => c.size),
                containerPx: isRow ? rect.width : rect.height,
              })
            }}
          />
        )
      }
    })

    return (
      <div className={`flex ${isRow ? "flex-row" : "flex-col"} h-full w-full`}>
        {items}
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-hidden bg-[oklch(0.11_0.004_264)]">
      {renderNode(layout, [])}
    </div>
  )
}
