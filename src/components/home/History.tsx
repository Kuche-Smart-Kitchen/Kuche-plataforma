"use client";

import Image from "next/image";
import MotionSection from "./MotionSection";

export default function History() {
  return (
    <MotionSection className="py-20">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-secondary">
            Nuestra esencia
          </p>
          <h2 className="mt-4 text-3xl font-semibold text-primary md:text-4xl">
            La unión perfecta entre técnica y sensibilidad.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-secondary">
            En Küche, creemos que la tecnología solo tiene sentido cuando mejora tu forma de vivir. Nacimos para llevar el diseño de interiores a una nueva era, sustituyendo la carpintería convencional por un proceso de fabricación digital que garantiza una perfección imposible de lograr a mano.
          </p>
          <p className="mt-4 text-base leading-relaxed text-secondary">
            Pero detrás de cada máquina hay una visión humana: crear espacios acogedores, ergonómicos y bellos. Nuestra meta es que tu cocina no sea solo un logro de la ingeniería, sino el escenario donde tu familia se siente realmente en casa.
          </p>
        </div>
        <div className="relative">
          <div className="absolute -right-6 -top-6 hidden h-20 w-20 rounded-3xl bg-accent/10 md:block" />
          <div className="relative h-full min-h-[320px] w-full overflow-hidden rounded-3xl shadow-lg shadow-black/10">
            <Image
              src="/images/home/historia-section/ilustracion-historia.jpg"
              alt="Espacio de cocina contemporánea"
              fill
              unoptimized
              className="object-cover"
              sizes="(min-width: 768px) 50vw, 90vw"
            />
          </div>
        </div>
      </div>
    </MotionSection>
  );
}

