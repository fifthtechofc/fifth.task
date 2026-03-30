'use client'

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'

import LinearBasic from '@/components/ui/progress-1'

export type IntroTimedProgressBarHandle = {
  /** Para o rAF e fixa 100% (fim real da intro). */
  complete: () => void
}

/**
 * Progresso por tempo isolado: re-renders só aqui, não no pai com o canvas do vapor.
 *
 * `capUntilComplete`: a barra só chega a 100% quando `ref.complete()` for chamado
 * (mesmo instante em que a intro / tela de carregamento termina), não quando o timer estimado acaba.
 */
export const IntroTimedProgressBar = forwardRef<
  IntroTimedProgressBarHandle,
  {
    durationMs: number
    className?: string
    /** Intro com vapor: trava em ~99% até o fim real (`complete()`). Shell de chunk: omitir (vai até 100% no tempo). */
    capUntilComplete?: boolean
    /** Chamado uma vez quando a barra chega a 100% por tempo (ignorado se `capUntilComplete`). */
    onComplete?: () => void
    onLight?: boolean
    size?: 'sm' | 'md'
    glow?: boolean
  }
>(function IntroTimedProgressBar(
  {
    durationMs,
    className,
    capUntilComplete = false,
    onComplete,
    onLight = false,
    size = 'sm',
    glow = false,
  },
  ref,
) {
  const [value, setValue] = useState(0)
  const rafRef = useRef(0)
  const stoppedRef = useRef(false)
  const filledRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  const capRef = useRef(capUntilComplete)
  capRef.current = capUntilComplete

  useImperativeHandle(ref, () => ({
    complete: () => {
      stoppedRef.current = true
      cancelAnimationFrame(rafRef.current)
      setValue(100)
    },
  }))

  useEffect(() => {
    stoppedRef.current = false
    filledRef.current = false
    const t0 = performance.now()
    const tick = (now: number) => {
      if (stoppedRef.current) return
      const max = capRef.current ? 99 : 100
      const p = Math.min(max, ((now - t0) / durationMs) * 100)
      setValue(p)
      if (!capRef.current && p >= max && !filledRef.current) {
        filledRef.current = true
        onCompleteRef.current?.()
        return
      }
      if (p < max && !stoppedRef.current) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [durationMs, capUntilComplete])

  return (
    <LinearBasic
      light={!onLight}
      onLight={onLight}
      size={size}
      glow={glow}
      value={value}
      className={className}
    />
  )
})

IntroTimedProgressBar.displayName = 'IntroTimedProgressBar'
