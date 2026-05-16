import { SignUp } from "@clerk/clerk-react"

export default function SignUpPage() {
  return (
    <div
      className="flex flex-col min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12"
      style={{
        backgroundImage: "url('/polymartbackground.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <img
        src="/polymartlogoblack.png"
        alt="Polymart"
        className="h-10 mb-8 select-none"
        draggable={false}
      />
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
