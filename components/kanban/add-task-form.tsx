"use client"
import { Plus } from "lucide-react"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MembersSelect } from "@/components/ui/members-select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

interface AddTaskFormProps {
  isOpen: boolean
  title: string
  description: string
  dueDate?: string
  dueTime?: string
  color: string
  assigneeIds?: string[]
  assignees?: Array<{ id: string; name: string; imageSrc: string }>
  submitLabel?: string
  heading?: string
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onDueDateChange?: (value: string) => void
  onDueTimeChange?: (value: string) => void
  onAssigneeIdsChange?: (value: string[]) => void
  onOpen: () => void
  onCancel: () => void
  onSubmit: () => void
}

function _initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function AddTaskForm({
  isOpen,
  title,
  description,
  dueDate = "",
  dueTime = "",
  color,
  assigneeIds = [],
  assignees = [],
  submitLabel = "Adicionar",
  heading = "Nova tarefa",
  onTitleChange,
  onDescriptionChange,
  onDueDateChange,
  onDueTimeChange,
  onAssigneeIdsChange,
  onOpen,
  onCancel,
  onSubmit,
}: AddTaskFormProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [_isMembersMenuOpen, _setIsMembersMenuOpen] = React.useState(false)
  const safeColor = React.useMemo(() => {
    const c = (color ?? "").trim()
    if (/^#[0-9a-fA-F]{3,8}$/.test(c)) return c as `#${string}`
    if (/^[0-9a-fA-F]{3,8}$/.test(c)) return `#${c}` as `#${string}`
    return "#64748b" as `#${string}`
  }, [color])

  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  if (isOpen) {
    const _selected = assignees.filter((a) => assigneeIds.includes(a.id))
    return (
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
              Defina os detalhes da tarefa, como título, descrição e
              responsáveis.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3 px-4 py-2">
            <Input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
              placeholder="Digite o título da tarefa…"
              className="text-sm transition-all duration-200 focus-visible:ring-primary/40"
            />

            <Textarea
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Descrição da tarefa (opcional)"
              rows={3}
              className="resize-none text-sm transition-all duration-200 focus-visible:ring-primary/40"
            />

            {onDueDateChange && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="task-due-date"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Data de entrega
                  </label>
                  <Input
                    id="task-due-date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => onDueDateChange(e.target.value)}
                    className="text-sm transition-all duration-200 focus-visible:ring-primary/40"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="task-due-time"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Horário de entrega
                  </label>
                  <Input
                    id="task-due-time"
                    type="time"
                    value={dueTime}
                    onChange={(e) => onDueTimeChange?.(e.target.value)}
                    disabled={!dueDate}
                    className="text-sm transition-all duration-200 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>
            )}

            <div className="flex w-full items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-card-foreground">
              <span className="text-xs font-medium text-muted-foreground">
                Cor
              </span>
              <span
                className="h-4 w-4 rounded-md border border-border"
                style={{ backgroundColor: safeColor }}
              />
              <span className="ml-auto text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Herdada da coluna
              </span>
            </div>

            {onAssigneeIdsChange && assignees.length > 0 && (
              <MembersSelect
                members={assignees}
                selectedIds={assigneeIds}
                onChange={onAssigneeIdsChange}
              />
            )}
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
            <Button type="button" onClick={onSubmit} className="flex-1">
              {submitLabel}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
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
