"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import * as React from "react"
import { useDashboardLoading } from "@/components/ui/dashboard-shell"
import { GlowCard } from "@/components/ui/spotlight-card"
import { useAppNotifications } from "@/lib/app-notifications-context"
import {
  createCalendarEvent,
  deleteCalendarEvent,
  fetchCalendarAccess,
  updateCalendarEvent,
} from "@/lib/calendar"
import {
  buildKanbanColumns,
  createBoardCard,
  createBoardColumn,
  createChecklistItem,
  fetchBoardCards,
  fetchBoardColumns,
  fetchCardAssignees,
  fetchCardChecklist,
  inferColumnTypeFromTitle,
  moveBoardCard,
  removeBoardCard,
  removeBoardColumn,
  setCardAssignees,
  updateBoardCard,
  updateBoardColumnsPositions,
  updateColumnTitle,
} from "@/lib/kanban"
import { rpcNotifyTaskCreated } from "@/lib/kanban-notifications-rpc"
import { httpNotifyTaskAssigned } from "@/lib/notifications-http"
import { getTeamMembers } from "@/lib/profile"
import {
  buildCalendarLocalDateTime,
  combineDueDateTimeToIso,
  extractDueDateInput,
  extractDueTimeInput,
  normalizeDueDateInput,
  normalizeDueTimeInput,
} from "@/lib/task-deadlines"
import { cn } from "@/lib/utils"
import type { ColumnType, KanbanColumn, KanbanTask } from "@/types/kanban"
import { AddColumnForm } from "./add-column-form"
import { Column } from "./column"
import { EditColumnModal } from "./edit-column-modal"
import { HorizontalScroll } from "./horizontal-scroll"

interface BoardProps {
  boardId: string
  userId: string
  /** Slug da rota /boards/[project] — usado no link das notificações. */
  boardProjectSlug?: string
  /** Título do quadro (ex.: vindo do ProjectBoard) — texto nas notificações locais de atribuição. */
  boardTitle?: string
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

function formatAssigneeNames(
  ids: string[],
  teamMembers: Array<{ id: string; name: string; imageSrc: string }>,
) {
  const names = ids
    .map((id) => teamMembers.find((m) => m.id === id)?.name?.trim())
    .filter((x): x is string => Boolean(x))
  return names.length > 0 ? names.join(", ") : "Utilizador"
}

function resolveKanbanAssignees(
  ids: string[],
  teamMembers: Array<{ id: string; name: string; imageSrc: string }>,
) {
  const assignees = ids
    .map((id) => teamMembers.find((member) => member.id === id))
    .filter(
      (
        member,
      ): member is {
        id: string
        name: string
        imageSrc: string
      } => Boolean(member),
    )
    .map((member) => ({
      id: member.id,
      name: member.name,
      imageSrc: member.imageSrc,
    }))

  return assignees.length > 0 ? assignees : undefined
}

function boardNotificationHref(
  boardProjectSlug: string | undefined,
  boardId: string,
  cardId: string,
) {
  const base =
    boardProjectSlug && boardProjectSlug.length > 0
      ? `/boards/${encodeURIComponent(boardProjectSlug)}?id=${encodeURIComponent(boardId)}`
      : `/boards/board?id=${encodeURIComponent(boardId)}`
  return `${base}&card=${encodeURIComponent(cardId)}`
}

function boardHref(
  boardProjectSlug: string | undefined,
  boardId: string,
) {
  return boardProjectSlug && boardProjectSlug.length > 0
    ? `/boards/${encodeURIComponent(boardProjectSlug)}?id=${encodeURIComponent(boardId)}`
    : `/boards/board?id=${encodeURIComponent(boardId)}`
}

export function Board({
  boardId,
  userId,
  boardProjectSlug,
  boardTitle,
  initialColumns = [],
  className,
  allowAddTask = true,
}: BoardProps) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const handledCardFromQueryRef = React.useRef<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [teamMembers, setTeamMembers] = React.useState<
    Array<{ id: string; name: string; imageSrc: string }>
  >([])
  const [columns, setColumns] = React.useState<KanbanColumn[]>(
    initialColumns.map(withColumnDefaults),
  )
  const [checklistsByCardId, setChecklistsByCardId] = React.useState<
    Record<string, { id: string; title: string; position: number }[]>
  >({})

  const scrollRef = React.useRef<HTMLDivElement | null>(null)

  const [draggedColumnId, setDraggedColumnId] = React.useState<string | null>(
    null,
  )
  const [columnDropTargetId, setColumnDropTargetId] = React.useState<
    string | null
  >(null)

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
  const editingTaskOriginalAssigneesRef = React.useRef<string[]>([])
  const [taskTitleDraft, setTaskTitleDraft] = React.useState("")
  const [taskDescriptionDraft, setTaskDescriptionDraft] = React.useState("")
  const [taskDueDateDraft, setTaskDueDateDraft] = React.useState("")
  const [taskDueTimeDraft, setTaskDueTimeDraft] = React.useState("")
  const [taskColorDraft, setTaskColorDraft] = React.useState("#3b82f6")
  const [taskAssigneeIdsDraft, setTaskAssigneeIdsDraft] = React.useState<
    string[]
  >([])
  const [newChecklistTitleDraft, setNewChecklistTitleDraft] = React.useState("")
  const calendarWorkspaceIdRef = React.useRef<string | null>(null)

