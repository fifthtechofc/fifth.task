"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  BarChart3,
  Calendar,
  ChevronDown,
  FolderKanban,
  LayoutDashboard,
  Menu,
  LogOut,
  Plus,
  PlusSquare,
  Search,
  Settings,
  Users,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { getSupabaseUserId, supabase } from "@/lib/supabase"
import {
  fetchCalendarAccess,
  fetchCalendarEvents,
  formatEventTimeRange,
  type CalendarEventRecord,
} from "@/lib/calendar"
import { fetchBoards, getBoardDisplayTitle } from "@/lib/kanban"
import { getMyProfile, getTeamMembers } from "@/lib/profile"
import { signOutUser } from "@/lib/auth"
import { AUTH_INTRO_STORAGE_KEY } from "@/lib/intro-storage"
import { useDashboardLoading } from "@/components/ui/dashboard-shell"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { SettingsProfileSection } from "@/components/settings-profile-section"
import { MembersSelect } from "@/components/ui/members-select"
import { NotificationsPopover } from "@/components/notifications/notifications-popover"
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

type MenuSection = {
  title: string
  items: MenuItem[]
  events?: CalendarEventItem[]
}

type CalendarEventItem = {
  id: string
  workspaceId: string
  createdBy: string
  title: string
  description: string | null
  isMeeting?: boolean
  meetingLink?: string | null
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
  status?: "online" | "focus" | "offline"
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
    .map((part) => part[0])
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
    label: "Calendário",
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
    label: "Configurações",
    href: "/settings",
    icon: <Settings className="h-4 w-4" />,
  },
]

