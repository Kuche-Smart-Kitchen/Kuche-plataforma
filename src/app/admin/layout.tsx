"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Loader2,
  ChevronLeft,
  Calendar,
  CircleDollarSign,
  Cpu,
  Hammer,
  LayoutDashboard,
  LogOut,
  Palette,
  CheckCircle2,
  XCircle,
  Users,
} from "lucide-react";
import { AdminWorkflowProvider } from "@/contexts/AdminWorkflowContext";
import { CatalogEquipamientoProvider } from "@/contexts/CatalogEquipamientoContext";
import { useAdminWorkflow } from "@/contexts/AdminWorkflowContext";
import { useCatalogEquipamiento } from "@/contexts/CatalogEquipamientoContext";

const navigation = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Agenda", href: "/admin/agenda", icon: Calendar },
  { label: "Aprobacion Disenos", href: "/admin/disenos", icon: Palette },
  { label: "Operaciones y Taller", href: "/admin/operaciones", icon: Hammer },
  { label: "Precios y Catalogo", href: "/admin/precios", icon: CircleDollarSign },
  { label: "Electrodomesticos", href: "/admin/equipamiento", icon: Cpu },
  { label: "Clientes en proceso", href: "/admin/clientes-en-proceso", icon: Users },
  { label: "Clientes confirmados", href: "/admin/clientes-confirmados", icon: CheckCircle2 },
  { label: "Proyectos inactivos", href: "/admin/proyectos-inactivos", icon: XCircle },
];

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { isLoading: isWorkflowLoading, isMutating: isWorkflowMutating } = useAdminWorkflow();
  const { loading: isCatalogLoading, isMutating: isCatalogMutating } = useCatalogEquipamiento();

  const isBusy = useMemo(
    () =>
      Boolean(pendingHref) ||
      isPending ||
      isWorkflowLoading ||
      isWorkflowMutating ||
      isCatalogLoading ||
      isCatalogMutating,
    [
      pendingHref,
      isPending,
      isWorkflowLoading,
      isWorkflowMutating,
      isCatalogLoading,
      isCatalogMutating,
    ],
  );

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const navigateTo = (href: string) => {
    if (href === pathname) return;
    setPendingHref(href);
    startTransition(() => {
      router.push(href);
    });
  };

  const handleLogout = () => {
    setPendingHref("/login");
    startTransition(() => {
      router.push("/login");
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {isBusy ? (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[60]">
          <div className="ml-auto mr-6 mt-3 w-fit rounded-full border border-primary/10 bg-white/95 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary shadow-sm">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
              Cargando
            </span>
          </div>
        </div>
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 flex flex-col border-r border-gray-200 bg-white py-8 transition-all ${
          isCollapsed ? "w-20 px-3" : "w-64 px-6"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className={`text-lg font-semibold tracking-wide text-gray-900 ${isCollapsed ? "hidden" : ""}`}>
            Küche Admin
          </div>
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 text-gray-500 transition hover:bg-gray-100"
            aria-label={isCollapsed ? "Expandir menú" : "Colapsar menú"}
          >
            <ChevronLeft className={`h-4 w-4 transition ${isCollapsed ? "rotate-180" : ""}`} />
          </button>
        </div>
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => navigateTo(item.href)}
                className={`group relative flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                  isActive ? "bg-[#8B1C1C]/10 text-[#8B1C1C]" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className={isCollapsed ? "hidden" : ""}>{item.label}</span>
                {isCollapsed ? (
                  <span className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 opacity-0 shadow-lg transition group-hover:opacity-100">
                    {item.label}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={handleLogout}
          className="group relative mt-6 flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
        >
          <LogOut className="h-4 w-4" />
          <span className={isCollapsed ? "hidden" : ""}>Cerrar sesión</span>
          {isCollapsed ? (
            <span className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 opacity-0 shadow-lg transition group-hover:opacity-100">
              Cerrar sesión
            </span>
          ) : null}
        </button>
      </aside>
      <main className={`min-h-screen px-10 py-10 ${isCollapsed ? "ml-20" : "ml-64"}`}>
        {children}
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminWorkflowProvider>
      <CatalogEquipamientoProvider>
        <AdminShell>{children}</AdminShell>
      </CatalogEquipamientoProvider>
    </AdminWorkflowProvider>
  );
}

