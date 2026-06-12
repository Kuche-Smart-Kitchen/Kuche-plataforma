"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) {
    return null;
  }

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`) || pathname.startsWith(href);
  };

  const navLinkClass = (href: string) =>
    [
      "relative text-sm font-medium transition",
      isActive(href)
        ? "text-primary font-semibold after:absolute after:-bottom-1 after:left-0 after:right-0 after:h-[1.5px] after:rounded-full after:bg-primary/70 after:content-['']"
        : "text-secondary hover:text-primary",
    ].join(" ");

  const pillLinkClass = (href: string) =>
    [
      "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
      isActive(href)
        ? "border-primary/40 bg-primary/5 text-primary"
        : "border-primary/20 text-primary hover:border-primary/40 hover:bg-white",
    ].join(" ");

  const ctaClass = (href: string) =>
    [
      "rounded-full px-4 py-2 text-sm font-semibold shadow transition",
      isActive(href)
        ? "bg-accent/90 text-white ring-2 ring-accent/30"
        : "bg-accent text-white hover:-translate-y-0.5",
    ].join(" ");

  return (
    <nav className="sticky top-4 z-50">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-14 items-center justify-between rounded-full border border-gray-200 bg-white/80 px-6 shadow-lg backdrop-blur">
          <Link href="/" className="text-sm font-semibold tracking-wide text-primary">
            Küche
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            <Link href="/experiencia" className={navLinkClass("/experiencia")}>
              Experiencia
            </Link>
            <Link href="/catalogo" className={navLinkClass("/catalogo")}>
              Catálogo
            </Link>
            <Link href="/acabados" className={navLinkClass("/acabados")}>
              Aliados
            </Link>
            <Link href="/agendar" className={ctaClass("/agendar")}>
              Agendar
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/seguimiento" className={pillLinkClass("/seguimiento")}>
              Mi proyecto
            </Link>
            <button
              type="button"
              className="inline-flex items-center justify-center md:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5 text-primary" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

