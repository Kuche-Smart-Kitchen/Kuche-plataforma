"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

import { useEscapeClose } from "@/hooks/useEscapeClose";
import { useFocusTrap } from "@/hooks/useFocusTrap";

type Hotspot = {
  id: string;
  label: string;
  detail?: string;
  top: string;
  left: string;
  imageSrc?: string;
  imageAlt?: string;
};

type ProjectImage = {
  src: string;
  alt: string;
  hotspots?: Hotspot[];
  objectFit?: "cover" | "contain";
};

type ProjectDetail = {
  label: string;
  value: string;
};

export type Project = {
  id: string;
  title: string;
  description: string;
  category: string;
  mainCategory: string;
  subCategory: string;
  details: ProjectDetail[];
  images: ProjectImage[];
};

type ProjectCardProps = {
  project: Project;
};

const pulseTransition = {
  duration: 1.8,
  ease: [0.16, 1, 0.3, 1] as const,
  repeat: Infinity,
};

export default function ProjectCard({ project }: ProjectCardProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEscapeClose(Boolean(selectedHotspot), () => setSelectedHotspot(null));
  useFocusTrap(Boolean(selectedHotspot), modalRef);
  const currentImage = project.images[selectedImageIndex];

  return (
    <article className="rounded-3xl bg-surface p-4 shadow-lg">
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr] lg:grid-rows-[auto_auto] lg:items-start">
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-stone-100 lg:col-start-1 lg:row-start-1">
          <Image
            src={currentImage.src}
            alt={currentImage.alt}
            fill
            className={
              currentImage.objectFit === "contain"
                ? "object-contain"
                : "object-cover"
            }
            sizes="(min-width: 1024px) 60vw, 100vw"
          />

          {(currentImage.hotspots ?? []).map((spot) => {
            const isActive = activeHotspot === spot.id;
            return (
              <div
                key={spot.id}
                className="absolute"
                style={{ top: spot.top, left: spot.left }}
              >
                <button
                  type="button"
                  aria-label={spot.label}
                  onMouseEnter={() => setActiveHotspot(spot.id)}
                  onMouseLeave={() => setActiveHotspot(null)}
                  onClick={() => setSelectedHotspot(spot)}
                  className="relative flex h-4 w-4 items-center justify-center"
                >
                  <motion.span
                    className="absolute h-4 w-4 rounded-full bg-white/70"
                    animate={{ scale: [1, 2.2], opacity: [0.7, 0] }}
                    transition={pulseTransition}
                  />
                  <span className="relative h-3 w-3 rounded-full bg-white shadow-md" />
                </button>

                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute left-1/2 top-full z-10 mt-3 -translate-x-1/2 whitespace-nowrap rounded-2xl bg-white/85 px-3 py-2 text-xs text-primary shadow-lg backdrop-blur-md"
                    >
                      {spot.label}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 lg:col-start-1 lg:row-start-2">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {project.images.map((image, index) => {
              const isSelected = index === selectedImageIndex;
              return (
                <button
                  key={`${project.id}-${image.src}`}
                  type="button"
                  onClick={() => setSelectedImageIndex(index)}
                  className={`relative h-14 w-20 overflow-hidden rounded-2xl border transition sm:h-16 sm:w-24 md:h-18 md:w-28 ${
                    isSelected
                      ? "border-accent"
                      : "border-transparent hover:border-accent/40"
                  }`}
                >
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    className={
                      image.objectFit === "contain"
                        ? "object-contain bg-stone-100"
                        : "object-cover"
                    }
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex h-full flex-col gap-3 lg:col-start-2 lg:row-start-1 lg:h-full">
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
                {project.category}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-primary">
                {project.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-secondary">
                {project.description}
              </p>
            </div>

            <div className="flex flex-col gap-3 text-[13px] leading-relaxed text-secondary">
              {project.details.map((detail) => (
                <p key={`${project.id}-${detail.label}`} className="m-0">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                    {detail.label}
                  </span>{" "}
                  <span>{detail.value}</span>
                </p>
              ))}
            </div>
          </div>

          <Link
            href="/agendar"
            className="mt-4 inline-flex w-fit self-center items-center justify-center rounded-full bg-accent px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-md shadow-accent/30 transition hover:-translate-y-0.5 lg:mt-auto"
          >
            Cotizar un diseño así
          </Link>
        </div>
      </div>

      {selectedHotspot ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedHotspot(null)}
        >
          <div
            ref={modalRef}
            tabIndex={-1}
            className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative h-44 w-full bg-stone-100 sm:h-56">
              <Image
                src={selectedHotspot.imageSrc ?? currentImage.src}
                alt={selectedHotspot.imageAlt ?? currentImage.alt}
                fill
                className={
                  selectedHotspot.imageSrc || currentImage.objectFit === "contain"
                    ? "object-contain"
                    : "object-cover"
                }
                sizes="(min-width: 768px) 480px, 100vw"
              />
            </div>
            <div className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
                Detalle
              </p>
              <h4 className="mt-3 text-xl font-semibold text-primary">
                {selectedHotspot.label}
              </h4>
              {selectedHotspot.detail ? (
                <p className="mt-3 text-sm leading-relaxed text-secondary">
                  {selectedHotspot.detail}
                </p>
              ) : null}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/agendar"
                  className="inline-flex items-center justify-center rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-md shadow-accent/30 transition hover:-translate-y-0.5"
                >
                  Agendar cita
                </Link>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full border border-primary/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary transition hover:border-primary/40"
                  onClick={() => setSelectedHotspot(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
