"use client";

import Image from "next/image";
import { Star } from "lucide-react";
import MotionSection from "./MotionSection";

const testimonials = [
  {
    name: "Mariana López",
    role: "Proyecto Cocina Japandi",
    quote:
      "Todo el proceso se sintió guiado y transparente. La precisión del detalle y la calidez del equipo nos encantaron.",
    avatar: "https://i.pravatar.cc/100?img=32",
  },
  {
    name: "Carlos Vega",
    role: "Bar en Casa",
    quote:
      "Küche entendió exactamente lo que buscábamos. El resultado se ve tecnológico, pero acogedor.",
    avatar: "https://i.pravatar.cc/100?img=12",
  },
  {
    name: "Lucía Ramírez",
    role: "Remodelación Integral",
    quote:
      "La visualización en VR fue clave. Pudimos decidir con calma antes de fabricar.",
    avatar: "https://i.pravatar.cc/100?img=49",
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
            {testimonials.map((item) => (
              <div
                key={item.name}
                className="rounded-3xl bg-white p-6 shadow-lg shadow-black/10"
              >
                <div className="flex items-center gap-4">
                  <Image
                    src={item.avatar}
                    alt={item.name}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-semibold text-primary">
                      {item.name}
                    </p>
                    <p className="text-xs text-secondary">{item.role}</p>
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
                  �S{item.quote}⬝
                </p>
              </div>
            ))}
          </div>
        </div>
      </MotionSection>
    </section>
  );
}

