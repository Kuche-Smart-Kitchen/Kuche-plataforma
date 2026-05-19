"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { KUCHE_EMAIL, KUCHE_EMAIL_MAILTO_HREF } from "@/lib/kuche-contact";

const LOGO_SRC = "/images/logo/kuche-logo.png";

const NAV_ITEMS = [
  { href: "/experiencia", label: "Experiencia" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/aliados", label: "Aliados" },
  { href: "/agendar", label: "Agendar" },
  { href: "/seguimiento", label: "Mi proyecto" },
] as const;

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isHome = pathname === "/";
  const immersiveTop = isHome && !scrolled;

  const updateScroll = useCallback(() => {
    setScrolled(window.scrollY > 24);
  }, []);

  useEffect(() => {
    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    return () => window.removeEventListener("scroll", updateScroll);
  }, [updateScroll]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) {
    return null;
  }

  const navClassName = [
    "fixed top-0 z-50 w-full text-white transition-all duration-300 ease-in-out",
    immersiveTop ? "bg-transparent" : "bg-primary shadow-md",
  ].join(" ");

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const linkClass = (href: string) =>
    [
      "text-xs font-medium uppercase tracking-[0.18em] transition sm:text-sm sm:tracking-[0.22em]",
      isActive(href) ? "text-white" : "text-white/70 hover:text-white",
    ].join(" ");

  return (
    <>
      <nav className={navClassName}>
        <div className="mx-auto flex h-20 w-full max-w-[1440px] items-center justify-between gap-4 px-5 sm:h-24 sm:px-8 lg:px-12">
          <Link
            href="/"
            className="z-50 flex items-center"
            aria-label="Küche Diseño de Cocinas Inteligentes - Inicio"
            onClick={() => setMenuOpen(false)}
          >
            <Image
              src={LOGO_SRC}
              alt="Küche Logo"
              width={160}
              height={60}
              priority
              className="h-10 w-auto object-contain drop-shadow-md md:h-14"
            />
          </Link>

          <div className="hidden items-center gap-6 lg:gap-10 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                {item.label}
              </Link>
            ))}
            <a
              href={KUCHE_EMAIL_MAILTO_HREF}
              className="shrink-0 border-l border-white/20 pl-6 text-xs font-medium tracking-wide text-white/80 transition hover:text-white sm:text-sm"
            >
              {KUCHE_EMAIL}
            </a>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 text-white transition hover:bg-white/10 md:hidden"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      <div
        id="mobile-nav-menu"
        className={[
          "fixed inset-0 z-40 flex flex-col bg-primary/98 pt-24 text-white backdrop-blur-sm transition-opacity duration-300 md:hidden",
          menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        aria-hidden={!menuOpen}
      >
        <ul className="flex flex-col gap-1 px-8">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block py-3 text-sm font-medium uppercase tracking-[0.2em] text-white/80 transition hover:text-white"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            </li>
          ))}
          <li className="mt-4 border-t border-white/15 pt-6">
            <a
              href={KUCHE_EMAIL_MAILTO_HREF}
              className="text-sm tracking-wide text-white/70 transition hover:text-white"
              onClick={() => setMenuOpen(false)}
            >
              {KUCHE_EMAIL}
            </a>
          </li>
        </ul>
      </div>
    </>
  );
}
