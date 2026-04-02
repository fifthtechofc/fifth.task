import { supabase } from "@/lib/supabase"

export type HttpNotifyTaskAssignedResult =
  | {
      ok: true
      sent?: number
      attempted?: number
      inAppInserted?: number
      inAppRpcError?: string
    }
  | {
      ok: false
      status?: number
      error?: string
      inAppInserted?: number
      inAppRpcError?: string
    }

/** In-app via Postgres (SECURITY DEFINER), mesmo padrão do trigger de comentários — não usa service role. */
export async function rpcNotifyCardAssigneesInApp(args: {
  boardId: string
  cardId: string
  taskTitle: string
  assignedUserIds: string[]
  boardProjectSlug?: string
}): Promise<{ ok: boolean; inserted: number; error?: string }> {
  const ids = args.assignedUserIds.filter(Boolean)
  if (ids.length === 0) {
    return { ok: true, inserted: 0 }
  }

  const { data, error } = await supabase.rpc("notify_card_assignees_in_app", {
    p_board_id: args.boardId,
    p_card_id: args.cardId,
    p_task_title: args.taskTitle.trim() || "Tarefa",
    p_assigned_user_ids: ids,
    p_board_path_slug: args.boardProjectSlug?.trim() || null,
  })

  if (error) {
    return { ok: false, inserted: 0, error: error.message }
  }

  const inserted = typeof data === "number" ? data : Number(data) || 0
  return { ok: true, inserted }
}

export async function httpNotifyTaskAssigned(args: {
  boardId: string
  cardId: string
  taskTitle: string
  taskDescription?: string | null
  assignedUserIds: string[]
  /** Segmento da URL do quadro, ex.: "teste" em /boards/teste?id=… */
  boardProjectSlug?: string
}): Promise<HttpNotifyTaskAssignedResult> {
  const inApp = await rpcNotifyCardAssigneesInApp({
    boardId: args.boardId,
    cardId: args.cardId,
    taskTitle: args.taskTitle,
    assignedUserIds: args.assignedUserIds,
    boardProjectSlug: args.boardProjectSlug,
  })

  if (!inApp.ok) {
    console.warn(
      "[task-assigned] RPC in-app falhou (corre supabase/notify_card_assignees_rpc.sql no Supabase):",
      inApp.error,
    )
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !sessionData.session?.access_token) {
    if (inApp.ok) {
      return { ok: true, sent: 0, attempted: 0, inAppInserted: inApp.inserted }
    }
    return { ok: false, error: "Sem sessão.", inAppRpcError: inApp.error }
  }

  const res = await fetch("/api/notifications/task-assigned", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${sessionData.session.access_token}`,
    },
    body: JSON.stringify(args),
  })

  type JsonBody = {
    sent?: number
    attempted?: number
    error?: string
  }
  let body: JsonBody | null = null
  try {
    body = (await res.json()) as JsonBody
  } catch {
    body = null
  }

  if (!res.ok) {
    if (inApp.ok) {
      console.warn(
        "[task-assigned] API de e-mail falhou, mas notificações in-app foram gravadas:",
        typeof body?.error === "string" ? body.error : res.statusText,
      )
      return {
        ok: true,
        sent: 0,
        attempted: 0,
        inAppInserted: inApp.inserted,
        inAppRpcError: inApp.error,
      }
    }
    return {
      ok: false,
      status: res.status,
      error: typeof body?.error === "string" ? body.error : res.statusText,
      inAppInserted: inApp.inserted,
      inAppRpcError: inApp.error,
    }
  }

  return {
    ok: true,
    sent: typeof body?.sent === "number" ? body.sent : undefined,
    attempted: typeof body?.attempted === "number" ? body.attempted : undefined,
    inAppInserted: inApp.inserted,
    inAppRpcError: inApp.error,
  }
}
