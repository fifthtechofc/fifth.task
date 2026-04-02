import { supabase } from "@/lib/supabase"

function logRpcFailure(name: string, error: string) {
  console.warn(`[kanban-notifications] ${name} falhou (aplica supabase/kanban_activity_notifications_rpc.sql se necessário):`, error)
}

export async function rpcNotifyBoardCreated(args: {
  boardId: string
  boardProjectSlug?: string
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc("notify_board_created_in_app", {
    p_board_id: args.boardId,
    p_board_path_slug: args.boardProjectSlug?.trim() || null,
  })
  if (error) {
    logRpcFailure("notify_board_created_in_app", error.message)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function rpcNotifyTaskCreated(args: {
  boardId: string
  cardId: string
  columnTitle: string
  boardProjectSlug?: string
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc("notify_task_created_in_app", {
    p_board_id: args.boardId,
    p_card_id: args.cardId,
    p_column_title: args.columnTitle.trim() || "Coluna",
    p_board_path_slug: args.boardProjectSlug?.trim() || null,
  })
  if (error) {
    logRpcFailure("notify_task_created_in_app", error.message)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function rpcNotifyTaskMoved(args: {
  boardId: string
  cardId: string
  toColumnTitle: string
  boardProjectSlug?: string
}): Promise<{ ok: boolean; inserted?: number; error?: string }> {
  const { data, error } = await supabase.rpc("notify_task_moved_in_app", {
    p_board_id: args.boardId,
    p_card_id: args.cardId,
    p_to_column_title: args.toColumnTitle.trim() || "Coluna",
    p_board_path_slug: args.boardProjectSlug?.trim() || null,
  })
  if (error) {
    logRpcFailure("notify_task_moved_in_app", error.message)
    return { ok: false, error: error.message }
  }
  const inserted = typeof data === "number" ? data : Number(data) || 0
  return { ok: true, inserted }
}
