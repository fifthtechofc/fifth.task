'use client'

import { useCallback, useEffect, useId, useState } from 'react'
import { UserRound } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getMyProfile, updateMyProfileAvatar } from '@/lib/profile'
import { supabase } from '@/lib/supabase'
import { getAvatarPublicUrl, uploadAvatar } from '@/lib/storage'
import { cn } from '@/lib/utils'

function pickString(...values: Array<unknown>) {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatLastAccess(iso: string | undefined) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return '—'
  }
}

export function SettingsProfileSection() {
  const fileInputId = useId()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [lastAccess, setLastAccess] = useState('—')
  const [avatarSrc, setAvatarSrc] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const profile = (await getMyProfile()) as Record<string, unknown>
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('Usuário não autenticado.')
      }

      const name = pickString(
        profile.full_name,
        profile.name,
        profile.display_name,
        user.email,
        'Sem nome',
      )
      const title = pickString(profile.job_title, profile.role)
      let url = pickString(profile.avatar_url, profile.avatarUrl, profile.avatar)

      if (!url) {
        try {
          const { publicUrl } = await getAvatarPublicUrl(user.id)
          url = publicUrl ?? ''
        } catch {
          url = ''
        }
      }

      setUserId(user.id)
      setDisplayName(name)
      setEmail(pickString(profile.email, user.email))
      setJobTitle(title || '—')
      setLastAccess(formatLastAccess(user.last_sign_in_at))
      setAvatarSrc(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar o perfil.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function onAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !userId) return

    if (!file.type.startsWith('image/')) {
      setUploadError('Escolha um arquivo de imagem.')
      return
    }

    setUploadError(null)
    setUploading(true)
    try {
      const publicUrl = await uploadAvatar(file, userId)
      await updateMyProfileAvatar(publicUrl)
      setAvatarSrc(`${publicUrl}?t=${Date.now()}`)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Falha no envio da imagem.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <section className="rounded-[28px] border border-white/10 bg-black/35 p-6 backdrop-blur-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <UserRound className="h-5 w-5 text-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Perfil</h2>
          <p className="text-sm text-muted-foreground">
            Dados da sua conta e foto de perfil.
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {!error && (
        <>
          <div className="mb-6 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <Avatar className="h-24 w-24 border border-white/10 ring-1 ring-white/10">
              <AvatarImage src={avatarSrc || undefined} alt={displayName} />
              <AvatarFallback className="text-lg">{initials(displayName)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <input
                id={fileInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={onAvatarFileChange}
                disabled={uploading}
              />
              <label
                htmlFor={fileInputId}
                className={cn(
                  'cursor-pointer rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-foreground transition-colors hover:bg-white/10',
                  uploading && 'pointer-events-none opacity-50',
                )}
              >
                {uploading ? 'Enviando…' : 'Alterar avatar'}
              </label>
              <p className="text-center text-xs text-muted-foreground sm:text-left">
                JPG, PNG
              </p>
              {uploadError && (
                <p className="text-center text-xs text-red-400 sm:text-left">{uploadError}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Nome</p>
              <p className="mt-2 text-sm font-medium text-foreground">{displayName}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">E-mail</p>
              <p className="mt-2 text-sm font-medium text-foreground">{email || '—'}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Cargo</p>
              <p className="mt-2 text-sm font-medium text-foreground">{jobTitle}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Último acesso
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">{lastAccess}</p>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
