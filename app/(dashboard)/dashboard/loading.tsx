"use client"

import { LoaderOne } from "@/components/ui/unique-loader-components"

export default function DashboardLoading() {
  return (
    <div className="flex h-full min-h-screen items-center justify-center">
      <LoaderOne />
    </div>
  )
}
