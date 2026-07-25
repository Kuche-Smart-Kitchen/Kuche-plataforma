"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { KUCHE_EMAIL, KUCHE_EMAIL_MAILTO_HREF } from "@/lib/kuche-contact";

const LOGO_SRC = "/images/logo/kuche-logo-removebg-preview.png";

const PILL_NAV_CLASS =
  "top-4 w-[90%] max-w-7xl rounded-full border border-white/10 bg-white/80 py-3 shadow-lg backdrop-blur-md";

const NAV_LINKS = [
  { href: "/experiencia", label: "Experiencia" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/aliados", label: "Aliados" },
] as const;

const NAV_ITEMS = [
  ...NAV_LINKS,
  { href: "/agendar", label: "Agendar" },
  { href: "/seguimiento", label: "Mi proyecto" },
] as const;

const AGENDAR_CTA_CLASS =
  "inline-flex items-center justify-center rounded-full bg-[#6F1414] px-6 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-md transition-all duration-300 hover:scale-105 hover:bg-[#8a1919] hover:shadow-lg sm:text-sm";

const miProyectoCtaClass = (outlineLight: boolean) =>
  [
    "inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-xs font-medium uppercase tracking-wide transition-all duration-300 sm:text-sm",
    outlineLight
      ? "border-white/50 text-white hover:bg-white/10"
      : "border-primary/30 text-primary hover:bg-gray-100",
  ].join(" ");

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.scrollY > 24;
  });
  const [menuOpen, setMenuOpen] = useState(false);

  const isHomePage = pathname === "/";
  const transparentNav = isHomePage && !scrolled;

  const updateScroll = useCallback(() => {
    setScrolled(window.scrollY > 24);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", updateScroll, { passive: true });
    return () => window.removeEventListener("scroll", updateScroll);
  }, [updateScroll]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) {
    return null;
  }

  const navLinkClass = transparentNav
    ? "text-xs font-medium uppercase tracking-[0.18em] text-white transition-colors hover:text-white/80 sm:text-sm sm:tracking-[0.22em]"
    : "text-xs font-medium uppercase tracking-[0.18em] text-primary transition-colors hover:text-accent sm:text-sm sm:tracking-[0.22em]";

  const emailDesktopClass =
    isHomePage && !scrolled
      ? "block border-l border-white/20 pl-4 text-xs font-medium tracking-wide text-white/90 transition-all duration-300 hover:text-white sm:text-sm md:pl-5"
      : "hidden";

  const iconClass = transparentNav ? "text-white" : "text-primary";

  return (
    <>
      <nav
        className={`fixed left-0 right-0 z-50 mx-auto transition-all duration-500 ease-in-out ${
          isHomePage
            ? !scrolled
              ? "top-0 w-full bg-transparent py-6"
              : PILL_NAV_CLASS
            : PILL_NAV_CLASS
        }`}
      >
        <div
          className={`flex items-center justify-between gap-3 bg-transparent ${
            transparentNav ? "px-5 sm:px-8" : "px-6 md:px-8"
          }`}
        >
          <Link
            href="/"
            className="relative z-50 flex items-center bg-transparent"
            aria-label="Küche Diseño de Cocinas Inteligentes - Inicio"
            onClick={() => setMenuOpen(false)}
          >
            <Image
              src={LOGO_SRC}
              alt="Küche Logo"
              width={140}
              height={45}
              priority
              unoptimized
              className={`h-9 w-auto max-w-[min(50vw,200px)] object-contain object-left transition-all duration-300 md:max-w-[220px] ${
                isHomePage && !scrolled ? "brightness-0 invert" : "brightness-100"
              }`}
            />
          </Link>

          <div className="hidden min-w-0 flex-1 items-center justify-end gap-4 md:flex md:gap-5">
            {NAV_LINKS.map((item) => (
              <Link key={item.href} href={item.href} className={`shrink-0 ${navLinkClass}`}>
                {item.label}
              </Link>
            ))}
            <Link href="/agendar" className={`shrink-0 whitespace-nowrap ${AGENDAR_CTA_CLASS}`}>
              Agendar
            </Link>
            <Link
              href="/seguimiento"
              className={`shrink-0 whitespace-nowrap ${miProyectoCtaClass(transparentNav)}`}
            >
              Mi proyecto
            </Link>
            <a href={KUCHE_EMAIL_MAILTO_HREF} className={`shrink-0 ${emailDesktopClass}`}>
              {KUCHE_EMAIL}
            </a>
          </div>

          <button
            type="button"
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent transition-colors md:hidden ${
              transparentNav ? "hover:bg-white/10" : "hover:bg-primary/5"
            }`}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <X className={`h-5 w-5 ${iconClass}`} aria-hidden />
            ) : (
              <Menu className={`h-5 w-5 ${iconClass}`} aria-hidden />
            )}
          </button>
        </div>
      </nav>

      <div
        id="mobile-nav-menu"
        className={[
          "fixed inset-0 z-40 flex flex-col bg-primary/95 pt-28 text-white backdrop-blur-md transition-opacity duration-500 md:hidden",
          menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none hidden opacity-0",
        ].join(" ")}
        aria-hidden={!menuOpen}
      >
        <ul className="flex flex-col gap-1 px-8">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block py-3 text-sm font-medium uppercase tracking-[0.2em] text-white/85 transition hover:text-white"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            </li>
          ))}
          {isHomePage && !scrolled && (
            <li className="mt-4 border-t border-white/15 pt-6">
              <a
                href={KUCHE_EMAIL_MAILTO_HREF}
                className="text-sm tracking-wide text-white/70 transition hover:text-white"
                onClick={() => setMenuOpen(false)}
              >
                {KUCHE_EMAIL}
              </a>
            </li>
          )}
        </ul>
      </div>
    </>
  );
}
