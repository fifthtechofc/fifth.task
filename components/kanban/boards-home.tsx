"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { fetchBoards } from "@/lib/kanban"

export function BoardsHome() {
  const router = useRouter()

  React.useEffect(() => {
    let alive = true
    async function decideStartBoard() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        const boards = await fetchBoards()
        if (!alive) return

        if (!boards.length) {
          router.replace("/boards/create")
          return
        }

        try {
          const href = window.localStorage.getItem("kanban:lastBoardHref")?.trim()
          if (href && href.startsWith("/boards/") && href !== "/boards") {
            router.replace(href)
            return
          }
        } catch {
          // ignore localStorage
        }

        // Fallback: vai para o primeiro board existente
        const first = boards[0]
        if (first?.id) {
          router.replace(`/boards/${encodeURIComponent(first.id)}?project=geral`)
        }
      } catch {
        // ignore errors
      }
    }

    void decideStartBoard()
    return () => {
      alive = false
    }
  }, [router])

  // Não renderiza um board aqui; apenas deixa o loader global aparecer enquanto redireciona.
  return null
}

