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

const SWIPE_THRESHOLD_PX = 48;

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

function StepTextOverlay({
  step,
  stepNumber,
  align = "right",
}: {
  step: ExperienceStep;
  stepNumber: number;
  align?: "right" | "center";
}) {
  const alignClass =
    align === "center"
      ? "left-0 right-0 mx-auto w-full max-w-[90%] text-center"
      : "right-6 max-w-[60%] text-right";

  return (
    <div
      className={`absolute bottom-6 rounded-2xl bg-black/40 px-4 py-4 text-white backdrop-blur sm:px-5 ${alignClass}`}
    >
      <p className="text-[10px] uppercase tracking-[0.25em] text-white/70 sm:tracking-[0.3em]">
        Proceso Küche
      </p>
      <h3 className="mt-2 text-base font-semibold whitespace-normal break-words sm:text-xl">
        {step.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-white/85 whitespace-normal break-words md:text-base">
        {step.description}
      </p>
      {align === "center" && (
        <p className="mt-3 text-xs font-semibold tracking-wide text-white/60">
          {String(stepNumber).padStart(2, "0")} / {String(experienceSteps.length).padStart(2, "0")}
        </p>
      )}
    </div>
  );
}

function MobileExperienceSlide({
  step,
  index,
  onSwipeLeft,
  onSwipeRight,
}: {
  step: ExperienceStep;
  index: number;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}) {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? 0;
    touchStartY.current = event.touches[0]?.clientY ?? 0;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const endX = event.changedTouches[0]?.clientX ?? 0;
    const endY = event.changedTouches[0]?.clientY ?? 0;
    const deltaX = touchStartX.current - endX;
    const deltaY = Math.abs(touchStartY.current - endY);

    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX || deltaY > Math.abs(deltaX)) return;

    if (deltaX > 0) onSwipeLeft();
    else onSwipeRight();
  };

  return (
    <div
      className="relative aspect-[4/5] w-full max-h-[min(72vh,520px)] overflow-hidden rounded-2xl shadow-2xl touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <img
        src={step.image}
        alt={step.title}
        className={
          step.imageFit === "contain"
            ? "box-border h-full w-full bg-neutral-900 object-contain object-center"
            : "h-full w-full object-cover"
        }
        draggable={false}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
      <div className="pointer-events-none absolute left-4 top-4 rounded-xl bg-black/40 px-3 py-1.5 text-white backdrop-blur">
        <p className="text-lg font-semibold tracking-wide">
          {String(index + 1).padStart(2, "0")}
        </p>
      </div>
      <StepTextOverlay step={step} stepNumber={index + 1} align="center" />
    </div>
  );
}

function Coverflow3D({
  steps,
  activeIndex,
}: {
  steps: ExperienceStep[];
  activeIndex: number;
}) {
  return (
    <div className="relative hidden w-full md:block" style={{ perspective: "1600px" }}>
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
                {isActive && <StepTextOverlay step={step} stepNumber={index + 1} align="right" />}
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

  const goNext = useCallback(() => {
    primary.setActiveIndex((prev) => Math.min(experienceSteps.length - 1, prev + 1));
    primary.resetAutoplay();
  }, [primary]);

  const goPrev = useCallback(() => {
    primary.setActiveIndex((prev) => Math.max(0, prev - 1));
    primary.resetAutoplay();
  }, [primary]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "arrowleft" || key === "a" || key === "arrowup" || key === "w") {
        goPrev();
      }
      if (key === "arrowright" || key === "d" || key === "arrowdown" || key === "s") {
        goNext();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev]);

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
            <div className="w-full md:hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep.id}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <MobileExperienceSlide
                    step={activeStep}
                    index={primary.activeIndex}
                    onSwipeLeft={goNext}
                    onSwipeRight={goPrev}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            <Coverflow3D steps={experienceSteps} activeIndex={primary.activeIndex} />

            <button
              type="button"
              onClick={goPrev}
              disabled={primary.isFirst}
              className="absolute left-4 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/50 bg-white/40 p-3 text-secondary shadow-xl backdrop-blur-xl transition hover:bg-white/70 disabled:opacity-40 md:left-10 md:flex"
              aria-label="Paso anterior"
            >
              <ChevronLeft className="h-6 w-6 shrink-0" aria-hidden />
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={primary.isLast}
              className="absolute right-4 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/50 bg-white/40 p-3 text-secondary shadow-xl backdrop-blur-xl transition hover:bg-white/70 disabled:opacity-40 md:right-10 md:flex"
              aria-label="Paso siguiente"
            >
              <ChevronRight className="h-6 w-6 shrink-0" aria-hidden />
            </button>
          </div>

          <div className="mt-2 flex items-center justify-center gap-2 md:hidden">
            {experienceSteps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  primary.setActiveIndex(index);
                  primary.resetAutoplay();
                }}
                className={[
                  "rounded-full transition-all duration-300",
                  index === primary.activeIndex
                    ? "h-2 w-6 bg-primary"
                    : "h-2 w-2 bg-gray-300",
                ].join(" ")}
                aria-label={`Ir al paso ${index + 1}: ${step.title}`}
                aria-current={index === primary.activeIndex ? "step" : undefined}
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
