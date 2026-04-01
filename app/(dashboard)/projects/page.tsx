import { ProjectList } from "@/components/projects/project-list"

export default function ProjectsPage() {
  return (
    <section className="relative min-h-full p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
            Projetos
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground md:text-4xl">
            Workspace de projetos ativos
          </h1>
          <p className="mt-3 text-sm text-muted-foreground md:text-base">
            Visualize entregas em andamento, progresso atual e pessoas
            envolvidas em cada iniciativa do workspace.
          </p>
        </div>

        <ProjectList />
      </div>
    </section>
  )
}
