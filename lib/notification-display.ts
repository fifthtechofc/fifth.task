import type { AppNotification } from "@/lib/in-app-notifications"

export function stripGuillemets(value: string) {
  return value
    .replaceAll("Ã‚Â«", "")
    .replaceAll("Ã‚Â»", "")
    .replaceAll("«", "")
    .replaceAll("»", "")
    .replaceAll("<<", "")
    .replaceAll(">>", "")
    .replace(/\s+/g, " ")
    .trim()
}

function pickActorName(n: AppNotification): string {
  const fromJoin = n.actorName?.trim()
  if (fromJoin) return fromJoin
  if (n.notificationType === "card_comment" && n.body) {
    const m = n.body.match(/^(.+?)\s+em\s+[Ã‚Â««<]/u)
    if (m) return m[1].trim()
  }
  return "Alguém"
}

export type NotificationLineSegment = { text: string; emphasis: boolean }

function parsePipeParts(value: string) {
  return value
    .split("|")
    .map((part) => stripGuillemets(part))
    .map((part) => part.trim())
    .filter(Boolean)
}

function parseLegacyWrappedParts(value: string) {
  return Array.from(
    value.matchAll(/(?:Ã‚Â«|«|<<)\s*([^<>«»]+?)\s*(?:Ã‚Â»|»|>>)/g),
    (match) => stripGuillemets(match[1] ?? ""),
  ).filter(Boolean)
}

function parseNotificationParts(value: string) {
  const pipeParts = parsePipeParts(value)
  if (pipeParts.length > 0) return pipeParts
  return parseLegacyWrappedParts(value)
}

export function getNotificationLineSegments(
  n: AppNotification,
): NotificationLineSegment[] | null {
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
    const parts = parseNotificationParts(n.body || "")
    if (parts.length >= 3) {
      const [task, col, board] = parts
      return [
        { text: actor, emphasis: true },
        { text: " criou a tarefa ", emphasis: false },
        { text: task || "Tarefa", emphasis: true },
        { text: " na coluna ", emphasis: false },
        { text: col || "Coluna", emphasis: false },
        { text: " no quadro ", emphasis: false },
        { text: board || "Quadro", emphasis: true },
      ]
    }
    return [
      { text: actor, emphasis: true },
      { text: " criou uma tarefa ", emphasis: false },
      { text: stripGuillemets(n.title) || "Tarefa", emphasis: true },
    ]
  }

  if (type === "task_column_changed") {
    const parts = parseNotificationParts(n.body || "")
    if (parts.length >= 3) {
      const [task, col, board] = parts
      return [
        { text: actor, emphasis: true },
        { text: " moveu a tarefa ", emphasis: false },
        { text: task || "Tarefa", emphasis: true },
        { text: " para a coluna ", emphasis: false },
        { text: col || "Coluna", emphasis: true },
        { text: " no quadro ", emphasis: false },
        { text: board || "Quadro", emphasis: true },
      ]
    }
    if (parts.length >= 2) {
      const [task, col] = parts
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

  if (
    type === "task_assigned" ||
    type === "assignment_actor_confirm" ||
    type === "actor_assignment_notice"
  ) {
    const parts = parseNotificationParts(n.body || "")
    if (parts.length >= 3) {
      const [taskName, boardName, assigneeName] = parts
      return [
        { text: actor, emphasis: true },
        { text: " atribuiu ", emphasis: false },
        { text: assigneeName || "Usuário", emphasis: true },
        { text: " na tarefa ", emphasis: false },
        { text: taskName || "Tarefa", emphasis: true },
        { text: " do quadro ", emphasis: false },
        { text: boardName || "Quadro", emphasis: true },
      ]
    }
  }

  if (
    type === "calendar_event_created" ||
    type === "calendar_event_created_with_assignees" ||
    type === "calendar_event_updated" ||
    type === "calendar_event_updated_with_assignees" ||
    type === "calendar_event_deleted" ||
    type === "calendar_event_assigned"
  ) {
    const parts = parseNotificationParts(n.body || "")
    const eventName = parts[0] || stripGuillemets(n.title) || "Evento"
    const workspaceName = parts[1] || ""
    const assigneeNames = parts[2] || ""

    const action =
      type === "calendar_event_created" ||
      type === "calendar_event_created_with_assignees"
        ? " criou o evento "
        : type === "calendar_event_updated" ||
            type === "calendar_event_updated_with_assignees"
          ? " atualizou o evento "
          : type === "calendar_event_deleted"
            ? " removeu o evento "
            : " atribuiu você ao evento "

    const segments: NotificationLineSegment[] = [
      { text: actor, emphasis: true },
      { text: action, emphasis: false },
      { text: eventName, emphasis: true },
    ]

    if (workspaceName) {
      segments.push(
        { text: " no workspace ", emphasis: false },
        { text: workspaceName, emphasis: true },
      )
    }

    if (
      assigneeNames &&
      (type === "calendar_event_created_with_assignees" ||
        type === "calendar_event_updated_with_assignees")
    ) {
      segments.push(
        { text: " e atribuiu ", emphasis: false },
        { text: assigneeNames, emphasis: true },
      )
    }

    return segments
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
    const m = raw.match(/^(.+?)\s+em\s+(?:Ã‚Â«|«|<<)([^<>«»]+)(?:Ã‚Â»|»|>>)/)
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

export function appNotificationClickHref(
  n: AppNotification,
): string | undefined {
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
