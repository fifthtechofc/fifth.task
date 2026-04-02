import {
  Bell,
} from "lucide-react"

import { SettingsProfileSection } from "@/components/settings-profile-section"
import { LoginInfoCard } from "@/components/settings/login-info-card"

const notificationSettings = [
  {
    title: "Resumo diario",
    description: "Receba um consolidado com tarefas, entregas e eventos do dia.",
    enabled: true,
  },
  {
    title: "Alertas de prazo",
    description: "Avise quando um projeto ou card estiver perto do vencimento.",
    enabled: true,
  },
  {
    title: "Atualizacoes de equipe",
    description: "Notifique quando houver nova atividade relevante no workspace.",
    enabled: false,
  },
]


function SettingToggle({
  title,
  description,
  enabled,
}: {
  title: string
  description: string
  enabled: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg:white/[0.03] px-4 py-4">
      <div className="max-w-xl">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <button
        type="button"
        aria-pressed={enabled}
        className={`relative mt-1 inline-flex h-7 w-12 shrink-0 rounded-full border transition-colors ${
          enabled ? "border-white/20 bg-zinc-200/90" : "border-white/10 bg-white/10"
        }`}
      >
        <span
          className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition-all ${
            enabled ? "right-1 bg-black" : "left-1 bg-zinc-300"
          }`}
        />
      </button>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <section className="relative min-h-full p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
            Configuracoes
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground md:text-4xl">
            Preferencias do workspace
          </h1>
          <p className="mt-3 text-sm text-muted-foreground md:text-base">
            Ajuste perfil, notificacoes, seguranca e comportamento geral do
            ambiente de trabalho da equipe.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <SettingsProfileSection showSummary={false} />

            <section className="rounded-[28px] border border-white/10 bg-black/35 p-6 backdrop-blur-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <Bell className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Notificacoes
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Controle o que chega para voce no fluxo diario.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {notificationSettings.map((item) => (
                  <SettingToggle
                    key={item.title}
                    title={item.title}
                    description={item.description}
                    enabled={item.enabled}
                  />
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <LoginInfoCard />
          </div>
        </div>
      </div>
    </section>
  )
}
