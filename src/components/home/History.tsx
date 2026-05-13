"use client";

import Image from "next/image";
import MotionSection from "./MotionSection";

export default function History() {
  return (
    <MotionSection className="py-20">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-secondary">
            Nuestra historia
          </p>
          <h2 className="mt-4 text-3xl font-semibold text-primary md:text-4xl">
            Nacimos con una obsesión
          </h2>
          <p className="mt-4 text-base leading-relaxed text-secondary">
            En Küche no somos una carpintería tradicional. Somos un laboratorio
            de diseño que combina arquitectura, ingeniería y tecnología CNC para
            crear cocinas y espacios que dialogan con tu estilo de vida.
          </p>
          <p className="mt-4 text-base leading-relaxed text-secondary">
            Creemos en la precisión, la calidez de los materiales y en procesos
            colaborativos que hacen que cada proyecto se sienta único desde el
            primer boceto.
          </p>
        </div>
        <div className="relative">
          <div className="absolute -right-6 -top-6 hidden h-20 w-20 rounded-3xl bg-accent/10 md:block" />
          <div className="relative h-full min-h-[320px] w-full overflow-hidden rounded-3xl shadow-lg shadow-black/10">
            <Image
              src="/images/home/historia-section/ilustracion-historia.jpg"
              alt="Espacio de cocina contemporánea"
              fill
              className="object-cover"
              sizes="(min-width: 768px) 50vw, 90vw"
            />
          </div>
        </div>
      </div>
    </MotionSection>
  );
}

