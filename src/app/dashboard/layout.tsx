"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { AdminWorkflowProvider } from "@/contexts/AdminWorkflowContext";
import { useAdminWorkflow } from "@/contexts/AdminWorkflowContext";
import { CatalogEquipamientoProvider } from "@/contexts/CatalogEquipamientoContext";
import { useCatalogEquipamiento } from "@/contexts/CatalogEquipamientoContext";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isLoading: isWorkflowLoading, isMutating: isWorkflowMutating } = useAdminWorkflow();
  const { loading: isCatalogLoading, isMutating: isCatalogMutating } = useCatalogEquipamiento();

  const isBusy = useMemo(
    () => isWorkflowLoading || isWorkflowMutating || isCatalogLoading || isCatalogMutating,
    [isWorkflowLoading, isWorkflowMutating, isCatalogLoading, isCatalogMutating],
  );

  return (
    <div className="min-h-screen bg-background text-primary">
      {isBusy ? (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[50]">
          <div className="ml-auto mr-4 mt-3 w-fit rounded-full border border-primary/10 bg-white/95 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary shadow-sm">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
              Cargando
            </span>
          </div>
        </div>
      ) : null}
      <div className="mx-auto max-w-6xl px-4 py-10">{children}</div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminWorkflowProvider>
      <CatalogEquipamientoProvider>
        <DashboardShell>{children}</DashboardShell>
      </CatalogEquipamientoProvider>
    </AdminWorkflowProvider>
  );
}
