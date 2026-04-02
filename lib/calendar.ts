import { format } from "date-fns"

import { supabase } from "@/lib/supabase"

type WorkspaceMemberRow = Record<string, unknown>
type CalendarEventDbRow = Record<string, unknown>
type WorkspaceRow = Record<string, unknown>

/** Só colunas que existem no seed mínimo (id, name, created_by). title/slug quebram o PostgREST se não existirem. */
const WORKSPACES_LIST_COLUMNS = "id,name"

export type WorkspaceOption = {
  id: string
  label: string
}

export type CalendarEventRecord = {
  id: string
  workspaceId: string
  createdBy: string
  title: string
  description: string | null
  startAt: string
  endAt: string | null
}

export type CalendarEventInput = {
  workspaceId: string
  title: string
  description?: string
  startAt: string
  endAt?: string | null
}

type CalendarSchemaConfig = {
  name: string
  selectColumns: string
  orderColumn: string
  buildInsertPayload: (input: CalendarEventInput, userId: string) => Record<string, unknown>
  buildUpdatePayload: (input: CalendarEventInput) => Record<string, unknown>
  readStartAt: (row: CalendarEventDbRow) => string
  readEndAt: (row: CalendarEventDbRow) => string | null
}

const CALENDAR_SCHEMA_CANDIDATES: CalendarSchemaConfig[] = [
  {
    name: "event_date/start_time/end_time",
    selectColumns: "id,workspace_id,created_by,title,description,event_date,start_time,end_time",
    orderColumn: "event_date",
    buildInsertPayload: (input, userId) => ({
      workspace_id: input.workspaceId,
      created_by: userId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      event_date: toDateOnly(input.startAt),
      start_time: toTimeOnly(input.startAt),
      end_time: input.endAt ? toTimeOnly(input.endAt) : null,
    }),
    buildUpdatePayload: (input) => ({
      workspace_id: input.workspaceId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      event_date: toDateOnly(input.startAt),
      start_time: toTimeOnly(input.startAt),
      end_time: input.endAt ? toTimeOnly(input.endAt) : null,
    }),
    readStartAt: (row) => combineDateAndTime(row.event_date, row.start_time) ?? "",
    readEndAt: (row) => combineDateAndTime(row.event_date, row.end_time),
  },
  {
    name: "date/start_time/end_time",
    selectColumns: "id,workspace_id,created_by,title,description,date,start_time,end_time",
    orderColumn: "date",
    buildInsertPayload: (input, userId) => ({
      workspace_id: input.workspaceId,
      created_by: userId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      date: toDateOnly(input.startAt),
      start_time: toTimeOnly(input.startAt),
      end_time: input.endAt ? toTimeOnly(input.endAt) : null,
    }),
    buildUpdatePayload: (input) => ({
      workspace_id: input.workspaceId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      date: toDateOnly(input.startAt),
      start_time: toTimeOnly(input.startAt),
      end_time: input.endAt ? toTimeOnly(input.endAt) : null,
    }),
    readStartAt: (row) => combineDateAndTime(row.date, row.start_time) ?? "",
    readEndAt: (row) => combineDateAndTime(row.date, row.end_time),
  },
  {
    name: "start_at/end_at",
    selectColumns: "id,workspace_id,created_by,title,description,start_at,end_at",
    orderColumn: "start_at",
    buildInsertPayload: (input, userId) => ({
      workspace_id: input.workspaceId,
      created_by: userId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      start_at: input.startAt,
      end_at: input.endAt || null,
    }),
    buildUpdatePayload: (input) => ({
      workspace_id: input.workspaceId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      start_at: input.startAt,
      end_at: input.endAt || null,
    }),
    readStartAt: (row) => pickString(row.start_at),
    readEndAt: (row) => pickString(row.end_at) || null,
  },
  {
    name: "datetime/end_datetime",
    selectColumns: "id,workspace_id,created_by,title,description,datetime,end_datetime",
    orderColumn: "datetime",
    buildInsertPayload: (input, userId) => ({
      workspace_id: input.workspaceId,
      created_by: userId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      datetime: input.startAt,
      end_datetime: input.endAt || null,
    }),
    buildUpdatePayload: (input) => ({
      workspace_id: input.workspaceId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      datetime: input.startAt,
      end_datetime: input.endAt || null,
    }),
    readStartAt: (row) => pickString(row.datetime),
    readEndAt: (row) => pickString(row.end_datetime) || null,
  },
  {
    name: "start_time/end_time",
    selectColumns: "id,workspace_id,created_by,title,description,start_time,end_time",
    orderColumn: "start_time",
    buildInsertPayload: (input, userId) => ({
      workspace_id: input.workspaceId,
      created_by: userId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      start_time: toTimeOnly(input.startAt),
      end_time: input.endAt ? toTimeOnly(input.endAt) : null,
    }),
    buildUpdatePayload: (input) => ({
      workspace_id: input.workspaceId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      start_time: toTimeOnly(input.startAt),
      end_time: input.endAt ? toTimeOnly(input.endAt) : null,
    }),
    readStartAt: (row) =>
      combineDateAndTime(new Date().toISOString().slice(0, 10), row.start_time) ?? "",
    readEndAt: (row) => combineDateAndTime(new Date().toISOString().slice(0, 10), row.end_time),
  },
]

