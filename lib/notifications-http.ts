import { supabase } from "@/lib/supabase"

export async function httpNotifyTaskAssigned(args: {
  boardId: string
  cardId: string
  taskTitle: string
  taskDescription?: string | null
  assignedUserIds: string[]
}) {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.access_token) {
    return
  }

  await fetch("/api/notifications/task-assigned", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify(args),
  })
}

