"use client"

import { MoreHorizontal } from "lucide-react"

import { UserAvatars } from "@/components/ui/user-avatars"
import type { Project } from "@/lib/projects"
import { cn } from "@/lib/utils"
import { getProjectAgeLabel } from "@/lib/utils/date"

const accentByCategory = [
  {
    tag: "green",
    accent: "bg-zinc-200/90",
    progress: "bg-zinc-100/90",
    ring: "shadow-[0_0_0_1px_rgba(255,255,255,0.08)]",
  },
  {
    tag: "orange",
    accent: "bg-zinc-300/85",
    progress: "bg-zinc-200/90",
    ring: "shadow-[0_0_0_1px_rgba(255,255,255,0.08)]",
  },
  {
    tag: "red",
    accent: "bg-zinc-400/80",
    progress: "bg-zinc-300/85",
    ring: "shadow-[0_0_0_1px_rgba(255,255,255,0.08)]",
  },
  {
    tag: "blue",
    accent: "bg-slate-300/85",
    progress: "bg-slate-200/90",
    ring: "shadow-[0_0_0_1px_rgba(255,255,255,0.08)]",
  },
] as const

function getAccentSet(project: Project) {
  const seed = project.category?.length || project.title.length || 0
  return accentByCategory[seed % accentByCategory.length]
}

function formatProjectDate(value: string) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return "No date"

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

export function ProjectCard({
  isDragging = false,
  onEdit,
  onDragEnd,
  onDragOver,
  onDragStart,
  project,
}: {
  isDragging?: boolean
  onEdit: (project: Project) => void
  onDragEnd?: () => void
  onDragOver?: () => void
  onDragStart?: () => void
  project: Project
}) {
  const accentSet = getAccentSet(project)
  const progress = `${project.progress}%`
  const members = project.members
  const ageText = getProjectAgeLabel(project.createdAt)

  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragOver={(event) => {
        event.preventDefault()
        onDragOver?.()
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "group flex min-h-[320px] cursor-grab flex-col justify-between rounded-[28px] border border-white/8 bg-black/35 p-6 text-[var(--color-white)] backdrop-blur-xl transition-transform duration-300 hover:-translate-y-1 active:cursor-grabbing",
        isDragging && "scale-[0.98] opacity-60",
        accentSet.ring,
      )}
    >
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <span
              className={cn(
                "inline-flex rounded-full border border-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-black",
                accentSet.accent,
              )}
            >
              {project.category?.trim() || "UNCATEGORIZED"}
            </span>
            <p className="text-sm text-[var(--color-gray-light)]/70">
              {formatProjectDate(project.createdAt)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onEdit(project)}
            draggable={false}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[var(--color-gray-light)] transition-colors hover:bg-white/10"
            aria-label={`Editar projeto ${project.title}`}
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <h3 className="text-2xl font-semibold capitalize tracking-tight text-[var(--color-white)]">
            {project.title}
          </h3>
          <p className="max-w-[28ch] text-sm leading-6 text-[var(--color-gray-light)]/75">
            {project.description}
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-[var(--color-gray-light)]/80">
            <span>Progress</span>
            <span className="font-semibold text-[var(--color-white)]">{progress}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
            <div
              className={cn("h-full rounded-full transition-[width] duration-500", accentSet.progress)}
              style={{ width: progress }}
            />
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4 border-t border-white/8 pt-5">
        <div className="min-w-0">
          <UserAvatars
            users={members.map((member) => ({
              id: member.id,
              name: member.name,
              image: member.avatarUrl || "/Logo.png",
            }))}
            size={40}
            maxVisible={members.length || 1}
            overlap={58}
            focusScale={1.12}
            tooltipPlacement="top"
            isOverlapOnly
          />
        </div>

        <span
          className={cn(
            "rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-black",
            accentSet.accent,
          )}
        >
          {ageText}
        </span>
      </div>
    </article>
  )
}

export function ProjectCardSkeleton() {
  return (
    <article className="flex min-h-[320px] animate-pulse flex-col justify-between rounded-[28px] border border-white/8 bg-black/35 p-6 backdrop-blur-xl">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="h-7 w-32 rounded-full bg-white/10" />
            <div className="h-4 w-24 rounded-full bg-white/10" />
          </div>
          <div className="h-10 w-10 rounded-full bg-white/10" />
        </div>

        <div className="space-y-3">
          <div className="h-8 w-48 rounded-full bg-white/10" />
          <div className="h-4 w-full max-w-[28ch] rounded-full bg-white/10" />
          <div className="h-4 w-4/5 max-w-[28ch] rounded-full bg-white/10" />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-16 rounded-full bg-white/10" />
            <div className="h-4 w-12 rounded-full bg-white/10" />
          </div>
          <div className="h-2.5 rounded-full bg-white/10" />
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4 border-t border-white/8 pt-5">
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-white/10" />
          <div className="-ml-2 h-10 w-10 rounded-full bg-white/10" />
          <div className="-ml-2 h-10 w-10 rounded-full bg-white/10" />
        </div>
        <div className="h-10 w-32 rounded-full bg-white/10" />
      </div>
    </article>
  )
}
