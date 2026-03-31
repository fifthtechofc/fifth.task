"use client"

import * as React from "react"
import { Check, Plus, X } from "lucide-react"

interface AddColumnFormProps {
  isOpen: boolean
  title: string
  color: string
  compact?: boolean
  submitLabel?: string
  heading?: string
  onTitleChange: (value: string) => void
  onColorChange: (value: string) => void
  onOpen: () => void
  onCancel: () => void
  onSubmit: () => void
}

export function AddColumnForm({
  isOpen,
  title,
  color,
  compact = false,
  submitLabel = "Criar coluna",
  heading = "Nova coluna",
  onTitleChange,
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
        <h3 className="mb-1 text-sm font-semibold text-foreground">{heading}</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Use o nome que fizer sentido para o seu fluxo — em qualquer idioma.
        </p>

        <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="kanban-col-title">
          Nome da coluna
        </label>
        <input
          ref={inputRef}
          id="kanban-col-title"
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Ex: Em análise, QA, Bloqueado…"
          className="mb-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
        />

        <label className="mb-3 flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm text-card-foreground">
          <span>Cor</span>
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
      className={
        compact
          ? "flex h-14 min-w-[280px] max-w-[280px] items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/50 p-4 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          : "flex h-full min-h-[420px] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/35 p-6 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
      }
    >
      <Plus className="h-4 w-4" />
      Adicionar coluna
    </button>
  )
}
