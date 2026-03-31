"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface HorizontalScrollProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function HorizontalScroll({ className, children, ...props }: HorizontalScrollProps) {
  return (
    <div
      className={cn(
        "relative h-full w-full overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-black/40 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-500/80",
        className,
      )}
      {...props}
    >
      <div className="flex h-full min-h-full w-full">{children}</div>
    </div>
  )
}

