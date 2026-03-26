'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

import { IntroLoadingShell } from '@/components/ui/intro-loading-shell'
import { AUTH_INTRO_STORAGE_KEY } from '@/lib/intro-storage'

const VapourIntro = dynamic(
  () => import('@/components/ui/vapour-text-effect').then((m) => m.VapourIntro),
  {
    ssr: false,
    loading: () => <IntroLoadingShell className="z-[300]" />,
  },
)

export function AuthIntroGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<'hydrating' | 'splash' | 'done'>('hydrating')

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        if (sessionStorage.getItem(AUTH_INTRO_STORAGE_KEY) === '1') {
          setPhase('done')
        } else {
          setPhase('splash')
        }
      } catch {
        setPhase('splash')
      }
    }, 0)
    return () => clearTimeout(id)
  }, [])

  if (phase === 'hydrating') {
    return <IntroLoadingShell className="z-[300]" />
  }

  if (phase === 'splash') {
    return (
      <VapourIntro
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
