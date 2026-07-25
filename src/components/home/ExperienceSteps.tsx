"use client";

import Image from "next/image";
import { Calendar, CheckCircle2, ChevronLeft, ChevronRight, Cpu, PencilRuler } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import MotionSection from "./MotionSection";

type Step = {
  number: string;
  title: string;
  description: string;
  image: {
    src: string;
    alt: string;
  };
  icon: typeof Calendar;
  highlight?: "tech" | "custom";
};

const steps: Step[] = [
  {
    number: "01",
    title: "Agenda cita",
    description: "Agendamos una visita para conocer tu espacio y estilo.",
    image: {
      src: "/images/home/experiencia-3d/slide-01-cita-domicilio.jpg",
      alt: "Agenda de cita para diseno de cocina",
    },
    icon: Calendar,
  },
  {
    number: "02",
    title: "Diseno y cotizacion",
    description: "Propuesta de distribucion, materiales y presupuesto claro.",
    image: {
      src: "/images/home/linea-tiempo-7-pasos/02-diseno-cotizacion.jpg",
      alt: "Diseno y cotizacion de cocina",
    },
    icon: PencilRuler,
  },
  {
    number: "03",
    title: "A tu manera",
    description: "Personalizamos acabados y detalles segun tu gusto.",
    image: {
      src: "/images/home/linea-tiempo-7-pasos/03-personalizacion-cocina.jpg",
      alt: "Diseno personalizado de cocina",
    },
    icon: PencilRuler,
    highlight: "custom",
  },
  {
    number: "04",
    title: "Realidad virtual",
    description: "Visualiza tu cocina en VR antes de fabricar.",
    image: {
      src: "/images/home/experiencia-3d/slide-03-realidad-virtual.jpg",
      alt: "Recorrido virtual de cocina",
    },
    icon: Cpu,
    highlight: "tech",
  },
  {
    number: "05",
    title: "Cortes precisos con tecnologia",
    description: "Precision CNC para cada pieza y ensamble perfecto.",
    image: {
      src: "/images/home/experiencia-3d/slide-04-cortes-cnc.jpg",
      alt: "Cortes precisos con maquina CNC",
    },
    icon: Cpu,
    highlight: "tech",
  },
  {
    number: "06",
    title: "Instalacion",
    description: "Montaje limpio, rapido y cuidado en tu hogar.",
    image: {
      src: "/images/home/linea-tiempo-7-pasos/06-instalacion.jpg",
      alt: "Instalacion de cocina",
    },
    icon: CheckCircle2,
  },
  {
    number: "07",
    title: "Entrega",
    description: "Cierre con revision final y acompanamiento post-venta.",
    image: {
      src: "/images/home/linea-tiempo-7-pasos/07-entrega-final.jpg",
      alt: "Entrega final de cocina",
    },
    icon: CheckCircle2,
  },
];

type ExperienceCardProps = {
  step: Step;
  rootRef: React.RefObject<HTMLDivElement | null>;
};

function ExperienceCard({ step, rootRef }: ExperienceCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const card = cardRef.current;
    const root = rootRef.current;
    if (!card || !root) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsVisible(true);
        observer.unobserve(entry.target);
      },
      { root, rootMargin: "60px", threshold: 0.2 },
    );

    observer.observe(card);
    return () => observer.disconnect();
  }, [rootRef]);

  const Icon = step.icon;

  return (
    <div
      ref={cardRef}
      className={`relative min-w-[240px] snap-start rounded-3xl bg-white p-6 shadow-lg shadow-black/10 md:min-w-[260px] lg:min-w-[280px] ${
        step.highlight ? "border border-accent/40" : "border border-transparent"
      }`}
    >
      {isVisible ? (
        <>
          <div className="relative mb-4 aspect-[4/3] w-full overflow-hidden rounded-2xl">
            <Image
              src={step.image.src}
              alt={step.image.alt}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 240px, 70vw"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-secondary">{step.number}</span>
            <Icon
              className={`h-5 w-5 ${
                step.highlight ? "text-accent" : "text-secondary"
              }`}
            />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-primary">{step.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-secondary">{step.description}</p>
          {step.highlight === "tech" ? (
            <span className="mt-4 inline-flex rounded-full border border-accent/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              Tecnologia Kuche
            </span>
          ) : null}
          {step.highlight === "custom" ? (
            <span className="mt-4 inline-flex rounded-full border border-accent/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              Personalizado
            </span>
          ) : null}
        </>
      ) : (
        <div className="space-y-4">
          <div className="h-32 w-full rounded-2xl bg-gray-100" />
          <div className="flex items-center justify-between">
            <span className="h-4 w-8 rounded-full bg-gray-100" />
            <span className="h-5 w-5 rounded-full bg-gray-100" />
          </div>
          <div className="h-5 w-2/3 rounded-full bg-gray-100" />
          <div className="h-4 w-full rounded-full bg-gray-100" />
          <div className="h-4 w-4/5 rounded-full bg-gray-100" />
        </div>
      )}
    </div>
  );
}

export default function ExperienceSteps() {
  const carouselRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: "prev" | "next") => {
    const container = carouselRef.current;
    if (!container) return;

    const offset = container.clientWidth * 0.8;
    container.scrollBy({
      left: direction === "next" ? offset : -offset,
      behavior: "smooth",
    });
  };

  return (
    <MotionSection className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-3xl font-semibold text-primary md:text-4xl">Ruta de tu proyecto</h2>
          <div className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              onClick={() => handleScroll("prev")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-secondary/20 bg-white text-secondary shadow-sm transition hover:border-accent/40 hover:text-accent"
              aria-label="Anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll("next")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-secondary/20 bg-white text-secondary shadow-sm transition hover:border-accent/40 hover:text-accent"
              aria-label="Siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="relative mt-10">
          <div
            ref={carouselRef}
            className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 pt-2"
          >
            {steps.map((step) => (
              <ExperienceCard key={step.number} step={step} rootRef={carouselRef} />
            ))}
          </div>
        </div>
      </div>
    </MotionSection>
  );
}
