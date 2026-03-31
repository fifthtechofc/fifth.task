"use client"

import { useCallback, useEffect, useId, useState } from "react"
import { ChevronDown, Pencil, UserRound } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { getMyProfile, updateMyProfileAvatar, updateMyProfileDetails } from "@/lib/profile"
import { supabase } from "@/lib/supabase"
import { getAvatarPublicUrl, uploadAvatar } from "@/lib/storage"
import { cn } from "@/lib/utils"

function pickString(...values: Array<unknown>) {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim()
  }
  return ""
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
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    })
  } catch {
    return "—"
  }
}

export function SettingsProfileSection({
  onDetailsSaved,
  showSummary = true,
}: {
  onDetailsSaved?: () => void
  showSummary?: boolean
} = {}) {
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

  const [birthday, setBirthday] = useState("")
  const [workHours, setWorkHours] = useState("")
  const [bio, setBio] = useState("")
  const [savingDetails, setSavingDetails] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(true)
  const [status, setStatus] = useState<"online" | "focus" | "offline">("offline")

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
        throw new Error("Usuário não autenticado.")
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
      setJobTitle(title || "—")
      setLastAccess(formatLastAccess(user.last_sign_in_at))
      setAvatarSrc(url)

      setBirthday(pickString(profile.birthday))
      setWorkHours(pickString(profile.work_hours))
      setBio(pickString(profile.bio))

      // Deriva status para exibição rápida (online / foco / offline)
      const explicit = pickString(profile.status).toLowerCase()
      const parseDateMaybe = (value: unknown): Date | null => {
        if (typeof value !== "string" || !value.trim()) return null
        const d = new Date(value)
        return Number.isFinite(d.getTime()) ? d : null
      }
      const activity =
        parseDateMaybe(profile.last_seen_at) ??
        parseDateMaybe(profile.last_active_at) ??
        parseDateMaybe(profile.last_sign_in_at) ??
        parseDateMaybe(profile.updated_at)

      let derived: "online" | "focus" | "offline" = "offline"
      if (explicit === "online" || explicit === "focus" || explicit === "offline") {
        derived = explicit as typeof derived
      } else if (activity) {
        const minutes = (Date.now() - activity.getTime()) / 60000
        if (minutes <= 1) derived = "online"
        else if (minutes <= 120) derived = "focus"
        else derived = "offline"
      }
      setStatus(derived)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar o perfil.")
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

    if (!file.type.startsWith("image/")) {
      setUploadError("Escolha um arquivo de imagem.")
      return
    }

    setUploadError(null)
    setUploading(true)
    try {
      const publicUrl = await uploadAvatar(file, userId)
      await updateMyProfileAvatar(publicUrl)
      setAvatarSrc(`${publicUrl}?t=${Date.now()}`)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Falha no envio da imagem.")
    } finally {
      setUploading(false)
    }
  }

  async function handleSaveDetails() {
    setDetailsError(null)
    setSavingDetails(true)
    try {
      await updateMyProfileDetails({
        birthday: birthday || null,
        jobTitle: jobTitle && jobTitle !== "—" ? jobTitle : null,
        bio: bio || null,
        workHours: workHours || null,
      })
      onDetailsSaved?.()
    } catch (e) {
      setDetailsError(
        e instanceof Error ? e.message : "Não foi possível salvar os dados do perfil.",
      )
    } finally {
      setSavingDetails(false)
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

      {error && <p className="text-sm text-red-400">{error}</p>}

      {!error && (
        <>
          <div className="mb-6 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative">
              <Avatar className="h-24 w-24 border-2 border-white/80 bg-black/60">
                <AvatarImage src={avatarSrc || undefined} alt={displayName} />
                <AvatarFallback className="text-lg">{initials(displayName)}</AvatarFallback>
              </Avatar>
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
                  "absolute bottom-0 right-0 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-white/40 bg-black/80 text-[10px] text-zinc-200 shadow-md",
                  uploading && "pointer-events-none opacity-50",
                )}
              >
                <Pencil className="h-3.5 w-3.5" />
              </label>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
              <div className="min-w-0">
                <p className="text-lg font-semibold text-white">{displayName}</p>
                {jobTitle && (
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                    {jobTitle}
                  </p>
                )}
              </div>
              <div className="mt-1 flex items-center justify-center gap-2 sm:mt-0 sm:justify-end">
                <span
                  className={cn(
                    "h-3 w-3 rounded-full",
                    status === "online" && "bg-emerald-400",
                    status === "focus" && "bg-amber-400",
                    status === "offline" && "bg-zinc-500",
                  )}
                />
                <span className="text-sm font-medium text-zinc-200">
                  {status === "online" && "Online"}
                  {status === "focus" && "Em foco"}
                  {status === "offline" && "Offline"}
                </span>
              </div>
              {uploadError && (
                <p className="mt-2 text-xs text-red-400">{uploadError}</p>
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
              <p className="mt-2 text-sm font-medium text-foreground">{email || "—"}</p>
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

          <section className="mt-6 rounded-[28px] border border-white/10 bg-black/45 p-5 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setDetailsOpen((prev) => !prev)}
              className="mb-3 flex w-full items-center justify-between text-left"
            >
              <div>
                <h3 className="text-sm font-semibold text-foreground">Detalhes do perfil</h3>
                <p className="text-xs text-muted-foreground">
                  Informações extras usadas em times, quadros e comunicações internas.
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-zinc-400 transition-transform",
                  detailsOpen ? "rotate-180" : "rotate-0",
                )}
              />
            </button>

            {detailsError && (
              <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {detailsError}
              </p>
            )}

            {detailsOpen && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-zinc-300">Data de nascimento</p>
                    <Input
                      type="date"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                      className="h-9 border-white/15 bg-black/40 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-zinc-300">Horário de trabalho</p>
                    <Input
                      placeholder="Ex: 09h às 18h"
                      value={workHours}
                      onChange={(e) => setWorkHours(e.target.value)}
                      className="h-9 border-white/15 bg-black/40 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-zinc-300">Cargo</p>
                  <Input
                    placeholder="Ex: CTO, Product Designer..."
                    value={jobTitle === "—" ? "" : jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="h-9 border-white/15 bg-black/40 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-zinc-300">Descrição (opcional)</p>
                  <Textarea
                    rows={3}
                    placeholder="Uma breve bio sobre você, seu papel no time, interesses..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="border-white/15 bg-black/40 text-xs"
                  />
                </div>

                <div className="flex justify-center">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={savingDetails}
                    onClick={() => void handleSaveDetails()}
                  >
                    {savingDetails ? "Salvando..." : "Salvar detalhes"}
                  </Button>
                </div>
              </div>
            )}
          </section>

          {showSummary && (
            <section className="mt-4 rounded-[28px] border border-white/10 bg-black/35 p-5 backdrop-blur-sm">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-foreground">Resumo rápido</h3>
                <p className="text-xs text-muted-foreground">
                  Algumas informações úteis do seu workspace.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Fuso horário</p>
                  <p className="mt-2 text-sm font-medium text-foreground">America/Sao_Paulo</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Idioma</p>
                  <p className="mt-2 text-sm font-medium text-foreground">Português (Brasil)</p>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </section>
  )
}
