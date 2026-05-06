"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import CatalogFilters from "@/components/catalogo/CatalogFilters";
import ProjectCard, { type Project } from "@/components/catalogo/ProjectCard";
import Footer from "@/components/Footer";
import { CATALOG_PROJECT_TYPES } from "@/lib/catalog-project-types";

const primaryCategories = [...CATALOG_PROJECT_TYPES];

const secondaryCategoriesByPrimary: Record<string, string[]> = {
  Cocinas: [
    "Todos",
    "Cocina lineal",
    "Con isla",
    "En U",
    "En escuadra",
    "Inteligentes",
  ],
  Closets: ["Todos", "Walk-in", "Lineal", "En L", "Con isla"],
  Baños: ["Todos", "Con ovalín", "Con piedras"],
  "Muebles a medida": [
    "Todos",
    "Oficina",
    "Recámara",
    "Consultorio",
    "Centro de entretenimiento",
  ],
};

const projects: Project[] = [
  {
    id: "terra-minimal",
    title: "Terra Clara",
    description:
      "Líneas limpias, luz suave y materiales cálidos para una cocina minimalista que se siente viva.",
    mainCategory: "Cocinas",
    subCategory: "Cocina lineal",
    category: "Cocina lineal",
    details: [
      {
        label: "Distribución",
        value:
          "Lineal con isla compacta que libera el paso y mantiene todo al alcance en una sola línea de trabajo.",
      },
      {
        label: "Acabados",
        value:
          "Laminado mate antihuellas y cuarzo cálido, pensado para un look limpio sin perder textura.",
      },
      {
        label: "Iluminación",
        value:
          "Luz LED indirecta con colgantes suaves para crear capas de luz sin deslumbrar.",
      },
      {
        label: "Sensación",
        value:
          "Un ambiente sereno y ordenado, con tonos neutros que mantienen la calma visual.",
      },
    ],
    images: [
      {
        src: "/images/cocina10.jpg",
        alt: "Cocina Terra Clara en tonos cálidos",
        hotspots: [
          {
            id: "encimera-granito",
            label: "Encimera de Granito San Gabriel",
            detail:
              "Granito negro profundo con vetas discretas; resistente al calor y al uso diario sin perder elegancia.",
            top: "30%",
            left: "40%",
          },
          {
            id: "lamparas-ambientales",
            label: "Luminarias colgantes en latón",
            detail:
              "Luz cálida puntual para la isla, con acabado latón que aporta contraste sin recargar el espacio.",
            top: "20%",
            left: "62%",
          },
          {
            id: "alacenas-blancas",
            label: "Alacenas blancas satinadas",
            detail:
              "Frentes satinados con cierre suave; reflejan la luz natural y mantienen una lectura limpia.",
            top: "46%",
            left: "72%",
          },
        ],
      },
      {
        src: "/images/render1.jpg",
        alt: "Render de isla minimalista",
        hotspots: [
          {
            id: "isla-compacta",
            label: "Isla compacta con borde redondeado",
            detail:
              "Diseñada para circulación fluida; el borde suaviza el contacto y mejora la ergonomía.",
            top: "58%",
            left: "48%",
          },
          {
            id: "pisos-madera",
            label: "Pisos de madera natural",
            detail:
              "Duela cálida que equilibra la paleta neutra y aporta sensación doméstica.",
            top: "78%",
            left: "28%",
          },
        ],
      },
      {
        src: "/images/render2.jpg",
        alt: "Render de detalles minimalistas",
        hotspots: [
          {
            id: "paleta-neutra",
            label: "Paleta neutra con textura mate",
            detail:
              "Tonos arena y marfil para mantener calma visual y permitir acentos decorativos.",
            top: "46%",
            left: "52%",
          },
        ],
      },
      {
        src: "/images/cocina3.jpg",
        alt: "Vista amplia de cocina minimalista",
        hotspots: [
          {
            id: "lineas-limpias",
            label: "Paneles sin tiradores",
            detail:
              "Frentes lisos con sistema push-to-open para reforzar la estética limpia.",
            top: "42%",
            left: "62%",
          },
        ],
      },
    ],
  },
  {
    id: "isla-lumina",
    title: "Lúmina Central",
    description:
      "Una isla protagonista que invita a reunirse, con acabados pulidos y acentos guinda sutiles.",
    mainCategory: "Cocinas",
    subCategory: "Con isla",
    category: "Con isla",
    details: [
      {
        label: "Distribución",
        value:
          "Isla central de 3.2 m con espacio de preparación y barra para reuniones casuales.",
      },
      {
        label: "Acabados",
        value:
          "Cuarcita blanca con vetas suaves y madera de nogal para dar profundidad.",
      },
      {
        label: "Extras",
        value:
          "Barra de vinos integrada y almacenamiento oculto para mantener la vista limpia.",
      },
      {
        label: "Uso ideal",
        value:
          "Perfecta para cocinar en compañía y mantener la conversación en el centro.",
      },
    ],
    images: [
      {
        src: "/images/cocina7.jpg",
        alt: "Cocina con isla central protagonista",
        hotspots: [
          {
            id: "isla-cuarsita",
            label: "Isla de cuarsita blanca",
            detail:
              "Superficie resistente a manchas con vetas sutiles; ideal para preparación diaria.",
            top: "58%",
            left: "46%",
          },
          {
            id: "barra-vinos",
            label: "Barra inferior para vinos",
            detail:
              "Nicho integrado con temperatura estable y espacio para copas y accesorios.",
            top: "66%",
            left: "70%",
          },
          {
            id: "alacena-nogal",
            label: "Alacenas de nogal",
            detail:
              "Madera natural que aporta profundidad y contrasta con los planos claros.",
            top: "42%",
            left: "22%",
          },
        ],
      },
      {
        src: "/images/render3.jpg",
        alt: "Render de vista lateral de la isla",
        hotspots: [
          {
            id: "campana-oculta",
            label: "Campana oculta integrada",
            detail:
              "Sistema oculto para una vista continua sin perder potencia de extracción.",
            top: "24%",
            left: "60%",
          },
          {
            id: "iluminacion-led",
            label: "Iluminación LED perimetral",
            detail:
              "Luz indirecta que realza volúmenes y mejora la visibilidad sin sombras duras.",
            top: "54%",
            left: "74%",
          },
        ],
      },
      {
        src: "/images/cocina11.jpg",
        alt: "Ángulo alterno de la isla central",
        hotspots: [
          {
            id: "textura-marfil",
            label: "Textura marfil de alto tráfico",
            detail:
              "Acabado suave al tacto que resiste rayones y mantiene el color con el tiempo.",
            top: "50%",
            left: "40%",
          },
        ],
      },
      {
        src: "/images/cocina8.jpg",
        alt: "Detalle de acabados en isla central",
        hotspots: [
          {
            id: "mueble-bajo",
            label: "Mueble bajo integrado",
            detail:
              "Almacenamiento oculto que mantiene la isla despejada y funcional.",
            top: "62%",
            left: "38%",
          },
        ],
      },
    ],
  },
  {
    id: "clasico-atelier",
    title: "Atelier Clásico",
    description:
      "Detalles atemporales, molduras finas y una distribución pensada para cocinar en calma.",
    mainCategory: "Cocinas",
    subCategory: "En escuadra",
    category: "En escuadra",
    details: [
      {
        label: "Distribución",
        value:
          "L enmarcada con vitrina central para destacar vajillas y piezas especiales.",
      },
      {
        label: "Acabados",
        value:
          "Mármol Carrara con vetas delicadas y acentos en latón cepillado.",
      },
      {
        label: "Detalles",
        value:
          "Molduras suaves, vitrinas con vidrio esmerilado y herrajes clásicos.",
      },
      {
        label: "Sensación",
        value:
          "Elegancia cálida y atemporal que se siente acogedora desde el primer día.",
      },
    ],
    images: [
      {
        src: "/images/cocina12.jpg",
        alt: "Cocina clásica con molduras suaves",
        hotspots: [
          {
            id: "molduras-suaves",
            label: "Molduras suaves en puertas",
            detail:
              "Relieves discretos que aportan carácter clásico sin cargar el conjunto.",
            top: "36%",
            left: "64%",
          },
          {
            id: "griferia-dorada",
            label: "Grifería dorada cepillada",
            detail:
              "Acabado cálido y elegante; combina con herrajes y luminarias.",
            top: "58%",
            left: "42%",
          },
          {
            id: "encimera-marmol",
            label: "Encimera de mármol Carrara",
            detail:
              "Vetas finas y tono marfil; pieza icónica que eleva el conjunto clásico.",
            top: "62%",
            left: "28%",
          },
        ],
      },
      {
        src: "/images/render4.jpg",
        alt: "Render de detalle clásico",
        hotspots: [
          {
            id: "banquetas-tela",
            label: "Banquetas en tela bouclé",
            detail:
              "Textura suave para mayor confort; tonos neutros que armonizan con el mármol.",
            top: "74%",
            left: "54%",
          },
          {
            id: "vitrina-cristal",
            label: "Vitrinas con vidrio esmerilado",
            detail:
              "Permiten ver siluetas sin exponer el contenido; sensación de orden y elegancia.",
            top: "40%",
            left: "26%",
          },
        ],
      },
      {
        src: "/images/render5.jpg",
        alt: "Render de materiales clásicos",
        hotspots: [
          {
            id: "paleta-tostada",
            label: "Paleta tostada con acentos guinda",
            detail:
              "Combinación cálida y sofisticada que aporta personalidad al estilo clásico.",
            top: "46%",
            left: "52%",
          },
        ],
      },
      {
        src: "/images/cocina9.jpg",
        alt: "Vista general de cocina clásica",
        hotspots: [
          {
            id: "molduras-herrajes",
            label: "Herrajes clásicos",
            detail:
              "Tiradores con acabado latón que elevan el lenguaje tradicional.",
            top: "52%",
            left: "66%",
          },
        ],
      },
    ],
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 24 },
} as const;

