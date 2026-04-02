"use client"

import * as React from "react"
import { supabase } from "@/lib/supabase"
import {
  fetchAppNotifications,
  fetchAppNotificationWithActor,
  insertMyAppNotification,
  markAllAppNotificationsRead,
  markAppNotificationRead,
  mapDbRowToAppNotification,
  resetAppNotificationsDbAvailability,
  isAppNotificationsDbAvailable,
  type AppNotification,
  type AppNotificationDbRow,
} from "@/lib/in-app-notifications"

export type { AppNotification }

type PushInput = Omit<AppNotification, "id" | "createdAt" | "read"> & {
  id?: string
  createdAt?: number
  read?: boolean
  type?: string
}

const MAX_ITEMS = 80

function localStorageKey(userId: string) {
  return `ft:appNotifications:v1:${userId}`
}

function loadLocalNotifications(userId: string): AppNotification[] {
  try {
    const raw = localStorage.getItem(localStorageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (x): x is AppNotification =>
          typeof x === "object" &&
          x !== null &&
          typeof (x as AppNotification).id === "string" &&
          typeof (x as AppNotification).title === "string" &&
          typeof (x as AppNotification).createdAt === "number" &&
          typeof (x as AppNotification).read === "boolean",
      )
      .slice(0, MAX_ITEMS)
  } catch {
    return []
  }
}

function saveLocalNotifications(userId: string, items: AppNotification[]) {
  try {
    localStorage.setItem(localStorageKey(userId), JSON.stringify(items.slice(0, MAX_ITEMS)))
  } catch {
    // ignore
  }
}

type Ctx = {
  items: AppNotification[]
  unreadCount: number
  pushNotification: (n: PushInput) => Promise<void>
  markAllRead: () => void
  markRead: (id: string) => void
  /** Volta a carregar da base (útil após RPC/trigger se o Realtime não estiver ativo). */
  refreshNotifications: () => void
}

const AppNotificationsContext = React.createContext<Ctx | null>(null)

function mergeIncoming(prev: AppNotification[], next: AppNotification) {
  if (prev.some((p) => p.id === next.id)) return prev
  return [next, ...prev].slice(0, MAX_ITEMS)
}

export function AppNotificationsProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = React.useState<string | null>(null)
  const [items, setItems] = React.useState<AppNotification[]>([])
  const [feedSource, setFeedSource] = React.useState<"pending" | "db" | "local">("pending")
  const refreshDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    let cancelled = false
    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setUserId(data.session?.user?.id ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null)
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  React.useEffect(() => {
    resetAppNotificationsDbAvailability()
    setFeedSource("pending")
  }, [userId])

  React.useEffect(() => {
    return () => {
      if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current)
    }
  }, [])

  const refresh = React.useCallback(async () => {
    if (!userId) {
      setItems([])
      setFeedSource("pending")
      return
    }
    try {
      const rows = await fetchAppNotifications(MAX_ITEMS)
      if (!isAppNotificationsDbAvailable()) {
        setItems(loadLocalNotifications(userId))
        setFeedSource("local")
        return
      }
      setItems(rows)
      setFeedSource("db")
    } catch (e) {
      console.error("[app-notifications] fetch failed", e)
      setItems(loadLocalNotifications(userId))
      setFeedSource("local")
    }
  }, [userId])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  React.useEffect(() => {
    if (!userId || feedSource !== "db") return

    const channel = supabase
      .channel(`app-notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "app_notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const raw = payload.new as AppNotificationDbRow & { id?: string }
          const id = typeof raw.id === "string" ? raw.id : null
          if (!id) {
            void refresh()
            return
          }
          void (async () => {
            try {
              const enriched = await fetchAppNotificationWithActor(id)
              const row = enriched ?? mapDbRowToAppNotification(raw as AppNotificationDbRow)
              setItems((prev) => mergeIncoming(prev, row))
            } catch {
              void refresh()
            }
          })()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId, feedSource, refresh])

  React.useEffect(() => {
    if (!userId || feedSource !== "local") return
    saveLocalNotifications(userId, items)
  }, [items, userId, feedSource])

  const pushNotification = React.useCallback(
    async (n: PushInput) => {
      const row = await insertMyAppNotification({
        title: n.title,
        body: n.body,
        href: n.href,
        imageSrc: n.imageSrc,
        cardId: n.cardId,
        notificationType: n.notificationType ?? n.type,
      })
      if (row) {
        setFeedSource("db")
        setItems((prev) => mergeIncoming(prev, row))
        return
      }
      if (!isAppNotificationsDbAvailable()) {
        const localRow: AppNotification = {
          id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `local-${Date.now()}`,
          title: n.title,
          body: n.body,
          createdAt: n.createdAt ?? Date.now(),
          read: n.read ?? false,
          imageSrc: n.imageSrc,
          href: n.href,
          notificationType: n.notificationType ?? n.type,
          actorName: n.actorName,
          cardId: n.cardId ?? null,
        }
        setFeedSource("local")
        setItems((prev) => mergeIncoming(prev, localRow))
      }
    },
    [],
  )

  const markAllRead = React.useCallback(() => {
    setItems((prev) => prev.map((x) => ({ ...x, read: true })))
    if (feedSource === "db") {
      void markAllAppNotificationsRead()
    }
  }, [feedSource])

  const markRead = React.useCallback(
    (id: string) => {
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, read: true } : x)))
      if (feedSource === "db") {
        void markAppNotificationRead(id)
      }
    },
    [feedSource],
  )

  const unreadCount = React.useMemo(() => items.filter((x) => !x.read).length, [items])

  const refreshNotifications = React.useCallback(() => {
    if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current)
    refreshDebounceRef.current = setTimeout(() => {
      refreshDebounceRef.current = null
      void refresh()
    }, 280)
  }, [refresh])

  const value = React.useMemo(
    () => ({
      items,
      unreadCount,
      pushNotification,
      markAllRead,
      markRead,
      refreshNotifications,
    }),
    [items, unreadCount, pushNotification, markAllRead, markRead, refreshNotifications],
  )

  return <AppNotificationsContext.Provider value={value}>{children}</AppNotificationsContext.Provider>
}

export function useAppNotifications(): Ctx {
  const ctx = React.useContext(AppNotificationsContext)
  if (!ctx) {
    return {
      items: [],
      unreadCount: 0,
      pushNotification: async () => undefined,
      markAllRead: () => undefined,
      markRead: () => undefined,
      refreshNotifications: () => undefined,
    }
  }
  return ctx
}
