"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const presetColumnColors = [
  "#0ea5e9",
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#64748b",
] as const

interface ColumnColorFieldProps {
  value: string
  onChange: (value: string) => void
  id?: string
  label?: string
  disabled?: boolean
}

export function ColumnColorField({
  value,
  onChange,
  id = "column-color",
  label = "Cor da coluna",
  disabled = false,
}: ColumnColorFieldProps) {
  const safeColor = React.useMemo(() => {
    const normalized = value.trim()
    if (/^#[0-9a-fA-F]{6}$/.test(normalized)) return normalized
    if (/^[0-9a-fA-F]{6}$/.test(normalized)) return `#${normalized}`
    return "#0ea5e9"
  }, [value])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1">
          <span
            className="h-3.5 w-3.5 rounded-full border border-white/15"
            style={{ backgroundColor: safeColor }}
          />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-300">
            {safeColor}
          </span>
        </div>
      </div>

      <div
        className="h-20 rounded-2xl border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
        style={{
          background: `linear-gradient(135deg, ${safeColor} 0%, rgba(255,255,255,0.08) 100%)`,
        }}
      />

      <div className="grid grid-cols-4 gap-2">
        {presetColumnColors.map((color) => {
          const selected = safeColor.toLowerCase() === color
          return (
            <button
              key={color}
              type="button"
              disabled={disabled}
              onClick={() => onChange(color)}
              className={cn(
                "h-11 rounded-xl border transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60",
                selected ? "border-white/60 ring-2 ring-white/20" : "border-white/10",
              )}
              style={{ backgroundColor: color }}
              aria-label={`Selecionar cor ${color}`}
            />
          )
        })}
      </div>

      <Input
        id={id}
        value={safeColor}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#0ea5e9"
        className="border-white/15 bg-black/35 font-mono uppercase text-zinc-100"
      />
    </div>
  )
}
