import { supabase } from "@/lib/supabase"
import type {
  ColumnType,
  KanbanAssignee,
  KanbanChecklistItem,
  KanbanColumn,
  KanbanTask,
} from "@/types/kanban"

type BoardRow = {
  id: string
  title: string
  description: string | null
  created_by: string
}

export async function fetchBoards(): Promise<BoardRow[]> {
  // Prefer ordering by created_at if it exists; otherwise default order.
  try {
    const { data, error } = await supabase
      .from("boards")
      .select("id,title,description,created_by")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .order("created_at" as any, { ascending: false })

    if (error) throw new Error(error.message)
    return (data ?? []) as BoardRow[]
  } catch {
    const { data, error } = await supabase
      .from("boards")
      .select("id,title,description,created_by")

    if (error) throw new Error(error.message)
    return (data ?? []) as BoardRow[]
  }
}

type ColumnRow = {
  id: string
  board_id: string
  title: string
  position: number
}

type CardRow = {
  id: string
  board_id: string
  column_id: string
  title: string
  description: string | null
  position: number
  created_by: string
  assigned_to: string | null
  updated_at?: string | null
}

type CardAssigneeRow = {
  card_id: string
  profile_id: string
}

type CardTaskRow = {
  id: string
  card_id: string
  title: string
  position: number
}

function mapColumnTypeFromTitle(title: string): ColumnType {
  const t = title.trim().toLowerCase()
  if (t === "backlog") return "backlog"
  if (t === "to do" || t === "todo") return "todo"
  if (t === "in progress" || t === "in-progress") return "in-progress"
  if (t === "review") return "review"
  if (t === "done") return "done"
  return "custom"
}

export async function getOrCreateBoardByTitle(params: {
  title: string
  description?: string
  createdBy: string
}): Promise<BoardRow> {
  const title = params.title.trim()
  const { data: existing, error: findError } = await supabase
    .from("boards")
    .select("id,title,description,created_by")
    .eq("title", title)
    .limit(1)

  if (findError) throw new Error(findError.message)
  const first = (existing ?? [])[0] as BoardRow | undefined
  if (first) return first

  const { data, error } = await supabase
    .from("boards")
    .insert({
      title,
      description: params.description?.trim() || null,
      created_by: params.createdBy,
    })
    .select("id,title,description,created_by")
    .single()

  if (error) throw new Error(error.message)
  return data as BoardRow
}

export async function createBoard(params: {
  title: string
  description?: string
  createdBy: string
}): Promise<BoardRow> {
  const { data, error } = await supabase
    .from("boards")
    .insert({
      title: params.title.trim(),
      description: params.description?.trim() || null,
      created_by: params.createdBy,
    })
    .select("id,title,description,created_by")
    .single()

  if (error) throw new Error(error.message)
  return data as BoardRow
}

