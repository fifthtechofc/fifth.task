"use client"

import { LoaderOne } from "@/components/ui/unique-loader-components"

export default function DashboardGroupLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <LoaderOne />
    </div>
  )
}