  const [isAddingColumn, setIsAddingColumn] = React.useState(false)
  const [editingColumnId, setEditingColumnId] = React.useState<string | null>(
    null,
  )
  const [columnTitleDraft, setColumnTitleDraft] = React.useState("")
  const [columnColorDraft, setColumnColorDraft] = React.useState(
    defaultColumnPalette.custom,
  )

  const { setLoading: setDashboardLoading, showAlert } = useDashboardLoading()
  const { pushNotification, refreshNotifications } = useAppNotifications()

  const ensureCalendarWorkspaceId = React.useCallback(async () => {
    if (calendarWorkspaceIdRef.current) return calendarWorkspaceIdRef.current
    const access = await fetchCalendarAccess()
    const workspaceId =
      access.defaultWorkspaceId ?? access.workspaces[0]?.id ?? null
    calendarWorkspaceIdRef.current = workspaceId
    return workspaceId
  }, [])

  const resetTaskForm = () => {
    setAddingCardTo(null)
    setEditingTask(null)
    setTaskTitleDraft("")
    setTaskDescriptionDraft("")
    setTaskDueDateDraft("")
    setTaskDueTimeDraft("")
    setTaskColorDraft(defaultColumnPalette.todo)
    setTaskAssigneeIdsDraft([])
    setNewChecklistTitleDraft("")
  }

  const resetColumnForm = () => {
    setIsAddingColumn(false)
    setEditingColumnId(null)
    setColumnTitleDraft("")
    setColumnColorDraft(defaultColumnPalette.custom)
  }

  const handleTaskDueDateChange = React.useCallback((value: string) => {
    setTaskDueDateDraft(value)
    if (!normalizeDueDateInput(value)) {
      setTaskDueTimeDraft("")
    }
  }, [])

  const syncTaskDeadlineEvent = React.useCallback(
    async (params: {
      cardId: string
      currentEventId?: string
      title: string
      description?: string
      dueDate?: string
      dueTime?: string
      assigneeIds: string[]
    }) => {
      const dueDate = normalizeDueDateInput(params.dueDate)
      const dueTime = normalizeDueTimeInput(params.dueTime)
      if (!dueDate || !dueTime) {
        if (params.currentEventId) {
          await deleteCalendarEvent(params.currentEventId)
        }
        return null
      }

      const workspaceId = await ensureCalendarWorkspaceId()
      if (!workspaceId) {
        throw new Error(
          "Não foi possível sincronizar o prazo no calendário porque nenhum workspace está disponível.",
        )
      }

      const input = {
        workspaceId,
        title: `Entrega: ${params.title.trim()}`,
        description: params.description?.trim() || "Prazo de tarefa do Kanban.",
        startAt:
          buildCalendarLocalDateTime(dueDate, dueTime) ??
          `${dueDate}T${dueTime}:00`,
        endAt: null,
        assigneeIds: params.assigneeIds,
        hideTime: false,
        sourceType: "task_deadline" as const,
        taskCardId: params.cardId,
        taskBoardId: boardId,
        taskHref: boardHref(boardProjectSlug, boardId),
      }

      if (params.currentEventId) {
        await updateCalendarEvent(params.currentEventId, input)
        return params.currentEventId
      }

      const created = await createCalendarEvent(input)
      return created.id
    },
    [ensureCalendarWorkspaceId],
  )

  const handleDragStart = (task: KanbanTask, columnId: string) => {
    setDraggedTask({ task, sourceColumnId: columnId })
  }

  const dragClientXRef = React.useRef<number | null>(null)
  const autoScrollVelocityRef = React.useRef(0) // px per ms
  const autoScrollRafRef = React.useRef<number | null>(null)
  const autoScrollLastTsRef = React.useRef<number | null>(null)

  const handleBoardDragOver = React.useCallback(
    (e: React.DragEvent) => {
      if (!draggedColumnId && !draggedTask) return
      dragClientXRef.current = e.clientX
    },
    [draggedColumnId, draggedTask],
  )

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (!draggedColumnId && !draggedTask) return

    const edge = 110
    const maxSpeed = 1.15 // px/ms (~69px/frame at 60fps max)
    const minSpeed = 0.12 // px/ms

