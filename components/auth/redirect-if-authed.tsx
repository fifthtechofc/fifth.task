"use client"

import { usePathname, useRouter } from "next/navigation"
import * as React from "react"

import { supabase } from "@/lib/supabase"

export function RedirectIfAuthed({
  children,
  redirectTo = "/boards",
  ignorePaths = ["/reset-password", "/confirm-email", "/check-email"],
}: {
  children: React.ReactNode
  redirectTo?: string
  ignorePaths?: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [shouldRender, setShouldRender] = React.useState(true)

  React.useEffect(() => {
    let alive = true

    async function check() {
      try {
        if (
          ignorePaths.some(
            (p) => pathname === p || pathname.startsWith(`${p}/`),
          )
        ) {
          setShouldRender(true)
          return
        }

        const { data } = await supabase.auth.getUser()
        if (!alive) return
        if (data.user) {
          setShouldRender(false)
          router.replace(redirectTo)
          return
        }
        setShouldRender(true)
      } catch {
        if (!alive) return
        setShouldRender(true)
      }
    }

    void check()

    return () => {
      alive = false
    }
  }, [ignorePaths, pathname, redirectTo, router])

  return shouldRender ? children : null
}
