"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Calendar,
  Camera,
  ChevronDown,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Plus,
  PlusSquare,
  Search,
  Settings,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { fetchCalendarAccess, fetchCalendarEvents, formatEventTimeRange, type CalendarEventRecord } from "@/lib/calendar"
import { fetchBoards, getBoardDisplayTitle } from "@/lib/kanban"
import { getMyProfile, updateMyProfileAvatar, updateMyProfileDetails, getTeamMembers } from "@/lib/profile"
import { signOutUser } from "@/lib/auth"
import { AUTH_INTRO_STORAGE_KEY } from "@/lib/intro-storage"
import { useDashboardLoading } from "@/components/ui/dashboard-shell"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { SettingsProfileSection } from "@/components/settings-profile-section"
import { MembersSelect } from "@/components/ui/members-select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type NavSectionId =
  | "dashboard"
  | "boards"
  | "projects"
  | "calendar"
  | "teams"
  | "analytics"
  | "settings"

type MenuChild = {
  label: string
  href?: string
}

type MenuItem = {
  label: string
  href?: string
  children?: MenuChild[]
}

type CalendarEventItem = {
  id: string
  workspaceId: string
  createdBy: string
  title: string
  description: string | null
  startAt: string
  endAt: string | null
}

type TeamMember = {
  id: string
  name: string
  username?: string
  imageSrc: string
  description?: string
  role?: string
  status?: 'online' | 'focus' | 'offline'
  birthday?: string | null
  workHours?: string | null
  bio?: string | null
}

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

const navItems: {
  id: NavSectionId
  label: string
  href: string
  icon: React.ReactNode
  disabled?: boolean
}[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
    disabled: true,
  },
  {
    id: "boards",
    label: "Boards",
    href: "/boards",
    icon: <FolderKanban className="h-4 w-4" />,
  },
  {
    id: "projects",
    label: "Projetos",
    href: "/projects",
    icon: <PlusSquare className="h-4 w-4" />,
  },
  {
    id: "calendar",
    label: "Calendario",
    href: "/calendar",
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    id: "teams",
    label: "Times",
    href: "/teams",
    icon: <Users className="h-4 w-4" />,
  },
  {
    id: "analytics",
    label: "Analytics",
    href: "/analytics",
    icon: <BarChart3 className="h-4 w-4" />,
    disabled: true,
  },
  {
    id: "settings",
    label: "Configuracoes",
    href: "/settings",
    icon: <Settings className="h-4 w-4" />,
  },
]

const sidebarContent: Record<
  NavSectionId,
  { title: string; sections: { title: string; items: MenuItem[]; events?: CalendarEventItem[] }[] }
> = {
  dashboard: {
    title: "Dashboard",
    sections: [
      {
        title: "Em breve",
        items: [
          { label: "Modulo em preparacao" },
          { label: "Liberaremos futuramente" },
        ],
      },
    ],
  },
  boards: {
    title: "Boards",
    sections: [
      {
        title: "Kanban",
        items: [
          {
            label: "Projetos",
            children: [
              { label: "Criar board", href: "/boards/create" },
            ],
          },
        ],
      },
    ],
  },
  projects: {
    title: "Projetos",
    sections: [
      {
        title: "Ativos",
        items: [
          { label: "Todos os projetos", href: "/projects" },
        ],
      },
    ],
  },
  calendar: {
    title: "Calendario",
    sections: [
      {
        title: "Agenda",
        items: [
          { label: "Hoje", href: "/calendar" },
          {
            label: "Semana",
            children: [
              { label: "Dailies", href: "/calendar" },
              { label: "Reviews", href: "/calendar" },
            ],
          },
        ],
      },
      {
        title: "Próximos Eventos",
        items: [],
        events: [], // será preenchido dinamicamente
      },
    ],
  },
  teams: {
    title: "Times",
    sections: [
      {
        title: "Pessoas",
        items: [],
      },
    ],
  },
  analytics: {
    title: "Analytics",
    sections: [
      {
        title: "Em breve",
        items: [
          { label: "Modulo em preparacao" },
          { label: "Liberaremos futuramente" },
        ],
      },
    ],
  },
  settings: {
    title: "Configuracoes",
    sections: [
      {
        title: "Workspace",
        items: [
          { label: "Preferencias", href: "/settings" },
          { label: "Notificacoes", href: "/settings" },
          { label: "Seguranca", href: "/settings" },
        ],
      },
    ],
  },
}

