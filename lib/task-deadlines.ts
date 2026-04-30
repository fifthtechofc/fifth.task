function pad2(value: number) {
  return String(value).padStart(2, "0")
}

export function normalizeDueDateInput(value: string | undefined) {
  const trimmed = value?.trim() ?? ""
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : ""
}

export function normalizeDueTimeInput(value: string | undefined) {
  const trimmed = value?.trim() ?? ""
  return /^\d{2}:\d{2}$/.test(trimmed) ? trimmed : ""
}

export function combineDueDateTimeToIso(
  dueDate: string | undefined,
  dueTime: string | undefined,
) {
  const safeDate = normalizeDueDateInput(dueDate)
  const safeTime = normalizeDueTimeInput(dueTime)
  if (!safeDate || !safeTime) return null

  const localDate = new Date(`${safeDate}T${safeTime}:00`)
  if (!Number.isFinite(localDate.getTime())) return null
  return localDate.toISOString()
}

export function extractDueDateInput(dueAt: string | undefined) {
  const raw = dueAt?.trim() ?? ""
  if (!raw) return ""
  const date = new Date(raw)
  if (!Number.isFinite(date.getTime())) {
    return normalizeDueDateInput(raw)
  }
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function extractDueTimeInput(dueAt: string | undefined) {
  const raw = dueAt?.trim() ?? ""
  if (!raw) return ""
  const date = new Date(raw)
  if (!Number.isFinite(date.getTime())) return ""
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

export function formatDueAtLabel(
  dueAt: string | undefined,
  locale = "pt-BR",
  timeZone?: string,
) {
  const raw = dueAt?.trim() ?? ""
  if (!raw) return ""
  const safeValue = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00` : raw
  const date = new Date(safeValue)
  if (!Number.isFinite(date.getTime())) return ""

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(date)
}

export function buildCalendarLocalDateTime(
  dueDate: string | undefined,
  dueTime: string | undefined,
) {
  const safeDate = normalizeDueDateInput(dueDate)
  const safeTime = normalizeDueTimeInput(dueTime)
  if (!safeDate || !safeTime) return null
  return `${safeDate}T${safeTime}:00`
}
