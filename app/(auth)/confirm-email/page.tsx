"use client"

import { useRouter, useSearchParams } from "next/navigation"
import * as React from "react"

import { exchangeCodeForSession, setSessionFromTokens } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

function parseHashTokens(hash: string) {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash
  const params = new URLSearchParams(raw)
  const accessToken = params.get("access_token") ?? ""
  const refreshToken = params.get("refresh_token") ?? ""
  return { accessToken, refreshToken }
}

export default function ConfirmEmailPage() {
  const router = useRouter()
  const search = useSearchParams()
  const [status, setStatus] = React.useState<"working" | "done">("working")

  React.useEffect(() => {
    let alive = true

    async function run() {
      let confirmedEmail = ""
      try {
        const code = search.get("code")
        if (code) {
          await exchangeCodeForSession(code)
        } else {
          const { accessToken, refreshToken } = parseHashTokens(
            window.location.hash || "",
          )
          if (accessToken && refreshToken) {
            await setSessionFromTokens({ accessToken, refreshToken })
          }
        }

        try {
          const { data } = await supabase.auth.getUser()
          confirmedEmail = (data.user?.email ?? "").trim()
        } catch {
          // ignore
        }
      } catch {
        // ignore (we still route to login with generic message)
      } finally {
        try {
          await supabase.auth.signOut()
        } catch {
          // ignore
        }

        if (alive) {
          setStatus("done")
          try {
            window.sessionStorage.setItem(
              "ft:authNotice",
              "E-mail confirmado. Agora você já pode entrar.",
            )
          } catch {
            // ignore
          }
          router.replace(
            `/check-email?verified=1${confirmedEmail ? `&email=${encodeURIComponent(confirmedEmail)}` : ""}`,
          )
          router.refresh()
        }
      }
    }

    void run()
    return () => {
      alive = false
    }
  }, [router, search])

  return (
    <div className="flex min-h-[calc(100vh-2rem)] w-full items-center justify-center bg-[var(--color-bg)] px-6 py-10 text-center">
      <div className="w-full max-w-[520px] rounded-2xl border border-white/10 bg-black/35 p-6 text-center backdrop-blur-sm">
        <h1 className="text-2xl font-extrabold text-[var(--color-heading)]">
          Confirmando e-mail…
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          {status === "working"
            ? "Aguarde um instante."
            : "Redirecionando para o login…"}
        </p>
      </div>
    </div>
  )
}
