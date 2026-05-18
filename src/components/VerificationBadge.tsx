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
  const cls =
    size === "xs" ? "w-3 h-3" : size === "md" ? "w-5 h-5" : "w-4 h-4"
  if (type === "official") {
    return (
      <span title="Official Polymart Community" className="inline-flex shrink-0">
        <Star className={`${cls} fill-amber-400 text-amber-400`} />
      </span>
    )
  }
  return (
    <span title="Verified Community" className="inline-flex shrink-0">
      <BadgeCheck className={`${cls} text-emerald-500`} />
    </span>
  )
}
