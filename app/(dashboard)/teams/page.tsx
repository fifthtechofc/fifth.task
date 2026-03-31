 "use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"

import { AvatarHoverCard } from "@/components/ui/avatar-hover-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { getTeamMembers, type TeamMember } from "@/lib/profile"
import { useDashboardLoading } from "@/components/ui/dashboard-shell"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { Crown, Pencil, Plus } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { MembersSelect } from "@/components/ui/members-select"

function getStatusClasses(status: TeamMember["status"]) {
  if (status === "online") return "bg-emerald-400"
  if (status === "focus") return "bg-amber-400"
  return "bg-zinc-500"
}

export default function TeamsPage() {
  const searchParams = useSearchParams()
  const teamId = searchParams.get("teamId")
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { setLoading: setDashboardLoading } = useDashboardLoading()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [allProfiles, setAllProfiles] = useState<TeamMember[]>([])
  const [teamName, setTeamName] = useState<string | null>(null)
  const [teamDescription, setTeamDescription] = useState<string | null>(null)
  const [teamRolesByMember, setTeamRolesByMember] = useState<Record<string, string | null>>({})
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [savingTeam, setSavingTeam] = useState(false)
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set())

  const isCurrentUserLeader =
    !!teamId &&
    !!currentUserId &&
    teamRolesByMember[currentUserId] &&
    teamRolesByMember[currentUserId] === "Líder"

  useEffect(() => {
    if (teamName) {
      setEditName(teamName)
    }
    if (teamDescription ?? undefined) {
      setEditDescription(teamDescription ?? "")
    }
  }, [teamName, teamDescription])

  // sempre que abrirmos o sheet de edição, sincroniza seleção com membros atuais do time
  useEffect(() => {
    if (!editOpen || !teamId) return
    const currentIds = Object.keys(teamRolesByMember ?? {})
    setSelectedMemberIds(new Set(currentIds))
  }, [editOpen, teamId, teamRolesByMember])

  async function handleSaveTeam() {
    if (!teamId || !editName.trim() || !isCurrentUserLeader) return
    setSavingTeam(true)
    try {
      const { error } = await supabase
        .from("teams")
        .update({
          name: editName.trim(),
          description: editDescription.trim() || null,
        })
        .eq("id", teamId)

      if (error) {
        throw error
      }

      setTeamName(editName.trim())
      setTeamDescription(editDescription.trim() || null)
      // calcula diff de membros
      const currentIds = new Set(Object.keys(teamRolesByMember ?? {}))
      const nextIds = new Set(selectedMemberIds)

      const toAdd: string[] = []
      const toRemove: string[] = []

      nextIds.forEach((id) => {
        if (!currentIds.has(id)) toAdd.push(id)
      })
      currentIds.forEach((id) => {
        if (!nextIds.has(id)) toRemove.push(id)
      })

      if (toAdd.length > 0) {
        const insertPayload = toAdd.map((profileId) => ({
          team_id: teamId,
          profile_id: profileId,
          role: teamRolesByMember[profileId] ?? "Membro",
        }))
        const { error: insertError } = await supabase.from("team_members").insert(insertPayload)
        if (insertError) throw insertError
      }

      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from("team_members")
          .delete()
          .eq("team_id", teamId)
          .in("profile_id", toRemove)
        if (deleteError) throw deleteError
      }

      // atualiza estado local de roles e membros
      const nextRoleMap: Record<string, string | null> = {}
      nextIds.forEach((id) => {
        nextRoleMap[id] = teamRolesByMember[id] ?? "Membro"
      })
      setTeamRolesByMember(nextRoleMap)
      setMembers(allProfiles.filter((m) => nextRoleMap[m.id]))
      setEditOpen(false)
    } catch (err) {
      console.error("Erro ao salvar time:", err)
    } finally {
      setSavingTeam(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setDashboardLoading(true)
    setError(null)
    if (!teamId) {
      // visão geral: todos os membros
      Promise.all([
        getTeamMembers(),
        supabase.auth.getUser().then(({ data }) => data.user ?? null),
      ])
        .then(([data, user]) => {
          if (cancelled) return
          setMembers(data)
          setAllProfiles(data)
          setCurrentUserId(user?.id ?? null)
          setTeamName(null)
          setTeamDescription(null)
          setTeamRolesByMember({})
        })
        .catch((err) => {
          if (cancelled) return
          setError(err instanceof Error ? err.message : "Não foi possível carregar o time.")
        })
        .finally(() => {
          if (cancelled) return
          setLoading(false)
          setDashboardLoading(false)
        })
      return () => {
        cancelled = true
      }
    }

    // visão de um time específico
    Promise.all([
      getTeamMembers(),
      supabase
        .from("team_members")
        .select("profile_id, role, teams(name, description)")
        .eq("team_id", teamId),
      supabase.auth.getUser().then(({ data }) => data.user ?? null),
    ])
      .then(([allMembers, { data: teamMembersData, error: teamMembersError }, user]) => {
        if (cancelled) return
        if (teamMembersError) {
          throw teamMembersError
        }

        const roleMap: Record<string, string | null> = {}
        let tName: string | null = null
        let tDescription: string | null = null

        ;(teamMembersData ?? []).forEach((row: any) => {
          if (row.profile_id) {
            roleMap[String(row.profile_id)] = row.role ?? null
          }
          if (row.teams && !tName) {
            tName = row.teams.name ?? null
            tDescription = row.teams.description ?? null
          }
        })

        const filteredMembers = allMembers.filter((m) => roleMap[m.id])

        setAllProfiles(allMembers)
        setMembers(filteredMembers)
        setCurrentUserId(user?.id ?? null)
        setTeamRolesByMember(roleMap)
        setTeamName(tName)
        setTeamDescription(tDescription)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Não foi possível carregar o time.")
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
        setDashboardLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [teamId, setDashboardLoading])

  const viewMembers = useMemo(() => {
    if (loading) return []
    // Em visão de time específico, fixa o líder no topo
    if (teamId) {
      return [...members].sort((a, b) => {
        const aLeader = teamRolesByMember[a.id] === "Líder"
        const bLeader = teamRolesByMember[b.id] === "Líder"
        if (aLeader === bLeader) return 0
        return aLeader ? -1 : 1
      })
    }
    return members
  }, [loading, members, teamId, teamRolesByMember])

  return (
    <section className="relative min-h-full p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
              {teamName ? "Time" : "Times"}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-foreground md:text-4xl">
              {teamName || "Pessoas que movem o workspace"}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground md:text-base">
              {teamDescription && teamName
                ? teamDescription
                : "Uma visao rapida dos perfis principais do time, com acesso rapido para contato e acompanhamento."}
            </p>
            {error && (
              <p className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            )}
          </div>

          {teamId && teamName && isCurrentUserLeader && (
            <Sheet open={editOpen} onOpenChange={setEditOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition-colors hover:bg-white/10"
                  aria-label="Editar time"
                  title="Editar time"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </SheetTrigger>
              <SheetContent
                side="right"
                showClose
                className="border-l border-white/10 bg-zinc-950/95 text-foreground"
              >
                <SheetHeader>
                  <SheetTitle>Editar time</SheetTitle>
                  <SheetDescription>
                    Ajuste o nome e a descrição deste time.
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-4 space-y-4 px-2">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-zinc-300">Nome do time</p>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Nome do time"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-zinc-300">Descrição</p>
                    <Textarea
                      rows={3}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Descreva o foco deste time."
                    />
                  </div>
                  <div className="space-y-2">
                    <MembersSelect
                      label="Membros deste time"
                      buttonLabel="Membros deste time"
                      members={allProfiles.map((m) => ({
                        id: m.id,
                        name: m.name,
                        imageSrc: m.imageSrc,
                      }))}
                      selectedIds={[...selectedMemberIds]}
                      onChange={(ids) => setSelectedMemberIds(new Set(ids))}
                    />
                  </div>
                </div>

                <SheetFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditOpen(false)}
                    disabled={savingTeam}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveTeam}
                    disabled={!editName.trim() || savingTeam}
                  >
                    {savingTeam ? "Salvando..." : "Salvar alterações"}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          )}
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {viewMembers.map((member) => (
            <div
              key={member.id}
              className="overflow-visible rounded-[28px] border border-white/10 bg-black/35 p-6 backdrop-blur-sm cursor-pointer transition-colors hover:border-white/20"
              onClick={() => {
                setSelectedMember(member)
                setProfileDialogOpen(true)
              }}
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{member.name}</p>
                  {member.role && (
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      {member.role}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {teamRolesByMember[member.id] === "Líder" && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/25 bg-white/5 text-white">
                      <Crown className="h-3 w-3" />
                    </span>
                  )}
                  {member.status && (
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${getStatusClasses(member.status)}`}
                    />
                  )}
                </div>
              </div>

              <div className="relative z-20 flex items-start justify-center py-4">
                <AvatarHoverCard
                  imageSrc={member.imageSrc}
                  imageAlt={member.name}
                  name={member.name}
                  username={member.username}
                  variant="glass"
                  size="lg"
                />
              </div>

              {member.description && (
                <p className="mt-5 text-sm leading-6 text-muted-foreground">
                  {member.description}
                </p>
              )}
            </div>
          ))}

          {teamId && isCurrentUserLeader && (
            <button
              type="button"
              onClick={() => {
                setEditOpen(true)
                setMembersCollapsed(false)
              }}
              className="flex min-h-[220px] items-center justify-center rounded-[28px] border border-dashed border-white/15 bg-black/20 px-6 py-6 text-center text-sm text-zinc-300 transition-colors hover:border-white/35 hover:bg-black/30"
            >
              <div className="flex flex-col items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/5 text-white">
                  <Plus className="h-5 w-5" />
                </span>
                <span className="max-w-[14rem]">
                  Clique para adicionar{" "}
                  <span className="font-semibold text-white">novos membros</span> a este time
                </span>
              </div>
            </button>
          )}
        </div>
      </div>

      <Dialog open={profileDialogOpen && !!selectedMember} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="w-full max-w-xl border border-white/10 bg-black/90 p-6 text-white backdrop-blur-xl">
          {selectedMember && (
            <>
              <DialogHeader>
                <DialogTitle>Perfil</DialogTitle>
                <DialogDescription>
                  Visualização do perfil de {selectedMember.name}. Apenas seu próprio perfil pode
                  ser editado pelas configurações.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20 border border-white/15">
                    <AvatarImage src={selectedMember.imageSrc} alt={selectedMember.name} />
                    <AvatarFallback className="bg-white/10 text-sm font-semibold text-white">
                      {selectedMember.name
                        .split(" ")
                        .map((p) => p[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-white">
                      {selectedMember.name}
                    </p>
                    {selectedMember.role && (
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                        {selectedMember.role}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-3 w-3 rounded-full",
                      selectedMember.status === "online" && "bg-emerald-400",
                      selectedMember.status === "focus" && "bg-amber-400",
                      (!selectedMember.status || selectedMember.status === "offline") &&
                        "bg-zinc-500",
                    )}
                  />
                  <span className="text-xs text-zinc-300">
                    {selectedMember.status === "online" && "Online"}
                    {selectedMember.status === "focus" && "Em foco"}
                    {(!selectedMember.status || selectedMember.status === "offline") &&
                      "Offline"}
                  </span>
                </div>
              </div>

              {selectedMember.description && (
                <p className="mt-4 text-sm leading-6 text-zinc-300">
                  {selectedMember.description}
                </p>
              )}

              {selectedMember.bio && (
                <p className="mt-3 text-sm italic text-zinc-500">
                  “{selectedMember.bio}”
                </p>
              )}

              {(selectedMember.birthday || selectedMember.workHours) && (
                <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-3 text-xs text-zinc-300 sm:grid-cols-2">
                  {selectedMember.birthday && (
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                        Data de nascimento
                      </p>
                      <p className="mt-1 text-xs font-medium text-foreground">
                        {new Date(selectedMember.birthday).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  )}
                  {selectedMember.workHours && (
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                        Horário de trabalho
                      </p>
                      <p className="mt-1 text-xs font-medium text-foreground">
                        {selectedMember.workHours}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {selectedMember.username && (
                <p className="mt-3 text-xs text-zinc-500">@{selectedMember.username}</p>
              )}

            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
