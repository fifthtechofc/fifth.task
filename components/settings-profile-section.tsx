"use client"

import * as React from "react"
import {
  CalendarDays,
  Clock3,
  Mail,
  Pencil,
  UserRound,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useDashboardLoading } from "@/components/ui/dashboard-shell"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { PREDEFINED_JOB_TITLES } from "@/lib/job-titles"
import {
  getMyProfile,
  updateMyProfileAvatar,
  updateMyProfileDetails,
} from "@/lib/profile"
import { getAvatarPublicUrl, uploadAvatar } from "@/lib/storage"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

function pickString(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return ""
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function formatLastAccess(iso: string | undefined) {
  if (!iso) return "-"
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    })
  } catch {
    return "-"
  }
}

export function SettingsProfileSection({
  onDetailsSaved,
  showSummary = true,
}: {
  onDetailsSaved?: () => void
  showSummary?: boolean
} = {}) {
  const { setLoading: setDashboardLoading, showAlert } = useDashboardLoading()
  const fileInputId = React.useId()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [uploading, setUploading] = React.useState(false)
  const [uploadError, setUploadError] = React.useState<string | null>(null)

  const [displayName, setDisplayName] = React.useState("")
  const [fullName, setFullName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [jobTitle, setJobTitle] = React.useState("")
  const [lastAccess, setLastAccess] = React.useState("-")
  const [avatarSrc, setAvatarSrc] = React.useState("")
  const [userId, setUserId] = React.useState<string | null>(null)

  const [birthday, setBirthday] = React.useState("")
  const [workHours, setWorkHours] = React.useState("")
  const [bio, setBio] = React.useState("")
  const [savingDetails, setSavingDetails] = React.useState(false)
  const [detailsError, setDetailsError] = React.useState<string | null>(null)
  const [editorOpen, setEditorOpen] = React.useState(false)
  const [status, setStatus] = React.useState<"online" | "focus" | "offline">("offline")

  const load = React.useCallback(async () => {
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
        profile.display_name,
        user.email,
        "Sem nome",
      )
      const title = pickString(profile.job_title, profile.role)
      let url = pickString(profile.avatar_url, profile.avatarUrl, profile.avatar)

      if (!url) {
        try {
          const { publicUrl } = await getAvatarPublicUrl(user.id)
          url = publicUrl ?? ""
        } catch {
          url = ""
        }
      }

      setUserId(user.id)
      setDisplayName(name)
      setFullName(name)
      setEmail(pickString(profile.email, user.email))
      setJobTitle(title || "-")
      setLastAccess(formatLastAccess(user.last_sign_in_at))
      setAvatarSrc(url)
      setBirthday(pickString(profile.birthday))
      setWorkHours(pickString(profile.work_hours))
      setBio(pickString(profile.bio))

      const explicit = pickString(profile.status).toLowerCase()
      const parseDateMaybe = (value: unknown): Date | null => {
        if (typeof value !== "string" || !value.trim()) return null
        const parsed = new Date(value)
        return Number.isFinite(parsed.getTime()) ? parsed : null
      }

      const activity =
        parseDateMaybe(profile.last_seen_at) ??
        parseDateMaybe(profile.last_active_at) ??
        parseDateMaybe(profile.last_sign_in_at) ??
        parseDateMaybe(user.last_sign_in_at) ??
        parseDateMaybe(profile.updated_at)

      let derived: "online" | "focus" | "offline" = "offline"
      if (explicit === "online" || explicit === "focus") {
        derived = explicit as typeof derived
      } else if (activity) {
        const minutes = (Date.now() - activity.getTime()) / 60000
        if (minutes <= 1) derived = "online"
        else if (minutes <= 120) derived = "focus"
      }
      setStatus(derived)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar o perfil.",
      )
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  React.useEffect(() => {
    setDashboardLoading(loading)
  }, [loading, setDashboardLoading])

  async function onAvatarFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
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
    } catch (uploadErr) {
      setUploadError(
        uploadErr instanceof Error ? uploadErr.message : "Falha no envio da imagem.",
      )
    } finally {
      setUploading(false)
    }
  }

  async function handleSaveDetails() {
    setDetailsError(null)
    setSavingDetails(true)
    try {
      await updateMyProfileDetails({
        fullName: fullName || null,
        birthday: birthday || null,
        jobTitle: jobTitle && jobTitle !== "-" ? jobTitle : null,
        bio: bio || null,
        workHours: workHours || null,
      })

      setDisplayName(fullName || "Sem nome")
      setEditorOpen(false)
      showAlert({
        variant: "success",
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso.",
      })
      onDetailsSaved?.()
    } catch (saveError) {
      setDetailsError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível salvar os dados do perfil.",
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
            Dados da conta, foto e apresentacao interna.
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
                <AvatarFallback className="text-lg">
                  {initials(displayName || "SN")}
                </AvatarFallback>
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

            <div className="flex min-w-0 flex-1 flex-col gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
              <div className="min-w-0">
                <p className="text-lg font-semibold text-white">{displayName}</p>
                {jobTitle && (
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                    {jobTitle}
                  </p>
                )}
                {uploadError && <p className="mt-2 text-xs text-red-400">{uploadError}</p>}
              </div>

              <div className="flex flex-col items-center gap-3 sm:items-end">
                <div className="flex items-center justify-center gap-2 sm:justify-end">
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

                <Button
                  type="button"
                  variant="outline"
                  className="border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                  onClick={() => setEditorOpen(true)}
                >
                  Editar perfil
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Nome</p>
              <p className="mt-2 text-sm font-medium text-foreground">{displayName}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">E-mail</p>
              <p className="mt-2 text-sm font-medium text-foreground">{email || "-"}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Cargo</p>
              <p className="mt-2 text-sm font-medium text-foreground">{jobTitle}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Ultimo acesso
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">{lastAccess}</p>
            </div>
          </div>

          <section className="mt-6 rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_42%,rgba(0,0,0,0.15)_100%)] p-5 backdrop-blur-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Visão geral do perfil</h3>
                <p className="text-xs text-muted-foreground">
                  As alterações agora abrem em um painel lateral, sem tirar você do contexto.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="border-white/15 bg-black/30 text-white hover:bg-white/[0.08]"
                onClick={() => setEditorOpen(true)}
              >
                Abrir editor
              </Button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-black/25 px-4 py-4">
                <div className="flex items-center gap-2 text-zinc-300">
                  <CalendarDays className="h-4 w-4" />
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Nascimento</p>
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">
                  {birthday || "Não informado"}
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/25 px-4 py-4">
                <div className="flex items-center gap-2 text-zinc-300">
                  <Clock3 className="h-4 w-4" />
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Jornada</p>
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">
                  {workHours || "Não informado"}
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/25 px-4 py-4">
                <div className="flex items-center gap-2 text-zinc-300">
                  <Mail className="h-4 w-4" />
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Contato</p>
                </div>
                <p className="mt-3 truncate text-sm font-medium text-foreground">
                  {email || "Não informado"}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Bio</p>
              <p className="mt-2 text-sm leading-6 text-zinc-200">
                {bio || "Adicione uma breve descricao para contextualizar seu papel no time."}
              </p>
            </div>
          </section>

          {showSummary && (
            <section className="mt-4 rounded-[28px] border border-white/10 bg-black/35 p-5 backdrop-blur-sm">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-foreground">Resumo rapido</h3>
                <p className="text-xs text-muted-foreground">
                  Algumas informações úteis do seu workspace.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                    Fuso horario
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    America/Sao_Paulo
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Idioma</p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    Portugues (Brasil)
                  </p>
                </div>
              </div>
            </section>
          )}

          <Sheet open={editorOpen} onOpenChange={setEditorOpen}>
            <SheetContent
              side="right"
              showClose
              className="border-l border-border bg-zinc-950/95 text-foreground sm:max-w-xl"
            >
              <SheetHeader>
                <SheetTitle>Editar perfil</SheetTitle>
                <SheetDescription>
                  Atualize seus dados sem sair da página de configurações.
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-5 overflow-y-auto px-4 py-4">
                <div className="flex items-center gap-4 rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20 border border-white/20 bg-black/60">
                      <AvatarImage src={avatarSrc || undefined} alt={displayName} />
                      <AvatarFallback className="text-lg">
                        {initials(displayName || "SN")}
                      </AvatarFallback>
                    </Avatar>
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
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Foto do perfil</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      O painel lateral segue o mesmo padrão de edição usado em outras áreas.
                    </p>
                    {uploadError && <p className="mt-2 text-xs text-red-400">{uploadError}</p>}
                  </div>
                </div>

                {detailsError && (
                  <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                    {detailsError}
                  </p>
                )}

                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-300">Nome completo</p>
                  <Input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="border-white/15 bg-black/40"
                    placeholder="Seu nome"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-300">E-mail</p>
                  <Input
                    value={email}
                    disabled
                    className="border-white/10 bg-black/30 text-zinc-400"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-zinc-300">Data de nascimento</p>
                    <Input
                      type="date"
                      value={birthday}
                      onChange={(event) => setBirthday(event.target.value)}
                      className="border-white/15 bg-black/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-zinc-300">Horário de trabalho</p>
                    <Input
                      placeholder="Ex: 09h as 18h"
                      value={workHours}
                      onChange={(event) => setWorkHours(event.target.value)}
                      className="border-white/15 bg-black/40"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-300">Cargo</p>
                  <Select
                    value={jobTitle === "-" ? "" : jobTitle}
                    onValueChange={(value) => setJobTitle(value)}
                  >
                    <SelectTrigger className="border-white/15 bg-black/80 text-white focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="Selecione o cargo" />
                    </SelectTrigger>
                    <SelectContent
                      side="bottom"
                      avoidCollisions={false}
                      className="border-white/10 bg-black text-white"
                    >
                      {PREDEFINED_JOB_TITLES.map((title) => (
                        <SelectItem
                          key={title}
                          value={title}
                          className="text-white focus:bg-white/10 focus:text-white"
                        >
                          {title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-300">Descrição</p>
                  <Textarea
                    rows={5}
                    placeholder="Uma breve bio sobre você, seu papel no time e seus interesses..."
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    className="border-white/15 bg-black/40"
                  />
                </div>
              </div>

              <SheetFooter className="flex-row items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditorOpen(false)}
                  disabled={savingDetails}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleSaveDetails()}
                  disabled={savingDetails}
                >
                  {savingDetails ? "Salvando..." : "Salvar alterações"}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </>
      )}
    </section>
  )
}
