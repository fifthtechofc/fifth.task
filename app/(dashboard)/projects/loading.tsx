"use client"

import { ProjectCardSkeleton } from "@/components/projects/project-card"

export default function ProjectsLoading() {
  return (
    <section className="relative min-h-full p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-2xl">
          <div className="h-4 w-24 animate-pulse rounded-full bg-white/10" />
          <div className="mt-4 h-10 w-80 animate-pulse rounded-full bg-white/10" />
          <div className="mt-3 h-5 w-full max-w-xl animate-pulse rounded-full bg-white/10" />
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <ProjectCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
