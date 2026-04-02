"use client"

import * as React from "react"
import { Plus, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Menu } from "@ark-ui/react/menu"
import { ChevronDown } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { MembersSelect } from "@/components/ui/members-select"
import { Button } from "@/components/ui/button"

interface AddTaskFormProps {
  isOpen: boolean
  title: string
  description: string
  color: string
  assigneeIds?: string[]
  assignees?: Array<{ id: string; name: string; imageSrc: string }>
  submitLabel?: string
  heading?: string
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onAssigneeIdsChange?: (value: string[]) => void
  onOpen: () => void
  onCancel: () => void
  onSubmit: () => void
}

function initials(name: string) {
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
  color,
  assigneeIds = [],
  assignees = [],
  submitLabel = "Adicionar",
  heading = "Nova tarefa",
  onTitleChange,
  onDescriptionChange,
  onAssigneeIdsChange,
  onOpen,
  onCancel,
  onSubmit,
}: AddTaskFormProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isMembersMenuOpen, setIsMembersMenuOpen] = React.useState(false)
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

  if (isOpen) {
    const selected = assignees.filter((a) => assigneeIds.includes(a.id))
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
              Defina os detalhes da tarefa, como título, descrição e responsáveis.
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

            <div className="flex w-full items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-card-foreground">
              <span className="text-xs font-medium text-muted-foreground">Cor</span>
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
