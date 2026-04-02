import { Suspense } from "react"

import { ProjectBoard } from "@/components/kanban/project-board"

export default async function ProjectBoardPage({
  params,
}: {
  params: Promise<{ project: string }>
}) {
  const { project } = await params

  return (
    <section className="min-h-full p-6">
      <div className="mx-auto max-w-7xl">
        <Suspense fallback={null}>
          <ProjectBoard project={project} />
        </Suspense>
      </div>
    </section>
  )
}
