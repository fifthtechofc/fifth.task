"use client"

import * as React from "react"
import {
  addMonths,
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDaysInMonth,
  isAfter,
  isSameDay,
  isSameMonth,
  isToday,
  isTomorrow,
  isYesterday,
  parse,
  startOfMonth,
  startOfToday,
  startOfWeek,
  subDays,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Pencil, PlusCircle, RotateCcw, Trash2 } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { MembersSelect, type MemberOption } from "@/components/ui/members-select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export interface CalendarEventItem {
  id: string
  name: string
  time: string
  datetime: string
  endDatetime?: string
  description?: string
  isMeeting?: boolean
  meetingLink?: string
  workspaceId: string
  assignees: MemberOption[]
}

export interface CalendarData {
  day: Date
  events: CalendarEventItem[]
}

type WorkspaceOption = {
  id: string
  label: string
}

interface FullScreenCalendarProps {
  data: CalendarData[]
  workspaces: WorkspaceOption[]
  availableMembersByWorkspaceId: Record<string, MemberOption[]>
  selectedWorkspaceId: string
  focusEventId?: string | null
  onWorkspaceChange: (workspaceId: string) => void
  onCreateEvent: (input: {
    workspaceId: string
    title: string
    description?: string
    isMeeting?: boolean
    meetingLink?: string
    startAt: string
    endAt?: string
    assigneeIds: string[]
  }) => Promise<void>
  onUpdateEvent: (
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
  ) => Promise<void>
  onDeleteEvent: (eventId: string) => Promise<void>
}

const FORM_STEPS = ["Titulo", "Agenda", "Detalhes"] as const

function toLocalDateValue(date: Date) {
  return format(date, "yyyy-MM-dd")
}

function toLocalTimeValue(date: Date) {
  return format(date, "HH:mm")
}

function buildLocalDateTime(dateValue: string, timeValue: string) {
  return `${dateValue}T${timeValue}`
}

function safeParseDateTime(value: string) {
  const parsed = new Date(value.trim().replace(" ", "T"))
  return Number.isFinite(parsed.getTime()) ? parsed : null
}

function moveDateToMonth(current: Date, targetMonthValue: string) {
  const targetMonth = parse(targetMonthValue, "yyyy-MM", new Date())
  const maxDay = getDaysInMonth(targetMonth)
  return new Date(targetMonth.getFullYear(), targetMonth.getMonth(), Math.min(current.getDate(), maxDay))
}

function shiftDateByMonths(current: Date, amount: number) {
  const targetMonth = addMonths(current, amount)
  const maxDay = getDaysInMonth(targetMonth)
  return new Date(
    targetMonth.getFullYear(),
    targetMonth.getMonth(),
    Math.min(current.getDate(), maxDay),
  )
}

