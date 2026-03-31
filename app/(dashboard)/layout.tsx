import { DashboardShell } from "@/components/ui/dashboard-shell"

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <DashboardShell>{children}</DashboardShell>
  )
}
