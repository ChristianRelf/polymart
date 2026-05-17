import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ClerkProvider } from "@clerk/clerk-react"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string
if (!CLERK_KEY) console.warn("[polymart] VITE_CLERK_PUBLISHABLE_KEY is not set - auth features will not work.")

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider publishableKey={CLERK_KEY ?? ""}>
      <ThemeProvider defaultTheme="dark" storageKey="polymart-theme">
        <App />
      </ThemeProvider>
    </ClerkProvider>
  </StrictMode>
)
