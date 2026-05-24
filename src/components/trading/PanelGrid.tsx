import { useState, useCallback } from "react"
import { X, Maximize2, GripHorizontal } from "lucide-react"
import type { PanelDef, PanelType } from "./types"

interface PanelGridProps {
  panels: PanelDef[]
  columns: number
  onUpdatePanels: (panels: PanelDef[]) => void
  renderPanel: (type: PanelType, id: string) => React.ReactNode
  panelTitles: Record<PanelType, string>
  lockedTypes?: PanelType[]  // types that cannot be removed
}

const ROW_HEIGHT = "1fr"

export function PanelGrid({ panels, columns, onUpdatePanels, renderPanel, panelTitles, lockedTypes = ["chart"] }: PanelGridProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dragSrc, setDragSrc] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  const rows = Math.max(...panels.map(p => p.row + p.rowSpan - 1), 1)

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, ${ROW_HEIGHT})`,
    gap: "2px",
    height: "100%",
    background: "oklch(0.11 0.004 264)",
  }

  const removePanel = useCallback((id: string) => {
    onUpdatePanels(panels.filter(p => p.id !== id))
  }, [panels, onUpdatePanels])

  const handleDragStart = useCallback((id: string) => {
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
    // Swap positions
    const updated = panels.map(p => {
      if (p.id === dragSrc) return { ...p, col: tgt.col, row: tgt.row, colSpan: tgt.colSpan, rowSpan: tgt.rowSpan }
      if (p.id === targetId) return { ...p, col: src.col, row: src.row, colSpan: src.colSpan, rowSpan: src.rowSpan }
      return p
    })
    onUpdatePanels(updated)
    setDragSrc(null)
    setDragOver(null)
  }, [dragSrc, panels, onUpdatePanels])

  if (expandedId) {
    const panel = panels.find(p => p.id === expandedId)
    if (panel) {
      return (
        <div className="h-full flex flex-col" style={{ background: "oklch(0.13 0.004 264)" }}>
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/10 bg-[oklch(0.16_0.004_264)] shrink-0">
            <span className="text-xs font-semibold text-foreground/80">{panelTitles[panel.type]}</span>
            <button onClick={() => setExpandedId(null)} className="ml-auto flex items-center gap-1 px-2 py-1 rounded text-[10px] text-muted-foreground hover:text-foreground bg-white/5 hover:bg-white/10 transition-colors border-0 cursor-pointer">
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
    <div style={gridStyle}>
      {panels.map(panel => (
        <div
          key={panel.id}
          draggable
          onDragStart={() => handleDragStart(panel.id)}
          onDragOver={e => handleDragOver(panel.id, e)}
          onDrop={() => handleDrop(panel.id)}
          onDragEnd={() => { setDragSrc(null); setDragOver(null) }}
          style={{
            gridColumn: `${panel.col} / span ${panel.colSpan}`,
            gridRow: `${panel.row} / span ${panel.rowSpan}`,
            opacity: dragSrc === panel.id ? 0.5 : 1,
            outline: dragOver === panel.id && dragOver !== dragSrc ? "2px solid rgba(99,102,241,0.7)" : "none",
          }}
          className="flex flex-col overflow-hidden rounded-sm bg-[oklch(0.14_0.004_264)]"
        >
          {/* Panel header */}
          <div className="flex items-center gap-1.5 px-2 py-1 border-b border-white/5 bg-[oklch(0.16_0.004_264)] shrink-0 select-none">
            <GripHorizontal className="w-3 h-3 text-white/20 cursor-grab active:cursor-grabbing" />
            <span className="text-[10px] font-semibold text-foreground/50 uppercase tracking-wider">{panelTitles[panel.type]}</span>
            <div className="ml-auto flex items-center gap-0.5">
              <button
                onClick={() => setExpandedId(panel.id)}
                className="p-0.5 rounded hover:bg-white/10 text-white/30 hover:text-white/70 transition-colors border-0 bg-transparent cursor-pointer"
                title="Fullscreen"
              >
                <Maximize2 className="w-2.5 h-2.5" />
              </button>
              {!lockedTypes.includes(panel.type) && (
                <button
                  onClick={() => removePanel(panel.id)}
                  className="p-0.5 rounded hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors border-0 bg-transparent cursor-pointer"
                  title="Close panel"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          </div>
          {/* Panel content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {renderPanel(panel.type, panel.id)}
          </div>
        </div>
      ))}
    </div>
  )
}
