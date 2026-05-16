import { SignUp } from "@clerk/clerk-react"

export default function SignUpPage() {
  return (
      <SignUp
        routing="virtual"
        signInUrl="/#/sign-in"
        afterSignUpUrl="/#/dashboard"
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
