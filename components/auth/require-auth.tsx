'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabase'
import { isMyDeviceSessionActive } from '@/lib/device-session'

type RequireAuthProps = {
  children: React.ReactNode
  redirectTo?: string
}

export function RequireAuth({ children, redirectTo = '/login' }: RequireAuthProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    let alive = true

    async function check() {
      try {
        const { data, error } = await supabase.auth.getUser()
        if (!alive) return
        if (error || !data.user) {
          const next = pathname ? `?next=${encodeURIComponent(pathname)}` : ''
          router.replace(`${redirectTo}${next}`)
          return
        }

        const active = await isMyDeviceSessionActive()
        if (!alive) return
        if (active.ok && !active.active) {
          try {
            await supabase.auth.signOut()
          } catch {
            // ignore
          }
          router.replace('/login')
          return
        }
        setReady(true)
      } catch {
        if (!alive) return
        const next = pathname ? `?next=${encodeURIComponent(pathname)}` : ''
        router.replace(`${redirectTo}${next}`)
      }
    }

    void check()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return
      if (!session?.user) {
        const next = pathname ? `?next=${encodeURIComponent(pathname)}` : ''
        router.replace(`${redirectTo}${next}`)
        return
      }
      setReady(true)
    })

    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [pathname, redirectTo, router])

  if (!ready) return null
  return <>{children}</>
}

