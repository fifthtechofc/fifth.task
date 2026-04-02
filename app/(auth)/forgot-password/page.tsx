'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

import { httpRequestPasswordReset } from '@/lib/auth-http'
import NeuralBackground from '@/components/ui/flow-field-background'

const AUTH_EASE = [0.22, 1, 0.36, 1] as const
const AUTH_IN_DURATION = 0.48

type AuthEnterOpts = {
  delay?: number
  x?: number
  y?: number
  scale?: number
}

function authEnterProps(
  reduceMotion: boolean | null,
  { delay = 0, x = 0, y = 0, scale = 1 }: AuthEnterOpts,
) {
  if (reduceMotion) {
    return { initial: false as const }
  }
  const initial: Record<string, number | string> = {
    opacity: 0,
    filter: 'blur(10px)',
  }
  if (x) initial.x = x
  if (y) initial.y = y
  if (scale !== 1) initial.scale = scale
  return {
    initial,
    animate: { opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)' },
    transition: { duration: AUTH_IN_DURATION, delay, ease: AUTH_EASE },
  }
}

interface AppInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  icon?: React.ReactNode
}

function AppInput({ label, icon, ...rest }: AppInputProps) {
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = React.useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLInputElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  return (
    <div className="relative w-full min-w-[200px]">
      {label && (
        <label className="mb-2 block text-sm text-[var(--color-text-primary)]">{label}</label>
      )}

      <div className="relative w-full">
        <input
          className="peer relative z-10 h-12 w-full min-h-12 rounded-md border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-center font-light text-[var(--color-text-primary)] outline-none drop-shadow-sm transition-all duration-200 ease-in-out placeholder:font-medium placeholder:text-[var(--color-text-secondary)] focus:bg-[var(--color-bg)] disabled:cursor-not-allowed disabled:opacity-60"
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          {...rest}
        />

        {isHovering && (
          <>
            <div
              className="pointer-events-none absolute top-0 left-0 right-0 z-20 h-[2px] overflow-hidden rounded-t-md"
              style={{
                background: `radial-gradient(30px circle at ${mousePosition.x}px 0px, rgba(255,255,255,0.9) 0%, transparent 70%)`,
              }}
            />
            <div
              className="pointer-events-none absolute right-0 bottom-0 left-0 z-20 h-[2px] overflow-hidden rounded-b-md"
              style={{
                background: `radial-gradient(30px circle at ${mousePosition.x}px 2px, rgba(255,255,255,0.9) 0%, transparent 70%)`,
              }}
            />
          </>
        )}

        {icon && <div className="absolute top-1/2 right-3 z-20 -translate-y-1/2">{icon}</div>}
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  const reduceMotion = useReducedMotion()
  const [email, setEmail] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [info, setInfo] = React.useState<string | null>(null)

  const [panelMouse, setPanelMouse] = React.useState({ x: 0, y: 0 })
  const [panelHover, setPanelHover] = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)

    const trimmed = email.trim()
    if (!trimmed) {
      setError('Informe seu e-mail.')
      return
    }

    setLoading(true)
    try {
      const redirectTo = `${window.location.origin}/reset-password`
      const result = await httpRequestPasswordReset(trimmed, redirectTo)
      if (!result.ok) throw new Error(result.error)
      setInfo('Se este e-mail existir, enviaremos um link para redefinir sua senha.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível enviar o e-mail.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden lg:flex-row">
      {/* Left (brand) */}
      <div className="relative hidden w-full overflow-hidden lg:block lg:w-1/2 lg:flex-1">
        <div className="absolute inset-0 z-10 bg-gradient-to-br from-black/40 via-transparent to-black/40" />
        <NeuralBackground
          className="absolute inset-0 z-0"
          color="#c7d1db"
          trailOpacity={0.2}
          particleCount={650}
          speed={0.85}
        />
        <div className="relative z-20 flex h-full w-full items-center justify-center px-8">
          <Image
            src="/Logo.png"
            alt="Fifth Task"
            width={360}
            height={360}
            priority
            className="brightness-0 invert h-40 w-auto animate-floaty drop-shadow-[0_0_14px_rgba(255,255,255,0.28)] sm:h-48"
          />
        </div>
      </div>

      {/* Right (form) */}
      <div
        className="relative isolate flex w-full flex-1 flex-col items-center justify-center overflow-hidden px-6 py-10 text-center lg:w-1/2 lg:px-12 lg:py-12 xl:px-16"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          setPanelMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top })
        }}
        onMouseEnter={() => setPanelHover(true)}
        onMouseLeave={() => setPanelHover(false)}
      >
        {/* brilho fixo no canto superior direito (igual ao padrão do login) */}
        <div
          className="pointer-events-none absolute top-0 right-0 z-[4] h-[500px] w-[500px] translate-x-[38%] -translate-y-[38%] rounded-full bg-gradient-to-r from-white/25 via-white/15 to-white/20 blur-3xl"
          aria-hidden
        />
        <div
          className={`pointer-events-none absolute z-[5] h-[500px] w-[500px] rounded-full bg-gradient-to-r from-white/25 via-white/15 to-white/20 blur-3xl transition-opacity duration-200 ${
            panelHover ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            transform: `translate(${panelMouse.x - 250}px, ${panelMouse.y - 250}px)`,
            transition: 'transform 0.1s ease-out',
          }}
          aria-hidden
        />

        <form
          className="relative z-20 flex w-full max-w-[360px] flex-col items-center justify-center gap-4 text-center"
          onSubmit={handleSubmit}
          noValidate
        >
          <motion.h1
            className="text-2xl font-extrabold text-[var(--color-heading)] sm:text-3xl md:text-4xl"
            {...authEnterProps(reduceMotion, { y: 18, delay: 0 })}
          >
            Redefinir senha
          </motion.h1>

          <motion.p
            className="text-sm text-[var(--color-text-secondary)]"
            {...authEnterProps(reduceMotion, { x: 16, delay: 0.07 })}
          >
            Informe seu e-mail e enviaremos um link para criar uma nova senha.
          </motion.p>

          <AnimatePresence mode="sync">
            {(error || info) && (
              <motion.div
                key={`${error ?? ''}-${info ?? ''}`}
                className="w-full rounded-md border px-3 py-2 text-left text-sm"
                role={error ? 'alert' : 'status'}
                initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.32, ease: AUTH_EASE }}
              >
                {error && <p className="text-red-600 dark:text-red-400">{error}</p>}
                {info && !error && <p className="text-[var(--color-text-primary)]">{info}</p>}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div className="w-full" {...authEnterProps(reduceMotion, { x: -20, delay: 0.12 })}>
            <AppInput
              name="email"
              placeholder="E-mail"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </motion.div>

          <motion.div className="w-full mt-2" {...authEnterProps(reduceMotion, { y: 16, delay: 0.2 })}>
            <button
              type="submit"
              disabled={loading}
              className="group/button relative inline-flex h-12 w-full cursor-pointer items-center justify-center overflow-hidden rounded-md bg-[var(--color-border)] px-5 py-2 text-white transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg hover:shadow-[var(--color-text-primary)] disabled:pointer-events-none disabled:opacity-60"
            >
              <span className="px-2 py-1 text-sm">{loading ? 'Enviando…' : 'Enviar link'}</span>
              <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/button:duration-1000 group-hover/button:[transform:skew(-13deg)_translateX(100%)]">
                <div className="relative h-full w-8 bg-white/20" />
              </div>
            </button>
          </motion.div>

          <motion.p
            className="pt-2 text-sm text-zinc-400"
            {...authEnterProps(reduceMotion, { y: 10, delay: 0.28 })}
          >
            Voltar para{' '}
            <Link href="/login" className="font-medium text-white hover:opacity-80">
              Login
            </Link>
            .
          </motion.p>
        </form>
      </div>
    </div>
  )
}

