"use client"

import * as React from "react"
import { Check, Plus, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Menu } from "@ark-ui/react/menu"
import { ChevronDown } from "lucide-react"
import ButtonSaveDemo from "@/components/ui/button-save"

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
  onColorChange: (value: string) => void
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
  onColorChange,
  onAssigneeIdsChange,
  onOpen,
  onCancel,
  onSubmit,
}: AddTaskFormProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isMembersMenuOpen, setIsMembersMenuOpen] = React.useState(false)

  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  if (isOpen) {
    const selected = assignees.filter((a) => assigneeIds.includes(a.id))
    return (
      <Card className="border-border/80 bg-card/95 shadow-md backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-card-foreground">
            {heading}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
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

          <label className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-card-foreground">
            <span className="text-xs font-medium text-muted-foreground">Cor do card</span>
            <input
              type="color"
              value={color}
              onChange={(e) => onColorChange(e.target.value)}
              className="h-7 w-9 cursor-pointer rounded-md border border-border bg-background p-0"
            />
            <span className="ml-auto font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {color}
            </span>
          </label>

          {onAssigneeIdsChange && assignees.length > 0 && (
            <div className="space-y-2 rounded-md border border-border bg-muted/30 px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Responsáveis</span>
                {selected.length > 0 && (
                  <div className="flex items-center gap-1">
                    {selected.slice(0, 3).map((m) => (
                      <Avatar key={m.id} className="h-6 w-6 border border-white/10">
                        <AvatarImage src={m.imageSrc || undefined} alt={m.name} />
                        <AvatarFallback className="text-[10px]">
                          {initials(m.name)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {selected.length > 3 && (
                      <span className="ml-1 text-[10px] font-medium text-muted-foreground">
                        +{selected.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <Menu.Root
                open={isMembersMenuOpen}
                onOpenChange={(details) => setIsMembersMenuOpen(details.open)}
              >
                <Menu.Trigger className="mt-1 flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-sm transition hover:bg-muted">
                  <span className="flex items-center gap-2">
                    <span>Membros responsáveis</span>
                    {selected.length > 0 && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-foreground">
                        {selected.length}
                      </span>
                    )}
                  </span>
                  <ChevronDown className="h-3 w-3" />
                </Menu.Trigger>

                <Menu.Positioner placement="bottom-start">
                  <Menu.Content className="mt-1 w-60 rounded-xl border border-border bg-popover p-2 text-xs text-popover-foreground shadow-lg">
                    <div className="mb-1 flex items-center justify-between px-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Selecionar membros
                      </span>
                      <button
                        type="button"
                        onClick={() => onAssigneeIdsChange([])}
                        className="text-[10px] font-medium text-primary hover:underline"
                      >
                        Limpar
                      </button>
                    </div>

                    <div className="max-h-56 space-y-1 overflow-auto">
                      {assignees.map((a) => {
                        const checked = assigneeIds.includes(a.id)
                        return (
                          <Menu.Item
                            key={a.id}
                            value={a.id}
                            className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted"
                            onClick={() => {
                              const next = checked
                                ? assigneeIds.filter((id) => id !== a.id)
                                : [...assigneeIds, a.id]
                              onAssigneeIdsChange(next)
                            }}
                          >
                            <div
                              className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"}`}
                            >
                              {checked && <Check className="h-3 w-3" />}
                            </div>
                            <Avatar className="h-6 w-6 border border-white/10">
                              <AvatarImage src={a.imageSrc || undefined} alt={a.name} />
                              <AvatarFallback className="text-[10px]">
                                {initials(a.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-[11px] text-card-foreground">{a.name}</span>
                          </Menu.Item>
                        )
                      })}
                    </div>

                    <div className="mt-2 flex justify-end border-t border-border/60 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsMembersMenuOpen(false)}
                        className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-foreground hover:bg-muted/80"
                      >
                        Fechar
                      </button>
                    </div>
                  </Menu.Content>
                </Menu.Positioner>
              </Menu.Root>
            </div>
          )}

          <div className="mt-4 flex w-full justify-center">
            <ButtonSaveDemo
              label={submitLabel}
              onClick={onSubmit}
              className="px-6"
            />
          </div>
        </CardContent>
      </Card>
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
