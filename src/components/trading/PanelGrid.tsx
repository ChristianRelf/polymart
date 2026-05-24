import { useState, useCallback, useRef, useEffect } from "react"
import { X, Maximize2, GripHorizontal, ExternalLink } from "lucide-react"
import type { PanelDef, PanelType } from "./types"

const POPPABLE: PanelType[] = ["orderbook", "timesales", "heatmap", "scanner", "domladder", "news", "calendar"]

interface PanelGridProps {
  panels: PanelDef[]
  columns: number
  onUpdatePanels: (panels: PanelDef[]) => void
  renderPanel: (type: PanelType, id: string) => React.ReactNode
  panelTitles: Record<PanelType, string>
  lockedTypes?: PanelType[]
  onPopOut?: (type: PanelType) => void
}

type ResizeState = {
  id: string
  edge: "right" | "bottom" | "corner"
  startX: number
  startY: number
  startColSpan: number
  startRowSpan: number
  startCol: number
  cellW: number
  cellH: number
}

export function PanelGrid({ panels, columns, onUpdatePanels, renderPanel, panelTitles, lockedTypes = ["chart"], onPopOut }: PanelGridProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dragSrc, setDragSrc] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [resizing, setResizing] = useState<ResizeState | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const panelsRef = useRef(panels)
  const emptyImgRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => { panelsRef.current = panels }, [panels])

  useEffect(() => {
    const img = new Image()
    img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
    emptyImgRef.current = img
  }, [])

  const rows = Math.max(...panels.map(p => p.row + p.rowSpan - 1), 1)

  // Fix resize feedback loop: lock row height in px during resize so adding rows
  // doesn't shrink existing ones (which would make 1fr cells smaller mid-drag).
  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gridTemplateRows: resizing
      ? `repeat(${rows}, ${resizing.cellH}px)`
      : `repeat(${rows}, 1fr)`,
  }

  const removePanel = useCallback((id: string) => {
    onUpdatePanels(panels.filter(p => p.id !== id))
  }, [panels, onUpdatePanels])

  const handleDragStart = useCallback((id: string, e: React.DragEvent) => {
    if (emptyImgRef.current) e.dataTransfer.setDragImage(emptyImgRef.current, 0, 0)
    setDragSrc(id)
  }, [])

  const handleDragOver = useCallback((id: string, e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(id)
  }, [])

  const handleDrop = useCallback((targetId: string) => {
    if (!dragSrc || dragSrc === targetId) { setDragSrc(null); setDragOver(null); return }
    const src = panels.find(p => p.id === dragSrc)
    const tgt = panels.find(p => p.id === targetId)
    if (!src || !tgt) { setDragSrc(null); setDragOver(null); return }
    const updated = panels.map(p => {
      if (p.id === dragSrc) return { ...p, col: tgt.col, row: tgt.row, colSpan: tgt.colSpan, rowSpan: tgt.rowSpan }
      if (p.id === targetId) return { ...p, col: src.col, row: src.row, colSpan: src.colSpan, rowSpan: src.rowSpan }
      return p
    })
    onUpdatePanels(updated)
    setDragSrc(null)
    setDragOver(null)
  }, [dragSrc, panels, onUpdatePanels])

  const startResize = useCallback((e: React.MouseEvent, panel: PanelDef, edge: "right" | "bottom" | "corner") => {
    e.preventDefault()
    e.stopPropagation()
    if (!gridRef.current) return
    const rect = gridRef.current.getBoundingClientRect()
    const currentRows = Math.max(...panelsRef.current.map(p => p.row + p.rowSpan - 1), 1)
    setResizing({
      id: panel.id,
      edge,
      startX: e.clientX,
      startY: e.clientY,
      startColSpan: panel.colSpan,
      startRowSpan: panel.rowSpan,
      startCol: panel.col,
      cellW: (rect.width - (columns - 1) * 2) / columns,
      cellH: (rect.height - (currentRows - 1) * 2) / currentRows,
    })
  }, [columns])

  useEffect(() => {
    if (!resizing) return
    const cursor = resizing.edge === "right" ? "col-resize" : resizing.edge === "bottom" ? "row-resize" : "se-resize"
    document.body.style.cursor = cursor
    document.body.style.userSelect = "none"
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - resizing.startX
      const dy = e.clientY - resizing.startY
      const allPanels = panelsRef.current
      const target = allPanels.find(p => p.id === resizing.id)
      if (!target) return

      let colSpan = target.colSpan
      let rowSpan = target.rowSpan

      if (resizing.edge !== "bottom") {
        const raw = Math.max(1, Math.min(columns - resizing.startCol + 1, Math.round(resizing.startColSpan + dx / resizing.cellW)))
        // Clamp: don't extend into panels immediately to the right that share our row range
        const minRightCol = allPanels
          .filter(p => p.id !== resizing.id &&
            p.col > resizing.startCol &&
            p.row <= target.row + resizing.startRowSpan - 1 &&
            p.row + p.rowSpan - 1 >= target.row)
          .reduce((min, p) => Math.min(min, p.col), columns + 1)
        colSpan = Math.min(raw, minRightCol - resizing.startCol)
      }

      if (resizing.edge !== "right") {
        const raw = Math.max(1, Math.round(resizing.startRowSpan + dy / resizing.cellH))
        // Clamp: don't extend into panels directly below that share our col range
        const minBelowRow = allPanels
          .filter(p => p.id !== resizing.id &&
            p.row > target.row &&
            p.col <= resizing.startCol + resizing.startColSpan - 1 &&
            p.col + p.colSpan - 1 >= resizing.startCol)
          .reduce((min, p) => Math.min(min, p.row), Infinity)
        rowSpan = Math.min(raw, isFinite(minBelowRow) ? minBelowRow - target.row : raw)
      }

      onUpdatePanels(allPanels.map(p => p.id !== resizing.id ? p : { ...p, colSpan, rowSpan }))
    }
    const onUp = () => setResizing(null)
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, [resizing, columns, onUpdatePanels])

  if (expandedId) {
    const panel = panels.find(p => p.id === expandedId)
    if (panel) {
      return (
        <div className="h-full flex flex-col bg-[oklch(0.13_0.004_264)]">
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/10 bg-[oklch(0.16_0.004_264)] shrink-0">
            <span className="text-xs font-semibold text-foreground/80">{panelTitles[panel.type]}</span>
            <button type="button" onClick={() => setExpandedId(null)} className="ml-auto flex items-center gap-1 px-2 py-1 rounded text-[10px] text-muted-foreground hover:text-foreground bg-white/5 hover:bg-white/10 transition-colors border-0 cursor-pointer">
              <Maximize2 className="w-3 h-3" /> Exit fullscreen
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            {renderPanel(panel.type, panel.id)}
          </div>
        </div>
      )
    }
  }

  return (
    <div ref={gridRef} style={gridStyle} className="grid gap-0.5 h-full bg-[oklch(0.11_0.004_264)]">
      {panels.map(panel => {
        const isDragSrc = dragSrc === panel.id
        const isDragOver = dragOver === panel.id && dragOver !== dragSrc
        const dragSrcPanel = dragSrc ? panels.find(p => p.id === dragSrc) : null
        return (
          <div
            key={panel.id}
            onDragOver={e => handleDragOver(panel.id, e)}
            onDrop={() => handleDrop(panel.id)}
            onDragEnd={() => { setDragSrc(null); setDragOver(null) }}
            style={{
              gridColumn: `${panel.col} / span ${panel.colSpan}`,
              gridRow: `${panel.row} / span ${panel.rowSpan}`,
            }}
            className={`relative flex flex-col overflow-hidden rounded-sm bg-[oklch(0.14_0.004_264)] transition-opacity duration-100 ${isDragSrc ? "opacity-25" : "opacity-100"}`}
          >
            {/* Drop target overlay — shows dragged panel title so user knows what will land here */}
            {isDragOver && (
              <div className="absolute inset-0 z-30 rounded-sm bg-indigo-500/15 border-2 border-indigo-400/60 flex items-center justify-center pointer-events-none">
                <span className="text-indigo-200 text-xs font-semibold px-3 py-1.5 rounded bg-indigo-950/70 border border-indigo-500/40">
                  {dragSrcPanel ? panelTitles[dragSrcPanel.type] : ""}
                </span>
              </div>
            )}

            {/* Panel header — drag handle */}
            <div
              draggable
              onDragStart={e => handleDragStart(panel.id, e)}
              className="flex items-center gap-1.5 px-2 py-1 border-b border-white/5 bg-[oklch(0.16_0.004_264)] shrink-0 select-none cursor-grab active:cursor-grabbing"
            >
              <GripHorizontal className="w-3 h-3 text-white/20 pointer-events-none" />
              <span className="text-[10px] font-semibold text-foreground/50 uppercase tracking-wider">{panelTitles[panel.type]}</span>
              <div className="ml-auto flex items-center gap-0.5">
                {onPopOut && POPPABLE.includes(panel.type) && (
                  <button
                    type="button"
                    onClick={() => onPopOut(panel.type)}
                    className="p-0.5 rounded hover:bg-white/10 text-white/30 hover:text-white/70 transition-colors border-0 bg-transparent cursor-pointer"
                    title="Pop out to window"
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setExpandedId(panel.id)}
                  className="p-0.5 rounded hover:bg-white/10 text-white/30 hover:text-white/70 transition-colors border-0 bg-transparent cursor-pointer"
                  title="Fullscreen"
                >
                  <Maximize2 className="w-2.5 h-2.5" />
                </button>
                {!lockedTypes.includes(panel.type) && (
                  <button
                    type="button"
                    onClick={() => removePanel(panel.id)}
                    className="p-0.5 rounded hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors border-0 bg-transparent cursor-pointer"
                    title="Close panel"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Panel content — explicitly not draggable so chart drawing tools work */}
            <div className="flex-1 min-h-0 overflow-hidden" draggable={false}>
              {renderPanel(panel.type, panel.id)}
            </div>

            {/* Right-edge resize handle — always subtly visible */}
            <div
              onMouseDown={e => startResize(e, panel, "right")}
              className="absolute top-7 right-0 w-1.5 bottom-3 cursor-col-resize z-10 opacity-0 hover:opacity-100 hover:bg-indigo-500/50 transition-opacity"
            />
            {/* Bottom-edge resize handle */}
            <div
              onMouseDown={e => startResize(e, panel, "bottom")}
              className="absolute bottom-0 left-0 right-3 h-1.5 cursor-row-resize z-10 opacity-0 hover:opacity-100 hover:bg-indigo-500/50 transition-opacity"
            />
            {/* Corner resize handle — always visible as a triangle */}
            <div
              onMouseDown={e => startResize(e, panel, "corner")}
              className="absolute bottom-0 right-0 w-3.5 h-3.5 cursor-se-resize z-20 opacity-50 hover:opacity-100 transition-opacity bg-[linear-gradient(135deg,transparent_50%,rgba(99,102,241,0.7)_50%)]"
            />
          </div>
        )
      })}
    </div>
  )
}
