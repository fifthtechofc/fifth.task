import SidebarComponent from "@/components/ui/sidebar-component"
import { PresenceHeartbeat } from "@/components/presence-heartbeat"
import { Toaster } from "sonner"

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="relative h-screen overflow-hidden">
      <div className="relative z-20 flex h-full gap-0 p-4">
        <PresenceHeartbeat />
        <SidebarComponent />
        <main className="min-w-0 h-full flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <Toaster richColors theme="dark" position="top-center" />
    </div>
  )
}
