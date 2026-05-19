"use client";

import Image from "next/image";
import MotionSection from "./MotionSection";

export default function History() {
  return (
    <MotionSection className="overflow-x-hidden py-12 sm:py-16 md:py-20">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 sm:gap-10 sm:px-6 md:grid-cols-2 md:items-center md:gap-12">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary sm:text-sm">
            Nuestra esencia
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-primary sm:mt-4 sm:text-3xl md:text-4xl">
            La unión perfecta entre técnica y sensibilidad.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-secondary sm:mt-4 sm:text-base">
            En Küche, creemos que la tecnología solo tiene sentido cuando mejora tu forma de vivir. Nacimos para llevar el diseño de interiores a una nueva era, sustituyendo la carpintería convencional por un proceso de fabricación digital que garantiza una perfección imposible de lograr a mano.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-secondary sm:mt-4 sm:text-base">
            Pero detrás de cada máquina hay una visión humana: crear espacios acogedores, ergonómicos y bellos. Nuestra meta es que tu cocina no sea solo un logro de la ingeniería, sino el escenario donde tu familia se siente realmente en casa.
          </p>
        </div>
        <div className="relative min-w-0">
          <div className="absolute -right-3 -top-3 hidden h-16 w-16 rounded-3xl bg-accent/10 md:-right-6 md:-top-6 md:block md:h-20 md:w-20" />
          <div className="relative aspect-[4/3] w-full max-w-full overflow-hidden rounded-2xl shadow-lg shadow-black/10 sm:rounded-3xl md:aspect-auto md:min-h-[320px]">
            <Image
              src="/images/home/historia-section/ilustracion-historia.jpg"
              alt="Espacio de cocina contemporánea"
              fill
              unoptimized
              className="object-cover"
              sizes="(min-width: 768px) 50vw, 100vw"
            />
          </div>
        </div>
      </div>
    </MotionSection>
  );
}
