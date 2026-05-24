import { useState } from "react"
import { X, ChevronDown, ChevronUp, Plus, Search, ToggleLeft, ToggleRight, Settings } from "lucide-react"
import type { IndicatorConfig } from "./types"
import { AVAILABLE_INDICATORS } from "./types"

interface IndicatorsPanelProps {
  open: boolean
  onClose: () => void
  indicators: IndicatorConfig[]
  onUpdate: (indicators: IndicatorConfig[]) => void
}

function IndicatorRow({ ind, onToggle, onRemove, onUpdate }: {
  ind: IndicatorConfig
  onToggle: () => void
  onRemove: () => void
  onUpdate: (params: Record<string, number | string>, color: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [localParams, setLocalParams] = useState(ind.params)
  const [localColor, setLocalColor] = useState(ind.color ?? "#ffffff")

  const paramKeys = Object.keys(localParams)

  return (
    <div className={`rounded-lg border transition-colors ${ind.enabled ? "border-white/10 bg-white/3" : "border-white/5 bg-transparent opacity-50"}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Color swatch */}
        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: ind.color ?? "#fff" }} />
        <span className="text-xs font-medium text-foreground/90 flex-1 min-w-0 truncate">{ind.label}</span>
        <div className="flex items-center gap-1 shrink-0">
          {paramKeys.length > 0 && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors border-0 bg-transparent cursor-pointer"
              title="Settings"
            >
              <Settings className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={onToggle}
            className="p-1 rounded hover:bg-white/10 transition-colors border-0 bg-transparent cursor-pointer"
            title={ind.enabled ? "Disable" : "Enable"}
          >
            {ind.enabled
              ? <ToggleRight className="w-4 h-4 text-indigo-400" />
              : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
          </button>
          <button
            onClick={onRemove}
            className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors border-0 bg-transparent cursor-pointer"
            title="Remove"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-white/8 pt-2 space-y-2">
          {/* Color */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-muted-foreground w-12">Color</label>
            <input
              type="color"
              value={localColor}
              onChange={e => setLocalColor(e.target.value)}
              className="w-6 h-5 rounded cursor-pointer border-0 bg-transparent"
            />
            <span className="text-[10px] font-mono text-muted-foreground">{localColor}</span>
          </div>
          {/* Params */}
          {paramKeys.map(key => (
            <div key={key} className="flex items-center gap-2">
              <label className="text-[10px] text-muted-foreground capitalize w-16 truncate">{key}</label>
              <input
                type="number"
                value={Number(localParams[key])}
                onChange={e => setLocalParams(p => ({ ...p, [key]: Number(e.target.value) }))}
                className="w-16 bg-black/30 border border-white/10 rounded px-2 py-0.5 text-[10px] text-foreground font-mono outline-none focus:border-white/20"
              />
            </div>
          ))}
          <button
            onClick={() => { onUpdate(localParams, localColor); setExpanded(false) }}
            className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-medium border-0 cursor-pointer transition-colors"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  )
}

function AddIndicatorList({ onAdd }: { onAdd: (type: string, pane: "main" | "sub") => void }) {
  const [query, setQuery] = useState("")
  const filtered = AVAILABLE_INDICATORS.filter(i =>
    !query || i.label.toLowerCase().includes(query.toLowerCase())
  )
  return (
    <div className="border-t border-white/10 pt-3 mt-3">
      <div className="relative mb-2">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search indicators..."
          className="w-full bg-black/30 border border-white/10 rounded-lg pl-6 pr-3 py-1 text-[10px] text-foreground placeholder:text-muted-foreground outline-none focus:border-white/20"
        />
      </div>
      <div className="space-y-0.5 max-h-48 overflow-y-auto">
        {filtered.map(meta => (
          <button
            key={`${meta.type}-${meta.pane}`}
            onClick={() => onAdd(meta.type, meta.pane)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/8 text-left transition-colors cursor-pointer border-0 bg-transparent"
          >
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.defaultColor }} />
            <span className="text-[11px] text-foreground/80 flex-1">{meta.label}</span>
            <span className="text-[9px] text-muted-foreground bg-white/5 px-1 py-0.5 rounded">{meta.pane}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function IndicatorsPanel({ open, onClose, indicators, onUpdate }: IndicatorsPanelProps) {
  const [showAdd, setShowAdd] = useState(false)

  if (!open) return null

  const mainInds = indicators.filter(i => i.pane === "main")
  const subInds  = indicators.filter(i => i.pane === "sub")

  const toggle = (id: string) => {
    onUpdate(indicators.map(i => i.id === id ? { ...i, enabled: !i.enabled } : i))
  }
  const remove = (id: string) => {
    onUpdate(indicators.filter(i => i.id !== id))
  }
  const updateInd = (id: string, params: Record<string, number | string>, color: string) => {
    onUpdate(indicators.map(i => i.id === id ? { ...i, params, color } : i))
  }
  const addIndicator = (type: string, pane: "main" | "sub") => {
    const meta = AVAILABLE_INDICATORS.find(m => m.type === type && m.pane === pane)
    if (!meta) return
    const id = `${type}_${Date.now()}`
    const label = `${meta.label}${meta.defaultParams.period ? ` ${meta.defaultParams.period}` : ""}`
    onUpdate([...indicators, {
      id, type, label, enabled: true,
      params: { ...meta.defaultParams },
      pane,
      color: meta.defaultColor,
    }])
    setShowAdd(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="absolute right-0 top-0 bottom-0 w-72 flex flex-col bg-[oklch(0.14_0.004_264)] border-l border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 shrink-0">
          <h2 className="font-semibold text-sm">Indicators</h2>
          <button onClick={onClose} className="ml-auto p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors border-0 bg-transparent cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* On-Chart */}
          <section>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">On-Chart</p>
            <div className="space-y-1.5">
              {mainInds.map(ind => (
                <IndicatorRow
                  key={ind.id}
                  ind={ind}
                  onToggle={() => toggle(ind.id)}
                  onRemove={() => remove(ind.id)}
                  onUpdate={(params, color) => updateInd(ind.id, params, color)}
                />
              ))}
              {mainInds.length === 0 && <p className="text-[10px] text-muted-foreground italic">No on-chart indicators</p>}
            </div>
          </section>

          {/* Sub-charts */}
          <section>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sub-charts</p>
            <div className="space-y-1.5">
              {subInds.map(ind => (
                <IndicatorRow
                  key={ind.id}
                  ind={ind}
                  onToggle={() => toggle(ind.id)}
                  onRemove={() => remove(ind.id)}
                  onUpdate={(params, color) => updateInd(ind.id, params, color)}
                />
              ))}
              {subInds.length === 0 && <p className="text-[10px] text-muted-foreground italic">No sub-chart indicators</p>}
            </div>
          </section>

          {/* Add indicator */}
          <button
            onClick={() => setShowAdd(s => !s)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-white/15 hover:border-white/25 text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Indicator
            {showAdd ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
          </button>

          {showAdd && <AddIndicatorList onAdd={addIndicator} />}
        </div>
      </div>
    </div>
  )
}
