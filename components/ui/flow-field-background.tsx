"use client"

import React, { useEffect, useMemo, useRef } from "react"
import { cn } from "@/lib/utils"

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  life: number
}

export interface NeuralBackgroundProps {
  className?: string
  /**
   * Color of the particles.
   * Defaults to a cyan/indigo mix if not specified.
   */
  color?: string
  /**
   * Opacity of the trails (0.0 to 1.0).
   * Lower = longer trails. Higher = shorter trails.
   * Default: 0.15
   */
  trailOpacity?: number
  /**
   * Number of particles. Default: 600
   */
  particleCount?: number
  /**
   * Speed multiplier. Default: 1
   */
  speed?: number
}

export default function NeuralBackground({
  className,
  color = "#6366f1",
  trailOpacity = 0.15,
  particleCount = 600,
  speed = 1,
}: NeuralBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const particleCountMemo = useMemo(() => particleCount, [particleCount])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let width = container.clientWidth
    let height = container.clientHeight
    let particles: Particle[] = []
    let animationFrameId = 0
    const mouse = { x: -1000, y: -1000 }

    const init = () => {
      width = container.clientWidth
      height = container.clientHeight

      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      // Reset transform on every init to avoid cumulative scaling.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      particles = Array.from({ length: particleCountMemo }).map(() => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: 0,
        vy: 0,
        age: 0,
        life: Math.random() * 200 + 100,
      }))
    }

    const update = () => {
      // Draw a semi-transparent rect instead of clearing.
      ctx.fillStyle = `rgba(0, 0, 0, ${trailOpacity})`
      ctx.fillRect(0, 0, width, height)

      particles.forEach((p) => {
        // Flow-field-ish angle from position.
        const angle = (Math.cos(p.x * 0.005) + Math.sin(p.y * 0.005)) * Math.PI

        p.vx += Math.cos(angle) * 0.2 * speed
        p.vy += Math.sin(angle) * 0.2 * speed

        // Mouse repulsion/attraction
        const dx = mouse.x - p.x
        const dy = mouse.y - p.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const interactionRadius = 150

        if (distance < interactionRadius) {
          const force = (interactionRadius - distance) / interactionRadius
          p.vx -= dx * force * 0.05
          p.vy -= dy * force * 0.05
        }

        p.x += p.vx
        p.y += p.vy

        p.vx *= 0.95
        p.vy *= 0.95

        p.age += 1
        if (p.age > p.life) {
          p.x = Math.random() * width
          p.y = Math.random() * height
          p.vx = 0
          p.vy = 0
          p.age = 0
          p.life = Math.random() * 200 + 100
        }

        // Wrap around screen.
        if (p.x < 0) p.x = width
        if (p.x > width) p.x = 0
        if (p.y < 0) p.y = height
        if (p.y > height) p.y = 0

        // Draw dot
        const alpha = 1 - Math.abs(p.age / p.life - 0.5) * 2
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
        ctx.fillStyle = color
        ctx.fillRect(p.x, p.y, 1.5, 1.5)
        ctx.globalAlpha = 1
      })

      animationFrameId = requestAnimationFrame(update)
    }

    const handleResize = () => init()
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }
    const handleMouseLeave = () => {
      mouse.x = -1000
      mouse.y = -1000
    }

    init()
    update()

    window.addEventListener("resize", handleResize)
    container.addEventListener("mousemove", handleMouseMove)
    container.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      window.removeEventListener("resize", handleResize)
      container.removeEventListener("mousemove", handleMouseMove)
      container.removeEventListener("mouseleave", handleMouseLeave)
      cancelAnimationFrame(animationFrameId)
    }
  }, [color, particleCountMemo, speed, trailOpacity])

  return (
    <div ref={containerRef} className={cn("relative h-full w-full bg-black overflow-hidden", className)}>
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  )
}

