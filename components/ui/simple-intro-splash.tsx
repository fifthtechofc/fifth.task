'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { IntroLogoScreen } from '@/components/ui/intro-logo-screen'
import { getSimpleIntroDurationMs } from '@/lib/intro-progress-timing'

export function SimpleIntroSplash({
  onSequenceComplete,
  className,
  portal = true,
}: {
  onSequenceComplete?: () => void
  className?: string
  /** Renderiza no `document.body` para não ficar preso em containers/transform. */
  portal?: boolean
}) {
  const [mounted, setMounted] = useState(false)
  const [reduceMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const durationMs = getSimpleIntroDurationMs(reduceMotion)
  const doneRef = useRef(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleBarComplete = () => {
    if (doneRef.current) return
    doneRef.current = true
    onSequenceComplete?.()
  }

  const content = (
    <IntroLogoScreen
      className={className}
      durationMs={durationMs}
      onBarComplete={handleBarComplete}
    />
  )

  if (!portal) return content
  if (!mounted || typeof document === 'undefined') return content
  return createPortal(content, document.body)
}
