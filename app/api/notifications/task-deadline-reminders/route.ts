import { NextResponse } from "next/server"
import { slugifyBoardTitle } from "@/lib/kanban"
import { sendMail } from "@/lib/server/mailer"
import { getSupabaseAdmin } from "@/lib/server/supabase-admin"

export const runtime = "nodejs"

type ReminderKind = {
  key: "3d" | "1d" | "1h"
  label: string
  offsetMs: number
  toleranceMs: number
  subject: string
  intro: string
}

type CardRow = {
  id: string
  board_id: string
  title: string
  description: string | null
  due_at: string | null
  due_timezone: string | null
  assigned_to: string | null
}

type ProfileRow = {
  id: string
  full_name?: string | null
  display_name?: string | null
  email?: string | null
  notify_deadline_alerts?: boolean | null
}

const REMINDER_KINDS: ReminderKind[] = [
  {
    key: "3d",
    label: "3 dias",
    offsetMs: 72 * 60 * 60 * 1000,
    toleranceMs: 20 * 60 * 1000,
    subject: "vence em 3 dias",
    intro: "Faltam 3 dias para a entrega desta tarefa.",
  },
  {
    key: "1d",
    label: "1 dia",
    offsetMs: 24 * 60 * 60 * 1000,
    toleranceMs: 20 * 60 * 1000,
    subject: "vence amanhã",
    intro: "Falta 1 dia para a entrega desta tarefa.",
  },
  {
    key: "1h",
    label: "1 hora",
    offsetMs: 60 * 60 * 1000,
    toleranceMs: 20 * 60 * 1000,
    subject: "vence em 1 hora",
    intro: "Falta 1 hora para a entrega desta tarefa.",
  },
]

