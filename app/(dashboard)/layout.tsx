import SidebarComponent from "@/components/ui/sidebar-component"
import { PresenceHeartbeat } from "@/components/presence-heartbeat"

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="relative h-screen overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-transparent to-black/55" />
      <div className="relative z-20 flex h-full gap-0 p-4">
        <PresenceHeartbeat />
        <SidebarComponent />
        <main className="min-w-0 h-[calc(100vh-2rem)] flex-1 overflow-y-auto rounded-3xl border border-white/10 bg-black/35 backdrop-blur-sm">
          {children}
        </main>
      </div>
    </div>
  )
}
