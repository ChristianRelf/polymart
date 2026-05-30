import { useState, useRef, useEffect, useCallback } from "react"
import { X, Maximize2, ExternalLink, GripVertical } from "lucide-react"
import type { LayoutNode, PanelLeaf, SplitChild, PanelType } from "./types"

const POPPABLE: PanelType[] = ["orderbook", "timesales", "heatmap", "scanner", "domladder", "news", "calendar"]
const MIN_PANE = 0.08

interface PanelGridProps {
  layout: LayoutNode
  onUpdateLayout: (layout: LayoutNode) => void
  renderPanel: (type: PanelType, id: string) => React.ReactNode
  panelTitles: Record<PanelType, string>
  lockedTypes?: PanelType[]
  onPopOut?: (type: PanelType) => void
}

type DividerDrag = {
  path: number[]
  index: number
  dir: "row" | "col"
  startPos: number
  startSizes: number[]
  containerPx: number
}

type PanelDrag = { id: string; type: PanelType; initialX: number; initialY: number } | null
type DropTarget = { panelId: string; side: "left" | "right" | "top" | "bottom" } | null

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
  if (kept.length === 1) return kept[0].node
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

function insertNextTo(
  root: LayoutNode,
  targetId: string,
  side: "left" | "right" | "top" | "bottom",
  leaf: PanelLeaf,
): LayoutNode {
  if (root.kind === "panel") {
    if (root.id !== targetId) return root
    const dir = side === "left" || side === "right" ? "row" : "col"
    const isBefore = side === "left" || side === "top"
    return {
      kind: "split", dir,
      children: isBefore
        ? [{ size: 0.5, node: leaf }, { size: 0.5, node: root }]
        : [{ size: 0.5, node: root }, { size: 0.5, node: leaf }],
    }
  }
  return {
    ...root,
    children: root.children.map(c => ({ ...c, node: insertNextTo(c.node, targetId, side, leaf) })),
  }
}

