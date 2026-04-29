"use client"

import { Check, ChevronDown } from "lucide-react"
import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserAvatars } from "@/components/ui/user-avatars"
import { cn } from "@/lib/utils"

export type MemberOption = {
  id: string
  name: string
  imageSrc: string
}

type MembersSelectProps = {
  label?: string
  buttonLabel?: string
  members: MemberOption[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function MembersSelect({
  label = "Responsáveis",
  buttonLabel = "Membros responsáveis",
  members,
  selectedIds,
  onChange,
}: MembersSelectProps) {
  const [open, setOpen] = useState(false)

  const selected = members.filter((m) => selectedIds.includes(m.id))

  function toggle(id: string) {
    const checked = selectedIds.includes(id)
    const next = checked
      ? selectedIds.filter((v) => v !== id)
      : [...selectedIds, id]
    onChange(next)
  }

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/30 px-3 py-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-sm transition hover:bg-muted"
      >
        <span>{buttonLabel}</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform",
            open ? "rotate-180" : "rotate-0",
          )}
        />
      </button>

      {open && (
        <div className="mt-1 space-y-2 rounded-xl border border-border bg-popover p-2 text-xs text-popover-foreground shadow-lg">
          <div className="mb-1 flex items-center justify-between px-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Selecionar membros
            </span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[10px] font-medium text-primary hover:underline"
            >
              Limpar
            </button>
          </div>

          <div className="max-h-56 space-y-1 overflow-auto">
            {members.map((m) => {
              const checked = selectedIds.includes(m.id)
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggle(m.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-[11px] transition-colors",
                    checked ? "bg-muted" : "hover:bg-muted/70",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border text-[10px]",
                      checked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground",
                    )}
                  >
                    {checked && <Check className="h-3 w-3" />}
                  </div>
                  <Avatar className="h-6 w-6 border border-white/10">
                    <AvatarImage src={m.imageSrc || undefined} alt={m.name} />
                    <AvatarFallback className="text-[10px]">
                      {m.name
                        .split(" ")
                        .map((p) => p[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-card-foreground">
                    {m.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex justify-center pt-1">
          <UserAvatars
            users={selected.map((m) => ({
              id: m.id,
              name: m.name,
              image: m.imageSrc,
            }))}
            size={44}
            maxVisible={6}
            overlap={58}
            focusScale={1.15}
            isOverlapOnly
          />
        </div>
      )}
    </div>
  )
}
