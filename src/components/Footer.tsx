import Link from "next/link";
import { Facebook, Instagram } from "lucide-react";

import {
  KUCHE_EMAIL,
  KUCHE_EMAIL_MAILTO_HREF,
  KUCHE_PHONE_DISPLAY,
  KUCHE_PHONE_TEL_HREF,
} from "@/lib/kuche-contact";
import { SHOWROOM_ADDRESS_LINE } from "@/lib/site-location";

export default function Footer() {
  return (
    <footer className="bg-black text-white">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <div className="text-lg font-semibold tracking-[0.35em]">Küche</div>
            <p className="text-sm text-gray-400">
              Küche · Donde la calidez del hogar se encuentra con la precisión del futuro.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white">
              Navegación
            </h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/" className="transition hover:text-accent">
                  Inicio
                </Link>
              </li>
              <li>
                <Link href="/catalogo" className="transition hover:text-accent">
                  Catálogo
                </Link>
              </li>
              <li>
                <Link
                  href="/experiencia"
                  className="transition hover:text-accent"
                >
                  Experiencia
                </Link>
              </li>
              <li>
                <Link href="/aliados" className="transition hover:text-accent">
                  Aliados
                </Link>
              </li>
              <li>
                <Link
                  href="/seguimiento"
                  className="transition hover:text-accent"
                >
                  Seguimiento
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white">
              Showroom
            </h3>
            <div className="space-y-2 text-sm text-gray-400">
              <p>{SHOWROOM_ADDRESS_LINE}</p>
              <p>
                <a href={KUCHE_PHONE_TEL_HREF} className="transition hover:text-accent">
                  {KUCHE_PHONE_DISPLAY}
                </a>
              </p>
              <p>
                <a href={KUCHE_EMAIL_MAILTO_HREF} className="text-sky-300 transition hover:text-accent">
                  {KUCHE_EMAIL}
                </a>
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white">
              Síguenos
            </h3>
            <div className="flex items-center gap-3">
              <a
                href="https://www.instagram.com/cocinasinteligenteskuche/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-gray-400 transition hover:text-accent"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://www.facebook.com/cocinasendurango"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-gray-400 transition hover:text-accent"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
            </div>
            <Link
              href="/aviso-de-privacidad"
              className="text-sm text-gray-400 transition hover:text-accent"
            >
              Aviso de Privacidad
            </Link>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-6 text-sm text-gray-400">
          <span>
            © 2026 Küche Cocinas Inteligentes. Todos los derechos reservados.
          </span>
          <Link
            href="/login"
            className="rounded-full border border-white/20 px-3 py-1.5 text-[11px] font-semibold text-white/85 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
          >
            Acceso Administrativo
          </Link>
        </div>
      </div>
    </footer>
  );
}

