"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { KanbanColumn, KanbanTask } from "@/types/kanban"
import { Column } from "./column"

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

const defaultColumnColors: Record<string, string> = {
  backlog: "bg-slate-500",
  todo: "bg-blue-500",
  "in-progress": "bg-amber-500",
  review: "bg-violet-500",
  done: "bg-emerald-500",
}

const defaultColumns: KanbanColumn[] = [
  {
    id: "todo",
    title: "To Do",
    tasks: [],
  },
  {
    id: "in-progress",
    title: "In Progress",
    tasks: [],
  },
  {
    id: "done",
    title: "Done",
    tasks: [],
  },
]

export function Board({
  initialColumns = defaultColumns,
  className,
  allowAddTask = true,
}: BoardProps) {
  const [columns, setColumns] = React.useState<KanbanColumn[]>(initialColumns)
  const [draggedTask, setDraggedTask] = React.useState<{
    task: KanbanTask
    sourceColumnId: string
  } | null>(null)
  const [dropTarget, setDropTarget] = React.useState<string | null>(null)
  const [addingCardTo, setAddingCardTo] = React.useState<string | null>(null)
  const [newCardTitle, setNewCardTitle] = React.useState("")

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

  const handleAddCard = (columnId: string) => {
    if (!newCardTitle.trim()) return

    const newTask: KanbanTask = {
      id: `task-${Date.now()}`,
      title: newCardTitle.trim(),
      labels: [],
    }

    const updatedColumns = columns.map((column) =>
      column.id === columnId
        ? { ...column, tasks: [...column.tasks, newTask] }
        : column
    )

    setColumns(updatedColumns)
    setNewCardTitle("")
    setAddingCardTo(null)
  }

  const getColumnColor = (columnId: string) =>
    defaultColumnColors[columnId] || "bg-slate-500"

  const getLabelColor = (label: string) =>
    defaultLabelColors[label] || "bg-slate-500"

  return (
    <div className={cn("flex gap-4 overflow-x-auto pb-4", className)}>
      {columns.map((column) => (
        <Column
          key={column.id}
          column={column}
          draggedTask={draggedTask}
          dropTarget={dropTarget}
          addingCardTo={addingCardTo}
          newCardTitle={newCardTitle}
          allowAddTask={allowAddTask}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragLeave={() => setDropTarget(null)}
          onTaskDragStart={handleDragStart}
          onTaskDragEnd={() => setDraggedTask(null)}
          onOpenAddCard={setAddingCardTo}
          onCancelAddCard={() => {
            setAddingCardTo(null)
            setNewCardTitle("")
          }}
          onNewCardTitleChange={setNewCardTitle}
          onAddCard={handleAddCard}
          getColumnColor={getColumnColor}
          getLabelColor={getLabelColor}
        />
      ))}
    </div>
  )
}