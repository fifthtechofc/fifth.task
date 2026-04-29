"use client"

import { Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import * as React from "react"
import PasswordInput from "@/components/ui/password-input-1"
import {
  exchangeCodeForSession,
  setSessionFromTokens,
  updateMyPassword,
} from "@/lib/auth"
import { supabase } from "@/lib/supabase"

const MIN_PASSWORD_LENGTH = 8

function AppInput({
  label,
  icon,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  icon?: React.ReactNode
}) {
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
    <div className="relative w-full min-w-[200px] text-left">
      {label && (
        <label className="mb-2 block text-sm text-[var(--color-text-primary)]">
          {label}
        </label>
      )}

      <div className="relative w-full">
        <input
          className="peer relative z-10 h-12 w-full min-h-12 rounded-md border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4 pr-10 text-center font-light text-[var(--color-text-primary)] outline-none drop-shadow-sm transition-all duration-200 ease-in-out placeholder:font-medium placeholder:text-[var(--color-text-secondary)] focus:bg-[var(--color-bg)] disabled:cursor-not-allowed disabled:opacity-60"
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

        {icon && (
          <div className="absolute top-1/2 right-3 z-20 -translate-y-1/2">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

function parseHashTokens(hash: string) {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash
  const params = new URLSearchParams(raw)
  const accessToken = params.get("access_token") ?? ""
  const refreshToken = params.get("refresh_token") ?? ""
  const type = params.get("type") ?? ""
  return { accessToken, refreshToken, type }
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const search = useSearchParams()

  const [stage, setStage] = React.useState<"init" | "ready" | "done">("init")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [confirmVisible, setConfirmVisible] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let alive = true

    async function bootstrap() {
      setError(null)

      try {
        const code = search.get("code")
        if (code) {
          await exchangeCodeForSession(code)
          if (!alive) return
          setStage("ready")
          return
        }

        const { accessToken, refreshToken } = parseHashTokens(
          window.location.hash || "",
        )
        if (accessToken && refreshToken) {
          await setSessionFromTokens({ accessToken, refreshToken })
          if (!alive) return
          // normalmente type === 'recovery'
          setStage("ready")
          return
        }

        // Se chegou sem tokens, ainda deixamos a UI (sem aviso).
        setStage("ready")
      } catch (e) {
        if (!alive) return
        setStage("ready")
        setError(
          e instanceof Error ? e.message : "Não foi possível validar o link.",
        )
      }
    }

    void bootstrap()
    return () => {
      alive = false
    }
  }, [search])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`)
      return
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.")
      return
    }

    setLoading(true)
    try {
      await updateMyPassword(password)
      setStage("done")
      try {
        await supabase.auth.signOut()
      } catch {
        // ignore
      }
      // limpa hash pra não deixar token visível
      try {
        window.history.replaceState(null, "", window.location.pathname)
      } catch {
        /* ignore */
      }
      window.setTimeout(() => {
        router.replace("/login")
        router.refresh()
      }, 800)
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível atualizar a senha.",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative isolate flex min-h-[calc(100vh-2rem)] w-full flex-col items-center justify-center overflow-hidden bg-[var(--color-bg)] px-6 py-10 text-center">
      <div
        className="pointer-events-none absolute top-0 right-0 z-0 h-[500px] w-[500px] translate-x-[38%] -translate-y-[38%] rounded-full bg-gradient-to-r from-white/25 via-white/15 to-white/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 z-0 h-[500px] w-[500px] -translate-x-[38%] translate-y-[38%] rounded-full bg-gradient-to-r from-white/25 via-white/15 to-white/20 blur-3xl"
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-[460px] rounded-2xl border border-white/10 bg-black/35 p-6 backdrop-blur-sm">
        <h1 className="text-2xl font-extrabold text-[var(--color-heading)]">
          Nova senha
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Crie uma nova senha para sua conta.
        </p>

        {error && (
          <div
            className="mt-4 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-sm"
            role="alert"
          >
            {error && <p className="text-red-600 dark:text-red-400">{error}</p>}
          </div>
        )}

        {stage === "done" ? (
          <div className="mt-6">
            <p className="text-sm text-zinc-300">
              Redirecionando para o login…
            </p>
          </div>
        ) : (
          <form
            className="mt-5 flex flex-col items-center justify-center gap-4"
            onSubmit={handleSubmit}
            noValidate
          >
            <div className="w-full">
              <PasswordInput
                id="password"
                name="password"
                label="Nova senha"
                placeholder="••••••••"
                autoComplete="new-password"
                value={password}
                onChange={setPassword}
                disabled={loading || stage === "init"}
                className="w-full"
              />
            </div>

            <AppInput
              id="confirmPassword"
              name="confirmPassword"
              label="Confirmar nova senha"
              type={confirmVisible ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading || stage === "init"}
              placeholder="••••••••"
              icon={
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    setConfirmVisible((v) => !v)
                  }}
                  aria-label="Mostrar/ocultar confirmação"
                  className="flex h-9 w-9 items-center justify-center text-white/90 transition hover:text-white"
                  disabled={loading || stage === "init"}
                >
                  {confirmVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            <button
              type="submit"
              disabled={loading || stage === "init"}
              className="group/button relative inline-flex h-12 w-full cursor-pointer items-center justify-center overflow-hidden rounded-md bg-[var(--color-border)] px-5 py-2 text-white transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg hover:shadow-[var(--color-text-primary)] disabled:pointer-events-none disabled:opacity-60"
            >
              <span className="px-2 py-1 text-sm">
                {loading ? "Salvando…" : "Atualizar senha"}
              </span>
              <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/button:duration-1000 group-hover/button:[transform:skew(-13deg)_translateX(100%)]">
                <div className="relative h-full w-8 bg-white/20" />
              </div>
            </button>

            <p className="pt-2 text-sm text-zinc-400">
              Voltar para{" "}
              <Link
                href="/login"
                className="font-medium text-white hover:opacity-80"
              >
                Login
              </Link>
              .
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
