 "use client"

import { useEffect, useMemo, useState } from "react"

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

function getStatusClasses(status: TeamMember["status"]) {
  if (status === "online") return "bg-emerald-400"
  if (status === "focus") return "bg-amber-400"
  return "bg-zinc-500"
}

export default function TeamsPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { setLoading: setDashboardLoading } = useDashboardLoading()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setDashboardLoading(true)
    setError(null)
    Promise.all([
      getTeamMembers(),
      supabase.auth.getUser().then(({ data }) => data.user ?? null),
    ])
      .then(([data, user]) => {
        if (cancelled) return
        setMembers(data)
        setCurrentUserId(user?.id ?? null)
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
  }, [])

  const viewMembers = useMemo(() => {
    if (loading) return []
    return members
  }, [loading, members])

  return (
    <section className="relative min-h-full p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Times</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground md:text-4xl">
            Pessoas que movem o workspace
          </h1>
          <p className="mt-3 text-sm text-muted-foreground md:text-base">
            Uma visao rapida dos perfis principais do time, com acesso rapido
            para contato e acompanhamento.
          </p>
          {error && (
            <p className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
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
                {member.status && (
                  <div className={`h-2.5 w-2.5 rounded-full ${getStatusClasses(member.status)}`} />
                )}
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