export async function fetchBoardColumns(boardId: string): Promise<ColumnRow[]> {
  const { data, error } = await supabase
    .from("board_columns")
    .select("id,board_id,title,position")
    .eq("board_id", boardId)
    .order("position", { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as ColumnRow[]
}

export async function fetchBoardCards(boardId: string): Promise<CardRow[]> {
  const { data, error } = await supabase
    .from("board_cards")
    .select("id,board_id,column_id,title,description,position,created_by,assigned_to,updated_at")
    .eq("board_id", boardId)
    .order("position", { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as CardRow[]
}

export async function fetchCardChecklist(cardId: string): Promise<CardTaskRow[]> {
  const { data, error } = await supabase
    .from("card_tasks")
    .select("id,card_id,title,position")
    .eq("card_id", cardId)
    .order("position", { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as CardTaskRow[]
}

export function buildKanbanColumns(params: {
  columns: ColumnRow[]
  cards: CardRow[]
  checklistsByCardId?: Record<string, CardTaskRow[]>
  assigneesById?: Record<string, KanbanAssignee>
  assigneeIdsByCardId?: Record<string, string[]>
}): KanbanColumn[] {
  const {
    columns,
    cards,
    checklistsByCardId = {},
    assigneesById = {},
    assigneeIdsByCardId = {},
  } = params

  const tasksByColumn = new Map<string, KanbanTask[]>()
  for (const card of cards) {
    const list = tasksByColumn.get(card.column_id) ?? []
    const checklistRows = checklistsByCardId[card.id] ?? []
    const checklist: KanbanChecklistItem[] = checklistRows.map((r) => ({
      id: r.id,
      title: r.title,
      position: r.position,
    }))

    const ids = assigneeIdsByCardId[card.id] ?? (card.assigned_to ? [card.assigned_to] : [])
    const assignees = ids.map((id) => assigneesById[id]).filter(Boolean)

    list.push({
      id: card.id,
      title: card.title,
      description: card.description ?? undefined,
      position: card.position,
      assignees: assignees.length > 0 ? assignees : undefined,
      checklist,
      labels: [],
    })
    tasksByColumn.set(card.column_id, list)
  }

  return columns.map((c) => ({
    id: c.id,
    title: c.title,
    type: mapColumnTypeFromTitle(c.title),
    position: c.position,
    tasks: tasksByColumn.get(c.id) ?? [],
  }))
}

export async function createBoardColumn(params: {
  boardId: string
  title: string
  position: number
}): Promise<ColumnRow> {
  const { data, error } = await supabase
    .from("board_columns")
    .insert({
      board_id: params.boardId,
      title: params.title.trim(),
      position: params.position,
    })
    .select("id,board_id,title,position")
    .single()

  if (error) throw new Error(error.message)
  return data as ColumnRow
}

export async function updateBoardColumnsPositions(params: {
  updates: Array<{ id: string; position: number }>
}) {
  const { error } = await supabase.from("board_columns").upsert(params.updates, { onConflict: "id" })
  if (error) throw new Error(error.message)
}

export async function createBoardCard(params: {
  boardId: string
  columnId: string
  title: string
  description?: string
  position: number
  createdBy: string
  assignedTo?: string | null
}): Promise<CardRow> {
  const { data, error } = await supabase
    .from("board_cards")
    .insert({
      board_id: params.boardId,
      column_id: params.columnId,
      title: params.title.trim(),
      description: params.description?.trim() || null,
      position: params.position,
      created_by: params.createdBy,
      assigned_to: params.assignedTo ?? null,
    })
    .select("id,board_id,column_id,title,description,position,created_by,assigned_to,updated_at")
    .single()

  if (error) throw new Error(error.message)
  return data as CardRow
}

export async function updateBoardCard(params: {
  id: string
  title: string
  description?: string
  assignedTo?: string | null
}): Promise<void> {
  const { error } = await supabase
    .from("board_cards")
    .update({
      title: params.title.trim(),
      description: params.description?.trim() || null,
      assigned_to: params.assignedTo ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)

  if (error) throw new Error(error.message)
}

export async function fetchCardAssignees(cardIds: string[]): Promise<Record<string, string[]>> {
  if (cardIds.length === 0) return {}

  try {
    const { data, error } = await supabase
      .from("card_assignees")
      .select("card_id,profile_id")
      .in("card_id", cardIds)

    if (error) throw new Error(error.message)
    const rows = (data ?? []) as CardAssigneeRow[]

    const map: Record<string, string[]> = {}
    for (const r of rows) {
      if (!map[r.card_id]) map[r.card_id] = []
      map[r.card_id].push(r.profile_id)
    }
    return map
  } catch {
    // Table not available (or RLS) — caller can fall back to board_cards.assigned_to.
    return {}
  }
}

export async function setCardAssignees(params: { cardId: string; userIds: string[] }) {
  try {
    const { error: delError } = await supabase
      .from("card_assignees")
      .delete()
      .eq("card_id", params.cardId)
    if (delError) throw new Error(delError.message)

    const rows = params.userIds.map((userId) => ({
      card_id: params.cardId,
      profile_id: userId,
    }))

    if (rows.length === 0) return
    const { error: insError } = await supabase.from("card_assignees").insert(rows)
    if (insError) throw new Error(insError.message)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao salvar responsáveis."
    throw new Error(
      `${msg}\n\nPara multi-assign funcionar, crie a tabela 'card_assignees' (card_id, profile_id) e libere as policies/RLS.`,
    )
  }
}

export async function removeBoardCard(cardId: string) {
  const { error } = await supabase.from("board_cards").delete().eq("id", cardId)
  if (error) throw new Error(error.message)
}

export async function removeBoardColumn(columnId: string) {
  const { error } = await supabase.from("board_columns").delete().eq("id", columnId)
  if (error) throw new Error(error.message)
}

export async function moveBoardCard(params: {
  id: string
  columnId: string
  position: number
}): Promise<void> {
  const { error } = await supabase
    .from("board_cards")
    .update({
      column_id: params.columnId,
      position: params.position,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)

  if (error) throw new Error(error.message)
}

export async function updateColumnTitle(params: { id: string; title: string }) {
  const { error } = await supabase.from("board_columns").update({ title: params.title.trim() }).eq("id", params.id)
  if (error) throw new Error(error.message)
}

export async function createChecklistItem(params: {
  cardId: string
  title: string
  position: number
}): Promise<CardTaskRow> {
  const { data, error } = await supabase
    .from("card_tasks")
    .insert({
      card_id: params.cardId,
      title: params.title.trim(),
      position: params.position,
    })
    .select("id,card_id,title,position")
    .single()

  if (error) throw new Error(error.message)
  return data as CardTaskRow
}

