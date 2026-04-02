"use client"

import * as React from "react"
import { GripVertical, Pencil, Trash2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { KanbanColumn, KanbanTask } from "@/types/kanban"
import { AddTaskForm } from "./add-task-form"
import { TaskCard } from "./task-card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog"

interface ColumnProps {
  column: KanbanColumn
  columnColor: string
  isColumnDropActive?: boolean
  isDraggingAnyColumn?: boolean
  onColumnDragStart?: (columnId: string) => void
  onColumnDragOver?: (e: React.DragEvent, columnId: string) => void
  onColumnDrop?: (columnId: string) => void
  onColumnDragEnd?: () => void
  draggedTask: { task: KanbanTask; sourceColumnId: string } | null
  dropTarget: string | null
  addingCardTo: string | null
  editingTaskId: string | null
  editingCardId: string | null
  taskTitleDraft: string
  taskDescriptionDraft: string
  taskColorDraft: string
  assigneeIdsDraft: string[]
  assignees: Array<{ id: string; name: string; imageSrc: string }>
  onAssigneeIdsChange: (value: string[]) => void
  checklistItems: Array<{ id: string; title: string; position: number }>
  checklistTitleDraft: string
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
  onChecklistTitleChange: (value: string) => void
  onAddChecklistItem: (cardId: string) => void
  onSubmitTask: (columnId: string) => void
  onRemoveTask: (columnId: string, taskId: string) => void
  onEditColumn: (column: KanbanColumn) => void
  onRemoveColumn: (columnId: string) => void
  getLabelColor: (label: string) => string
}

export function Column({
  column,
  columnColor,
  isColumnDropActive,
  isDraggingAnyColumn,
  onColumnDragStart,
  onColumnDragOver,
  onColumnDrop,
  onColumnDragEnd,
  draggedTask,
  dropTarget,
  addingCardTo,
  editingTaskId,
  editingCardId,
  taskTitleDraft,
  taskDescriptionDraft,
  taskColorDraft,
  assigneeIdsDraft,
  assignees,
  onAssigneeIdsChange,
  checklistItems,
  checklistTitleDraft,
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
  onChecklistTitleChange,
  onAddChecklistItem,
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
      onDragOver={(e) => {
        if (isDraggingAnyColumn && onColumnDragOver) {
          e.preventDefault()
          onColumnDragOver(e, column.id)
          return
        }
        onDragOver(e, column.id)
      }}
      onDrop={() => {
        if (isDraggingAnyColumn && onColumnDrop) {
          onColumnDrop(column.id)
          return
        }
        onDrop(column.id)
      }}
      onDragLeave={onDragLeave}
      className={cn(
        "flex h-full min-h-full min-w-[360px] max-w-[360px] flex-1 flex-col rounded-xl border-2 bg-muted/50 p-3 transition-all duration-200",
        isDropActive
          ? "border-primary/50 border-dashed bg-primary/5"
          : "border-transparent"
      )}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div
            draggable={Boolean(onColumnDragStart)}
            onDragStart={(e) => {
              e.stopPropagation()
              onColumnDragStart?.(column.id)
              try {
                e.dataTransfer.effectAllowed = "move"
                e.dataTransfer.setData("text/plain", column.id)
              } catch {
                // ignore dataTransfer errors
              }
            }}
            onDragOver={(e) => {
              if (!onColumnDragOver) return
              e.preventDefault()
              e.stopPropagation()
              onColumnDragOver(e, column.id)
            }}
            onDrop={(e) => {
              if (!onColumnDrop) return
              e.preventDefault()
              e.stopPropagation()
              onColumnDrop(column.id)
            }}
            onDragEnd={(e) => {
              e.stopPropagation()
              onColumnDragEnd?.()
            }}
            className={cn(
              "mr-1 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground",
              onColumnDragStart && "cursor-grab active:cursor-grabbing",
              isColumnDropActive && "ring-2 ring-primary/40",
            )}
            aria-label="Arrastar coluna"
            title="Arrastar coluna"
          >
            <GripVertical className="h-4 w-4" />
          </div>

          <div
            className="h-3 w-3 rounded"
            style={{ backgroundColor: columnColor }}
          />

          <div>
            <h2 className="text-sm font-semibold text-foreground">{column.title}</h2>
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

          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                onMouseEnter={() => setIsDeleteHovered(true)}
                onMouseLeave={() => setIsDeleteHovered(false)}
                className="rounded-md p-1.5 transition-all duration-200"
                style={{
                  backgroundColor: isDeleteHovered ? "rgba(239, 68, 68, 0.12)" : "transparent",
                }}
                aria-label="Remover coluna"
                title="Remover coluna"
              >
                <Trash2
                  className="h-4 w-4 transition-colors duration-200"
                  style={{ color: isDeleteHovered ? "#ef4444" : "#f4f4f5" }}
                />
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-500/10">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                </div>
                <DialogHeader className="flex-1 space-y-2 text-left">
                  <DialogTitle>Excluir coluna</DialogTitle>
                  <DialogDescription>
                    Tem certeza que deseja excluir esta coluna? Todas as tarefas dentro dela serão removidas.
                    Essa ação não pode ser desfeita.
                  </DialogDescription>
                </DialogHeader>
              </div>
              <DialogFooter className="mt-4">
                <DialogClose asChild>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    Cancelar
                  </button>
                </DialogClose>
                <DialogClose asChild>
                  <button
                    type="button"
                    onClick={() => onRemoveColumn(column.id)}
                    className="inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir
                  </button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        <div className="space-y-2">
        {column.tasks.map((task) =>
          editingTaskId === task.id ? (
            <div key={task.id} className="space-y-2">
              <AddTaskForm
                isOpen
                title={taskTitleDraft}
                description={taskDescriptionDraft}
                color={taskColorDraft}
                assigneeIds={assigneeIdsDraft}
                assignees={assignees}
                heading="Editar tarefa"
                submitLabel="Salvar tarefa"
                onTitleChange={onTaskTitleChange}
                onDescriptionChange={onTaskDescriptionChange}
                onAssigneeIdsChange={onAssigneeIdsChange}
                onOpen={() => undefined}
                onCancel={onCancelTaskForm}
                onSubmit={() => onSubmitTask(column.id)}
              />

              {editingCardId && (
                <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Checklist
                  </h4>

                  {checklistItems.length > 0 ? (
                    <ul className="mb-3 space-y-1">
                      {checklistItems
                        .slice()
                        .sort((a, b) => a.position - b.position)
                        .map((item) => (
                          <li key={item.id} className="text-sm text-foreground">
                            - {item.title}
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="mb-3 text-sm text-muted-foreground">Sem itens ainda.</p>
                  )}

                  <div className="flex gap-2">
                    <input
                      value={checklistTitleDraft}
                      onChange={(e) => onChecklistTitleChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          onAddChecklistItem(editingCardId)
                        }
                      }}
                      placeholder="Novo item…"
                      className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-card-foreground outline-none placeholder:text-muted-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => onAddChecklistItem(editingCardId)}
                      className="h-9 shrink-0 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <TaskCard
              key={task.id}
              task={task}
              columnColor={columnColor}
              columnTitle={column.title}
              isDragging={draggedTask?.task.id === task.id}
              onDragStart={() => onTaskDragStart(task, column.id)}
              onDragEnd={onTaskDragEnd}
              onEdit={() => onOpenEditTask(column.id, task, columnColor)}
              onRemove={() => onRemoveTask(column.id, task.id)}
              getLabelColor={getLabelColor}
            />
          )
        )}
        </div>

        {allowAddTask && addingCardTo === column.id && (
          <AddTaskForm
            isOpen
            title={taskTitleDraft}
            description={taskDescriptionDraft}
            color={taskColorDraft}
            assigneeIds={assigneeIdsDraft}
            assignees={assignees}
            heading="Nova tarefa"
            submitLabel="Adicionar"
            onTitleChange={onTaskTitleChange}
            onDescriptionChange={onTaskDescriptionChange}
            onAssigneeIdsChange={onAssigneeIdsChange}
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
            onOpen={() => onOpenAddCard(column.id, columnColor)}
            onCancel={() => undefined}
            onSubmit={() => undefined}
          />
        )}
      </div>
    </div>
  )
}
