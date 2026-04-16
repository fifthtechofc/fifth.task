import { Suspense } from "react"

import { ProjectBoard } from "@/components/kanban/project-board"

export default async function ProjectBoardPage({
  params,
}: {
  params: Promise<{ project: string }>
}) {
  const { project } = await params

  return (
    <section className="min-h-full p-3 sm:p-4 md:p-6">
      <div className="w-full">
        <Suspense fallback={null}>
          <ProjectBoard project={project} />
        </Suspense>
      </div>
    </section>
  )
}
