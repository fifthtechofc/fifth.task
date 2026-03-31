"use client"

import { useEffect, useMemo, useState } from "react"

import { AvatarHoverCard } from "@/components/ui/avatar-hover-card"
import { getTeamMembers, type TeamMember } from "@/lib/profile"
import { useDashboardLoading } from "@/components/ui/dashboard-shell"

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

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setDashboardLoading(true)
    setError(null)
    getTeamMembers()
      .then((data) => {
        if (cancelled) return
        setMembers(data)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Não foi possível carregar o time.')
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
              className="overflow-visible rounded-[28px] border border-white/10 bg-black/35 p-6 backdrop-blur-sm"
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
    </section>
  )
}