function getActiveSection(pathname: string): NavSectionId {
  if (pathname.startsWith("/settings")) return "settings"
  if (pathname.startsWith("/boards")) return "boards"
  if (pathname.startsWith("/projects")) return "projects"
  if (pathname.startsWith("/calendar")) return "calendar"
  if (pathname.startsWith("/teams")) return "teams"
  if (pathname.startsWith("/analytics")) return "analytics"
  return "dashboard"
}

function RailNavLink({
  href,
  label,
  icon,
  disabled = false,
  isActive,
  onHover,
  onClick,
}: {
  href?: string
  label: string
  icon: React.ReactNode
  disabled?: boolean
  isActive: boolean
  onHover?: () => void
  onClick?: () => void
}) {
  const [isHovered, setIsHovered] = React.useState(false)

  const Comp: React.ElementType = href && !disabled ? Link : "button"

  return (
    <Comp
      {...(href && !disabled ? { href } : { type: "button" })}
      className="relative flex h-10 w-10 items-center justify-center rounded-xl"
      aria-label={label}
      title={disabled ? `${label} • Em breve` : label}
      onMouseEnter={disabled ? undefined : onHover}
      onMouseOver={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      <span
        className="pointer-events-none absolute inset-0 rounded-xl transition-all duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? "scale(1.2)" : "scale(0.92)",
          border: "1px solid rgba(255,255,255,0.14)",
          boxShadow: isHovered ? "0 0 18px rgba(255,255,255,0.10)" : "none",
        }}
      />
      <span
        className={cn(
          "relative z-10 flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300",
          disabled
            ? "text-zinc-600"
            : isActive
              ? "bg-white/12 text-white"
              : "text-zinc-400"
        )}
        style={{
          transform: disabled
            ? "translateY(0) scale(1)"
            : isHovered
              ? "translateY(-2px) scale(1.08)"
              : "translateY(0) scale(1)",
          backgroundColor: disabled
            ? "rgba(255,255,255,0.03)"
            : isActive
              ? "rgba(255,255,255,0.12)"
              : isHovered
                ? "rgba(255,255,255,0.09)"
                : "transparent",
          color: disabled ? "#52525b" : isActive || isHovered ? "#ffffff" : "#a1a1aa",
          boxShadow: disabled ? "none" : isHovered ? "0 0 24px rgba(255,255,255,0.08)" : "none",
        }}
      >
        {icon}
        {disabled && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/15 bg-zinc-200 text-[9px] font-bold text-black shadow-[0_0_10px_rgba(255,255,255,0.2)]">
            ?
          </span>
        )}
      </span>
      <span
        className="pointer-events-none absolute top-1/2 z-40 -translate-y-1/2 rounded-full border border-white/10 bg-black/95 px-3 py-1 text-xs font-medium text-white shadow-lg transition-all duration-300"
        style={{
          left: isHovered ? "3.5rem" : "3rem",
          opacity: isHovered ? 1 : 0,
        }}
      >
        {disabled ? "Pagina em breve" : label}
      </span>
    </Comp>
  )
}

