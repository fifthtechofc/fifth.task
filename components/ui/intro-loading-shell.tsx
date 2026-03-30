'use client'

import { useState } from 'react'

import { IntroLogoScreen } from '@/components/ui/intro-logo-screen'
import { getSimpleIntroDurationMs } from '@/lib/intro-progress-timing'
import { cn } from '@/lib/utils'

/** Mesma composição da intro simples (logo + barra) durante hidratação ou fallback de `dynamic()`. */
export function IntroLoadingShell({ className }: { className?: string }) {
  const [reduceMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  return (
    <IntroLogoScreen
      className={cn(className)}
      durationMs={getSimpleIntroDurationMs(reduceMotion)}
    />
  )
}
