"use client"

import * as React from "react"

import { ProjectCard, ProjectCardSkeleton } from "@/components/projects/project-card"
import { ProjectEditSheet } from "@/components/projects/project-edit-sheet"
import { getTeamMembers } from "@/lib/profile"
import { fetchProjects, type Project, updateProject } from "@/lib/projects"
import { supabase } from "@/lib/supabase"
import type { MemberOption } from "@/components/ui/members-select"

function getProjectOrderStorageKey(userId: string) {
  return `projects:order:${userId}`
}

function sortProjectsByStoredOrder(projects: Project[], storedOrder: string[]) {
  if (!storedOrder.length) return projects

  const rank = new Map(storedOrder.map((id, index) => [id, index]))
  return [...projects].sort((a, b) => {
    const aRank = rank.get(a.id)
    const bRank = rank.get(b.id)

    if (aRank === undefined && bRank === undefined) return 0
    if (aRank === undefined) return 1
    if (bRank === undefined) return -1
    return aRank - bRank
  })
}

export function ProjectList() {
  const [projects, setProjects] = React.useState<Project[]>([])
  const [loading, setLoading] = React.useState(true)
  const [editingProject, setEditingProject] = React.useState<Project | null>(null)
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [memberOptions, setMemberOptions] = React.useState<MemberOption[]>([])
  const [userId, setUserId] = React.useState<string | null>(null)
  const [draggingId, setDraggingId] = React.useState<string | null>(null)

  React.useEffect(() => {
    let alive = true

    ;(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!alive) return
      setUserId(user?.id ?? null)
    })()

    return () => {
      alive = false
    }
  }, [])

  React.useEffect(() => {
    let alive = true

    async function loadProjects() {
      setLoading(true)
      try {
        const rows = await fetchProjects()
        if (!alive) return
        if (!userId) {
          setProjects(rows)
          return
        }

        let storedOrder: string[] = []
        try {
          const raw = window.localStorage.getItem(getProjectOrderStorageKey(userId))
          storedOrder = raw ? (JSON.parse(raw) as string[]) : []
        } catch {
          storedOrder = []
        }

        setProjects(sortProjectsByStoredOrder(rows, storedOrder))
      } catch {
        if (!alive) return
        setProjects([])
      } finally {
        if (!alive) return
        setLoading(false)
      }
    }

    void loadProjects()
    return () => {
      alive = false
    }
  }, [userId])

  React.useEffect(() => {
    let alive = true

    async function loadMembers() {
      try {
        const members = await getTeamMembers()
        if (!alive) return
        setMemberOptions(
          members.map((member) => ({
            id: member.id,
            name: member.name,
            imageSrc: member.imageSrc,
          })),
        )
      } catch {
        if (!alive) return
        setMemberOptions([])
      }
    }

    void loadMembers()
    return () => {
      alive = false
    }
  }, [])

  async function handleSaveProject(params: {
    id: string
    title: string
    description: string
    memberIds: string[]
    progress: number
  }) {
    await updateProject(params)
    const rows = await fetchProjects()
    if (!userId) {
      setProjects(rows)
      return
    }

    let storedOrder: string[] = []
    try {
      const raw = window.localStorage.getItem(getProjectOrderStorageKey(userId))
      storedOrder = raw ? (JSON.parse(raw) as string[]) : []
    } catch {
      storedOrder = []
    }

    setProjects(sortProjectsByStoredOrder(rows, storedOrder))
  }

  function persistProjectOrder(nextProjects: Project[]) {
    if (!userId) return
    try {
      window.localStorage.setItem(
        getProjectOrderStorageKey(userId),
        JSON.stringify(nextProjects.map((project) => project.id)),
      )
    } catch {
      // ignore storage errors
    }
  }

  function moveProject(draggedId: string, targetId: string) {
    setProjects((current) => {
      const draggedIndex = current.findIndex((project) => project.id === draggedId)
      const targetIndex = current.findIndex((project) => project.id === targetId)
      if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
        return current
      }

      const next = [...current]
      const [dragged] = next.splice(draggedIndex, 1)
      next.splice(targetIndex, 0, dragged)
      persistProjectOrder(next)
      return next
    })
  }

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <ProjectCardSkeleton key={index} />
        ))}
      </div>
    )
  }

  if (!projects.length) {
    return (
      <div className="rounded-[28px] border border-dashed border-white/10 bg-black/25 px-6 py-14 text-center">
        <p className="text-base font-medium text-foreground">Nenhum projeto encontrado</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Quando houver projetos cadastrados, eles vao aparecer aqui automaticamente.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            isDragging={draggingId === project.id}
            project={project}
            onDragStart={() => setDraggingId(project.id)}
            onDragOver={() => {
              if (!draggingId || draggingId === project.id) return
              moveProject(draggingId, project.id)
            }}
            onDragEnd={() => setDraggingId(null)}
            onEdit={(selectedProject) => {
              setEditingProject(selectedProject)
              setSheetOpen(true)
            }}
          />
        ))}
      </div>

      <ProjectEditSheet
        open={sheetOpen}
        project={editingProject}
        memberOptions={memberOptions}
        onOpenChange={(open) => {
          setSheetOpen(open)
          if (!open) setEditingProject(null)
        }}
        onSave={handleSaveProject}
      />
    </>
  )
}