export default function SidebarComponent() {
  const pathname = usePathname()
  const { setLoading: setDashboardLoading } = useDashboardLoading()
  const [isHovered, setIsHovered] = React.useState(false)
  const [previewSection, setPreviewSection] = React.useState<NavSectionId | null>(null)
  const [boards, setBoards] = React.useState<Array<{ id: string; title: string }>>([])
  const [teams, setTeams] = React.useState<Array<{ id: string; name: string }>>([])
  const [me, setMe] = React.useState<{ name: string; email: string; avatarUrl: string } | null>(
    null,
  )
  const [calendarEvents, setCalendarEvents] = React.useState<CalendarEventRecord[]>([])
  const [expandedItems, setExpandedItems] = React.useState<Record<string, boolean>>({
    "Kanban-Projetos": true,
  })
  const [profileDialogOpen, setProfileDialogOpen] = React.useState(false)
  const [createTeamOpen, setCreateTeamOpen] = React.useState(false)
  const [teamName, setTeamName] = React.useState("")
  const [teamDescription, setTeamDescription] = React.useState("")
  const [creatingTeam, setCreatingTeam] = React.useState(false)
  const [allMembers, setAllMembers] = React.useState<TeamMember[]>([])
  const [selectedMemberIds, setSelectedMemberIds] = React.useState<Set<string>>(new Set())
  const [membersCollapsed, setMembersCollapsed] = React.useState(false)
  const activeSection = getActiveSection(pathname)
  const visibleSection = previewSection ?? activeSection
  const isCollapsed = !isHovered

  React.useEffect(() => {
    if (!createTeamOpen) return
    let alive = true
    ;(async () => {
      try {
        const members = await getTeamMembers()
        if (!alive) return
        setAllMembers(members)
      } catch {
        // silencioso no menu
      }
    })()
    return () => {
      alive = false
    }
  }, [createTeamOpen])

  async function handleCreateTeam() {
    if (!teamName.trim()) return
    setCreatingTeam(true)
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user) throw userError ?? new Error("Usuário não autenticado.")

      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({
          name: teamName.trim(),
          description: teamDescription.trim() || null,
          created_by: user.id,
        })
        .select("id")
        .single()
      if (teamError || !team) {
        console.error("Erro ao criar time:", teamError)
        throw teamError ?? new Error("Falha ao criar time.")
      }

      const memberIds = new Set(selectedMemberIds)
      memberIds.add(user.id)

      if (memberIds.size > 0) {
        const payload = Array.from(memberIds).map((profileId) => ({
          team_id: team.id,
          profile_id: profileId,
          role: profileId === user.id ? "Líder" : "Membro",
        }))

        const { error: memberError } = await supabase.from("team_members").insert(payload)
        if (memberError) {
          console.error("Erro ao vincular membros ao time:", memberError)
          throw memberError
        }
      }

      setCreateTeamOpen(false)
      setTeamName("")
      setTeamDescription("")
      setSelectedMemberIds(new Set())

      // adiciona o time recém-criado na lista local do sidebar
      setTeams((prev) => [...prev, { id: team.id, name: teamName.trim() }])
    } catch (error) {
      console.error("Erro em handleCreateTeam:", error)
    } finally {
      setCreatingTeam(false)
    }
  }
  const content = React.useMemo(() => {
    if (visibleSection === "boards") {
      const projectChildren: MenuChild[] = [
        ...boards.map((b) => {
          const slug = slugify(b.title) || "board"
          return {
            label: b.title,
            href: `/boards/${slug}?id=${encodeURIComponent(b.id)}`,
          }
        }),
      ]

      return {
        ...sidebarContent.boards,
        sections: sidebarContent.boards.sections.map((section) => ({
          ...section,
          items: section.items.map((item) =>
            item.label === "Projetos"
              ? {
                  ...item,
                  children: projectChildren,
                }
              : item,
          ),
        })),
      }
    }

    if (visibleSection === "teams") {
      return {
        ...sidebarContent.teams,
        sections: sidebarContent.teams.sections.map((section) => ({
          ...section,
          items: [
            {
              label: "Todos os membros",
              href: "/teams",
            },
            ...teams.map((t) => ({
              label: t.name,
              href: `/teams?teamId=${encodeURIComponent(t.id)}`,
            })),
          ],
        })),
      }
    }

    if (visibleSection === "calendar") {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const upcomingEvents = calendarEvents
        .filter((event) => {
          const eventDate = new Date(event.startAt)
          eventDate.setHours(0, 0, 0, 0)
          return eventDate >= today
        })
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())

      return {
        ...sidebarContent.calendar,
        sections: sidebarContent.calendar.sections.map((section) => ({
          ...section,
          events: section.title === "Próximos Eventos" ? upcomingEvents : section.events,
        })),
      }
    }

    return sidebarContent[visibleSection]
  }, [boards, teams, calendarEvents, visibleSection])

  React.useEffect(() => {
    let alive = true
    async function loadBoards() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return
        const rows = await fetchBoards()
        if (!alive) return
        const withLast = rows.map((r) => {
          let lastAt = 0
          try {
            const raw = window.localStorage.getItem(`kanban:boardLastAt:${r.id}`)
            lastAt = raw ? Number(raw) : 0
          } catch {
            lastAt = 0
          }
          return { id: r.id, title: getBoardDisplayTitle(r.title), lastAt }
        })

        withLast.sort((a, b) => b.lastAt - a.lastAt)
        setBoards(withLast.map((r) => ({ id: r.id, title: r.title })))
      } catch {
        // ignore menu load errors
      }
    }
    void loadBoards()
    return () => {
      alive = false
    }
  }, [])

  // carrega times que o usuário criou para mostrar no sidebar
  React.useEffect(() => {
    let alive = true
    async function loadTeams() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
          .from("teams")
          .select("id, name")
          .eq("created_by", user.id)
          .order("created_at", { ascending: true })

        if (error || !data || !alive) return
        setTeams(data.map((t) => ({ id: t.id, name: t.name })))
      } catch {
        // ignora erros silenciosamente no menu
      }
    }
    void loadTeams()
    return () => {
      alive = false
    }
  }, [])

  const refreshCalendarEvents = React.useCallback(async () => {
    try {
      const access = await fetchCalendarAccess()
      const workspaceIds = access.workspaces.map((w) => w.id)
      if (workspaceIds.length === 0) return
      const events = await fetchCalendarEvents(workspaceIds)
      setCalendarEvents(events)
    } catch {
      // ignore menu load errors
    }
  }, [])

  React.useEffect(() => {
    let alive = true

    const handleWindowFocus = () => {
      if (!alive) return
      void refreshCalendarEvents()
    }

    const handleVisibilityChange = () => {
      if (!alive) return
      if (document.visibilityState === "visible") {
        void refreshCalendarEvents()
      }
    }

    void refreshCalendarEvents()
    window.addEventListener("focus", handleWindowFocus)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    const intervalId = window.setInterval(() => {
      if (!alive) return
      void refreshCalendarEvents()
    }, 20000)

    return () => {
      alive = false
      window.removeEventListener("focus", handleWindowFocus)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.clearInterval(intervalId)
    }
  }, [refreshCalendarEvents])

  const toggleExpanded = (key: string) => {
    setExpandedItems((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div
      className={cn(
        "relative h-full shrink-0 transition-[width] duration-300",
        isCollapsed ? "w-32" : "w-[22rem]"
      )}
    >
      <div
        className="sticky top-4 z-40 flex h-[calc(100vh-2rem)]"
        onMouseLeave={() => {
          setIsHovered(false)
          setPreviewSection(null)
        }}
      >
        <aside className="relative z-30 flex w-16 flex-col items-center gap-3 rounded-l-3xl border border-white/10 bg-black/85 p-4 backdrop-blur-xl">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white">
            <FolderKanban className="h-5 w-5" />
          </div>

          <div className="flex w-full flex-col items-center gap-2">
            {navItems.slice(0, -1).map((item) => (
              <RailNavLink
                key={item.id}
                href={item.href}
                label={item.label}
                icon={item.icon}
                disabled={item.disabled}
                isActive={activeSection === item.id}
                onHover={() => {
                  if (item.disabled) return
                  setIsHovered(true)
                  setPreviewSection(item.id)
                }}
              />
            ))}
          </div>

          <div className="flex-1" />

          <div className="mt-auto flex flex-col items-center gap-2 pb-1">
            <RailNavLink
              href="/settings"
              label="Configuracoes"
              icon={<Settings className="h-4 w-4" />}
              isActive={activeSection === "settings"}
              onHover={() => {
                setIsHovered(true)
                setPreviewSection("settings")
              }}
            />

            <RailNavLink
              label="Sair"
              icon={<LogOut className="h-4 w-4" />}
              isActive={false}
              onClick={async () => {
                try {
                  // trava o loader até navegar para /login (evita piscada)
                  window.sessionStorage.setItem("ft:forceDashboardLoader", "1")
                } catch {
                  // ignore
                }
                setDashboardLoading(true)
                try {
                  await signOutUser()
                } finally {
                  // força splash do auth na volta pro login
                  try {
                    window.sessionStorage.removeItem(AUTH_INTRO_STORAGE_KEY)
                  } catch {
                    // ignore
                  }
                  window.location.href = "/login"
                }
              }}
            />
          </div>
        </aside>

        <aside
          className={cn(
            "flex h-full flex-col gap-4 rounded-r-3xl border-y border-r border-white/10 bg-black/85 p-4 text-white backdrop-blur-xl transition-[width,padding] duration-300",
            isCollapsed ? "w-16 px-2" : "w-80"
          )}
          onMouseEnter={() => setIsHovered(true)}
        >
        <div className={cn("flex items-center", isCollapsed ? "justify-center" : "justify-between")}>
          {!isCollapsed && (
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Workspace</p>
              <h2 className="text-lg font-semibold">{content.title}</h2>
            </div>
          )}
          <div className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400">
            <ChevronDown className={cn("h-4 w-4 transition-transform", !isCollapsed && "-rotate-90")} />
          </div>
        </div>

        <div
          className={cn(
            "rounded-2xl border border-white/10 bg-white/5 transition-all",
            isCollapsed ? "mx-auto flex h-10 w-10 items-center justify-center" : "flex items-center gap-3 px-3"
          )}
        >
          <Search className="h-4 w-4 shrink-0 text-zinc-400" />
          {!isCollapsed && (
            <input
              type="text"
              placeholder="Buscar..."
              className="h-10 w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
            />
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
          {content.sections.map((section) => (
            <div key={section.title} className="flex flex-col gap-2">
              {!isCollapsed && (
                <p className="px-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
                  {section.title}
                </p>
              )}

              {section.items.map((item) => {
                const itemKey = `${section.title}-${item.label}`
                const isExpanded = Boolean(expandedItems[itemKey])
                const children = "children" in item ? item.children : undefined

                if (item.href) {
                  return (
                    <Link
                      key={itemKey}
                      href={item.href}
                      className={cn(
                        "rounded-xl transition-colors",
                        pathname === item.href
                          ? "bg-white/10 text-white"
                          : "text-zinc-300 hover:bg-white/6 hover:text-white",
                        isCollapsed
                          ? "mx-auto flex h-10 w-10 items-center justify-center"
                          : "px-3 py-2 text-sm"
                      )}
                      title={item.label}
                    >
                      {isCollapsed ? item.label.slice(0, 1) : item.label}
                    </Link>
                  )
                }

                return (
                  <div key={itemKey} className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => children && toggleExpanded(itemKey)}
                      className={cn(
                        "flex items-center rounded-xl text-left transition-colors",
                        "text-zinc-300 hover:bg-white/6 hover:text-white",
                        isCollapsed
                          ? "mx-auto h-10 w-10 justify-center"
                          : "justify-between px-3 py-2 text-sm"
                      )}
                      title={item.label}
                    >
                      <span className={cn(isCollapsed && "text-xs font-semibold")}>
                        {isCollapsed ? item.label.slice(0, 1) : item.label}
                      </span>
                      {!isCollapsed && children && (
                        <ChevronDown
                          className={cn("h-4 w-4 text-zinc-500 transition-transform", isExpanded && "rotate-180")}
                        />
                      )}
                    </button>

                    {!isCollapsed && isExpanded && children && (
                      <div className="ml-3 flex flex-col gap-1 border-l border-white/10 pl-3">
                        {children.map((child, idx) =>
                          child.href ? (
                            <Link
                              key={`${itemKey}-${child.href ?? child.label}-${idx}`}
                              href={child.href}
                              className={cn(
                                "rounded-lg px-3 py-2 text-sm transition-colors",
                                pathname === child.href
                                  ? "bg-white/8 text-white"
                                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                              )}
                            >
                              <span>{child.label}</span>
                            </Link>
                          ) : (
                            <div
                              key={`${child.label}-${idx}`}
                              className="rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200"
                            >
                              {child.label}
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {!isCollapsed && section.events && section.events.length > 0 && (
                <div className="flex flex-col gap-2">
                  {section.events.map((event) => (
                    <Link
                      key={event.id}
                      href={`/calendar?eventId=${encodeURIComponent(event.id)}`}
                      className="rounded-xl border border-white/10 bg-white/5 p-3 text-left transition-colors hover:bg-white/10"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-sm font-medium text-white">{event.title}</p>
                        <span className="text-xs text-zinc-400">
                          {new Date(event.startAt).toLocaleDateString("pt-BR")} • {formatEventTimeRange(event.startAt, event.endAt)}
                        </span>
                      </div>
                      {event.description && (
                        <p className="mt-2 text-xs text-zinc-500 line-clamp-2">{event.description}</p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className={cn("flex flex-col gap-2", isCollapsed && "items-center")}>
          {visibleSection === "teams" ? (
            <Sheet open={createTeamOpen} onOpenChange={setCreateTeamOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "rounded-2xl border border-white/15 bg-white/5 text-white transition-colors hover:bg-white/10",
                    isCollapsed
                      ? "flex h-10 w-10 items-center justify-center"
                      : "flex items-center justify-between px-3 py-3",
                  )}
                  title="Criar novo time"
                  aria-label="Criar novo time"
                >
                  {!isCollapsed && <span className="text-sm font-semibold">Criar novo time</span>}
                  <Plus className={cn("h-4 w-4", isCollapsed && "h-5 w-5")} />
                </button>
              </SheetTrigger>
              <SheetContent
                side="right"
                showClose
                className="border-l border-white/10 bg-zinc-950/95 text-foreground"
              >
                <SheetHeader>
                  <SheetTitle>Novo time</SheetTitle>
                  <SheetDescription>
                    Defina o nome e uma breve descrição para o time.
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-4 space-y-4 px-2">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-zinc-300">Nome do time</p>
                    <Input
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="Ex: Time de desenvolvimento"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-zinc-300">Descrição (opcional)</p>
                    <Textarea
                      rows={3}
                      value={teamDescription}
                      onChange={(e) => setTeamDescription(e.target.value)}
                      placeholder="Uma frase que explique o foco deste time."
                    />
                  </div>
                  <div className="space-y-2">
                    <MembersSelect
                      label="Membros do time"
                      buttonLabel="Membros do time"
                      members={allMembers.map((m) => ({
                        id: m.id,
                        name: m.name,
                        imageSrc: m.imageSrc,
                      }))}
                      selectedIds={[...selectedMemberIds]}
                      onChange={(ids) => setSelectedMemberIds(new Set(ids))}
                    />
                    <p className="mt-8 text-center text-[10px] text-zinc-500">
                      * Você será adicionado automaticamente como líder do time.
                    </p>
                  </div>
                </div>

                <SheetFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateTeamOpen(false)}
                    disabled={creatingTeam}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCreateTeam}
                    disabled={!teamName.trim() || creatingTeam}
                  >
                    {creatingTeam ? "Criando..." : "Criar time"}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          ) : visibleSection === "calendar" ? (
            <Link
              href="/calendar"
              className={cn(
                "rounded-2xl border border-white/15 bg-white/5 text-white transition-colors hover:bg-white/10",
                isCollapsed
                  ? "flex h-10 w-10 items-center justify-center"
                  : "flex items-center justify-between px-3 py-3",
              )}
              title="Adicionar evento"
              aria-label="Adicionar evento"
            >
              {!isCollapsed && <span className="text-sm font-semibold">Adicionar evento</span>}
              <Plus className={cn("h-4 w-4", isCollapsed && "h-5 w-5")} />
            </Link>
          ) : (
            <Link
              href="/boards/create"
              className={cn(
                "rounded-2xl border border-white/15 bg-white/5 text-white transition-colors hover:bg-white/10",
                isCollapsed
                  ? "flex h-10 w-10 items-center justify-center"
                  : "flex items-center justify-between px-3 py-3",
              )}
              title="Criar novo quadro"
              aria-label="Criar novo quadro"
            >
              {!isCollapsed && <span className="text-sm font-semibold">Criar novo quadro</span>}
              <Plus className={cn("h-4 w-4", isCollapsed && "h-5 w-5")} />
            </Link>
          )}

        {!isCollapsed && me && (
          <button
            type="button"
            onClick={() => setProfileDialogOpen(true)}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left transition-colors hover:bg-white/10"
          >
            <Avatar className="h-9 w-9 border border-white/10">
              <AvatarImage src={me.avatarUrl || undefined} alt={me.name || "Usuário"} />
              <AvatarFallback className="bg-white/10 text-xs font-semibold text-white">
                {initials(me.name || "Usuário")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{me.name || "Usuário"}</p>
              <p className="truncate text-xs text-zinc-500">{me.email || "—"}</p>
            </div>
          </button>
        )}
        </div>
        </aside>

        <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
          <DialogContent className="w-full max-w-3xl max-h-[85vh] overflow-y-auto border-none bg-transparent p-0">
            <DialogHeader className="sr-only">
              <DialogTitle>Editar perfil</DialogTitle>
            </DialogHeader>
            <SettingsProfileSection
              showSummary={false}
              onDetailsSaved={() => setProfileDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
