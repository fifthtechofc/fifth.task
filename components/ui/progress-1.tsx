"use client"

import { cn } from "@/lib/utils"

export type LinearBasicProps = {
  className?: string
  value?: number | null
  defaultValue?: number
  size?: "sm" | "md"
  light?: boolean
  /** Trilha escura sobre fundo claro (ex.: splash com logo em PNG claro). */
  onLight?: boolean
  /** Brilho ao redor do preenchimento (use com `light` / barra branca). */
  glow?: boolean
}

export default function LinearBasic({
  className,
  value,
  defaultValue = 65,
  size = "md",
  light = false,
  onLight = false,
  glow = false,
}: LinearBasicProps) {
  const numericValue = value ?? defaultValue
  const isIndeterminate = value === null
  const clampedValue = Math.max(0, Math.min(100, numericValue))

  return (
    <div
      className={cn(
        "mx-auto w-full",
        size === "sm" ? "max-w-[200px]" : "max-w-sm",
        glow && "py-1.5",
        className,
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={isIndeterminate ? undefined : clampedValue}
      aria-valuetext={
        isIndeterminate ? "Carregando" : `${Math.round(clampedValue)}%`
      }
    >
      <div
        className={cn(
          "w-full rounded-full",
          size === "sm" ? "h-0.5" : "h-2",
          glow ? "overflow-visible" : "overflow-hidden",
          onLight
            ? "bg-neutral-200"
            : light
              ? glow
                ? "bg-white/30"
                : "bg-white/20"
              : "bg-[var(--color-muted-surface)]",
        )}
      >
        <div
          className={cn(
            "h-full rounded-full",
            onLight
              ? "bg-neutral-600"
              : light
                ? "bg-white"
                : "bg-[var(--color-text-primary)]",
            glow &&
              light &&
              "shadow-[0_0_5px_1px_rgba(255,255,255,0.4),0_0_12px_rgba(255,255,255,0.15)]",
            isIndeterminate
              ? "w-[40%] min-w-[40%] animate-pulse"
              : "transition-[width] duration-150 ease-linear",
          )}
          style={isIndeterminate ? undefined : { width: `${clampedValue}%` }}
        />
      </div>
    </div>
  )
}
