"use client"

import type React from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"

type AlertVariant = "success" | "error" | "warning" | "info"

interface CustomAlertProps {
  variant?: AlertVariant
  title?: string
  description?: string
  onClose?: () => void
}

const icons: Record<AlertVariant, React.ReactElement> = {
  success: <CheckCircle2 className="h-6 w-6" />,
  error: <X className="h-6 w-6" />,
  warning: <AlertTriangle className="h-6 w-6" />,
  info: <Info className="h-6 w-6" />,
}

export default function CustomAlert({
  variant = "success",
  title = "Default Alert Title",
  description = "This is a default description for the alert. You can customize this text by passing props.",
  onClose,
}: CustomAlertProps) {
  const [visible, setVisible] = useState(true)

  const handleClose = () => {
    setVisible(false)
    onClose?.()
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -10 }}
          transition={{ duration: 0.25 }}
          className={cn(
            "relative w-full max-w-md mx-auto p-4 rounded-2xl shadow-lg border backdrop-blur-md",
            "bg-white/10 dark:bg-black/20 border-white/20 dark:border-white/10",
            "dark:text-white"
          )}
        >
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 rounded-full p-1 hover:bg-white/20 transition"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 font-normal">{icons[variant]}</div>
            <div className="flex flex-col">
              <h4 className="text-base font-semibold">{title}</h4>
              {description && (
                <p className="mt-1 text-sm text-black opacity-80 dark:text-white">
                  {description}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

