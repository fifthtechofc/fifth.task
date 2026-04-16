import { format } from "date-fns"

import { getTeamMembers } from "@/lib/profile"
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
  isMeeting: boolean
  meetingLink: string | null
  startAt: string
  endAt: string | null
  assignees: CalendarEventAssignee[]
}

export type CalendarEventInput = {
  workspaceId: string
  title: string
  description?: string
  isMeeting?: boolean
  meetingLink?: string | null
  startAt: string
  endAt?: string | null
  assigneeIds?: string[]
}

export type CalendarEventAssignee = {
  id: string
  name: string
  imageSrc: string
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

type CalendarEventAssigneeRow = {
  event_id: string
  user_id?: string | null
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
      description: buildCalendarDescription(input),
      event_date: toDateOnly(input.startAt),
      start_time: toTimeOnly(input.startAt),
      end_time: input.endAt ? toTimeOnly(input.endAt) : null,
    }),
    buildUpdatePayload: (input) => ({
      workspace_id: input.workspaceId,
      title: input.title.trim(),
      description: buildCalendarDescription(input),
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
      description: buildCalendarDescription(input),
      date: toDateOnly(input.startAt),
      start_time: toTimeOnly(input.startAt),
      end_time: input.endAt ? toTimeOnly(input.endAt) : null,
    }),
    buildUpdatePayload: (input) => ({
      workspace_id: input.workspaceId,
      title: input.title.trim(),
      description: buildCalendarDescription(input),
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
      description: buildCalendarDescription(input),
      start_at: input.startAt,
      end_at: input.endAt || null,
    }),
    buildUpdatePayload: (input) => ({
      workspace_id: input.workspaceId,
      title: input.title.trim(),
      description: buildCalendarDescription(input),
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
      description: buildCalendarDescription(input),
      datetime: input.startAt,
      end_datetime: input.endAt || null,
    }),
    buildUpdatePayload: (input) => ({
      workspace_id: input.workspaceId,
      title: input.title.trim(),
      description: buildCalendarDescription(input),
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
      description: buildCalendarDescription(input),
      start_time: toTimeOnly(input.startAt),
      end_time: input.endAt ? toTimeOnly(input.endAt) : null,
    }),
    buildUpdatePayload: (input) => ({
      workspace_id: input.workspaceId,
      title: input.title.trim(),
      description: buildCalendarDescription(input),
      start_time: toTimeOnly(input.startAt),
      end_time: input.endAt ? toTimeOnly(input.endAt) : null,
    }),
    readStartAt: (row) =>
      combineDateAndTime(new Date().toISOString().slice(0, 10), row.start_time) ?? "",
    readEndAt: (row) => combineDateAndTime(new Date().toISOString().slice(0, 10), row.end_time),
  },
]

let cachedCalendarSchema: CalendarSchemaConfig | null = null
const CALENDAR_META_PREFIX = "FTMETA:"

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return ""
}

