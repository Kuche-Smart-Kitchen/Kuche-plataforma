"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { EXPERIENCE_STEP_MEDIA } from "@/lib/experience-steps-media";

type ExperienciaStep = {
  number: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  imageFit: "cover" | "contain";
  alt: string;
};

const STEP_COPY: Omit<ExperienciaStep, "image" | "imageFit">[] = [
  {
    number: "01",
    title: "El primer contacto",
    subtitle: "Agendar Cita",
    description:
      "No es solo una visita, es el inicio de tu proyecto. Un experto Küche va a tu domicilio para analizar la luz, el espacio y tus necesidades. Sin compromisos, solo entendimiento puro de lo que buscas.",
    alt: "Libreta, café y muestras de color para agendar una cita.",
  },
  {
    number: "02",
    title: "Co-creación",
    subtitle: "Diseño y Cotización",
    description:
      "Olvídate de esperar semanas por un precio. Diseñamos contigo en tiempo real. Tú eliges materiales y acabados, y el presupuesto se ajusta al momento. Transparencia total desde el minuto uno.",
    alt: "Render de planos en una pantalla.",
  },
  {
    number: "03",
    title: "El futuro",
    subtitle: "Realidad Virtual",
    description:
      "Prohibido imaginar. En Küche, te pones nuestros lentes VR y caminas dentro de tu cocina antes de que cortemos la primera tabla. Abre cajones, siente las alturas y valida tu inversión con seguridad absoluta.",
    alt: "Persona usando lentes de realidad virtual.",
  },
  {
    number: "04",
    title: "Perfección robótica",
    subtitle: "Cortes CNC",
    description:
      "Aquí la artesanía se encuentra con la ingeniería. Nuestra maquinaria de Control Numérico Computarizado (CNC) corta cada pieza con precisión milimétrica. Cero errores humanos, ensambles perfectos.",
    alt: "Detalle de cortes CNC sobre madera.",
  },
  {
    number: "05",
    title: "Seguimiento en línea",
    subtitle: "Portal privado",
    description:
      "Accede a tu portal privado para ver pagos, renders y avances en tiempo real. Transparencia total durante todo el proceso.",
    alt: "Vista de un portal digital de seguimiento.",
  },
  {
    number: "06",
    title: "Tu hogar transformado",
    subtitle: "Instalación y Entrega",
    description:
      "El momento mágico. Nuestro equipo de instalación certificado monta tu proyecto con limpieza y rapidez. Te entregamos no solo muebles, sino el corazón de tu nuevo hogar listo para usarse.",
    alt: "Cocina terminada con luz natural.",
  },
];

const steps: ExperienciaStep[] = STEP_COPY.map((copy, index) => {
  const media = EXPERIENCE_STEP_MEDIA[index]!;
  return {
    ...copy,
    image: media.image,
    imageFit: media.imageFit ?? "cover",
  };
});

const fadeInUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const zoomOut = {
  hidden: { opacity: 0.2, scale: 1.2 },
  visible: { opacity: 1, scale: 1 },
};

export default function ExperienciaPage() {
  const [activeStep, setActiveStep] = useState(0);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (!visibleEntries.length) return;
        const index = Number(
          visibleEntries[0].target.getAttribute("data-step-index"),
        );
        if (!Number.isNaN(index)) {
          setActiveStep(index);
        }
      },
      {
        root: null,
        threshold: [0.35, 0.55, 0.75],
      },
    );

    sectionRefs.current.forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      observer.disconnect();
    };
  }, []);

  const navSteps = useMemo(
    () =>
      steps.map((step, index) => ({
        ...step,
        anchor: `paso-${index + 1}`,
      })),
    [],
  );

  return (
    <main className="relative h-screen w-full snap-y snap-mandatory overflow-y-scroll bg-background text-primary">
      <div className="pointer-events-none fixed right-8 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-4 md:flex">
        <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-secondary">
          Método
        </span>
        <div className="flex flex-col items-center gap-3">
          {navSteps.map((step, index) => {
            const isActive = index === activeStep;
            return (
              <a
                key={step.number}
                href={`#${step.anchor}`}
                className={`pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border text-[11px] font-semibold transition ${
                  isActive
                    ? "border-accent bg-accent text-white shadow-lg shadow-accent/40"
                    : "border-gray-200 bg-white text-secondary"
                }`}
              >
                {step.number}
              </a>
            );
          })}
        </div>
      </div>

      {steps.map((step, index) => {
        const isEven = index % 2 === 1;
        return (
          <section
            key={step.number}
            id={`paso-${index + 1}`}
            data-step-index={index}
            ref={(element) => {
              sectionRefs.current[index] = element;
            }}
            className="relative h-screen w-full snap-center px-6 py-14 md:px-12"
          >
            <div className="mx-auto flex h-full max-w-6xl flex-col items-center gap-12 md:flex-row md:gap-16">
              <div
                className={`relative w-full md:w-1/2 ${
                  isEven ? "md:order-2" : ""
                }`}
              >
                <div className="pointer-events-none absolute -top-12 left-0 text-[5rem] font-semibold text-transparent md:-left-6 md:text-[7rem] lg:text-[8rem]">
                  <span
                    className="block"
                    style={{ WebkitTextStroke: "1px rgba(148,163,184,0.45)" }}
                  >
                    {step.number}
                  </span>
                </div>
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ amount: 0.5 }}
                  variants={fadeInUp}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="relative space-y-6"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                      {step.subtitle}
                    </p>
                    <h1 className="mt-3 text-3xl font-semibold leading-tight text-primary md:text-5xl lg:text-6xl">
                      {step.title}
                    </h1>
                  </div>
                  <p className="text-base leading-relaxed text-secondary md:text-lg">
                    {step.description}
                  </p>
                </motion.div>
              </div>
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ amount: 0.5 }}
                variants={zoomOut}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className={`relative w-full md:w-1/2 ${
                  isEven ? "md:order-1" : ""
                }`}
              >
                <div
                  className={`relative aspect-[4/5] overflow-hidden rounded-[32px] shadow-2xl shadow-black/10 ${
                    step.imageFit === "contain" ? "bg-neutral-900" : ""
                  }`}
                >
                  <Image
                    src={step.image}
                    alt={step.alt}
                    fill
                    className={
                      step.imageFit === "contain"
                        ? "object-contain object-center"
                        : "object-cover"
                    }
                    sizes="(min-width: 1024px) 42vw, (min-width: 768px) 50vw, 90vw"
                    priority={index === 0}
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/10" />
                </div>
              </motion.div>
            </div>
          </section>
        );
      })}

      <section className="relative flex min-h-[70vh] w-full snap-center items-center justify-center bg-primary px-6 py-20 text-white">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-10 text-center">
          <h2 className="text-4xl font-semibold leading-tight md:text-6xl">
            Estás a un paso de tenerla.
          </h2>
          <Link
            href="/agendar"
            className="rounded-full bg-white px-10 py-4 text-sm font-semibold uppercase tracking-[0.25em] text-primary transition hover:-translate-y-1 hover:shadow-xl"
          >
            Agendar mi Cita
          </Link>
        </div>
      </section>
    </main>
  );
}

