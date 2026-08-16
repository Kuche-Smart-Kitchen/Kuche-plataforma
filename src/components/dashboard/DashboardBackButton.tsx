"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

const ADMIN_PRECIOS_CATALOGO = "/admin/precios";

type Props = {
  /** Destino al volver (por defecto: Precios y Catálogo en admin). */
  href?: string;
};

export function DashboardBackButton({
  href = ADMIN_PRECIOS_CATALOGO,
}: Props) {
  const router = useRouter();

  const goBack = () => {
    router.push(href);
  };

  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={goBack}
        className="inline-flex items-center gap-2 rounded-xl border border-primary/15 bg-white px-3 py-2 text-sm font-semibold text-primary shadow-sm transition hover:border-accent/35 hover:bg-accent/5 focus-visible:outline focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
        Volver atrás
      </button>
    </div>
  );
}
