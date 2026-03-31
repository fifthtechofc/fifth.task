"use client";

import * as React from "react";
import SidebarComponent from "@/components/ui/sidebar-component";
import { PresenceHeartbeat } from "@/components/presence-heartbeat";
import { Toaster } from "sonner";
import { LoaderOne } from "@/components/ui/unique-loader-components";
import CustomAlert from "@/components/ui/custom-alert";

type AlertVariant = "success" | "error" | "warning" | "info";

interface DashboardUIContextValue {
  loading: boolean;
  setLoading: (value: boolean) => void;
  showAlert: (params: { variant?: AlertVariant; title: string; description?: string }) => void;
}

const DashboardUIContext = React.createContext<DashboardUIContextValue | undefined>(undefined);

export function useDashboardLoading() {
  const ctx = React.useContext(DashboardUIContext);
  if (!ctx) {
    return {
      loading: false,
      setLoading: () => undefined,
      showAlert: () => undefined,
    };
  }
  return ctx;
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = React.useState(false);
  const [alert, setAlert] = React.useState<{
    id: number;
    variant: AlertVariant;
    title: string;
    description?: string;
  } | null>(null);

  const showAlert: DashboardUIContextValue["showAlert"] = (params) => {
    setAlert({
      id: Date.now(),
      variant: params.variant ?? "success",
      title: params.title,
      description: params.description,
    });
  };

  React.useEffect(() => {
    if (!alert) return;
    const timeout = setTimeout(() => {
      setAlert(null);
    }, 5000);
    return () => clearTimeout(timeout);
  }, [alert]);

  return (
    <DashboardUIContext.Provider value={{ loading, setLoading, showAlert }}>
      <div className="relative h-screen overflow-hidden">
        {/* Alert global do dashboard, sempre acima do conteúdo e do loader */}
        {alert && (
          <div className="pointer-events-auto fixed inset-x-0 top-6 z-60 flex justify-center">
            <CustomAlert
              key={alert.id}
              variant={alert.variant}
              title={alert.title}
              description={alert.description}
              onClose={() => setAlert(null)}
            />
          </div>
        )}

        {/* Loader global do dashboard, fica por cima do conteúdo, mas abaixo do alerta */}
        {loading && (
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <LoaderOne />
          </div>
        )}

        <div className="relative z-20 flex h-full gap-0 p-4">
          <PresenceHeartbeat />
          <SidebarComponent />
          <main className="min-w-0 h-full flex-1 overflow-y-auto">{children}</main>
        </div>

        <Toaster richColors theme="dark" position="top-center" />
      </div>
    </DashboardUIContext.Provider>
  );
}

