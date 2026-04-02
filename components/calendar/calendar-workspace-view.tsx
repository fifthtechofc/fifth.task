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

function CalendarLoadingSkeleton() {
  return (
    <div
      className="min-h-[520px] animate-pulse rounded-[28px] border border-white/10 bg-black/20"
      aria-busy="true"
      aria-label="Carregando calendario"
    >
      <div className="flex flex-col gap-4 border-b border-white/10 p-4 lg:flex-row lg:items-center">
        <div className="h-10 flex-1 max-w-md rounded-md bg-white/10" />
        <div className="h-10 flex-1 max-w-[220px] rounded-md bg-white/10" />
        <div className="h-10 w-40 rounded-md bg-white/10" />
      </div>
      <div className="grid grid-cols-7 gap-px border-b border-white/10 bg-white/6 p-px">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={`w-${i}`} className="bg-black/25 py-2.5" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-white/6 p-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="min-h-[88px] rounded-lg bg-white/5 lg:min-h-[120px]" />
        ))}
      </div>
    </div>
  )
}

export function CalendarWorkspaceView() {
  const { setLoading: setDashboardLoading, showAlert } = useDashboardLoading()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [eventsLoadError, setEventsLoadError] = React.useState<string | null>(null)
  const [workspaces, setWorkspaces] = React.useState<WorkspaceOption[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = React.useState<string>("")
  const [events, setEvents] = React.useState<CalendarEventRecord[]>([])

  const loadCalendar = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    setEventsLoadError(null)

    try {
      const access = await fetchCalendarAccess()
      const workspaceIds = access.workspaces.map((workspace) => workspace.id)

      setWorkspaces(access.workspaces)
      setSelectedWorkspaceId((current) => {
        const next = current || access.defaultWorkspaceId || access.workspaces[0]?.id || ""
        return next
      })

      try {
        const rows = await fetchCalendarEvents(workspaceIds)
        setEvents(rows)
      } catch (evErr) {
        setEvents([])
        setEventsLoadError(
          evErr instanceof Error ? evErr.message : "Nao foi possivel carregar os eventos.",
        )
      }
    } catch (e) {
      setWorkspaces([])
      setEvents([])
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
    return <CalendarLoadingSkeleton />
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>
  }

  if (workspaces.length === 0) {
    return (
      <div className="max-w-xl space-y-2 text-sm text-muted-foreground">
        <p>Nenhum workspace disponivel para este usuario.</p>
        <p className="text-xs leading-relaxed text-zinc-500">
          <span className="font-medium text-zinc-400">Opção A (recomendado, equipa interna):</span> corre{" "}
          <code className="rounded bg-white/5 px-1">supabase/workspaces_rls_single_tenant_open.sql</code> no
          SQL Editor.{" "}
          <span className="font-medium text-zinc-400">Opção B:</span>{" "}
          <code className="rounded bg-white/5 px-1">workspaces_rls_authenticated_select.sql</code> (mais
          restritivo).{" "}
          <span className="font-medium text-zinc-400">Opção C:</span>{" "}
          <code className="rounded bg-white/5 px-1">SUPABASE_SERVICE_ROLE_KEY</code> no servidor; opcional{" "}
          <code className="rounded bg-white/5 px-1">CALENDAR_FALLBACK_ALL_WORKSPACES=1</code> se não houver
          linha em <code className="rounded bg-white/5 px-1">workspace_members</code>.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {eventsLoadError ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Eventos nao carregaram (o grid do mes continua disponivel): {eventsLoadError}
        </p>
      ) : null}
      <FullScreenCalendar
        data={calendarData}
        workspaces={workspaces}
        selectedWorkspaceId={selectedWorkspaceId}
        onWorkspaceChange={setSelectedWorkspaceId}
        onCreateEvent={handleCreateEvent}
        onUpdateEvent={handleUpdateEvent}
        onDeleteEvent={handleDeleteEvent}
      />
    </div>
  )
}
