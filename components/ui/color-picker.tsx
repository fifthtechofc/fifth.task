"use client"

import type { PopoverContentProps } from "@radix-ui/react-popover"
import {
  type HexColor,
  type HslaColor,
  type HsvaColor,
  hexToHsva,
  hsvaToHex,
  hsvaToHsla,
  hsvaToRgba,
  type RgbaColor,
} from "@uiw/color-convert"
import React from "react"

import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

type ColorPickerValue = {
  hex: string
  hsl: HslaColor
  rgb: RgbaColor
}

type ColorPickerProps = {
  value?: string | HsvaColor | HslaColor | RgbaColor
  type?: "hsl" | "rgb" | "hex"
  swatches?: HexColor[]
  hideContrastRatio?: boolean
  hideDefaultSwatches?: boolean
  className?: string
  onValueChange?: (value: ColorPickerValue) => void
  children: React.ReactNode
} & PopoverContentProps

const DEFAULT_COLOR = "#6366F1"
const DEFAULT_SWATCHES = [
  "#F43F5E",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#06B6D4",
  "#3B82F6",
  "#6366F1",
  "#A855F7",
  "#EC4899",
  "#71717A",
] as const

function normalizeHex(value: string | undefined | null): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  const hex = trimmed.startsWith("#") ? trimmed : `#${trimmed}`
  if (!/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(hex)) return null
  if (hex.length === 4) {
    return `#${hex
      .slice(1)
      .split("")
      .map((char) => `${char}${char}`)
      .join("")}`.toUpperCase()
  }
  return hex.toUpperCase()
}

function getHexFromValue(
  value: string | HsvaColor | HslaColor | RgbaColor | undefined,
): string {
  if (!value) return DEFAULT_COLOR
  if (typeof value === "string") {
    return normalizeHex(value) ?? DEFAULT_COLOR
  }
  try {
    return normalizeHex(hsvaToHex(value as HsvaColor)) ?? DEFAULT_COLOR
  } catch {
    return DEFAULT_COLOR
  }
}

function buildColorValue(hex: string): ColorPickerValue {
  const hsva = hexToHsva(hex)
  return {
    hex,
    hsl: hsvaToHsla(hsva),
    rgb: hsvaToRgba(hsva),
  }
}

function formatColorType(
  hex: string,
  type: "hsl" | "rgb" | "hex",
): { label: string; value: string } {
  if (type === "hex") {
    return { label: "HEX", value: hex }
  }

  const { hsl, rgb } = buildColorValue(hex)
  if (type === "rgb") {
    return {
      label: "RGB",
      value: `${rgb.r}, ${rgb.g}, ${rgb.b}`,
    }
  }

  return {
    label: "HSL",
    value: `${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%`,
  }
}

function ColorPicker({
  value,
  children,
  type = "hex",
  swatches = [],
  hideContrastRatio,
  hideDefaultSwatches,
  onValueChange,
  className,
  ...props
}: ColorPickerProps) {
  const resolvedColor = React.useMemo(() => getHexFromValue(value), [value])
  const [hexInput, setHexInput] = React.useState(resolvedColor)

  React.useEffect(() => {
    setHexInput(resolvedColor)
  }, [resolvedColor])

  const mergedSwatches = React.useMemo(() => {
    void hideContrastRatio
    const palette = hideDefaultSwatches
      ? swatches
      : [...DEFAULT_SWATCHES, ...swatches]

    return [
      ...new Set(palette.map((item) => normalizeHex(item) ?? DEFAULT_COLOR)),
    ]
  }, [hideDefaultSwatches, swatches])

  const commitColor = React.useCallback(
    (nextHex: string) => {
      const normalized = normalizeHex(nextHex)
      if (!normalized) return
      setHexInput(normalized)
      onValueChange?.(buildColorValue(normalized))
    },
    [onValueChange],
  )

  const meta = React.useMemo(
    () => formatColorType(resolvedColor, type),
    [resolvedColor, type],
  )

  return (
    <Popover {...props}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        {...props}
        className={cn(
          className,
          "z-[250] w-[320px] border border-white/10 bg-zinc-950/98 p-0 text-zinc-100 shadow-2xl shadow-black/40 backdrop-blur-xl",
        )}
      >
        <div className="space-y-4 p-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <div
              className="mb-3 h-24 w-full rounded-lg border border-white/10 shadow-inner"
              style={{ backgroundColor: resolvedColor }}
            />
            <label className="block text-xs font-medium text-zinc-400">
              Escolher cor
            </label>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="color"
                value={resolvedColor}
                onChange={(e) => commitColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-md border border-white/10 bg-transparent"
              />
              <div className="min-w-0 flex-1">
                <Input
                  value={hexInput}
                  onChange={(e) => setHexInput(e.target.value.toUpperCase())}
                  onBlur={() => {
                    const normalized = normalizeHex(hexInput)
                    setHexInput(normalized ?? resolvedColor)
                    if (normalized) commitColor(normalized)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      const normalized = normalizeHex(hexInput)
                      setHexInput(normalized ?? resolvedColor)
                      if (normalized) commitColor(normalized)
                    }
                  }}
                  className="border-white/10 bg-black/40 text-zinc-100"
                />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
              <span>{meta.label}</span>
              <span className="font-mono">{meta.value}</span>
            </div>
          </div>

          {mergedSwatches.length > 0 && (
            <>
              <Separator className="bg-white/10" />
              <div className="grid grid-cols-5 gap-2">
                {mergedSwatches.map((color) => {
                  const isActive = color === resolvedColor
                  return (
                    <button
                      type="button"
                      key={color}
                      aria-label={`Selecionar ${color}`}
                      onClick={() => commitColor(color)}
                      className={cn(
                        "h-9 rounded-lg border transition-transform hover:scale-[1.03]",
                        isActive
                          ? "border-white/70 ring-2 ring-white/20"
                          : "border-white/10",
                      )}
                      style={{ backgroundColor: color }}
                    />
                  )
                })}
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export type { ColorPickerProps, ColorPickerValue }
export { ColorPicker }
