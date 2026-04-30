"use client"

import { useSearchParams } from "next/navigation"
import * as React from "react"
import { useDashboardLoading } from "@/components/ui/dashboard-shell"
import {
  type CalendarData,
  type CalendarEventItem,
  FullScreenCalendar,
} from "@/components/ui/fullscreen-calendar"
import type { MemberOption } from "@/components/ui/members-select"
import { useAppNotifications } from "@/lib/app-notifications-context"
import {
  type CalendarEventRecord,
  createCalendarEvent,
  deleteCalendarEvent,
  fetchCalendarAccess,
  fetchCalendarEvents,
  fetchCalendarWorkspaceMembers,
  formatEventTimeRange,
  updateCalendarEvent,
  type WorkspaceOption,
} from "@/lib/calendar"

function buildCalendarData(events: CalendarEventRecord[]): CalendarData[] {
  const grouped = new Map<string, CalendarEventItem[]>()

  for (const event of events) {
    const date = new Date(event.startAt)
    if (!Number.isFinite(date.getTime())) continue

    const key = event.startAt.slice(0, 10)
    const list = grouped.get(key) ?? []
    list.push({
      id: event.id,
      name: event.title,
      time: event.hideTime ? "" : formatEventTimeRange(event.startAt, event.endAt),
      datetime: event.startAt,
      description: event.description ?? undefined,
      isMeeting: event.isMeeting,
      meetingLink: event.meetingLink ?? undefined,
      sourceType: event.sourceType,
      taskCardId: event.taskCardId ?? undefined,
      taskBoardId: event.taskBoardId ?? undefined,
      taskHref: event.taskHref ?? undefined,
      workspaceId: event.workspaceId,
      endDatetime: event.endAt ?? undefined,
      assignees: event.assignees.map((assignee) => ({
        id: assignee.id,
        name: assignee.name,
        imageSrc: assignee.imageSrc,
      })),
    })
    grouped.set(key, list)
  }

  return Array.from(grouped.entries())
    .map(([key, dayEvents]) => ({
      day: new Date(`${key}T00:00:00`),
      events: dayEvents.sort((a, b) => a.datetime.localeCompare(b.datetime)),
    }))
    .sort((a, b) => a.day.getTime() - b.day.getTime())
}

function CalendarLoadingSkeleton() {
  return (
    <div
      className="min-h-[520px] animate-pulse rounded-[28px] border border-white/10 bg-black/20"
      aria-busy="true"
      aria-label="Carregando calendário"
    >
      <div className="flex flex-col gap-4 border-b border-white/10 p-4 lg:flex-row lg:items-center">
        <div className="h-10 max-w-md flex-1 rounded-md bg-white/10" />
        <div className="h-10 max-w-[220px] flex-1 rounded-md bg-white/10" />
        <div className="h-10 w-40 rounded-md bg-white/10" />
      </div>
      <div className="grid grid-cols-7 gap-px border-b border-white/10 bg-white/6 p-px">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={`w-${i}`} className="bg-black/25 py-2.5" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-white/6 p-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <div
            key={i}
            className="min-h-[88px] rounded-lg bg-white/5 lg:min-h-[120px]"
          />
        ))}
      </div>
    </div>
  )
}

function formatAssigneeNames(assignees: MemberOption[]) {
  const names = assignees
    .map((assignee) => assignee.name.trim())
    .filter(Boolean)
  if (names.length === 0) return ""
  return names.slice(0, 5).join(", ")
}

function formatCalendarNotificationBody(
  eventTitle: string,
  workspaceLabel: string,
  assigneeNames?: string,
) {
  const safeTitle = (eventTitle || "Evento").trim()
  const safeWorkspace = (workspaceLabel || "Workspace").trim()
  const safeAssignees = (assigneeNames || "").trim()

  return safeAssignees
    ? `${safeTitle.slice(0, 140)} | ${safeWorkspace.slice(0, 120)} | ${safeAssignees.slice(0, 220)}`
    : `${safeTitle.slice(0, 140)} | ${safeWorkspace.slice(0, 120)}`
}

