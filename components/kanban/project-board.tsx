"use client"

import * as React from "react"
import { supabase } from "@/lib/supabase"
import { fetchBoardCards, fetchBoardColumns } from "@/lib/kanban"
import { getOrCreateBoardByTitle } from "@/lib/kanban"
import { Board } from "@/components/kanban/board"

function formatProjectName(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function ProjectBoard({ project }: { project: string }) {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [boardId, setBoardId] = React.useState<string | null>(null)
  const [userId, setUserId] = React.useState<string | null>(null)

  React.useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          throw new Error("Usuário não autenticado.")
        }

        const url = new URL(window.location.href)
        const boardIdFromUrl = url.searchParams.get("id")?.trim() || null

        if (boardIdFromUrl) {
          // Validate that board exists/access is allowed by attempting to read its columns/cards.
          await Promise.all([
            fetchBoardColumns(boardIdFromUrl),
            fetchBoardCards(boardIdFromUrl),
          ])
          if (!alive) return
          setUserId(user.id)
          setBoardId(boardIdFromUrl)
          return
        }

        const title = formatProjectName(project)
        const board = await getOrCreateBoardByTitle({
          title,
          description: `Board do projeto ${title}`,
          createdBy: user.id,
        })

        if (!alive) return
        setUserId(user.id)
        setBoardId(board.id)
      } catch (e) {
        if (!alive) return
        setError(e instanceof Error ? e.message : "Não foi possível carregar o board.")
      } finally {
        if (!alive) return
        setLoading(false)
      }
    }

    void load()
    return () => {
      alive = false
    }
  }, [project])

  if (loading) {
    return null
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>
  }

  if (!boardId || !userId) {
    return <p className="text-sm text-muted-foreground">Board não disponível.</p>
  }

  // Persist last accessed board for sidebar/home.
  try {
    if (typeof window !== "undefined") {
      const href = `${window.location.pathname}${window.location.search}`
      window.localStorage.setItem("kanban:lastBoardHref", href)
      window.localStorage.setItem("kanban:lastBoardId", boardId)
      window.localStorage.setItem("kanban:lastBoardAt", String(Date.now()))
      // per-board timestamp for sorting
      window.localStorage.setItem(`kanban:boardLastAt:${boardId}`, String(Date.now()))
    }
  } catch {
    // ignore storage errors
  }

  return <Board boardId={boardId} userId={userId} />
}

