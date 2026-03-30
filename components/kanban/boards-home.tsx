"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ProjectBoard } from "@/components/kanban/project-board"

export function BoardsHome() {
  const router = useRouter()

  React.useEffect(() => {
    try {
      const href = window.localStorage.getItem("kanban:lastBoardHref")?.trim()
      if (href && href.startsWith("/boards/") && href !== "/boards") {
        router.replace(href)
      }
    } catch {
      // ignore
    }
  }, [router])

  return <ProjectBoard project="geral" />
}

