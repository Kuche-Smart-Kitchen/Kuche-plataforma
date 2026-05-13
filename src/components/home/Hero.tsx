"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FaWhatsapp } from "react-icons/fa";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export default function Hero() {
  return (
    <section className="relative min-h-[85vh] overflow-hidden rounded-3xl mx-4 md:mx-6">
      <div className="absolute inset-0 bg-[url('/images/home/hero-section/fondo-cabecera.jpg')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-black/45" />

      <div className="relative z-10 flex min-h-[85vh] items-center px-6 py-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="mx-auto w-full max-w-3xl text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
            Küche · Diseño de Cocinas Inteligentes
          </p>
          <h1 className="mt-5 text-4xl font-semibold text-white md:text-6xl">
            Diseño inteligente y humano
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/80 md:text-lg">
            Cocinas a medida con precisión CNC y detalles artesanales para
            espacios que se viven todos los días.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/agendar"
              className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 transition hover:scale-[1.01]"
            >
              Cotizar Ahora
            </Link>
            <Link
              href="/catalogo"
              className="inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white/90 transition hover:border-white/50 hover:bg-white/10"
            >
              Ver catálogo
            </Link>
          </div>
        </motion.div>
      </div>

      <a
        href="https://wa.me/5210000000000"
        aria-label="WhatsApp Küche"
        className="fixed bottom-6 right-6 z-20 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/10 transition hover:scale-105"
      >
        <FaWhatsapp className="h-6 w-6" />
      </a>
    </section>
  );
}

