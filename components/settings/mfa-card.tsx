"use client"

import { ShieldCheck } from "lucide-react"
import * as React from "react"
import { useDashboardLoading } from "@/components/ui/dashboard-shell"
import { logAuditEvent } from "@/lib/audit"
import { supabase } from "@/lib/supabase"

type Factor = {
  id: string
  factor_type?: string
  status?: string
  friendly_name?: string
  created_at?: string
}

function maskSecret(secret: string) {
  const s = secret.trim()
  if (s.length <= 8) return s
  return `${s.slice(0, 4)}…${s.slice(-4)}`
}

export function MfaCard({ embedded = false }: { embedded?: boolean }) {
  const { showAlert } = useDashboardLoading()
  const [loading, setLoading] = React.useState(true)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [factors, setFactors] = React.useState<Factor[]>([])
  const [enroll, setEnroll] = React.useState<{
    factorId: string
    secret: string
    qr: string
  } | null>(null)

  const [code, setCode] = React.useState("")

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error) throw error
      const all = [
        ...(data?.all ?? []),
        ...(data?.totp ?? []),
        ...(data?.phone ?? []),
      ] as Factor[]
      setFactors(all)
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível carregar 2FA.",
      )
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    void load()
  }, [load])

  const enabledTotp = React.useMemo(() => {
    const totp = factors.find(
      (f) =>
        (f.factor_type ?? "").toLowerCase() === "totp" &&
        (f.status ?? "").toLowerCase() === "verified",
    )
    return totp ?? null
  }, [factors])

  async function handleEnroll() {
    setBusy(true)
    setError(null)
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
      })
      if (error) throw error
      const factorId = String(data?.id ?? "")
      const secret = String(data?.totp?.secret ?? "")
      const qr = String(data?.totp?.qr_code ?? "")
      if (!factorId || !secret || !qr) {
        throw new Error("Falha ao iniciar 2FA (dados incompletos).")
      }
      setEnroll({ factorId, secret, qr })
      setCode("")
      void logAuditEvent({ action: "auth.2fa_enable_start" })
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Não foi possível iniciar 2FA."
      setError(msg)
      showAlert({ variant: "error", title: "2FA", description: msg })
    } finally {
      setBusy(false)
    }
  }

  async function handleVerify() {
    if (!enroll) return
    const otp = code.replace(/\s+/g, "")
    if (otp.length < 6) {
      setError("Informe o código de 6 dígitos do autenticador.")
      return
    }

    setBusy(true)
    setError(null)
    try {
      const { data: challenge, error: chErr } =
        await supabase.auth.mfa.challenge({
          factorId: enroll.factorId,
        })
      if (chErr) throw chErr
      const challengeId = String(challenge?.id ?? "")
      if (!challengeId) throw new Error("Não foi possível gerar challenge.")

      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: enroll.factorId,
        challengeId,
        code: otp,
      })
      if (vErr) throw vErr

      showAlert({
        variant: "success",
        title: "2FA ativado",
        description: "Verificação em duas etapas habilitada.",
      })
      void logAuditEvent({ action: "auth.2fa_enable_complete" })
      setEnroll(null)
      setCode("")
      await load()
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Não foi possível verificar o código."
      setError(msg)
      showAlert({ variant: "error", title: "2FA", description: msg })
    } finally {
      setBusy(false)
    }
  }

  async function handleDisable() {
    if (!enabledTotp) return
    setBusy(true)
    setError(null)
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: enabledTotp.id,
      })
      if (error) throw error
      showAlert({ variant: "success", title: "2FA desativado" })
      void logAuditEvent({ action: "auth.2fa_disable" })
      await load()
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Não foi possível desativar 2FA."
      setError(msg)
      showAlert({ variant: "error", title: "2FA", description: msg })
    } finally {
      setBusy(false)
    }
  }

  const body = (
    <>
      {error && (
        <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-zinc-400">Carregando…</p>
      ) : enabledTotp ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Status
            </p>
            <p className="mt-2 text-sm font-medium text-white">Ativo</p>
            <p className="mt-1 text-xs text-zinc-400">
              Se você perder acesso ao autenticador, use a recuperação de conta
              para redefinir a senha.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleDisable()}
            disabled={busy}
            className="inline-flex h-10 w-full items-center justify-center rounded-md border border-white/15 bg-white/5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
          >
            {busy ? "Aguarde…" : "Desativar 2FA"}
          </button>
        </div>
      ) : enroll ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              1) Escaneie o QR code
            </p>
            <div className="mt-3 flex items-center justify-center">
              {/* qr_code do Supabase vem como SVG string */}
              <div
                className="rounded-xl bg-white p-3"
                dangerouslySetInnerHTML={{ __html: enroll.qr }}
              />
            </div>
            <p className="mt-3 text-xs text-zinc-400">
              Se preferir, use o segredo:{" "}
              <span className="font-mono text-zinc-200">
                {maskSecret(enroll.secret)}
              </span>
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              2) Digite o código do app
            </p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              placeholder="000000"
              className="mt-2 h-10 w-full rounded-md border border-white/10 bg-black/40 px-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-white/20"
              disabled={busy}
            />
            <button
              type="button"
              onClick={() => void handleVerify()}
              disabled={busy}
              className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-md bg-white/90 text-sm font-semibold text-black transition hover:bg-white disabled:opacity-60"
            >
              {busy ? "Verificando…" : "Ativar 2FA"}
            </button>
            <button
              type="button"
              onClick={() => setEnroll(null)}
              disabled={busy}
              className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-md border border-white/15 bg-white/5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => void handleEnroll()}
            disabled={busy}
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-white/90 text-sm font-semibold text-black transition hover:bg-white disabled:opacity-60"
          >
            {busy ? "Aguarde…" : "Ativar 2FA"}
          </button>
        </div>
      )}
    </>
  )

  if (embedded) return <div className="pt-1">{body}</div>

  return (
    <section className="rounded-[28px] border border-white/10 bg-black/35 p-6 backdrop-blur-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <ShieldCheck className="h-5 w-5 text-foreground" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-semibold text-foreground">
              Verificação em duas etapas
            </h2>
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                enabledTotp
                  ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
                  : "border-white/10 bg-white/5 text-zinc-300"
              }`}
            >
              {enabledTotp ? "Ativa" : "Inativa"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Use um app autenticador para proteger sua conta contra acessos
            indevidos.
          </p>
        </div>
      </div>

      {body}
    </section>
  )
}
