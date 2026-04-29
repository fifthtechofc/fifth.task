"use client"

import { MoreHorizontal, Plus } from "lucide-react"

import { cn } from "@/lib/utils"

export interface CardData {
  id: number
  colorClass: "green" | "orange" | "red" | "blue"
  date: string
  title: string
  description: string
  progressPercent: string
  progressValue: string
  imgSrc1?: string
  imgAlt1?: string
  imgSrc2?: string
  imgAlt2?: string
  countdownText: string
}

interface CardProps {
  data: CardData
}

const accentClassMap: Record<CardData["colorClass"], string> = {
  green: "bg-zinc-200/90",
  orange: "bg-zinc-300/85",
  red: "bg-zinc-400/80",
  blue: "bg-slate-300/85",
}

const ringClassMap: Record<CardData["colorClass"], string> = {
  green: "shadow-[0_0_0_1px_rgba(255,255,255,0.08)]",
  orange: "shadow-[0_0_0_1px_rgba(255,255,255,0.08)]",
  red: "shadow-[0_0_0_1px_rgba(255,255,255,0.08)]",
  blue: "shadow-[0_0_0_1px_rgba(255,255,255,0.08)]",
}

const progressClassMap: Record<CardData["colorClass"], string> = {
  green: "bg-zinc-100/90",
  orange: "bg-zinc-200/90",
  red: "bg-zinc-300/85",
  blue: "bg-slate-200/90",
}

function TeamAvatar({ src, alt }: { src: string; alt: string }) {
  return (
    <li className="-ml-2 first:ml-0">
      <img
        src={src}
        alt={alt}
        className="h-10 w-10 rounded-full border-2 border-[var(--bg-dark)] object-cover"
      />
    </li>
  )
}

export default function CourseDesignCard({ data }: CardProps) {
  const {
    colorClass,
    date,
    title,
    description,
    progressPercent,
    progressValue,
    imgSrc1,
    imgAlt1,
    imgSrc2,
    imgAlt2,
    countdownText,
  } = data

  return (
    <article
      className={cn(
        "group flex min-h-[320px] flex-col justify-between rounded-[28px] border border-white/8 bg-black/35 p-6 text-[var(--color-white)] backdrop-blur-xl transition-transform duration-300 hover:-translate-y-1",
        ringClassMap[colorClass],
      )}
    >
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <span
              className={cn(
                "inline-flex rounded-full border border-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-black",
                accentClassMap[colorClass],
              )}
            >
              {description}
            </span>
            <p className="text-sm text-[var(--color-gray-light)]/70">{date}</p>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[var(--color-gray-light)] transition-colors hover:bg-white/10"
            aria-label={`Acoes do projeto ${title}`}
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <h3 className="text-2xl font-semibold capitalize tracking-tight text-[var(--color-white)]">
            {title}
          </h3>
          <p className="max-w-[28ch] text-sm leading-6 text-[var(--color-gray-light)]/75">
            Projeto em andamento com foco na entrega visual, validacao do fluxo
            e consistencia da experiencia.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-[var(--color-gray-light)]/80">
            <span>Progress</span>
            <span className="font-semibold text-[var(--color-white)]">
              {progressValue}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-500",
                progressClassMap[colorClass],
              )}
              style={{ width: progressPercent }}
            />
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4 border-t border-white/8 pt-5">
        <ul className="flex items-center">
          {imgSrc1 && (
            <TeamAvatar src={imgSrc1} alt={imgAlt1 || "User avatar"} />
          )}
          {imgSrc2 && (
            <TeamAvatar src={imgSrc2} alt={imgAlt2 || "User avatar"} />
          )}
          <li className="-ml-2">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--bg-dark)] bg-white text-black transition-transform hover:scale-105"
              aria-label={`Adicionar membro ao projeto ${title}`}
            >
              <Plus className="h-5 w-5" />
            </button>
          </li>
        </ul>

        <span
          className={cn(
            "rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-black",
            accentClassMap[colorClass],
          )}
        >
          {countdownText}
        </span>
      </div>
    </article>
  )
}
