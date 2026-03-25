"use client"

import * as React from "react"
import { Check, Plus, X } from "lucide-react"

interface AddTaskFormProps {
  isOpen: boolean
  title: string
  description: string
  color: string
  submitLabel?: string
  heading?: string
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onColorChange: (value: string) => void
  onOpen: () => void
  onCancel: () => void
  onSubmit: () => void
}

export function AddTaskForm({
  isOpen,
  title,
  description,
  color,
  submitLabel = "Adicionar",
  heading = "Nova tarefa",
  onTitleChange,
  onDescriptionChange,
  onColorChange,
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
