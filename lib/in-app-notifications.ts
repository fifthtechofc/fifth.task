import { supabase } from "@/lib/supabase"

export type AppNotification = {
  id: string
  title: string
  body?: string
  createdAt: number
  read: boolean
  imageSrc?: string | null
  href?: string
  /** Valor da coluna `type` em app_notifications */
  notificationType?: string
  actorId?: string | null
  /** Preenchido a partir de `card_id` (deep link para o modal do card). */
  cardId?: string | null
  /** Preenchido no fetch com join a profiles (ator). */
  actorName?: string
}

function cleanText(v: unknown) {
  return typeof v === "string" ? v.trim() : ""
}

type ActorProfileRow = {
  full_name?: string | null
  display_name?: string | null
  email?: string | null
  avatar_url?: string | null
}

export type AppNotificationDbRow = {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  href: string | null
  image_src: string | null
  actor_id: string | null
  card_id?: string | null
  read_at: string | null
  created_at: string
  actor?: ActorProfileRow | ActorProfileRow[] | null
}

function actorNameFromProfile(p: ActorProfileRow | null | undefined) {
  if (!p) return ""
  return (
    cleanText(p.full_name) ||
    cleanText(p.display_name) ||
    cleanText(p.email) ||
    ""
  )
}

type DbRow = AppNotificationDbRow

/** PostgREST quando a tabela ainda não existe ou não está exposta ao API. */
function isAppNotificationsUnavailable(
  error: { message?: string; code?: string } | null,
) {
  if (!error) return false
  const code = String(error.code ?? "")
  const msg = String(error.message ?? "").toLowerCase()
  if (code === "PGRST205") return true
  if (!msg.includes("app_notifications")) return false
  return (
    msg.includes("schema cache") ||
    msg.includes("does not exist") ||
    msg.includes("not found") ||
    msg.includes("could not find the table")
  )
}

/** Erros temporários do PostgREST / rede — voltar a tentar em vez de rebentar a UI. */
function isRetryableAppNotificationsError(
  error: { message?: string; code?: string } | null,
) {
  if (!error) return false
  const msg = String(error.message ?? "").toLowerCase()
  const code = String(error.code ?? "")
  if (msg.includes("schema cache")) return true
  if (msg.includes("retrying")) return true
  if (msg.includes("could not query the database")) return true
  if (code === "PGRST002" || code === "PGRST301") return true
  return false
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

let warnedSchemaMissing = false

/** false depois de erro de schema; true após qualquer operação bem-sucedida na tabela. */
let appNotificationsDbAvailable = true

export function isAppNotificationsDbAvailable() {
  return appNotificationsDbAvailable
}

/** Chamar quando o utilizador muda (novo fetch deve voltar a tentar a API). */
export function resetAppNotificationsDbAvailability() {
  appNotificationsDbAvailable = true
}

function warnOnceSchemaMissing(context: string) {
  if (warnedSchemaMissing) return
  warnedSchemaMissing = true
  console.warn(
    `[in-app-notifications] ${context}: a tabela public.app_notifications não existe no Supabase. ` +
      "Execute o ficheiro supabase/app_notifications.sql no SQL Editor e ative Realtime na tabela (Database → Replication).",
  )
}

export function mapDbRowToAppNotification(r: DbRow): AppNotification {
  const created = Date.parse(r.created_at)
  const actorRel = r.actor
  const actorOne = Array.isArray(actorRel) ? actorRel[0] : actorRel
  const actorNm = actorNameFromProfile(actorOne ?? undefined)
  const avatarFromActor = cleanText(actorOne?.avatar_url) || null

  return {
    id: r.id,
    title: cleanText(r.title) || "Notificação",
    body: cleanText(r.body) || undefined,
    createdAt: Number.isFinite(created) ? created : Date.now(),
    read: r.read_at != null && cleanText(r.read_at) !== "",
    imageSrc: cleanText(r.image_src) || avatarFromActor || null,
    href: cleanText(r.href) || undefined,
    notificationType: cleanText(r.type) || undefined,
    actorId: cleanText(r.actor_id) || null,
    cardId: cleanText(r.card_id ?? null) || null,
    actorName: actorNm || undefined,
  }
}

const APP_NOTIFICATIONS_SELECT_WITH_ACTOR = `
  id,user_id,type,title,body,href,image_src,actor_id,card_id,read_at,created_at,
  actor:profiles!app_notifications_actor_id_fkey(full_name,display_name,email,avatar_url)
`

const APP_NOTIFICATIONS_SELECT_PLAIN =
  "id,user_id,type,title,body,href,image_src,actor_id,card_id,read_at,created_at"

/** Uma linha com join ao perfil do ator (útil após insert ou Realtime). */
export async function fetchAppNotificationWithActor(
  id: string,
): Promise<AppNotification | null> {
  const first = await supabase
    .from("app_notifications")
    .select(APP_NOTIFICATIONS_SELECT_WITH_ACTOR)
    .eq("id", id)
    .maybeSingle()

  if (first.error) {
    if (isAppNotificationsUnavailable(first.error)) {
      appNotificationsDbAvailable = false
      warnOnceSchemaMissing("fetch one")
      return null
    }
    if (
      /relationship|schema cache|foreign key/i.test(String(first.error.message))
    ) {
      const plain = await supabase
        .from("app_notifications")
        .select(APP_NOTIFICATIONS_SELECT_PLAIN)
        .eq("id", id)
        .maybeSingle()
      if (plain.error || !plain.data) return null
      appNotificationsDbAvailable = true
      return mapDbRowToAppNotification(plain.data as DbRow)
    }
    return null
  }

  if (!first.data) return null
  appNotificationsDbAvailable = true
  return mapDbRowToAppNotification(first.data as DbRow)
}

async function fetchAppNotificationsAttempt(limit: number): Promise<{
  rows: AppNotification[]
  error: { message?: string; code?: string } | null
}> {
  const first = await supabase
    .from("app_notifications")
    .select(APP_NOTIFICATIONS_SELECT_WITH_ACTOR)
    .order("created_at", { ascending: false })
    .limit(limit)

  const usePlain =
    first.error &&
    !isAppNotificationsUnavailable(first.error) &&
    /relationship|schema cache|foreign key/i.test(String(first.error.message))

  const second = usePlain
    ? await supabase
        .from("app_notifications")
        .select(APP_NOTIFICATIONS_SELECT_PLAIN)
        .order("created_at", { ascending: false })
        .limit(limit)
    : null

  const data = second?.data ?? first.data
  const error = second?.error ?? first.error

  if (error) {
    return { rows: [], error }
  }
  appNotificationsDbAvailable = true
  const rows = (data ?? []) as DbRow[]
  return { rows: rows.map(mapDbRowToAppNotification), error: null }
}

export async function fetchAppNotifications(
  limit = 80,
): Promise<AppNotification[]> {
  const maxAttempts = 4
  let lastError: { message?: string; code?: string } | null = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await sleep(120 * attempt)
    }

    try {
      const { rows, error } = await fetchAppNotificationsAttempt(limit)

      if (!error) {
        return rows
      }

      lastError = error

      if (isAppNotificationsUnavailable(error)) {
        appNotificationsDbAvailable = false
        warnOnceSchemaMissing("fetch")
        return []
      }

      if (
        isRetryableAppNotificationsError(error) &&
        attempt < maxAttempts - 1
      ) {
        continue
      }

      console.warn("[in-app-notifications] fetch:", error.message ?? error)
      return []
    } catch (e) {
      const name = e instanceof Error ? e.name : ""
      const msg = e instanceof Error ? e.message : String(e)
      if (
        name === "AbortError" ||
        msg.includes("AbortError") ||
        msg.includes("steal")
      ) {
        if (attempt < maxAttempts - 1) {
          lastError = { message: msg }
          continue
        }
      }
      console.warn("[in-app-notifications] fetch exception:", e)
      return []
    }
  }

  if (lastError?.message) {
    console.warn(
      "[in-app-notifications] fetch exhausted retries:",
      lastError.message,
    )
  }
  return []
}

