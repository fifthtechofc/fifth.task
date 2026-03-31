import * as React from "react"
import { cn } from "@/lib/utils"

interface CardCanvasProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardCanvas: React.FC<CardCanvasProps> = ({ className, ...props }) => {
  return <div className={cn(className)} {...props} />
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

const Card: React.FC<CardProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card px-4 py-3 shadow-sm",
        className,
      )}
      {...props}
    />
  )
}

export { CardCanvas, Card }

