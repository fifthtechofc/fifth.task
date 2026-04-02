"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { fetchBoards } from "@/lib/kanban"
import { useDashboardLoading } from "@/components/ui/dashboard-shell"

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

export function BoardsHome() {
  const router = useRouter()
  const { setLoading: setDashboardLoading } = useDashboardLoading()

  React.useLayoutEffect(() => {
    let alive = true
    async function decideStartBoard() {
      setDashboardLoading(true)
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
          const slug = slugify(first.title) || "board"
          router.replace(`/boards/${slug}?id=${encodeURIComponent(first.id)}`)
        }
      } catch {
        // ignore errors
      }
    }

    void decideStartBoard()
    return () => {
      alive = false
    }
  }, [router, setDashboardLoading])

  // Não renderiza um board aqui; apenas deixa o loader global aparecer enquanto redireciona.
  return null
}

