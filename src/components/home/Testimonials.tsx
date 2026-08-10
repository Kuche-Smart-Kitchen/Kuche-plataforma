"use client";

import { Star } from "lucide-react";
import MotionSection from "./MotionSection";

interface Testimonial {
  name: string;
  initial?: string;
  role?: string;
  quote: string;
  rating?: number;
}

const testimonials: Testimonial[] = [
  {
    name: "Alejandro Bretado De Los Rios",
    initial: "A",
    role: "Opinión en Google",
    rating: 5,
    quote: "Excelente calidad y muy buen servicio.",
  },
  {
    name: "Jaime Méndez",
    initial: "J",
    role: "Opinión en Google",
    rating: 5,
    quote: "Cocinas elegantes a un buen precio. muy recomendados",
  },
  {
    name: "Araceli Rangel",
    initial: "A",
    role: "Opinión en Google",
    rating: 5,
    quote: "Excelente servicio y diseños innovadores 👍",
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
              const roleText = item.role || "Cliente en Google";
              const initial = item.initial || (item.name ? item.name.charAt(0).toUpperCase() : "G");
              const rating = item.rating || 5;

              return (
                <div
                  key={item.name}
                  className="rounded-3xl bg-white p-6 shadow-lg shadow-black/10"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-white font-semibold text-lg select-none">
                      {initial}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary">
                        {item.name}
                      </p>
                      <p className="text-xs text-secondary">{roleText}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-1 text-accent">
                    {[...Array(rating)].map((_, index) => (
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

