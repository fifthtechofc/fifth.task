import { RequireAuth } from "@/components/auth/require-auth"
import { DashboardShell } from "@/components/ui/dashboard-shell"

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <RequireAuth>
      <DashboardShell>{children}</DashboardShell>
    </RequireAuth>
  )
}
