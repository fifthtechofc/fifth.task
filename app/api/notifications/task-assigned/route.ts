import { NextResponse } from "next/server"

import { rateLimit, getClientIp } from "@/lib/server/rate-limit"
import { getSupabaseAnon } from "@/lib/server/supabase-auth"
import { getSupabaseAdmin } from "@/lib/server/supabase-admin"
import { sendMail } from "@/lib/server/mailer"
import { slugifyBoardTitle } from "@/lib/kanban"

type Body = {
  boardId: string
  cardId: string
  taskTitle: string
  taskDescription?: string | null
  assignedUserIds: string[]
  boardProjectSlug?: string | null
}

function cleanText(v: unknown) {
  return typeof v === "string" ? v.trim() : ""
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function buildEmailHtml(args: {
  recipientName: string
  taskTitle: string
  taskDescription: string
  assignedByName: string
  boardTitle: string
  boardUrl: string
}) {
  const { recipientName, taskTitle, taskDescription, assignedByName, boardTitle, boardUrl } = args
  const logoUrl =
    "https://ryovcwvpeekcequwbpqn.supabase.co/storage/v1/object/public/Logo.fft/logo.png"
  const safeUrl = escapeHtml(boardUrl)
  // Email-safe approximation of our "plus pattern" background (no animation in email clients).
  const plusPatternSvg =
    "data:image/svg+xml,%3Csvg%20width%3D%2760%27%20height%3D%2760%27%20viewBox%3D%270%200%2060%2060%27%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%3E%3Cg%20fill%3D%27none%27%20fill-rule%3D%27evenodd%27%3E%3Cg%20fill%3D%27%23ffffff22%27%20fill-opacity%3D%271%27%3E%3Cpath%20d%3D%27M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%27/%3E%3C/g%3E%3C/g%3E%3C/svg%3E"

  return `
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    Você recebeu uma tarefa no Fifth Task.
  </div>
  <div style="background:#0b0d10;padding:34px 16px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,Helvetica,Arial;background-image:url('${plusPatternSvg}');background-repeat:repeat;background-size:60px 60px;">
    <div style="max-width:680px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:18px;">
        <img src="${escapeHtml(logoUrl)}" alt="Fifth Tech" width="72" height="72" style="display:inline-block;object-fit:contain;filter:brightness(0) invert(1) drop-shadow(0 10px 26px rgba(255,255,255,0.18));" />
      </div>

      <div style="border:1px solid rgba(255,255,255,.10);border-radius:22px;background:rgba(16,18,20,.92);overflow:hidden;box-shadow:0 22px 60px rgba(0,0,0,0.55);">
        <div style="padding:22px 22px;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02);">
          <div style="letter-spacing:.30em;text-transform:uppercase;font-size:10px;color:rgba(255,255,255,.60);">Fifth Task</div>
          <div style="margin-top:8px;font-size:20px;font-weight:800;color:#ffffff;">Nova tarefa atribuída</div>
          <div style="margin-top:6px;font-size:13px;color:rgba(255,255,255,.72);">
            Olá <b>${escapeHtml(recipientName || "tudo bem")}</b>, você recebeu uma nova tarefa.
          </div>
        </div>

        <div style="padding:22px 22px;color:#c7d1db;">
          <div style="border:1px solid rgba(255,255,255,.10);border-radius:16px;background:rgba(255,255,255,.03);padding:16px 16px;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:.18em;color:rgba(255,255,255,.55);">Tarefa</div>
            <div style="margin-top:6px;font-size:16px;font-weight:800;color:#ffffff;">${escapeHtml(taskTitle)}</div>
            ${
              taskDescription
                ? `<div style="margin-top:10px;font-size:13px;line-height:1.6;color:rgba(255,255,255,.80);white-space:pre-wrap;">${escapeHtml(taskDescription)}</div>`
                : `<div style="margin-top:10px;font-size:12px;color:rgba(255,255,255,.55);">Sem descrição.</div>`
            }
          </div>

          <!-- two-column row (email-safe) -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:18px;border-collapse:separate;border-spacing:12px 0;">
            <tr>
              <td width="50%" valign="top" style="border:1px solid rgba(255,255,255,.10);border-radius:16px;background:rgba(255,255,255,.02);padding:14px 14px;">
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:.18em;color:rgba(255,255,255,.55);">Board</div>
                <div style="margin-top:6px;font-size:13px;font-weight:700;color:#ffffff;">${escapeHtml(boardTitle)}</div>
              </td>
              <td width="50%" valign="top" style="border:1px solid rgba(255,255,255,.10);border-radius:16px;background:rgba(255,255,255,.02);padding:14px 14px;">
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:.18em;color:rgba(255,255,255,.55);">Atribuída por</div>
                <div style="margin-top:6px;font-size:13px;font-weight:700;color:#ffffff;">${escapeHtml(assignedByName)}</div>
              </td>
            </tr>
          </table>

          <div style="margin-top:22px;text-align:center;">
            <a href="${safeUrl}" style="display:inline-block;padding:12px 18px;border-radius:14px;background:#ffffff;color:#000000;font-weight:800;text-decoration:none;">
              Abrir board
            </a>
            <div style="margin-top:12px;font-size:11px;color:rgba(255,255,255,.55);">
              Se o botão não funcionar, copie e cole este link no navegador:<br />
              <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;color:rgba(255,255,255,.75);">${safeUrl}</span>
            </div>
          </div>
        </div>

        <div style="padding:16px 22px;border-top:1px solid rgba(255,255,255,.08);font-size:11px;color:rgba(255,255,255,.45);text-align:center;">
          Você está recebendo este email porque alguém atribuiu uma tarefa a você no Fifth Task.
        </div>
      </div>
    </div>
  </div>
  `
}

export async function POST(req: Request) {
  const ip = getClientIp(req.headers)
  const limit = rateLimit(`notify:task-assigned:${ip}`, { limit: 20, windowMs: 60_000 })
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Muitas solicitações. Tente novamente em instantes." },
      { status: 429 },
    )
  }

  const auth = req.headers.get("authorization") ?? ""
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : ""
  if (!token) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  const boardId = cleanText(body.boardId)
  const cardId = cleanText(body.cardId)
  const taskTitle = cleanText(body.taskTitle)
  const taskDescription = cleanText(body.taskDescription)
  const assignedUserIds = Array.isArray(body.assignedUserIds)
    ? body.assignedUserIds.map((x) => cleanText(x)).filter(Boolean)
    : []

  if (!boardId || !cardId || !taskTitle || assignedUserIds.length === 0) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes." }, { status: 400 })
  }

  const supabase = getSupabaseAnon()
  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData.user) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 })
  }
  const actorId = userData.user.id

  const admin = getSupabaseAdmin()

  // Actor display name + avatar (in-app notification)
  const { data: actorProfile } = await admin
    .from("profiles")
    .select("full_name,display_name,email")
    .eq("id", actorId)
    .maybeSingle()

  const assignedByName =
    cleanText(actorProfile?.full_name) ||
    cleanText(actorProfile?.display_name) ||
    cleanText(actorProfile?.email) ||
    cleanText(userData.user.email) ||
    "Alguém da sua equipe"

  // Board title
  const { data: boardRow } = await admin
    .from("boards")
    .select("title")
    .eq("id", boardId)
    .maybeSingle()
  const boardTitle = cleanText(boardRow?.title) || "Quadro"
  const origin = req.headers.get("origin") || "http://localhost:3000"
  const boardPathSlug =
    cleanText(body.boardProjectSlug) || slugifyBoardTitle(boardTitle) || "board"
  const boardUrl = `${origin}/boards/${encodeURIComponent(boardPathSlug)}?id=${encodeURIComponent(boardId)}`

  // Recipients
  const { data: recipientRows, error: recipientsErr } = await admin
    .from("profiles")
    .select("id,full_name,display_name,email")
    .in("id", assignedUserIds)

  if (recipientsErr) {
    return NextResponse.json({ error: "Não foi possível resolver destinatários." }, { status: 500 })
  }

  const recipients = (recipientRows ?? [])
    .map((r) => {
      const email = cleanText((r as any).email)
      const name =
        cleanText((r as any).full_name) ||
        cleanText((r as any).display_name) ||
        email
      return { id: cleanText((r as any).id), email, name }
    })
    .filter((r) => r.id)

  // If profile email is missing, fall back to Supabase Auth email (service role).
  const recipientsResolved = await Promise.all(
    recipients.map(async (r) => {
      if (r.email) return r
      try {
        const { data } = await admin.auth.admin.getUserById(r.id)
        const email = cleanText(data.user?.email)
        return { ...r, email: email || "" }
      } catch {
        return r
      }
    }),
  )

  const recipientsWithEmail = recipientsResolved.filter((r) => r.id && r.email)

  if (recipientsWithEmail.length === 0) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      attempted: 0,
      resolvedRecipients: recipientsResolved.map((r) => ({ id: r.id, email: r.email || null })),
      reason: "Nenhum destinatário com email (profiles.email vazio e fallback Auth sem email).",
    })
  }

  const subject = `Nova tarefa atribuída: ${taskTitle}`

  const results = await Promise.allSettled(
    recipientsWithEmail.map((r) =>
      sendMail({
        to: r.email,
        subject,
        html: buildEmailHtml({
          recipientName: r.name,
          taskTitle,
          taskDescription,
          assignedByName,
          boardTitle,
          boardUrl,
        }),
        text: `Você recebeu uma tarefa.\n\nTarefa: ${taskTitle}\nQuadro: ${boardTitle}\nAtribuída por: ${assignedByName}\n\n${taskDescription ? `Descrição: ${taskDescription}\n` : ""}`,
      }),
    ),
  )

  const sent = results.filter((x) => x.status === "fulfilled").length
  const failed = results
    .map((r, idx) => ({ r, idx }))
    .filter((x) => x.r.status === "rejected")
    .map((x) => ({
      to: recipientsWithEmail[x.idx]?.email ?? null,
      error: x.r.status === "rejected" ? String(x.r.reason) : null,
    }))

  if (failed.length > 0) {
    console.error("[task-assigned] mail failures", failed)
  }

  return NextResponse.json({
    ok: true,
    sent,
    attempted: recipientsWithEmail.length,
    resolvedRecipients: recipientsResolved.map((r) => ({ id: r.id, email: r.email || null })),
    failed,
  })
}

