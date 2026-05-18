import { BadgeCheck, Star } from "lucide-react"

type VerificationType = "none" | "verified" | "official" | null | undefined

export function VerificationBadge({
  type,
  size = "sm",
}: {
  type: VerificationType
  size?: "xs" | "sm" | "md"
}) {
  if (!type || type === "none") return null

  const iconCls =
    size === "xs" ? "w-3 h-3" : size === "md" ? "w-4 h-4" : "w-3.5 h-3.5"
  const textCls =
    size === "xs" ? "text-[10px]" : size === "md" ? "text-sm" : "text-xs"
  const paddingCls =
    size === "xs" ? "px-1 py-px" : "px-1.5 py-0.5"

  if (type === "official") {
    return (
      <span
        title="Official Polymart Community"
        className={`inline-flex items-center gap-0.5 shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 font-medium ${paddingCls}`}
      >
        <span className={textCls}>Official</span>
        <Star className={`${iconCls} fill-amber-400`} />
      </span>
    )
  }

  return (
    <span
      title="Verified Community"
      className={`inline-flex items-center gap-0.5 shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 font-medium ${paddingCls}`}
    >
      <span className={textCls}>Verified</span>
      <BadgeCheck className={iconCls} />
    </span>
  )
}
