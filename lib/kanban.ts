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
  created_at?: string | null
  background_color: string | null
  logo_url: string | null
}

export function slugifyBoardTitle(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

export function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  )
}

export function getBoardDisplayTitle(title: string | null | undefined) {
  const normalized = title?.trim() ?? ""
  if (!normalized) return "Quadro sem nome"
  if (isUuidLike(normalized)) return "Quadro sem nome"
  return normalized
}

export async function fetchBoards(): Promise<BoardRow[]> {
  // Prefer ordering by created_at if it exists; otherwise default order.
  try {
    const { data, error } = await supabase
      .from("boards")
      .select(
        "id,title,description,created_by,created_at,background_color,logo_url",
      )
      .order("created_at" as any, { ascending: false })

    if (error) throw new Error(error.message)
    return (data ?? []) as BoardRow[]
  } catch {
    const { data, error } = await supabase
      .from("boards")
      .select(
        "id,title,description,created_by,created_at,background_color,logo_url",
      )

    if (error) throw new Error(error.message)
    return (data ?? []) as BoardRow[]
  }
}

export async function fetchBoardById(
  boardId: string,
): Promise<BoardRow | null> {
  const { data, error } = await supabase
    .from("boards")
    .select(
      "id,title,description,created_by,created_at,background_color,logo_url",
    )
    .eq("id", boardId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data as BoardRow | null) ?? null
}

