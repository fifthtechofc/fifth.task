"use client"

import { MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { KanbanTask, KanbanColumn } from "@/types/kanban"
import { TaskCard } from "./task-card"
import { AddTaskForm } from "./add-task-form"

interface ColumnProps {
  column: KanbanColumn
  draggedTask: { task: KanbanTask; sourceColumnId: string } | null
  dropTarget: string | null
  addingCardTo: string | null
  newCardTitle: string
  allowAddTask: boolean
  onDragOver: (e: React.DragEvent, columnId: string) => void
  onDrop: (columnId: string) => void
  onDragLeave: () => void
  onTaskDragStart: (task: KanbanTask, columnId: string) => void
  onTaskDragEnd: () => void
  onOpenAddCard: (columnId: string) => void
  onCancelAddCard: () => void
  onNewCardTitleChange: (value: string) => void
  onAddCard: (columnId: string) => void
  getColumnColor: (columnId: string) => string
  getLabelColor: (label: string) => string
}

export function Column({
  column,
  draggedTask,
  dropTarget,
  addingCardTo,
  newCardTitle,
  allowAddTask,
  onDragOver,
  onDrop,
  onDragLeave,
  onTaskDragStart,
  onTaskDragEnd,
  onOpenAddCard,
  onCancelAddCard,
  onNewCardTitleChange,
  onAddCard,
  getColumnColor,
  getLabelColor,
}: ColumnProps) {
  const isDropActive =
    dropTarget === column.id && draggedTask?.sourceColumnId !== column.id

  return (
    <div
      onDragOver={(e) => onDragOver(e, column.id)}
      onDrop={() => onDrop(column.id)}
      onDragLeave={onDragLeave}
      className={cn(
        "min-w-[280px] max-w-[280px] rounded-xl border-2 bg-muted/50 p-3 transition-all duration-200",
        isDropActive ? "border-primary/50 bg-primary/5 border-dashed" : "border-transparent"
      )}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className={cn("h-3 w-3 rounded", getColumnColor(column.id))} />
          <h2 className="text-sm font-semibold text-foreground">{column.title}</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {column.tasks.length}
          </span>
        </div>

        <button
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Opções da coluna"
          type="button"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      <div className="flex min-h-[100px] flex-col gap-2">
        {column.tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            isDragging={draggedTask?.task.id === task.id}
            onDragStart={() => onTaskDragStart(task, column.id)}
            onDragEnd={onTaskDragEnd}
            getLabelColor={getLabelColor}
          />
        ))}

        {allowAddTask && (
          <AddTaskForm
            isOpen={addingCardTo === column.id}
            value={newCardTitle}
            onChange={onNewCardTitleChange}
            onOpen={() => onOpenAddCard(column.id)}
            onCancel={onCancelAddCard}
            onSubmit={() => onAddCard(column.id)}
          />
        )}
      </div>
    </div>
  )
}