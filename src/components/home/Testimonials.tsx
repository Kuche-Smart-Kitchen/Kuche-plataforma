"use client";

import Image from "next/image";
import { Star } from "lucide-react";
import MotionSection from "./MotionSection";

interface Testimonial {
  name: string;
  role?: string;
  quote: string;
  avatarUrl?: string;
  avatar?: string;
}

const testimonials: Testimonial[] = [
  {
    name: "Mariana López",
    role: "Proyecto Cocina Japandi",
    quote:
      "Excelente atención de todo el equipo de Küche. Diseñaron nuestra cocina exactamente como la imaginamos y la calidad de los acabados superó nuestras expectativas.",
    avatarUrl: "https://i.pravatar.cc/100?img=32",
  },
  {
    name: "Carlos Vega",
    quote:
      "Küche entendió exactamente lo que buscábamos. El recorrido en realidad virtual antes de fabricar fue increíble para ajustar cada detalle. ¡100% recomendados!",
  },
  {
    name: "Lucía Ramírez",
    role: "Cliente Google",
    quote:
      "Puntualidad, profesionalismo y un diseño espectacular. La atención personalizada y el seguimiento de nuestro proyecto nos dio muchísima tranquilidad.",
    avatarUrl: "https://i.pravatar.cc/100?img=49",
  },
];

export default function Testimonials() {
  return (
    <section className="relative overflow-hidden py-20 mx-4 md:mx-6 rounded-3xl">
      <div className="absolute inset-0 bg-[url('/images/home/testimonios-section/fondo-seccion-opiniones.jpg')] bg-cover bg-center bg-fixed" />
      <div className="absolute inset-0 bg-black/35" />

      <MotionSection className="relative z-10">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl font-semibold text-white md:text-4xl font-serif">
            Qué piensan nuestros clientes
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {testimonials.map((item) => {
              const avatar = item.avatarUrl || item.avatar;
              const roleText = item.role || "Cliente Google";
              const initial = item.name ? item.name.charAt(0).toUpperCase() : "G";

              return (
                <div
                  key={item.name}
                  className="rounded-3xl bg-white p-6 shadow-lg shadow-black/10"
                >
                  <div className="flex items-center gap-4">
                    {avatar ? (
                      <Image
                        src={avatar}
                        alt={item.name}
                        width={48}
                        height={48}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-200 text-neutral-600 font-semibold text-lg select-none">
                        {initial}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-primary">
                        {item.name}
                      </p>
                      <p className="text-xs text-secondary">{roleText}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-1 text-accent">
                    {[...Array(5)].map((_, index) => (
                      <Star
                        key={`${item.name}-star-${index}`}
                        className="h-4 w-4 fill-current"
                      />
                    ))}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-secondary">
                    &ldquo;{item.quote}&rdquo;
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </MotionSection>
    </section>
  );
}

