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
      <Star
        className={`${cls} fill-amber-400 text-amber-400 shrink-0`}
        title="Official Polymart Community"
      />
    )
  }
  return (
    <BadgeCheck
      className={`${cls} text-emerald-500 shrink-0`}
      title="Verified Community"
    />
  )
}
