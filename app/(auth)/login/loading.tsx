"use client"

import { LoaderOne } from "@/components/ui/unique-loader-components"

export default function LoginLoading() {
  return (
    <div className="flex h-screen items-center justify-center">
      <LoaderOne />
    </div>
  )
}
