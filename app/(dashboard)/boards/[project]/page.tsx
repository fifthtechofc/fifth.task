import { ProjectBoard } from "@/components/kanban/project-board"

function formatProjectName(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export default async function ProjectBoardPage({
  params,
}: {
  params: Promise<{ project: string }>
}) {
  const { project } = await params
  const title = formatProjectName(project)

  return (
    <section className="min-h-full p-6">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Kanban basico por projeto para validar a ideia de multiplos boards.
        </p>

        <div className="mt-6">
          <ProjectBoard project={project} />
        </div>
      </div>
    </section>
  )
}
