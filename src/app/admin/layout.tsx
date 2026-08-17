/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Boxes,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  CircleDollarSign,
  Hammer,
  LayoutDashboard,
  LogOut,
  Menu,
  Palette,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { getDashboardRouteForRole } from "@/lib/role-routes";

const navigation = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Precios y Catálogo", href: "/admin/precios", icon: CircleDollarSign },
  { label: "Equipamiento", href: "/admin/equipamiento", icon: Boxes },
  { label: "Aprobación Diseños", href: "/admin/disenos", icon: Palette },
  { label: "Operaciones y Taller", href: "/admin/operaciones", icon: Hammer },
  { label: "Agenda", href: "/admin/agenda", icon: Calendar },
  { label: "Clientes en proceso", href: "/admin/clientes-en-proceso", icon: Users },
  { label: "Clientes Confirmados", href: "/admin/clientes-confirmados", icon: CheckCircle2 },
  { label: "Proyectos Inactivos", href: "/admin/clientes-descartados", icon: XCircle },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuthContext();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.rol !== "admin") {
      router.replace(getDashboardRouteForRole(user.rol));
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (typeof document === "undefined" || !isMobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobileMenuOpen]);

  const sidebarExpanded = !isCollapsed || isMobileMenuOpen;

  if (loading || !user || user.rol !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <button
        type="button"
        aria-label="Abrir menú de navegación"
        aria-expanded={isMobileMenuOpen}
        onClick={() => setIsMobileMenuOpen(true)}
        className="fixed left-4 top-4 z-[60] flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-700 shadow-md transition hover:bg-gray-50 md:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      {isMobileMenuOpen ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white py-8 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } ${isCollapsed ? "md:w-20 md:px-3" : "md:w-64 md:px-6"} px-6`}
      >
        <div className="flex items-center justify-between gap-2">
          <div
            className={`text-lg font-semibold tracking-wide text-gray-900 ${
              sidebarExpanded ? "" : "md:hidden"
            }`}
          >
            Küche Admin
          </div>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 text-gray-500 transition hover:bg-gray-100 md:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 text-gray-500 transition hover:bg-gray-100 md:flex"
            aria-label={isCollapsed ? "Expandir menú" : "Colapsar menú"}
          >
            <ChevronLeft className={`h-4 w-4 transition ${isCollapsed ? "rotate-180" : ""}`} />
          </button>
        </div>
        <nav className="mt-8 flex flex-1 flex-col gap-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`group relative flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                  isActive ? "bg-[#8B1C1C]/10 text-[#8B1C1C]" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className={sidebarExpanded ? "" : "md:hidden"}>{item.label}</span>
                {!sidebarExpanded ? (
                  <span className="pointer-events-none absolute left-full top-1/2 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 opacity-0 shadow-lg transition group-hover:opacity-100 md:block">
                    {item.label}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => {
            setIsMobileMenuOpen(false);
            void logout();
          }}
          className="group relative mt-6 flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className={sidebarExpanded ? "" : "md:hidden"}>Cerrar sesión</span>
          {!sidebarExpanded ? (
            <span className="pointer-events-none absolute left-full top-1/2 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 opacity-0 shadow-lg transition group-hover:opacity-100 md:block">
              Cerrar sesión
            </span>
          ) : null}
        </button>
      </aside>

      <main
        className={`min-h-screen px-4 pb-8 pt-20 md:px-10 md:py-10 md:pt-10 ${
          isCollapsed ? "md:ml-20" : "md:ml-64"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
