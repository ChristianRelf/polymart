import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Loader2, AlertCircle, Shield, Trash2, Plus, ChevronLeft,
  Settings, Flag, FileText, UserX, Clock, CheckCircle,
  RotateCcw, EyeOff, Camera, X, Tag, Lock,
} from "lucide-react"
import { useAccount } from "@/hooks/useAccount"
import type { Route } from "@/App"

interface Props {
  slug: string
  onNavigate: (r: Route) => void
  onNavigateToCommunity: (slug: string) => void
}

type Tab = "queue" | "bans" | "log" | "settings" | "rules" | "moderators"

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const ACTION_LABELS: Record<string, string> = {
  ban: "Banned user",
  unban: "Unbanned user",
  pin: "Pinned post",
  unpin: "Unpinned post",
  remove_post: "Removed post",
  restore_post: "Restored post",
  add_mod: "Added moderator",
  remove_mod: "Removed moderator",
}

export default function SubCommunityModPage({ slug, onNavigate, onNavigateToCommunity }: Props) {
  const {
    getCommunity, getModQueue, getCommunityBans, getModLog,
    removePost, restorePost, unbanUser, banUser,
    updateCommunity, deleteCommunity,
    getCommunityRules, createCommunityRule, deleteCommunityRule,
    addModerator, removeModerator,
    uploadCommunityIcon, uploadCommunityBanner,
    getAllowlist, addToAllowlist, removeFromAllowlist,
  } = useAccount()

  type PostTag = { key: string; label: string; color: string }

  const [tab, setTab] = useState<Tab>("queue")
  const [community, setCommunity] = useState<{
    id: number; display_name: string; description: string | null
    icon_url: string | null; banner_url: string | null
    user_role: string | null; owner_clerk_id: string
    verification_type: string | null
    post_permission: "everyone" | "members" | "chosen"
    post_tags: PostTag[] | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Queue
  const [reports, setReports] = useState<{ id: number; post_id: number; title: string; reason: string; reporter_name: string; created_at: string; post_author_clerk_id: string }[]>([])
  const [queueLoading, setQueueLoading] = useState(false)

  // Bans
  const [bans, setBans] = useState<{ clerk_id: string; display_name: string; reason: string | null; banned_by_name: string; banned_at: string }[]>([])
  const [bansLoading, setBansLoading] = useState(false)
  const [banClerkId, setBanClerkId] = useState("")
  const [banReason, setBanReason] = useState("")
  const [banLoading, setBanLoading] = useState(false)

  // Mod log
  const [log, setLog] = useState<{ id: number; action_type: string; mod_name: string; target_name: string | null; post_title: string | null; details: string | null; created_at: string }[]>([])
  const [logLoading, setLogLoading] = useState(false)

  // Settings
  const [editName, setEditName] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [postPermission, setPostPermission] = useState<"everyone" | "members" | "chosen">("members")
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState("")

  // Post tags
  const [postTags, setPostTags] = useState<PostTag[]>([])
  const [newTagKey, setNewTagKey] = useState("")
  const [newTagLabel, setNewTagLabel] = useState("")
  const [newTagColor, setNewTagColor] = useState("zinc")
  const [tagsSaving, setTagsSaving] = useState(false)
  const [tagsMsg, setTagsMsg] = useState("")

  // Allowlist
  const [allowlist, setAllowlist] = useState<{ clerk_id: string; display_name: string }[]>([])
  const [allowlistLoading, setAllowlistLoading] = useState(false)
  const [newAllowlistId, setNewAllowlistId] = useState("")
  const [allowlistAdding, setAllowlistAdding] = useState(false)

  // Rules
  const [rules, setRules] = useState<{ id: number; title: string; description: string | null; display_order: number }[]>([])
  const [rulesLoading, setRulesLoading] = useState(false)
  const [newRuleTitle, setNewRuleTitle] = useState("")
  const [newRuleDesc, setNewRuleDesc] = useState("")
  const [addingRule, setAddingRule] = useState(false)

  // Moderators
  const [mods, setMods] = useState<{ clerk_id: string; role: string; display_name: string; avatar_url: string | null }[]>([])
  const [newModId, setNewModId] = useState("")
  const [modLoading, setModLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    getCommunity(slug).then(data => {
      if (!data.user_role || (data.user_role !== "moderator" && data.user_role !== "owner")) {
        onNavigateToCommunity(slug)
        return
      }
      setCommunity(data)
      setEditName(data.display_name)
      setEditDesc(data.description ?? "")
      setPostPermission(data.post_permission ?? "members")
      setPostTags(data.post_tags ?? [])
      setMods(data.moderators ?? [])
    }).catch(() => setError("Community not found")).finally(() => setLoading(false))
  }, [slug])

  const fetchQueue = useCallback(async () => {
    if (!community) return
    setQueueLoading(true)
    try { const d = await getModQueue(slug); setReports(d.reports ?? []) } catch { /* silent */ } finally { setQueueLoading(false) }
  }, [community, slug])

  const fetchBans = useCallback(async () => {
    if (!community) return
    setBansLoading(true)
    try { const d = await getCommunityBans(slug); setBans(d.bans ?? []) } catch { /* silent */ } finally { setBansLoading(false) }
  }, [community, slug])

  const fetchLog = useCallback(async () => {
    if (!community) return
    setLogLoading(true)
    try { const d = await getModLog(slug); setLog(d.log ?? []) } catch { /* silent */ } finally { setLogLoading(false) }
  }, [community, slug])

  const fetchRules = useCallback(async () => {
    setRulesLoading(true)
    try { const d = await getCommunityRules(slug); setRules(d.rules ?? []) } catch { /* silent */ } finally { setRulesLoading(false) }
  }, [slug])

  useEffect(() => {
    if (!community) return
    if (tab === "queue") fetchQueue()
    else if (tab === "bans") fetchBans()
    else if (tab === "log") fetchLog()
    else if (tab === "rules") fetchRules()
    else if (tab === "settings" && postPermission === "chosen") fetchAllowlist()
  }, [tab, community])

  useEffect(() => {
    if (tab === "settings" && postPermission === "chosen") fetchAllowlist()
  }, [postPermission])

  async function handleRemovePost(postId: number) {
    if (!window.confirm("Remove this post?")) return
    await removePost(slug, postId)
    setReports(prev => prev.filter(r => r.post_id !== postId))
  }

  async function handleRestorePost(postId: number) {
    await restorePost(slug, postId)
    setReports(prev => prev.filter(r => r.post_id !== postId))
  }

  async function handleUnban(clerkId: string) {
    if (!window.confirm("Unban this user?")) return
    await unbanUser(slug, clerkId)
    setBans(prev => prev.filter(b => b.clerk_id !== clerkId))
  }

  async function handleBan() {
    if (!banClerkId.trim()) return
    setBanLoading(true)
    try {
      await banUser(slug, banClerkId.trim(), banReason.trim())
      setBanClerkId(""); setBanReason("")
      fetchBans()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to ban user")
    } finally {
      setBanLoading(false)
    }
  }

  async function handleSaveSettings() {
    setSettingsSaving(true); setSettingsMsg("")
    try {
      await updateCommunity(slug, { display_name: editName, description: editDesc, post_permission: postPermission })
      setSettingsMsg("Saved!")
      setTimeout(() => setSettingsMsg(""), 2000)
    } catch { setSettingsMsg("Failed to save") } finally { setSettingsSaving(false) }
  }

  const fetchAllowlist = useCallback(async () => {
    setAllowlistLoading(true)
    try { const d = await getAllowlist(slug); setAllowlist(d.allowlist ?? []) } catch { /* silent */ } finally { setAllowlistLoading(false) }
  }, [slug])

  async function handleAddToAllowlist() {
    if (!newAllowlistId.trim()) return
    setAllowlistAdding(true)
    try {
      await addToAllowlist(slug, newAllowlistId.trim())
      setNewAllowlistId("")
      fetchAllowlist()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to add user")
    } finally { setAllowlistAdding(false) }
  }

  async function handleRemoveFromAllowlist(clerkId: string) {
    await removeFromAllowlist(slug, clerkId)
    setAllowlist(prev => prev.filter(u => u.clerk_id !== clerkId))
  }

  function handleAddTag() {
    const key = newTagKey.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-")
    if (!key || !newTagLabel.trim()) return
    if (postTags.length >= 8) { alert("Maximum 8 tags allowed"); return }
    if (postTags.find(t => t.key === key)) { alert("Tag key already exists"); return }
    setPostTags(prev => [...prev, { key, label: newTagLabel.trim(), color: newTagColor }])
    setNewTagKey(""); setNewTagLabel(""); setNewTagColor("zinc")
  }

  async function handleSaveTags() {
    setTagsSaving(true); setTagsMsg("")
    try {
      await updateCommunity(slug, { post_tags: postTags.length > 0 ? postTags : null })
      setTagsMsg("Saved!")
      setTimeout(() => setTagsMsg(""), 2000)
    } catch { setTagsMsg("Failed to save") } finally { setTagsSaving(false) }
  }

  async function handleDeleteCommunity() {
    if (!window.confirm(`Delete "${community?.display_name}" and all its data? This cannot be undone.`)) return
    if (!window.confirm("Are you absolutely sure?")) return
    try { await deleteCommunity(slug); onNavigate("communities") } catch { alert("Failed to delete") }
  }

  async function handleAddRule() {
    if (!newRuleTitle.trim()) return
    setAddingRule(true)
    try {
      await createCommunityRule(slug, { title: newRuleTitle.trim(), description: newRuleDesc.trim() || undefined })
      setNewRuleTitle(""); setNewRuleDesc("")
      fetchRules()
    } catch { /* silent */ } finally { setAddingRule(false) }
  }

  async function handleDeleteRule(id: number) {
    if (!window.confirm("Delete this rule?")) return
    await deleteCommunityRule(slug, id)
    setRules(prev => prev.filter(r => r.id !== id))
  }

  async function handleAddMod() {
    if (!newModId.trim()) return
    setModLoading(true)
    try {
      await addModerator(slug, newModId.trim())
      setNewModId("")
      const d = await getCommunity(slug)
      setMods(d.moderators ?? [])
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to add moderator")
    } finally { setModLoading(false) }
  }

  async function handleRemoveMod(clerkId: string) {
    if (!window.confirm("Remove this moderator?")) return
    await removeModerator(slug, clerkId)
    setMods(prev => prev.filter(m => m.clerk_id !== clerkId))
  }

  async function handleUploadIcon(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = ""
    if (!file) return
    try { await uploadCommunityIcon(slug, file); const d = await getCommunity(slug); setCommunity(d) } catch { alert("Upload failed") }
  }

  async function handleUploadBanner(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = ""
    if (!file) return
    try { await uploadCommunityBanner(slug, file); const d = await getCommunity(slug); setCommunity(d) } catch { alert("Upload failed") }
  }

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
  if (error || !community) return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <AlertCircle className="w-8 h-8 mx-auto mb-3 text-red-400" />
      <p className="text-sm text-muted-foreground">{error || "Not found"}</p>
    </div>
  )

  const isOwner = community.user_role === "owner"

  const TABS: [Tab, string, React.ReactNode][] = [
    ["queue",      "Reports",    <Flag className="w-3.5 h-3.5" />],
    ["bans",       "Bans",       <UserX className="w-3.5 h-3.5" />],
    ["log",        "Mod Log",    <Clock className="w-3.5 h-3.5" />],
    ["rules",      "Rules",      <FileText className="w-3.5 h-3.5" />],
    ["moderators", "Moderators", <Shield className="w-3.5 h-3.5" />],
    ["settings",   "Settings",   <Settings className="w-3.5 h-3.5" />],
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

      {/* Header */}
      <div>
        <button onClick={() => onNavigateToCommunity(slug)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer bg-transparent border-0 transition-colors mb-3">
          <ChevronLeft className="w-3.5 h-3.5" />Back to c/{slug}
        </button>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-400" />
          <h1 className="text-base font-semibold text-foreground">Mod Tools — {community.display_name}</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border pb-0">
        {TABS.map(([t, label, icon]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 text-xs px-3 py-2 border-b-2 transition-colors cursor-pointer bg-transparent border-x-0 border-t-0 -mb-px ${
              tab === t ? "border-b-foreground text-foreground" : "border-b-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {/* Reports Queue */}
      {tab === "queue" && (
        <div className="space-y-3">
          {queueLoading ? <div className="flex justify-center py-8"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
          : reports.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <CheckCircle className="w-7 h-7 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No pending reports</p>
            </div>
          ) : reports.map(r => (
            <Card key={r.id} className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Reported by <span className="text-foreground/70">{r.reporter_name}</span> as <Badge variant="outline" className="text-[10px] ml-1">{r.reason}</Badge>
                    </p>
                    <p className="text-[11px] text-muted-foreground/50 mt-1">{timeAgo(r.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleRestorePost(r.post_id)}>
                      <RotateCcw className="w-3 h-3" />Dismiss
                    </Button>
                    <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" onClick={() => handleRemovePost(r.post_id)}>
                      <EyeOff className="w-3 h-3" />Remove
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Bans */}
      {tab === "bans" && (
        <div className="space-y-4">
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-3">Ban a User</p>
              <div className="flex gap-2 flex-wrap">
                <Input value={banClerkId} onChange={e => setBanClerkId(e.target.value)} placeholder="User's Clerk ID" className="h-8 text-xs flex-1 min-w-40" />
                <Input value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Reason (optional)" className="h-8 text-xs flex-1 min-w-40" />
                <Button size="sm" onClick={handleBan} disabled={banLoading || !banClerkId.trim()} className="h-8 gap-1">
                  {banLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Plus className="w-3 h-3" />Ban</>}
                </Button>
              </div>
            </CardContent>
          </Card>

          {bansLoading ? <div className="flex justify-center py-8"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
          : bans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No users are currently banned.</div>
          ) : (
            <div className="space-y-2">
              {bans.map(b => (
                <Card key={b.clerk_id} className="border-border bg-card">
                  <CardContent className="p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{b.display_name}</p>
                      {b.reason && <p className="text-xs text-muted-foreground">Reason: {b.reason}</p>}
                      <p className="text-[11px] text-muted-foreground/50">Banned by {b.banned_by_name} · {timeAgo(b.banned_at)}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleUnban(b.clerk_id)} className="h-7 text-xs shrink-0">Unban</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mod Log */}
      {tab === "log" && (
        <div>
          {logLoading ? <div className="flex justify-center py-8"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
          : log.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">No mod actions recorded yet.</div>
          ) : (
            <div className="space-y-2">
              {log.map(entry => (
                <div key={entry.id} className="flex items-start gap-3 text-xs py-2 border-b border-border/30 last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <span className="font-medium text-foreground">{entry.mod_name}</span>
                    <span className="text-muted-foreground"> {ACTION_LABELS[entry.action_type] ?? entry.action_type}</span>
                    {entry.target_name && <span className="text-foreground/70"> {entry.target_name}</span>}
                    {entry.post_title && <span className="text-muted-foreground"> "{entry.post_title}"</span>}
                    {entry.details && <span className="text-muted-foreground/60"> — {entry.details}</span>}
                  </div>
                  <span className="text-muted-foreground/40 shrink-0">{timeAgo(entry.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rules */}
      {tab === "rules" && (
        <div className="space-y-4">
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-3">Add Rule</p>
              <div className="space-y-2">
                <Input value={newRuleTitle} onChange={e => setNewRuleTitle(e.target.value)} placeholder="Rule title" maxLength={128} className="h-8 text-xs" />
                <Textarea value={newRuleDesc} onChange={e => setNewRuleDesc(e.target.value)} placeholder="Description (optional)" rows={2} className="text-xs resize-none" />
                <Button size="sm" onClick={handleAddRule} disabled={addingRule || !newRuleTitle.trim()} className="gap-1">
                  {addingRule ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Plus className="w-3 h-3" />Add Rule</>}
                </Button>
              </div>
            </CardContent>
          </Card>

          {rulesLoading ? <div className="flex justify-center py-8"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
          : rules.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">No rules added yet.</div>
          ) : (
            <div className="space-y-2">
              {rules.map((rule, i) => (
                <Card key={rule.id} className="border-border bg-card">
                  <CardContent className="p-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{i + 1}. {rule.title}</p>
                      {rule.description && <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>}
                    </div>
                    <button onClick={() => handleDeleteRule(rule.id)} className="text-muted-foreground hover:text-red-400 cursor-pointer bg-transparent border-0 transition-colors shrink-0 mt-0.5">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Moderators */}
      {tab === "moderators" && (
        <div className="space-y-4">
          {isOwner && (
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-3">Add Moderator</p>
                <div className="flex gap-2">
                  <Input value={newModId} onChange={e => setNewModId(e.target.value)} placeholder="User's Clerk ID" className="h-8 text-xs flex-1" />
                  <Button size="sm" onClick={handleAddMod} disabled={modLoading || !newModId.trim()} className="h-8 gap-1">
                    {modLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Plus className="w-3 h-3" />Add</>}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground/50 mt-1.5">User must already be a member of the community.</p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {mods.map(m => (
              <Card key={m.clerk_id} className="border-border bg-card">
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {m.avatar_url
                      ? <img src={m.avatar_url} alt="" loading="lazy" decoding="async" className="w-8 h-8 rounded-full object-cover" />
                      : <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">{m.display_name[0]?.toUpperCase()}</div>
                    }
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.display_name}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">{m.role}</p>
                    </div>
                  </div>
                  {isOwner && m.role === "moderator" && (
                    <Button size="sm" variant="outline" onClick={() => handleRemoveMod(m.clerk_id)} className="h-7 text-xs shrink-0">Remove</Button>
                  )}
                  {m.role === "owner" && <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-500"><Shield className="w-2.5 h-2.5 mr-1" />Owner</Badge>}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Settings */}
      {tab === "settings" && (
        <div className="space-y-4">
          <Card className="border-border bg-card">
            <CardContent className="p-4 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">Community Info</p>

              {community.verification_type === "verified" || community.verification_type === "official" ? (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Display Name</label>
                  <p className="text-sm text-foreground">{community.display_name}</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-1">Community name can only be changed by Polymart staff for verified communities.</p>
                </div>
              ) : (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Display Name</label>
                  <Input value={editName} onChange={e => setEditName(e.target.value)} maxLength={128} className="h-9 text-sm" />
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} maxLength={500} rows={3} className="text-sm resize-none" />
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleSaveSettings} disabled={settingsSaving} className="gap-1">
                  {settingsSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save Changes"}
                </Button>
                {settingsMsg && <span className="text-xs text-emerald-400">{settingsMsg}</span>}
              </div>
            </CardContent>
          </Card>

          {isOwner && (
            <Card className="border-border bg-card">
              <CardContent className="p-4 space-y-4">
                <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1.5"><Lock className="w-3 h-3" />Posting Access</p>
                <div className="space-y-2">
                  {(["everyone", "members", "chosen"] as const).map(opt => (
                    <label key={opt} className="flex items-start gap-2.5 cursor-pointer">
                      <input type="radio" name="post_permission" value={opt} checked={postPermission === opt} onChange={() => setPostPermission(opt)} className="mt-0.5 accent-foreground" />
                      <div>
                        <p className="text-sm text-foreground font-medium">
                          {opt === "everyone" ? "Everyone" : opt === "members" ? "Members only" : "Approved users only"}
                        </p>
                        <p className="text-[11px] text-muted-foreground/60">
                          {opt === "everyone" ? "Any signed-in user can post"
                            : opt === "members" ? "Only community members can post"
                            : "Only users on the allowlist can post (plus mods and owner)"}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>

                {postPermission === "chosen" && (
                  <div className="pt-2 border-t border-border/30 space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">Posting Allowlist</p>
                    <div className="flex gap-2">
                      <Input value={newAllowlistId} onChange={e => setNewAllowlistId(e.target.value)} placeholder="User's Clerk ID" className="h-8 text-xs flex-1" />
                      <Button size="sm" onClick={handleAddToAllowlist} disabled={allowlistAdding || !newAllowlistId.trim()} className="h-8 gap-1 shrink-0">
                        {allowlistAdding ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Plus className="w-3 h-3" />Add</>}
                      </Button>
                    </div>
                    {allowlistLoading ? (
                      <div className="flex justify-center py-3"><Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" /></div>
                    ) : allowlist.length === 0 ? (
                      <p className="text-xs text-muted-foreground/50 italic">No users on the allowlist yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {allowlist.map(u => (
                          <div key={u.clerk_id} className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-foreground/80">{u.display_name}</span>
                            <button type="button" aria-label={`Remove ${u.display_name} from allowlist`} onClick={() => handleRemoveFromAllowlist(u.clerk_id)} className="text-muted-foreground hover:text-red-400 cursor-pointer bg-transparent border-0 transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {isOwner && (
            <Card className="border-border bg-card">
              <CardContent className="p-4 space-y-4">
                <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1.5"><Tag className="w-3 h-3" />Post Tags</p>
                <p className="text-[11px] text-muted-foreground/60">Custom tags replace the default General / Trade / Analysis / Question tags for this community. Leave empty to use defaults.</p>

                <div className="space-y-2">
                  {postTags.map(t => (
                    <div key={t.key} className="flex items-center gap-2 text-xs">
                      <span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${
                        t.color === "emerald" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : t.color === "blue"    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        : t.color === "amber"   ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        : t.color === "rose"    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        : t.color === "violet"  ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                        : t.color === "orange"  ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                        : t.color === "sky"     ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                        : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                      }`}>{t.label}</span>
                      <span className="text-muted-foreground/50 font-mono">{t.key}</span>
                      <button type="button" aria-label={`Remove ${t.label} tag`} onClick={() => setPostTags(prev => prev.filter(x => x.key !== t.key))} className="ml-auto text-muted-foreground hover:text-red-400 cursor-pointer bg-transparent border-0 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {postTags.length === 0 && <p className="text-[11px] text-muted-foreground/50 italic">Using default tags.</p>}
                </div>

                {postTags.length < 8 && (
                  <div className="pt-2 border-t border-border/30 space-y-2">
                    <p className="text-xs text-muted-foreground">Add tag</p>
                    <div className="flex gap-2 flex-wrap">
                      <Input value={newTagKey} onChange={e => setNewTagKey(e.target.value)} placeholder="key (e.g. signal)" className="h-8 text-xs w-32" maxLength={32} />
                      <Input value={newTagLabel} onChange={e => setNewTagLabel(e.target.value)} placeholder="Label" className="h-8 text-xs w-28" maxLength={32} />
                      <select aria-label="Tag color" value={newTagColor} onChange={e => setNewTagColor(e.target.value)} className="h-8 text-xs rounded-md border border-border bg-background px-2 cursor-pointer">
                        {["zinc","emerald","blue","amber","rose","violet","orange","sky"].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <Button size="sm" type="button" onClick={handleAddTag} disabled={!newTagKey.trim() || !newTagLabel.trim()} className="h-8 gap-1 shrink-0">
                        <Plus className="w-3 h-3" />Add
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" onClick={handleSaveTags} disabled={tagsSaving} className="gap-1">
                    {tagsSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save Tags"}
                  </Button>
                  {tagsMsg && <span className="text-xs text-emerald-400">{tagsMsg}</span>}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-border bg-card">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">Images</p>
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Community Icon (≤ 1 MB, square)</p>
                  {community.icon_url && <img src={community.icon_url} alt="icon" className="w-12 h-12 rounded-full object-cover border border-border mb-2" />}
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                    <Camera className="w-3.5 h-3.5" />Upload icon
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleUploadIcon} />
                  </label>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Banner Image (≤ 3 MB)</p>
                  {community.banner_url && <img src={community.banner_url} alt="banner" className="w-full h-16 object-cover rounded-lg border border-border mb-2" />}
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                    <Camera className="w-3.5 h-3.5" />Upload banner
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleUploadBanner} />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {isOwner && (
            <Card className="border-red-500/20 bg-red-500/5">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Danger Zone</p>
                <p className="text-xs text-muted-foreground mb-3">Deleting this community removes all memberships, rules, and mod history. Posts will remain on the general feed.</p>
                <Button size="sm" variant="destructive" onClick={handleDeleteCommunity} className="gap-1">
                  <Trash2 className="w-3.5 h-3.5" />Delete Community
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