    const tick = (ts: number) => {
      const last = autoScrollLastTsRef.current
      autoScrollLastTsRef.current = ts
      const dt = last ? ts - last : 16

      const rect = el.getBoundingClientRect()
      const x = dragClientXRef.current
      if (x == null) {
        autoScrollVelocityRef.current = 0
      } else {
        const leftDist = x - rect.left
        const rightDist = rect.right - x

        let v = 0
        if (leftDist < edge) {
          const t = Math.max(0, Math.min(1, (edge - leftDist) / edge))
          v = -(minSpeed + (maxSpeed - minSpeed) * t)
        } else if (rightDist < edge) {
          const t = Math.max(0, Math.min(1, (edge - rightDist) / edge))
          v = minSpeed + (maxSpeed - minSpeed) * t
        }
        autoScrollVelocityRef.current = v
      }

      const v = autoScrollVelocityRef.current
      if (v !== 0) {
        el.scrollLeft += v * dt
      }

      autoScrollRafRef.current = window.requestAnimationFrame(tick)
    }

    autoScrollLastTsRef.current = null
    autoScrollRafRef.current = window.requestAnimationFrame(tick)
    return () => {
      if (autoScrollRafRef.current != null) {
        window.cancelAnimationFrame(autoScrollRafRef.current)
      }
      autoScrollRafRef.current = null
      autoScrollLastTsRef.current = null
      autoScrollVelocityRef.current = 0
      dragClientXRef.current = null
    }
  }, [draggedColumnId, draggedTask])

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (!draggedColumnId && !draggedTask) return

    const isInside = (ev: DragEvent) => {
      const r = el.getBoundingClientRect()
      const x = ev.clientX
      const y = ev.clientY
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
    }

    const onWindowDrop = (ev: DragEvent) => {
      if (isInside(ev)) return
      ev.preventDefault()
      ev.stopPropagation()
    }

    window.addEventListener("drop", onWindowDrop, { passive: false })
    return () => {
      window.removeEventListener("drop", onWindowDrop)
    }
  }, [draggedColumnId, draggedTask])

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    setDropTarget(columnId)
  }

  const handleDrop = async (targetColumnId: string) => {
    if (!draggedTask || draggedTask.sourceColumnId === targetColumnId) {
      setDraggedTask(null)
      setDropTarget(null)
      return
    }

    const dragSnapshot = draggedTask
    const movedCardId = dragSnapshot.task.id
    const sourceColumnId = dragSnapshot.sourceColumnId

    const targetColumn = columns.find((c) => c.id === targetColumnId)
    const nextPosition =
      Math.max(0, ...(targetColumn?.tasks ?? []).map((t) => t.position ?? 0)) +
      1
    const targetColor = targetColumn
      ? getColumnColor(targetColumn)
      : defaultColumnPalette.custom

    const updatedColumns = columns.map((column) => {
      if (column.id === sourceColumnId) {
        return {
          ...column,
          tasks: column.tasks.filter((task) => task.id !== movedCardId),
        }
      }

      if (column.id === targetColumnId) {
        return {
          ...column,
          tasks: [
            ...column.tasks,
            {
              ...dragSnapshot.task,
              position: nextPosition,
              color: targetColor,
            },
          ],
        }
      }

      return column
    })

    setColumns(updatedColumns.map(withColumnDefaults))
    setDraggedTask(null)
    setDropTarget(null)

    try {
      await moveBoardCard({
        id: movedCardId,
        columnId: targetColumnId,
        position: nextPosition,
      })
      // Notificação: trigger board_cards_column_change_app_notify na base (kanban_activity_notifications_rpc.sql).
      refreshNotifications()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao mover card.")
    }
  }

  const handleOpenAddTask = (columnId: string, columnColor: string) => {
    setEditingTask(null)
    setAddingCardTo(columnId)
    setTaskTitleDraft("")
    setTaskDescriptionDraft("")
    setTaskDueDateDraft("")
    setTaskDueTimeDraft("")
    setTaskColorDraft(columnColor)
    setTaskAssigneeIdsDraft([])
  }

  const handleOpenEditTask = async (
    columnId: string,
    task: KanbanTask,
    columnColor: string,
  ) => {
    setAddingCardTo(null)
    setEditingTask({ columnId, taskId: task.id })
    setTaskTitleDraft(task.title)
    setTaskDescriptionDraft(task.description ?? "")
    setTaskDueDateDraft(extractDueDateInput(task.dueAt ?? task.dueDate))
    setTaskDueTimeDraft(extractDueTimeInput(task.dueAt))
    setTaskColorDraft(task.color ?? columnColor)
    {
      const ids = task.assignees?.map((a) => a.id) ?? []
      editingTaskOriginalAssigneesRef.current = ids
      setTaskAssigneeIdsDraft(ids)
    }

    if (!checklistsByCardId[task.id]) {
      try {
        const rows = await fetchCardChecklist(task.id)
        setChecklistsByCardId((prev) => ({
          ...prev,
          [task.id]: rows.map((r) => ({
            id: r.id,
            title: r.title,
            position: r.position,
          })),
        }))
      } catch {
        // ignore checklist load errors to avoid blocking edit UI
      }
    }
  }

  const openEditTaskRef = React.useRef(handleOpenEditTask)
  openEditTaskRef.current = handleOpenEditTask

  const handleSubmitTask = async (columnId: string) => {
    if (!taskTitleDraft.trim()) return
    const normalizedDueDate = normalizeDueDateInput(taskDueDateDraft) || null
    const normalizedDueTime = normalizeDueTimeInput(taskDueTimeDraft) || null
    if (normalizedDueDate && !normalizedDueTime) {
      setError("Defina o horário de entrega da tarefa.")
      return
    }
    const dueAtIso = normalizedDueDate
      ? combineDueDateTimeToIso(
          normalizedDueDate,
          normalizedDueTime ?? undefined,
        )
      : null
    const dueTimezone =
      normalizedDueDate && normalizedDueTime
        ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
        : null

    if (editingTask?.columnId === columnId) {
      const cardId = editingTask.taskId
      const currentTask =
        columns
          .find((column) => column.id === columnId)
          ?.tasks.find((task) => task.id === cardId) ?? null
      const prevAssigneeIds = editingTaskOriginalAssigneesRef.current ?? []
      const nextAssigneeIds = taskAssigneeIdsDraft
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
                        dueDate: normalizedDueDate ?? undefined,
                        dueAt: dueAtIso ?? undefined,
                        dueTimezone: dueTimezone ?? undefined,
                        color: taskColorDraft,
                        assignees: resolveKanbanAssignees(
                          taskAssigneeIdsDraft,
                          teamMembers,
                        ),
                      }
                    : task,
                ),
              }
            : column,
        ),
      )
      try {
        const deadlineEventId = await syncTaskDeadlineEvent({
          cardId,
          currentEventId: currentTask?.deadlineEventId,
          title: taskTitleDraft,
          description: taskDescriptionDraft,
          dueDate: normalizedDueDate ?? undefined,
          dueTime: normalizedDueTime ?? undefined,
          assigneeIds: taskAssigneeIdsDraft,
        })
        await updateBoardCard({
          id: cardId,
          title: taskTitleDraft,
          description: taskDescriptionDraft,
          dueDate: normalizedDueDate,
          dueAt: dueAtIso,
          dueTimezone,
          deadlineEventId,
          assignedTo: taskAssigneeIdsDraft[0] || null,
        })
        setColumns((prev) =>
          prev.map((column) =>
            column.id !== columnId
              ? column
              : {
                  ...column,
                  tasks: column.tasks.map((task) =>
                    task.id === cardId
                      ? {
                          ...task,
                          dueDate: normalizedDueDate ?? undefined,
                          dueAt: dueAtIso ?? undefined,
                          dueTimezone: dueTimezone ?? undefined,
                          deadlineEventId: deadlineEventId ?? undefined,
                        }
                      : task,
                  ),
                },
          ),
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao salvar card.")
      }

      // Multi-assign is optional (depends on card_assignees table/policies).
      try {
        await setCardAssignees({ cardId, userIds: taskAssigneeIdsDraft })
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Card salvo, mas falhou ao salvar responsáveis.",
        )
      }

      // Refresh assignees from DB if available.
      try {
        const map = await fetchCardAssignees([cardId])
        const ids = map[cardId] ?? []
        const assignees =
          ids.length > 0
            ? resolveKanbanAssignees(ids, teamMembers)
            : undefined
        setColumns((prev) =>
          prev.map((col) =>
            col.id !== columnId
              ? col
              : {
                  ...col,
                  tasks: col.tasks.map((t) =>
                    t.id === cardId ? { ...t, assignees } : t,
                  ),
                },
          ),
        )
      } catch {
        // ignore
      }

      // Notify only newly added assignees.
      const added = nextAssigneeIds.filter(
        (id) => !prevAssigneeIds.includes(id),
      )
      if (added.length > 0) {
        void (async () => {
          const r = await httpNotifyTaskAssigned({
            boardId,
            cardId,
            taskTitle: taskTitleDraft.trim(),
            taskDescription: taskDescriptionDraft.trim() || null,
            assignedUserIds: added,
            boardProjectSlug: boardProjectSlug,
          })
          if (!r.ok && "error" in r && r.error) {
            setError(r.error)
          } else if (r.inAppRpcError) {
            setError(`Notificação in-app: ${r.inAppRpcError}`)
          }
          if (r.ok) {
            const boardHref = boardNotificationHref(
              boardProjectSlug,
              boardId,
              cardId,
            )
            const boardLabel = boardTitle?.trim() || "Quadro"
            const assigneeLabel = formatAssigneeNames(added, teamMembers)
            const selfMember = teamMembers.find((m) => m.id === userId)
            await pushNotification({
              notificationType: "assignment_actor_confirm",
              title: "Atribuição",
              body: `${taskTitleDraft.trim()} | ${boardLabel} | ${assigneeLabel}`,
              href: boardHref,
              cardId,
              actorName: selfMember?.name?.trim(),
              imageSrc: selfMember?.imageSrc?.trim() || undefined,
            })
          }
        })()
      }
    } else {
      const col = columns.find((c) => c.id === columnId)
      const nextPosition =
        Math.max(0, ...(col?.tasks ?? []).map((t) => t.position ?? 0)) + 1

      try {
        const created = await createBoardCard({
          boardId,
          columnId,
          title: taskTitleDraft,
          description: taskDescriptionDraft,
          dueDate: normalizedDueDate,
          dueAt: dueAtIso,
          dueTimezone,
          position: nextPosition,
          createdBy: userId,
          assignedTo: taskAssigneeIdsDraft[0] || null,
        })

        const newTask: KanbanTask = {
          id: created.id,
          title: created.title,
          description: created.description ?? undefined,
          dueDate: normalizedDueDate ?? undefined,
          dueAt: dueAtIso ?? undefined,
          dueTimezone: dueTimezone ?? undefined,
          deadlineEventId: created.deadline_event_id ?? undefined,
          labels: [],
          color: taskColorDraft,
          position: created.position,
          assignees: resolveKanbanAssignees(taskAssigneeIdsDraft, teamMembers),
        }

        setColumns((prev) =>
          prev.map((column) =>
            column.id === columnId
              ? { ...column, tasks: [...column.tasks, newTask] }
              : column,
          ),
        )

        const deadlineEventId = await syncTaskDeadlineEvent({
          cardId: created.id,
          title: taskTitleDraft,
          description: taskDescriptionDraft,
          dueDate: normalizedDueDate ?? undefined,
          dueTime: normalizedDueTime ?? undefined,
          assigneeIds: taskAssigneeIdsDraft,
        })

        await updateBoardCard({
          id: created.id,
          title: created.title,
          description: created.description ?? "",
          dueDate: normalizedDueDate,
          dueAt: dueAtIso,
          dueTimezone,
          deadlineEventId,
          assignedTo: taskAssigneeIdsDraft[0] || null,
        })

        setColumns((prev) =>
          prev.map((column) =>
            column.id !== columnId
              ? column
              : {
                  ...column,
                  tasks: column.tasks.map((task) =>
                    task.id === created.id
                      ? {
                          ...task,
                          deadlineEventId: deadlineEventId ?? undefined,
                        }
                      : task,
                  ),
                },
          ),
        )

        // Multi-assign is optional (depends on card_assignees table/policies).
        try {
          await setCardAssignees({
            cardId: created.id,
            userIds: taskAssigneeIdsDraft,
          })
        } catch (e) {
          setError(
            e instanceof Error
              ? e.message
              : "Card criado, mas falhou ao salvar responsáveis.",
          )
        }

        // Refresh assignees from DB if available.
        try {
          const map = await fetchCardAssignees([created.id])
          const ids = map[created.id] ?? []
          if (ids.length > 0) {
            const resolved = resolveKanbanAssignees(ids, teamMembers)
            setColumns((prev) =>
              prev.map((col) =>
                col.id !== columnId
                  ? col
                  : {
                      ...col,
                      tasks: col.tasks.map((t) =>
                        t.id === created.id ? { ...t, assignees: resolved } : t,
                      ),
                    },
              ),
            )
          }
        } catch {
          // ignore
        }

        if (taskAssigneeIdsDraft.length > 0) {
          void (async () => {
            const r = await httpNotifyTaskAssigned({
              boardId,
              cardId: created.id,
              taskTitle: taskTitleDraft.trim(),
              taskDescription: taskDescriptionDraft.trim() || null,
              assignedUserIds: taskAssigneeIdsDraft,
              boardProjectSlug: boardProjectSlug,
            })
            if (!r.ok && "error" in r && r.error) {
              setError(r.error)
            } else if (r.inAppRpcError) {
              setError(`Notificação in-app: ${r.inAppRpcError}`)
            }
            if (r.ok) {
              const boardHref = boardNotificationHref(
                boardProjectSlug,
                boardId,
                created.id,
              )
              const boardLabel = boardTitle?.trim() || "Quadro"
              const assigneeLabel = formatAssigneeNames(
                taskAssigneeIdsDraft,
                teamMembers,
              )
              const selfMember = teamMembers.find((m) => m.id === userId)
              await pushNotification({
                notificationType: "assignment_actor_confirm",
                title: "Atribuição",
                body: `${taskTitleDraft.trim()} | ${boardLabel} | ${assigneeLabel}`,
                href: boardHref,
                cardId: created.id,
                actorName: selfMember?.name?.trim(),
                imageSrc: selfMember?.imageSrc?.trim() || undefined,
              })
            }
          })()
        }

        {
          const createdInColumn = columns.find((c) => c.id === columnId)
          void rpcNotifyTaskCreated({
            boardId,
            cardId: created.id,
            columnTitle: createdInColumn?.title ?? "Coluna",
            boardProjectSlug,
          })
        }

        showAlert({
          variant: "success",
          title: "Tarefa criada",
          description: `A tarefa "${created.title}" foi adicionada à coluna.`,
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao criar card.")
      }
    }

    resetTaskForm()
  }

  const handleRemoveTask = async (columnId: string, taskId: string) => {
    const previousColumns = columns
    const taskToRemove =
      columns
        .find((column) => column.id === columnId)
        ?.tasks.find((task) => task.id === taskId) ?? null

    setColumns((prev) =>
      prev.map((column) =>
        column.id === columnId
          ? {
              ...column,
              tasks: column.tasks.filter((task) => task.id !== taskId),
            }
          : column,
      ),
    )

    if (editingTask?.taskId === taskId) {
      resetTaskForm()
    }

    try {
      const removed = await removeBoardCard(taskId)
      const deadlineEventId =
        removed.deadlineEventId ?? taskToRemove?.deadlineEventId ?? null
      if (deadlineEventId) {
        try {
          await deleteCalendarEvent(deadlineEventId)
        } catch (calendarError) {
          setError(
            calendarError instanceof Error
              ? `A tarefa foi removida, mas o evento do calendário não pôde ser apagado: ${calendarError.message}`
              : "A tarefa foi removida, mas o evento do calendário não pôde ser apagado.",
          )
        }
      }
    } catch (e) {
      setColumns(previousColumns)
      setError(e instanceof Error ? e.message : "Falha ao remover card.")
    }
  }

  const handleOpenAddColumn = () => {
    setEditingColumnId(null)
    setIsAddingColumn(true)
    setColumnTitleDraft("")
    setColumnColorDraft(defaultColumnPalette.custom)
  }

  const handleOpenEditColumn = (column: KanbanColumn) => {
    setIsAddingColumn(false)
    setEditingColumnId(column.id)
    setColumnTitleDraft(column.title)
    setColumnColorDraft(column.color ?? defaultColumnPalette[column.type])
  }

  const handleCloseEditColumnModal = (open: boolean) => {
    if (!open) {
      resetColumnForm()
    }
  }

  const handleSubmitColumn = async () => {
    if (!columnTitleDraft.trim()) return

    if (editingColumnId) {
      const trimmed = columnTitleDraft.trim()
      const inferred = inferColumnTypeFromTitle(trimmed)
      setColumns((prev) =>
        prev.map((column) =>
          column.id === editingColumnId
            ? {
                ...column,
                title: trimmed,
                type: inferred,
                color: columnColorDraft,
              }
            : column,
        ),
      )
      try {
        await updateColumnTitle({ id: editingColumnId, title: trimmed })
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao salvar coluna.")
        return
      }
      resetColumnForm()
      return
    } else {
      const nextPosition =
        Math.max(0, ...columns.map((c) => c.position ?? 0)) + 1
      try {
        const created = await createBoardColumn({
          boardId,
          title: columnTitleDraft,
          position: nextPosition,
        })

        const newColumn: KanbanColumn = {
          id: created.id,
          title: created.title,
          type: inferColumnTypeFromTitle(created.title),
          color: columnColorDraft,
          position: created.position,
          tasks: [],
        }

        setColumns((prev) => [...prev, newColumn].map(withColumnDefaults))

        showAlert({
          variant: "success",
          title: "Coluna criada",
          description: `A coluna "${created.title}" foi adicionada ao quadro.`,
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao criar coluna.")
      }
    }

    resetColumnForm()
  }

  const handleRemoveColumn = async (columnId: string) => {
    setColumns((prev) => prev.filter((column) => column.id !== columnId))

    if (editingColumnId === columnId) {
      resetColumnForm()
    }

    try {
      await removeBoardColumn(columnId)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao remover coluna.")
    }
  }

  const getColumnColor = (column: KanbanColumn) =>
    column.color ?? defaultColumnPalette[column.type]

  const getLabelColor = (label: string) =>
    defaultLabelColors[label] || "bg-slate-500"

  React.useEffect(() => {
    const cardId = searchParams.get("card")?.trim() ?? ""
    if (!cardId) {
      handledCardFromQueryRef.current = null
      return
    }
    if (loading) return
    if (handledCardFromQueryRef.current === cardId) return

    let found: { columnId: string; task: KanbanTask; color: string } | null =
      null
    for (const col of columns) {
      const task = col.tasks.find((t) => t.id === cardId)
      if (task) {
        const color = task.color ?? col.color ?? defaultColumnPalette[col.type]
        found = { columnId: col.id, task, color }
        break
      }
    }

    const params = new URLSearchParams(searchParams.toString())
    params.delete("card")
    const nextQs = params.toString()
    const nextUrl = nextQs ? `${pathname}?${nextQs}` : pathname

    if (!found) {
      router.replace(nextUrl)
      return
    }

    handledCardFromQueryRef.current = cardId
    void openEditTaskRef.current(found.columnId, found.task, found.color)
    router.replace(nextUrl)
  }, [loading, columns, searchParams, pathname, router])

  async function handleAddChecklistItem(cardId: string) {
    const title = newChecklistTitleDraft.trim()
    if (!title) return
    const existing = checklistsByCardId[cardId] ?? []
    const nextPosition = Math.max(0, ...existing.map((t) => t.position)) + 1
    setNewChecklistTitleDraft("")

    try {
      const created = await createChecklistItem({
        cardId,
        title,
        position: nextPosition,
      })
      setChecklistsByCardId((prev) => ({
        ...prev,
        [cardId]: [...(prev[cardId] ?? []), created].map((t) => ({
          id: t.id,
          title: t.title,
          position: t.position,
        })),
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao criar checklist.")
    }
  }

  async function handleColumnDragDrop(targetColumnId: string) {
    const movedId = draggedColumnId
    if (!movedId || movedId === targetColumnId) {
      setDraggedColumnId(null)
      setColumnDropTargetId(null)
      return
    }

    setColumns((prev) => {
      const from = prev.findIndex((c) => c.id === movedId)
      const to = prev.findIndex((c) => c.id === targetColumnId)
      if (from < 0 || to < 0) return prev
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next.map((c, idx) => ({ ...c, position: idx + 1 }))
    })

    const snapshot = columns
    setDraggedColumnId(null)
    setColumnDropTargetId(null)

    try {
      const next = (() => {
        const from = snapshot.findIndex((c) => c.id === movedId)
        const to = snapshot.findIndex((c) => c.id === targetColumnId)
        if (from < 0 || to < 0) return snapshot
        const arr = [...snapshot]
        const [moved] = arr.splice(from, 1)
        arr.splice(to, 0, moved)
        return arr.map((c, idx) => ({ ...c, position: idx + 1 }))
      })()

      await updateBoardColumnsPositions({
        updates: next.map((c) => ({ id: c.id, position: c.position ?? 0 })),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao mover coluna.")
    }
  }

  React.useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const members = await getTeamMembers()
        const assignees = members.map((m) => ({
          id: m.id,
          name: m.name,
          imageSrc: m.imageSrc,
        }))
        const assigneesById = Object.fromEntries(
          assignees.map((a) => [
            a.id,
            { id: a.id, name: a.name, imageSrc: a.imageSrc },
          ]),
        )

        const [colRows, cardRows] = await Promise.all([
          fetchBoardColumns(boardId),
          fetchBoardCards(boardId),
        ])

        const assigneeIdsByCardId = await fetchCardAssignees(
          cardRows.map((c) => c.id),
        )

        const nextColumns = buildKanbanColumns({
          columns: colRows,
          cards: cardRows,
          checklistsByCardId: {},
          assigneesById,
          assigneeIdsByCardId,
        }).map(withColumnDefaults)

        if (!alive) return
        setTeamMembers(assignees)
        setColumns(nextColumns)
      } catch (e) {
        if (!alive) return
        setError(e instanceof Error ? e.message : "Falha ao carregar o Kanban.")
      } finally {
        if (alive) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      alive = false
    }
  }, [boardId])

  React.useLayoutEffect(() => {
    setDashboardLoading(loading)
  }, [loading, setDashboardLoading])

  if (loading) {
    // O loader global do dashboard cuida do estado de loading.
    return null
  }

  if (columns.length === 0) {
    return (
      <div
        className={cn(
          "min-h-0 w-full px-0 py-2 sm:px-3 sm:py-3 lg:px-6 lg:py-4",
          className,
        )}
      >
        <div className="flex min-h-[calc(100dvh-11rem)] w-full flex-col rounded-2xl border border-border/40 bg-background px-3 py-4 shadow-sm sm:px-4 sm:py-6 lg:h-[calc(100vh-3rem)] lg:rounded-3xl">
          <EditColumnModal
            open={editingColumnId !== null}
            onOpenChange={handleCloseEditColumnModal}
            title={columnTitleDraft}
            color={columnColorDraft}
            onTitleChange={setColumnTitleDraft}
            onColorChange={setColumnColorDraft}
            onSave={() => void handleSubmitColumn()}
          />
          {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
          <div className="flex flex-1 items-center justify-center">
            <AddColumnForm
              isOpen={isAddingColumn}
              title={columnTitleDraft}
              color={columnColorDraft}
              compact={false}
              heading="Nova coluna"
              submitLabel="Criar coluna"
              onTitleChange={setColumnTitleDraft}
              onColorChange={setColumnColorDraft}
              onOpen={handleOpenAddColumn}
              onCancel={resetColumnForm}
              onSubmit={handleSubmitColumn}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "min-h-0 w-full px-0 py-2 sm:px-3 sm:py-3 lg:px-6 lg:py-4",
        className,
      )}
    >
      <EditColumnModal
        open={editingColumnId !== null}
        onOpenChange={handleCloseEditColumnModal}
        title={columnTitleDraft}
        color={columnColorDraft}
        onTitleChange={setColumnTitleDraft}
        onColorChange={setColumnColorDraft}
        onSave={() => void handleSubmitColumn()}
        onDelete={
          editingColumnId
            ? () => {
                void handleRemoveColumn(editingColumnId)
              }
            : undefined
        }
      />

      {error && (
        <div className="mb-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="sr-only" aria-live="polite">
        {error ?? ""}
      </div>

      <GlowCard
        glowColor="blue"
        customSize
        className="flex min-h-[calc(100dvh-11rem)] w-full flex-col border border-border/60 bg-background px-3 py-3 sm:px-4 sm:py-4 lg:h-[calc(100vh-3rem)]"
      >
        <HorizontalScroll
          ref={scrollRef}
          className="mt-1 flex-1"
          onDragOver={handleBoardDragOver}
        >
          <div className="flex h-full min-h-full w-full flex-1 items-stretch gap-4 pb-4">
            {columns.map((column) => {
              const isColumnDropActive =
                columnDropTargetId === column.id &&
                draggedColumnId &&
                draggedColumnId !== column.id
              return (
                <Column
                  key={column.id}
                  column={column}
                  columnColor={getColumnColor(column)}
                  isColumnDropActive={Boolean(isColumnDropActive)}
                  isDraggingAnyColumn={Boolean(draggedColumnId)}
                  onColumnDragStart={(id) => setDraggedColumnId(id)}
                  onColumnDragOver={(e, id) => {
                    e.preventDefault()
                    setColumnDropTargetId(id)
                  }}
                  onColumnDrop={(id) => void handleColumnDragDrop(id)}
                  onColumnDragEnd={() => {
                    setDraggedColumnId(null)
                    setColumnDropTargetId(null)
                  }}
                  draggedTask={draggedTask}
                  dropTarget={dropTarget}
                  addingCardTo={addingCardTo}
                  editingTaskId={
                    editingTask?.columnId === column.id
                      ? editingTask.taskId
                      : null
                  }
                  taskTitleDraft={taskTitleDraft}
                  taskDescriptionDraft={taskDescriptionDraft}
                  taskDueDateDraft={taskDueDateDraft}
                  taskDueTimeDraft={taskDueTimeDraft}
                  taskColorDraft={taskColorDraft}
                  assigneeIdsDraft={taskAssigneeIdsDraft}
                  assignees={teamMembers}
                  onAssigneeIdsChange={setTaskAssigneeIdsDraft}
                  allowAddTask={allowAddTask}
                  onDragOver={handleDragOver}
                  onDrop={(id) => void handleDrop(id)}
                  onDragLeave={() => setDropTarget(null)}
                  onTaskDragStart={handleDragStart}
                  onTaskDragEnd={() => setDraggedTask(null)}
                  onOpenAddCard={handleOpenAddTask}
                  onOpenEditTask={(colId, task, colColor) =>
                    void handleOpenEditTask(colId, task, colColor)
                  }
                  onCancelTaskForm={resetTaskForm}
                  onTaskTitleChange={setTaskTitleDraft}
                  onTaskDescriptionChange={setTaskDescriptionDraft}
                  onTaskDueDateChange={handleTaskDueDateChange}
                  onTaskDueTimeChange={setTaskDueTimeDraft}
                  onSubmitTask={(colId) => void handleSubmitTask(colId)}
                  onRemoveTask={(colId, taskId) =>
                    void handleRemoveTask(colId, taskId)
                  }
                  onEditColumn={handleOpenEditColumn}
                  onRemoveColumn={(colId) => void handleRemoveColumn(colId)}
                  getLabelColor={getLabelColor}
                  checklistItems={
                    editingTask?.columnId === column.id
                      ? (checklistsByCardId[editingTask.taskId] ?? [])
                      : []
                  }
                  checklistTitleDraft={newChecklistTitleDraft}
                  onChecklistTitleChange={setNewChecklistTitleDraft}
                  onAddChecklistItem={(cardId) =>
                    void handleAddChecklistItem(cardId)
                  }
                  editingCardId={
                    editingTask?.columnId === column.id
                      ? editingTask.taskId
                      : null
                  }
                />
              )
            })}

            <AddColumnForm
              isOpen={isAddingColumn}
              title={columnTitleDraft}
              color={columnColorDraft}
              compact
              heading="Nova coluna"
              submitLabel="Criar coluna"
              onTitleChange={setColumnTitleDraft}
              onColorChange={setColumnColorDraft}
              onOpen={handleOpenAddColumn}
              onCancel={resetColumnForm}
              onSubmit={handleSubmitColumn}
            />
          </div>
        </HorizontalScroll>
      </GlowCard>
    </div>
  )
}
