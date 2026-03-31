"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface EditColumnModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  color: string
  onTitleChange: (value: string) => void
  onColorChange: (value: string) => void
  onSave: () => void
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-zinc-950/95 text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar coluna</DialogTitle>
          <DialogDescription>
            Altere o nome e a cor. O nome pode ser qualquer texto que faça sentido para o seu fluxo.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="edit-col-title">Nome da coluna</Label>
            <Input
              id="edit-col-title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Nome da coluna"
              disabled={saving}
              className="border-white/15 bg-black/40"
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSave) {
                  e.preventDefault()
                  onSave()
                }
              }}
            />
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
            <Label htmlFor="edit-col-color" className="shrink-0">
              Cor
            </Label>
            <input
              id="edit-col-color"
              type="color"
              value={color}
              onChange={(e) => onColorChange(e.target.value)}
              disabled={saving}
              className="h-9 w-14 cursor-pointer rounded border-0 bg-transparent p-0"
            />
            <span className="font-mono text-xs text-muted-foreground">{color}</span>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={onSave} disabled={!canSave}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
