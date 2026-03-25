export type ColumnType =
  | "backlog"
  | "todo"
  | "in-progress"
  | "review"
  | "done"
  | "custom"

export interface KanbanTask {
  id: string
  title: string
  color?: string
  description?: string
  labels?: string[]
  assignee?: string
}

export interface KanbanColumn {
  id: string
  title: string
  type: ColumnType
  color?: string
  tasks: KanbanTask[]
}
