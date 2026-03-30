"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "framer-motion"
import { type ReactNode, useState } from "react"

export interface NativeHoverCardProps {
  imageSrc: string
  imageAlt?: string
  name: string
  username?: string
  description?: string
  buttonText?: string
  onButtonClick?: () => void
  buttonContent?: ReactNode
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  variant?: "default" | "glass" | "bordered"
}

const imageSizeVariants = {
  sm: "h-16 w-16",
  md: "h-24 w-24",
  lg: "h-32 w-32",
  xl: "h-40 w-40",
}

const hoverPanelWidthVariants = {
  sm: "min-w-28",
  md: "min-w-36",
  lg: "min-w-44",
  xl: "min-w-52",
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

export function AvatarHoverCard({
  imageSrc,
  imageAlt,
  name,
  username,
  size = "md",
  className,
  variant = "default",
}: NativeHoverCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const getVariantStyles = () => {
    switch (variant) {
      case "glass":
        return "border border-white/10 bg-black/70 backdrop-blur-xl"
      case "bordered":
        return "border-2 border-white/15 bg-card/95"
      default:
        return "border border-white/10 bg-card/95"
    }
  }

  const avatarElement = (
    <Avatar className="h-full w-full ring-1 ring-white/10">
      <AvatarImage src={imageSrc || "/placeholder.svg"} alt={imageAlt || name} />
      <AvatarFallback>{getInitials(name)}</AvatarFallback>
    </Avatar>
  )

  return (
    <div
      className={cn("relative flex w-full flex-col items-center", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        className="relative z-10 flex flex-col items-center"
        initial={false}
        animate={{ y: isHovered ? -6 : 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
      >
        <motion.div
          className={cn(
            "relative overflow-hidden rounded-full border border-white/10 bg-black/30 shadow-[0_10px_30px_rgba(0,0,0,0.25)]",
            imageSizeVariants[size]
          )}
          animate={{
            scale: isHovered ? 1.08 : 1,
            padding: isHovered ? 8 : 0,
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 24,
          }}
        >
          {avatarElement}
        </motion.div>
      </motion.div>

      <AnimatePresence initial={false}>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            className={cn(
              "absolute top-[calc(100%-1rem)] left-1/2 z-20 -translate-x-1/2 overflow-hidden rounded-2xl px-4 py-3 text-center shadow-[0_20px_40px_rgba(0,0,0,0.35)]",
              hoverPanelWidthVariants[size],
              getVariantStyles()
            )}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_45%)]" />
            <div className="relative space-y-1.5">
              <div>
                <h3 className="text-sm font-bold leading-tight text-foreground">{name}</h3>
                {username && <p className="text-sm text-muted-foreground">@{username}</p>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
