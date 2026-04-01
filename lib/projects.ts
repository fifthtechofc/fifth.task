import { fetchBoards, getBoardDisplayTitle, updateBoard } from "@/lib/kanban"
import { getTeamMembers } from "@/lib/profile"
import { supabase } from "@/lib/supabase"

export type ProjectMember = {
  id: string
  name: string
  avatarUrl?: string | null
}

export type Project = {
  id: string
  title: string
  description: string
  category: string | null
  progress: number
  createdAt: string
  dueDate?: string | null
  members: ProjectMember[]
}

const PROJECT_PROGRESS_STORAGE_KEY = "projects:progress"

type BoardCardRow = {
  board_id: string
  column_id: string
  assigned_to: string | null
}

type BoardColumnRow = {
  id: string
  board_id: string
  title: string
}

type ProfileRow = {
  id: string
  full_name?: string | null
  name?: string | null
  display_name?: string | null
  avatar_url?: string | null
}

type BoardMemberWithProfileRow = {
  board_id: string
  user_id?: string | null
  profile_id?: string | null
}

function clampProgress(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function readStoredProgressMap() {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(PROJECT_PROGRESS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, number>
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function writeStoredProgressMap(map: Record<string, number>) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(PROJECT_PROGRESS_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // ignore storage errors
  }
}

function getStoredProjectProgress(projectId: string) {
  const map = readStoredProgressMap()
  const value = map[projectId]
  return typeof value === "number" ? clampProgress(value) : null
}

function setStoredProjectProgress(projectId: string, progress: number) {
  const map = readStoredProgressMap()
  map[projectId] = clampProgress(progress)
  writeStoredProgressMap(map)
}

function coalesceProjectTitle(title: string | null | undefined, fallbackId: string) {
  const normalized = title?.trim()
  if (normalized) return normalized
  return `Projeto ${fallbackId.slice(0, 8)}`
}

function normalizeMember(profile: ProfileRow): ProjectMember {
  return {
    id: profile.id,
    name: profile.full_name?.trim() || profile.name?.trim() || profile.display_name?.trim() || "Sem nome",
    avatarUrl: profile.avatar_url?.trim() || null,
  }
}

async function fetchBoardMemberIds(boardIds: string[]): Promise<Map<string, string[]>> {
  const memberIdsByBoardId = new Map<string, string[]>()
  if (!boardIds.length) return memberIdsByBoardId

  const queries = [
    () => supabase.from("board_members").select("board_id,user_id").in("board_id", boardIds),
    () => supabase.from("board_members").select("board_id,profile_id").in("board_id", boardIds),
  ]

  for (const runQuery of queries) {
    try {
      const { data, error } = await runQuery()
      if (error) throw error

      const rows = (data ?? []) as BoardMemberWithProfileRow[]
      for (const row of rows) {
        const memberId = row.user_id ?? row.profile_id ?? ""
        if (!memberId) continue
        const current = memberIdsByBoardId.get(row.board_id) ?? []
        if (!current.includes(memberId)) {
          current.push(memberId)
          memberIdsByBoardId.set(row.board_id, current)
        }
      }

      return memberIdsByBoardId
    } catch {
      // try next column shape
    }
  }

  return memberIdsByBoardId
}

function inferCategory(description: string | null) {
  const normalized = description?.trim().toLowerCase() ?? ""
  if (!normalized) return "KANBAN"
  if (normalized.includes("design")) return "DESIGN"
  if (normalized.includes("shop")) return "SHOPPING"
  if (normalized.includes("medical")) return "MEDICAL"
  if (normalized.includes("sprint")) return "SPRINT"
  return "KANBAN"
}

function isDoneColumnTitle(title: string) {
  const normalized = title.trim().toLowerCase()
  return (
    normalized === "done" ||
    normalized === "concluido" ||
    normalized === "concluído" ||
    normalized === "feito" ||
    normalized === "finalizado" ||
    normalized === "entregue"
  )
}

function buildProjectFromBoard(params: {
  board: Awaited<ReturnType<typeof fetchBoards>>[number]
  members: ProjectMember[]
  progress: number
}): Project {
  const { board, members, progress } = params
  return {
    id: board.id,
    title: getBoardDisplayTitle(coalesceProjectTitle(board.title, board.id)),
    description:
      board.description?.trim() ||
      "Quadro ativo do workspace com acompanhamento visual de entregas e fluxo do time.",
    category: inferCategory(board.description),
    progress: clampProgress(progress),
    createdAt: board.created_at ?? new Date().toISOString(),
    dueDate: null,
    members,
  }
}

export async function fetchProjects(): Promise<Project[]> {
  try {
    const boards = await fetchBoards()
    if (!boards.length) return []

    const boardIds = boards.map((board) => board.id)
    const memberIdsByBoardId = await fetchBoardMemberIds(boardIds)

    const [{ data: cardsData }, { data: columnsData }] = await Promise.all([
      supabase.from("board_cards").select("board_id,column_id,assigned_to").in("board_id", boardIds),
      supabase.from("board_columns").select("id,board_id,title").in("board_id", boardIds),
    ])

    const cards = (cardsData ?? []) as BoardCardRow[]
    const columns = (columnsData ?? []) as BoardColumnRow[]
    const allProfileIds = Array.from(
      new Set(
        boards
          .map((board) => board.created_by)
          .concat(
            boards.flatMap((board) => memberIdsByBoardId.get(board.id) ?? []),
          )
          .concat(cards.map((card) => card.assigned_to ?? ""))
          .filter(Boolean),
      ),
    )

    const profilesById = new Map<string, ProjectMember>()
    if (allProfileIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id,full_name,name,display_name,avatar_url")
        .in("id", allProfileIds)

      for (const profile of (profilesData ?? []) as ProfileRow[]) {
        profilesById.set(profile.id, normalizeMember(profile))
      }

      try {
        const teamMembers = await getTeamMembers()
        for (const member of teamMembers) {
          if (!allProfileIds.includes(member.id)) continue
          profilesById.set(member.id, {
            id: member.id,
            name: member.name,
            avatarUrl: member.imageSrc || profilesById.get(member.id)?.avatarUrl || null,
          })
        }
      } catch {
        // keep plain profiles fallback
      }
    }

    return boards.map((board) => {
      const boardCards = cards.filter((card) => card.board_id === board.id)
      const boardColumns = columns.filter((column) => column.board_id === board.id)

      let progress = 0
      if (boardCards.length > 0) {
        const boardDoneColumnIds = new Set(
          boardColumns
            .filter((column) => isDoneColumnTitle(column.title))
            .map((column) => column.id)
            .filter(Boolean),
        )

        if (boardDoneColumnIds.size > 0) {
          const doneCards = boardCards.filter((card) => boardDoneColumnIds.has(card.column_id)).length
          progress = Math.round((doneCards / boardCards.length) * 100)
        }
      }

      const storedProgress = getStoredProjectProgress(board.id)
      if (storedProgress !== null) {
        progress = storedProgress
      }

      const memberIds = Array.from(
        new Set(
          [
            ...(memberIdsByBoardId.get(board.id) ?? []),
            board.created_by,
            ...((boardCards.map((card) => card.assigned_to).filter(Boolean) as string[]) ?? []),
          ].filter(Boolean),
        ),
      )
      const members = memberIds.map((id) => profilesById.get(id)).filter(Boolean) as ProjectMember[]

      return buildProjectFromBoard({
        board,
        members,
        progress,
      })
    })
  } catch {
    return []
  }
}

export async function updateProject(params: {
  description: string
  id: string
  memberIds: string[]
  progress: number
  title: string
}) {
  const nextTitle = params.title.trim()
  if (!nextTitle) {
    throw new Error("O titulo do projeto nao pode ficar vazio.")
  }

  await updateBoard({
    id: params.id,
    title: nextTitle,
    description: params.description,
  })

  setStoredProjectProgress(params.id, params.progress)

  try {
    const { error: deleteError } = await supabase.from("board_members").delete().eq("board_id", params.id)
    if (deleteError) throw deleteError

    const uniqueIds = Array.from(new Set(params.memberIds.filter(Boolean)))
    if (!uniqueIds.length) return

    const payloads = [
      uniqueIds.map((profileId) => ({
        board_id: params.id,
        user_id: profileId,
      })),
      uniqueIds.map((profileId) => ({
        board_id: params.id,
        profile_id: profileId,
      })),
    ]

    let saved = false
    for (const payload of payloads) {
      const { error: insertError } = await supabase.from("board_members").insert(payload)
      if (!insertError) {
        saved = true
        break
      }
    }

    if (!saved) {
      throw new Error("Falha ao salvar membros do projeto.")
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Falha ao salvar membros do projeto."
    throw new Error(
      `${message}\n\nVerifique se a tabela 'board_members' usa a coluna user_id ou profile_id e se a FK com profiles foi criada corretamente.`,
    )
  }
}
