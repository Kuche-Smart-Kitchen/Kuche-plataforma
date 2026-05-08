"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function EmpleadoLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div className="flex min-h-[calc(100dvh-6rem)] flex-col">
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex w-full shrink-0 justify-start pt-12 pb-2">
        <button
          type="button"
          onClick={() => router.push("/login")}
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