function uniqueIds(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
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

type CalendarDescriptionMeta = {
  description: string | null
  isMeeting: boolean
  meetingLink: string | null
}

export function parseCalendarDescription(raw: string | null | undefined): CalendarDescriptionMeta {
  const value = pickString(raw)
  if (!value) {
    return { description: null, isMeeting: false, meetingLink: null }
  }

  const [firstLine, ...rest] = value.split(/\r?\n/)
  if (!firstLine.startsWith(CALENDAR_META_PREFIX)) {
    return { description: value, isMeeting: false, meetingLink: null }
  }

  try {
    const meta = JSON.parse(firstLine.slice(CALENDAR_META_PREFIX.length)) as {
      isMeeting?: boolean
      meetingLink?: string | null
    }
    const description = rest.join("\n").trim() || null
    return {
      description,
      isMeeting: Boolean(meta.isMeeting),
      meetingLink: pickString(meta.meetingLink) || null,
    }
  } catch {
    return { description: value, isMeeting: false, meetingLink: null }
  }
}

export function buildCalendarDescription(input: {
  description?: string | null
  isMeeting?: boolean
  meetingLink?: string | null
}) {
  const description = pickString(input.description) || null
  const isMeeting = Boolean(input.isMeeting)
  const meetingLink = pickString(input.meetingLink) || null

  if (!isMeeting && !meetingLink) {
    return description
  }

  const meta = `${CALENDAR_META_PREFIX}${JSON.stringify({
    isMeeting,
    meetingLink,
  })}`

  return description ? `${meta}\n${description}` : meta
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

function isMissingTableError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String(error.message)
        : ""

  const lower = message.toLowerCase()
  return (
    lower.includes("does not exist") ||
    lower.includes("not found") ||
    lower.includes("schema cache") ||
    lower.includes("could not find the table")
  )
}

function isAuthLockAbort(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String(error.message)
        : String(error ?? "")
  return message.includes("AbortError") || message.includes("steal")
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function getSessionSnapshot() {
  let lastError: unknown = null

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      return data.session ?? null
    } catch (error) {
      lastError = error
      if (!isAuthLockAbort(error) || attempt === 1) break
      await sleep(120)
    }
  }

  if (lastError) {
    throw lastError instanceof Error ? lastError : new Error(String(lastError))
  }

  return null
}

async function getAuthenticatedUserId() {
  const session = await getSessionSnapshot()
  const userId = session?.user?.id?.trim()

  if (!userId) {
    throw new Error("Usuário não autenticado.")
  }

  return userId
}

async function fetchProfilesMap(profileIds: string[]) {
  const ids = uniqueIds(profileIds)
  if (ids.length === 0) return new Map<string, CalendarEventAssignee>()

  const profilesById = new Map<string, CalendarEventAssignee>()

  try {
    const teamMembers = await getTeamMembers()
    for (const member of teamMembers) {
      if (!ids.includes(member.id)) continue
      profilesById.set(member.id, {
        id: member.id,
        name: member.name,
        imageSrc: member.imageSrc || "",
      })
    }
  } catch {
    // ignore and fallback to plain profiles below
  }

  const missingIds = ids.filter((id) => !profilesById.has(id))
  if (missingIds.length === 0) return profilesById

  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,display_name,email,avatar_url")
    .in("id", missingIds)

  if (error) return profilesById

  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const id = pickString(row.id)
    if (!id) continue
    profilesById.set(id, {
      id,
      name: pickString(row.full_name, row.display_name, row.email, "Sem nome"),
      imageSrc: pickString(row.avatar_url),
    })
  }

  return profilesById
}

async function fetchCalendarEventAssigneeIds(eventIds: string[]) {
  const ids = uniqueIds(eventIds)
  const result: Record<string, string[]> = {}
  if (ids.length === 0) return result

  try {
    const { data, error } = await supabase
      .from("calendar_event_assignees")
      .select("event_id,user_id")
      .in("event_id", ids)

    if (error) {
      if (isMissingColumnError(error) || isMissingTableError(error)) return result
      return result
    }

    for (const row of (data ?? []) as CalendarEventAssigneeRow[]) {
      const eventId = pickString(row.event_id)
      const assigneeId = pickString(row.user_id)
      if (!eventId || !assigneeId) continue
      if (!result[eventId]) result[eventId] = []
      result[eventId].push(assigneeId)
    }
  } catch {
    // ignore
  }

  return result
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
    throw lastError ?? new Error("Não foi possível verificar os workspaces do usuário.")
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
      "Não foi possível identificar as colunas de data em calendar_events. Ajuste o schema esperado no frontend.",
    )
  )
}

