export type ColumnType =
  | "backlog"
  | "todo"
  | "in-progress"
  | "review"
  | "done"
  | "custom"

export interface KanbanChecklistItem {
  id: string
  title: string
  position: number
}

export interface KanbanAssignee {
  id: string
  name: string
  imageSrc: string
}

export interface KanbanTask {
  id: string
  title: string
  color?: string
  description?: string
  labels?: string[]
  assignees?: KanbanAssignee[]
  position?: number
  checklist?: KanbanChecklistItem[]
}

export interface KanbanColumn {
  id: string
  title: string
  type: ColumnType
  color?: string
  position?: number
  tasks: KanbanTask[]
}