function required(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} não configurada.`)
  return value
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function baseUrl() {
  return (
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000"
  )
}

function validateCronSecret(req: Request) {
  const expected = required("CRON_SECRET")
  const auth = req.headers.get("authorization") ?? ""
  const bearer = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : ""
  const header = req.headers.get("x-cron-secret")?.trim() ?? ""
  return bearer === expected || header === expected
}

function formatDueAt(value: string, timeZone?: string | null) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ""
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: cleanText(timeZone) || undefined,
  }).format(date)
}

function buildReminderHtml(args: {
  recipientName: string
  taskTitle: string
  taskDescription: string
  boardTitle: string
  boardUrl: string
  dueAtLabel: string
  intro: string
}) {
  const {
    recipientName,
    taskTitle,
    taskDescription,
    boardTitle,
    boardUrl,
    dueAtLabel,
    intro,
  } = args
  const logoUrl =
    "https://ryovcwvpeekcequwbpqn.supabase.co/storage/v1/object/public/Logo.fft/logo.png"
  const safeUrl = escapeHtml(boardUrl)

  return `
  <div style="background:#0b0d10;padding:34px 16px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,Helvetica,Arial;">
    <div style="max-width:680px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:18px;">
        <img src="${escapeHtml(logoUrl)}" alt="Fifth Tech" width="72" height="72" style="display:inline-block;object-fit:contain;filter:brightness(0) invert(1);" />
      </div>
      <div style="border:1px solid rgba(255,255,255,.10);border-radius:22px;background:rgba(16,18,20,.96);overflow:hidden;">
        <div style="padding:22px;border-bottom:1px solid rgba(255,255,255,.08);">
          <div style="letter-spacing:.30em;text-transform:uppercase;font-size:10px;color:rgba(255,255,255,.60);">Fifth Task</div>
          <div style="margin-top:8px;font-size:20px;font-weight:800;color:#ffffff;">Lembrete de prazo</div>
          <div style="margin-top:8px;font-size:13px;color:rgba(255,255,255,.78);">
            Olá <b>${escapeHtml(recipientName || "tudo bem")}</b>. ${escapeHtml(intro)}
          </div>
        </div>
        <div style="padding:22px;color:#c7d1db;">
          <div style="border:1px solid rgba(255,255,255,.10);border-radius:16px;background:rgba(255,255,255,.03);padding:16px;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:.18em;color:rgba(255,255,255,.55);">Tarefa</div>
            <div style="margin-top:6px;font-size:16px;font-weight:800;color:#ffffff;">${escapeHtml(taskTitle)}</div>
            ${
              taskDescription
                ? `<div style="margin-top:10px;font-size:13px;line-height:1.6;color:rgba(255,255,255,.80);white-space:pre-wrap;">${escapeHtml(taskDescription)}</div>`
                : `<div style="margin-top:10px;font-size:12px;color:rgba(255,255,255,.55);">Sem descrição.</div>`
            }
          </div>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:18px;border-collapse:separate;border-spacing:12px 0;">
            <tr>
              <td width="50%" valign="top" style="border:1px solid rgba(255,255,255,.10);border-radius:16px;background:rgba(255,255,255,.02);padding:14px;">
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:.18em;color:rgba(255,255,255,.55);">Board</div>
                <div style="margin-top:6px;font-size:13px;font-weight:700;color:#ffffff;">${escapeHtml(boardTitle)}</div>
              </td>
              <td width="50%" valign="top" style="border:1px solid rgba(255,255,255,.10);border-radius:16px;background:rgba(255,255,255,.02);padding:14px;">
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:.18em;color:rgba(255,255,255,.55);">Entrega</div>
                <div style="margin-top:6px;font-size:13px;font-weight:700;color:#ffffff;">${escapeHtml(dueAtLabel)}</div>
              </td>
            </tr>
          </table>
          <div style="margin-top:22px;text-align:center;">
            <a href="${safeUrl}" style="display:inline-block;padding:12px 18px;border-radius:14px;background:#ffffff;color:#000000;font-weight:800;text-decoration:none;">
              Abrir tarefa
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
  `
}

async function fetchCards(admin: ReturnType<typeof getSupabaseAdmin>, nowIso: string) {
  const maxDueAt = new Date(
    Date.now() + 73 * 60 * 60 * 1000 + 20 * 60 * 1000,
  ).toISOString()

  const { data, error } = await admin
    .from("board_cards")
    .select("id,board_id,title,description,due_at,due_timezone,assigned_to")
    .not("due_at", "is", null)
    .gt("due_at", nowIso)
    .lte("due_at", maxDueAt)

  if (error) throw new Error(error.message)
  return (data ?? []) as CardRow[]
}

async function fetchCardAssignees(
  admin: ReturnType<typeof getSupabaseAdmin>,
  cardIds: string[],
) {
  if (cardIds.length === 0) return new Map<string, string[]>()
  const result = new Map<string, string[]>()

  try {
    const { data, error } = await admin
      .from("card_assignees")
      .select("*")
      .in("card_id", cardIds)
    if (error) throw new Error(error.message)

    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      const cardId = cleanText(row.card_id)
      const userId = cleanText(row.profile_id) || cleanText(row.user_id)
      if (!cardId || !userId) continue
      const list = result.get(cardId) ?? []
      if (!list.includes(userId)) list.push(userId)
      result.set(cardId, list)
    }
  } catch {
    // fallback to assigned_to only
  }

  return result
}

async function fetchProfiles(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userIds: string[],
) {
  if (userIds.length === 0) return new Map<string, ProfileRow>()

  try {
    const { data, error } = await admin
      .from("profiles")
      .select("id,full_name,display_name,email,notify_deadline_alerts")
      .in("id", userIds)
    if (error) throw new Error(error.message)
    return new Map(
      ((data ?? []) as ProfileRow[]).map((row) => [String(row.id), row]),
    )
  } catch {
    const { data, error } = await admin
      .from("profiles")
      .select("id,full_name,display_name,email")
      .in("id", userIds)
    if (error) throw new Error(error.message)
    return new Map(
      ((data ?? []) as ProfileRow[]).map((row) => [String(row.id), row]),
    )
  }
}

async function resolveRecipientEmail(
  admin: ReturnType<typeof getSupabaseAdmin>,
  profile: ProfileRow | undefined,
  userId: string,
) {
  const profileEmail = cleanText(profile?.email)
  if (profileEmail) return profileEmail
  try {
    const { data } = await admin.auth.admin.getUserById(userId)
    return cleanText(data.user?.email)
  } catch {
    return ""
  }
}

async function fetchBoardsMap(
  admin: ReturnType<typeof getSupabaseAdmin>,
  boardIds: string[],
) {
  if (boardIds.length === 0) return new Map<string, string>()
  const { data, error } = await admin
    .from("boards")
    .select("id,title")
    .in("id", boardIds)

  if (error) throw new Error(error.message)
  return new Map(
    ((data ?? []) as Array<Record<string, unknown>>).map((row) => [
      cleanText(row.id),
      cleanText(row.title) || "Quadro",
    ]),
  )
}

async function fetchExistingReminderKeys(
  admin: ReturnType<typeof getSupabaseAdmin>,
  cardIds: string[],
) {
  const keys = new Set<string>()
  if (cardIds.length === 0) return keys

  const { data, error } = await admin
    .from("task_deadline_email_reminders")
    .select("card_id,user_id,reminder_type,due_at")
    .in("card_id", cardIds)

  if (error) throw new Error(error.message)

  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const cardId = cleanText(row.card_id)
    const userId = cleanText(row.user_id)
    const type = cleanText(row.reminder_type)
    const dueAt = cleanText(row.due_at)
    if (!cardId || !userId || !type || !dueAt) continue
    keys.add(`${cardId}:${userId}:${type}:${dueAt}`)
  }

  return keys
}

function triggeredReminderKinds(dueAt: string, nowMs: number) {
  const dueMs = new Date(dueAt).getTime()
  if (!Number.isFinite(dueMs)) return []

  return REMINDER_KINDS.filter((kind) => {
    const triggerAt = dueMs - kind.offsetMs
    return nowMs >= triggerAt && nowMs < triggerAt + kind.toleranceMs
  })
}

async function runReminderJob() {
  const admin = getSupabaseAdmin()
  const now = new Date()
  const nowIso = now.toISOString()
  const cards = await fetchCards(admin, nowIso)
  if (cards.length === 0) {
    return { scanned: 0, queued: 0, sent: 0, skipped: 0 }
  }

  const cardIds = cards.map((card) => card.id)
  const assigneeIdsByCard = await fetchCardAssignees(admin, cardIds)
  const recipientIds = Array.from(
    new Set(
      cards.flatMap((card) => {
        const ids = assigneeIdsByCard.get(card.id) ?? []
        if (ids.length > 0) return ids
        return card.assigned_to ? [card.assigned_to] : []
      }),
    ),
  )
  const [profilesById, boardsById, existingKeys] = await Promise.all([
    fetchProfiles(admin, recipientIds),
    fetchBoardsMap(
      admin,
      Array.from(new Set(cards.map((card) => card.board_id).filter(Boolean))),
    ),
    fetchExistingReminderKeys(admin, cardIds),
  ])

  const queued: Array<{
    cardId: string
    userId: string
    reminderType: ReminderKind["key"]
    dueAt: string
    to: string
    subject: string
    html: string
    text: string
  }> = []

  for (const card of cards) {
    if (!card.due_at) continue
    const kinds = triggeredReminderKinds(card.due_at, now.getTime())
    if (kinds.length === 0) continue

    const boardTitle = boardsById.get(card.board_id) || "Quadro"
    const boardUrl = `${baseUrl()}/boards/${encodeURIComponent(
      slugifyBoardTitle(boardTitle) || "board",
    )}?id=${encodeURIComponent(card.board_id)}&card=${encodeURIComponent(card.id)}`
    const userIds = assigneeIdsByCard.get(card.id) ?? []
    const effectiveUserIds =
      userIds.length > 0 ? userIds : card.assigned_to ? [card.assigned_to] : []

    for (const userId of effectiveUserIds) {
      const profile = profilesById.get(userId)
      if (profile?.notify_deadline_alerts === false) continue

      const email = await resolveRecipientEmail(admin, profile, userId)
      if (!email) continue

      const recipientName =
        cleanText(profile?.full_name) ||
        cleanText(profile?.display_name) ||
        email

      for (const kind of kinds) {
        const key = `${card.id}:${userId}:${kind.key}:${card.due_at}`
        if (existingKeys.has(key)) continue

        const dueAtLabel = formatDueAt(card.due_at, card.due_timezone)
        queued.push({
          cardId: card.id,
          userId,
          reminderType: kind.key,
          dueAt: card.due_at,
          to: email,
          subject: `Lembrete: ${card.title} ${kind.subject}`,
          html: buildReminderHtml({
            recipientName,
            taskTitle: card.title,
            taskDescription: cleanText(card.description),
            boardTitle,
            boardUrl,
            dueAtLabel,
            intro: kind.intro,
          }),
          text:
            `${kind.intro}\n\n` +
            `Tarefa: ${card.title}\n` +
            `Board: ${boardTitle}\n` +
            `Entrega: ${dueAtLabel}\n` +
            `${card.description ? `Descrição: ${cleanText(card.description)}\n` : ""}` +
            `Abrir: ${boardUrl}`,
        })
      }
    }
  }

  if (queued.length === 0) {
    return { scanned: cards.length, queued: 0, sent: 0, skipped: 0 }
  }

  const results = await Promise.allSettled(
    queued.map((item) =>
      sendMail({
        to: item.to,
        subject: item.subject,
        html: item.html,
        text: item.text,
      }),
    ),
  )

  const sentRows = results
    .map((result, index) => ({ result, item: queued[index] }))
    .filter((entry) => entry.result.status === "fulfilled")
    .map((entry) => ({
      card_id: entry.item.cardId,
      user_id: entry.item.userId,
      reminder_type: entry.item.reminderType,
      due_at: entry.item.dueAt,
    }))

  if (sentRows.length > 0) {
    const { error } = await admin
      .from("task_deadline_email_reminders")
      .insert(sentRows)
    if (error) {
      throw new Error(error.message)
    }
  }

  return {
    scanned: cards.length,
    queued: queued.length,
    sent: sentRows.length,
    skipped: queued.length - sentRows.length,
  }
}

async function handle(req: Request) {
  try {
    if (!validateCronSecret(req)) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
    }

    const result = await runReminderJob()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[task-deadline-reminders]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  return handle(req)
}

export async function POST(req: Request) {
  return handle(req)
}