let cachedCalendarSchema: CalendarSchemaConfig | null = null

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return ""
}

function toDateOnly(value: string) {
  const normalized = normalizeLocalDateTime(value)
  return normalized ? normalized.slice(0, 10) : ""
}

function toTimeOnly(value: string) {
  const normalized = normalizeLocalDateTime(value)
  return normalized ? `${normalized.slice(11, 16)}:00` : ""
}

function combineDateAndTime(dateValue: unknown, timeValue: unknown) {
  const date = pickString(dateValue)
  const time = pickString(timeValue)
  if (!date || !time) return null
  return `${date}T${time}`
}

function normalizeLocalDateTime(value: string) {
  const trimmed = value.trim()
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?$/)
  if (!match) return ""
  return `${match[1]}T${match[2]}:00`
}

function isMissingColumnError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String(error.message)
        : ""

  const lower = message.toLowerCase()
  return lower.includes("column") || lower.includes("schema cache")
}

async function getAuthenticatedUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error("Usuario nao autenticado.")
  }

  return user.id
}

/**
 * Busca linhas em workspace_members testando colunas de vínculo ao utilizador.
 * Importante: não parar na primeira coluna que *existe* — antes parávamos com
 * resultado vazio quando o ID do auth estava noutra coluna (ex.: user_id vs profile_id).
 * Ordem: user_id (auth) primeiro, depois profile_id e member_id.
 */
async function fetchWorkspaceMemberRows(userId: string): Promise<WorkspaceMemberRow[]> {
  const memberColumns = ["user_id", "profile_id", "member_id"]
  const byWorkspaceId = new Map<string, WorkspaceMemberRow>()
  let anyQuerySucceeded = false
  let lastError: Error | null = null

  for (const memberColumn of memberColumns) {
    const { data, error } = await supabase
      .from("workspace_members")
      .select("*")
      .eq(memberColumn, userId)

    if (!error) {
      anyQuerySucceeded = true
      for (const row of (data ?? []) as WorkspaceMemberRow[]) {
        const wid = pickString(row.workspace_id)
        if (wid) byWorkspaceId.set(wid, row)
      }
      continue
    }

    if (!isMissingColumnError(error)) {
      throw new Error(error.message)
    }

    lastError = new Error(error.message)
  }

  if (!anyQuerySucceeded) {
    throw lastError ?? new Error("Nao foi possivel verificar os workspaces do usuario.")
  }

  return [...byWorkspaceId.values()]
}

/** Workspaces criados pelo utilizador (ex.: conta sem linha em workspace_members). */
async function fetchWorkspacesCreatedByUser(userId: string): Promise<WorkspaceRow[]> {
  try {
    const { data, error } = await supabase
      .from("workspaces")
      .select(WORKSPACES_LIST_COLUMNS)
      .eq("created_by", userId)

    if (error) return []
    return (data ?? []) as WorkspaceRow[]
  } catch {
    return []
  }
}