function movePanel(
  root: LayoutNode,
  fromId: string,
  toId: string,
  side: "left" | "right" | "top" | "bottom",
): LayoutNode {
  if (fromId === toId) return root
  const leaf = findLeaf(root, fromId)
  if (!leaf) return root
  const without = removeLeaf(root, fromId)
  if (!without) return root
  return insertNextTo(without, toId, side, leaf)
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
  const [panelDrag, setPanelDrag] = useState<PanelDrag>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget>(null)

  const layoutRef = useRef(layout)
  useEffect(() => { layoutRef.current = layout }, [layout])

  // Refs so the single-mount effect always sees current values
  const panelDragRef = useRef<PanelDrag>(null)
  useEffect(() => { panelDragRef.current = panelDrag }, [panelDrag])
  const dropTargetRef = useRef<DropTarget>(null)
  useEffect(() => { dropTargetRef.current = dropTarget }, [dropTarget])
  const onUpdateLayoutRef = useRef(onUpdateLayout)
  useEffect(() => { onUpdateLayoutRef.current = onUpdateLayout }, [onUpdateLayout])

  // Pending drag: mousedown captured before the 6px threshold is exceeded
  const pendingRef = useRef<{ id: string; type: PanelType; startX: number; startY: number } | null>(null)
  // Ghost DOM element - position updated directly to avoid setState on every mousemove
  const ghostRef = useRef<HTMLDivElement | null>(null)

  // ── Divider drag ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!drag) return
    document.body.style.userSelect = "none"
    document.body.style.cursor = drag.dir === "row" ? "col-resize" : "row-resize"
    const onMove = (e: MouseEvent) => {
      const pos   = drag.dir === "row" ? e.clientX : e.clientY
      const delta = (pos - drag.startPos) / drag.containerPx
      const i = drag.index, s = drag.startSizes
      const d = Math.max(-(s[i + 1] - MIN_PANE), Math.min(s[i] - MIN_PANE, delta))
      onUpdateLayout(updateSizes(layoutRef.current, drag.path, s.map((v, j) => j === i ? v + d : j === i + 1 ? v - d : v)))
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

  // ── Panel drag (single-mount, reads refs) ──────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const pd = pendingRef.current

      // Still in pending phase - check threshold
      if (pd && !panelDragRef.current) {
        if (Math.hypot(e.clientX - pd.startX, e.clientY - pd.startY) > 6) {
          document.body.style.cursor = "grabbing"
          document.body.style.userSelect = "none"
          setPanelDrag({ id: pd.id, type: pd.type, initialX: e.clientX + 14, initialY: e.clientY + 6 })
        }
        return
      }

      if (!panelDragRef.current) return

      // Move ghost directly in DOM
      if (ghostRef.current) {
        ghostRef.current.style.left = `${e.clientX + 14}px`
        ghostRef.current.style.top  = `${e.clientY + 6}px`
      }

      // Hit-test for drop target (ghost is pointer-events:none so this sees through it)
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
      const panelEl = el?.closest("[data-panel-id]") as HTMLElement | null
      let next: DropTarget = null
      if (panelEl) {
        const pid = panelEl.dataset.panelId!
        if (pid !== panelDragRef.current.id) {
          const r = panelEl.getBoundingClientRect()
          const rx = (e.clientX - r.left) / r.width
          const ry = (e.clientY - r.top)  / r.height
          next = {
            panelId: pid,
            side: rx < 0.25 ? "left" : rx > 0.75 ? "right" : ry < 0.5 ? "top" : "bottom",
          }
        }
      }

      // Only re-render when target actually changes
      const cur = dropTargetRef.current
      if (next?.panelId !== cur?.panelId || next?.side !== cur?.side) setDropTarget(next)
    }

    const onUp = () => {
      const drag = panelDragRef.current
      const drop = dropTargetRef.current
      if (drag && drop) {
        onUpdateLayoutRef.current(movePanel(layoutRef.current, drag.id, drop.panelId, drop.side))
      }
      pendingRef.current = null
      setPanelDrag(null)
      setDropTarget(null)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, []) // mount once - all data via refs

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
    if (node.kind === "panel") {
      const isDragging = panelDrag?.id === node.id
      const isTarget   = dropTarget?.panelId === node.id

      return (
        <div
          data-panel-id={node.id}
          className={`relative flex flex-col h-full w-full overflow-hidden bg-[oklch(0.14_0.004_264)] transition-opacity ${isDragging ? "opacity-40" : ""}`}
        >
          {/* Header - drag handle */}
          <div
            className="flex items-center gap-1.5 px-2 py-1 border-b border-white/5 bg-[oklch(0.16_0.004_264)] shrink-0 select-none cursor-grab active:cursor-grabbing"
            onMouseDown={e => {
              if ((e.target as HTMLElement).closest("button")) return
              e.preventDefault()
              pendingRef.current = { id: node.id, type: node.type, startX: e.clientX, startY: e.clientY }
            }}
          >
            <GripVertical className="w-2.5 h-2.5 text-white/15 shrink-0 pointer-events-none" />
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

          {/* Drop zone overlay */}
          {isTarget && dropTarget && (
            <div className={`absolute pointer-events-none z-20 border-2 border-indigo-400 bg-indigo-500/20 ${
              dropTarget.side === "left"   ? "top-0 left-0 w-1/2 h-full" :
              dropTarget.side === "right"  ? "top-0 right-0 w-1/2 h-full" :
              dropTarget.side === "top"    ? "top-0 left-0 w-full h-1/2" :
                                             "bottom-0 left-0 w-full h-1/2"
            }`} />
          )}
        </div>
      )
    }

    // ── Split pane ─────────────────────────────────────────────────────────
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
            onMouseDown={e => {
              e.preventDefault()
              const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect()
              setDrag({
                path, index: i, dir: node.dir,
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

      {/* Drag ghost - follows cursor via direct DOM style updates */}
      {panelDrag && (
        <div
          ref={ghostRef}
          className="fixed pointer-events-none z-50 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-600/90 border border-indigo-400/50 text-white text-[11px] font-semibold shadow-xl backdrop-blur-sm"
          style={{ left: panelDrag.initialX, top: panelDrag.initialY }}
        >
          <GripVertical className="w-3 h-3 opacity-50" />
          {panelTitles[panelDrag.type]}
        </div>
      )}
    </div>
  )
}
