'use client'

import { useEffect, useState } from 'react'

import { SimpleIntroSplash } from '@/components/ui/simple-intro-splash'
import { AUTH_INTRO_STORAGE_KEY } from '@/lib/intro-storage'

export function AuthIntroGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<'splash' | 'done'>(() => {
    try {
      return sessionStorage.getItem(AUTH_INTRO_STORAGE_KEY) === '1' ? 'done' : 'splash'
    } catch {
      return 'splash'
    }
  })

  useEffect(() => {
    // cleanup: a tela do dashboard pode travar o loader no logout
    try {
      sessionStorage.removeItem('ft:forceDashboardLoader')
    } catch {
      // ignore
    }
  }, [])

  if (phase === 'splash') {
    return (
      <SimpleIntroSplash
        onSequenceComplete={() => {
          try {
            sessionStorage.setItem(AUTH_INTRO_STORAGE_KEY, '1')
          } catch {
            /* private mode / blocked storage */
          }
          setPhase('done')
        }}
      />
    )
  }

  return <>{children}</>
}
