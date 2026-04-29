"use client"

import { Bell, ShieldCheck, Sparkles, UserRound } from "lucide-react"
import { useSearchParams } from "next/navigation"
import * as React from "react"
import { LoginInfoCard } from "@/components/settings/login-info-card"
import { SettingsProfileSection } from "@/components/settings-profile-section"
import { useDashboardLoading } from "@/components/ui/dashboard-shell"
import {
  getMyNotificationSettings,
  type MyNotificationSettings,
  updateMyNotificationSettings,
} from "@/lib/profile"
import { cn } from "@/lib/utils"

type SettingsSectionId = "profile" | "notifications" | "security"

type NotificationSetting = {
  id: string
  title: string
  description: string
  enabled: boolean
}

const settingsSections = [
  {
    id: "profile" as const,
    title: "Perfil",
    description: "Foto, dados pessoais e apresentacao interna.",
    icon: UserRound,
    eyebrow: "Conta",
  },
  {
    id: "notifications" as const,
    title: "Notificações",
    description: "O que você quer receber no fluxo do dia.",
    icon: Bell,
    eyebrow: "Preferências",
  },
  {
    id: "security" as const,
    title: "Segurança",
    description: "Senha e proteção adicional da conta.",
    icon: ShieldCheck,
    eyebrow: "Acesso",
  },
]

const initialNotifications: NotificationSetting[] = [
  {
    id: "daily-summary",
    title: "Resumo diário",
    description:
      "Receba um consolidado com tarefas, entregas e eventos do dia.",
    enabled: true,
  },
  {
    id: "deadline-alerts",
    title: "Alertas de prazo",
    description: "Avise quando um projeto ou card estiver perto do vencimento.",
    enabled: true,
  },
  {
    id: "team-updates",
    title: "Atualizações da equipe",
    description:
      "Notifique quando houver nova atividade relevante no workspace.",
    enabled: false,
  },
]

const notificationKeyById: Record<string, keyof MyNotificationSettings> = {
  "daily-summary": "dailySummary",
  "deadline-alerts": "deadlineAlerts",
  "team-updates": "teamUpdates",
}

function SettingToggle({
  description,
  enabled,
  onToggle,
  title,
}: {
  description: string
  enabled: boolean
  onToggle: () => void
  title: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-4">
      <div className="max-w-xl">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>

      <button
        type="button"
        aria-pressed={enabled}
        onClick={onToggle}
        className={cn(
          "relative mt-1 inline-flex h-7 w-12 shrink-0 rounded-full border transition-colors",
          enabled
            ? "border-emerald-300/30 bg-emerald-200/90"
            : "border-white/10 bg-white/10",
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition-all",
            enabled ? "right-1 bg-black" : "left-1 bg-zinc-300",
          )}
        />
      </button>
    </div>
  )
}

function NotificationsSection() {
  const { showAlert } = useDashboardLoading()
  const [settings, setSettings] = React.useState(initialNotifications)
  const [loading, setLoading] = React.useState(true)
  const [savingId, setSavingId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let alive = true

    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const notificationSettings = await getMyNotificationSettings()
        if (!alive) return

        setSettings((current) =>
          current.map((item) => ({
            ...item,
            enabled: notificationSettings[notificationKeyById[item.id]],
          })),
        )
      } catch (loadError) {
        if (!alive) return
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Não foi possível carregar as notificações.",
        )
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [])

  async function toggleSetting(id: string) {
    const currentItem = settings.find((item) => item.id === id)
    if (!currentItem) return

    const nextValue = !currentItem.enabled
    const profileKey = notificationKeyById[id]

    setError(null)
    setSavingId(id)
    setSettings((current) =>
      current.map((item) =>
        item.id === id ? { ...item, enabled: nextValue } : item,
      ),
    )

    try {
      await updateMyNotificationSettings({ [profileKey]: nextValue })
    } catch (saveError) {
      setSettings((current) =>
        current.map((item) =>
          item.id === id ? { ...item, enabled: currentItem.enabled } : item,
        ),
      )

      const message =
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível salvar as notificações."

      setError(message)
      showAlert({
        variant: "error",
        title: "Falha ao salvar notificacoes",
        description: message,
      })
    } finally {
      setSavingId(null)
    }
  }

  const enabledCount = settings.filter((item) => item.enabled).length

  return (
    <section className="rounded-[30px] border border-white/10 bg-black/35 p-6 backdrop-blur-sm">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <Bell className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Notificações
            </h2>
            <p className="text-sm text-muted-foreground">
              Controle o que chega para você sem poluir a rotina.
            </p>
          </div>
        </div>

        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-300">
          {enabledCount}/{settings.length} ativas
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-zinc-400">
              Carregando preferências de notificação...
            </div>
          ) : (
            settings.map((item) => (
              <div key={item.id} className="relative">
                <SettingToggle
                  title={item.title}
                  description={item.description}
                  enabled={item.enabled}
                  onToggle={() => void toggleSetting(item.id)}
                />
                {savingId === item.id && (
                  <span className="pointer-events-none absolute right-16 top-4 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                    Salvando
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_rgba(255,255,255,0.02)_58%,_transparent_100%)] p-5">
          <div className="flex items-center gap-2 text-zinc-200">
            <Sparkles className="h-4 w-4" />
            <p className="text-sm font-semibold">Resumo da configuração</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Nesta etapa, a tela fica funcional no front-end: as preferências
            respondem ao clique e cada categoria abre seu próprio contexto.
          </p>
          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Canal principal
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                Aplicação
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Persistência
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                Local nesta etapa
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function SecuritySection() {
  return <LoginInfoCard />
}

export function SettingsWorkspaceShell() {
  const searchParams = useSearchParams()
  const sectionParam = searchParams.get("section")
  const activeSection: SettingsSectionId =
    sectionParam === "notifications" || sectionParam === "security"
      ? sectionParam
      : "profile"

  const activeMeta =
    settingsSections.find((section) => section.id === activeSection) ??
    settingsSections[0]

  return (
    <section className="relative min-h-full p-3 sm:p-4 md:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
            Configurações
          </p>
          <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
            Preferências da sua conta
          </h1>
          <p className="mt-3 text-sm text-muted-foreground md:text-base">
            Cada área de configuração agora fica organizada por seção, com
            navegação lateral e edição mais focada.
          </p>
        </div>

        <div className="min-w-0 space-y-6">
          <section className="rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.12),_rgba(255,255,255,0.02)_55%,_transparent_100%)] p-4 sm:rounded-[30px] sm:p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
              {activeMeta.eyebrow}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-foreground sm:text-2xl">
              {activeMeta.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {activeMeta.description}
            </p>
          </section>

          {activeSection === "profile" && (
            <SettingsProfileSection showSummary={false} />
          )}
          {activeSection === "notifications" && <NotificationsSection />}
          {activeSection === "security" && <SecuritySection />}
        </div>
      </div>
    </section>
  )
}