export async function fetchBoardBySlug(slug: string): Promise<BoardRow | null> {
  const boards = await fetchBoards()
  return boards.find((board) => slugifyBoardTitle(board.title) === slug) ?? null
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

/** Usado para cor padrão da coluna; o nome exibido é sempre o que o usuário digitou. */
export function inferColumnTypeFromTitle(title: string): ColumnType {
  const t = title.trim().toLowerCase()
  if (t === "backlog") return "backlog"
  if (
    t === "to do" ||
    t === "todo" ||
    t === "a fazer" ||
    t === "afazer" ||
    t === "por fazer" ||
    t === "pendente" ||
    t === "pendentes"
  ) {
    return "todo"
  }
  if (
    t === "in progress" ||
    t === "in-progress" ||
    t === "doing" ||
    t === "em andamento" ||
    t === "em progresso" ||
    t === "fazendo" ||
    t === "andamento"
  ) {
    return "in-progress"
  }
  if (
    t === "review" ||
    t === "revisão" ||
    t === "revisao" ||
    t === "code review"
  )
    return "review"
  if (
    t === "done" ||
    t === "concluído" ||
    t === "concluido" ||
    t === "feito" ||
    t === "finalizado" ||
    t === "entregue"
  ) {
    return "done"
  }
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
    .select(
      "id,title,description,created_by,created_at,background_color,logo_url",
    )
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
    .select(
      "id,title,description,created_by,created_at,background_color,logo_url",
    )
    .single()

  if (error) throw new Error(error.message)
  return data as BoardRow
}

export async function createBoard(params: {
  title: string
  description?: string
  createdBy: string
  backgroundColor?: string
}): Promise<BoardRow> {
  const { data, error } = await supabase
    .from("boards")
    .insert({
      title: params.title.trim(),
      description: params.description?.trim() || null,
      created_by: params.createdBy,
      background_color: params.backgroundColor ?? null,
    })
    .select("id,title,description,created_by,background_color,logo_url")
    .single()

  if (error) throw new Error(error.message)
  return data as BoardRow
}

export async function updateBoard(params: {
  id: string
  title?: string
  description?: string | null
  backgroundColor?: string | null
  logoUrl?: string | null
}): Promise<BoardRow> {
  const payload: Partial<BoardRow> & { background_color?: string | null } = {}
  if (params.title !== undefined) payload.title = params.title.trim()
  if (params.description !== undefined)
    payload.description = params.description?.trim() || null
  if (params.backgroundColor !== undefined)
    payload.background_color = params.backgroundColor
  if (params.logoUrl !== undefined) payload.logo_url = params.logoUrl

  const { data, error } = await supabase
    .from("boards")
    .update(payload)
    .eq("id", params.id)
    .select("id,title,description,created_by,background_color,logo_url")
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
    .select(
      "id,board_id,column_id,title,description,position,created_by,assigned_to,updated_at",
    )
    .eq("board_id", boardId)
    .order("position", { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as CardRow[]
}

export async function fetchCardChecklist(
  cardId: string,
): Promise<CardTaskRow[]> {
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

    const ids =
      assigneeIdsByCardId[card.id] ??
      (card.assigned_to ? [card.assigned_to] : [])
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
    type: inferColumnTypeFromTitle(c.title),
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
  // Usamos UPDATE simples em vez de UPSERT para evitar inserts com board_id nulo.
  const { error } = await supabase.from("board_columns").update(
    params.updates.reduce<Record<string, number>>((acc, _curr) => {
      // esse objeto é ignorado, pois usamos .eq por id em cada chamada abaixo
      return acc
    }, {}),
  )

  // Como o update em lote acima não funciona bem com diferentes posições por linha,
  // aplicamos as atualizações individualmente para cada coluna.
  if (error) {
    // fallback: atualizar uma a uma
    for (const u of params.updates) {
      const { error: updateError } = await supabase
        .from("board_columns")
        .update({ position: u.position })
        .eq("id", u.id)
      if (updateError) throw new Error(updateError.message)
    }
    return
  }
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
    .select(
      "id,board_id,column_id,title,description,position,created_by,assigned_to,updated_at",
    )
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

export async function fetchCardAssignees(
  cardIds: string[],
): Promise<Record<string, string[]>> {
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

export async function setCardAssignees(params: {
  cardId: string
  userIds: string[]
}) {
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
    const { error: insError } = await supabase
      .from("card_assignees")
      .insert(rows)
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
  const { error } = await supabase
    .from("board_columns")
    .delete()
    .eq("id", columnId)
  if (error) throw new Error(error.message)
}

export async function removeBoard(boardId: string) {
  // Remove um quadro inteiro e todos os dados relacionados.
  // Assumimos as seguintes relações:
  // - board_cards.board_id -> boards.id
  // - board_columns.board_id -> boards.id
  // - card_tasks.card_id -> board_cards.id
  // - card_assignees.card_id -> board_cards.id

  // 1) Buscar todos os cards do board
  const { data: cardRows, error: cardsError } = await supabase
    .from("board_cards")
    .select("id")
    .eq("board_id", boardId)

  if (cardsError) throw new Error(cardsError.message)

  const cardIds = (cardRows ?? []).map((c) => c.id as string)

  // 2) Apagar tarefas de checklist ligadas aos cards
  if (cardIds.length > 0) {
    const { error: tasksError } = await supabase
      .from("card_tasks")
      .delete()
      .in("card_id", cardIds)
    if (tasksError && tasksError.code !== "PGRST116") {
      // PGRST116 = no rows to delete; ignoramos
      throw new Error(tasksError.message)
    }

    // 3) Apagar responsáveis (card_assignees)
    const { error: assigneesError } = await supabase
      .from("card_assignees")
      .delete()
      .in("card_id", cardIds)
    if (assigneesError && assigneesError.code !== "PGRST116") {
      throw new Error(assigneesError.message)
    }
  }

  // 4) Apagar cards do board
  const { error: deleteCardsError } = await supabase
    .from("board_cards")
    .delete()
    .eq("board_id", boardId)
  if (deleteCardsError && deleteCardsError.code !== "PGRST116") {
    throw new Error(deleteCardsError.message)
  }

  // 5) Apagar colunas do board
  const { error: deleteColumnsError } = await supabase
    .from("board_columns")
    .delete()
    .eq("board_id", boardId)
  if (deleteColumnsError && deleteColumnsError.code !== "PGRST116") {
    throw new Error(deleteColumnsError.message)
  }

  // 6) Finalmente, apagar o próprio board
  const { error: deleteBoardError } = await supabase
    .from("boards")
    .delete()
    .eq("id", boardId)
  if (deleteBoardError) throw new Error(deleteBoardError.message)
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
  const { error } = await supabase
    .from("board_columns")
    .update({ title: params.title.trim() })
    .eq("id", params.id)
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
