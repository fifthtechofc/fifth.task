"use client"

import * as React from "react"

import { useDashboardLoading } from "@/components/ui/dashboard-shell"
import {
  FullScreenCalendar,
  type CalendarData,
  type CalendarEventItem,
} from "@/components/ui/fullscreen-calendar"
import {
  createCalendarEvent,
  deleteCalendarEvent,
  fetchCalendarAccess,
  fetchCalendarEvents,
  formatEventTimeRange,
  updateCalendarEvent,
  type CalendarEventRecord,
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
      time: formatEventTimeRange(event.startAt, event.endAt),
      datetime: event.startAt,
      description: event.description ?? undefined,
      workspaceId: event.workspaceId,
      endDatetime: event.endAt ?? undefined,
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

export function CalendarWorkspaceView() {
  const { setLoading: setDashboardLoading, showAlert } = useDashboardLoading()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [workspaces, setWorkspaces] = React.useState<WorkspaceOption[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = React.useState<string>("")
  const [events, setEvents] = React.useState<CalendarEventRecord[]>([])

  React.useLayoutEffect(() => {
    setDashboardLoading(loading)
  }, [loading, setDashboardLoading])

  const loadCalendar = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const access = await fetchCalendarAccess()
      const workspaceIds = access.workspaces.map((workspace) => workspace.id)
      const rows = await fetchCalendarEvents(workspaceIds)

      setWorkspaces(access.workspaces)
      setSelectedWorkspaceId((current) => current || access.defaultWorkspaceId || "")
      setEvents(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nao foi possivel carregar o calendario.")
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

  const calendarData = React.useMemo(() => buildCalendarData(visibleEvents), [visibleEvents])

  const handleCreateEvent = async (input: {
    workspaceId: string
    title: string
    description?: string
    startAt: string
    endAt?: string
  }) => {
    setDashboardLoading(true)

    try {
      const created = await createCalendarEvent({
        workspaceId: input.workspaceId,
        title: input.title,
        description: input.description,
        startAt: input.startAt,
        endAt: input.endAt || null,
      })

      setEvents((current) =>
        [...current, created].sort((a, b) => a.startAt.localeCompare(b.startAt)),
      )
      setSelectedWorkspaceId(created.workspaceId)
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
      startAt: string
      endAt?: string
    },
  ) => {
    setDashboardLoading(true)

    try {
      const updated = await updateCalendarEvent(eventId, {
        workspaceId: input.workspaceId,
        title: input.title,
        description: input.description,
        startAt: input.startAt,
        endAt: input.endAt || null,
      })

      setEvents((current) =>
        current
          .map((event) => (event.id === eventId ? updated : event))
          .sort((a, b) => a.startAt.localeCompare(b.startAt)),
      )
      setSelectedWorkspaceId(updated.workspaceId)
      showAlert({
        variant: "success",
        title: "Evento atualizado",
        description: "As alteracoes do evento foram salvas.",
      })
    } finally {
      setDashboardLoading(false)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    setDashboardLoading(true)

    try {
      await deleteCalendarEvent(eventId)
      setEvents((current) => current.filter((event) => event.id !== eventId))
      showAlert({
        variant: "success",
        title: "Evento excluido",
        description: "O evento foi removido do calendario.",
      })
    } finally {
      setDashboardLoading(false)
    }
  }

  if (loading) {
    return null
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>
  }

  if (workspaces.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum workspace disponivel para este usuario.
      </p>
    )
  }

  return (
    <FullScreenCalendar
      data={calendarData}
      workspaces={workspaces}
      selectedWorkspaceId={selectedWorkspaceId}
      onWorkspaceChange={setSelectedWorkspaceId}
      onCreateEvent={handleCreateEvent}
      onUpdateEvent={handleUpdateEvent}
      onDeleteEvent={handleDeleteEvent}
    />
  )
}
