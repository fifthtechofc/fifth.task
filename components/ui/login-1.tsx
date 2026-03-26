'use client'

import * as React from 'react'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import NeuralBackground from '@/components/ui/flow-field-background'
import { IntroLoadingShell } from '@/components/ui/intro-loading-shell'

const VapourIntro = dynamic(
  () => import('@/components/ui/vapour-text-effect').then((m) => m.VapourIntro),
  {
    ssr: false,
    loading: () => <IntroLoadingShell className="z-[250]" />,
  },
)
import { signInWithEmail, signUpWithEmail } from '@/lib/auth'
import { cn } from '@/lib/utils'

const MIN_PASSWORD_LENGTH = 6

function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`
  }
  return null
}

function SocialInstagram({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}

function SocialLinkedin({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function SocialFacebook({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

interface AppInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  icon?: React.ReactNode
}

function AppInput({ label, icon, ...rest }: AppInputProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLInputElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  return (
    <div className="relative w-full min-w-[200px]">
      {label && <label className="mb-2 block text-sm text-[var(--color-text-primary)]">{label}</label>}

      <div className="relative w-full">
        <input
          className="peer relative z-10 h-12 w-full min-h-12 rounded-md border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-center font-light text-[var(--color-text-primary)] outline-none drop-shadow-sm transition-all duration-200 ease-in-out placeholder:font-medium placeholder:text-[var(--color-text-secondary)] focus:bg-[var(--color-bg)]"
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

type AuthLayoutProps = {
  mode?: 'login' | 'register'
}

export default function LoginOne({ mode = 'login' }: AuthLayoutProps) {
  const router = useRouter()
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [postAuthRedirect, setPostAuthRedirect] = useState<string | null>(null)

  const isRegister = mode === 'register'

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  const socialIcons = [
    { icon: <SocialInstagram />, href: '#' },
    { icon: <SocialLinkedin />, href: '#' },
    { icon: <SocialFacebook />, href: '#' },
  ]

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prevHtml
      body.style.overflow = prevBody
    }
  }, [])

  useEffect(() => {
    setError(null)
    setInfo(null)
  }, [mode])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)

    const trimmedEmail = email.trim()
    const trimmedName = name.trim()
    if (!trimmedEmail) {
      setError('Informe seu e-mail.')
      return
    }

    const pwdError = validatePassword(password)
    if (pwdError) {
      setError(pwdError)
      return
    }

    if (isRegister) {
      if (!trimmedName) {
        setError('Informe seu nome completo.')
        return
      }
      if (password !== confirmPassword) {
        setError('As senhas não coincidem.')
        return
      }
    }

    setLoading(true)
    try {
      if (isRegister) {
        const data = await signUpWithEmail(trimmedEmail, password, trimmedName)
        if (data.session) {
          router.push('/boards')
          router.refresh()
        } else {
          setInfo(
            'Conta criada. Se o projeto exigir confirmação por e-mail, verifique sua caixa de entrada.',
          )
        }
      } else {
        await signInWithEmail(trimmedEmail, password)
        setPostAuthRedirect('/boards')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível concluir.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
        {postAuthRedirect && (
          <VapourIntro
            onSequenceComplete={() => {
              router.push(postAuthRedirect)
              router.refresh()
              setPostAuthRedirect(null)
            }}
          />
        )}
        <div
          className="relative isolate flex min-h-0 w-full flex-1 flex-col overflow-hidden px-5 py-5 sm:px-6 sm:py-6 lg:max-h-full lg:w-1/2 lg:min-h-0 lg:px-12 lg:py-8 xl:px-16"
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {/* Login: brilho fixo no canto inferior esquerdo. Registro: canto superior direito. */}
          <div
            className={cn(
              'pointer-events-none absolute z-[4] h-[500px] w-[500px] rounded-full bg-gradient-to-r from-white/25 via-white/15 to-white/20 blur-3xl',
              isRegister
                ? 'top-0 right-0 translate-x-[38%] -translate-y-[38%]'
                : 'bottom-0 left-0 -translate-x-[38%] translate-y-[38%]',
            )}
            aria-hidden
          />
          <div
            className={`pointer-events-none absolute z-[5] h-[500px] w-[500px] rounded-full bg-gradient-to-r from-white/25 via-white/15 to-white/20 blur-3xl transition-opacity duration-200 ${
              isHovering ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              transform: `translate(${mousePosition.x - 250}px, ${mousePosition.y - 250}px)`,
              transition: 'transform 0.1s ease-out',
            }}
          />

          <form
            className="relative z-20 flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center gap-2 overflow-hidden text-center sm:gap-3 md:gap-4"
            onSubmit={handleSubmit}
            noValidate
          >
            <div className="grid w-full max-w-[360px] min-h-0 shrink-0 gap-3 sm:gap-4 md:gap-5">
              <h1 className="text-2xl font-extrabold text-[var(--color-heading)] sm:text-3xl md:text-4xl">
                Fifth Task
              </h1>
              {!isRegister ? (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Entre com seu e-mail e senha para continuar.
                </p>
              ) : (
                <p className="text-sm text-[var(--color-text-secondary)]">Cadastre-se com seu e-mail</p>
              )}
            </div>

            {(error || info) && (
              <div
                className="w-full max-w-[360px] shrink-0 rounded-md border px-3 py-2 text-left text-sm"
                role={error ? 'alert' : 'status'}
              >
                {error && (
                  <p className="text-red-600 dark:text-red-400">{error}</p>
                )}
                {info && !error && (
                  <p className="text-[var(--color-text-primary)]">{info}</p>
                )}
              </div>
            )}

            <div className="grid w-full max-w-[360px] min-h-0 shrink-0 gap-3 sm:gap-4">
              {isRegister && (
                <AppInput
                  name="name"
                  placeholder="Nome completo"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              )}
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
              <AppInput
                name="password"
                placeholder="Senha"
                type="password"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              {isRegister && (
                <AppInput
                  name="confirmPassword"
                  placeholder="Confirmar senha"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              )}
            </div>

            {!isRegister && (
              <div className="mt-4 flex w-full max-w-[360px] flex-col items-center gap-3 sm:mt-6">
                <ul className="flex gap-3 md:gap-4">
                  {socialIcons.map((social, index) => (
                    <li key={index} className="list-none">
                      <a
                        href={social.href}
                        className="group relative z-[1] flex h-[2.75rem] w-[2.75rem] items-center justify-center overflow-hidden rounded-full border-2 border-[var(--color-text-primary)] bg-[var(--color-bg-2)] transition-all duration-300 md:h-[3rem] md:w-[3rem]"
                      >
                        <div className="absolute inset-0 h-full w-full origin-bottom scale-y-0 bg-[var(--color-bg)] transition-transform duration-500 ease-in-out group-hover:scale-y-100" />
                        <span className="relative z-[2] text-[var(--color-border)] transition-all duration-500 group-hover:text-[var(--color-text-primary)]">
                          {social.icon}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>

                <a
                  href="#"
                  className="text-sm font-light text-[var(--color-text-primary)] md:text-base"
                >
                  Esqueceu sua senha?
                </a>
              </div>
            )}

            <div className="flex w-full max-w-[360px] items-center justify-center">
              <button
                type="submit"
                disabled={loading}
                className="group/button relative w-full inline-flex cursor-pointer items-center justify-center overflow-hidden rounded-md bg-[var(--color-border)] px-5 py-2 text-white transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:shadow-[var(--color-text-primary)] disabled:pointer-events-none disabled:opacity-60"
              >
                <span className="px-2 py-1 text-sm">
                  {loading ? 'Aguarde…' : isRegister ? 'Cadastrar' : 'Entrar'}
                </span>
                <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/button:duration-1000 group-hover/button:[transform:skew(-13deg)_translateX(100%)]">
                  <div className="relative h-full w-8 bg-white/20" />
                </div>
              </button>
            </div>

            <div className="text-sm text-[var(--color-text-secondary)]">
              {isRegister ? 'Já tem uma conta?' : 'Ainda não tem uma conta?'}{' '}
              <Link
                href={isRegister ? '/login' : '/register'}
                className="font-medium text-[var(--color-text-primary)] transition hover:opacity-80"
              >
                {isRegister ? 'Entrar' : 'Cadastrar'}
              </Link>
            </div>
          </form>
        </div>

        <div className="relative hidden min-h-0 w-full overflow-hidden lg:block lg:h-full lg:w-1/2 lg:flex-1">
          <div
            className={`absolute inset-0 z-10 bg-gradient-to-br from-black/40 via-transparent to-black/40 ${
              isRegister ? 'animate-in fade-in duration-500' : ''
            }`}
          />
          <NeuralBackground
            className="absolute inset-0 z-0"
            color="#c7d1db"
            trailOpacity={0.2}
            particleCount={650}
            speed={0.85}
          />
          <div className="relative z-20 flex h-full w-full items-center justify-center px-8">
            <div className="flex items-center justify-center">
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
        </div>
    </>
  )
}