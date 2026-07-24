"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EXPERIENCE_STEP_MEDIA } from "@/lib/experience-steps-media";

type ExperienceStep = {
  id: string;
  title: string;
  description: string;
  image: string;
  /** "contain" muestra la imagen completa dentro del marco (útil para capturas/UI); "cover" llena el marco recortando. */
  imageFit?: "cover" | "contain";
};

const EXPERIENCE_STEP_CONTENT: readonly Omit<ExperienceStep, "image" | "imageFit">[] = [
  {
    id: "paso-01",
    title: "Agenda tu Cita",
    description: "Vamos a tu domicilio, medimos y entendemos tu espacio.",
  },
  {
    id: "paso-02",
    title: "Diseño y Cotización",
    description: "Personalización total en tiempo real. Presupuesto transparente.",
  },
  {
    id: "paso-03",
    title: "Realidad Virtual (VR)",
    description: "Camina dentro de tu cocina antes de fabricarla. Inmersión total.",
  },
  {
    id: "paso-04",
    title: "Cortes CNC",
    description: "Precisión robótica milimétrica. Cero errores humanos.",
  },
  {
    id: "paso-05",
    title: "Seguimiento en línea",
    description:
      "Accede a tu portal privado para ver pagos, renders y avances en tiempo real.",
  },
  {
    id: "paso-06",
    title: "Instalación y Entrega",
    description: "Montaje limpio y garantía de satisfacción.",
  },
];

const experienceSteps: ExperienceStep[] = EXPERIENCE_STEP_MEDIA.map((media, index) => ({
  ...EXPERIENCE_STEP_CONTENT[index]!,
  image: media.image,
  imageFit: media.imageFit,
}));

function useAutoplayCarousel(length: number, delay: number) {
  const [activeIndex, setActiveIndex] = useState(0);
  const autoplayRef = useRef<number | null>(null);
  const isFirst = activeIndex === 0;
  const isLast = activeIndex === length - 1;

  const resetAutoplay = useCallback(() => {
    if (autoplayRef.current) {
      window.clearInterval(autoplayRef.current);
    }
    autoplayRef.current = window.setInterval(() => {
      setActiveIndex((prev) => (prev === length - 1 ? 0 : prev + 1));
    }, delay);
  }, [delay, length]);

  useEffect(() => {
    resetAutoplay();
    return () => {
      if (autoplayRef.current) {
        window.clearInterval(autoplayRef.current);
      }
    };
  }, [resetAutoplay]);

  return { activeIndex, setActiveIndex, resetAutoplay, isFirst, isLast };
}

function Coverflow3D({
  steps,
  activeIndex,
}: {
  steps: ExperienceStep[];
  activeIndex: number;
}) {
  return (
    <div className="relative w-full" style={{ perspective: "1600px" }}>
      <div className="relative mx-auto h-[480px] w-full max-w-6xl">
        {steps.map((step, index) => {
          const distance = index - activeIndex;
          const isActive = distance === 0;
          const isLeft = distance === -1;
          const isRight = distance === 1;
          const isVisible = Math.abs(distance) <= 1;
          const x = isActive ? 0 : distance * 320;
          const scale = isActive ? 1 : 0.8;
          const opacity = isActive ? 1 : 0.5;
          const rotateY = isLeft ? 45 : isRight ? -45 : 0;
          const z = isActive ? 140 : -80;
          return (
            <motion.div
              key={step.id}
              animate={{
                opacity: isVisible ? opacity : 0,
                scale,
                x,
                z,
                rotateY,
                filter: isActive ? "blur(0px)" : "blur(2px)",
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute left-1/2 top-1/2"
              style={{
                transformStyle: "preserve-3d",
                translateX: "-50%",
                translateY: "-50%",
                zIndex: isActive ? 30 : 10,
                pointerEvents: isActive ? "auto" : "none",
              }}
            >
              <div
                className={`relative h-[420px] w-[560px] overflow-hidden rounded-3xl shadow-2xl ${
                  step.imageFit === "contain" ? "bg-neutral-900" : ""
                }`}
              >
                <img
                  src={step.image}
                  alt={step.title}
                  className={
                    step.imageFit === "contain"
                      ? "box-border h-full w-full object-contain object-center"
                      : "h-full w-full object-cover"
                  }
                  loading="eager"
                />
                <div
                  className={
                    step.imageFit === "contain"
                      ? "pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent"
                      : "absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
                  }
                />
                <div className="absolute bottom-6 left-6 rounded-2xl bg-black/40 px-4 py-2 text-white backdrop-blur">
                  <p className="text-3xl font-semibold tracking-wide">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                </div>
                {isActive && (
                  <div className="absolute bottom-6 right-6 max-w-[60%] rounded-2xl bg-black/40 px-5 py-4 text-right text-white backdrop-blur">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/70">
                      Proceso Küche
                    </p>
                    <h3 className="mt-2 text-xl font-semibold">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm text-white/85">
                      {step.description}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default function Experience3D() {
  const primary = useAutoplayCarousel(experienceSteps.length, 4500);
  const activeStep = useMemo(
    () => experienceSteps[primary.activeIndex],
    [primary.activeIndex],
  );
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (
        key === "arrowleft" ||
        key === "a" ||
        key === "arrowup" ||
        key === "w"
      ) {
        primary.setActiveIndex((prev) => Math.max(0, prev - 1));
        primary.resetAutoplay();
      }
      if (
        key === "arrowright" ||
        key === "d" ||
        key === "arrowdown" ||
        key === "s"
      ) {
        primary.setActiveIndex((prev) =>
          Math.min(experienceSteps.length - 1, prev + 1),
        );
        primary.resetAutoplay();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [primary]);

  return (
    <section
      id="experiencia"
      className="relative w-full overflow-x-hidden bg-[#F4F4F4] px-4 py-8 md:py-12"
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="relative flex flex-col items-center gap-4">
          <h2 className="text-3xl font-semibold text-accent md:text-4xl">
            Experiencia KüCHE
          </h2>
          <div className="relative w-full">
            <Coverflow3D
              steps={experienceSteps}
              activeIndex={primary.activeIndex}
            />

            <button
              type="button"
              onClick={() => {
                primary.setActiveIndex((prev) => Math.max(0, prev - 1));
                primary.resetAutoplay();
              }}
              disabled={primary.isFirst}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-white/50 bg-white/40 p-4 text-secondary shadow-xl backdrop-blur-xl transition hover:bg-white/70 disabled:opacity-40 md:left-10"
              aria-label="Paso anterior"
            >
              <ChevronLeft className="h-6 w-6 shrink-0" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() =>
                primary.setActiveIndex((prev) => {
                  primary.resetAutoplay();
                  return Math.min(experienceSteps.length - 1, prev + 1);
                })
              }
              disabled={primary.isLast}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-white/50 bg-white/40 p-4 text-secondary shadow-xl backdrop-blur-xl transition hover:bg-white/70 disabled:opacity-40 md:right-10"
              aria-label="Paso siguiente"
            >
              <ChevronRight className="h-6 w-6 shrink-0" aria-hidden />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {experienceSteps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  primary.setActiveIndex(index);
                  primary.resetAutoplay();
                }}
                className={`h-2.5 w-2.5 rounded-full transition ${
                  index === primary.activeIndex
                    ? "bg-secondary"
                    : "bg-secondary/30 hover:bg-secondary/60"
                }`}
                aria-label={`Ir al paso ${index + 1}`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="sr-only"
            >
              {activeStep.title}
            </motion.div>
          </AnimatePresence>

        </div>
      </div>
    </section>
  );
}