const sidebarContent: Record<NavSectionId, { title: string; sections: MenuSection[] }> = {
  dashboard: {
    title: "Dashboard",
    sections: [
      {
        title: "Em breve",
        items: [{ label: "Modulo em preparacao" }, { label: "Liberaremos futuramente" }],
      },
    ],
  },
  boards: {
    title: "Boards",
    sections: [
      {
        title: "Kanban",
        items: [{ label: "Projetos", children: [{ label: "Criar board", href: "/boards/create" }] }],
      },
    ],
  },
  projects: {
    title: "Projetos",
    sections: [{ title: "Ativos", items: [{ label: "Todos os projetos", href: "/projects" }] }],
  },
  calendar: {
    title: "Calendário",
    sections: [
      { title: "Eventos passados", items: [], events: [] },
      { title: "Eventos de hoje", items: [], events: [] },
      { title: "Eventos futuros", items: [], events: [] },
    ],
  },
  teams: {
    title: "Times",
    sections: [{ title: "Pessoas", items: [] }],
  },
  analytics: {
    title: "Analytics",
    sections: [
      {
        title: "Em breve",
        items: [{ label: "Modulo em preparacao" }, { label: "Liberaremos futuramente" }],
      },
    ],
  },
  settings: {
    title: "Configurações",
    sections: [
      {
        title: "Workspace",
        items: [
          { label: "Perfil", href: "/settings?section=profile" },
          { label: "Notificações", href: "/settings?section=notifications" },
          { label: "Segurança", href: "/settings?section=security" },
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
      title={disabled ? `${label} - Em breve` : label}
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
          disabled ? "text-zinc-600" : isActive ? "bg-white/12 text-white" : "text-zinc-400",
        )}
      >
        {icon}
      </span>
      <span
        className="pointer-events-none absolute top-1/2 z-40 -translate-y-1/2 rounded-full border border-white/10 bg-black/95 px-3 py-1 text-xs font-medium text-white shadow-lg transition-all duration-300"
        style={{ left: isHovered ? "3.5rem" : "3rem", opacity: isHovered ? 1 : 0 }}
      >
        {disabled ? "Pagina em breve" : label}
      </span>
    </Comp>
  )
}
function CalendarSectionList({
  section,
  expandedItems,
  toggleExpanded,
  onNavigate,
}: {
  section: MenuSection
  expandedItems: Record<string, boolean>
  toggleExpanded: (key: string) => void
  onNavigate?: () => void
}) {
  if (!section.events) return null

  const sectionKey = `calendar-section-${section.title}`
  const isExpanded = expandedItems[sectionKey] ?? section.title === "Eventos de hoje"

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => toggleExpanded(sectionKey)}
        className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left transition-colors hover:bg-white/8"
      >
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{section.title}</p>
          <p className="mt-1 text-xs text-zinc-400">
            {section.events.length > 0
              ? `${section.events.length} evento${section.events.length > 1 ? "s" : ""}`
              : "Nenhum evento"}
          </p>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-zinc-500 transition-transform", isExpanded && "rotate-180")} />
      </button>

      {isExpanded ? (
        section.events.length > 0 ? (
          <div className="flex flex-col gap-2">
            {section.events.map((event) => (
              <Link
                key={event.id}
                href={`/calendar?eventId=${encodeURIComponent(event.id)}`}
                onClick={onNavigate}
                className="rounded-xl border border-white/10 bg-white/5 p-3 text-left transition-colors hover:bg-white/10"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <p className="text-sm font-medium text-white">{event.title}</p>
                  <span className="text-xs text-zinc-400">
                    {new Date(event.startAt).toLocaleDateString("pt-BR")} - {formatEventTimeRange(event.startAt, event.endAt)}
                  </span>
                </div>
                {event.isMeeting && event.meetingLink ? (
                  <span className="mt-2 inline-flex text-[11px] font-medium text-emerald-300">Link da reuniao salvo</span>
                ) : null}
                {event.description ? <p className="mt-2 line-clamp-2 text-xs text-zinc-500">{event.description}</p> : null}
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.03] px-3 py-4 text-xs text-zinc-500">
            Nenhum evento nesta secao.
          </div>
        )
      ) : null}
    </div>
  )
}

export default function SidebarComponent() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setLoading: setDashboardLoading } = useDashboardLoading()

  const [isHovered, setIsHovered] = React.useState(false)
  const [previewSection, setPreviewSection] = React.useState<NavSectionId | null>(null)
  const [mobileSection, setMobileSection] = React.useState<NavSectionId>(getActiveSection(pathname))
  const [mobilePanelOpen, setMobilePanelOpen] = React.useState(false)
  const [boards, setBoards] = React.useState<Array<{ id: string; title: string }>>([])
  const [teams, setTeams] = React.useState<Array<{ id: string; name: string }>>([])
  const [me, setMe] = React.useState<{ name: string; email: string; avatarUrl: string } | null>(null)
  const [calendarEvents, setCalendarEvents] = React.useState<CalendarEventRecord[]>([])
  const [expandedItems, setExpandedItems] = React.useState<Record<string, boolean>>({ "Kanban-Projetos": true })
  const [profileDialogOpen, setProfileDialogOpen] = React.useState(false)
  const [createTeamOpen, setCreateTeamOpen] = React.useState(false)
  const [teamName, setTeamName] = React.useState("")
  const [teamDescription, setTeamDescription] = React.useState("")
  const [creatingTeam, setCreatingTeam] = React.useState(false)
  const [allMembers, setAllMembers] = React.useState<TeamMember[]>([])
  const [selectedMemberIds, setSelectedMemberIds] = React.useState<Set<string>>(new Set())

  const activeSection = getActiveSection(pathname)
  const activeSettingsSection = searchParams.get("section") ?? "profile"
  const visibleDesktopSection = previewSection ?? activeSection

  React.useEffect(() => {
    setMobileSection(activeSection)
  }, [activeSection])

  React.useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const profile = await getMyProfile()
        if (!alive || !profile) return
        setMe({
          name: profile.full_name ?? "Usuario",
          email: profile.email ?? "",
          avatarUrl: profile.avatar_url ?? "",
        })
      } catch {
        // ignore
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  React.useEffect(() => {
    if (!createTeamOpen) return
    let alive = true
    ;(async () => {
      try {
        const members = await getTeamMembers()
        if (!alive) return
        setAllMembers(members)
      } catch {
        // ignore
      }
    })()
    return () => {
      alive = false
    }
  }, [createTeamOpen])

  React.useEffect(() => {
    let alive = true
    async function loadBoards() {
      try {
        const userId = await getSupabaseUserId()
        if (!userId) return
        const rows = await fetchBoards()
        if (!alive) return
        const withLast = rows.map((row) => {
          let lastAt = 0
          try {
            const raw = window.localStorage.getItem(`kanban:boardLastAt:${row.id}`)
            lastAt = raw ? Number(raw) : 0
          } catch {
            lastAt = 0
          }
          return { id: row.id, title: getBoardDisplayTitle(row.title), lastAt }
        })
        withLast.sort((a, b) => b.lastAt - a.lastAt)
        setBoards(withLast.map((row) => ({ id: row.id, title: row.title })))
      } catch {
        // ignore
      }
    }
    void loadBoards()
    return () => {
      alive = false
    }
  }, [])

  React.useEffect(() => {
    let alive = true
    async function loadTeams() {
      try {
        const userId = await getSupabaseUserId()
        if (!userId) return
        const { data, error } = await supabase
          .from("teams")
          .select("id, name")
          .eq("created_by", userId)
          .order("created_at", { ascending: true })

        if (error || !data || !alive) return
        setTeams(data.map((team) => ({ id: team.id, name: team.name })))
      } catch {
        // ignore
      }
    }
    void loadTeams()
    return () => {
      alive = false
    }
  }, [])

  const calendarWorkspaceIdsRef = React.useRef<string[] | null>(null)
  const calendarRefreshInFlightRef = React.useRef(false)

  const refreshCalendarEvents = React.useCallback(async () => {
    if (calendarRefreshInFlightRef.current) return
    calendarRefreshInFlightRef.current = true
    try {
      let workspaceIds = calendarWorkspaceIdsRef.current
      if (!workspaceIds) {
        const access = await fetchCalendarAccess()
        workspaceIds = access.workspaces.map((workspace) => workspace.id)
        calendarWorkspaceIdsRef.current = workspaceIds
      }
      if (workspaceIds.length === 0) return
      const events = await fetchCalendarEvents(workspaceIds)
      setCalendarEvents(events)
    } catch {
      calendarWorkspaceIdsRef.current = null
    } finally {
      calendarRefreshInFlightRef.current = false
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
  const buildContent = React.useCallback(
    (sectionId: NavSectionId) => {
      if (sectionId === "boards") {
        const projectChildren: MenuChild[] = boards.map((board) => {
          const slug = slugify(board.title) || "board"
          return { label: board.title, href: `/boards/${slug}?id=${encodeURIComponent(board.id)}` }
        })
        return {
          ...sidebarContent.boards,
          sections: sidebarContent.boards.sections.map((section) => ({
            ...section,
            items: section.items.map((item) => (item.label === "Projetos" ? { ...item, children: projectChildren } : item)),
          })),
        }
      }

      if (sectionId === "teams") {
        return {
          ...sidebarContent.teams,
          sections: sidebarContent.teams.sections.map((section) => ({
            ...section,
            items: [
              { label: "Todos os membros", href: "/teams" },
              ...teams.map((team) => ({ label: team.name, href: `/teams?teamId=${encodeURIComponent(team.id)}` })),
            ],
          })),
        }
      }

      if (sectionId === "calendar") {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const endOfToday = new Date(today)
        endOfToday.setHours(23, 59, 59, 999)

        const pastEvents = calendarEvents
          .filter((event) => {
            const date = new Date(event.startAt)
            return Number.isFinite(date.getTime()) ? date < today : false
          })
          .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())

        const todayEvents = calendarEvents
          .filter((event) => {
            const date = new Date(event.startAt)
            return Number.isFinite(date.getTime()) ? date >= today && date <= endOfToday : false
          })
          .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())

        const futureEvents = calendarEvents
          .filter((event) => {
            const date = new Date(event.startAt)
            return Number.isFinite(date.getTime()) ? date > endOfToday : false
          })
          .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())

        return {
          ...sidebarContent.calendar,
          sections: sidebarContent.calendar.sections.map((section) => ({
            ...section,
            events:
              section.title === "Eventos passados"
                ? pastEvents
                : section.title === "Eventos de hoje"
                  ? todayEvents
                  : futureEvents,
          })),
        }
      }

      return sidebarContent[sectionId]
    },
    [boards, teams, calendarEvents],
  )

  const desktopContent = React.useMemo(() => buildContent(visibleDesktopSection), [buildContent, visibleDesktopSection])
  const mobileContent = React.useMemo(() => buildContent(mobileSection), [buildContent, mobileSection])

  const toggleExpanded = React.useCallback((key: string) => {
    setExpandedItems((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  async function handleLogout() {
    try {
      window.sessionStorage.setItem("ft:forceDashboardLoader", "1")
    } catch {
      // ignore
    }
    setDashboardLoading(true)
    try {
      await signOutUser()
    } finally {
      try {
        window.sessionStorage.removeItem(AUTH_INTRO_STORAGE_KEY)
      } catch {
        // ignore
      }
      window.location.href = "/login"
    }
  }

  async function handleCreateTeam() {
    if (!teamName.trim()) return
    setCreatingTeam(true)
    try {
      const userId = await getSupabaseUserId()
      if (!userId) throw new Error("Usuario nao autenticado.")

      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({ name: teamName.trim(), description: teamDescription.trim() || null, created_by: userId })
        .select("id")
        .single()

      if (teamError || !team) throw teamError ?? new Error("Falha ao criar time.")

      const memberIds = new Set(selectedMemberIds)
      memberIds.add(userId)
      if (memberIds.size > 0) {
        const payload = Array.from(memberIds).map((profileId) => ({
          team_id: team.id,
          profile_id: profileId,
          role: profileId === userId ? "Lider" : "Membro",
        }))
        const { error: memberError } = await supabase.from("team_members").insert(payload)
        if (memberError) throw memberError
      }

      setCreateTeamOpen(false)
      setTeamName("")
      setTeamDescription("")
      setSelectedMemberIds(new Set())
      setTeams((prev) => [...prev, { id: team.id, name: teamName.trim() }])
    } catch (error) {
      console.error("Erro em handleCreateTeam:", error)
    } finally {
      setCreatingTeam(false)
    }
  }

  function renderMenuSections(content: { title: string; sections: MenuSection[] }, sectionId: NavSectionId, onNavigate?: () => void) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
        {content.sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-2">
            {sectionId !== "calendar" && <p className="px-2 text-xs uppercase tracking-[0.2em] text-zinc-500">{section.title}</p>}

            {section.items.map((item) => {
              const itemKey = `${section.title}-${item.label}`
              const isExpanded = Boolean(expandedItems[itemKey])

              if (item.href) {
                const itemSection =
                  sectionId === "settings"
                    ? new URL(item.href, "http://localhost").searchParams.get("section") ?? "profile"
                    : null
                const isItemActive =
                  sectionId === "settings"
                    ? activeSection === "settings" && activeSettingsSection === itemSection
                    : pathname === item.href

                return (
                  <Link
                    key={itemKey}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "rounded-xl px-3 py-2 text-sm transition-colors",
                      isItemActive ? "bg-white/10 text-white" : "text-zinc-300 hover:bg-white/6 hover:text-white",
                    )}
                  >
                    {item.label}
                  </Link>
                )
              }

              return (
                <div key={itemKey} className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => item.children && toggleExpanded(itemKey)}
                    className="flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-zinc-300 transition-colors hover:bg-white/6 hover:text-white"
                  >
                    <span>{item.label}</span>
                    {item.children && <ChevronDown className={cn("h-4 w-4 text-zinc-500 transition-transform", isExpanded && "rotate-180")} />}
                  </button>

                  {isExpanded && item.children && (
                    <div className="ml-3 flex flex-col gap-1 border-l border-white/10 pl-3">
                      {item.children.map((child, index) =>
                        child.href ? (
                          <Link
                            key={`${itemKey}-${child.href ?? child.label}-${index}`}
                            href={child.href}
                            onClick={onNavigate}
                            className={cn(
                              "rounded-lg px-3 py-2 text-sm transition-colors",
                              pathname === child.href ? "bg-white/8 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
                            )}
                          >
                            {child.label}
                          </Link>
                        ) : (
                          <div key={`${child.label}-${index}`} className="rounded-lg px-3 py-2 text-sm text-zinc-400">
                            {child.label}
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {sectionId === "calendar" && section.events ? (
              <CalendarSectionList
                section={section}
                expandedItems={expandedItems}
                toggleExpanded={toggleExpanded}
                onNavigate={onNavigate}
              />
            ) : null}
          </div>
        ))}
      </div>
    )
  }
  function renderPrimaryAction(sectionId: NavSectionId, onNavigate?: () => void) {
    if (sectionId === "teams") {
      return (
        <Sheet open={createTeamOpen} onOpenChange={setCreateTeamOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-3 py-3 text-white transition-colors hover:bg-white/10"
            >
              <span className="text-sm font-semibold">Criar novo time</span>
              <Plus className="h-4 w-4" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" showClose className="border-l border-white/10 bg-zinc-950/95 text-foreground">
            <SheetHeader>
              <SheetTitle>Novo time</SheetTitle>
              <SheetDescription>Defina o nome e uma breve descricao para o time.</SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-4 px-2">
              <div className="space-y-1">
                <p className="text-xs font-medium text-zinc-300">Nome do time</p>
                <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Ex: Time de desenvolvimento" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-zinc-300">Descricao (opcional)</p>
                <Textarea rows={3} value={teamDescription} onChange={(e) => setTeamDescription(e.target.value)} placeholder="Uma frase que explique o foco deste time." />
              </div>
              <div className="space-y-2">
                <MembersSelect
                  label="Membros do time"
                  buttonLabel="Membros do time"
                  members={allMembers.map((member) => ({ id: member.id, name: member.name, imageSrc: member.imageSrc }))}
                  selectedIds={[...selectedMemberIds]}
                  onChange={(ids) => setSelectedMemberIds(new Set(ids))}
                />
                <p className="mt-8 text-center text-[10px] text-zinc-500">* Voce sera adicionado automaticamente como lider do time.</p>
              </div>
            </div>

            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => setCreateTeamOpen(false)} disabled={creatingTeam}>
                Cancelar
              </Button>
              <Button type="button" onClick={() => void handleCreateTeam()} disabled={!teamName.trim() || creatingTeam}>
                {creatingTeam ? "Criando..." : "Criar time"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )
    }

    if (sectionId === "calendar") {
      return (
        <Link
          href="/calendar"
          onClick={onNavigate}
          className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-3 py-3 text-white transition-colors hover:bg-white/10"
        >
          <span className="text-sm font-semibold">Adicionar evento</span>
          <Plus className="h-4 w-4" />
        </Link>
      )
    }

    return (
      <Link
        href="/boards/create"
        onClick={onNavigate}
        className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-3 py-3 text-white transition-colors hover:bg-white/10"
      >
        <span className="text-sm font-semibold">Criar novo quadro</span>
        <Plus className="h-4 w-4" />
      </Link>
    )
  }

  function renderProfileCard(onClick: () => void) {
    if (!me) return null
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left transition-colors hover:bg-white/10"
      >
        <Avatar className="h-9 w-9 border border-white/10">
          <AvatarImage src={me.avatarUrl || undefined} alt={me.name || "Usuario"} />
          <AvatarFallback className="bg-white/10 text-xs font-semibold text-white">{initials(me.name || "Usuario")}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{me.name || "Usuario"}</p>
          <p className="truncate text-xs text-zinc-500">{me.email || "-"}</p>
        </div>
      </button>
    )
  }

  return (
    <>
      <div
        className={cn(
          "relative hidden h-full shrink-0 transition-[width] duration-300 lg:block",
          isHovered ? "lg:w-[22rem]" : "lg:w-32",
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
              <RailNavLink label="Sair" icon={<LogOut className="h-4 w-4" />} isActive={false} onClick={() => void handleLogout()} />
            </div>
          </aside>

          <aside
            className={cn(
              "flex h-full flex-col gap-4 rounded-r-3xl border-y border-r border-white/10 bg-black/85 p-4 text-white backdrop-blur-xl transition-[width,padding] duration-300",
              isHovered ? "w-80" : "w-16 px-2",
            )}
            onMouseEnter={() => setIsHovered(true)}
          >
            <div className={cn("flex items-center", isHovered ? "justify-between" : "justify-center")}>
              {isHovered && (
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Workspace</p>
                  <h2 className="text-lg font-semibold">{desktopContent.title}</h2>
                </div>
              )}
              <div className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400">
                <ChevronDown className={cn("h-4 w-4 transition-transform", isHovered && "-rotate-90")} />
              </div>
            </div>

            {isHovered ? (
              <>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3">
                  <Search className="h-4 w-4 shrink-0 text-zinc-400" />
                  <input type="text" placeholder="Buscar..." className="h-10 w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500" />
                </div>
                {renderMenuSections(desktopContent, visibleDesktopSection)}
                <div className="flex flex-col gap-2">
                  {renderPrimaryAction(visibleDesktopSection)}
                  {renderProfileCard(() => setProfileDialogOpen(true))}
                </div>
              </>
            ) : (
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                <Search className="h-4 w-4 text-zinc-400" />
              </div>
            )}
          </aside>
        </div>
      </div>
      <div className="sticky top-0 z-40 lg:hidden">
        <div className="flex items-center justify-between rounded-[1.5rem] border border-white/10 bg-black/85 px-3 py-2.5 text-white backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={mobilePanelOpen} onOpenChange={setMobilePanelOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-200 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Abrir menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" showClose className="w-[88vw] border-r border-white/10 bg-zinc-950/95 text-white sm:max-w-sm">
                <SheetHeader>
                  <SheetTitle>Workspace</SheetTitle>
                  <SheetDescription>
                    Abra as áreas do projeto e navegue sem depender de hover.
                  </SheetDescription>
                </SheetHeader>

                <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4 pt-2">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {navItems.map((item) => {
                      const selected = mobileSection === item.id
                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={item.disabled}
                          onClick={() => {
                            if (item.disabled) return
                            setMobileSection(item.id)
                            setMobilePanelOpen(false)
                            router.push(item.href)
                          }}
                          className={cn(
                            "flex min-w-[72px] shrink-0 flex-col items-center gap-2 rounded-2xl border px-3 py-2 text-xs transition-colors",
                            item.disabled
                              ? "border-white/5 bg-white/[0.03] text-zinc-600"
                              : selected
                                ? "border-white/15 bg-white/10 text-white"
                                : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/8 hover:text-white",
                          )}
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/20">
                            {item.icon}
                          </span>
                          <span className="whitespace-nowrap">{item.label}</span>
                        </button>
                      )
                    })}
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3">
                    <Search className="h-4 w-4 shrink-0 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Buscar..."
                      className="h-10 w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
                    />
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {renderMenuSections(mobileContent, mobileSection, () => setMobilePanelOpen(false))}
                  </div>

                  <div className="flex flex-col gap-2">
                    {renderPrimaryAction(mobileSection, () => setMobilePanelOpen(false))}
                    {renderProfileCard(() => {
                      setMobilePanelOpen(false)
                      setProfileDialogOpen(true)
                    })}
                    <button
                      type="button"
                      onClick={() => void handleLogout()}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <span>Sair da conta</span>
                      <LogOut className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Workspace</p>
              <h2 className="truncate text-sm font-semibold">{mobileContent.title}</h2>
            </div>
          </div>

          <div className="shrink-0">
            <NotificationsPopover />
          </div>
        </div>
      </div>

      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-h-[85vh] w-full max-w-3xl overflow-y-auto border-none bg-transparent p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Editar perfil</DialogTitle>
          </DialogHeader>
          <SettingsProfileSection showSummary={false} onDetailsSaved={() => setProfileDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}
