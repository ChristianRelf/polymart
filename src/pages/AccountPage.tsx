import { useState, useEffect, useCallback } from "react"
import { useUser } from "@clerk/clerk-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Loader2, AlertCircle, CheckCircle2, Camera, CreditCard, ShieldCheck } from "lucide-react"
import { useAccount } from "@/hooks/useAccount"
import type { Route } from "@/App"

interface UserProfile {
  display_name: string | null
  email: string | null
  tier: "basic" | "premium"
  tierLimits: {
    label: string
    maxPortfolios: number
    maxPositions: number
    maxWatchlists: number
    maxWatchlistItems: number
    startingCash: number
    canExportHistory: boolean
    assets: Record<string, boolean>
  }
  stripe_subscription_id: string | null
  tier_expires_at: string | null
}

interface Props {
  onNavigate: (r: Route) => void
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

export default function AccountPage({ onNavigate }: Props) {
  const { user } = useUser()
  const { getMe, updateMe, getBilling, startCheckout } = useAccount()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [billing, setBilling] = useState<{ portalUrl: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit state
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<"saved" | "error" | null>(null)

  // Avatar upload
  const [avatarUploading, setAvatarUploading] = useState(false)

  // Billing
  const [checkingOut, setCheckingOut] = useState(false)

  const load = useCallback(async () => {
    try {
      const [me, bill] = await Promise.all([getMe(), getBilling().catch(() => null)])
      setProfile(me)
      setDisplayName(me.display_name ?? "")
      setBio(me.bio ?? "")
      if (bill) setBilling(bill)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load account")
    } finally {
      setLoading(false)
    }
  }, [getMe, getBilling])

  useEffect(() => { load() }, [load])

  async function handleSaveProfile() {
    setSaving(true)
    setSaveResult(null)
    try {
      await updateMe({ display_name: displayName, bio })
      setSaveResult("saved")
      setTimeout(() => setSaveResult(null), 3000)
    } catch {
      setSaveResult("error")
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setAvatarUploading(true)
    try {
      await user.setProfileImage({ file })
    } finally {
      setAvatarUploading(false)
      e.target.value = ""
    }
  }

  async function handleUpgrade() {
    setCheckingOut(true)
    try {
      const { url } = await startCheckout()
      window.location.href = url
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to start checkout")
      setCheckingOut(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-12">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error ?? "Failed to load account"}</span>
        </div>
      </div>
    )
  }

  const isPremium = profile.tier === "premium"
  const limits = profile.tierLimits

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-foreground">Account Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">{profile.email}</p>
      </div>

      {/* Profile */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={user?.imageUrl}
                alt="Avatar"
                className="w-16 h-16 rounded-full object-cover border border-border"
              />
              <label
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center cursor-pointer hover:bg-accent transition-colors"
                title="Change photo"
              >
                {avatarUploading
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Camera className="w-3 h-3" />
                }
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>
            <div>
              <p className="text-sm font-medium">{user?.fullName || "—"}</p>
              <p className="text-xs text-muted-foreground">Click the camera to change your photo</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Display Name</label>
              <Input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Your name"
                maxLength={128}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Bio</label>
              <Input
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Short bio"
                maxLength={500}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button size="sm" onClick={handleSaveProfile} disabled={saving} className="h-8">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Changes"}
            </Button>
            {saveResult === "saved" && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Saved
              </span>
            )}
            {saveResult === "error" && <span className="text-xs text-destructive">Save failed</span>}
          </div>
        </CardContent>
      </Card>

      {/* Plan */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-muted-foreground" />
              Plan &amp; Limits
            </span>
            <Badge variant={isPremium ? "default" : "secondary"}>{limits.label}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Portfolios", value: limits.maxPortfolios },
              { label: "Positions / Portfolio", value: limits.maxPositions },
              { label: "Starting Cash", value: fmt(limits.startingCash) },
              { label: "Watchlists", value: limits.maxWatchlists },
              { label: "Watchlist Items", value: limits.maxWatchlistItems },
              { label: "Export History", value: limits.canExportHistory ? "Yes" : "No" },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-md bg-muted/30 p-2.5">
                <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                <p className="text-sm font-semibold">{value}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Asset Access</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(limits.assets).map(([type, allowed]) => (
                <Badge key={type} variant={allowed ? "default" : "outline"} className="text-[10px]">
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                  {!allowed && " (Premium)"}
                </Badge>
              ))}
            </div>
          </div>

          {!isPremium && (
            <>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Upgrade to Premium</p>
                  <p className="text-xs text-muted-foreground">More portfolios, forex access, higher limits</p>
                </div>
                <Button size="sm" onClick={handleUpgrade} disabled={checkingOut} className="shrink-0 gap-1.5">
                  {checkingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
                    <><CreditCard className="w-3.5 h-3.5" /> Upgrade</>
                  )}
                </Button>
              </div>
            </>
          )}

          {isPremium && billing?.portalUrl && (
            <>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Manage Subscription</p>
                  <p className="text-xs text-muted-foreground">Update payment method, cancel, or view invoices</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(billing.portalUrl!, "_blank")}
                  className="shrink-0"
                >
                  Manage
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <Card className="bg-card border-border">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" size="sm" onClick={() => onNavigate("dashboard")}>
              My Portfolios
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("help")}>
              Help &amp; Support
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
