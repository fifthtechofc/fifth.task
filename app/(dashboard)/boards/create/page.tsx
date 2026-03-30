"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { createBoard, getOrCreateBoardByTitle } from "@/lib/kanban"

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

export default function CreateBoardProjectPage() {
  const router = useRouter()
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const t = title.trim()
    if (!t) return

    setSaving(true)
    setError(null)
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error("Usuário não autenticado.")
      }

      let boardId: string | null = null
      try {
        const created = await createBoard({
          title: t,
          description,
          createdBy: user.id,
        })
        boardId = created.id
      } catch {
        const existing = await getOrCreateBoardByTitle({
          title: t,
          description,
          createdBy: user.id,
        })
        boardId = existing.id
      }

      const slug = slugify(t) || "board"
      router.push(`/boards/${slug}?id=${encodeURIComponent(boardId ?? "")}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar board.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="min-h-full p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold text-foreground">Criar board</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Crie um board para organizar colunas, cards e checklists.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-6 backdrop-blur-sm"
        >
          {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

          <div className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Título
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Projeto Atlas"
                className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-foreground outline-none placeholder:text-zinc-500 focus:border-white/20"
                disabled={saving}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Descrição (opcional)
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="O que esse board vai acompanhar?"
                rows={4}
                className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-foreground outline-none placeholder:text-zinc-500 focus:border-white/20"
                disabled={saving}
              />
            </label>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving || !title.trim()}
                className="inline-flex h-11 items-center justify-center rounded-full bg-white/90 px-5 text-xs font-semibold uppercase tracking-[0.18em] text-black transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Criando…" : "Criar board"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/boards")}
                disabled={saving}
                className="h-11 rounded-full border border-white/15 bg-white/5 px-5 text-xs font-semibold uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-white/10 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  )
}
