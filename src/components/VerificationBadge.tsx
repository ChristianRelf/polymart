import { BadgeCheck, Star, ShieldCheck } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type CommunityVerification = "none" | "verified" | "official" | null | undefined

export function VerificationBadge({
  type,
  size = "sm",
}: {
  type: CommunityVerification
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
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`inline-flex items-center gap-0.5 shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 font-medium ${paddingCls}`}>
              <span className={textCls}>Official</span>
              <Star className={`${iconCls} fill-amber-400`} />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">Official Polymart Community</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-0.5 shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 font-medium ${paddingCls}`}>
            <span className={textCls}>Verified</span>
            <BadgeCheck className={iconCls} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">Verified Community</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function StaffBadge({ size = "sm" }: { size?: "xs" | "sm" | "md" }) {
  const iconCls = size === "xs" ? "w-3 h-3" : size === "md" ? "w-4 h-4" : "w-3.5 h-3.5"
  const textCls = size === "xs" ? "text-[10px]" : size === "md" ? "text-sm" : "text-xs"
  const paddingCls = size === "xs" ? "px-1 py-px" : "px-1.5 py-0.5"

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-0.5 shrink-0 rounded-full border border-violet-500/40 bg-violet-500/10 text-violet-400 font-semibold ${paddingCls}`}>
            <ShieldCheck className={iconCls} />
            <span className={textCls}>Staff</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">Polymart Staff</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function UserVerifiedBadge({ size = "sm" }: { size?: "xs" | "sm" | "md" }) {
  const iconCls = size === "xs" ? "w-3 h-3" : size === "md" ? "w-4 h-4" : "w-3.5 h-3.5"

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center shrink-0">
            <BadgeCheck className={`${iconCls} text-sky-400`} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">Verified user</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
