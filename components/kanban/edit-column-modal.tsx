"use client"

import * as React from "react"
import { AlertTriangle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ColorPicker } from "@/components/ui/color-picker"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter as DialogFooterBase,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog"

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
  onDelete,
  saving = false,
}: EditColumnModalProps) {
  const canSave = title.trim().length > 0 && !saving

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showClose
        className="border-l border-border bg-zinc-950/95 text-foreground"
      >
        <SheetHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle>Editar coluna</SheetTitle>
              <SheetDescription>
                Altere o nome e a cor. O nome pode ser qualquer texto que faça sentido para o seu fluxo.
              </SheetDescription>
            </div>

            {onDelete && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    disabled={saving}
                    aria-label="Excluir coluna"
                    title="Excluir coluna"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-500/10">
                      <AlertTriangle className="h-6 w-6 text-red-400" />
                    </div>
                    <DialogHeader className="flex-1 space-y-2 text-left">
                      <DialogTitle>Excluir coluna</DialogTitle>
                      <DialogDescription>
                        Tem certeza que deseja excluir esta coluna? Todas as tarefas dentro dela serão
                        removidas. Essa ação não pode ser desfeita.
                      </DialogDescription>
                    </DialogHeader>
                  </div>
                  <DialogFooterBase className="mt-4">
                    <DialogClose asChild>
                      <Button type="button" variant="outline">
                        Cancelar
                      </Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => onDelete?.()}
                      >
                        Excluir
                      </Button>
                    </DialogClose>
                  </DialogFooterBase>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </SheetHeader>

        <div className="grid gap-4 px-4 py-2">
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
          <ColorPicker
            value={color}
            hideContrastRatio
            className="z-50"
            onValueChange={(val) => onColorChange(val.hex)}
          >
            <button
              type="button"
              disabled={saving}
              className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-left"
            >
              <Label htmlFor="edit-col-color" className="shrink-0">
                Cor
              </Label>
              <span
                className="h-4 w-4 rounded-md border border-border"
                style={{ backgroundColor: color }}
              />
              <span className="ml-auto font-mono text-xs text-muted-foreground">
                {color}
              </span>
            </button>
          </ColorPicker>
        </div>

        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={onSave} disabled={!canSave}>
            Salvar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

