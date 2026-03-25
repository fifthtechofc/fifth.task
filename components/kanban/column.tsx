"use client"

import * as React from "react"
import { Pencil, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { KanbanColumn, KanbanTask } from "@/types/kanban"
import { AddTaskForm } from "./add-task-form"
import { TaskCard } from "./task-card"

interface ColumnProps {
  column: KanbanColumn
  columnColor: string
  draggedTask: { task: KanbanTask; sourceColumnId: string } | null
  dropTarget: string | null
  addingCardTo: string | null
  editingTaskId: string | null
  taskTitleDraft: string
  taskDescriptionDraft: string
  taskColorDraft: string
  allowAddTask: boolean
  onDragOver: (e: React.DragEvent, columnId: string) => void
  onDrop: (columnId: string) => void
  onDragLeave: () => void
  onTaskDragStart: (task: KanbanTask, columnId: string) => void
  onTaskDragEnd: () => void
  onOpenAddCard: (columnId: string, columnColor: string) => void
  onOpenEditTask: (columnId: string, task: KanbanTask, columnColor: string) => void
  onCancelTaskForm: () => void
  onTaskTitleChange: (value: string) => void
  onTaskDescriptionChange: (value: string) => void
  onTaskColorChange: (value: string) => void
  onSubmitTask: (columnId: string) => void
  onRemoveTask: (columnId: string, taskId: string) => void
  onEditColumn: (column: KanbanColumn) => void
  onRemoveColumn: (columnId: string) => void
  getLabelColor: (label: string) => string
}

export function Column({
  column,
  columnColor,
  draggedTask,
  dropTarget,
  addingCardTo,
  editingTaskId,
  taskTitleDraft,
  taskDescriptionDraft,
  taskColorDraft,
  allowAddTask,
  onDragOver,
  onDrop,
  onDragLeave,
  onTaskDragStart,
  onTaskDragEnd,
  onOpenAddCard,
  onOpenEditTask,
  onCancelTaskForm,
  onTaskTitleChange,
  onTaskDescriptionChange,
  onTaskColorChange,
  onSubmitTask,
  onRemoveTask,
  onEditColumn,
  onRemoveColumn,
  getLabelColor,
}: ColumnProps) {
  const [isDeleteHovered, setIsDeleteHovered] = React.useState(false)
  const [isEditHovered, setIsEditHovered] = React.useState(false)

  const isDropActive =
    dropTarget === column.id && draggedTask?.sourceColumnId !== column.id

  return (
    <div
      onDragOver={(e) => onDragOver(e, column.id)}
      onDrop={() => onDrop(column.id)}
      onDragLeave={onDragLeave}
      className={cn(
        "min-w-[280px] max-w-[280px] rounded-xl border-2 bg-muted/50 p-3 transition-all duration-200",
        isDropActive
          ? "border-primary/50 border-dashed bg-primary/5"
          : "border-transparent"
      )}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded"
            style={{ backgroundColor: columnColor }}
          />

          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {column.title}
            </h2>

            <p className="text-[11px] capitalize text-muted-foreground">
              {column.type}
            </p>
          </div>

          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {column.tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onMouseEnter={() => setIsEditHovered(true)}
            onMouseLeave={() => setIsEditHovered(false)}
            onClick={() => onEditColumn(column)}
            className="rounded-md p-1.5 transition-all duration-200"
            style={{
              backgroundColor: isEditHovered ? "rgba(59, 130, 246, 0.12)" : "transparent",
            }}
            aria-label="Editar coluna"
          >
            <Pencil
              className="h-4 w-4 transition-colors duration-200"
              style={{ color: isEditHovered ? "#60a5fa" : "#f4f4f5" }}
            />
          </button>

          <button
            type="button"
            onMouseEnter={() => setIsDeleteHovered(true)}
            onMouseLeave={() => setIsDeleteHovered(false)}
            onClick={() => onRemoveColumn(column.id)}
            className="rounded-md p-1.5 transition-all duration-200"
            style={{
              backgroundColor: isDeleteHovered ? "rgba(239, 68, 68, 0.12)" : "transparent",
            }}
            aria-label="Remover coluna"
          >
            <Trash2
              className="h-4 w-4 transition-colors duration-200"
              style={{ color: isDeleteHovered ? "#ef4444" : "#f4f4f5" }}
            />
          </button>
        </div>
      </div>

      <div className="flex min-h-[100px] flex-col gap-2">
        {column.tasks.map((task) =>
          editingTaskId === task.id ? (
            <AddTaskForm
              key={task.id}
              isOpen
              title={taskTitleDraft}
              description={taskDescriptionDraft}
              color={taskColorDraft}
              heading="Editar tarefa"
              submitLabel="Salvar tarefa"
              onTitleChange={onTaskTitleChange}
              onDescriptionChange={onTaskDescriptionChange}
              onColorChange={onTaskColorChange}
              onOpen={() => undefined}
              onCancel={onCancelTaskForm}
              onSubmit={() => onSubmitTask(column.id)}
            />
          ) : (
            <TaskCard
              key={task.id}
              task={task}
              columnColor={columnColor}
              isDragging={draggedTask?.task.id === task.id}
              onDragStart={() => onTaskDragStart(task, column.id)}
              onDragEnd={onTaskDragEnd}
              onEdit={() => onOpenEditTask(column.id, task, columnColor)}
              onRemove={() => onRemoveTask(column.id, task.id)}
              getLabelColor={getLabelColor}
            />
          )
        )}

        {allowAddTask && addingCardTo === column.id && (
          <AddTaskForm
            isOpen
            title={taskTitleDraft}
            description={taskDescriptionDraft}
            color={taskColorDraft}
            heading="Nova tarefa"
            submitLabel="Adicionar"
            onTitleChange={onTaskTitleChange}
            onDescriptionChange={onTaskDescriptionChange}
            onColorChange={onTaskColorChange}
            onOpen={() => undefined}
            onCancel={onCancelTaskForm}
            onSubmit={() => onSubmitTask(column.id)}
          />
        )}

        {allowAddTask && addingCardTo !== column.id && editingTaskId === null && (
          <AddTaskForm
            isOpen={false}
            title=""
            description=""
            color={columnColor}
            onTitleChange={() => undefined}
            onDescriptionChange={() => undefined}
            onColorChange={() => undefined}
            onOpen={() => onOpenAddCard(column.id, columnColor)}
            onCancel={() => undefined}
            onSubmit={() => undefined}
          />
        )}
      </div>
    </div>
  )
}
