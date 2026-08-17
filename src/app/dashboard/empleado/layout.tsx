"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { getDashboardRouteForRole } from "@/lib/role-routes";

export default function EmpleadoLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading, logout } = useAuthContext();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.rol === "admin") {
      router.replace("/admin");
      return;
    }

    if (user.rol !== "empleado") {
      router.replace(getDashboardRouteForRole(user.rol));
    }
  }, [loading, router, user]);

  if (loading || !user || user.rol !== "empleado") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-6rem)] flex-col">
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex w-full shrink-0 justify-start pt-12 pb-2">
        <button
          type="button"
          onClick={() => void logout()}
          aria-label="Cerrar sesión"
          className="inline-flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
}
