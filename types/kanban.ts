export interface KanbanTask {
    id: string
    title: string
    description?: string
    labels?: string[]
    assignee?: string
  }
  
  export interface KanbanColumn {
    id: string
    title: string
    tasks: KanbanTask[]
  }