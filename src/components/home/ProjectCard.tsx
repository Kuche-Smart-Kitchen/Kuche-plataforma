"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

type ProjectCardProps = {
  title: string;
  description: string;
  images: string[];
};

const AUTOPLAY_MS = 4000;

export default function ProjectCard({
  title,
  description,
  images,
}: ProjectCardProps) {
  const galleryRef = useRef<HTMLDivElement>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const isUserScrollingRef = useRef(false);
  const scrollEndTimerRef = useRef<number | null>(null);

  const scrollToImage = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const container = galleryRef.current;
      if (!container || container.clientWidth === 0) return;
      const clamped = Math.max(0, Math.min(index, images.length - 1));
      container.scrollTo({
        left: clamped * container.clientWidth,
        behavior,
      });
    },
    [images.length],
  );

  const handleGalleryScroll = useCallback(() => {
    const container = galleryRef.current;
    if (!container || container.clientWidth === 0) return;

    isUserScrollingRef.current = true;
    if (scrollEndTimerRef.current) {
      window.clearTimeout(scrollEndTimerRef.current);
    }

    const index = Math.round(container.scrollLeft / container.clientWidth);
    const clamped = Math.max(0, Math.min(index, images.length - 1));
    setCurrentImageIndex(clamped);

    scrollEndTimerRef.current = window.setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 150);
  }, [images.length]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (isUserScrollingRef.current) return;

      setCurrentImageIndex((prev) => {
        const next = (prev + 1) % images.length;
        scrollToImage(next);
        return next;
      });
    }, AUTOPLAY_MS);

    return () => window.clearInterval(intervalId);
  }, [images.length, scrollToImage]);

  useEffect(() => {
    return () => {
      if (scrollEndTimerRef.current) {
        window.clearTimeout(scrollEndTimerRef.current);
      }
    };
  }, []);

  const goToImage = (index: number) => {
    setCurrentImageIndex(index);
    scrollToImage(index);
  };

  return (
    <div className="group rounded-3xl bg-white shadow-lg shadow-black/10 transition duration-300 hover:-translate-y-2">
      <div className="relative h-56 overflow-hidden rounded-t-3xl">
        <div
          ref={galleryRef}
          onScroll={handleGalleryScroll}
          className="scrollbar-hide flex h-full snap-x snap-mandatory overflow-x-auto"
        >
          {images.map((src, imageIndex) => (
            <div
              key={src}
              className="relative h-56 min-w-full shrink-0 snap-center snap-always"
            >
              <Image
                src={src}
                alt={`${title} — imagen ${imageIndex + 1}`}
                fill
                unoptimized
                className="object-cover"
                sizes="(min-width: 768px) 320px, 85vw"
                draggable={false}
              />
            </div>
          ))}
        </div>

        <div
          className="pointer-events-none absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5"
          aria-hidden
        >
          {images.map((src, imageIndex) => (
            <span
              key={src}
              className={[
                "rounded-full transition-all duration-300",
                imageIndex === currentImageIndex
                  ? "h-1.5 w-5 bg-white"
                  : "h-1.5 w-1.5 bg-white/50",
              ].join(" ")}
            />
          ))}
        </div>

        <button
          type="button"
          aria-label="Imagen anterior"
          onClick={() => goToImage((currentImageIndex - 1 + images.length) % images.length)}
          className="absolute left-3 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-black/30 px-3 py-2 text-white transition group-hover:inline-flex"
        >
          ‹
        </button>
        <button
          type="button"
          aria-label="Siguiente imagen"
          onClick={() => goToImage((currentImageIndex + 1) % images.length)}
          className="absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-black/30 px-3 py-2 text-white transition group-hover:inline-flex"
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
