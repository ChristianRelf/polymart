import { useEffect } from "react"
import { useAuth } from "@clerk/clerk-react"
import { Loader2 } from "lucide-react"
import type { ReactNode } from "react"

interface Props {
  children: ReactNode
  onRedirect: () => void
}

export default function ProtectedRoute({ children, onRedirect }: Props) {
  const { isSignedIn, isLoaded } = useAuth()

  // Redirect in an effect, never during render — prevents loops caused by
  // Clerk's brief isSignedIn=false window during auth transitions.
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      onRedirect()
    }
  }, [isLoaded, isSignedIn, onRedirect])

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isSignedIn) return null
  return <>{children}</>
}
