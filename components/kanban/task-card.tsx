"use client"

import { cn } from "@/lib/utils"
import { KanbanTask } from "@/types/kanban"

interface TaskCardProps {
  task: KanbanTask
  isDragging?: boolean
  onDragStart: () => void
  onDragEnd: () => void
  getLabelColor: (label: string) => string
}

export function TaskCard({
  task,
  isDragging,
  onDragStart,
  onDragEnd,
  getLabelColor,
}: TaskCardProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "cursor-grab rounded-lg border border-border bg-card p-3 shadow-sm transition-all duration-150",
        "hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing",
        isDragging && "rotate-2 opacity-50"
      )}
    >
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

      <h3 className={cn("text-sm font-medium text-card-foreground", task.description && "mb-1")}>
        {task.title}
      </h3>

      {task.description && (
        <p className="mb-2 text-xs text-muted-foreground">
          {task.description}
        </p>
      )}

      {task.assignee && (
        <div className="flex justify-end">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
            {task.assignee}
          </div>
        </div>
      )}
    </div>
  )
}