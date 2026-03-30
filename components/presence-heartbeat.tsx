"use client"

import { useEffect } from 'react'

import { touchMyPresence } from '@/lib/profile'

export function PresenceHeartbeat() {
  useEffect(() => {
    let mounted = true

    const touch = async () => {
      try {
        await touchMyPresence()
      } catch {
        // no-op: presence is best-effort
      }
    }

    const onVisible = () => {
      if (!mounted) return
      if (document.visibilityState === 'visible') {
        void touch()
      }
    }

    void touch()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    const id = window.setInterval(() => {
      void touch()
    }, 60_000)

    return () => {
      mounted = false
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [])

  return null
}

