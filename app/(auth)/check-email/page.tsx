"use client"

import { useSearchParams } from "next/navigation"

import EmailVerificationBlock from "@/components/ui/email-verification-block"

export default function CheckEmailPage() {
  const search = useSearchParams()
  const email = (search.get("email") ?? "").trim()
  const verified = (search.get("verified") ?? "").trim() === "1"

  return (
    <div className="relative isolate flex min-h-[calc(100vh-2rem)] w-full flex-col items-center justify-center overflow-hidden bg-[var(--color-bg)] px-6 py-10 text-center">
      <div
        className="pointer-events-none absolute top-0 right-0 z-0 h-[500px] w-[500px] translate-x-[38%] -translate-y-[38%] rounded-full bg-gradient-to-r from-white/25 via-white/15 to-white/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 z-0 h-[500px] w-[500px] -translate-x-[38%] translate-y-[38%] rounded-full bg-gradient-to-r from-white/25 via-white/15 to-white/20 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 w-full px-2">
        <EmailVerificationBlock
          email={email || undefined}
          initialVerified={verified}
        />
      </div>
    </div>
  )
}