/** Linhas que as políticas RLS deixam ver (ex.: leitura ampla para authenticated), sem filtrar por coluna. */
async function fetchWorkspacesVisibleUnderRls(): Promise<WorkspaceRow[]> {
  try {
    const { data, error } = await supabase
      .from("workspaces")
      .select(WORKSPACES_LIST_COLUMNS)
      .limit(50)

    if (error) return []
    return (data ?? []) as WorkspaceRow[]
  } catch {
    return []
  }
}

async function fetchWorkspaceLabels(workspaceIds: string[]) {
  if (workspaceIds.length === 0) return new Map<string, string>()

  try {
    const { data, error } = await supabase
      .from("workspaces")
      .select(WORKSPACES_LIST_COLUMNS)
      .in("id", workspaceIds)

    if (error) throw new Error(error.message)

    const rows = (data ?? []) as WorkspaceRow[]
    return new Map(
      rows.map((row) => [
        String(row.id),
        pickString(row.name, row.title, row.slug) || "",
      ]),
    )
  } catch {
    return new Map<string, string>()
  }
}

async function detectCalendarSchema() {
  if (cachedCalendarSchema) return cachedCalendarSchema

  let lastError: Error | null = null

  for (const candidate of CALENDAR_SCHEMA_CANDIDATES) {
    const { error } = await supabase
      .from("calendar_events")
      .select(candidate.selectColumns)
      .limit(1)

    if (!error) {
      cachedCalendarSchema = candidate
      return candidate
    }

    if (!isMissingColumnError(error)) {
      throw new Error(error.message)
    }

    lastError = new Error(error.message)
  }

  throw (
    lastError ??
    new Error(
      "Nao foi possivel identificar as colunas de data em calendar_events. Ajuste o schema esperado no frontend.",
    )
  )
}

function mapCalendarEventRow(row: CalendarEventDbRow, schema: CalendarSchemaConfig): CalendarEventRecord {
  const id = pickString(row.id)
  const workspaceId = pickString(row.workspace_id)
  const createdBy = pickString(row.created_by)
  const title = pickString(row.title, row.name)
  const description = pickString(row.description, row.details) || null
  const startAt = schema.readStartAt(row)
  const endAt = schema.readEndAt(row)

  if (!id || !workspaceId || !createdBy || !title || !startAt) {
    throw new Error("A tabela calendar_events retornou dados incompletos.")
  }

  return {
    id,
    workspaceId,
    createdBy,
    title,
    description,
    startAt,
    endAt,
  }
}

/**
 * Workspaces via API Next + service role (ignora RLS). Requer SUPABASE_SERVICE_ROLE_KEY no .env do servidor.
 */