export function FullScreenCalendar({
  data,
  workspaces,
  availableMembersByWorkspaceId,
  selectedWorkspaceId,
  focusEventId,
  onWorkspaceChange,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
}: FullScreenCalendarProps) {
  const today = startOfToday()
  const [selectedDate, setSelectedDate] = React.useState(today)
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editingEventId, setEditingEventId] = React.useState<string | null>(null)
  const [eventTitle, setEventTitle] = React.useState("")
  const [eventDescription, setEventDescription] = React.useState("")
  const [eventIsMeeting, setEventIsMeeting] = React.useState(false)
  const [eventMeetingLink, setEventMeetingLink] = React.useState("")
  const [eventDate, setEventDate] = React.useState(toLocalDateValue(today))
  const [eventStartTime, setEventStartTime] = React.useState("09:00")
  const [eventEndTime, setEventEndTime] = React.useState("")
  const [eventWorkspaceId, setEventWorkspaceId] = React.useState("")
  const [eventAssigneeIds, setEventAssigneeIds] = React.useState<string[]>([])
  const [currentStep, setCurrentStep] = React.useState(0)
  const [formError, setFormError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [eventsDialogOpen, setEventsDialogOpen] = React.useState(false)

  const handledFocusEventIdRef = React.useRef<string | null>(null)
  const openEditEventRef = React.useRef<((event: CalendarEventItem) => void) | null>(null)

  function handleShowMoreEvents(day: Date) {
    setSelectedDate(day)
    setEventsDialogOpen(true)
  }

  const visibleMonth = startOfMonth(selectedDate)
  const monthValue = format(selectedDate, "yyyy-MM")

  const days = eachDayOfInterval({
    start: startOfWeek(visibleMonth, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1 }),
  })

  const allEvents = React.useMemo(
    () => data.flatMap((entry) => entry.events).sort((a, b) => a.datetime.localeCompare(b.datetime)),
    [data],
  )
  const groupedEvents = React.useMemo(() => {
    const startOfRealToday = startOfToday()

    const endOfRealToday = new Date(startOfRealToday)
    endOfRealToday.setHours(23, 59, 59, 999)

    return {
      past: allEvents.filter((event) => {
        const date = safeParseDateTime(event.datetime)
        return date ? date < startOfRealToday : false
      }),
      today: allEvents.filter((event) => {
        const date = safeParseDateTime(event.datetime)
        return date ? date >= startOfRealToday && date <= endOfRealToday : false
      }),
      future: allEvents.filter((event) => {
        const date = safeParseDateTime(event.datetime)
        return date ? date > endOfRealToday : false
      }),
    }
  }, [allEvents])

  const dayContext = React.useMemo(() => {
    if (isToday(selectedDate)) return "Hoje"
    if (isTomorrow(selectedDate)) return "Amanha"
    if (isYesterday(selectedDate)) return "Ontem"
    return format(selectedDate, "EEEE", { locale: ptBR })
  }, [selectedDate])

  const centerButtonLabel = React.useMemo(() => {
    if (isToday(selectedDate)) return "Hoje"
    if (isTomorrow(selectedDate)) return "Amanha"
    if (isYesterday(selectedDate)) return "Ontem"
    return format(selectedDate, "dd/MM", { locale: ptBR })
  }, [selectedDate])

  function openNewEvent() {
    const initialDate = toLocalDateValue(selectedDate)
    const initialTime = "09:00"
    setEditingEventId(null)
    setEventTitle("")
    setEventDescription("")
    setEventIsMeeting(false)
    setEventMeetingLink("")
    setEventDate(initialDate)
    setEventStartTime(initialTime)
    setEventEndTime("")
    setEventWorkspaceId(selectedWorkspaceId)
    setEventAssigneeIds([])
    setCurrentStep(0)
    setFormError(null)
    setSheetOpen(true)
  }

  const openEditEvent = React.useCallback((event: CalendarEventItem) => {
    const startDate = safeParseDateTime(event.datetime)
    const endDate = event.endDatetime ? safeParseDateTime(event.endDatetime) : null
    setEditingEventId(event.id)
    setEventTitle(event.name)
    setEventDescription(event.description ?? "")
    setEventIsMeeting(Boolean(event.isMeeting))
    setEventMeetingLink(event.meetingLink ?? "")
    setEventDate(startDate ? toLocalDateValue(startDate) : toLocalDateValue(selectedDate))
    setEventStartTime(startDate ? toLocalTimeValue(startDate) : "09:00")
    setEventEndTime(endDate ? toLocalTimeValue(endDate) : "")
    setEventWorkspaceId(event.workspaceId)
    setEventAssigneeIds(event.assignees.map((assignee) => assignee.id))
    setCurrentStep(0)
    setFormError(null)
    setSheetOpen(true)
  }, [selectedDate])

  openEditEventRef.current = openEditEvent

  function validateStep(step: number) {
    if (step === 0) {
      if (!eventTitle.trim()) return "Informe um titulo para o evento."
      if (!eventWorkspaceId) return "Selecione um workspace."
      if (eventIsMeeting && !eventMeetingLink.trim()) return "Informe o link da reuniao."
    }

    if (step === 1) {
      if (!eventDate) return "Informe a data do evento."
      if (!eventStartTime) return "Informe o horario de inicio."

      const startParsed = safeParseDateTime(buildLocalDateTime(eventDate, eventStartTime))
      const endParsed = eventEndTime
        ? safeParseDateTime(buildLocalDateTime(eventDate, eventEndTime))
        : null

      if (!startParsed) return "Informe uma data e horario de inicio validos."
      if (eventEndTime && !endParsed) return "Informe um horario final valido."
      if (startParsed && endParsed && isAfter(startParsed, endParsed)) {
        return "O horario final precisa ser maior ou igual ao inicial."
      }
    }

    return null
  }

  function goToNextStep() {
    const error = validateStep(currentStep)
    if (error) {
      setFormError(error)
      return
    }
    setFormError(null)
    setCurrentStep((step) => Math.min(step + 1, FORM_STEPS.length - 1))
  }

  function goToPreviousStep() {
    setFormError(null)
    setCurrentStep((step) => Math.max(step - 1, 0))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await submitEvent()
  }

  async function submitEvent() {
    const error = validateStep(0) ?? validateStep(1)
    if (error) {
      setFormError(error)
      setCurrentStep(error.includes("titulo") || error.includes("workspace") ? 0 : 1)
      return
    }

    setSaving(true)
    setFormError(null)

    try {
      const startAt = `${buildLocalDateTime(eventDate, eventStartTime)}:00`
      const endAt = eventEndTime ? `${buildLocalDateTime(eventDate, eventEndTime)}:00` : undefined

      const payload = {
        workspaceId: eventWorkspaceId,
        title: eventTitle.trim(),
        description: eventDescription,
        isMeeting: eventIsMeeting,
        meetingLink: eventMeetingLink.trim() || undefined,
        startAt,
        endAt,
        assigneeIds: eventAssigneeIds,
      }

      if (editingEventId) {
        await onUpdateEvent(editingEventId, payload)
      } else {
        await onCreateEvent(payload)
      }

      setSheetOpen(false)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Falha ao salvar o evento.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editingEventId) return
    setDeleting(true)
    setFormError(null)
    try {
      await onDeleteEvent(editingEventId)
      setSheetOpen(false)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Falha ao excluir o evento.")
    } finally {
      setDeleting(false)
    }
  }

  const datePreview = eventDate
    ? format(parse(eventDate, "yyyy-MM-dd", new Date()), "dd 'de' MMMM 'de' yyyy", {
        locale: ptBR,
      })
    : "--"

  const availableMembers = React.useMemo(
    () => availableMembersByWorkspaceId[eventWorkspaceId] ?? availableMembersByWorkspaceId[selectedWorkspaceId] ?? [],
    [availableMembersByWorkspaceId, eventWorkspaceId, selectedWorkspaceId],
  )

  React.useEffect(() => {
    if (!focusEventId || handledFocusEventIdRef.current === focusEventId) return
    const targetEvent = data.flatMap((entry) => entry.events).find((event) => event.id === focusEventId)
    if (!targetEvent) return

    const targetDate = safeParseDateTime(targetEvent.datetime)
    if (targetDate) {
      setSelectedDate(targetDate)
    }
    openEditEventRef.current?.(targetEvent)
    handledFocusEventIdRef.current = focusEventId
  }, [data, focusEventId])

  function renderAssigneeSummary(assignees: MemberOption[], maxVisible = 4) {
    if (assignees.length === 0) return null

    return (
      <div className="mt-2 flex items-center justify-end">
        {assignees.slice(0, maxVisible).map((assignee, index) => (
          <Avatar
            key={assignee.id}
            title={assignee.name}
            className={cn("h-6 w-6 border border-white/10 bg-black/60", index > 0 && "-ml-2")}
          >
            {assignee.imageSrc ? (
              <AvatarImage src={assignee.imageSrc} alt={assignee.name} />
            ) : null}
            <AvatarFallback className="text-[10px]">
              {assignee.name
                .split(/\s+/)
                .map((part) => part[0] || "")
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
        {assignees.length > maxVisible ? (
          <div
            className="ml-2 flex h-6 min-w-6 items-center justify-center rounded-full border border-white/10 bg-white/5 px-1 text-[10px] font-semibold text-muted-foreground"
            title={assignees.slice(maxVisible).map((assignee) => assignee.name).join(", ")}
          >
            +{assignees.length - maxVisible}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="relative pt-5">
      <div className="mb-3 flex items-center justify-end gap-2">
        {!isToday(selectedDate) ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setSelectedDate(today)}
            aria-label="Voltar para hoje"
            title="Voltar para hoje"
            className="border-white/15 bg-black/40 text-zinc-100 hover:bg-white/10 hover:text-white"
          >
            <RotateCcw size={16} strokeWidth={2} aria-hidden="true" />
            <span className="ml-2 hidden sm:inline">Hoje</span>
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          onClick={() => setEventsDialogOpen(true)}
          aria-label="Abrir eventos do dia"
          title="Listar eventos"
          className="border-white/15 bg-black/40 text-zinc-100 hover:bg-white/10 hover:text-white"
        >
          <CalendarDays size={16} strokeWidth={2} aria-hidden="true" />
          <span className="ml-2 hidden sm:inline">Eventos</span>
        </Button>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-[28px] border border-white/10 bg-black/35 backdrop-blur-sm">
      <div className="flex flex-col gap-4 border-b border-white/10 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="hidden w-24 flex-col items-center justify-center rounded-lg border border-white/10 bg-white/5 p-0.5 md:flex">
            <h1 className="p-1 text-xs uppercase text-muted-foreground">{dayContext}</h1>
            <div className="flex w-full items-center justify-center rounded-lg border border-white/10 bg-background p-0.5 text-lg font-bold">
              <span>{format(selectedDate, "d")}</span>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {format(visibleMonth, "MMMM 'de' yyyy", { locale: ptBR })}
            </h2>
            <p className="text-sm text-muted-foreground">
              {format(visibleMonth, "dd MMM yyyy", { locale: ptBR })} -{" "}
              {format(endOfMonth(visibleMonth), "dd MMM yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:min-w-[620px] lg:grid-cols-[220px_220px_auto] lg:items-center">
          <select
            value={selectedWorkspaceId}
            onChange={(event) => onWorkspaceChange(event.target.value)}
            className="h-10 w-full rounded-md border border-white/10 bg-black/40 px-3 text-sm text-foreground outline-none"
            aria-label="Selecionar workspace"
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.label}
              </option>
            ))}
          </select>

          <div className="flex items-center rounded-md border border-white/15 bg-black/40">
            <Input
              type="month"
              value={monthValue}
              onChange={(event) => setSelectedDate((current) => moveDateToMonth(current, event.target.value))}
              className="border-0 bg-transparent shadow-none focus-visible:ring-0"
              aria-label="Selecionar mes"
            />
            <div className="mr-1 flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setSelectedDate((current) => shiftDateByMonths(current, 1))}
                className="rounded border border-white/10 bg-white/5 p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                aria-label="Proximo mes"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate((current) => shiftDateByMonths(current, -1))}
                className="rounded border border-white/10 bg-white/5 p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                aria-label="Mes anterior"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 justify-self-start lg:justify-self-end">
            <div className="inline-flex -space-x-px rounded-lg shadow-sm shadow-black/5 rtl:space-x-reverse">
              <Button
                onClick={() => setSelectedDate((current) => subDays(current, 1))}
                className="rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg"
                variant="outline"
                size="icon"
                aria-label="Dia anterior"
              >
                <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
              </Button>
              <Button
                onClick={() => setSelectedDate(today)}
                className="min-w-[88px] rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg"
                variant="outline"
                title="Voltar para hoje"
              >
                {centerButtonLabel}
              </Button>
              <Button
                onClick={() => setSelectedDate((current) => addDays(current, 1))}
                className="rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg"
                variant="outline"
                size="icon"
                aria-label="Proximo dia"
              >
                <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
              </Button>
            </div>

            <Button className="gap-2" onClick={openNewEvent}>
              <PlusCircle size={16} strokeWidth={2} aria-hidden="true" />
              <span>Novo evento</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="lg:flex lg:flex-auto lg:flex-col">
        <div className="grid grid-cols-7 gap-px border-b border-white/10 bg-white/6 text-center text-xs font-semibold leading-6 lg:flex-none">
          <div className="bg-black/25 py-2.5">Seg</div>
          <div className="bg-black/25 py-2.5">Ter</div>
          <div className="bg-black/25 py-2.5">Qua</div>
          <div className="bg-black/25 py-2.5">Qui</div>
          <div className="bg-black/25 py-2.5">Sex</div>
          <div className="bg-black/25 py-2.5">Sab</div>
          <div className="bg-black/25 py-2.5">Dom</div>
        </div>

        <div className="flex text-xs leading-6 lg:flex-auto">
          <div className="hidden w-full bg-white/6 p-px lg:grid lg:grid-cols-7 lg:auto-rows-fr lg:gap-px">
            {days.map((day) => (
              <div
                key={day.toString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  !isSameMonth(day, visibleMonth) && "bg-black/20 text-muted-foreground",
                  isSameDay(day, selectedDate) && "bg-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]",
                  "relative flex min-h-[132px] cursor-pointer flex-col bg-black/35 backdrop-blur-sm hover:bg-white/8",
                )}
              >
                <div
                  className={cn(
                    "pointer-events-none absolute inset-[6px] rounded-2xl border border-white/8 bg-black/40",
                    isSameDay(day, selectedDate) && "border-white/12 bg-white/8",
                  )}
                />
                <header className="flex items-center justify-between p-2.5">
                  <button
                    type="button"
                    className={cn(
                      isSameDay(day, selectedDate) && "bg-foreground text-background",
                      isToday(day) && !isSameDay(day, selectedDate) && "bg-primary text-primary-foreground",
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs",
                    )}
                  >
                    <time dateTime={format(day, "yyyy-MM-dd")}>{format(day, "d")}</time>
                  </button>
                </header>
                <div className="flex-1 space-y-1.5 p-2.5">
                  {data
                    .filter((entry) => isSameDay(entry.day, day))
                    .map((calendarDay) => (
                      <div key={calendarDay.day.toString()} className="space-y-1.5">
                        {calendarDay.events.slice(0, 1).map((event) => (
                          <div
                            key={event.id}
                            onClick={(clickEvent) => {
                              clickEvent.stopPropagation()
                              openEditEvent(event)
                            }}
                            className="rounded-lg border border-white/10 bg-white/5 p-2 text-xs transition-colors hover:bg-white/10"
                          >
                            <p className="font-medium leading-none">{event.name}</p>
                            <p className="mt-1 leading-none text-muted-foreground">{event.time}</p>
                            {event.isMeeting && event.meetingLink ? (
                              <a
                                href={event.meetingLink}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(clickEvent) => clickEvent.stopPropagation()}
                                className="mt-2 inline-flex text-[11px] font-medium text-emerald-300 underline underline-offset-2"
                              >
                                Abrir reuniao
                              </a>
                            ) : null}
                            {renderAssigneeSummary(event.assignees, 3)}
                          </div>
                        ))}
                        {calendarDay.events.length > 1 && (
                          <button
                            type="button"
                            onClick={(clickEvent) => {
                              clickEvent.stopPropagation()
                              handleShowMoreEvents(day)
                            }}
                            className="text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-white"
                          >
                            + {calendarDay.events.length - 1} mais
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>

          <div className="isolate grid w-full grid-cols-7 gap-px border-t border-white/10 bg-white/6 p-px lg:hidden">
            {days.map((day) => (
              <button
                key={day.toString()}
                type="button"
                onClick={() => setSelectedDate(day)}
                className={cn(
                  !isSameMonth(day, visibleMonth) && "bg-black/20 text-muted-foreground",
                  isSameDay(day, selectedDate) && "bg-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]",
                  "relative flex h-14 flex-col bg-black/35 px-3 py-2 backdrop-blur-sm hover:bg-white/8",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none absolute inset-[4px] rounded-xl border border-white/8 bg-black/40",
                    isSameDay(day, selectedDate) && "border-white/12 bg-white/8",
                  )}
                  aria-hidden="true"
                />
                <time
                  dateTime={format(day, "yyyy-MM-dd")}
                  className={cn(
                    "relative z-10 ml-auto flex size-6 items-center justify-center rounded-full",
                    isSameDay(day, selectedDate) && "bg-primary text-primary-foreground",
                  )}
                >
                  {format(day, "d")}
                </time>
              </button>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={eventsDialogOpen} onOpenChange={setEventsDialogOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden border-white/10 bg-zinc-950/95 text-foreground backdrop-blur-xl sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Eventos do calendario
            </DialogTitle>
            <DialogDescription>
              Lista de eventos passados, de hoje e futuros.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-2">
            <div className="space-y-5 pb-2">
              {([
                { key: "past", title: "Eventos passados", items: groupedEvents.past },
                { key: "today", title: "Eventos de hoje", items: groupedEvents.today },
                { key: "future", title: "Eventos futuros", items: groupedEvents.future },
              ] as const).map((section) => (
                <div key={section.key} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {section.title}
                  </p>
                  {section.items.length > 0 ? (
                    section.items.map((event) => (
                      <div
                        key={event.id}
                        onClick={() => {
                          const date = safeParseDateTime(event.datetime)
                          if (date) setSelectedDate(date)
                          setEventsDialogOpen(false)
                          openEditEvent(event)
                        }}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition-colors hover:bg-white/10"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{event.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(event.datetime), "dd/MM/yyyy", { locale: ptBR })} · {event.time}
                            </p>
                          </div>
                        </div>
                        {event.isMeeting && event.meetingLink ? (
                          <a
                            href={event.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(clickEvent) => clickEvent.stopPropagation()}
                            className="mt-2 inline-flex text-xs font-medium text-emerald-300 underline underline-offset-2"
                          >
                            Abrir link da reuniao
                          </a>
                        ) : null}
                        {event.description ? (
                          <p className="mt-1 text-xs text-muted-foreground">{event.description}</p>
                        ) : null}
                        {renderAssigneeSummary(event.assignees, 4)}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum evento nesta seção.</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open)
          if (!open) {
            setFormError(null)
            setSaving(false)
            setDeleting(false)
            setCurrentStep(0)
          }
        }}
      >
        <SheetContent
          side="right"
          showClose
          className="border-l border-border bg-zinc-950/95 text-foreground sm:max-w-md"
        >
          <SheetHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <SheetTitle>{editingEventId ? "Editar evento" : "Novo evento"}</SheetTitle>
                <SheetDescription>Preencha por etapas ate chegar ao salvar.</SheetDescription>
              </div>

              {editingEventId && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    void handleDelete()
                  }}
                  disabled={saving || deleting}
                  className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  aria-label="Excluir evento"
                  title="Excluir evento"
                  style={{ marginRight: "2.75rem" }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </SheetHeader>

          <form className="flex h-full min-h-0 flex-col" onSubmit={handleSubmit}>
            <div className="border-b border-white/10 px-4 py-3">
              <div className="grid grid-cols-3 gap-2">
                {FORM_STEPS.map((label, index) => (
                  <div
                    key={label}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-center text-xs",
                      index === currentStep && "border-white/20 bg-white/10 text-foreground",
                      index < currentStep && "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
                      index > currentStep && "border-white/10 bg-black/20 text-muted-foreground",
                    )}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <div className="space-y-4">
                {currentStep === 0 && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground" htmlFor="calendar-title">
                        Titulo
                      </label>
                      <Input
                        id="calendar-title"
                        value={eventTitle}
                        onChange={(event) => setEventTitle(event.target.value)}
                        placeholder="Ex.: Reuniao Enfermeiro"
                        className="border-white/15 bg-black/40"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground" htmlFor="calendar-workspace">
                        Workspace
                      </label>
                      <select
                        id="calendar-workspace"
                        value={eventWorkspaceId}
                        onChange={(event) => setEventWorkspaceId(event.target.value)}
                        className="h-10 w-full rounded-md border border-white/15 bg-black/40 px-3 text-sm text-foreground outline-none"
                      >
                        {workspaces.map((workspace) => (
                          <option key={workspace.id} value={workspace.id}>
                            {workspace.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">Este evento e uma reuniao?</p>
                          <p className="text-xs text-muted-foreground">
                            Se for, adicione o link para acesso direto depois.
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={eventIsMeeting}
                          onClick={() => setEventIsMeeting((current) => !current)}
                          className={cn(
                            "relative inline-flex h-7 w-12 items-center rounded-full border transition-colors",
                            eventIsMeeting
                              ? "border-emerald-400/40 bg-emerald-500/20"
                              : "border-white/10 bg-black/30",
                          )}
                        >
                          <span
                            className={cn(
                              "ml-1 inline-block h-5 w-5 rounded-full bg-white transition-transform",
                              eventIsMeeting ? "translate-x-5" : "translate-x-0",
                            )}
                          />
                        </button>
                      </div>

                      {eventIsMeeting ? (
                        <div className="mt-3 space-y-2">
                          <label className="text-xs font-medium text-muted-foreground" htmlFor="calendar-meeting-link">
                            Link da reuniao
                          </label>
                          <Input
                            id="calendar-meeting-link"
                            type="url"
                            value={eventMeetingLink}
                            onChange={(event) => setEventMeetingLink(event.target.value)}
                            placeholder="https://meet.google.com/..."
                            className="border-white/15 bg-black/40"
                          />
                        </div>
                      ) : null}
                    </div>

                    <MembersSelect
                      label="Participantes"
                      buttonLabel="Selecionar participantes"
                      members={availableMembers}
                      selectedIds={eventAssigneeIds}
                      onChange={setEventAssigneeIds}
                    />
                  </>
                )}

                {currentStep === 1 && (
                  <>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Data selecionada</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{datePreview}</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground" htmlFor="calendar-date">
                        Dia
                      </label>
                      <Input
                        id="calendar-date"
                        type="date"
                        value={eventDate}
                        onChange={(event) => setEventDate(event.target.value)}
                        className="border-white/15 bg-black/40"
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground" htmlFor="calendar-start-time">
                          Inicio
                        </label>
                        <Input
                          id="calendar-start-time"
                          type="time"
                          value={eventStartTime}
                          onChange={(event) => setEventStartTime(event.target.value)}
                          className="border-white/15 bg-black/40"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground" htmlFor="calendar-end-time">
                          Fim
                        </label>
                        <Input
                          id="calendar-end-time"
                          type="time"
                          value={eventEndTime}
                          onChange={(event) => setEventEndTime(event.target.value)}
                          className="border-white/15 bg-black/40"
                        />
                      </div>
                    </div>
                  </>
                )}

                {currentStep === 2 && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground" htmlFor="calendar-description">
                        Descricao
                      </label>
                      <Textarea
                        id="calendar-description"
                        value={eventDescription}
                        onChange={(event) => setEventDescription(event.target.value)}
                        placeholder="Detalhes opcionais do evento"
                        className="min-h-[120px] border-white/15 bg-black/40"
                        rows={5}
                      />
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-foreground">
                      <p>{eventTitle || "Sem titulo"}</p>
                      <p className="mt-1">{datePreview}</p>
                      <p className="mt-1">
                        {eventStartTime || "--:--"}
                        {eventEndTime ? ` ate ${eventEndTime}` : ""}
                      </p>
                      {eventIsMeeting ? (
                        <p className="mt-1 text-xs text-emerald-300">
                          Reuniao {eventMeetingLink.trim() ? "com link salvo" : "sem link"}
                        </p>
                      ) : null}
                      {eventAssigneeIds.length > 0 && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {eventAssigneeIds.length} participante{eventAssigneeIds.length > 1 ? "s" : ""} atribuido
                          {eventAssigneeIds.length > 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {formError && <p className="text-sm text-red-400">{formError}</p>}
              </div>
            </div>

            <SheetFooter className="flex-row items-center justify-between gap-3">
              <div />

              <div className="flex items-center gap-3">
                {editingEventId && currentStep === 0 && (
                  <Button type="button" variant="outline" onClick={openNewEvent} disabled={saving || deleting}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Novo
                  </Button>
                )}

                {currentStep > 0 && (
                  <Button type="button" variant="outline" onClick={goToPreviousStep} disabled={saving || deleting}>
                    Voltar
                  </Button>
                )}

                {currentStep < 2 ? (
                  <Button type="button" onClick={goToNextStep} disabled={!!validateStep(currentStep) || saving || deleting}>
                    Proximo
                  </Button>
                ) : (
                  <Button type="button" onClick={() => { void submitEvent() }} disabled={saving || deleting}>
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                )}
              </div>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
    </div>
  )
}
