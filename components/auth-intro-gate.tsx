"use client"

import { useEffect, useState, useSyncExternalStore } from "react"

import { SimpleIntroSplash } from "@/components/ui/simple-intro-splash"
import { AUTH_INTRO_STORAGE_KEY } from "@/lib/intro-storage"

function subscribeToIntroStorage(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange)
  return () => window.removeEventListener("storage", onStoreChange)
}

function getClientIntroPhase() {
  try {
    return sessionStorage.getItem(AUTH_INTRO_STORAGE_KEY) === "1"
      ? "done"
      : "splash"
  } catch {
    return "splash"
  }
}

export function AuthIntroGate({ children }: { children: React.ReactNode }) {
  const [dismissedSplash, setDismissedSplash] = useState(false)
  const persistedPhase = useSyncExternalStore(
    subscribeToIntroStorage,
    getClientIntroPhase,
    () => "splash",
  )
  const phase = dismissedSplash || persistedPhase === "done" ? "done" : "splash"

  useEffect(() => {
    // cleanup: a tela do dashboard pode travar o loader no logout
    try {
      sessionStorage.removeItem("ft:forceDashboardLoader")
    } catch {
      // ignore
    }
  }, [])

  if (phase === "splash") {
    return (
      <SimpleIntroSplash
        onSequenceComplete={() => {
          try {
            sessionStorage.setItem(AUTH_INTRO_STORAGE_KEY, "1")
          } catch {
            /* private mode / blocked storage */
          }
          setDismissedSplash(true)
        }}
      />
    )
  }

  return <>{children}</>
}
