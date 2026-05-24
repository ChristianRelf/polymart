import type { SavedLayout } from "@/components/trading/types"
import { DEFAULT_LAYOUT } from "./layoutPresets"

const ACTIVE_KEY = "pm_layout_active_v4"
const SAVED_KEY  = "pm_layouts_saved_v3"
const MAX_SAVED  = 10

export function loadActiveLayout(): SavedLayout {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY)
    if (raw) return JSON.parse(raw) as SavedLayout
  } catch {}
  return DEFAULT_LAYOUT
}

export function saveActiveLayout(layout: SavedLayout): void {
  try { localStorage.setItem(ACTIVE_KEY, JSON.stringify(layout)) } catch {}
}

export function loadSavedLayouts(): SavedLayout[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY)
    if (raw) return JSON.parse(raw) as SavedLayout[]
  } catch {}
  return []
}

export function saveUserLayout(layout: SavedLayout): SavedLayout[] {
  const existing = loadSavedLayouts()
  const idx = existing.findIndex(l => l.name === layout.name)
  let updated: SavedLayout[]
  if (idx >= 0) {
    updated = existing.map((l, i) => i === idx ? layout : l)
  } else {
    updated = [...existing.slice(-(MAX_SAVED - 1)), layout]
  }
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(updated)) } catch {}
  return updated
}

export function deleteUserLayout(name: string): SavedLayout[] {
  const updated = loadSavedLayouts().filter(l => l.name !== name)
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(updated)) } catch {}
  return updated
}

export function renameUserLayout(oldName: string, newName: string): SavedLayout[] {
  const updated = loadSavedLayouts().map(l => l.name === oldName ? { ...l, name: newName } : l)
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(updated)) } catch {}
  return updated
}
