"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  type MemberOption,
  MembersSelect,
} from "@/components/ui/members-select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { Project } from "@/lib/projects"

type ProjectEditSheetProps = {
  memberOptions: MemberOption[]
  onOpenChange: (open: boolean) => void
  onSave: (params: {
    id: string
    title: string
    description: string
    memberIds: string[]
    progress: number
  }) => Promise<void>
  open: boolean
  project: Project | null
}

export function ProjectEditSheet({
  memberOptions,
  onOpenChange,
  onSave,
  open,
  project,
}: ProjectEditSheetProps) {
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [memberIds, setMemberIds] = React.useState<string[]>([])
  const [progress, setProgress] = React.useState(0)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!project) return
    setTitle(project.title)
    setDescription(project.description)
    setMemberIds(project.members.map((member) => member.id))
    setProgress(project.progress)
    setError(null)
  }, [project])

  async function handleSave() {
    if (!project) return
    setSaving(true)
    setError(null)
    try {
      await onSave({
        id: project.id,
        title,
        description,
        memberIds,
        progress,
      })
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar o projeto.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showClose
        className="border-l border-border bg-zinc-950/95 text-foreground"
      >
        <SheetHeader>
          <SheetTitle>Editar projeto</SheetTitle>
          <SheetDescription>
            Atualize o título, a descrição e os membros que atuam neste projeto.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 py-3">
          <div className="space-y-2">
            <label
              htmlFor="project-title-edit"
              className="text-xs font-medium text-muted-foreground"
            >
              Título
            </label>
            <Input
              id="project-title-edit"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome do projeto"
              className="border-white/15 bg-black/40"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="project-desc-edit"
              className="text-xs font-medium text-muted-foreground"
            >
              Descrição
            </label>
            <Textarea
              id="project-desc-edit"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do projeto"
              rows={4}
              className="border-white/15 bg-black/40"
            />
          </div>

          <MembersSelect
            label="Quem está atuando"
            buttonLabel="Selecionar membros do time"
            members={memberOptions}
            selectedIds={memberIds}
            onChange={setMemberIds}
          />

          <div className="space-y-2">
            <label
              htmlFor="project-progress-edit"
              className="text-xs font-medium text-muted-foreground"
            >
              Progresso
            </label>
            <div className="flex items-center gap-3">
              <Input
                id="project-progress-edit"
                type="number"
                min={0}
                max={100}
                value={progress}
                onChange={(e) =>
                  setProgress(
                    Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                  )
                }
                className="w-24 border-white/15 bg-black/40"
              />
              <span className="text-xs text-muted-foreground">%</span>
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-white/10"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <SheetFooter className="flex-row items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
