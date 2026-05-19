"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FaWhatsapp } from "react-icons/fa";
import { KUCHE_WHATSAPP_HREF } from "@/lib/kuche-contact";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const HERO_BG = "/images/home/hero-section/fondo-cabecera.jpg";

export default function Hero() {
  return (
    <section className="relative h-screen w-full overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${HERO_BG}')` }}
        aria-hidden
      />
      <div className="absolute inset-0 z-10 bg-black/40" />

      <div
        className="pointer-events-none absolute left-6 top-1/4 z-20 hidden h-32 w-px bg-white/30 sm:left-10 md:block lg:left-16"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-6 top-1/4 z-20 hidden h-px w-24 bg-white/30 sm:left-10 md:block lg:left-16"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-1/4 right-6 z-20 hidden h-32 w-px bg-white/30 sm:right-10 md:block lg:right-16"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-1/4 right-6 z-20 hidden h-px w-24 bg-white/30 sm:right-10 md:block lg:right-16"
        aria-hidden
      />

      <div className="relative z-20 flex h-full w-full items-center justify-center pb-24 pt-28 sm:pt-32 lg:pt-36">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-20 mx-auto flex h-full max-w-4xl flex-col items-center justify-center px-4 text-center md:px-0"
        >
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70 sm:text-xs sm:tracking-[0.35em]">
            Küche · Diseño de Cocinas Inteligentes
          </p>
          <h1 className="mt-5 text-center text-4xl font-semibold leading-[1.1] text-white md:text-6xl">
            Ingeniería de precisión para el alma de tu hogar.
          </h1>
          <p className="mt-5 max-w-xl text-center text-base leading-relaxed text-white/85 md:text-lg">
            La combinación ideal entre innovación técnica y el confort que tu día a día necesita.
          </p>
          <div className="mt-8 flex w-full flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/agendar"
              className="inline-flex w-full items-center justify-center rounded-full bg-accent px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-black/25 transition hover:scale-[1.02] sm:w-auto"
            >
              Cotizar Ahora
            </Link>
            <Link
              href="/catalogo"
              className="inline-flex w-full items-center justify-center rounded-full border border-white/35 px-8 py-3.5 text-sm font-semibold text-white transition hover:border-white/55 hover:bg-white/10 sm:w-auto"
            >
              Ver catálogo
            </Link>
          </div>
        </motion.div>
      </div>

      <a
        href={KUCHE_WHATSAPP_HREF}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp Küche"
        className="fixed bottom-6 right-6 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 transition hover:scale-105"
      >
        <FaWhatsapp className="h-6 w-6" />
      </a>
    </section>
  );
}
