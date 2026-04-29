"use client"

import { ChevronDown, KeyRound, ShieldCheck, UserRound } from "lucide-react"
import * as React from "react"

import { ChangePasswordCard } from "@/components/settings/change-password-card"
import { MfaCard } from "@/components/settings/mfa-card"

type PanelId = "password" | "mfa"

function PanelHeader({
  id,
  open,
  onToggle,
  title,
  description,
  icon,
}: {
  id: PanelId
  open: boolean
  onToggle: (id: PanelId) => void
  title: string
  description: string
  icon: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-left transition hover:bg-white/[0.05]"
      aria-expanded={open}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 rounded-xl border border-white/10 bg-white/5 p-2.5">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      <ChevronDown
        className={`h-4 w-4 shrink-0 text-zinc-300 transition-transform ${open ? "rotate-180" : ""}`}
      />
    </button>
  )
}

export function LoginInfoCard() {
  const [openId, setOpenId] = React.useState<PanelId | null>(null)

  function toggle(id: PanelId) {
    setOpenId((prev) => (prev === id ? null : id))
  }

  return (
    <section className="rounded-[28px] border border-white/10 bg-black/35 p-6 backdrop-blur-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <UserRound className="h-5 w-5 text-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Informações de login
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerencie senha e proteção extra da conta.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-3">
          <PanelHeader
            id="password"
            open={openId === "password"}
            onToggle={toggle}
            title="Alterar senha"
            description="Reautentique e defina uma nova senha."
            icon={<KeyRound className="h-4 w-4 text-foreground" />}
          />

          {openId === "password" && (
            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
              <ChangePasswordCard embedded />
            </div>
          )}
        </div>

        <div className="space-y-3">
          <PanelHeader
            id="mfa"
            open={openId === "mfa"}
            onToggle={toggle}
            title="Verificação em duas etapas (2FA)"
            description="Ative um app autenticador para reforçar a segurança."
            icon={<ShieldCheck className="h-4 w-4 text-foreground" />}
          />

          {openId === "mfa" && (
            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
              <MfaCard embedded />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
