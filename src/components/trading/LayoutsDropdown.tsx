import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check, Plus, Trash2, Edit3, RotateCcw } from "lucide-react"
import type { SavedLayout } from "./types"
import { LAYOUT_PRESETS } from "@/lib/trading/layoutPresets"

interface LayoutsDropdownProps {
  currentName: string
  savedLayouts: SavedLayout[]
  onApply: (layout: SavedLayout) => void
  onSaveCurrent: (name: string) => void
  onDelete: (name: string) => void
  onRename: (oldName: string, newName: string) => void
  onReset: () => void
}

export function LayoutsDropdown({ currentName, savedLayouts, onApply, onSaveCurrent, onDelete, onRename, onReset }: LayoutsDropdownProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveName, setSaveName] = useState("")
  const [renamingName, setRenamingName] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) { setSaving(false); setRenamingName(null) }
  }, [open])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-foreground/80 hover:text-foreground transition-colors cursor-pointer"
      >
        <span className="max-w-[80px] truncate font-medium">{currentName || "Layout"}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 z-50 rounded-xl border border-white/10 bg-[oklch(0.15_0.004_264)] shadow-2xl overflow-hidden">
          {/* Presets */}
          <div className="px-3 pt-3 pb-1">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Presets</p>
            {LAYOUT_PRESETS.map(preset => (
              <button
                key={preset.name}
                onClick={() => { onApply(preset); setOpen(false) }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-white/8 transition-colors cursor-pointer border-0 bg-transparent text-xs"
              >
                {currentName === preset.name && <Check className="w-3 h-3 text-indigo-400 shrink-0" />}
                <span className={`${currentName === preset.name ? "text-indigo-300 font-medium" : "text-foreground/80"}`}>{preset.name}</span>
              </button>
            ))}
          </div>

          {/* User saved */}
          {(savedLayouts.length > 0 || !saving) && (
            <div className="px-3 py-1 border-t border-white/10">
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 mt-1">My Layouts</p>
              {savedLayouts.map(layout => (
                <div key={layout.name} className="group flex items-center gap-1 rounded-lg hover:bg-white/8 transition-colors pl-2">
                  {renamingName === layout.name ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && renameValue.trim()) { onRename(layout.name, renameValue.trim()); setRenamingName(null) }
                        if (e.key === "Escape") setRenamingName(null)
                      }}
                      className="flex-1 bg-transparent text-xs text-foreground outline-none py-1.5 border-b border-indigo-500/50"
                    />
                  ) : (
                    <button
                      onClick={() => { onApply(layout); setOpen(false) }}
                      className="flex-1 text-left py-1.5 text-xs text-foreground/80 cursor-pointer border-0 bg-transparent"
                    >
                      {layout.name}
                    </button>
                  )}
                  <div className="hidden group-hover:flex items-center gap-0.5 shrink-0 pr-1">
                    <button
                      onClick={() => { setRenamingName(layout.name); setRenameValue(layout.name) }}
                      className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors border-0 bg-transparent cursor-pointer"
                    >
                      <Edit3 className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={() => onDelete(layout.name)}
                      className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors border-0 bg-transparent cursor-pointer"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="p-2 border-t border-white/10 space-y-1">
            {saving ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && saveName.trim()) { onSaveCurrent(saveName.trim()); setSaving(false); setOpen(false) }
                    if (e.key === "Escape") setSaving(false)
                  }}
                  placeholder="Layout name..."
                  className="flex-1 bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-white/20"
                />
                <button
                  onClick={() => { if (saveName.trim()) { onSaveCurrent(saveName.trim()); setSaving(false); setOpen(false) } }}
                  className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-medium border-0 cursor-pointer transition-colors"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setSaveName(""); setSaving(true) }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-white/8 transition-colors cursor-pointer border-0 bg-transparent text-xs text-muted-foreground hover:text-foreground"
              >
                <Plus className="w-3 h-3" /> Save Current Layout
              </button>
            )}
            <button
              onClick={() => { onReset(); setOpen(false) }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-white/8 transition-colors cursor-pointer border-0 bg-transparent text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3 h-3" /> Reset to Default
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
