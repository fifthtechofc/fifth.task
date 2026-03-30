import {
  Bell,
  Building2,
  KeyRound,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react"

import { SettingsProfileSection } from "@/components/settings-profile-section"
import NeuralBackground from "@/components/ui/flow-field-background"

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

const workspaceSettings = [
  {
    label: "Fuso horario",
    value: "America/Sao_Paulo",
  },
  {
    label: "Idioma",
    value: "Portugues (Brasil)",
  },
  {
    label: "Tema atual",
    value: "Dark workspace",
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
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
      <div className="max-w-xl">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <button
        type="button"
        aria-pressed={enabled}
        className={`relative mt-1 inline-flex h-7 w-12 shrink-0 rounded-full border transition-colors ${
          enabled
            ? "border-white/20 bg-zinc-200/90"
            : "border-white/10 bg-white/10"
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
    <section className="relative min-h-full overflow-hidden">
      <NeuralBackground
        className="absolute inset-0 z-0"
        color="#c7d1db"
        trailOpacity={0.2}
        particleCount={650}
        speed={0.85}
      />

      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-br from-black/55 via-black/25 to-black/55" />
      <div className="pointer-events-none absolute -top-32 -left-32 z-10 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 bottom-0 z-10 h-96 w-96 translate-x-1/4 translate-y-1/4 rounded-full bg-white/10 blur-3xl" />

      <div className="relative z-20 min-h-full p-6 md:p-8">
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
              <SettingsProfileSection />

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
              <section className="rounded-[28px] border border-white/10 bg-black/35 p-6 backdrop-blur-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <ShieldCheck className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      Seguranca
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Visibilidade do acesso e protecao do workspace.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <KeyRound className="h-4 w-4 text-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Autenticacao em duas etapas
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Ativada para contas com permissao administrativa.
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full border border-white/10 bg-zinc-200/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-black">
                        Ativa
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Sessoes abertas
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          3 dispositivos autenticados no momento.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-foreground transition-colors hover:bg-white/10"
                      >
                        Revisar
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-white/10 bg-black/35 p-6 backdrop-blur-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <Building2 className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      Workspace
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Parametros gerais do ambiente da equipe.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {workspaceSettings.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4"
                    >
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                        {item.label}
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[28px] border border-white/10 bg-black/35 p-6 backdrop-blur-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <SlidersHorizontal className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      Preferencias rapidas
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Ajustes frequentes do dia a dia.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <SettingToggle
                    title="Auto-save"
                    description="Salvar alteracoes automaticamente ao editar."
                    enabled={true}
                  />
                  <SettingToggle
                    title="Modo foco"
                    description="Reduzir distracoes nas areas de trabalho."
                    enabled={false}
                  />
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
