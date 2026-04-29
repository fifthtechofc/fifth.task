import { supabase } from "@/lib/supabase"

function logRpcFailure(name: string, error: string) {
  console.warn(
    `[calendar-notifications] ${name} falhou (aplica supabase/calendar_event_assignees.sql se necessario):`,
    error,
  )
}

export async function rpcNotifyCalendarEventAssignees(args: {
  eventId: string
  eventTitle: string
  workspaceLabel: string
  assignedUserIds: string[]
}): Promise<{ ok: boolean; inserted?: number; error?: string }> {
  const ids = Array.from(new Set(args.assignedUserIds.filter(Boolean)))
  if (ids.length === 0) {
    return { ok: true, inserted: 0 }
  }

  const { data, error } = await supabase.rpc(
    "notify_calendar_event_assignees_in_app",
    {
      p_event_id: args.eventId,
      p_event_title: args.eventTitle.trim() || "Evento",
      p_workspace_label: args.workspaceLabel.trim() || "Workspace",
      p_assigned_user_ids: ids,
    },
  )

  if (error) {
    logRpcFailure("notify_calendar_event_assignees_in_app", error.message)
    return { ok: false, error: error.message }
  }

  const inserted = typeof data === "number" ? data : Number(data) || 0
  return { ok: true, inserted }
}
