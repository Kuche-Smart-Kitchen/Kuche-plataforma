"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Footer from "@/components/Footer";
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
    <main className="overflow-x-hidden bg-background pt-28 md:pt-32">
      <section className="px-4 pb-12 sm:pb-16 md:pb-20">
        <div className="mx-auto max-w-6xl space-y-8 sm:space-y-10">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Aliados</p>
            <h1 className="mt-3 text-2xl font-semibold text-primary sm:text-3xl md:text-4xl">Aliados</h1>
            <p className="mx-auto mt-2 max-w-xl px-2 text-sm text-secondary sm:text-base">
              Socios y proveedores con los que sostenemos calidad, especificacion y cierre de proyecto.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {partnerLogos.map((logo) => (
              <button
                key={logo.name}
                type="button"
                onClick={() => setActivePartner(logo)}
                className="flex h-20 min-w-0 items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md sm:h-24 sm:px-4 sm:py-3"
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
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-4 sm:py-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActivePartner(null)}
          >
            <motion.div
              ref={modalRef}
              tabIndex={-1}
              className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6 md:p-8"
              initial={{ y: 30, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 10, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setActivePartner(null)}
                className="absolute right-4 top-4 rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-secondary transition hover:border-primary/40 hover:text-primary sm:right-6 sm:top-6"
              >
                Cerrar
              </button>
              <div className="flex flex-col gap-4 pt-8 sm:gap-6 sm:pt-0 md:flex-row md:items-center">
                <div className="flex h-14 w-full max-w-[10rem] items-center justify-center sm:justify-start md:h-16 md:w-40">
                  <Image
                    src={activePartner.src}
                    alt={activePartner.name}
                    width={160}
                    height={64}
                    unoptimized
                    className="h-10 w-auto max-w-full object-contain sm:h-12"
                  />
                </div>
                <div className="min-w-0 text-center md:text-left">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-secondary sm:tracking-[0.3em]">
                    Aliado
                  </p>
                  <h3 className="mt-1 text-xl font-semibold text-primary sm:mt-2 sm:text-2xl md:text-3xl">
                    {activePartner.name}
                  </h3>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-secondary sm:mt-6 md:text-base">
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
