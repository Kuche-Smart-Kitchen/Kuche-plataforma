"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

type ProjectCardProps = {
  title: string;
  description: string;
  images: string[];
};

export default function ProjectCard({
  title,
  description,
  images,
}: ProjectCardProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"prev" | "next">("next");
  const autoplayDelay = 3800;
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const goNext = () => {
    setDirection("next");
    setIndex((prev) => (prev + 1) % images.length);
  };

  const goPrev = () => {
    setDirection("prev");
    setIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const slideVariants = {
    enter: (dir: "prev" | "next") => ({
      x: dir === "next" ? 40 : -40,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (dir: "prev" | "next") => ({
      x: dir === "next" ? -40 : 40,
      opacity: 0,
    }),
  };

  const syncIndex = useCallback(() => {
    const nextIndex = Math.floor(Date.now() / autoplayDelay) % images.length;
    setDirection("next");
    setIndex(nextIndex);
  }, [autoplayDelay, images.length]);

  const startAutoplay = useCallback(() => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    syncIndex();
    const msToNextTick =
      autoplayDelay - (Date.now() % autoplayDelay || autoplayDelay);
    timeoutRef.current = window.setTimeout(() => {
      syncIndex();
      intervalRef.current = window.setInterval(syncIndex, autoplayDelay);
    }, msToNextTick);
  }, [autoplayDelay, syncIndex]);

  const stopAutoplay = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    startAutoplay();
    return () => stopAutoplay();
  }, [startAutoplay, stopAutoplay]);

  return (
    <div
      className="group rounded-3xl bg-white shadow-lg shadow-black/10 transition duration-300 hover:-translate-y-2"
      onMouseEnter={stopAutoplay}
      onMouseLeave={startAutoplay}
    >
      <div className="relative h-56 overflow-hidden rounded-3xl">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={images[index]}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <Image
              src={images[index]}
              alt={title}
              fill
              unoptimized
              className="object-cover"
              sizes="(min-width: 768px) 320px, 90vw"
            />
          </motion.div>
        </AnimatePresence>

        <button
          type="button"
          aria-label="Imagen anterior"
          onClick={goPrev}
          className="absolute left-3 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-black/30 px-3 py-2 text-white transition group-hover:inline-flex"
        >
          ‹
        </button>
        <button
          type="button"
          aria-label="Siguiente imagen"
          onClick={goNext}
          className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-black/30 px-3 py-2 text-white transition group-hover:inline-flex"
        >
          ›
        </button>
      </div>

      <div className="p-6">
        <h3 className="text-lg font-semibold text-primary">{title}</h3>
        <p className="mt-2 text-sm text-secondary">{description}</p>
        <a
          href="/catalogo"
          className="mt-4 inline-flex items-center justify-center rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-black/10"
        >
          Ver Catálogo Completo
        </a>
      </div>
    </div>
  );
}
