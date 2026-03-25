'use client'

import * as React from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { usePathname } from 'next/navigation'

/** Identidade da rota fixa no primeiro render desta instância (evita exit errado após o ref atualizar). */
function useFrozenRoute(pathname: string) {
  const ref = React.useRef<string | null>(null)
  if (ref.current === null) ref.current = pathname
  return ref.current
}

type AuthCardFlipProps = {
  pathname: string
  initialRotateY: number
  toRegister: boolean
  children: React.ReactNode
}

function AuthCardFlip({ pathname, initialRotateY, toRegister, children }: AuthCardFlipProps) {
  const reduceMotion = useReducedMotion()
  const frozenRoute = useFrozenRoute(pathname)

  const exitRotateY = frozenRoute === '/login' ? 90 : -90

  const spring = reduceMotion
    ? { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }
    : { type: 'spring' as const, stiffness: 260, damping: 28, mass: 0.55 }

  return (
    <motion.div
      className={`card flex h-[min(600px,calc(100dvh-1.5rem))] min-h-0 w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl will-change-transform sm:h-[min(600px,calc(100dvh-2rem))] lg:h-[min(600px,calc(100dvh-2rem))] lg:flex-row ${
        toRegister ? 'lg:flex-row-reverse' : ''
      }`}
      style={{
        transformOrigin: '50% 50%',
        transformStyle: 'preserve-3d',
      }}
      initial={reduceMotion ? { rotateY: 0, opacity: 1 } : { rotateY: initialRotateY, opacity: 1 }}
      animate={{ rotateY: 0, opacity: 1 }}
      exit={reduceMotion ? { rotateY: 0, opacity: 1 } : { rotateY: exitRotateY, opacity: 1 }}
      transition={{
        ...spring,
        opacity: { duration: 0.2 },
      }}
    >
      {children}
    </motion.div>
  )
}

export function AuthCardTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const prevPathRef = React.useRef<string | null>(null)

  React.useLayoutEffect(() => {
    prevPathRef.current = pathname
  }, [pathname])

  const prev = prevPathRef.current
  const toRegister = pathname === '/register'

  const initialRotateY =
    prev === null || prev === pathname ? 0 : pathname === '/register' ? -90 : 90

  return (
    <div className="relative flex h-full min-h-0 w-full max-w-full flex-1 touch-manipulation items-center justify-center overflow-visible [perspective:1400px]">
      <AnimatePresence mode="wait" initial={false}>
        <AuthCardFlip key={pathname} pathname={pathname} initialRotateY={initialRotateY} toRegister={toRegister}>
          {children}
        </AuthCardFlip>
      </AnimatePresence>
    </div>
  )
}
