"use client"

import { AnimatePresence, motion } from "framer-motion"
import { AlertTriangle, MessageSquareText, Pencil, Trash2 } from "lucide-react"
import * as React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { MembersSelect } from "@/components/ui/members-select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { useAppNotifications } from "@/lib/app-notifications-context"
import {
  type CardComment,
  createCardComment,
  deleteCardComment,
  fetchCardComments,
  fetchUnreadCardCommentsCount,
} from "@/lib/card-comments"
import { supabase } from "@/lib/supabase"
import { formatDueAtLabel } from "@/lib/task-deadlines"
import { cn } from "@/lib/utils"
import type { KanbanTask } from "@/types/kanban"

interface TaskCardProps {
  task: KanbanTask
  columnColor: string
  columnTitle?: string
  isDragging?: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onEdit: () => void
  onRemove: () => void
  getLabelColor: (label: string) => string
}

function hexToRgba(hex: string, alpha: number) {
  const value = hex.replace("#", "")
  const normalized =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value

  const int = Number.parseInt(normalized, 16)
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function CommentAuthorAvatar({
  name,
  avatarUrl,
  jobTitle,
}: {
  name: string
  avatarUrl?: string | null
  jobTitle?: string | null
}) {
  const [hover, setHover] = React.useState(false)
  const label = (jobTitle ?? "").trim() || "Sem cargo"

  return (
    <div
      className="relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <motion.div
        initial={false}
        animate={{ y: hover ? -4 : 0, scale: hover ? 1.08 : 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        className="h-7 w-7"
      >
        <Avatar className="h-7 w-7 ring-1 ring-white/10">
          <AvatarImage src={avatarUrl || undefined} alt={name} />
          <AvatarFallback className="text-[8px]">
            {initials(name)}
          </AvatarFallback>
        </Avatar>
      </motion.div>

      <AnimatePresence initial={false}>
        {hover && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.14 }}
            className="pointer-events-none absolute left-1/2 top-7 z-20 w-max max-w-44 -translate-x-1/2 text-center text-[10px] font-semibold text-zinc-200 drop-shadow-[0_10px_28px_rgba(0,0,0,0.6)] break-words"
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CompactTaskPreview({
  title,
  description,
  color,
  assignees,
}: {
  title: string
  description?: string | null
  color: string
  assignees?: Array<{ id: string; name: string; imageSrc: string }>
}) {
  return (
    <div
      className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
      style={{
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="mt-1 h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <h3 className="truncate text-sm font-semibold text-white">
              {title}
            </h3>
          </div>
          {description ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-300">
              {description}
            </p>
          ) : (
            <p className="mt-1 text-xs text-zinc-500">Sem descrição.</p>
          )}
        </div>

        {assignees && assignees.length > 0 && (
          <div className="flex items-center">
            {assignees.slice(0, 3).map((a, idx) => (
              <Avatar
                key={a.id}
                className={cn(
                  "h-7 w-7 border border-white/10",
                  idx > 0 && "-ml-2",
                )}
              >
                <AvatarImage src={a.imageSrc || undefined} alt={a.name} />
                <AvatarFallback className="text-[10px]">
                  {initials(a.name)}
                </AvatarFallback>
              </Avatar>
            ))}
            {assignees.length > 3 && (
              <div className="ml-2 text-[10px] font-semibold text-zinc-300">
                +{assignees.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function TaskCard({
  task,
  columnColor,
  columnTitle,
  isDragging,
  onDragStart,
  onDragEnd,
  onEdit,
  onRemove,
  getLabelColor,
}: TaskCardProps) {
  const [isDeleteHovered, setIsDeleteHovered] = React.useState(false)
  const [isEditHovered, setIsEditHovered] = React.useState(false)
  const [openDetails, setOpenDetails] = React.useState(false)
  const [openComments, setOpenComments] = React.useState(false)
  const [unreadCount, setUnreadCount] = React.useState(0)
  const meIdRef = React.useRef<string>("")
  const [meId, setMeId] = React.useState("")
  const [commentsLoading, setCommentsLoading] = React.useState(false)
  const [commentsError, setCommentsError] = React.useState<string | null>(null)
  const [comments, setComments] = React.useState<CardComment[]>([])
  const [commentDraft, setCommentDraft] = React.useState("")
  const [posting, setPosting] = React.useState(false)
  const [meProfile, setMeProfile] = React.useState<{
    full_name: string | null
    display_name: string | null
    email: string | null
    avatar_url: string | null
  } | null>(null)
  const { pushNotification } = useAppNotifications()
  const cardColor = task.color ?? columnColor
  const dueDateLabel = React.useMemo(
    () => formatDueAtLabel(task.dueAt ?? task.dueDate),
    [task.dueAt, task.dueDate],
  )

  const meDisplayName = React.useMemo(() => {
    if (!meProfile) return ""
    return (
      meProfile.full_name ||
      meProfile.display_name ||
      meProfile.email ||
      ""
    ).trim()
  }, [meProfile])

  // localStorage is shared across accounts, so "seen" must be per-user
  const seenKey = React.useMemo(
    () => (meId ? `ft:cardCommentsSeenAt:${meId}:${task.id}` : ""),
    [meId, task.id],
  )

  const markCommentsSeenNow = React.useCallback(() => {
    if (!seenKey) return
    try {
      window.localStorage.setItem(seenKey, new Date().toISOString())
    } catch {
      // ignore
    }
    setUnreadCount(0)
  }, [seenKey])

  const refreshUnreadCount = React.useCallback(async () => {
    try {
      if (!meId) return
      if (!seenKey) return
      let sinceIso: string | null = null
      try {
        sinceIso = window.localStorage.getItem(seenKey)
      } catch {
        sinceIso = null
      }
      const count = await fetchUnreadCardCommentsCount({
        cardId: task.id,
        // if the user never opened comments for this card, count everything (excluding own)
        sinceIso: sinceIso || null,
        excludeAuthorId: meId,
      })
      setUnreadCount(count)
    } catch {
      // ignore
    }
  }, [meId, seenKey, task.id])

  const loadComments = React.useCallback(async () => {
    setCommentsLoading(true)
    setCommentsError(null)
    try {
      const rows = await fetchCardComments(task.id)
      setComments(rows)
    } catch (e) {
      setCommentsError(
        e instanceof Error
          ? e.message
          : "Não foi possível carregar comentários.",
      )
    } finally {
      setCommentsLoading(false)
    }
  }, [task.id])

  React.useEffect(() => {
    if (!openComments) return
    void loadComments()
    markCommentsSeenNow()
  }, [openComments, loadComments, markCommentsSeenNow])

  React.useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { data } = await supabase.auth.getUser()
        if (!alive) return
        const id = data.user?.id ?? ""
        meIdRef.current = id
        setMeId(id)
      } catch {
        // ignore
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  React.useEffect(() => {
    if (!meId) {
      setMeProfile(null)
      return
    }
    let alive = true
    void (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, display_name, email, avatar_url")
          .eq("id", meId)
          .maybeSingle()
        if (!alive) return
        setMeProfile(data ?? null)
      } catch {
        if (alive) setMeProfile(null)
      }
    })()
    return () => {
      alive = false
    }
  }, [meId])

  React.useEffect(() => {
    if (!meId) return
    void refreshUnreadCount()
  }, [meId, refreshUnreadCount])

  return (
    <>
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onClick={() => setOpenDetails(true)}
        className={cn(
          "cursor-grab rounded-lg border p-3 shadow-sm transition-all duration-150",
          "hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing",
          isDragging && "rotate-2 opacity-50",
        )}
        style={{
          backgroundColor: hexToRgba(cardColor, 0.22),
          borderColor: hexToRgba(cardColor, 0.5),
          boxShadow: `inset 0 1px 0 ${hexToRgba(cardColor, 0.18)}`,
        }}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex-1">
            {task.labels && task.labels.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1">
                {task.labels.map((label) => (
                  <span
                    key={label}
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white",
                      getLabelColor(label),
                    )}
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}

            <h3
              className={cn(
                "text-sm font-medium text-card-foreground",
                task.description && "mb-1",
              )}
            >
              {task.title}
            </h3>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              draggable={false}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseEnter={() => setIsEditHovered(true)}
              onMouseLeave={() => setIsEditHovered(false)}
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="rounded-md p-1.5 transition-all duration-200"
              style={{
                backgroundColor: isEditHovered
                  ? "rgba(59, 130, 246, 0.12)"
                  : "transparent",
              }}
              aria-label="Editar tarefa"
            >
              <Pencil
                className="h-4 w-4 transition-colors duration-200"
                style={{ color: isEditHovered ? "#60a5fa" : "#f4f4f5" }}
              />
            </button>

            <button
              type="button"
              draggable={false}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                setOpenComments(true)
              }}
              className="relative rounded-md p-1.5 transition-all duration-200 hover:bg-white/5"
              aria-label="Comentários"
              title="Comentários"
            >
              <MessageSquareText className="h-4 w-4 text-white" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-white/10 bg-black/90 px-1 text-[10px] font-semibold text-white shadow-[0_6px_16px_rgba(0,0,0,0.55)]">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  draggable={false}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onMouseEnter={() => setIsDeleteHovered(true)}
                  onMouseLeave={() => setIsDeleteHovered(false)}
                  className="rounded-md p-1.5 transition-all duration-200"
                  style={{
                    backgroundColor: isDeleteHovered
                      ? "rgba(239, 68, 68, 0.12)"
                      : "transparent",
                  }}
                  aria-label="Remover tarefa"
                  title="Remover tarefa"
                >
                  <Trash2
                    className="h-4 w-4 transition-colors duration-200"
                    style={{ color: isDeleteHovered ? "#ef4444" : "#f4f4f5" }}
                  />
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-500/10">
                    <AlertTriangle className="h-6 w-6 text-red-400" />
                  </div>
                  <DialogHeader className="flex-1 space-y-2 text-left">
                    <DialogTitle>Excluir tarefa</DialogTitle>
                    <DialogDescription>
                      Tem certeza que deseja excluir esta tarefa? Essa ação não
                      pode ser desfeita.
                    </DialogDescription>
                  </DialogHeader>
                </div>
                <DialogFooter className="mt-4">
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Cancelar
                    </Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemove()
                      }}
                    >
                      Excluir
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {task.description && (
          <p className="mb-2 text-xs text-muted-foreground">
            {task.description}
          </p>
        )}

        {dueDateLabel && (
          <div className="mb-2 inline-flex items-center rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-200">
            Entrega {dueDateLabel}
          </div>
        )}

        {task.assignees && task.assignees.length > 0 && (
          <div className="flex justify-end">
            <div className="flex items-center">
              {task.assignees.slice(0, 3).map((a, idx) => (
                <Avatar
                  key={a.id}
                  className={cn(
                    "h-7 w-7 border border-white/10",
                    idx > 0 && "-ml-2",
                  )}
                >
                  <AvatarImage src={a.imageSrc || undefined} alt={a.name} />
                  <AvatarFallback className="text-[10px]">
                    {initials(a.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {task.assignees.length > 3 && (
                <div className="ml-2 text-xs font-semibold text-muted-foreground">
                  +{task.assignees.length - 3}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog open={openDetails} onOpenChange={setOpenDetails}>
        <DialogContent className="w-full max-w-lg border border-white/10 bg-black/90 p-6 text-white backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="truncate">{task.title}</DialogTitle>
            {columnTitle && (
              <div className="mt-3 inline-flex max-w-[8rem] items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-200">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: columnColor }}
                />
                <span className="truncate">{columnTitle}</span>
              </div>
            )}
          </DialogHeader>

          {task.description && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-sm leading-relaxed text-zinc-200">
                {task.description}
              </p>
            </div>
          )}

          {task.assignees && task.assignees.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-medium text-zinc-400">
                Responsáveis
              </p>
              <MembersSelect
                members={task.assignees.map((a) => ({
                  id: a.id,
                  name: a.name,
                  imageSrc: a.imageSrc,
                }))}
                selectedIds={task.assignees.map((a) => a.id)}
                onChange={() => undefined}
              />
            </div>
          )}

          {dueDateLabel && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-medium text-zinc-400">
                Data de entrega
              </p>
              <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-zinc-200">
                {dueDateLabel}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Sheet
        open={openComments}
        onOpenChange={(open) => {
          setOpenComments(open)
          if (!open) {
            setCommentsError(null)
            setCommentDraft("")
            void refreshUnreadCount()
          }
        }}
      >
        <SheetContent
          side="right"
          showClose
          className="border-l border-border bg-zinc-950/95 text-foreground"
        >
          <SheetHeader>
            <SheetTitle>Comentários</SheetTitle>
            <SheetDescription>Discussão da tarefa</SheetDescription>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 py-3">
            <CompactTaskPreview
              title={task.title}
              description={task.description ?? null}
              color={cardColor}
              assignees={task.assignees}
            />

            <div className="my-2 border-t border-white/10" />

            {commentsError && (
              <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {commentsError}
              </div>
            )}

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 pb-2">
              {commentsLoading ? (
                <p className="text-sm text-zinc-400">Carregando…</p>
              ) : comments.length === 0 ? (
                <p className="text-sm text-zinc-400">
                  Ainda não há comentários.
                </p>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 overflow-hidden"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-zinc-200">
                          {c.author?.name || "Usuário"}
                        </p>
                      </div>
                      <CommentAuthorAvatar
                        name={c.author?.name || "Usuário"}
                        avatarUrl={c.author?.avatarUrl || null}
                        jobTitle={c.author?.jobTitle || null}
                      />
                    </div>
                    <div className="mt-3 border-t border-white/10 pt-3">
                      <p className="whitespace-pre-wrap break-words text-sm text-zinc-200">
                        {c.body}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-[10px] text-zinc-500">
                          {c.createdAt
                            ? new Date(c.createdAt).toLocaleString()
                            : ""}
                        </p>
                        <Dialog>
                          <DialogTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-300 transition hover:bg-red-500/10 hover:text-red-400"
                              aria-label="Excluir comentário"
                              title="Excluir comentário"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-lg">
                            <div className="flex items-start gap-4">
                              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-500/10">
                                <AlertTriangle className="h-6 w-6 text-red-400" />
                              </div>
                              <DialogHeader className="flex-1 space-y-2 text-left">
                                <DialogTitle>Excluir comentário</DialogTitle>
                                <DialogDescription>
                                  Tem certeza que deseja excluir este
                                  comentário? Essa ação não pode ser desfeita.
                                </DialogDescription>
                              </DialogHeader>
                            </div>
                            <DialogFooter className="mt-4">
                              <DialogClose asChild>
                                <Button type="button" variant="outline">
                                  Cancelar
                                </Button>
                              </DialogClose>
                              <DialogClose asChild>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  onClick={async () => {
                                    try {
                                      await deleteCardComment(c.id)
                                      await loadComments()
                                    } catch (e) {
                                      setCommentsError(
                                        e instanceof Error
                                          ? e.message
                                          : "Não foi possível excluir o comentário.",
                                      )
                                    }
                                  }}
                                >
                                  Excluir
                                </Button>
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <SheetFooter>
            <div className="w-full space-y-2">
              <Textarea
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                placeholder="Escreva um comentário…"
                rows={3}
                className="resize-none border-white/10 bg-black/40 text-sm"
              />
              <div className="flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadComments()}
                  disabled={commentsLoading || posting}
                >
                  Atualizar
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    const body = commentDraft.trim()
                    if (!body) return
                    setPosting(true)
                    try {
                      await createCardComment({ cardId: task.id, body })
                      setCommentDraft("")
                      await loadComments()
                      markCommentsSeenNow()
                      const qs = new URLSearchParams(window.location.search)
                      qs.set("card", task.id)
                      const href = `${window.location.pathname}?${qs.toString()}`
                      void pushNotification({
                        notificationType: "own_comment",
                        title: "Comentário",
                        body: `«${task.title}»`,
                        href,
                        cardId: task.id,
                        imageSrc: meProfile?.avatar_url ?? undefined,
                        actorName: meDisplayName || undefined,
                      })
                    } catch (e) {
                      setCommentsError(
                        e instanceof Error
                          ? e.message
                          : "Não foi possível enviar comentário.",
                      )
                    } finally {
                      setPosting(false)
                    }
                  }}
                  disabled={posting || !commentDraft.trim()}
                >
                  {posting ? "Enviando…" : "Comentar"}
                </Button>
              </div>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
