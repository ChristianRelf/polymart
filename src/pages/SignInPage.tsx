import { SignIn } from "@clerk/clerk-react"

export default function SignInPage() {
  return (
      <SignIn
        routing="virtual"
        signUpUrl="/#/sign-up"
        afterSignInUrl="/#/dashboard"
        appearance={{
          elements: {
            card: "shadow-2xl rounded-2xl",
            rootBox: "w-full max-w-sm",
          },
        }}
      />
    </div>
  )
}
