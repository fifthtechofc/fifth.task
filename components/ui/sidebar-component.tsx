"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Calendar,
  ChevronDown,
  FolderKanban,
  LayoutDashboard,
  Plus,
  PlusSquare,
  Search,
  Settings,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { fetchBoards } from "@/lib/kanban"
import { getMyProfile } from "@/lib/profile"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

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
}[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
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
  { title: string; sections: { title: string; items: MenuItem[] }[] }
> = {
  dashboard: {
    title: "Dashboard",
    sections: [
      {
        title: "Visao Geral",
        items: [
          { label: "Resumo executivo", href: "/dashboard" },
          {
            label: "Indicadores",
            children: [
              { label: "Performance geral", href: "/analytics" },
              { label: "Meta mensal", href: "/analytics" },
            ],
          },
          {
            label: "Operacao",
            children: [
              { label: "Fluxo do time", href: "/teams" },
              { label: "Capacidade", href: "/projects" },
            ],
          },
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
          {
            label: "Colunas",
            children: [
              { label: "Editar fluxo", href: "/boards" },
              { label: "Personalizar status", href: "/boards" },
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
          {
            label: "Em andamento",
            children: [
              { label: "Website institucional", href: "/projects" },
              { label: "App mobile", href: "/projects" },
            ],
          },
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
    ],
  },
  teams: {
    title: "Times",
    sections: [
      {
        title: "Pessoas",
        items: [
          { label: "Time de desenvolvimento", href: "/teams" },
          { label: "Time de design", href: "/teams" },
        ],
      },
    ],
  },
  analytics: {
    title: "Analytics",
    sections: [
      {
        title: "Relatorios",
        items: [
          { label: "Produtividade", href: "/analytics" },
          {
            label: "Entregas",
            children: [
              { label: "Por sprint", href: "/analytics" },
              { label: "Por membro", href: "/analytics" },
            ],
          },
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
  isActive,
  onHover,
}: {
  href: string
  label: string
  icon: React.ReactNode
  isActive: boolean
  onHover?: () => void
}) {
  const [isHovered, setIsHovered] = React.useState(false)

  return (
    <Link
      href={href}
      className="relative flex h-10 w-10 items-center justify-center rounded-xl"
      aria-label={label}
      title={label}
      onMouseEnter={onHover}
      onMouseOver={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
          isActive ? "bg-white/12 text-white" : "text-zinc-400"
        )}
        style={{
          transform: isHovered ? "translateY(-2px) scale(1.08)" : "translateY(0) scale(1)",
          backgroundColor: isActive
            ? "rgba(255,255,255,0.12)"
            : isHovered
              ? "rgba(255,255,255,0.09)"
              : "transparent",
          color: isActive || isHovered ? "#ffffff" : "#a1a1aa",
          boxShadow: isHovered ? "0 0 24px rgba(255,255,255,0.08)" : "none",
        }}
      >
        {icon}
      </span>
      <span
        className="pointer-events-none absolute top-1/2 z-40 -translate-y-1/2 rounded-full border border-white/10 bg-black/95 px-3 py-1 text-xs font-medium text-white shadow-lg transition-all duration-300"
        style={{
          left: isHovered ? "3.5rem" : "3rem",
          opacity: isHovered ? 1 : 0,
        }}
      >
        {label}
      </span>
    </Link>
  )
}

export default function SidebarComponent() {
  const pathname = usePathname()
  const [isHovered, setIsHovered] = React.useState(false)
  const [previewSection, setPreviewSection] = React.useState<NavSectionId | null>(null)
  const [boards, setBoards] = React.useState<Array<{ id: string; title: string }>>([])
  const [me, setMe] = React.useState<{ name: string; email: string; avatarUrl: string } | null>(
    null,
  )
  const [expandedItems, setExpandedItems] = React.useState<Record<string, boolean>>({
    "Kanban-Projetos": true,
  })
  const activeSection = getActiveSection(pathname)
  const visibleSection = previewSection ?? activeSection
  const isCollapsed = !isHovered
  const content = React.useMemo(() => {
    if (visibleSection !== "boards") return sidebarContent[visibleSection]

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
  }, [boards, visibleSection])

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
          return { id: r.id, title: r.title, lastAt }
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

  React.useEffect(() => {
    let alive = true
    async function loadMe() {
      try {
        const profile = (await getMyProfile()) as Record<string, unknown>
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        const name = String(
          profile.full_name ?? profile.name ?? profile.display_name ?? user.email ?? "Usuário",
        )
        const email = String(profile.email ?? user.email ?? "")
        const avatarUrl = String(profile.avatar_url ?? profile.avatarUrl ?? profile.avatar ?? "")

        if (!alive) return
        setMe({
          name: name.trim() || "Usuário",
          email: email.trim(),
          avatarUrl: avatarUrl.trim(),
        })
      } catch {
        // ignore
      }
    }
    void loadMe()
    return () => {
      alive = false
    }
  }, [])

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
                isActive={activeSection === item.id}
                onHover={() => {
                  setIsHovered(true)
                  setPreviewSection(item.id)
                }}
              />
            ))}
          </div>

          <div className="flex-1" />

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

          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-zinc-900 text-xs font-semibold text-white">
            FT
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
                      onClick={() => item.children && toggleExpanded(itemKey)}
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
                      {!isCollapsed && item.children && (
                        <ChevronDown
                          className={cn("h-4 w-4 text-zinc-500 transition-transform", isExpanded && "rotate-180")}
                        />
                      )}
                    </button>

                    {!isCollapsed && isExpanded && item.children && (
                      <div className="ml-3 flex flex-col gap-1 border-l border-white/10 pl-3">
                        {item.children.map((child, idx) =>
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
            </div>
          ))}
        </div>

        <div className={cn("flex flex-col gap-2", isCollapsed && "items-center")}>
          <Link
            href="/boards/create"
            className={cn(
              "rounded-2xl border border-white/15 bg-white/5 text-white transition-colors hover:bg-white/10",
              isCollapsed ? "flex h-10 w-10 items-center justify-center" : "flex items-center justify-between px-3 py-3",
            )}
            title="Criar novo quadro"
            aria-label="Criar novo quadro"
          >
            {!isCollapsed && <span className="text-sm font-semibold">Criar novo quadro</span>}
            <Plus className={cn("h-4 w-4", isCollapsed && "h-5 w-5")} />
          </Link>

        {!isCollapsed && (
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
            <Avatar className="h-9 w-9 border border-white/10">
              <AvatarImage src={me?.avatarUrl || undefined} alt={me?.name || "Usuário"} />
              <AvatarFallback className="bg-white/10 text-xs font-semibold text-white">
                {initials(me?.name || "Usuário")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{me?.name || "Usuário"}</p>
              <p className="truncate text-xs text-zinc-500">{me?.email || "—"}</p>
            </div>
          </div>
        )}
        </div>
        </aside>
      </div>
    </div>
  )
}
