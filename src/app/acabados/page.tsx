"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Footer from "@/components/layout/Footer";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { useFocusTrap } from "@/hooks/useFocusTrap";

const partnerLogos = [
  {
    name: "Arauco",
    src: "/images/aliados/Arauco.png",
    description:
      "Fabricante líder de tableros y paneles de madera de alto estándar. Su enfoque en la sostenibilidad y la innovación proporciona los cimientos perfectos para la arquitectura interior y el mobiliario de alta gama.",
  },
  {
    name: "Blum",
    src: "/images/aliados/blum.jpg",
    description:
      "Ingeniería austriaca de excelencia en herrajes. Sus sistemas de bisagras, compases abatibles y guías para cajones garantizan un movimiento perfecto, elevando el confort y la ergonomía de cada cocina.",
  },
  {
    name: "Arcadia",
    src: "/images/aliados/Arcadia.png",
    description:
      "Especialistas con más de 30 años en el mercado ofreciendo tableros melamínicos, enchapados naturales y recubrimientos arquitectónicos de alta tecnología, aportando textura y vanguardia a cada diseño.",
  },
  {
    name: "Navetta",
    src: "/images/aliados/navetta.png",
    description:
      "Marca destacada en tableros de MDF melamínicos con diseños contemporáneos. Sus texturas realistas y su resistencia estructural aseguran un desempeño impecable en el uso diario de la cocina.",
  },
  {
    name: "Madelam",
    src: "/images/aliados/Mademel.png",
    description:
      "Creadores de tableros recubiertos de vanguardia. Sus acabados premium, como el alto brillo UV y el súper mate (Soft Touch), ofrecen superficies sofisticadas, anti-rayaduras y de estética impecable.",
  },
  {
    name: "Rehau",
    src: "/images/aliados/rehau.png",
    description:
      "Ingeniería alemana aplicada a superficies poliméricas y cubrecantos de precisión. Sus soluciones garantizan estética continua, impermeabilidad y una larga vida útil en los bordes y detalles más exigentes.",
  },
  {
    name: "Cúbrica",
    src: "/images/aliados/cubrica.png",
    description:
      "Expertos en tableros melamínicos sobre sustrato MDF de alta densidad. Destacan por sus tecnologías anti-huella y resistencia a la humedad, logrando frentes de cocina modernos, funcionales y altamente duraderos.",
  },
  {
    name: "Hettich",
    src: "/images/aliados/hettich.svg",
    description:
      "Referente global en herrajes de origen alemán. Su tecnología fiable e innovadora en sistemas de cajonaje y organización interior asegura que el diseño y la funcionalidad trabajen en perfecta armonía.",
  },
];

export default function AliadosPage() {
  const [activePartner, setActivePartner] = useState<(typeof partnerLogos)[number] | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEscapeClose(Boolean(activePartner), () => setActivePartner(null));
  useFocusTrap(Boolean(activePartner), modalRef);

  return (
    <main className="bg-background">
      <section className="px-4 py-16 md:py-20">
        <div className="mx-auto max-w-6xl space-y-10">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Aliados</p>
            <h1 className="mt-3 text-2xl font-semibold text-primary md:text-4xl">Aliados</h1>
            <p className="mt-2 text-sm text-secondary md:text-base">
              Socios y proveedores con los que sostenemos calidad, especificacion y cierre de proyecto.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {partnerLogos.map((logo) => (
              <button
                key={logo.name}
                type="button"
                onClick={() => setActivePartner(logo)}
                className="flex h-24 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative h-full w-full">
                  <Image
                    src={logo.src}
                    alt={logo.name}
                    fill
                    unoptimized
                    className="object-contain"
                    sizes="(min-width: 768px) 160px, 45vw"
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {activePartner && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActivePartner(null)}
          >
            <motion.div
              ref={modalRef}
              tabIndex={-1}
              className="relative w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl"
              initial={{ y: 30, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 10, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setActivePartner(null)}
                className="absolute right-6 top-6 rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-secondary transition hover:border-primary/40 hover:text-primary"
              >
                Cerrar
              </button>
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <div className="flex h-16 w-40 items-center justify-start">
                  <Image
                    src={activePartner.src}
                    alt={activePartner.name}
                    width={160}
                    height={64}
                    unoptimized
                    className="h-12 w-auto object-contain"
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                    Aliado
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-primary md:text-3xl">
                    {activePartner.name}
                  </h3>
                </div>
              </div>
              <p className="mt-6 text-sm leading-relaxed text-secondary md:text-base">
                {activePartner.description}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </main>
  );
}
