"use client"

import * as React from "react"
import { supabase } from "@/lib/supabase"
import {
  fetchBoardById,
  fetchBoardBySlug,
  fetchBoardCards,
  fetchBoardColumns,
  getBoardDisplayTitle,
  getOrCreateBoardByTitle,
  isUuidLike,
  updateBoard,
  removeBoard,
} from "@/lib/kanban"
import { Board } from "@/components/kanban/board"
import { GlowCard } from "@/components/ui/spotlight-card"
import { Pencil, Trash2, AlertTriangle } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ColorPicker } from "@/components/ui/color-picker"
import { Button } from "@/components/ui/button"
import { useDashboardLoading } from "@/components/ui/dashboard-shell"

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
  const [boardTitle, setBoardTitle] = React.useState<string | null>(null)
  const [boardDescription, setBoardDescription] = React.useState<string | null>(null)
  const [backgroundColor, setBackgroundColor] = React.useState<string | null>(null)
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null)
  const [editingBoard, setEditingBoard] = React.useState(false)
  const [boardTitleDraft, setBoardTitleDraft] = React.useState("")
  const [boardDescriptionDraft, setBoardDescriptionDraft] = React.useState("")
  const [backgroundColorDraft, setBackgroundColorDraft] = React.useState("#0f172a")
  const [logoUrlDraft, setLogoUrlDraft] = React.useState<string | null>(null)
  const [savingBoard, setSavingBoard] = React.useState(false)
  const [deletingBoard, setDeletingBoard] = React.useState(false)
  const { setLoading: setDashboardLoading, showAlert } = useDashboardLoading()

  React.useLayoutEffect(() => {
    // Mantém o loader global ativo durante a resolução do board.
    // Quem desliga "de vez" é o componente `Board` quando terminar de carregar colunas/cards.
    if (loading) setDashboardLoading(true)
  }, [loading, setDashboardLoading])

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

          const { data: boardRow } = await supabase
            .from("boards")
            .select("id,title,description,background_color,logo_url")
            .eq("id", boardIdFromUrl)
            .maybeSingle()

          if (!alive) return
          setUserId(user.id)
          setBoardId(boardIdFromUrl)
          setBoardTitle(boardRow?.title ?? formatProjectName(project))
          setBoardDescription(boardRow?.description ?? null)
          setBackgroundColor(boardRow?.background_color ?? null)
          setLogoUrl(boardRow?.logo_url ?? null)
          return
        }

        // Compatibilidade com URLs antigas que usavam o id no segmento da rota
        // em vez de /boards/<slug>?id=<boardId>.
        const resolvedExistingBoard = isUuidLike(project)
          ? await fetchBoardById(project)
          : await fetchBoardBySlug(project)

        if (resolvedExistingBoard) {
          if (!alive) return
          setUserId(user.id)
          setBoardId(resolvedExistingBoard.id)
          setBoardTitle(resolvedExistingBoard.title)
          setBoardDescription(resolvedExistingBoard.description)
          setBackgroundColor(resolvedExistingBoard.background_color ?? null)
          setLogoUrl(resolvedExistingBoard.logo_url ?? null)
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
        setBoardTitle(board.title)
        setBoardDescription(board.description)
        setBackgroundColor(board.background_color ?? null)
        setLogoUrl(board.logo_url ?? null)
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

  const heading = getBoardDisplayTitle(boardTitle ?? formatProjectName(project))
  const isDefaultLogo = !logoUrl
  const effectiveLogoUrl = isDefaultLogo ? "/Logo.png" : logoUrl

  const handleOpenEditBoard = () => {
    setBoardTitleDraft(heading)
    setBoardDescriptionDraft(boardDescription ?? "")
    setBackgroundColorDraft(backgroundColor ?? "#0f172a")
    setLogoUrlDraft(logoUrl ?? null)
    setEditingBoard(true)
  }

  const handleSaveBoard = async () => {
    if (!boardId) return
    const nextTitle = boardTitleDraft.trim() || heading
    setSavingBoard(true)
    try {
      const updated = await updateBoard({
        id: boardId,
        title: nextTitle,
        description: boardDescriptionDraft,
        backgroundColor: backgroundColorDraft,
        logoUrl: logoUrlDraft ?? null,
      })
      setBoardTitle(updated.title)
      setBoardDescription(updated.description)
      setBackgroundColor(updated.background_color)
      setLogoUrl(updated.logo_url)
      setEditingBoard(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar o quadro.")
    } finally {
      setSavingBoard(false)
    }
  }

  const handleDeleteBoard = async () => {
    if (!boardId) return
    setDeletingBoard(true)
    setDashboardLoading(true)
    try {
      await removeBoard(boardId)
      showAlert({
        variant: "success",
        title: "Quadro excluído",
        description: "O quadro e suas colunas foram removidos com sucesso.",
      })
      // dá tempo do alerta aparecer antes da navegação
      setTimeout(() => {
        window.location.href = "/boards/create"
      }, 1200)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao excluir o quadro.")
      setDashboardLoading(false)
    } finally {
      setDeletingBoard(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <GlowCard
        glowColor="blue"
        customSize
        className="w-full max-w-6xl border border-zinc-600/70 bg-background/80 px-5 py-4"
      >
        <div className="flex items-center gap-6">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              {heading}
            </h1>
            {boardDescription && (
              <p className="mt-1 max-w-2xl truncate text-sm text-muted-foreground">
                {boardDescription}
              </p>
            )}
          </div>

          <div className="hidden shrink-0 sm:flex sm:justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full shadow-[0_0_20px_rgba(255,255,255,0.35)]">
              <img
                src={effectiveLogoUrl}
                alt="Logo do quadro"
                className={`h-12 w-12 object-contain ${isDefaultLogo ? "brightness-0 invert" : ""}`}
              />
            </div>
          </div>

          <div className="flex flex-1 shrink-0 items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleOpenEditBoard}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Editar quadro</span>
            </button>
          </div>
        </div>
      </GlowCard>

      <Board
        boardId={boardId}
        userId={userId}
        boardProjectSlug={project}
        boardTitle={boardTitle ?? undefined}
      />

      <Sheet
        open={editingBoard}
        onOpenChange={(open) => {
          if (!open) setEditingBoard(false)
        }}
      >
        <SheetContent side="right" showClose className="border-l border-border bg-zinc-950/95 text-foreground">
          <SheetHeader>
            <SheetTitle>Editar quadro</SheetTitle>
            <SheetDescription>
              Atualize o nome, descrição e cor de fundo deste quadro.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4 py-3">
            <div className="space-y-2">
              <label htmlFor="board-title-edit" className="text-xs font-medium text-muted-foreground">
                Nome do quadro
              </label>
              <Input
                id="board-title-edit"
                value={boardTitleDraft}
                onChange={(e) => setBoardTitleDraft(e.target.value)}
                placeholder="Nome do quadro"
                className="border-white/15 bg-black/40"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="board-desc-edit" className="text-xs font-medium text-muted-foreground">
                Descrição
              </label>
              <Textarea
                id="board-desc-edit"
                value={boardDescriptionDraft}
                onChange={(e) => setBoardDescriptionDraft(e.target.value)}
                placeholder="Descrição do quadro (opcional)"
                rows={3}
                className="border-white/15 bg-black/40"
              />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Cor de fundo</span>
              <div className="flex items-center gap-3">
                <ColorPicker
                  value={backgroundColorDraft}
                  hideContrastRatio
                  className="z-50"
                  onValueChange={(val) => setBackgroundColorDraft(val.hex)}
                >
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs"
                  >
                    <span>Escolher cor</span>
                    <span
                      className="h-4 w-4 rounded-md border border-border"
                      style={{ backgroundColor: backgroundColorDraft }}
                    />
                    <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                      {backgroundColorDraft}
                    </span>
                  </button>
                </ColorPicker>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Logo do quadro</span>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-black/40 shadow-[0_0_18px_rgba(255,255,255,0.35)]">
                  <img
                    src={logoUrlDraft ?? "/Logo.png"}
                    alt="Preview da logo"
                    className="h-8 w-8 object-contain"
                  />
                </div>
                <label className="inline-flex cursor-pointer items-center rounded-md border border-white/15 bg-black/40 px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-black/60">
                  <span>Enviar nova logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file || !boardId) return

                      try {
                        const path = `${boardId}/${Date.now()}-${file.name}`
                        const { error: uploadError } = await supabase.storage
                          .from("board-logos")
                          .upload(path, file, { upsert: true })
                        if (uploadError) throw uploadError

                        const { data } = supabase.storage.from("board-logos").getPublicUrl(path)
                        if (data?.publicUrl) {
                          setLogoUrlDraft(data.publicUrl)
                        }
                      } catch (e) {
                        setError(
                          e instanceof Error
                            ? e.message
                            : "Falha ao enviar a logo. Verifique o bucket 'board-logos'.",
                        )
                      } finally {
                        // limpa o input para permitir re-upload do mesmo arquivo se necessário
                        e.target.value = ""
                      }
                    }}
                  />
                </label>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Se nenhuma logo for enviada, usamos a padrão do sistema.
              </p>
            </div>
          </div>

          <SheetFooter className="flex-row items-center justify-between gap-3">
            {boardId && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    disabled={savingBoard || deletingBoard}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir quadro
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-500/10">
                      <AlertTriangle className="h-6 w-6 text-red-400" />
                    </div>
                    <DialogHeader className="flex-1 space-y-2 text-left">
                      <DialogTitle>Excluir quadro</DialogTitle>
                      <DialogDescription>
                        Tem certeza que deseja excluir este quadro? Todas as colunas e tarefas serão removidas.
                        Essa ação não pode ser desfeita.
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
                        onClick={() => {
                          void handleDeleteBoard()
                        }}
                        disabled={deletingBoard}
                      >
                        {deletingBoard ? "Excluindo..." : "Excluir"}
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingBoard(false)}
                disabled={savingBoard}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={handleSaveBoard} disabled={savingBoard}>
                {savingBoard ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

