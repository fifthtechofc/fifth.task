'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'
import { getVapourIntroTimelineMs } from '@/lib/intro-progress-timing'

import { IntroTimedProgressBar } from '@/components/ui/intro-timed-progress-bar'

/** Tela preta com título e barra de progresso logo abaixo (carregamento do chunk / hidratação). */
export function IntroLoadingShell({
  title = 'Fifth Task',
  className,
}: {
  title?: string
  className?: string
}) {
  const [reduceMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  return (
    <div
      className={cn(
        'fixed inset-0 flex flex-col items-center justify-center gap-5 bg-black px-6',
        className,
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <h1 className="text-center text-2xl font-bold tracking-tight text-white sm:text-3xl">
        {title}
      </h1>
      <IntroTimedProgressBar
        durationMs={getVapourIntroTimelineMs(reduceMotion)}
        className="max-w-[220px]"
      />
    </div>
  )
}
