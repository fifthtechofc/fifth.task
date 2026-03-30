"use client"

import type React from "react"
import { useRef, useState } from "react"

const weekData = [
  { day: "Sun", value: 450 },
  { day: "Mon", value: 520 },
  { day: "Tue", value: 680 },
  { day: "Wed", value: 750 },
  { day: "Thu", value: 620 },
  { day: "Fri", value: 780 },
  { day: "Sat", value: 920 },
]

export function BudgetCard() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(3)
  const chartRef = useRef<SVGSVGElement>(null)

  const maxValue = Math.max(...weekData.map((d) => d.value))
  const minValue = Math.min(...weekData.map((d) => d.value))
  const chartHeight = 160
  const chartWidth = 360
  const padding = { top: 40, bottom: 35, left: 10, right: 10 }

  const getY = (value: number) => {
    const range = maxValue - minValue || 1
    const normalized = (value - minValue) / range
    return chartHeight - padding.bottom - normalized * (chartHeight - padding.top - padding.bottom)
  }

  const getX = (index: number) =>
    padding.left + (index / (weekData.length - 1)) * (chartWidth - padding.left - padding.right)

  const generatePath = () => {
    const points = weekData.map((d, i) => ({ x: getX(i), y: getY(d.value) }))

    let path = `M ${points[0].x} ${points[0].y}`

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[i + 2] || p2

      const tension = 0.35
      const cp1x = p1.x + (p2.x - p0.x) * tension
      const cp1y = p1.y + (p2.y - p0.y) * tension
      const cp2x = p2.x - (p3.x - p1.x) * tension
      const cp2y = p2.y - (p3.y - p1.y) * tension

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
    }

    return path
  }

  const generateAreaPath = () => {
    const linePath = generatePath()
    const lastPoint = weekData.length - 1
    return `${linePath} L ${getX(lastPoint)} ${chartHeight - padding.bottom} L ${getX(0)} ${chartHeight - padding.bottom} Z`
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!chartRef.current) return
    const rect = chartRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const relativeX = (x / rect.width) * chartWidth

    let closestIndex = 0
    let closestDist = Number.POSITIVE_INFINITY
    weekData.forEach((_, i) => {
      const dist = Math.abs(getX(i) - relativeX)
      if (dist < closestDist) {
        closestDist = dist
        closestIndex = i
      }
    })
    setHoveredIndex(closestIndex)
  }

  const scatteredDots = Array.from({ length: 35 }, (_, i) => {
    const offsetX = ((i * 17) % 13) - 6
    const offsetY = ((i * 11) % 9) - 4
    const opacity = 0.2 + ((i * 7) % 10) * 0.03
    const size = 1.2 + ((i * 5) % 6) * 0.2

    return {
      x: 40 + (i % 7) * 42 + offsetX,
      y: padding.top + 15 + Math.floor(i / 7) * 15 + offsetY,
      opacity,
      size,
    }
  })

  return (
    <div className="relative w-full rounded-[36px] border border-white/10 bg-white/[0.04] p-3.5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]">
      <div
        className="pointer-events-none absolute inset-[1px] rounded-[35px] bg-gradient-to-b from-white/6 to-transparent"
        style={{ height: "50%" }}
      />

      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black/35 p-7 pb-5">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <p className="text-[15px] font-medium tracking-wide text-muted-foreground">
              Budget
            </p>
            <h2 className="mt-1.5 text-[46px] font-semibold leading-[1] tracking-[-0.02em] text-card-foreground">
              $30.739
            </h2>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 shadow-[0_1px_3px_rgba(0,0,0,0.15)]">
              <span className="text-[14px] font-semibold text-foreground">+ $317</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-foreground">
                <path
                  d="M2 11L6 7L9 10L14 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 4H14V8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <div className="relative -mr-1 -mt-1 h-[110px] w-[130px]">
            <MoneyIllustration />
          </div>
        </div>

        <div className="relative mt-2">
          <svg
            ref={chartRef}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredIndex(3)}
            style={{ cursor: "default" }}
          >
            <defs>
              <linearGradient id="analyticsAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c7d1db" stopOpacity="0.28" />
                <stop offset="50%" stopColor="#c7d1db" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#c7d1db" stopOpacity="0.02" />
              </linearGradient>
              <filter id="analyticsTooltipShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.2" />
              </filter>
              <filter id="analyticsDotGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {weekData.map((_, i) => (
              <line
                key={i}
                x1={getX(i)}
                y1={padding.top}
                x2={getX(i)}
                y2={chartHeight - padding.bottom}
                stroke="rgba(255,255,255,0.14)"
                strokeWidth="1"
                strokeDasharray="3 5"
                opacity={hoveredIndex === i ? 0.8 : 0.45}
              />
            ))}

            {scatteredDots.map((dot, i) => (
              <circle key={i} cx={dot.x} cy={dot.y} r={dot.size} fill="rgba(255,255,255,0.12)" opacity={dot.opacity} />
            ))}

            <path d={generateAreaPath()} fill="url(#analyticsAreaGradient)" className="transition-all duration-300" />

            <path
              d={generatePath()}
              fill="none"
              stroke="#c7d1db"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {hoveredIndex !== null && (
              <g className="transition-all duration-150 ease-out">
                <circle
                  cx={getX(hoveredIndex)}
                  cy={getY(weekData[hoveredIndex].value)}
                  r="12"
                  fill="rgba(255,255,255,0.18)"
                />
                <circle
                  cx={getX(hoveredIndex)}
                  cy={getY(weekData[hoveredIndex].value)}
                  r="8"
                  fill="#101214"
                  stroke="#c7d1db"
                  strokeWidth="3"
                  filter="url(#analyticsDotGlow)"
                />
              </g>
            )}

            {weekData.map((d, i) => (
              <text
                key={i}
                x={getX(i)}
                y={chartHeight - 8}
                textAnchor="middle"
                className="fill-muted-foreground text-[12px] font-medium"
              >
                {d.day}
              </text>
            ))}
          </svg>

          {hoveredIndex !== null && (
            <div
              className="pointer-events-none absolute transition-all duration-150 ease-out"
              style={{
                left: `${(getX(hoveredIndex) / chartWidth) * 100}%`,
                top: `${(getY(weekData[hoveredIndex].value) / chartHeight) * 100}%`,
                transform: "translate(-50%, -140%)",
              }}
            >
              <div className="relative rounded-xl bg-black/90 px-4 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.2)] backdrop-blur-sm">
                <span className="text-[14px] font-semibold text-foreground">
                  ${weekData[hoveredIndex].value}
                </span>
                <div className="absolute left-1/2 -bottom-2 h-0 w-0 -translate-x-1/2 border-r-8 border-l-8 border-t-8 border-r-transparent border-l-transparent border-t-black/90" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MoneyIllustration() {
  return (
    <svg viewBox="0 0 130 110" className="h-full w-full drop-shadow-lg">
      <defs>
        <linearGradient id="analyticsBill1" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#20262b" />
          <stop offset="40%" stopColor="#1a1f24" />
          <stop offset="100%" stopColor="#14181c" />
        </linearGradient>
        <linearGradient id="analyticsBill2" x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stopColor="#242b31" />
          <stop offset="50%" stopColor="#1c2127" />
          <stop offset="100%" stopColor="#171b20" />
        </linearGradient>
        <linearGradient id="analyticsBill3" x1="0" y1="0" x2="0.1" y2="1">
          <stop offset="0%" stopColor="#2a3238" />
          <stop offset="100%" stopColor="#1d2329" />
        </linearGradient>
        <linearGradient id="analyticsHoleGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(199,209,219,0.65)" />
          <stop offset="100%" stopColor="rgba(199,209,219,0.35)" />
        </linearGradient>
      </defs>

      <g transform="translate(8, 12) rotate(-20, 40, 25)">
        <rect x="0" y="0" width="80" height="48" rx="6" fill="url(#analyticsBill1)" />
        <circle cx="62" cy="14" r="7" fill="url(#analyticsHoleGrad)" />
        <circle cx="62" cy="34" r="5" fill="url(#analyticsHoleGrad)" />
      </g>

      <g transform="translate(22, 28) rotate(-10, 40, 25)">
        <rect x="0" y="0" width="80" height="48" rx="6" fill="url(#analyticsBill2)" />
        <circle cx="62" cy="14" r="7" fill="url(#analyticsHoleGrad)" />
        <circle cx="62" cy="34" r="5" fill="url(#analyticsHoleGrad)" />
      </g>

      <g transform="translate(38, 44) rotate(-2, 40, 25)">
        <rect x="0" y="0" width="80" height="48" rx="6" fill="url(#analyticsBill3)" />
        <circle cx="62" cy="14" r="7" fill="url(#analyticsHoleGrad)" />
        <circle cx="62" cy="34" r="5" fill="url(#analyticsHoleGrad)" />
      </g>
    </svg>
  )
}