async function fetchWorkspacesFromServerRoute(): Promise<WorkspaceOption[] | null> {
  if (typeof window === "undefined") return null

  try {
    let {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.access_token) {
      await supabase.auth.refreshSession()
      ;({
        data: { session },
      } = await supabase.auth.getSession())
    }
    const token = session?.access_token
    if (!token) return null

    const res = await fetch("/api/calendar/workspaces", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    if (res.status === 503) return null
    if (!res.ok) return null

    const json = (await res.json()) as { workspaces?: WorkspaceOption[] }
    if (!Array.isArray(json.workspaces)) return null
    return json.workspaces
  } catch {
    return null
  }
}

async function collectCalendarWorkspacesFromSupabaseClient(userId: string): Promise<WorkspaceOption[]> {
  let memberRows: WorkspaceMemberRow[] = []
  try {
    memberRows = await fetchWorkspaceMemberRows(userId)
  } catch {
    /* Sem workspace_members ou RLS a bloquear */
  }

  const createdRows = await fetchWorkspacesCreatedByUser(userId)

  const workspaceIdSet = new Set<string>()
  for (const row of memberRows) {
    const wid = pickString(row.workspace_id)
    if (wid) workspaceIdSet.add(wid)
  }
  for (const row of createdRows) {
    const id = pickString(row.id)
    if (id) workspaceIdSet.add(id)
  }

  let rlsVisibleRows: WorkspaceRow[] = []
  if (workspaceIdSet.size === 0) {
    rlsVisibleRows = await fetchWorkspacesVisibleUnderRls()
    for (const row of rlsVisibleRows) {
      const id = pickString(row.id)
      if (id) workspaceIdSet.add(id)
    }
  }

  const workspaceIds = [...workspaceIdSet]

  const labelsByWorkspaceId = await fetchWorkspaceLabels(workspaceIds)

  return workspaceIds.map((workspaceId, index) => {
    const memberRow = memberRows.find((row) => pickString(row.workspace_id) === workspaceId)
    const createdRow =
      createdRows.find((row) => pickString(row.id) === workspaceId) ||
      rlsVisibleRows.find((row) => pickString(row.id) === workspaceId)

    return {
      id: workspaceId,
      label:
        labelsByWorkspaceId.get(workspaceId) ||
        pickString(createdRow?.name, createdRow?.title, createdRow?.slug) ||
        pickString(
          memberRow?.workspace_name,
          memberRow?.workspace_title,
          memberRow?.name,
          memberRow?.title,
        ) ||
        (workspaceIds.length === 1 ? "Workspace Geral" : `Workspace ${index + 1}`),
    }
  })
}

export async function fetchCalendarAccess() {
  const userId = await getAuthenticatedUserId()

  const fromServer = await fetchWorkspacesFromServerRoute()
  const fromClient = await collectCalendarWorkspacesFromSupabaseClient(userId)

  const byId = new Map<string, WorkspaceOption>()
  for (const w of fromServer ?? []) {
    if (w.id) byId.set(w.id, w)
  }
  for (const w of fromClient) {
    if (!byId.has(w.id)) byId.set(w.id, w)
  }

  const workspaces = [...byId.values()]

  return {
    userId,
    workspaces,
    defaultWorkspaceId: workspaces[0]?.id ?? null,
  }
}

export async function fetchCalendarEvents(workspaceIds: string[]) {
  if (workspaceIds.length === 0) return []

  const schema = await detectCalendarSchema()
  const { data, error } = await supabase
    .from("calendar_events")
    .select(schema.selectColumns)
    .in("workspace_id", workspaceIds)
    .order(schema.orderColumn, { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  const rows = (data ?? []) as unknown as CalendarEventDbRow[]
  return rows.map((row) => mapCalendarEventRow(row, schema))
}

export async function createCalendarEvent(input: CalendarEventInput) {
  const userId = await getAuthenticatedUserId()
  const schema = await detectCalendarSchema()

  const { data, error } = await supabase
    .from("calendar_events")
    .insert(schema.buildInsertPayload(input, userId))
    .select(schema.selectColumns)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return mapCalendarEventRow(data as unknown as CalendarEventDbRow, schema)
}

export async function updateCalendarEvent(eventId: string, input: CalendarEventInput) {
  const schema = await detectCalendarSchema()
  const { data, error } = await supabase
    .from("calendar_events")
    .update(schema.buildUpdatePayload(input))
    .eq("id", eventId)
    .select(schema.selectColumns)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return mapCalendarEventRow(data as unknown as CalendarEventDbRow, schema)
}

export async function deleteCalendarEvent(eventId: string) {
  const { error } = await supabase.from("calendar_events").delete().eq("id", eventId)

  if (error) {
    throw new Error(error.message)
  }
}

export function formatEventTimeRange(startAt: string, endAt: string | null) {
  const start = new Date(startAt)
  if (!Number.isFinite(start.getTime())) return ""

  const startLabel = format(start, "HH:mm")
  if (!endAt) return startLabel

  const end = new Date(endAt)
  if (!Number.isFinite(end.getTime())) return startLabel

  return `${startLabel} - ${format(end, "HH:mm")}`
}
