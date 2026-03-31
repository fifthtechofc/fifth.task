"use client"

import * as React from "react"
import { Pencil, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { KanbanTask } from "@/types/kanban"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { MembersSelect } from "@/components/ui/members-select"

interface TaskCardProps {
  task: KanbanTask
  columnColor: string
  columnTitle?: string
  isDragging?: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onEdit: () => void
  onRemove: () => void
  getLabelColor: (label: string) => string
}

function hexToRgba(hex: string, alpha: number) {
  const value = hex.replace("#", "")
  const normalized =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value

  const int = Number.parseInt(normalized, 16)
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function TaskCard({
  task,
  columnColor,
  columnTitle,
  isDragging,
  onDragStart,
  onDragEnd,
  onEdit,
  onRemove,
  getLabelColor,
}: TaskCardProps) {
  const [isDeleteHovered, setIsDeleteHovered] = React.useState(false)
  const [isEditHovered, setIsEditHovered] = React.useState(false)
  const [openDetails, setOpenDetails] = React.useState(false)
  const cardColor = task.color ?? columnColor

  return (
    <>
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onClick={() => setOpenDetails(true)}
        className={cn(
          "cursor-grab rounded-lg border p-3 shadow-sm transition-all duration-150",
          "hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing",
          isDragging && "rotate-2 opacity-50"
        )}
        style={{
          backgroundColor: hexToRgba(cardColor, 0.22),
          borderColor: hexToRgba(cardColor, 0.5),
          boxShadow: `inset 0 1px 0 ${hexToRgba(cardColor, 0.18)}`,
        }}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex-1">
            {task.labels && task.labels.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1">
                {task.labels.map((label) => (
                  <span
                    key={label}
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white",
                      getLabelColor(label)
                    )}
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}

            <h3
              className={cn(
                "text-sm font-medium text-card-foreground",
                task.description && "mb-1"
              )}
            >
              {task.title}
            </h3>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              draggable={false}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseEnter={() => setIsEditHovered(true)}
              onMouseLeave={() => setIsEditHovered(false)}
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="rounded-md p-1.5 transition-all duration-200"
              style={{
                backgroundColor: isEditHovered ? "rgba(59, 130, 246, 0.12)" : "transparent",
              }}
              aria-label="Editar tarefa"
            >
              <Pencil
                className="h-4 w-4 transition-colors duration-200"
                style={{ color: isEditHovered ? "#60a5fa" : "#f4f4f5" }}
              />
            </button>

            <button
              type="button"
              draggable={false}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseEnter={() => setIsDeleteHovered(true)}
              onMouseLeave={() => setIsDeleteHovered(false)}
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              className="rounded-md p-1.5 transition-all duration-200"
              style={{
                backgroundColor: isDeleteHovered ? "rgba(239, 68, 68, 0.12)" : "transparent",
              }}
              aria-label="Remover tarefa"
            >
              <Trash2
                className="h-4 w-4 transition-colors duration-200"
                style={{ color: isDeleteHovered ? "#ef4444" : "#f4f4f5" }}
              />
            </button>
          </div>
        </div>

        {task.description && (
          <p className="mb-2 text-xs text-muted-foreground">
            {task.description}
          </p>
        )}

        {task.assignees && task.assignees.length > 0 && (
          <div className="flex justify-end">
            <div className="flex items-center">
              {task.assignees.slice(0, 3).map((a, idx) => (
                <Avatar
                  key={a.id}
                  className={cn(
                    "h-7 w-7 border border-white/10",
                    idx > 0 && "-ml-2",
                  )}
                >
                  <AvatarImage src={a.imageSrc || undefined} alt={a.name} />
                  <AvatarFallback className="text-[10px]">
                    {initials(a.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {task.assignees.length > 3 && (
                <div className="ml-2 text-xs font-semibold text-muted-foreground">
                  +{task.assignees.length - 3}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog open={openDetails} onOpenChange={setOpenDetails}>
        <DialogContent className="w-full max-w-lg border border-white/10 bg-black/90 p-6 text-white backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="truncate">{task.title}</DialogTitle>
            {columnTitle && (
              <div className="mt-3 inline-flex max-w-[8rem] items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-200">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: columnColor }}
                />
                <span className="truncate">{columnTitle}</span>
              </div>
            )}
          </DialogHeader>

          {task.description && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-sm leading-relaxed text-zinc-200">{task.description}</p>
            </div>
          )}

          {task.assignees && task.assignees.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-medium text-zinc-400">Responsáveis</p>
              <MembersSelect
                members={task.assignees.map((a) => ({
                  id: a.id,
                  name: a.name,
                  imageSrc: a.imageSrc,
                }))}
                selectedIds={task.assignees.map((a) => a.id)}
                onChange={() => undefined}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
