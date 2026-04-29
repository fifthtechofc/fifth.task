import { AnimatePresence, motion } from "motion/react"
import { type KeyboardEvent, useState } from "react"

import { cn } from "@/lib/utils"

interface User {
  id: string | number
  name?: string
  image: string
}

function userInitials(name?: string) {
  return (name || "User")
    .split(/\s+/)
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

interface UserAvatarsProps {
  users: User[]
  size?: number | string
  className?: string
  maxVisible?: number
  overlap?: number
  focusScale?: number
  isRightToLeft?: boolean
  isOverlapOnly?: boolean
  tooltipPlacement?: "top" | "bottom"
}

export function UserAvatars({
  users,
  size = 56,
  className,
  maxVisible = 7,
  isRightToLeft = false,
  isOverlapOnly = false,
  overlap = 60,
  focusScale = 1.2,
  tooltipPlacement = "bottom",
}: UserAvatarsProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const slicedUsers = users.slice(0, Math.min(maxVisible + 1, users.length + 1))
  const exceedMaxLength = users.length > maxVisible

  const handleKeyEnter = (e: KeyboardEvent<HTMLDivElement>, index: number) => {
    if (e.key === "Enter" || e.key === " ") {
      setHoveredIndex(index)
    }
  }

  return (
    <div className={cn("relative flex items-center", className)}>
      {slicedUsers.map((user, index) => {
        const isHoveredOne = hoveredIndex === index
        const isLengthBubble = exceedMaxLength && maxVisible === index

        const diff = 1 - overlap / 100
        const zIndex =
          isHoveredOne && isOverlapOnly
            ? slicedUsers.length
            : isRightToLeft
              ? slicedUsers.length - index
              : index

        const shouldScale =
          isHoveredOne && (!exceedMaxLength || slicedUsers.length - 1 !== index)

        const shouldShift =
          hoveredIndex !== null &&
          (isRightToLeft ? index < hoveredIndex : index > hoveredIndex) &&
          !isOverlapOnly

        const baseGap = Number(size) * (overlap / 100)
        const neededGap = (Number(size) * (1 + focusScale)) / 2
        const shift = Math.max(0, neededGap - baseGap)

        return (
          <motion.div
            key={user.id}
            role="img"
            aria-label={user.name || "User avatar"}
            className="relative cursor-pointer rounded-full outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            style={{
              width: size,
              height: size,
              zIndex,
              marginLeft: index === 0 ? 0 : -Number(size) * diff,
            }}
            tabIndex={0}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            onFocus={() => setHoveredIndex(index)}
            onBlur={() => setHoveredIndex(null)}
            onKeyDown={(e) => handleKeyEnter(e, index)}
            animate={{
              scale: shouldScale ? focusScale : 1,
              x: shouldShift ? shift * (isRightToLeft ? -1 : 1) : 0,
            }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <div className="h-full w-full overflow-hidden rounded-full border border-white shadow-md">
              {isLengthBubble ? (
                <div className="flex h-full w-full items-center justify-center bg-background text-xs font-medium">
                  +{users.length - maxVisible}
                </div>
              ) : user.image ? (
                <img
                  src={user.image}
                  alt={user.name || "User"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-background text-xs font-semibold text-foreground">
                  {userInitials(user.name)}
                </div>
              )}
            </div>

            <AnimatePresence>
              {shouldScale && user.name && (
                <motion.div
                  role="tooltip"
                  initial={{
                    opacity: 0,
                    y: tooltipPlacement === "bottom" ? 8 : -8,
                  }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{
                    opacity: 0,
                    y: tooltipPlacement === "bottom" ? 8 : -8,
                  }}
                  transition={{ duration: 0.18 }}
                  className={cn(
                    "absolute left-1/2 z-50",
                    tooltipPlacement === "bottom"
                      ? "top-full mt-2"
                      : "bottom-full mb-2",
                  )}
                >
                  <div className="whitespace-nowrap text-[11px] text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.85)]">
                    <span className="inline-block -translate-x-1/2 transform font-semibold">
                      {user.name}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}
    </div>
  )
}