function mapCalendarEventRow(row: CalendarEventDbRow, schema: CalendarSchemaConfig): CalendarEventRecord {
  const id = pickString(row.id)
  const workspaceId = pickString(row.workspace_id)
  const createdBy = pickString(row.created_by)
  const title = pickString(row.title, row.name)
  const parsedDescription = parseCalendarDescription(pickString(row.description, row.details) || null)
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
    description: parsedDescription.description,
    isMeeting: parsedDescription.isMeeting,
    meetingLink: parsedDescription.meetingLink,
    startAt,
    endAt,
    assignees: [],
  }
}

/**
 * Workspaces via API Next + service role (ignora RLS). Requer SUPABASE_SERVICE_ROLE_KEY no .env do servidor.
 */
async function fetchWorkspacesFromServerRoute(): Promise<WorkspaceOption[] | null> {
  if (typeof window === "undefined") return null

  try {
    const session = await getSessionSnapshot()
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

export async function fetchCalendarWorkspaceMembers(workspaceIds: string[]) {
  const ids = uniqueIds(workspaceIds)
  const membersByWorkspaceId: Record<string, CalendarEventAssignee[]> = {}
  if (ids.length === 0) return membersByWorkspaceId

  const teamMembers = await getTeamMembers()
  const teamAssignees = teamMembers.map((member) => ({
    id: member.id,
    name: member.name,
    imageSrc: member.imageSrc || "",
  }))

  for (const workspaceId of ids) {
    membersByWorkspaceId[workspaceId] = teamAssignees
  }

  return membersByWorkspaceId
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
  const events = rows.map((row) => mapCalendarEventRow(row, schema))
  const assigneeIdsByEventId = await fetchCalendarEventAssigneeIds(events.map((event) => event.id))
  const allAssigneeIds = uniqueIds(Object.values(assigneeIdsByEventId).flat())
  const profilesById = await fetchProfilesMap(allAssigneeIds)

  return events.map((event) => ({
    ...event,
    assignees: (assigneeIdsByEventId[event.id] ?? [])
      .map((assigneeId) => profilesById.get(assigneeId))
      .filter(Boolean) as CalendarEventAssignee[],
  }))
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

  const created = mapCalendarEventRow(data as unknown as CalendarEventDbRow, schema)
  await setCalendarEventAssignees({
    eventId: created.id,
    userIds: input.assigneeIds ?? [],
  })

  const profilesById = await fetchProfilesMap(input.assigneeIds ?? [])
  return {
    ...created,
    assignees: uniqueIds(input.assigneeIds ?? [])
      .map((assigneeId) => profilesById.get(assigneeId))
      .filter(Boolean) as CalendarEventAssignee[],
  }
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

  const updated = mapCalendarEventRow(data as unknown as CalendarEventDbRow, schema)
  await setCalendarEventAssignees({
    eventId,
    userIds: input.assigneeIds ?? [],
  })

  const profilesById = await fetchProfilesMap(input.assigneeIds ?? [])
  return {
    ...updated,
    assignees: uniqueIds(input.assigneeIds ?? [])
      .map((assigneeId) => profilesById.get(assigneeId))
      .filter(Boolean) as CalendarEventAssignee[],
  }
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

export async function setCalendarEventAssignees(params: { eventId: string; userIds: string[] }) {
  const uniqueUserIds = uniqueIds(params.userIds)

  try {
    const { error: deleteError } = await supabase
      .from("calendar_event_assignees")
      .delete()
      .eq("event_id", params.eventId)

    if (deleteError && !isMissingTableError(deleteError)) {
      throw new Error(deleteError.message)
    }

    if (uniqueUserIds.length === 0) return

    const payload = uniqueUserIds.map((userId) => ({
      event_id: params.eventId,
      user_id: userId,
    }))

    const { error } = await supabase.from("calendar_event_assignees").insert(payload)
    if (error) {
      throw new Error(error.message)
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao salvar participantes do evento."
    throw new Error(
      `${message}\n\nVerifique se a tabela 'calendar_event_assignees' usa as colunas event_id e user_id e se as policies/RLS permitem insert/delete.`,
    )
  }
}
