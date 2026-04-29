import type React from "react"
import { type ReactNode, useEffect, useRef } from "react"

type GlowColor = "blue" | "purple" | "green" | "red" | "orange"
type GlowSize = "sm" | "md" | "lg"

interface GlowCardProps {
  children?: ReactNode
  className?: string
  glowColor?: GlowColor
  size?: GlowSize
  width?: string | number
  height?: string | number
  customSize?: boolean // When true, ignores size prop and uses width/height or className
}

const glowColorMap: Record<GlowColor, { base: number; spread: number }> = {
  blue: { base: 220, spread: 200 },
  purple: { base: 280, spread: 300 },
  green: { base: 120, spread: 200 },
  red: { base: 0, spread: 200 },
  orange: { base: 30, spread: 200 },
}

const sizeMap: Record<GlowSize, string> = {
  sm: "w-48 h-64",
  md: "w-64 h-80",
  lg: "w-80 h-96",
}

const GlowCard: React.FC<GlowCardProps> = ({
  children,
  className = "",
  glowColor = "blue",
  size = "md",
  width,
  height,
  customSize = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const syncPointer = (e: PointerEvent) => {
      const { clientX: x, clientY: y } = e

      if (cardRef.current) {
        cardRef.current.style.setProperty("--x", x.toFixed(2))
        cardRef.current.style.setProperty(
          "--xp",
          (x / window.innerWidth).toFixed(2),
        )
        cardRef.current.style.setProperty("--y", y.toFixed(2))
        cardRef.current.style.setProperty(
          "--yp",
          (y / window.innerHeight).toFixed(2),
        )
      }
    }

    document.addEventListener("pointermove", syncPointer)
    return () => document.removeEventListener("pointermove", syncPointer)
  }, [])

  const { base, spread } = glowColorMap[glowColor]

  const getSizeClasses = () => {
    if (customSize) return ""
    return sizeMap[size]
  }

  const getInlineStyles = (): React.CSSProperties => {
    const baseStyles = {
      "--base": base,
      "--spread": spread,
      "--radius": "14",
      "--border": "2",
      "--backdrop": "hsl(0 0% 100% / 0.025)",
      "--backup-border": "hsl(0 0% 100% / 0.16)",
      "--size": "220",
      "--outer": "0.25",
      "--border-size": "calc(var(--border, 2) * 1px)",
      "--spotlight-size": "calc(var(--size, 180) * 1px)",
      "--hue": "calc(var(--base) + (var(--xp, 0) * var(--spread, 0)))",
      "--saturation": "60",
      "--lightness": "92",
      "--bg-spot-opacity": "0.14",
      "--border-spot-opacity": "0.65",
      "--border-light-opacity": "0.5",
      backgroundImage: `radial-gradient(
        var(--spotlight-size) var(--spotlight-size) at
        calc(var(--x, 0) * 1px)
        calc(var(--y, 0) * 1px),
        hsl(var(--hue, 210) calc(var(--saturation, 60) * 1%) calc(var(--lightness, 92) * 1%) / var(--bg-spot-opacity, 0.18)), transparent
      )`,
      backgroundColor: "var(--backdrop, transparent)",
      backgroundSize:
        "calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)))",
      backgroundPosition: "50% 50%",
      backgroundAttachment: "fixed",
      border: "var(--border-size) solid var(--backup-border)",
      position: "relative",
      touchAction: "none",
      borderRadius: "1.25rem",
    } as React.CSSProperties & Record<string, string | number>

    if (width !== undefined) {
      baseStyles.width = typeof width === "number" ? `${width}px` : width
    }
    if (height !== undefined) {
      baseStyles.height = typeof height === "number" ? `${height}px` : height
    }

    return baseStyles
  }

  const beforeAfterStyles = `
    [data-glow]::before,
    [data-glow]::after {
      pointer-events: none;
      content: "";
      position: absolute;
      inset: calc(var(--border-size) * -1);
      border: var(--border-size) solid transparent;
      border-radius: calc(var(--radius) * 1px);
      background-attachment: fixed;
      background-size: calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)));
      background-repeat: no-repeat;
      background-position: 50% 50%;
      mask: linear-gradient(transparent, transparent), linear-gradient(white, white);
      mask-clip: padding-box, border-box;
      mask-composite: intersect;
    }

    [data-glow]::before {
      background-image: radial-gradient(
        calc(var(--spotlight-size) * 0.7) calc(var(--spotlight-size) * 0.7) at
        calc(var(--x, 0) * 1px)
        calc(var(--y, 0) * 1px),
        hsl(var(--hue, 210) 40% 92% / var(--border-spot-opacity, 0.65)), transparent 100%
      );
      filter: brightness(1.05);
      opacity: 0.7;
    }

    [data-glow]::after {
      background-image: radial-gradient(
        calc(var(--spotlight-size) * 0.4) calc(var(--spotlight-size) * 0.4) at
        calc(var(--x, 0) * 1px)
        calc(var(--y, 0) * 1px),
        hsl(0 0% 100% / var(--border-light-opacity, 0.5)), transparent 100%
      );
    }

    [data-glow] [data-glow] {
      position: absolute;
      inset: 0;
      will-change: filter;
      opacity: var(--outer, 0.25);
      border-radius: calc(var(--radius) * 1px);
      border-width: calc(var(--border-size) * 18);
      filter: blur(calc(var(--border-size) * 9));
      background: none;
      pointer-events: none;
      border: none;
    }

    [data-glow] > [data-glow]::before {
      inset: -10px;
      border-width: 10px;
    }
  `

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: beforeAfterStyles }} />
      <div
        ref={cardRef}
        data-glow
        style={getInlineStyles()}
        className={`
          ${getSizeClasses()}
          ${!customSize ? "aspect-[3/4]" : ""}
          relative 
          grid 
          grid-rows-[1fr_auto] 
          bg-black/20
          p-4 
          gap-4 
          backdrop-blur-[6px]
          shadow-[0_1.25rem_2.5rem_-1.5rem_rgba(0,0,0,0.8)]
          ${className}
        `}
      >
        <div ref={innerRef} data-glow />
        {children}
      </div>
    </>
  )
}

export { GlowCard }
