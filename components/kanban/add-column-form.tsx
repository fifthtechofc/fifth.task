"use client"

import * as React from "react"
import { Check, Plus, X } from "lucide-react"
import { ColumnType } from "@/types/kanban"

interface AddColumnFormProps {
  isOpen: boolean
  title: string
  type: ColumnType
  color: string
  submitLabel?: string
  heading?: string
  onTitleChange: (value: string) => void
  onTypeChange: (value: ColumnType) => void
  onColorChange: (value: string) => void
  onOpen: () => void
  onCancel: () => void
  onSubmit: () => void
}

const columnOptions: { label: string; value: ColumnType }[] = [
  { label: "Backlog", value: "backlog" },
  { label: "To Do", value: "todo" },
  { label: "In Progress", value: "in-progress" },
  { label: "Review", value: "review" },
  { label: "Done", value: "done" },
  { label: "Custom", value: "custom" },
]

export function AddColumnForm({
  isOpen,
  title,
  type,
  color,
  submitLabel = "Criar coluna",
  heading = "Nova coluna",
  onTitleChange,
  onTypeChange,
  onColorChange,
  onOpen,
  onCancel,
  onSubmit,
}: AddColumnFormProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  if (isOpen) {
    return (
      <div className="min-w-[280px] max-w-[280px] rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-foreground">{heading}</h3>

        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Nome da coluna"
          className="mb-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
        />

        <select
          value={type}
          onChange={(e) => onTypeChange(e.target.value as ColumnType)}
          className="mb-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
        >
          {columnOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <label className="mb-3 flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm text-card-foreground">
          <span>Cor da coluna</span>
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
            type="button"
            onClick={onSubmit}
            className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Check className="h-4 w-4" />
            {submitLabel}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Cancelar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-w-[280px] max-w-[280px] items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/50 p-4 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Plus className="h-4 w-4" />
      Adicionar coluna
    </button>
  )
}
