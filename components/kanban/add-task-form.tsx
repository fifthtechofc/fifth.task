"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MembersSelect } from "@/components/ui/members-select"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface AddTaskFormProps {
  isOpen: boolean
  title: string
  description: string
  color: string
  columnId?: string
  availableColumns?: Array<{ id: string; title: string }>
  assigneeIds?: string[]
  assignees?: Array<{ id: string; name: string; imageSrc: string }>
  submitLabel?: string
  heading?: string
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onColumnChange?: (value: string) => void
  onAssigneeIdsChange?: (value: string[]) => void
  onOpen: () => void
  onCancel: () => void
  onSubmit: () => void
}

export function AddTaskForm({
  isOpen,
  title,
  description,
  color,
  columnId,
  availableColumns = [],
  assigneeIds = [],
  assignees = [],
  submitLabel = "Adicionar",
  heading = "Nova tarefa",
  onTitleChange,
  onDescriptionChange,
  onColumnChange,
  onAssigneeIdsChange,
  onOpen,
  onCancel,
  onSubmit,
}: AddTaskFormProps) {
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

  if (isOpen) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => (!open ? onCancel() : undefined)}>
        <DialogContent className="max-h-[85dvh] w-[min(92vw,36rem)] overflow-y-auto border border-white/10 bg-zinc-950/98 p-0 text-foreground shadow-2xl">
          <DialogHeader className="border-b border-white/10 px-6 py-5 text-left">
            <DialogTitle>{heading}</DialogTitle>
            <DialogDescription>
              Defina os detalhes da tarefa, como título, descrição e responsáveis.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 py-5">
            <Input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
              placeholder="Digite o título da tarefa..."
              className="border-white/15 bg-black/35 text-zinc-100"
            />

            <Textarea
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Descrição da tarefa (opcional)"
              rows={4}
              className="resize-none border-white/15 bg-black/35 text-zinc-100"
            />

            {onColumnChange && availableColumns.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Coluna</p>
                <Select value={columnId} onValueChange={onColumnChange}>
                  <SelectTrigger
                    data-no-drag-scroll="true"
                    className="touch-manipulation border-white/15 bg-black/35 text-zinc-100"
                  >
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableColumns.map((column) => (
                      <SelectItem key={column.id} value={column.id}>
                        {column.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Cor</p>
              <div className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-card-foreground">
                <span
                  className="h-4 w-4 rounded-full border border-white/15"
                  style={{ backgroundColor: safeColor }}
                />
                <span className="font-mono uppercase tracking-[0.18em] text-zinc-300">
                  {safeColor}
                </span>
                <span className="ml-auto text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  Herdada da coluna
                </span>
              </div>
            </div>

            {onAssigneeIdsChange && assignees.length > 0 && (
              <MembersSelect
                members={assignees}
                selectedIds={assigneeIds}
                onChange={onAssigneeIdsChange}
              />
            )}
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
    )
  }

  return (
    <button
      onClick={onOpen}
      data-no-drag-scroll="true"
      className="flex w-full touch-manipulation items-center justify-center gap-1 rounded-lg p-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      type="button"
    >
      <Plus className="h-4 w-4" />
      Adicionar tarefa
    </button>
  )
}
