import {
  BarChart3,
  BriefcaseBusiness,
  FolderPlus,
  Gauge,
  Target,
  Users,
} from "lucide-react"

import { BudgetCard } from "@/components/ui/analytics-bento"

const metrics = [
  {
    label: "Produtividade",
    value: "87%",
    detail: "12% acima da meta mensal",
    icon: Gauge,
  },
  {
    label: "Projetos Criados",
    value: "24",
    detail: "5 novos projetos nesta semana",
    icon: FolderPlus,
  },
  {
    label: "Entregas Feitas",
    value: "132",
    detail: "26 concluídas no sprint atual",
    icon: Target,
  },
  {
    label: "Membros Ativos",
    value: "18",
    detail: "14 online agora",
    icon: Users,
  },
  {
    label: "Boards em Operacao",
    value: "9",
    detail: "3 com alta prioridade",
    icon: BriefcaseBusiness,
  },
  {
    label: "Performance Geral",
    value: "91",
    detail: "indice consolidado do workspace",
    icon: BarChart3,
  },
]

export default function AnalyticsPage() {
  return (
    <section className="relative min-h-full p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
            Analytics
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground md:text-4xl">
            Visao consolidada da operacao
          </h1>
          <p className="mt-3 text-sm text-muted-foreground md:text-base">
            Indicadores do workspace para acompanhar produtividade, criacao de
            projetos, entregas e evolucao financeira.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          <BudgetCard />

          <div className="grid gap-6 sm:grid-cols-2">
            {metrics.slice(0, 4).map((metric) => {
              const Icon = metric.icon
              return (
                <article
                  key={metric.label}
                  className="rounded-[28px] border border-white/10 bg-black/35 p-6 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">
                      {metric.label}
                    </p>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <Icon className="h-4 w-4 text-foreground" />
                    </div>
                  </div>

                  <p className="mt-6 text-4xl font-semibold tracking-tight text-foreground">
                    {metric.value}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {metric.detail}
                  </p>
                </article>
              )
            })}
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {metrics.slice(4).map((metric) => {
            const Icon = metric.icon
            return (
              <article
                key={metric.label}
                className="rounded-[28px] border border-white/10 bg-black/35 p-6 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {metric.label}
                    </p>
                    <p className="mt-3 text-3xl font-semibold text-foreground">
                      {metric.value}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                </div>

                <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-zinc-200/90"
                    style={{
                      width:
                        metric.label === "Boards em Operacao" ? "64%" : "91%",
                    }}
                  />
                </div>

                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {metric.detail}
                </p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