export async function insertMyAppNotification(args: {
  title: string
  body?: string
  href?: string
  imageSrc?: string | null
  cardId?: string | null
  /** Valor da coluna `type` (ex.: own_comment). */
  notificationType?: string
  /** @deprecated preferir notificationType */
  type?: string
}): Promise<AppNotification | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) return null

  const payload = {
    user_id: user.id,
    type: args.notificationType ?? args.type ?? "generic",
    title: args.title.trim(),
    body: args.body?.trim() || null,
    href: args.href?.trim() || null,
    image_src: args.imageSrc?.trim() || null,
    actor_id: user.id,
    card_id: args.cardId?.trim() || null,
  }

  const { data, error } = await supabase
    .from("app_notifications")
    .insert(payload)
    .select(APP_NOTIFICATIONS_SELECT_PLAIN)
    .single()

  if (error) {
    if (isAppNotificationsUnavailable(error)) {
      appNotificationsDbAvailable = false
      warnOnceSchemaMissing("insert")
    } else {
      console.error("[in-app-notifications] insert failed", error.message)
    }
    return null
  }
  appNotificationsDbAvailable = true
  const row = data as DbRow
  const enriched = await fetchAppNotificationWithActor(row.id)
  return enriched ?? mapDbRowToAppNotification(row)
}

export async function markAppNotificationRead(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("app_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)

  if (error) {
    if (isAppNotificationsUnavailable(error)) {
      appNotificationsDbAvailable = false
      warnOnceSchemaMissing("mark read")
    } else {
      console.error("[in-app-notifications] mark read failed", error.message)
    }
    return false
  }
  appNotificationsDbAvailable = true
  return true
}

export async function markAllAppNotificationsRead(): Promise<boolean> {
  const { error } = await supabase
    .from("app_notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null)

  if (error) {
    if (isAppNotificationsUnavailable(error)) {
      appNotificationsDbAvailable = false
      warnOnceSchemaMissing("mark all read")
    } else {
      console.error(
        "[in-app-notifications] mark all read failed",
        error.message,
      )
    }
    return false
  }
  appNotificationsDbAvailable = true
  return true
}
