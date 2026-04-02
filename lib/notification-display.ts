import type { AppNotification } from "@/lib/in-app-notifications"

/** Remove marcas tipográficas « » usadas nos textos gerados no SQL. */
export function stripGuillemets(value: string) {
  return value.replaceAll("«", "").replaceAll("»", "").replace(/\s+/g, " ").trim()
}

function pickActorName(n: AppNotification): string {
  const fromJoin = n.actorName?.trim()
  if (fromJoin) return fromJoin
  if (n.notificationType === "card_comment" && n.body) {
    const m = n.body.match(/^(.+?)\s+em\s+[«]/u)
    if (m) return m[1].trim()
  }
  return "Alguém"
}

export type NotificationLineSegment = { text: string; emphasis: boolean }

/**
 * Linha estilo referência: [ator em destaque] ação regular [alvo em destaque] …
 * Retorna null para notificações genéricas (ex.: confirmação local).
 */
export function getNotificationLineSegments(n: AppNotification): NotificationLineSegment[] | null {
  const actor = pickActorName(n)
  const type = n.notificationType ?? "generic"

  if (type === "board_created") {
    const board = stripGuillemets(n.body || n.title)
    return [
      { text: actor, emphasis: true },
      { text: " criou um novo quadro ", emphasis: false },
      { text: board || "Quadro", emphasis: true },
    ]
  }

  if (type === "task_created") {
    const raw = n.body || ""
    const m = raw.match(/«([^»]+)»\s*na coluna\s*«([^»]+)»\s*·\s*(.+)/)
    if (m) {
      const task = stripGuillemets(m[1])
      const col = stripGuillemets(m[2])
      const board = stripGuillemets(m[3]) || "Quadro"
      return [
        { text: actor, emphasis: true },
        { text: " criou a tarefa ", emphasis: false },
        { text: task || "Tarefa", emphasis: true },
        { text: " na coluna ", emphasis: false },
        { text: col || "Coluna", emphasis: false },
        { text: " no quadro ", emphasis: false },
        { text: board, emphasis: true },
      ]
    }
    return [
      { text: actor, emphasis: true },
      { text: " criou uma tarefa ", emphasis: false },
      { text: stripGuillemets(n.title) || "Tarefa", emphasis: true },
    ]
  }

  if (type === "task_column_changed") {
    const raw = n.body || ""
    const mWithBoard = raw.match(/«([^»]+)»\s*→\s*«([^»]+)»\s*·\s*(.+)/)
    if (mWithBoard) {
      const task = stripGuillemets(mWithBoard[1])
      const col = stripGuillemets(mWithBoard[2])
      const board = stripGuillemets(mWithBoard[3]) || "Quadro"
      return [
        { text: actor, emphasis: true },
        { text: " moveu a tarefa ", emphasis: false },
        { text: task || "Tarefa", emphasis: true },
        { text: " para a coluna ", emphasis: false },
        { text: col || "Coluna", emphasis: true },
        { text: " no quadro ", emphasis: false },
        { text: board, emphasis: true },
      ]
    }
    const m = raw.match(/«([^»]+)»\s*→\s*«([^»]+)»/)
    if (m) {
      const task = stripGuillemets(m[1])
      const col = stripGuillemets(m[2])
      return [
        { text: actor, emphasis: true },
        { text: " moveu a tarefa ", emphasis: false },
        { text: task || "Tarefa", emphasis: true },
        { text: " para a coluna ", emphasis: false },
        { text: col || "Coluna", emphasis: true },
      ]
    }
    return [
      { text: actor, emphasis: true },
      { text: " atualizou o estado de uma tarefa", emphasis: false },
    ]
  }

  // task_assigned (Supabase) + confirmação local após atribuir (assignment_actor_confirm / legado actor_assignment_notice)
  if (
    type === "task_assigned" ||
    type === "assignment_actor_confirm" ||
    type === "actor_assignment_notice"
  ) {
    const raw = n.body || ""
    const m3 = raw.match(/«([^»]+)»\s*·\s*«([^»]+)»\s*·\s*«([^»]+)»/)
    if (m3) {
      const taskName = stripGuillemets(m3[1])
      const boardName = stripGuillemets(m3[2])
      const assigneeName = stripGuillemets(m3[3])
      return [
        { text: actor, emphasis: true },
        { text: " atribuiu ", emphasis: false },
        { text: assigneeName || "Utilizador", emphasis: true },
        { text: " na ", emphasis: false },
        { text: taskName || "Tarefa", emphasis: true },
        { text: " no quadro ", emphasis: false },
        { text: boardName || "Quadro", emphasis: true },
      ]
    }
    const parts = raw.split(/\s*·\s*/)
    const taskName = parts[0] ? stripGuillemets(parts[0]) : stripGuillemets(n.title)
    const boardName = parts[1] ? stripGuillemets(parts[1]) : ""
    const assigneeFromLegacy = parts[2] ? stripGuillemets(parts[2]) : ""
    if (assigneeFromLegacy) {
      return [
        { text: actor, emphasis: true },
        { text: " atribuiu ", emphasis: false },
        { text: assigneeFromLegacy, emphasis: true },
        { text: " na ", emphasis: false },
        { text: taskName || "Tarefa", emphasis: true },
        ...(boardName
          ? [
              { text: " no quadro ", emphasis: false as const },
              { text: boardName, emphasis: true as const },
            ]
          : []),
      ]
    }
    const base: NotificationLineSegment[] = [
      { text: actor, emphasis: true },
      { text: " atribuiu-te a tarefa ", emphasis: false },
      { text: taskName || "Tarefa", emphasis: true },
    ]
    if (boardName) {
      base.push({ text: " no quadro ", emphasis: false }, { text: boardName, emphasis: true })
    }
    return base
  }

  if (type === "own_comment") {
    const card = stripGuillemets(n.body || "") || "Tarefa"
    return [
      { text: actor, emphasis: true },
      { text: " publicou um comentário na tarefa ", emphasis: false },
      { text: card, emphasis: true },
    ]
  }

  if (type === "card_comment") {
    const raw = n.body || ""
    const m = raw.match(/^(.+?)\s+em\s+«([^»]+)»/)
    if (m) {
      const name = m[1].trim()
      const card = stripGuillemets(m[2])
      return [
        { text: name, emphasis: true },
        { text: " comentou em ", emphasis: false },
        { text: card || "tarefa", emphasis: true },
      ]
    }
    return [
      { text: actor, emphasis: true },
      { text: " deixou um comentário", emphasis: false },
    ]
  }

  return null
}

/** Href final para o link da notificação (acrescenta `card` quando a BD tem `card_id` mas o href antigo não). */
export function appNotificationClickHref(n: AppNotification): string | undefined {
  const href = n.href?.trim()
  if (!href) return undefined
  const cardId = n.cardId?.trim()
  if (!cardId || /[?&]card=/.test(href)) return href
  const typesWithCard = new Set([
    "task_assigned",
    "task_created",
    "task_column_changed",
    "card_comment",
    "own_comment",
    "assignment_actor_confirm",
    "actor_assignment_notice",
  ])
  const t = n.notificationType ?? ""
  if (!typesWithCard.has(t)) return href
  return `${href}${href.includes("?") ? "&" : "?"}card=${encodeURIComponent(cardId)}`
}

export function notificationAvatarInitials(n: AppNotification) {
  const name = n.actorName?.trim() || pickActorName(n)
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}