export default function CatalogoPage() {
  const [activePrimary, setActivePrimary] = useState<string>(
    primaryCategories[0] ?? "",
  );
  const [activeSecondary, setActiveSecondary] = useState<string>(
    secondaryCategoriesByPrimary[primaryCategories[0] ?? ""]?.[0] ?? "Todos",
  );

  const filteredProjects = useMemo<Project[]>(() => {
    const primaryFiltered = projects.filter(
      (project) => project.mainCategory === activePrimary,
    );

    if (activeSecondary === "Todos") return primaryFiltered;

    return primaryFiltered.filter(
      (project) => project.subCategory === activeSecondary,
    );
  }, [activePrimary, activeSecondary]);

  return (
    <main className="min-h-screen bg-background text-primary">
      <section className="px-4 pb-12 pt-14 md:pt-16">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
              Catálogo
            </p>
            <h1 className="mt-4 text-3xl font-semibold text-primary md:text-5xl">
              Nuestros Proyectos
            </h1>
            <p className="mt-3 text-sm text-secondary md:text-base">
              Diseños que equilibran funcionalidad, calma visual y detalles de
              autor.
            </p>
          </div>

          <div className="mt-8">
            <CatalogFilters
              primaryCategories={primaryCategories}
              secondaryCategories={
                secondaryCategoriesByPrimary[activePrimary] ?? ["Todos"]
              }
              activePrimary={activePrimary}
              activeSecondary={activeSecondary}
              onPrimaryChange={(category) => {
                setActivePrimary(category);
                setActiveSecondary(
                  secondaryCategoriesByPrimary[category]?.[0] ?? "Todos",
                );
              }}
              onSecondaryChange={setActiveSecondary}
            />
          </div>
        </div>
      </section>

      <section className="px-4 pb-16">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project) => (
              <motion.div
                key={project.id}
                layout
                {...fadeUp}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <ProjectCard project={project} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      <Footer />
    </main>
  );
}
