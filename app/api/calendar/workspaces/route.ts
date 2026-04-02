import { NextResponse } from "next/server"

import { getSupabaseAnon } from "@/lib/server/supabase-auth"
import { getSupabaseAdmin } from "@/lib/server/supabase-admin"

function isMissingColumnOrRelationError(message: string) {
  const m = message.toLowerCase()
  return (
    (m.includes("column") && m.includes("does not exist")) ||
    m.includes("schema cache") ||
    m.includes("could not find") ||
    (m.includes("relation") && m.includes("does not exist"))
  )
}

/**
 * Lista workspaces do utilizador autenticado usando service role (ignora RLS).
 * O cliente Supabase com anon key frequentemente não vê linhas em `workspaces` / `workspace_members`
 * quando RLS não tem políticas para `authenticated`; o Table Editor usa `postgres` e engana o diagnóstico.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? ""
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : ""
  if (!token) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 })
  }

  let admin: ReturnType<typeof getSupabaseAdmin>
  try {
    admin = getSupabaseAdmin()
  } catch {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY nao configurada no servidor." },
      { status: 503 },
    )
  }

  const anon = getSupabaseAnon()
  const { data: userData, error: userErr } = await anon.auth.getUser(token)
  if (userErr || !userData.user) {
    return NextResponse.json({ error: "Sessao invalida." }, { status: 401 })
  }
  const userId = userData.user.id

  const workspaceIds = new Set<string>()

  for (const col of ["user_id", "profile_id", "member_id"] as const) {
    const { data, error } = await admin.from("workspace_members").select("workspace_id").eq(col, userId)

    if (error) {
      if (isMissingColumnOrRelationError(error.message)) continue
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    for (const row of data ?? []) {
      const w = row && typeof row === "object" && "workspace_id" in row ? row.workspace_id : null
      if (typeof w === "string" && w.trim()) workspaceIds.add(w.trim())
    }
  }

  const { data: createdRows, error: createdErr } = await admin
    .from("workspaces")
    .select("id,name")
    .eq("created_by", userId)

  if (createdErr) {
    if (!isMissingColumnOrRelationError(createdErr.message)) {
      return NextResponse.json({ error: createdErr.message }, { status: 500 })
    }
  } else {
    for (const row of createdRows ?? []) {
      const id = row && typeof row === "object" && "id" in row ? row.id : null
      if (typeof id === "string" && id.trim()) workspaceIds.add(id.trim())
    }
  }

  const ids = [...workspaceIds]

  /** Ambiente interno: sem linha em workspace_members e created_by errado — lista todos os workspaces (max 50). */
  const allowAll =
    ids.length === 0 && String(process.env.CALENDAR_FALLBACK_ALL_WORKSPACES ?? "").trim() === "1"

  if (allowAll) {
    const { data: allWs, error: allErr } = await admin
      .from("workspaces")
      .select("id,name")
      .limit(50)

    if (allErr) {
      return NextResponse.json({ error: allErr.message }, { status: 500 })
    }

    const list = allWs ?? []
    if (list.length === 0) {
      return NextResponse.json({ workspaces: [] })
    }

    const workspaces = list.map((row, index) => {
      const id = String(row.id ?? "")
      const name = typeof row.name === "string" ? row.name.trim() : ""
      return {
        id,
        label: name || (list.length === 1 ? "Workspace Geral" : `Workspace ${index + 1}`),
      }
    })

    return NextResponse.json({ workspaces })
  }

  if (ids.length === 0) {
    return NextResponse.json({ workspaces: [] })
  }

  const { data: wsRows, error: wsErr } = await admin.from("workspaces").select("id,name").in("id", ids)

  if (wsErr) {
    return NextResponse.json({ error: wsErr.message }, { status: 500 })
  }

  const workspaces = (wsRows ?? []).map((row, index) => {
    const id = String(row.id ?? "")
    const name = typeof row.name === "string" ? row.name.trim() : ""
    return {
      id,
      label: name || (ids.length === 1 ? "Workspace Geral" : `Workspace ${index + 1}`),
    }
  })

  return NextResponse.json({ workspaces })
}
