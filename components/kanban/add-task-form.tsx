"use client"

import * as React from "react"
import { Plus, X } from "lucide-react"

interface AddTaskFormProps {
  isOpen: boolean
  value: string
  onChange: (value: string) => void
  onOpen: () => void
  onCancel: () => void
  onSubmit: () => void
}

export function AddTaskForm({
  isOpen,
  value,
  onChange,
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
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder="Digite o título da tarefa..."
          className="mb-2 w-full border-none bg-transparent text-sm text-card-foreground outline-none placeholder:text-muted-foreground"
        />

        <div className="flex gap-2">
          <button
            onClick={onSubmit}
            className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            type="button"
          >
            Adicionar
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