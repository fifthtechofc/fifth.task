import { AvatarHoverCard } from "@/components/ui/avatar-hover-card"
import NeuralBackground from "@/components/ui/flow-field-background"

type TeamMember = {
  id: string
  name: string
  username: string
  imageSrc: string
  description: string
  role: string
  status: "online" | "focus" | "offline"
}

const teamMembers: TeamMember[] = [
  {
    id: "camila-rocha",
    name: "Camila Rocha",
    username: "camilarocha",
    imageSrc:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=320&q=80",
    description: "Lead de produto focada em discovery, alinhamento entre squads e metas trimestrais.",
    role: "Product Lead",
    status: "online",
  },
  {
    id: "bruno-martins",
    name: "Bruno Martins",
    username: "brunomartins",
    imageSrc:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=320&q=80",
    description: "Frontend engineer responsavel por experiencia, performance e consistencia visual.",
    role: "Frontend Engineer",
    status: "focus",
  },
  {
    id: "larissa-araujo",
    name: "Larissa Araujo",
    username: "larissaaraujo",
    imageSrc:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=320&q=80",
    description: "Designer de produto cuidando de fluxos, sistemas e validacao de interface.",
    role: "Product Designer",
    status: "online",
  },
  {
    id: "diego-ferraz",
    name: "Diego Ferraz",
    username: "diegoferraz",
    imageSrc:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=320&q=80",
    description: "Backend engineer focado em arquitetura, integracoes e confiabilidade de APIs.",
    role: "Backend Engineer",
    status: "online",
  },
  {
    id: "marina-costa",
    name: "Marina Costa",
    username: "marinacosta",
    imageSrc:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=320&q=80",
    description: "People ops acompanhando rituais do time, onboarding e saude operacional.",
    role: "People Ops",
    status: "offline",
  },
  {
    id: "rafael-lima",
    name: "Rafael Lima",
    username: "rafaellima",
    imageSrc:
      "https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=320&q=80",
    description: "Analista de dados suportando performance, previsoes e leitura de indicadores do workspace.",
    role: "Data Analyst",
    status: "focus",
  },
]

function getStatusClasses(status: TeamMember["status"]) {
  if (status === "online") return "bg-emerald-400"
  if (status === "focus") return "bg-amber-400"
  return "bg-zinc-500"
}

export default function TeamsPage() {
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
            <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Times</p>
            <h1 className="mt-2 text-3xl font-bold text-foreground md:text-4xl">
              Pessoas que movem o workspace
            </h1>
            <p className="mt-3 text-sm text-muted-foreground md:text-base">
              Uma visao rapida dos perfis principais do time, com acesso rapido
              para contato e acompanhamento.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="overflow-visible rounded-[28px] border border-white/10 bg-black/35 p-6 backdrop-blur-sm"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{member.name}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      {member.role}
                    </p>
                  </div>
                  <div className={`h-2.5 w-2.5 rounded-full ${getStatusClasses(member.status)}`} />
                </div>

                <div className="relative z-20 flex items-start justify-center py-4">
                  <AvatarHoverCard
                    imageSrc={member.imageSrc}
                    imageAlt={member.name}
                    name={member.name}
                    username={member.username}
                    variant="glass"
                    size="lg"
                  />
                </div>

                <p className="mt-5 text-sm leading-6 text-muted-foreground">
                  {member.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
