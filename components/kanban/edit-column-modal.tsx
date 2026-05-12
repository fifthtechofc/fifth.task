"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ColumnColorField } from "./column-color-field"

interface EditColumnModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  color: string
  onTitleChange: (value: string) => void
  onColorChange: (value: string) => void
  onSave: () => void
  onDelete?: () => void
  saving?: boolean
}

export function EditColumnModal({
  open,
  onOpenChange,
  title,
  color,
  onTitleChange,
  onColorChange,
  onSave,
  saving = false,
}: EditColumnModalProps) {
  const canSave = title.trim().length > 0 && !saving
  const safeColor = React.useMemo(() => {
    const normalized = color.trim()
    if (/^#[0-9a-fA-F]{6}$/.test(normalized)) return normalized
    if (/^[0-9a-fA-F]{6}$/.test(normalized)) return `#${normalized}`
    return "#0ea5e9"
  }, [color])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] w-[min(92vw,34rem)] overflow-y-auto border border-white/10 bg-zinc-950/98 p-0 text-foreground shadow-2xl">
        <DialogHeader className="border-b border-white/10 px-6 py-5 text-left">
          <DialogTitle>Editar coluna</DialogTitle>
          <DialogDescription>
            Altere o nome e a cor da coluna.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Nome da coluna</p>
            <Input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Nome da coluna"
              disabled={saving}
              className="border-white/15 bg-black/35 text-zinc-100"
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSave) {
                  e.preventDefault()
                  onSave()
                }
              }}
            />
          </div>

          <ColumnColorField value={safeColor} onChange={onColorChange} disabled={saving} />
        </div>

        <DialogFooter className="border-t border-white/10 px-6 py-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="border-white/15 bg-black/25 hover:bg-black/45"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            className="bg-sky-500 text-black hover:bg-sky-400"
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
