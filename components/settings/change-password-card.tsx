'use client'

import * as React from 'react'
import { Eye, EyeOff, KeyRound } from 'lucide-react'

import { updateMyPassword } from '@/lib/auth'
import { useDashboardLoading } from '@/components/ui/dashboard-shell'
import { supabase } from '@/lib/supabase'
import PasswordInput from '@/components/ui/password-input-1'

const MIN_PASSWORD_LENGTH = 8

export function ChangePasswordCard({ embedded = false }: { embedded?: boolean }) {
  const { showAlert, setLoading: setDashboardLoading } = useDashboardLoading()
  const [currentPassword, setCurrentPassword] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [currentVisible, setCurrentVisible] = React.useState(false)
  const [confirmVisible, setConfirmVisible] = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const current = currentPassword
    const next = newPassword

    if (!current) {
      setError('Informe sua senha atual.')
      return
    }
    if (next.length < MIN_PASSWORD_LENGTH) {
      setError(`A nova senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`)
      return
    }
    if (next !== confirmPassword) {
      setError('A confirmação não coincide com a nova senha.')
      return
    }

    setSaving(true)
    setDashboardLoading(true)
    try {
      // Reautentica antes de trocar a senha (evita mudança silenciosa em sessão antiga).
      const { data, error: userError } = await supabase.auth.getUser()
      if (userError || !data.user?.email) {
        throw userError ?? new Error('Não foi possível validar sua sessão.')
      }

      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: data.user.email,
        password: current,
      })
      if (reauthError) {
        throw new Error('Senha atual incorreta.')
      }

      await updateMyPassword(next)
      setNewPassword('')
      setConfirmPassword('')
      setCurrentPassword('')
      showAlert({
        variant: 'success',
        title: 'Senha alterada',
        description: 'Sua senha foi atualizada com sucesso.',
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Não foi possível atualizar a senha.'
      setError(message)
      showAlert({
        variant: 'error',
        title: 'Não foi possível alterar a senha',
        description: message,
      })
    } finally {
      setSaving(false)
      setDashboardLoading(false)
    }
  }

  const body = (
    <>
      {error && (
        <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-300">Senha atual</p>
          <div className="relative">
            <input
              type={currentVisible ? 'text' : 'password'}
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={saving}
              className="h-10 w-full rounded-md border border-white/10 bg-black/40 px-3 pr-10 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-white/20 disabled:opacity-60"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setCurrentVisible((v) => !v)}
              aria-label={currentVisible ? 'Ocultar senha atual' : 'Mostrar senha atual'}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-white/90 transition hover:text-white"
              disabled={saving}
            >
              {currentVisible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <PasswordInput
            value={newPassword}
            onChange={setNewPassword}
            disabled={saving}
            id="settings-new-password"
            name="newPassword"
            label="Nova senha"
            placeholder="••••••••"
            autoComplete="new-password"
            className="w-full"
          />
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-300">Confirmar nova senha</p>
          <div className="relative">
            <input
              type={confirmVisible ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={saving}
              className="h-10 w-full rounded-md border border-white/10 bg-black/40 px-3 pr-10 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-white/20 disabled:opacity-60"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setConfirmVisible((v) => !v)}
              aria-label={confirmVisible ? 'Ocultar confirmação' : 'Mostrar confirmação'}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-white/90 transition hover:text-white"
              disabled={saving}
            >
              {confirmVisible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-white/90 text-sm font-semibold text-black transition hover:bg-white disabled:opacity-60"
        >
          {saving ? 'Salvando…' : 'Atualizar senha'}
        </button>
      </form>
    </>
  )

  if (embedded) return <div className="pt-1">{body}</div>

  return (
    <section className="rounded-[28px] border border-white/10 bg-black/35 p-6 backdrop-blur-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <KeyRound className="h-5 w-5 text-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Senha</h2>
          <p className="text-sm text-muted-foreground">
            Reautentique e defina uma nova senha para sua conta.
          </p>
        </div>
      </div>

      {body}
    </section>
  )
}