export function CalendarWorkspaceView() {
  const searchParams = useSearchParams()
  const { setLoading: setDashboardLoading, showAlert } = useDashboardLoading()
  const { pushNotification } = useAppNotifications()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [eventsLoadError, setEventsLoadError] = React.useState<string | null>(
    null,
  )
  const [workspaces, setWorkspaces] = React.useState<WorkspaceOption[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = React.useState("")
  const [events, setEvents] = React.useState<CalendarEventRecord[]>([])
  const [membersByWorkspaceId, setMembersByWorkspaceId] = React.useState<
    Record<string, MemberOption[]>
  >({})

  React.useLayoutEffect(() => {
    setDashboardLoading(loading)
    return () => {
      setDashboardLoading(false)
    }
  }, [loading, setDashboardLoading])

  const workspaceLabelById = React.useMemo(
    () =>
      new Map(workspaces.map((workspace) => [workspace.id, workspace.label])),
    [workspaces],
  )
  const focusEventId = searchParams.get("eventId")

  const loadCalendar = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    setEventsLoadError(null)

    try {
      const access = await fetchCalendarAccess()
      const workspaceIds = access.workspaces.map((workspace) => workspace.id)

      setWorkspaces(access.workspaces)
      setSelectedWorkspaceId(
        (current) =>
          current ||
          access.defaultWorkspaceId ||
          access.workspaces[0]?.id ||
          "",
      )

      try {
        const [rows, membersByWorkspace] = await Promise.all([
          fetchCalendarEvents(workspaceIds),
          fetchCalendarWorkspaceMembers(workspaceIds),
        ])
        setEvents(rows)
        setMembersByWorkspaceId(membersByWorkspace)
      } catch (eventError) {
        setEvents([])
        setMembersByWorkspaceId({})
        setEventsLoadError(
          eventError instanceof Error
            ? eventError.message
            : "Não foi possível carregar os eventos.",
        )
      }
    } catch (loadError) {
      setWorkspaces([])
      setEvents([])
      setMembersByWorkspaceId({})
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar o calendário.",
      )
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadCalendar()
  }, [loadCalendar])

  const visibleEvents = React.useMemo(() => {
    if (!selectedWorkspaceId) return []
    return events.filter((event) => event.workspaceId === selectedWorkspaceId)
  }, [events, selectedWorkspaceId])

  const calendarData = React.useMemo(
    () => buildCalendarData(visibleEvents),
    [visibleEvents],
  )

  const handleCreateEvent = async (input: {
    workspaceId: string
    title: string
    description?: string
    isMeeting?: boolean
    meetingLink?: string
    startAt: string
    endAt?: string
    assigneeIds: string[]
  }) => {
    setDashboardLoading(true)

    try {
      const created = await createCalendarEvent({
        workspaceId: input.workspaceId,
        title: input.title,
        description: input.description,
        isMeeting: input.isMeeting,
        meetingLink: input.meetingLink,
        startAt: input.startAt,
        endAt: input.endAt || null,
        assigneeIds: input.assigneeIds,
      })

      setEvents((current) =>
        [...current, created].sort((a, b) =>
          a.startAt.localeCompare(b.startAt),
        ),
      )
      setSelectedWorkspaceId(created.workspaceId)

      await pushNotification({
        notificationType:
          created.assignees.length > 0
            ? "calendar_event_created_with_assignees"
            : "calendar_event_created",
        title: "Novo evento",
        body: formatCalendarNotificationBody(
          created.title,
          workspaceLabelById.get(created.workspaceId) ?? "Workspace",
          formatAssigneeNames(created.assignees),
        ),
        href: `/calendar?eventId=${encodeURIComponent(created.id)}`,
      })

      showAlert({
        variant: "success",
        title: "Evento criado",
        description: "O evento foi salvo no workspace selecionado.",
      })
    } finally {
      setDashboardLoading(false)
    }
  }

  const handleUpdateEvent = async (
    eventId: string,
    input: {
      workspaceId: string
      title: string
      description?: string
      isMeeting?: boolean
      meetingLink?: string
      startAt: string
      endAt?: string
      assigneeIds: string[]
    },
  ) => {
    setDashboardLoading(true)

    try {
      const previousEvent = events.find((event) => event.id === eventId) ?? null
      const updated = await updateCalendarEvent(eventId, {
        workspaceId: input.workspaceId,
        title: input.title,
        description: input.description,
        isMeeting: input.isMeeting,
        meetingLink: input.meetingLink,
        startAt: input.startAt,
        endAt: input.endAt || null,
        assigneeIds: input.assigneeIds,
      })

      setEvents((current) =>
        current
          .map((event) => (event.id === eventId ? updated : event))
          .sort((a, b) => a.startAt.localeCompare(b.startAt)),
      )
      setSelectedWorkspaceId(updated.workspaceId)

      const previousAssigneeIds =
        previousEvent?.assignees.map((assignee) => assignee.id) ?? []
      const addedAssigneeIds = updated.assignees
        .map((assignee) => assignee.id)
        .filter((assigneeId) => !previousAssigneeIds.includes(assigneeId))

      await pushNotification({
        notificationType:
          updated.assignees.length > 0
            ? "calendar_event_updated_with_assignees"
            : "calendar_event_updated",
        title: "Evento atualizado",
        body: formatCalendarNotificationBody(
          updated.title,
          workspaceLabelById.get(updated.workspaceId) ?? "Workspace",
          formatAssigneeNames(
            addedAssigneeIds.length > 0
              ? updated.assignees.filter((assignee) =>
                  addedAssigneeIds.includes(assignee.id),
                )
              : updated.assignees,
          ),
        ),
        href: `/calendar?eventId=${encodeURIComponent(updated.id)}`,
      })

      showAlert({
        variant: "success",
        title: "Evento atualizado",
        description: "As alterações do evento foram salvas.",
      })
    } finally {
      setDashboardLoading(false)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    setDashboardLoading(true)

    try {
      const eventToDelete = events.find((event) => event.id === eventId) ?? null
      await deleteCalendarEvent(eventId)
      setEvents((current) => current.filter((event) => event.id !== eventId))

      if (eventToDelete) {
        await pushNotification({
          notificationType: "calendar_event_deleted",
          title: "Evento removido",
          body: formatCalendarNotificationBody(
            eventToDelete.title,
            workspaceLabelById.get(eventToDelete.workspaceId) ?? "Workspace",
          ),
          href: "/calendar",
        })
      }

      showAlert({
        variant: "success",
        title: "Evento excluído",
        description: "O evento foi removido do calendário.",
      })
    } finally {
      setDashboardLoading(false)
    }
  }

  if (loading) {
    return <CalendarLoadingSkeleton />
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>
  }

  if (workspaces.length === 0) {
    return (
      <div className="max-w-xl space-y-2 text-sm text-muted-foreground">
        <p>Nenhum workspace disponível para este usuário.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {eventsLoadError ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Os eventos não foram carregados, mas a grade do mês continua
          disponível: {eventsLoadError}
        </p>
      ) : null}
      <FullScreenCalendar
        data={calendarData}
        workspaces={workspaces}
        availableMembersByWorkspaceId={membersByWorkspaceId}
        selectedWorkspaceId={selectedWorkspaceId}
        focusEventId={focusEventId}
        onWorkspaceChange={setSelectedWorkspaceId}
        onCreateEvent={handleCreateEvent}
        onUpdateEvent={handleUpdateEvent}
        onDeleteEvent={handleDeleteEvent}
      />
    </div>
  )
}
