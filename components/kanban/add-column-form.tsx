"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { ColorPicker } from "@/components/ui/color-picker"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

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
    const c = (color ?? '').trim()
    if (/^#[0-9a-fA-F]{3,8}$/.test(c)) return c as `#${string}`
    if (/^[0-9a-fA-F]{3,8}$/.test(c)) return `#${c}` as `#${string}`
    return '#64748b' as `#${string}`
  }, [color])

  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  return (
    <>
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

      <Sheet
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onCancel()
        }}
      >
        <SheetContent
          side="right"
          showClose
          className="border-l border-border bg-zinc-950/95 text-foreground"
        >
          <SheetHeader>
            <SheetTitle>{heading}</SheetTitle>
            <SheetDescription>
              Defina o nome e a cor da nova coluna do seu fluxo.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4 px-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Nome da coluna</p>
              <Input
                ref={inputRef}
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="Ex: Em análise, QA, Bloqueado…"
              />
            </div>

            <ColorPicker
              value={safeColor}
              hideContrastRatio
              className="z-50"
              onValueChange={(val) => onColorChange(val.hex)}
            >
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-card-foreground"
              >
                <span className="text-xs font-medium text-muted-foreground">Cor da coluna</span>
                <span
                  className="h-4 w-4 rounded-md border border-border"
                  style={{ backgroundColor: safeColor }}
                />
                <span className="ml-auto font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  {safeColor}
                </span>
              </button>
            </ColorPicker>
          </div>

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={onSubmit}
              className="flex-1"
            >
              {submitLabel}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
