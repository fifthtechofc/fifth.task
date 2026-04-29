import { supabase } from "@/lib/supabase"

export type CardCommentAuthor = {
  id: string
  name: string
  jobTitle?: string | null
  avatarUrl?: string | null
}

export type CardComment = {
  id: string
  cardId: string
  authorId: string
  body: string
  createdAt: string
  author?: CardCommentAuthor
}

function cleanText(v: unknown) {
  return typeof v === "string" ? v.trim() : ""
}

export async function fetchCardComments(
  cardId: string,
): Promise<CardComment[]> {
  const { data, error } = await supabase
    .from("card_comments")
    .select(
      `
      id,
      card_id,
      author_id,
      body,
      created_at,
      author:profiles(id,full_name,display_name,email,avatar_url,job_title)
    `,
    )
    .eq("card_id", cardId)
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as Array<Record<string, unknown>>
  return rows.map((r) => {
    const author = (r.author ?? null) as Record<string, unknown> | null
    const name =
      cleanText(author?.full_name) ||
      cleanText(author?.display_name) ||
      cleanText(author?.email) ||
      ""
    return {
      id: cleanText(r.id),
      cardId: cleanText(r.card_id),
      authorId: cleanText(r.author_id),
      body: cleanText(r.body),
      createdAt: cleanText(r.created_at),
      author: author
        ? {
            id: cleanText(author.id),
            name: name || "Sem nome",
            jobTitle: cleanText(author.job_title) || null,
            avatarUrl: cleanText(author.avatar_url) || null,
          }
        : undefined,
    } satisfies CardComment
  })
}

export async function fetchUnreadCardCommentsCount(args: {
  cardId: string
  sinceIso?: string | null
  excludeAuthorId?: string | null
}) {
  const q = supabase
    .from("card_comments")
    .select("id", { count: "exact", head: true })
    .eq("card_id", args.cardId)

  if (args.sinceIso) q.gt("created_at", args.sinceIso)
  if (args.excludeAuthorId) q.neq("author_id", args.excludeAuthorId)

  const { count, error } = await q
  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function createCardComment(args: {
  cardId: string
  body: string
}) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) throw new Error("Usuário não autenticado.")

  const payload = {
    card_id: args.cardId,
    author_id: user.id,
    body: args.body.trim(),
  }

  const { error } = await supabase.from("card_comments").insert(payload)
  if (error) throw new Error(error.message)
}

export async function deleteCardComment(commentId: string) {
  const { error } = await supabase
    .from("card_comments")
    .delete()
    .eq("id", commentId)
  if (error) throw new Error(error.message)
}
