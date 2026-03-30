"use client"

import * as React from "react"
import { Check, Plus, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface AddTaskFormProps {
  isOpen: boolean
  title: string
  description: string
  color: string
  assigneeIds?: string[]
  assignees?: Array<{ id: string; name: string; imageSrc: string }>
  submitLabel?: string
  heading?: string
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onColorChange: (value: string) => void
  onAssigneeIdsChange?: (value: string[]) => void
  onOpen: () => void
  onCancel: () => void
  onSubmit: () => void
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function AddTaskForm({
  isOpen,
  title,
  description,
  color,
  assigneeIds = [],
  assignees = [],
  submitLabel = "Adicionar",
  heading = "Nova tarefa",
  onTitleChange,
  onDescriptionChange,
  onColorChange,
  onAssigneeIdsChange,
  onOpen,
  onCancel,
  onSubmit,
}: AddTaskFormProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  if (isOpen) {
    const selected = assignees.filter((a) => assigneeIds.includes(a.id))
    return (
      <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-card-foreground">{heading}</h3>

        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder="Digite o titulo da tarefa..."
          className="mb-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-card-foreground outline-none placeholder:text-muted-foreground"
        />

        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Descricao da tarefa"
          rows={3}
          className="mb-3 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-card-foreground outline-none placeholder:text-muted-foreground"
        />

        <label className="mb-3 flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm text-card-foreground">
          <span>Cor do card</span>
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border-none bg-transparent p-0"
          />
          <span className="font-mono text-xs text-muted-foreground">{color}</span>
        </label>

        {onAssigneeIdsChange && assignees.length > 0 && (
          <div className="mb-3 rounded-md border border-border bg-background px-3 py-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-card-foreground">Atribuir a</span>
              {selected.length > 0 && (
                <div className="flex items-center gap-1">
                  {selected.slice(0, 3).map((m) => (
                    <Avatar key={m.id} className="h-6 w-6 border border-white/10">
                      <AvatarImage src={m.imageSrc || undefined} alt={m.name} />
                      <AvatarFallback className="text-[10px]">{initials(m.name)}</AvatarFallback>
                    </Avatar>
                  ))}
                  {selected.length > 3 && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      +{selected.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => onAssigneeIdsChange([])}
                className="self-start rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                Limpar responsáveis
              </button>

              <div className="max-h-44 overflow-auto rounded-md border border-border bg-background p-2">
                <div className="grid gap-1">
                  {assignees.map((a) => {
                    const checked = assigneeIds.includes(a.id)
                    return (
                      <label
                        key={a.id}
                        className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/60"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = checked
                              ? assigneeIds.filter((id) => id !== a.id)
                              : [...assigneeIds, a.id]
                            onAssigneeIdsChange(next)
                          }}
                        />
                        <Avatar className="h-6 w-6 border border-white/10">
                          <AvatarImage src={a.imageSrc || undefined} alt={a.name} />
                          <AvatarFallback className="text-[10px]">{initials(a.name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-card-foreground">{a.name}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onSubmit}
            className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            type="button"
          >
            <Check className="h-4 w-4" />
            {submitLabel}
          </button>

          <button
            onClick={onCancel}
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Cancelar"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center justify-center gap-1 rounded-lg p-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      type="button"
    >
      <Plus className="h-4 w-4" />
      Adicionar tarefa
    </button>
  )
}
