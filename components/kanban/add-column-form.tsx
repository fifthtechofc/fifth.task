"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ColumnColorField } from "./column-color-field"

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
  const safeColor = React.useMemo(() => {
    const normalized = color.trim()
    if (/^#[0-9a-fA-F]{6}$/.test(normalized)) return normalized
    if (/^[0-9a-fA-F]{6}$/.test(normalized)) return `#${normalized}`
    return "#0ea5e9"
  }, [color])

  React.useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus()
  }, [isOpen])

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        data-no-drag-scroll="true"
        className={
          compact
            ? "flex h-14 min-w-[280px] max-w-[280px] touch-manipulation items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/50 p-4 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            : "flex h-full min-h-[420px] w-full touch-manipulation items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/35 p-6 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        }
      >
        <Plus className="h-4 w-4" />
        Adicionar coluna
      </button>

      <Dialog open={isOpen} onOpenChange={(open) => (!open ? onCancel() : undefined)}>
        <DialogContent className="max-h-[85dvh] w-[min(92vw,34rem)] overflow-y-auto border border-white/10 bg-zinc-950/98 p-0 text-foreground shadow-2xl">
          <DialogHeader className="border-b border-white/10 px-6 py-5 text-left">
            <DialogTitle>{heading}</DialogTitle>
            <DialogDescription>
              Defina o nome e a cor da nova coluna do seu fluxo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-6 py-5">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Nome da coluna</p>
              <Input
                ref={inputRef}
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="Ex: Em análise, QA, Bloqueado..."
                className="border-white/15 bg-black/35 text-zinc-100"
              />
            </div>

            <ColumnColorField value={safeColor} onChange={onColorChange} />
          </div>

          <DialogFooter className="border-t border-white/10 px-6 py-5">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1 border-white/15 bg-black/25 hover:bg-black/45"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={onSubmit}
              className="flex-1 bg-sky-500 text-black hover:bg-sky-400"
            >
              {submitLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
