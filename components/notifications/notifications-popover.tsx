"use client"

import * as React from "react"
import Link from "next/link"
import { Bell } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

import { useAppNotifications } from "@/lib/app-notifications-context"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  appNotificationClickHref,
  getNotificationLineSegments,
  notificationAvatarInitials,
  stripGuillemets,
} from "@/lib/notification-display"

function Dot({ className }: { className?: string }) {
  return (
    <span
      className={`size-1.5 shrink-0 rounded-full bg-white ${className ?? ""}`}
      aria-hidden="true"
    />
  )
}

function timeLabel(ts: number) {
  try {
    return formatDistanceToNow(ts, { addSuffix: true, locale: ptBR })
  } catch {
    return ""
  }
}

export function NotificationsPopover() {
  const { items, unreadCount, markAllRead, markRead } = useAppNotifications()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="relative shrink-0 border-white/15 bg-black/40 text-zinc-100 hover:bg-white/10 hover:text-white"
          aria-label="Abrir notificações"
        >
          <Bell size={18} strokeWidth={2} aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-1.5 left-full flex h-5 min-w-5 -translate-x-1/2 items-center justify-center rounded-full border border-white/20 bg-zinc-900 px-1 text-[10px] font-bold leading-none text-white shadow-sm"
              aria-hidden="true"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 max-h-[min(420px,var(--radix-popover-content-available-height))] overflow-hidden border border-white/10 bg-zinc-950/95 p-0 text-zinc-100 shadow-2xl shadow-black/40 backdrop-blur-xl"
      >
        <div className="flex items-baseline justify-between gap-4 px-3 py-2.5">
          <div className="text-sm font-semibold tracking-tight">Notificações</div>
          {unreadCount > 0 && (
            <button
              type="button"
              className="text-xs font-medium text-zinc-400 hover:text-white hover:underline"
              onClick={markAllRead}
            >
              Marcar todas como lidas
            </button>
          )}
        </div>
        <div role="separator" aria-orientation="horizontal" className="h-px bg-white/10" />
        <div className="max-h-[min(340px,calc(var(--radix-popover-content-available-height)-4rem))] overflow-y-auto overflow-x-hidden p-1">
          {items.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-zinc-500">Nada por aqui ainda.</div>
          ) : (
            items.map((notification) => {
              const segments = getNotificationLineSegments(notification)
              const initials = notificationAvatarInitials(notification)

              const inner = (
                <>
                  <Avatar className="size-10 shrink-0 rounded-lg border border-white/10">
                    {notification.imageSrc ? (
                      <AvatarImage src={notification.imageSrc} alt="" />
                    ) : null}
                    <AvatarFallback className="rounded-lg bg-white/10 text-xs font-medium text-zinc-200">
                      {initials || "•"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-1 pe-6">
                    <div className="text-sm leading-snug">
                      {segments ? (
                        segments.map((s, i) => (
                          <span
                            key={`${notification.id}-${i}`}
                            className={
                              s.emphasis ? "font-semibold text-white" : "font-normal text-zinc-400"
                            }
                          >
                            {s.text}
                          </span>
                        ))
                      ) : (
                        <>
                          <span className="font-semibold text-white">
                            {stripGuillemets(notification.title)}
                          </span>
                          {notification.body ? (
                            <span className="font-normal text-zinc-400">
                              {" "}
                              {stripGuillemets(notification.body)}
                            </span>
                          ) : null}
                        </>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500">{timeLabel(notification.createdAt)}</div>
                  </div>
                  {!notification.read && (
                    <div className="absolute end-2 top-1/2 -translate-y-1/2">
                      <Dot />
                    </div>
                  )}
                </>
              )

              const rowClass =
                "relative flex w-full items-start gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-white/5"

              const targetHref = appNotificationClickHref(notification)
              return targetHref ? (
                <Link
                  key={notification.id}
                  href={targetHref}
                  className={rowClass}
                  onClick={() => markRead(notification.id)}
                >
                  {inner}
                </Link>
              ) : (
                <button
                  key={notification.id}
                  type="button"
                  className={rowClass}
                  onClick={() => markRead(notification.id)}
                >
                  {inner}
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
