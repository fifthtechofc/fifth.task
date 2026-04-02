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

const POST_AUTH_LOADER_KEY = "ft:postAuthLoader";
const FORCE_DASHBOARD_LOADER_KEY = "ft:forceDashboardLoader";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [loading, _setLoading] = React.useState(() => {
    try {
      return (
        window.sessionStorage.getItem(POST_AUTH_LOADER_KEY) === "1" ||
        window.sessionStorage.getItem(FORCE_DASHBOARD_LOADER_KEY) === "1"
      );
    } catch {
      return false;
    }
  });
  const desiredLoadingRef = React.useRef<boolean>(loading);
  const hideTimeoutRef = React.useRef<number | null>(null);
  const [alert, setAlert] = React.useState<{
    id: number;
    variant: AlertVariant;
    title: string;
    description?: string;
  } | null>(null);

  const setLoading: DashboardUIContextValue["setLoading"] = React.useCallback((value) => {
    // If a hard lock is active (logout flow), never hide.
    try {
      if (!value && window.sessionStorage.getItem(FORCE_DASHBOARD_LOADER_KEY) === "1") {
        desiredLoadingRef.current = true;
        _setLoading(true);
        return;
      }
    } catch {
      // ignore
    }
    desiredLoadingRef.current = value;

    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (value) {
      _setLoading(true);
      return;
    }

    // Avoid flicker when multiple components toggle loading back-to-back.
    hideTimeoutRef.current = window.setTimeout(() => {
      hideTimeoutRef.current = null;
      if (!desiredLoadingRef.current) {
        _setLoading(false);
        try {
          window.sessionStorage.removeItem(POST_AUTH_LOADER_KEY);
        } catch {
          // ignore
        }
      }
    }, 180);
  }, []);

  React.useEffect(() => {
    // Failsafe: if the logout loader lock gets stuck, clear it.
    // This prevents "infinite loading" in dashboard pages if navigation is interrupted.
    let id: number | null = null;
    try {
      if (window.sessionStorage.getItem(FORCE_DASHBOARD_LOADER_KEY) === "1") {
        id = window.setTimeout(() => {
          try {
            window.sessionStorage.removeItem(FORCE_DASHBOARD_LOADER_KEY);
          } catch {
            // ignore
          }
          // if nobody is actively requesting loading, allow hiding
          if (!desiredLoadingRef.current) {
            _setLoading(false);
          }
        }, 6000);
      }
    } catch {
      // ignore
    }
    return () => {
      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current);
      }
      if (id) {
        window.clearTimeout(id);
      }
    };
  }, []);

  const showAlert: DashboardUIContextValue["showAlert"] = React.useCallback((params) => {
    setAlert({
      id: Date.now(),
      variant: params.variant ?? "success",
      title: params.title,
      description: params.description,
    });
  }, []);

  const ctxValue = React.useMemo(
    () => ({ loading, setLoading, showAlert }),
    [loading, setLoading, showAlert],
  );

  React.useEffect(() => {
    if (!alert) return;
    const timeout = setTimeout(() => {
      setAlert(null);
    }, 5000);
    return () => clearTimeout(timeout);
  }, [alert]);

  return (
    <DashboardUIContext.Provider value={ctxValue}>
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

