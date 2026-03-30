"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { KanbanColumn, KanbanTask, ColumnType } from "@/types/kanban"
import { Column } from "./column"
import { AddColumnForm } from "./add-column-form"

interface BoardProps {
  initialColumns?: KanbanColumn[]
  className?: string
  allowAddTask?: boolean
}

const defaultLabelColors: Record<string, string> = {
  research: "bg-pink-500",
  design: "bg-violet-500",
  frontend: "bg-blue-500",
  backend: "bg-emerald-500",
  devops: "bg-amber-500",
  docs: "bg-slate-500",
  urgent: "bg-red-500",
}

const defaultColumnPalette: Record<ColumnType, string> = {
  backlog: "#64748b",
  todo: "#3b82f6",
  "in-progress": "#f59e0b",
  review: "#8b5cf6",
  done: "#10b981",
  custom: "#71717a",
}

function withColumnDefaults(column: KanbanColumn): KanbanColumn {
  const columnColor = column.color ?? defaultColumnPalette[column.type]

  return {
    ...column,
    color: columnColor,
    tasks: column.tasks.map((task) => ({
      ...task,
      color: task.color ?? columnColor,
    })),
  }
}

export function Board({
  initialColumns = [],
  className,
  allowAddTask = true,
}: BoardProps) {
  const [columns, setColumns] = React.useState<KanbanColumn[]>(
    initialColumns.map(withColumnDefaults)
  )
  const [draggedTask, setDraggedTask] = React.useState<{
    task: KanbanTask
    sourceColumnId: string
  } | null>(null)
  const [dropTarget, setDropTarget] = React.useState<string | null>(null)

  const [addingCardTo, setAddingCardTo] = React.useState<string | null>(null)
  const [editingTask, setEditingTask] = React.useState<{
    columnId: string
    taskId: string
  } | null>(null)
  const [taskTitleDraft, setTaskTitleDraft] = React.useState("")
  const [taskDescriptionDraft, setTaskDescriptionDraft] = React.useState("")
  const [taskColorDraft, setTaskColorDraft] = React.useState("#3b82f6")

  const [isAddingColumn, setIsAddingColumn] = React.useState(false)
  const [editingColumnId, setEditingColumnId] = React.useState<string | null>(null)
  const [columnTitleDraft, setColumnTitleDraft] = React.useState("")
  const [columnTypeDraft, setColumnTypeDraft] = React.useState<ColumnType>("todo")
  const [columnColorDraft, setColumnColorDraft] = React.useState(
    defaultColumnPalette.todo
  )

  const resetTaskForm = () => {
    setAddingCardTo(null)
    setEditingTask(null)
    setTaskTitleDraft("")
    setTaskDescriptionDraft("")
    setTaskColorDraft(defaultColumnPalette.todo)
  }

  const resetColumnForm = () => {
    setIsAddingColumn(false)
    setEditingColumnId(null)
    setColumnTitleDraft("")
    setColumnTypeDraft("todo")
    setColumnColorDraft(defaultColumnPalette.todo)
  }

  const handleDragStart = (task: KanbanTask, columnId: string) => {
    setDraggedTask({ task, sourceColumnId: columnId })
  }

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    setDropTarget(columnId)
  }

  const handleDrop = (targetColumnId: string) => {
    if (!draggedTask || draggedTask.sourceColumnId === targetColumnId) {
      setDraggedTask(null)
      setDropTarget(null)
      return
    }

    const updatedColumns = columns.map((column) => {
      if (column.id === draggedTask.sourceColumnId) {
        return {
          ...column,
          tasks: column.tasks.filter((task) => task.id !== draggedTask.task.id),
        }
      }

      if (column.id === targetColumnId) {
        return {
          ...column,
          tasks: [...column.tasks, draggedTask.task],
        }
      }

      return column
    })

    setColumns(updatedColumns)
    setDraggedTask(null)
    setDropTarget(null)
  }

  const handleOpenAddTask = (columnId: string, columnColor: string) => {
    setEditingTask(null)
    setAddingCardTo(columnId)
    setTaskTitleDraft("")
    setTaskDescriptionDraft("")
    setTaskColorDraft(columnColor)
  }

  const handleOpenEditTask = (columnId: string, task: KanbanTask, columnColor: string) => {
    setAddingCardTo(null)
    setEditingTask({ columnId, taskId: task.id })
    setTaskTitleDraft(task.title)
    setTaskDescriptionDraft(task.description ?? "")
    setTaskColorDraft(task.color ?? columnColor)
  }

  const handleSubmitTask = (columnId: string) => {
    if (!taskTitleDraft.trim()) return

    if (editingTask?.columnId === columnId) {
      setColumns((prev) =>
        prev.map((column) =>
          column.id === columnId
            ? {
                ...column,
                tasks: column.tasks.map((task) =>
                  task.id === editingTask.taskId
                    ? {
                        ...task,
                        title: taskTitleDraft.trim(),
                        description: taskDescriptionDraft.trim() || undefined,
                        color: taskColorDraft,
                      }
                    : task
                ),
              }
            : column
        )
      )
    } else {
      const newTask: KanbanTask = {
        id: `task-${Date.now()}`,
        title: taskTitleDraft.trim(),
        description: taskDescriptionDraft.trim() || undefined,
        labels: [],
        color: taskColorDraft,
      }

      setColumns((prev) =>
        prev.map((column) =>
          column.id === columnId
            ? { ...column, tasks: [...column.tasks, newTask] }
            : column
        )
      )
    }

    resetTaskForm()
  }

  const handleRemoveTask = (columnId: string, taskId: string) => {
    setColumns((prev) =>
      prev.map((column) =>
        column.id === columnId
          ? {
              ...column,
              tasks: column.tasks.filter((task) => task.id !== taskId),
            }
          : column
      )
    )

    if (editingTask?.taskId === taskId) {
      resetTaskForm()
    }
  }

  const handleOpenAddColumn = () => {
    setEditingColumnId(null)
    setIsAddingColumn(true)
    setColumnTitleDraft("")
    setColumnTypeDraft("todo")
    setColumnColorDraft(defaultColumnPalette.todo)
  }

  const handleOpenEditColumn = (column: KanbanColumn) => {
    setIsAddingColumn(false)
    setEditingColumnId(column.id)
    setColumnTitleDraft(column.title)
    setColumnTypeDraft(column.type)
    setColumnColorDraft(column.color ?? defaultColumnPalette[column.type])
  }

  const handleSubmitColumn = () => {
    if (!columnTitleDraft.trim()) return

    if (editingColumnId) {
      setColumns((prev) =>
        prev.map((column) =>
          column.id === editingColumnId
            ? {
                ...column,
                title: columnTitleDraft.trim(),
                type: columnTypeDraft,
                color: columnColorDraft,
              }
            : column
        )
      )
    } else {
      const newColumn: KanbanColumn = {
        id: `column-${Date.now()}`,
        title: columnTitleDraft.trim(),
        type: columnTypeDraft,
        color: columnColorDraft,
        tasks: [],
      }

      setColumns((prev) => [...prev, newColumn])
    }

    resetColumnForm()
  }

  const handleRemoveColumn = (columnId: string) => {
    setColumns((prev) => prev.filter((column) => column.id !== columnId))

    if (editingColumnId === columnId) {
      resetColumnForm()
    }
  }

  const getColumnColor = (column: KanbanColumn) =>
    column.color ?? defaultColumnPalette[column.type]

  const getLabelColor = (label: string) =>
    defaultLabelColors[label] || "bg-slate-500"

  if (columns.length === 0) {
    return (
      <div className={cn("flex min-h-[65vh] w-full", className)}>
        <AddColumnForm
          isOpen={isAddingColumn || editingColumnId !== null}
          title={columnTitleDraft}
          type={columnTypeDraft}
          color={columnColorDraft}
          compact={false}
          heading={editingColumnId ? "Editar coluna" : "Nova coluna"}
          submitLabel={editingColumnId ? "Salvar coluna" : "Criar coluna"}
          onTitleChange={setColumnTitleDraft}
          onTypeChange={(value) => {
            setColumnTypeDraft(value)
            if (!editingColumnId) {
              setColumnColorDraft(defaultColumnPalette[value])
            }
          }}
          onColorChange={setColumnColorDraft}
          onOpen={handleOpenAddColumn}
          onCancel={resetColumnForm}
          onSubmit={handleSubmitColumn}
        />
      </div>
    )
  }

  return (
    <div className={cn("flex min-h-[65vh] w-full gap-4 overflow-x-auto pb-4", className)}>
      {columns.map((column) => (
        <Column
          key={column.id}
          column={column}
          columnColor={getColumnColor(column)}
          draggedTask={draggedTask}
          dropTarget={dropTarget}
          addingCardTo={addingCardTo}
          editingTaskId={
            editingTask?.columnId === column.id ? editingTask.taskId : null
          }
          taskTitleDraft={taskTitleDraft}
          taskDescriptionDraft={taskDescriptionDraft}
          taskColorDraft={taskColorDraft}
          allowAddTask={allowAddTask}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragLeave={() => setDropTarget(null)}
          onTaskDragStart={handleDragStart}
          onTaskDragEnd={() => setDraggedTask(null)}
          onOpenAddCard={handleOpenAddTask}
          onOpenEditTask={handleOpenEditTask}
          onCancelTaskForm={resetTaskForm}
          onTaskTitleChange={setTaskTitleDraft}
          onTaskDescriptionChange={setTaskDescriptionDraft}
          onTaskColorChange={setTaskColorDraft}
          onSubmitTask={handleSubmitTask}
          onRemoveTask={handleRemoveTask}
          onEditColumn={handleOpenEditColumn}
          onRemoveColumn={handleRemoveColumn}
          getLabelColor={getLabelColor}
        />
      ))}

      <AddColumnForm
        isOpen={isAddingColumn || editingColumnId !== null}
        title={columnTitleDraft}
        type={columnTypeDraft}
        color={columnColorDraft}
        compact
        heading={editingColumnId ? "Editar coluna" : "Nova coluna"}
        submitLabel={editingColumnId ? "Salvar coluna" : "Criar coluna"}
        onTitleChange={setColumnTitleDraft}
        onTypeChange={(value) => {
          setColumnTypeDraft(value)
          if (!editingColumnId) {
            setColumnColorDraft(defaultColumnPalette[value])
          }
        }}
        onColorChange={setColumnColorDraft}
        onOpen={handleOpenAddColumn}
        onCancel={resetColumnForm}
        onSubmit={handleSubmitColumn}
      />
    </div>
  )
}
