"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import CatalogFilters from "@/components/catalogo/CatalogFilters";
import ProjectCard, { type Project } from "@/components/catalogo/ProjectCard";
import Footer from "@/components/layout/Footer";
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
    "Consultorio",
    "Centro de entretenimiento",
    "Especiales",
  ],
};

const projects: Project[] = [
  {
    id: "terra-minimal",
    title: "Estilo Moderno",
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
        src: "/images/pagina-catalogo/terra-clara/imagen-01-cocina-hero.jpg",
        alt: "Cocina Estilo Moderno en tonos cálidos",
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
        src: "/images/pagina-catalogo/terra-clara/imagen-02-render-principal.jpg",
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
        src: "/images/pagina-catalogo/terra-clara/imagen-03-render-secundario.jpg",
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
        src: "/images/pagina-catalogo/terra-clara/imagen-04-galeria.jpg",
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
    title: "Residencial con isla",
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
        src: "/images/pagina-catalogo/lumina-central/imagen-01-cocina-hero.jpg",
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
        src: "/images/pagina-catalogo/lumina-central/imagen-02-isla-real.jpeg",
        alt: "Isla con cubierta de granito y parrilla de gas",
        hotspots: [
          {
            id: "cubierta-granito",
            label: "Cubierta de granito veteado",
            detail:
              "Piedra oscura con vetas blancas en dos niveles que define la zona de cocción y la barra.",
            top: "38%",
            left: "50%",
          },
          {
            id: "parrilla-gas",
            label: "Parrilla de gas integrada",
            detail:
              "Quemadores empotrados en la cubierta para cocción directa sobre la isla.",
            top: "48%",
            left: "52%",
          },
          {
            id: "gabinetes-madera",
            label: "Gabinetes en madera",
            detail:
              "Frentes en tono nogal con cajón extraíble y almacenamiento oculto bajo la isla.",
            top: "68%",
            left: "28%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/lumina-central/imagen-03-vitrina-vinos.jpeg",
        alt: "Módulo de vinos con repisas iluminadas y vitrina de cristal",
        hotspots: [
          {
            id: "botellero-diamante",
            label: "Botellero en diamante",
            detail:
              "Rejilla integrada para doce botellas con lectura decorativa en la parte superior del módulo.",
            top: "22%",
            left: "28%",
          },
          {
            id: "repisas-iluminadas",
            label: "Repisas con luz LED",
            detail:
              "Dos niveles abiertos con iluminación vertical para exhibir copas, licores o piezas decorativas.",
            top: "42%",
            left: "30%",
          },
          {
            id: "vitrina-cristal",
            label: "Vitrina de cristal",
            detail:
              "Gabinete con puerta de vidrio y luz interior para almacenar y mostrar vajilla o botellas.",
            top: "45%",
            left: "72%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/lumina-central/imagen-04-detalle-acabados.jpg",
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
    id: "atardecer",
    title: "Atardecer",
    description:
      "Cocina en escuadra con luz cálida de atardecer, madera natural y una distribución pensada para convivir.",
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
        src: "/images/pagina-catalogo/atelier-clasico/imagen-01-cocina-hero.jpg",
        alt: "Cocina Atardecer en escuadra",
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
        src: "/images/pagina-catalogo/atelier-clasico/imagen-02-cocina-real.jpeg",
        alt: "Cocina Atardecer con isla y vista al atardecer",
        hotspots: [
          {
            id: "isla-lambrin",
            label: "Isla con lambrín de madera",
            detail:
              "Cubierta negra con parrilla integrada y frente en listones verticales de madera.",
            top: "58%",
            left: "48%",
          },
          {
            id: "ventana-atardecer",
            label: "Ventana en esquina",
            detail:
              "Apertura amplia que enmarca la luz cálida del atardecer sobre la zona de lavabo.",
            top: "32%",
            left: "62%",
          },
          {
            id: "alacenas-gris-madera",
            label: "Alacenas gris y madera",
            detail:
              "Combinación de frentes en gris mate y madera natural en módulos altos y bajos.",
            top: "38%",
            left: "22%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/atelier-clasico/imagen-03-render-materiales.jpg",
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
        src: "/images/pagina-catalogo/atelier-clasico/imagen-04-vista-general.jpg",
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
  {
    id: "titanium",
    title: "Titanium",
    description:
      "Cocina en U con frentes texturizados, cubierta de granito oscuro y una distribución que optimiza cada rincón del espacio.",
    mainCategory: "Cocinas",
    subCategory: "En U",
    category: "En U",
    details: [
      {
        label: "Distribución",
        value:
          "En U con barra lateral y zona de cocción centralizada para un flujo de trabajo continuo.",
      },
      {
        label: "Acabados",
        value:
          "Melamina con textura de madera clara y cubierta de granito negro con vetas doradas.",
      },
      {
        label: "Iluminación",
        value:
          "Luz LED integrada bajo gabinete superior y spots empotrados para la zona de tarja.",
      },
      {
        label: "Sensación",
        value:
          "Contraste elegante entre tonos cálidos y superficies oscuras, con acabado contemporáneo.",
      },
    ],
    images: [
      {
        src: "/images/pagina-catalogo/titanium/imagen-01-cocina-hero.jpg",
        alt: "Cocina Titanium en U con barra lateral",
        hotspots: [
          {
            id: "cubierta-granito",
            label: "Cubierta de granito oscuro",
            detail:
              "Granito pulido con vetas doradas y blancas; resistente al calor y al uso diario.",
            top: "62%",
            left: "28%",
          },
          {
            id: "frentes-madera",
            label: "Frentes con textura de madera",
            detail:
              "Melamina con veta vertical que aporta calidez sin perder la lectura limpia del diseño.",
            top: "38%",
            left: "42%",
          },
          {
            id: "barra-lateral",
            label: "Barra lateral integrada",
            detail:
              "Extensión de la cubierta que crea un punto de apoyo y circulación fluida en la U.",
            top: "68%",
            left: "12%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/titanium/imagen-02-render-zona-coccion.jpg",
        alt: "Zona de cocción de cocina Titanium",
        hotspots: [
          {
            id: "estufa-acero",
            label: "Estufa de acero inoxidable",
            detail:
              "Equipo empotrado con cubierta de vidrio y horno integrado para uso diario.",
            top: "58%",
            left: "48%",
          },
          {
            id: "microondas-integrado",
            label: "Microondas sobre estufa",
            detail:
              "Ubicación compacta que libera espacio en la cubierta y mantiene la línea visual.",
            top: "28%",
            left: "50%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/titanium/imagen-03-detalle-tarja.jpg",
        alt: "Detalle de tarja en cocina Titanium",
        hotspots: [
          {
            id: "tarja-inox",
            label: "Tarja bajo cubierta en acero",
            detail:
              "Instalación undermount que facilita la limpieza y mantiene continuidad en el granito.",
            top: "52%",
            left: "44%",
          },
          {
            id: "gabinete-negro",
            label: "Gabinete superior en negro brillante",
            detail:
              "Contraste puntual sobre la madera clara; concentra la luz sobre el área de lavado.",
            top: "18%",
            left: "48%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/titanium/imagen-04-vista-general.jpg",
        alt: "Vista general de cocina Titanium en U",
        hotspots: [
          {
            id: "torre-refrigerador",
            label: "Torre para refrigerador",
            detail:
              "Encastre a medida que alinea el electrodoméstico con la línea de gabinetes.",
            top: "42%",
            left: "88%",
          },
          {
            id: "flujo-en-u",
            label: "Circulación en U",
            detail:
              "Distribución que conecta preparación, cocción y lavado en un solo recorrido.",
            top: "55%",
            left: "50%",
          },
        ],
      },
    ],
  },
  {
    id: "cocina-inteligente",
    title: "Cocina inteligente",
    description:
      "Isla central, electrodomésticos integrados y pantalla de control para una cocina conectada con acabados de mármol negro y madera natural.",
    mainCategory: "Cocinas",
    subCategory: "Inteligentes",
    category: "Inteligentes",
    details: [
      {
        label: "Distribución",
        value:
          "Isla amplia con barra, torre de electrodomésticos y módulo inteligente para centralizar funciones.",
      },
      {
        label: "Acabados",
        value:
          "Mármol negro veteado, frentes en madera natural y gabinetes en negro mate con perfil gola.",
      },
      {
        label: "Tecnología",
        value:
          "Pantalla integrada, iluminación LED bajo alacena y electrodomésticos empotrados de acero.",
      },
      {
        label: "Sensación",
        value:
          "Ambiente contemporáneo y sofisticado, pensado para cocinar con comodidad y control digital.",
      },
    ],
    images: [
      {
        src: "/images/pagina-catalogo/cocina-inteligente/imagen-01-cocina-hero.jpg",
        alt: "Cocina inteligente con isla y mármol negro",
        hotspots: [
          {
            id: "isla-marmol",
            label: "Isla con cubierta de mármol negro",
            detail:
              "Superficie amplia con vetas blancas; incluye tarja integrada y espacio para convivir.",
            top: "58%",
            left: "42%",
          },
          {
            id: "colgantes-dorados",
            label: "Luminarias colgantes con malla dorada",
            detail:
              "Cuatro puntos de luz sobre la isla que aportan calidez y escala visual.",
            top: "22%",
            left: "48%",
          },
          {
            id: "torre-electrodomesticos",
            label: "Torre de electrodomésticos integrados",
            detail:
              "Horno, microondas y despachador en un solo módulo negro para mantener orden.",
            top: "38%",
            left: "82%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/cocina-inteligente/imagen-02-render-isla.jpg",
        alt: "Isla central de cocina inteligente",
        hotspots: [
          {
            id: "tarja-isla",
            label: "Tarja doble en la isla",
            detail:
              "Ubicación central que facilita preparación y lavado sin cambiar de zona.",
            top: "52%",
            left: "46%",
          },
          {
            id: "lavavajillas-integrado",
            label: "Lavavajillas empotrado",
            detail:
              "Panel en madera que mantiene continuidad visual en el frente de la isla.",
            top: "62%",
            left: "28%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/cocina-inteligente/imagen-03-torre-inteligente.jpg",
        alt: "Torre inteligente con pantalla integrada",
        hotspots: [
          {
            id: "pantalla-control",
            label: "Pantalla de control integrada",
            detail:
              "Centro de mando para recetas, temporizadores y automatización del hogar.",
            top: "18%",
            left: "52%",
          },
          {
            id: "botellero",
            label: "Botellero con celosía",
            detail:
              "Almacenamiento visible con fondo en madera que contrasta con el módulo negro.",
            top: "32%",
            left: "78%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/cocina-inteligente/imagen-04-zona-coccion.jpg",
        alt: "Zona de cocción de cocina inteligente",
        hotspots: [
          {
            id: "salpicadero-marmol",
            label: "Salpicadero de mármol continuo",
            detail:
              "La piedra sube hasta los gabinetes superiores para una lectura limpia y continua.",
            top: "48%",
            left: "50%",
          },
          {
            id: "campana-profesional",
            label: "Campana y estufa profesional",
            detail:
              "Equipo de acero inoxidable con extracción vertical y quemadores de alto rendimiento.",
            top: "36%",
            left: "50%",
          },
        ],
      },
    ],
  },
  {
    id: "vestidor-sereno",
    title: "Vestidor Sereno",
    description:
      "Walk-in en tono taupe con almacenamiento a techo, zonas de colgado y un tocador integrado que ordena la rutina diaria con calma visual.",
    mainCategory: "Closets",
    subCategory: "Walk-in",
    category: "Walk-in",
    details: [
      {
        label: "Distribución",
        value:
          "Walk-in en L con módulos de colgado, cajoneras profundas y repisas abiertas en un solo recorrido.",
      },
      {
        label: "Acabados",
        value:
          "Melamina mate en tono taupe con frentes lisos sin tirador y piso tipo mármol claro.",
      },
      {
        label: "Funcionalidad",
        value:
          "Tocador con repisas flotantes, barras de colgado y maleteros superiores hasta el techo.",
      },
      {
        label: "Sensación",
        value:
          "Neutros cálidos y líneas limpias que convierten el vestidor en un espacio sereno y funcional.",
      },
    ],
    images: [
      {
        src: "/images/pagina-catalogo/vestidor-sereno/imagen-01-closet-hero.jpeg",
        alt: "Vestidor Sereno walk-in en tono taupe",
        hotspots: [
          {
            id: "maleteros-techo",
            label: "Maleteros hasta el techo",
            detail:
              "Almacenamiento superior continuo para temporada, equipaje y artículos poco frecuentes.",
            top: "18%",
            left: "50%",
          },
          {
            id: "cajoneras-profundas",
            label: "Cajoneras de gran capacidad",
            detail:
              "Cuatro cajones amplios para ropa doblada, accesorios y organización por niveles.",
            top: "55%",
            left: "78%",
          },
          {
            id: "zona-colgado",
            label: "Zona de colgado central",
            detail:
              "Barra metálica con altura cómoda y nicho inferior para calzado o canastos.",
            top: "42%",
            left: "48%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/vestidor-sereno/imagen-02-vista-general.jpeg",
        alt: "Vista general del walk-in Vestidor Sereno",
        hotspots: [
          {
            id: "configuracion-u",
            label: "Configuración envolvente",
            detail:
              "Distribución en U que aprovecha las tres paredes y mantiene circulación central libre.",
            top: "50%",
            left: "50%",
          },
          {
            id: "repisas-abiertas",
            label: "Repisas abiertas laterales",
            detail:
              "Espacios visibles para calzado, bolsos y piezas de uso frecuente.",
            top: "38%",
            left: "22%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/vestidor-sereno/imagen-03-tocador-integrado.jpeg",
        alt: "Tocador integrado en Vestidor Sereno",
        hotspots: [
          {
            id: "tocador-integrado",
            label: "Tocador con cajón",
            detail:
              "Superficie de trabajo para arreglo personal con almacenamiento oculto debajo.",
            top: "58%",
            left: "72%",
          },
          {
            id: "repisas-flotantes",
            label: "Repisas flotantes",
            detail:
              "Dos niveles abiertos para decoración, perfumes o piezas del día a día.",
            top: "28%",
            left: "78%",
          },
        ],
      },
    ],
  },
  {
    id: "vestidor-nogal",
    title: "Vestidor Nogal",
    description:
      "Walk-in en L con acabado nogal, repisas curvas iluminadas y tocador integrado para un vestidor cálido, ordenado y con luz de boutique.",
    mainCategory: "Closets",
    subCategory: "Walk-in",
    category: "Walk-in",
    details: [
      {
        label: "Distribución",
        value:
          "Configuración en L con colgado central, cajoneras amplias y zona de tocador en un solo módulo.",
      },
      {
        label: "Acabados",
        value:
          "Melamina con textura de nogal, frentes sin tirador y repisas con canto curvo.",
      },
      {
        label: "Iluminación",
        value:
          "Tiras LED verticales en esquina y bajo repisas para resaltar ropa y accesorios.",
      },
      {
        label: "Sensación",
        value:
          "Madera cálida y luz ambiental que convierten el vestidor en un espacio personal de lujo.",
      },
    ],
    images: [
      {
        src: "/images/pagina-catalogo/vestidor-nogal/imagen-01-closet-hero.jpeg",
        alt: "Vestidor Nogal walk-in con iluminación integrada",
        hotspots: [
          {
            id: "repisas-curvas",
            label: "Repisas curvas con LED",
            detail:
              "Estantería en esquina con cantos redondeados y luz vertical que realza cada nivel.",
            top: "38%",
            left: "18%",
          },
          {
            id: "barra-colgado",
            label: "Barra de colgado iluminada",
            detail:
              "Luz bajo la repisa superior que mejora la visibilidad de prendas largas.",
            top: "22%",
            left: "48%",
          },
          {
            id: "tocador-nogal",
            label: "Tocador con cajón",
            detail:
              "Superficie de trabajo lateral con almacenamiento oculto para rutina diaria.",
            top: "55%",
            left: "82%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/vestidor-nogal/imagen-02-detalle-iluminacion.jpeg",
        alt: "Detalle de cajoneras y luz en Vestidor Nogal",
        hotspots: [
          {
            id: "cajoneras-triple",
            label: "Cajoneras de triple cajón",
            detail:
              "Tres cajones profundos para ropa doblada y accesorios, con apertura push.",
            top: "62%",
            left: "50%",
          },
          {
            id: "nichos-abiertos",
            label: "Nichos abiertos",
            detail:
              "Cubículos visibles para calzado, bolsos o piezas de uso inmediato.",
            top: "48%",
            left: "32%",
          },
        ],
      },
    ],
  },
  {
    id: "closet-bicolor",
    title: "Closet Bicolor",
    description:
      "Closet lineal simétrico con acabado madera clara, acentos en tono chocolate y seis cajones centrales para ordenar la recámara con estilo.",
    mainCategory: "Closets",
    subCategory: "Lineal",
    category: "Lineal",
    details: [
      {
        label: "Distribución",
        value:
          "Módulo lineal con dos puertas altas, cómoda central y cubos superiores abiertos en una sola pared.",
      },
      {
        label: "Acabados",
        value:
          "Melamina con veta vertical en tono claro, detalles en madera oscura y tiradores negros mate.",
      },
      {
        label: "Funcionalidad",
        value:
          "Nicho central para TV o tocador, cajonera de seis cajones y cubículos de exhibición superior.",
      },
      {
        label: "Sensación",
        value:
          "Diseño simétrico y contemporáneo que equilibra almacenamiento cerrado y espacio abierto.",
      },
    ],
    images: [
      {
        src: "/images/pagina-catalogo/closet-bicolor/imagen-01-closet-hero.jpeg",
        alt: "Closet Bicolor lineal con acabado bicolor",
        objectFit: "contain",
        hotspots: [
          {
            id: "puertas-altas",
            label: "Puertas altas laterales",
            detail:
              "Dos módulos de piso a techo para colgado y almacenamiento oculto de temporada.",
            top: "42%",
            left: "18%",
          },
          {
            id: "cubos-superiores",
            label: "Cubos superiores en tono oscuro",
            detail:
              "Seis compartimentos abiertos para decoración, accesorios o ropa doblada.",
            top: "18%",
            left: "50%",
          },
          {
            id: "cajonera-seis",
            label: "Cajonera de seis cajones",
            detail:
              "Organización por niveles en el centro del módulo, con tiradores horizontales.",
            top: "58%",
            left: "50%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/closet-bicolor/imagen-02-detalle-central.jpeg",
        alt: "Detalle del nicho central en Closet Bicolor",
        objectFit: "contain",
        hotspots: [
          {
            id: "nicho-central",
            label: "Nicho central multifunción",
            detail:
              "Espacio abierto ideal para pantalla, espejo con luz o zona de carga y arreglo.",
            top: "38%",
            left: "50%",
          },
          {
            id: "zocalo-oscuro",
            label: "Zócalo en tono chocolate",
            detail:
              "Base continua que ancla el módulo y refuerza el contraste bicolor del diseño.",
            top: "82%",
            left: "50%",
          },
        ],
      },
    ],
  },
  {
    id: "closet-roble",
    title: "Closet Roble",
    description:
      "Closet lineal de piso a techo con acabado roble claro, interiores en blanco y maleteros superiores para maximizar el almacenamiento de la recámara.",
    mainCategory: "Closets",
    subCategory: "Lineal",
    category: "Lineal",
    details: [
      {
        label: "Distribución",
        value:
          "Tres módulos lineales con puertas dobles y maleteros continuos hasta el techo.",
      },
      {
        label: "Acabados",
        value:
          "Melamina roble claro con veta vertical, interiores blancos y tiradores en acero cepillado.",
      },
      {
        label: "Funcionalidad",
        value:
          "Repisas, zona de colgado y cajonera interior para organización modular por módulo.",
      },
      {
        label: "Sensación",
        value:
          "Continuidad mural y madera cálida que aportan amplitud, orden y lectura limpia.",
      },
    ],
    images: [
      {
        src: "/images/pagina-catalogo/closet-roble/imagen-01-closet-hero.jpeg",
        alt: "Closet Roble lineal de piso a techo",
        hotspots: [
          {
            id: "maleteros-superiores",
            label: "Maleteros superiores",
            detail:
              "Compartimentos hasta el techo para equipaje, temporada y artículos poco frecuentes.",
            top: "14%",
            left: "50%",
          },
          {
            id: "modulos-triple",
            label: "Tres módulos de puertas",
            detail:
              "Distribución simétrica en pared completa para colgado y almacenamiento cerrado.",
            top: "48%",
            left: "50%",
          },
          {
            id: "tiradores-vertical",
            label: "Tiradores verticales en acero",
            detail:
              "Perfiles alargados que facilitan la apertura y refuerzan el estilo contemporáneo.",
            top: "55%",
            left: "35%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/closet-roble/imagen-02-interior-organizado.jpeg",
        alt: "Interior organizado del Closet Roble",
        objectFit: "contain",
        hotspots: [
          {
            id: "repisas-interiores",
            label: "Repisas interiores",
            detail:
              "Niveles amplios en acabado blanco para ropa doblada, bolsos y cajas.",
            top: "42%",
            left: "22%",
          },
          {
            id: "barra-colgado-roble",
            label: "Barra de colgado",
            detail:
              "Zona dedicada para prendas largas con repisa superior complementaria.",
            top: "38%",
            left: "48%",
          },
          {
            id: "cajonera-interior",
            label: "Cajonera interior",
            detail:
              "Cinco cajones integrados con gabinete superior para accesorios y ropa íntima.",
            top: "62%",
            left: "62%",
          },
        ],
      },
    ],
  },
  {
    id: "closet-grafito",
    title: "Closet Grafito",
    description:
      "Closet lineal en acabado grafito con tiradores circulares, cajonera integrada y repisas decorativas en colores que aportan personalidad a la recámara.",
    mainCategory: "Closets",
    subCategory: "Lineal",
    category: "Lineal",
    details: [
      {
        label: "Distribución",
        value:
          "Módulo lineal con puertas altas, tres cajones inferiores y repisas flotantes en esquina.",
      },
      {
        label: "Acabados",
        value:
          "Melamina grafito con veta vertical, tiradores circulares en gris y repisas en tonos primarios.",
      },
      {
        label: "Funcionalidad",
        value:
          "Almacenamiento cerrado para ropa y cajones amplios, con repisas abiertas para exhibición.",
      },
      {
        label: "Sensación",
        value:
          "Diseño contemporáneo y juvenil que combina sobriedad en el armario con acentos lúdicos.",
      },
    ],
    images: [
      {
        src: "/images/pagina-catalogo/closet-grafito/imagen-01-closet-hero.jpeg",
        alt: "Closet Grafito lineal con repisas en esquina",
        hotspots: [
          {
            id: "puertas-grafito",
            label: "Puertas en acabado grafito",
            detail:
              "Frentes oscuros con textura de madera que anclan el módulo con presencia moderna.",
            top: "42%",
            left: "62%",
          },
          {
            id: "tiradores-circulares",
            label: "Tiradores circulares",
            detail:
              "Perfiles redondos en gris que facilitan la apertura y aportan un detalle distintivo.",
            top: "48%",
            left: "55%",
          },
          {
            id: "repisas-esquina",
            label: "Repisas flotantes en esquina",
            detail:
              "Estantería envolvente en colores vivos para libros, juguetes o piezas decorativas.",
            top: "35%",
            left: "22%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/closet-grafito/imagen-02-repisas-decorativas.jpeg",
        alt: "Detalle de cajonera y repisas en Closet Grafito",
        hotspots: [
          {
            id: "cajonera-triple",
            label: "Cajonera de tres cajones",
            detail:
              "Cajones amplios sin tirador para ropa doblada y organización diaria.",
            top: "68%",
            left: "58%",
          },
          {
            id: "repisas-bloque",
            label: "Repisas tipo bloque",
            detail:
              "Diseño modular con relieve circular que convierte la pared en zona de exhibición.",
            top: "32%",
            left: "78%",
          },
        ],
      },
    ],
  },
  {
    id: "closet-flotante",
    title: "Closet Flotante",
    description:
      "Closet lineal suspendido con acabado madera clara, frentes sin tirador y maleteros superiores para una recámara ligera y ordenada.",
    mainCategory: "Closets",
    subCategory: "Lineal",
    category: "Lineal",
    details: [
      {
        label: "Distribución",
        value:
          "Módulo lineal flotante con puertas verticales, cajonera lateral y maleteros de ancho completo.",
      },
      {
        label: "Acabados",
        value:
          "Melamina en tono arena con veta vertical y sistema gola sin tiradores visibles.",
      },
      {
        label: "Funcionalidad",
        value:
          "Cajón con cerradura para objetos de valor y almacenamiento cerrado en múltiples alturas.",
      },
      {
        label: "Sensación",
        value:
          "Diseño suspendido que libera el piso y aporta ligereza visual a la recámara.",
      },
    ],
    images: [
      {
        src: "/images/pagina-catalogo/closet-flotante/imagen-01-closet-hero.jpeg",
        alt: "Closet Flotante lineal en madera clara",
        objectFit: "contain",
        hotspots: [
          {
            id: "base-flotante",
            label: "Base suspendida",
            detail:
              "Instalación elevada del suelo que aporta sensación de amplitud y limpieza visual.",
            top: "78%",
            left: "50%",
          },
          {
            id: "maleteros-anchos",
            label: "Maleteros superiores",
            detail:
              "Dos puertas horizontales de ancho completo para ropa de temporada y artículos voluminosos.",
            top: "16%",
            left: "50%",
          },
          {
            id: "perfil-gola",
            label: "Frentes con perfil gola",
            detail:
              "Apertura sin tirador que mantiene líneas continuas y un acabado minimalista.",
            top: "48%",
            left: "35%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/closet-flotante/imagen-02-vista-lateral.jpeg",
        alt: "Vista frontal del Closet Flotante",
        objectFit: "contain",
        hotspots: [
          {
            id: "cajonera-lateral",
            label: "Cajonera de tres cajones",
            detail:
              "Cajones amplios en el módulo derecho, con cerradura en el cajón central.",
            top: "65%",
            left: "72%",
          },
          {
            id: "puertas-modulares",
            label: "Puertas en distintas alturas",
            detail:
              "Combinación de módulos altos y bajos para colgado, repisas y almacenamiento flexible.",
            top: "42%",
            left: "28%",
          },
        ],
      },
    ],
  },
  {
    id: "closet-nicho-lateral",
    title: "Closet con Nicho Lateral",
    description:
      "Closet lineal bicolor con puertas altas, cajonera central en madera oscura y módulo lateral abierto con repisa flotante.",
    mainCategory: "Closets",
    subCategory: "Lineal",
    category: "Lineal",
    details: [
      {
        label: "Distribución",
        value:
          "Módulo lineal de cuatro puertas con cajones centrales, cubo abierto y nicho lateral con repisa.",
      },
      {
        label: "Acabados",
        value:
          "Madera clara en frentes principales, acentos en nogal oscuro y zócalo en tono chocolate.",
      },
      {
        label: "Funcionalidad",
        value:
          "Cajonera de tres cajones, cubo abierto central y repisa flotante en el módulo lateral.",
      },
      {
        label: "Sensación",
        value:
          "Diseño limpio sin tiradores que combina almacenamiento cerrado y espacio abierto en una sola pared.",
      },
    ],
    images: [
      {
        src: "/images/pagina-catalogo/closet-escritorio/imagen-01-closet-hero.jpeg",
        alt: "Closet con Nicho Lateral lineal bicolor",
        objectFit: "contain",
        hotspots: [
          {
            id: "puertas-altas-claras",
            label: "Puertas altas en madera clara",
            detail:
              "Cuatro módulos verticales para colgado y almacenamiento cerrado de temporada.",
            top: "32%",
            left: "38%",
          },
          {
            id: "cajonera-oscura",
            label: "Cajonera en nogal",
            detail:
              "Tres cajones en tono oscuro con cubo abierto lateral para accesorios.",
            top: "52%",
            left: "42%",
          },
          {
            id: "nicho-lateral",
            label: "Nicho lateral abierto",
            detail:
              "Módulo lateral con repisa flotante y espacio abierto para decoración o almacenaje visible.",
            top: "48%",
            left: "78%",
          },
        ],
      },
    ],
  },
  {
    id: "modulo-bajo-escalera",
    title: "Módulo Bajo Escalera",
    description:
      "Aparador a medida en madera clara empotrado bajo escalera, con puertas, cajonera central y cubierta continua que sigue la inclinación del hueco.",
    mainCategory: "Closets",
    subCategory: "Lineal",
    category: "Lineal",
    details: [
      {
        label: "Distribución",
        value:
          "Módulo lineal con dos puertas laterales, tres cajones centrales y cubierta con panel trasero a medida.",
      },
      {
        label: "Acabados",
        value:
          "Melamina en tono roble claro con veta natural, cubierta gruesa y zócalo del mismo material.",
      },
      {
        label: "Funcionalidad",
        value:
          "Almacenamiento cerrado en puertas y cajones para aprovechar el espacio bajo la escalera.",
      },
      {
        label: "Sensación",
        value:
          "Pieza empotrada que integra el mueble al arquitectónico del hueco sin desperdiciar metros.",
      },
    ],
    images: [
      {
        src: "/images/pagina-catalogo/modulo-bajo-escalera/imagen-01-modulo-hero.jpeg",
        alt: "Módulo Bajo Escalera en madera clara",
        hotspots: [
          {
            id: "panel-inclinado",
            label: "Panel bajo escalera",
            detail:
              "Revestimiento en madera que sigue la inclinación del escalón y unifica el nicho.",
            top: "28%",
            left: "50%",
          },
          {
            id: "cajonera-central",
            label: "Cajonera central",
            detail:
              "Tres cajones amplios en el centro del módulo para almacenamiento de uso frecuente.",
            top: "62%",
            left: "48%",
          },
          {
            id: "puertas-laterales",
            label: "Puertas laterales",
            detail:
              "Dos módulos con puertas a cada lado para guardar artículos de mayor volumen.",
            top: "58%",
            left: "22%",
          },
        ],
      },
    ],
  },
  {
    id: "closet-ebano",
    title: "Closet Ébano",
    description:
      "Closet en L con marco en ébano, interiores blancos y zonas de colgado, repisas y cajonera para aprovechar cada esquina de la recámara.",
    mainCategory: "Closets",
    subCategory: "En L",
    category: "En L",
    details: [
      {
        label: "Distribución",
        value:
          "Configuración en L con doble colgado, repisas abiertas y cajonera central en esquina.",
      },
      {
        label: "Acabados",
        value:
          "Estructura en madera oscura tipo ébano, interiores en blanco y barras cromadas.",
      },
      {
        label: "Funcionalidad",
        value:
          "Repisas verticales para calzado, barras a distintas alturas y cuatro cajones amplios.",
      },
      {
        label: "Sensación",
        value:
          "Contraste elegante entre tonos oscuros y claros que ordena el espacio con lectura limpia.",
      },
    ],
    images: [
      {
        src: "/images/pagina-catalogo/closet-ebano/imagen-01-closet-hero.jpeg",
        alt: "Closet Ébano en L con interiores blancos",
        hotspots: [
          {
            id: "doble-colgado",
            label: "Doble barra de colgado",
            detail:
              "Dos niveles de colgado en la esquina para optimizar prendas cortas y largas.",
            top: "38%",
            left: "55%",
          },
          {
            id: "repisas-laterales",
            label: "Repisas verticales",
            detail:
              "Columnas abiertas en ambos extremos para calzado, bolsos y ropa doblada.",
            top: "42%",
            left: "18%",
          },
          {
            id: "cajonera-central",
            label: "Cajonera de cuatro cajones",
            detail:
              "Módulo central con frentes en ébano para organización de ropa y accesorios.",
            top: "72%",
            left: "62%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/closet-ebano/imagen-02-vista-esquina.jpeg",
        alt: "Vista de esquina del Closet Ébano",
        hotspots: [
          {
            id: "configuracion-l",
            label: "Configuración en L",
            detail:
              "Dos paredes conectadas que convierten la esquina en almacenamiento continuo.",
            top: "50%",
            left: "50%",
          },
          {
            id: "interior-blanco",
            label: "Interiores en blanco",
            detail:
              "Fondo claro que mejora la visibilidad y realza el contraste con el marco oscuro.",
            top: "35%",
            left: "42%",
          },
        ],
      },
    ],
  },
  {
    id: "closet-luminoso",
    title: "Closet Luminoso",
    description:
      "Closet en L en blanco brillante con puertas espejo, cubos iluminados y tocador integrado sobre muro de lambrín para un vestidor tipo boutique.",
    mainCategory: "Closets",
    subCategory: "En L",
    category: "En L",
    details: [
      {
        label: "Distribución",
        value:
          "Configuración en L con armario espejado, cubos de exhibición y tocador en esquina.",
      },
      {
        label: "Acabados",
        value:
          "Frentes en blanco alto brillo, lambrín vertical en madera y espejos de piso a techo.",
      },
      {
        label: "Iluminación",
        value:
          "LED integrado en cubos, repisas flotantes y zócalo del muro para ambiente uniforme.",
      },
      {
        label: "Sensación",
        value:
          "Espacio luminoso y refinado que combina almacenamiento cerrado con zona de arreglo personal.",
      },
    ],
    images: [
      {
        src: "/images/pagina-catalogo/closet-luminoso/imagen-01-closet-hero.jpeg",
        alt: "Closet Luminoso en L con iluminación integrada",
        hotspots: [
          {
            id: "puertas-espejo",
            label: "Puertas con espejo",
            detail:
              "Seis módulos espejados que amplían visualmente el espacio y facilitan el arreglo.",
            top: "42%",
            left: "32%",
          },
          {
            id: "cubos-led",
            label: "Cubos iluminados",
            detail:
              "Columna de exhibición con luz interior para accesorios, calzado o piezas destacadas.",
            top: "38%",
            left: "52%",
          },
          {
            id: "tocador-esquina",
            label: "Tocador en esquina",
            detail:
              "Escritorio flotante con cajones y repisas que completan el recorrido en L.",
            top: "55%",
            left: "72%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/closet-luminoso/imagen-02-puertas-espejo.jpeg",
        alt: "Puertas espejo y cubos del Closet Luminoso",
        hotspots: [
          {
            id: "lambrin-vertical",
            label: "Muro de lambrín",
            detail:
              "Revestimiento vertical en madera que aporta textura y calidez a la zona de tocador.",
            top: "35%",
            left: "78%",
          },
          {
            id: "repisas-flotantes-led",
            label: "Repisas con luz perimetral",
            detail:
              "Estanterías flotantes con LED inferior que ilumina objetos y el muro de fondo.",
            top: "22%",
            left: "85%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/closet-luminoso/imagen-03-tocador-integrado.jpeg",
        alt: "Tocador integrado del Closet Luminoso",
        hotspots: [
          {
            id: "modulo-almacenaje",
            label: "Módulo de almacenaje lateral",
            detail:
              "Gabinetes altos y cajoneras bajas en blanco brillante para guardar ropa y complementos.",
            top: "45%",
            left: "88%",
          },
          {
            id: "cajonera-tocador",
            label: "Cajonera bajo tocador",
            detail:
              "Dos cajones amplios bajo la superficie de trabajo para organización diaria.",
            top: "68%",
            left: "58%",
          },
        ],
      },
    ],
  },
  {
    id: "closet-en-l-bicolor",
    title: "Closet En L Bicolor",
    description:
      "Closet en L con acabado bicolor en madera, alacenas superiores, repisa en esquina y cajonera de cuatro cajones para aprovechar la esquina de la recámara.",
    mainCategory: "Closets",
    subCategory: "En L",
    category: "En L",
    details: [
      {
        label: "Distribución",
        value:
          "Configuración en L con maleteros superiores, repisa central en esquina, cajonera y nichos abiertos.",
      },
      {
        label: "Acabados",
        value:
          "Madera clara en frentes, acentos en tono chocolate y frentes sin tirador en alacenas.",
      },
      {
        label: "Funcionalidad",
        value:
          "Cuatro cajones amplios, cubículos abiertos en la base y almacenamiento cerrado hasta el techo.",
      },
      {
        label: "Sensación",
        value:
          "Contraste cálido entre tonos claros y oscuros que ordena la esquina con lectura contemporánea.",
      },
    ],
    images: [
      {
        src: "/images/pagina-catalogo/closet-en-l-bicolor/imagen-01-closet-hero.jpeg",
        alt: "Closet En L Bicolor con cajonera y repisa en esquina",
        objectFit: "contain",
        hotspots: [
          {
            id: "maleteros-superiores-l",
            label: "Alacenas superiores",
            detail:
              "Módulos de piso a techo en madera clara para ropa de temporada y artículos voluminosos.",
            top: "18%",
            left: "50%",
          },
          {
            id: "repisa-esquina",
            label: "Repisa en esquina",
            detail:
              "Nicho horizontal en tono oscuro que envuelve la esquina del closet en L.",
            top: "42%",
            left: "55%",
          },
          {
            id: "cajonera-cuadruple-l",
            label: "Cajonera de cuatro cajones",
            detail:
              "Cuatro cajones amplios en frentes claros para ropa doblada y accesorios.",
            top: "68%",
            left: "62%",
          },
        ],
      },
    ],
  },
  {
    id: "closet-central",
    title: "Closet Central",
    description:
      "Vestidor con isla central en madera y cristal, gabinetes en gris brillo y vitrina iluminada para organizar accesorios con estilo boutique.",
    mainCategory: "Closets",
    subCategory: "Con isla",
    category: "Con isla",
    details: [
      {
        label: "Distribución",
        value:
          "Walk-in en U con isla central, zona de colgado, repisas abiertas y espejo de cuerpo completo.",
      },
      {
        label: "Acabados",
        value:
          "Gris alto brillo en frentes, madera cálida en isla y repisas, y cubierta de cristal con compartimentos.",
      },
      {
        label: "Funcionalidad",
        value:
          "Isla con organizador de accesorios, banca integrada y vitrina de vidrio con repisas iluminadas.",
      },
      {
        label: "Sensación",
        value:
          "Ambiente lujoso y ordenado donde la isla concentra la rutina de arreglo y exhibición.",
      },
    ],
    images: [
      {
        src: "/images/pagina-catalogo/closet-central/imagen-01-closet-hero.jpeg",
        alt: "Closet Central con isla y espejo de cuerpo completo",
        objectFit: "contain",
        hotspots: [
          {
            id: "isla-central",
            label: "Isla central con cristal",
            detail:
              "Módulo en madera con cubierta de vidrio y compartimentos para joyería, relojes o corbatas.",
            top: "62%",
            left: "48%",
          },
          {
            id: "espejo-completo",
            label: "Espejo de cuerpo completo",
            detail:
              "Panel espejado integrado que amplía el espacio y facilita la prueba de prendas.",
            top: "38%",
            left: "82%",
          },
          {
            id: "gabinetes-brillo",
            label: "Gabinetes en gris brillo",
            detail:
              "Frentes de alto brillo sin tirador que aportan profundidad y lectura contemporánea.",
            top: "28%",
            left: "42%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/closet-central/imagen-02-vista-isla.jpeg",
        alt: "Vista general de la isla en Closet Central",
        objectFit: "contain",
        hotspots: [
          {
            id: "banca-integrada",
            label: "Banca integrada",
            detail:
              "Asiento en madera junto a la isla para calzarse o revisar accesorios con comodidad.",
            top: "72%",
            left: "38%",
          },
          {
            id: "colgado-iluminado",
            label: "Zona de colgado con LED",
            detail:
              "Barra con luz bajo repisa que mejora la visibilidad de prendas largas.",
            top: "32%",
            left: "18%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/closet-central/imagen-03-vitrina-iluminada.jpeg",
        alt: "Vitrina iluminada del Closet Central",
        objectFit: "contain",
        hotspots: [
          {
            id: "vitrina-vidrio",
            label: "Vitrina de vidrio",
            detail:
              "Gabinete vertical con repisas en madera y luz LED para exhibir colecciones.",
            top: "35%",
            left: "72%",
          },
          {
            id: "cajonera-gris",
            label: "Cajonera en gris brillo",
            detail:
              "Cuatro cajones amplios bajo módulo central para ropa doblada y complementos.",
            top: "58%",
            left: "52%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/closet-central/imagen-04-zona-colgado.jpeg",
        alt: "Zona de colgado del Closet Central",
        objectFit: "contain",
        hotspots: [
          {
            id: "repisas-madera",
            label: "Repisas en madera",
            detail:
              "Estantes abiertos con iluminación inferior para calzado, bolsos o piezas decorativas.",
            top: "48%",
            left: "22%",
          },
          {
            id: "organizador-isla",
            label: "Organizador en isla",
            detail:
              "Cuadrícula bajo cristal que mantiene accesorios visibles y al alcance.",
            top: "55%",
            left: "55%",
          },
        ],
      },
    ],
  },
  {
    id: "bano-marmol",
    title: "Baño Mármol",
    description:
      "Mueble flotante con cubierta de mármol, ovalín blanco y grifería negra para un baño minimalista con presencia refinada.",
    mainCategory: "Baños",
    subCategory: "Con ovalín",
    category: "Con ovalín",
    details: [
      {
        label: "Distribución",
        value:
          "Mueble suspendido de dos cajones con ovalín sobre cubierta y salpicadero de mármol.",
      },
      {
        label: "Acabados",
        value:
          "Mármol gris veteado, frentes en blanco mate y grifería en negro con acabado mate.",
      },
      {
        label: "Funcionalidad",
        value:
          "Cajonera amplia bajo lavabo y muro revestido en mármol para continuidad visual.",
      },
      {
        label: "Sensación",
        value:
          "Líneas limpias y neutros fríos que aportan calma y sensación de amplitud.",
      },
    ],
    images: [
      {
        src: "/images/pagina-catalogo/bano-marmol/imagen-01-bano-hero.jpeg",
        alt: "Baño Mármol con ovalín y mueble flotante",
        hotspots: [
          {
            id: "ovalin-blanco",
            label: "Ovalín de cerámica blanca",
            detail:
              "Lavabo sobre cubierta con forma redondeada que destaca sobre el mármol.",
            top: "32%",
            left: "48%",
          },
          {
            id: "cubierta-marmol",
            label: "Cubierta y salpicadero de mármol",
            detail:
              "Piedra con vetas suaves que envuelve la zona de lavabo con acabado continuo.",
            top: "48%",
            left: "55%",
          },
          {
            id: "mueble-flotante",
            label: "Mueble flotante de dos cajones",
            detail:
              "Gabinete suspendido sin tiradores que libera el piso y facilita la limpieza.",
            top: "68%",
            left: "42%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/bano-marmol/imagen-02-detalle-ovalin.jpeg",
        alt: "Detalle del ovalín en Baño Mármol",
        hotspots: [
          {
            id: "griferia-negra",
            label: "Grifería monomando en negro",
            detail:
              "Monomando alto con caño plano que contrasta con el mármol y el ovalín.",
            top: "28%",
            left: "52%",
          },
          {
            id: "cajones-push",
            label: "Cajones con apertura oculta",
            detail:
              "Frentes lisos con ranura central para mantener la lectura minimalista.",
            top: "72%",
            left: "38%",
          },
        ],
      },
    ],
  },
  {
    id: "bano-dual",
    title: "Baño Dual",
    description:
      "Mueble con doble ovalín, cubierta de piedra y frentes en madera, con espejo retroiluminado para un baño cálido y funcional.",
    mainCategory: "Baños",
    subCategory: "Con ovalín",
    category: "Con ovalín",
    details: [
      {
        label: "Distribución",
        value:
          "Vanitorio doble con dos ovalines, cajonera lateral y puertas de almacenaje en un solo módulo.",
      },
      {
        label: "Acabados",
        value:
          "Piedra clara en cubierta, madera con veta vertical en frentes y grifería cromada.",
      },
      {
        label: "Iluminación",
        value:
          "Espejo con marco iluminado por LED y luz ambiental que realza la zona de lavabo.",
      },
      {
        label: "Sensación",
        value:
          "Contraste entre piedra, madera y luz cálida que convierte el baño en un espacio acogedor.",
      },
    ],
    images: [
      {
        src: "/images/pagina-catalogo/bano-dual/imagen-01-bano-hero.jpeg",
        alt: "Baño Dual con doble ovalín y espejo iluminado",
        hotspots: [
          {
            id: "doble-ovalin",
            label: "Doble ovalín",
            detail:
              "Dos lavabos sobre cubierta para uso simultáneo con comodidad y simetría.",
            top: "52%",
            left: "50%",
          },
          {
            id: "espejo-led",
            label: "Espejo con luz LED",
            detail:
              "Marco retroiluminado que aporta luz uniforme para el arreglo diario.",
            top: "22%",
            left: "48%",
          },
          {
            id: "mueble-madera",
            label: "Mueble en madera",
            detail:
              "Gabinete con veta vertical, cajones y puertas para toallas y productos.",
            top: "68%",
            left: "45%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/bano-dual/imagen-02-vista-lavabos.jpeg",
        alt: "Vista de lavabos en Baño Dual",
        hotspots: [
          {
            id: "cubierta-piedra",
            label: "Cubierta de piedra",
            detail:
              "Superficie clara con canto grueso y caída lateral tipo waterfall en el módulo.",
            top: "48%",
            left: "55%",
          },
          {
            id: "griferia-cromada",
            label: "Grifería cromada",
            detail:
              "Monomandos altos en acabado cromo que complementan los ovalines blancos.",
            top: "38%",
            left: "38%",
          },
        ],
      },
    ],
  },
  {
    id: "bano-niveo",
    title: "Baño Níveo",
    description:
      "Vanitorio flotante en tono perla con ovalín cerámico, cubierta de mármol y grifería negra para un baño limpio y contemporáneo.",
    mainCategory: "Baños",
    subCategory: "Con ovalín",
    category: "Con ovalín",
    details: [
      {
        label: "Distribución",
        value:
          "Mueble suspendido de dos cajones con ovalín centrado y muro de mármol lateral.",
      },
      {
        label: "Acabados",
        value:
          "Frentes en gris perla mate, mármol claro veteado y grifería monomando en negro.",
      },
      {
        label: "Funcionalidad",
        value:
          "Cajonera doble con tirador oculto y salpicadero bajo para protección de pared.",
      },
      {
        label: "Sensación",
        value:
          "Paleta neutra y líneas rectas que transmiten orden, frescura y amplitud.",
      },
    ],
    images: [
      {
        src: "/images/pagina-catalogo/bano-niveo/imagen-01-bano-hero.jpeg",
        alt: "Baño Níveo con ovalín y vanitorio flotante",
        objectFit: "contain",
        hotspots: [
          {
            id: "ovalin-ceramico",
            label: "Ovalín cerámico",
            detail:
              "Lavabo tipo bowl sobre cubierta con acabado liso y forma circular.",
            top: "30%",
            left: "50%",
          },
          {
            id: "marmol-lateral",
            label: "Revestimiento de mármol",
            detail:
              "Muro y cubierta en piedra clara que unifican la zona de lavabo.",
            top: "45%",
            left: "72%",
          },
          {
            id: "vanitorio-perla",
            label: "Vanitorio en gris perla",
            detail:
              "Gabinete flotante de dos cajones con frentes mate y apertura oculta.",
            top: "65%",
            left: "40%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/bano-niveo/imagen-02-detalle-vanitorio.jpeg",
        alt: "Detalle del vanitorio en Baño Níveo",
        objectFit: "contain",
        hotspots: [
          {
            id: "monomando-negro",
            label: "Monomando negro",
            detail:
              "Grifería alta con caño plano que aporta contraste sobre el mármol claro.",
            top: "26%",
            left: "48%",
          },
          {
            id: "ranura-apertura",
            label: "Ranura de apertura",
            detail:
              "Sistema gola entre cajones para mantener frentes lisos y minimalistas.",
            top: "70%",
            left: "35%",
          },
        ],
      },
    ],
  },
  {
    id: "bano-piedra-madera",
    title: "Baño Piedra & Madera",
    description:
      "Mueble con ovalín sobre cubierta de piedra, frente en madera y canto cascada lateral para un baño cálido con carácter natural.",
    mainCategory: "Baños",
    subCategory: "Con ovalín",
    category: "Con ovalín",
    details: [
      {
        label: "Distribución",
        value:
          "Vanitorio con ovalín sobre cubierta, puerta de almacenaje y revestimiento de piedra en cascada.",
      },
      {
        label: "Acabados",
        value:
          "Piedra clara en cubierta y lateral, frente en madera con veta vertical y grifería cromada.",
      },
      {
        label: "Funcionalidad",
        value:
          "Ovalín cerámico sobre cubierta y módulo cerrado para toallas y productos de baño.",
      },
      {
        label: "Sensación",
        value:
          "Contraste entre piedra, madera y tonos tierra que aportan calidez y textura al espacio.",
      },
    ],
    images: [
      {
        src: "/images/pagina-catalogo/bano-piedra-madera/imagen-01-bano-hero.jpeg",
        alt: "Baño Piedra & Madera con ovalín",
        objectFit: "contain",
        hotspots: [
          {
            id: "ovalin-sobre-piedra",
            label: "Ovalín sobre piedra",
            detail:
              "Lavabo tipo bowl blanco sobre cubierta en tono crema con grifería alta cromada.",
            top: "32%",
            left: "52%",
          },
          {
            id: "canto-cascada-piedra",
            label: "Canto cascada en piedra",
            detail:
              "Revestimiento continuo que baja por el lateral del mueble con acabado uniforme.",
            top: "55%",
            left: "28%",
          },
          {
            id: "puerta-madera",
            label: "Puerta en madera",
            detail:
              "Frente con veta oscura que contrasta con la piedra clara del vanitorio.",
            top: "62%",
            left: "58%",
          },
        ],
      },
    ],
  },
  {
    id: "bano-doble-rustico",
    title: "Baño Doble Rústico",
    description:
      "Vanitorio doble en madera con borde natural, dos ovalines blancos y repisa abierta inferior para un baño con carácter artesanal.",
    mainCategory: "Baños",
    subCategory: "Con ovalín",
    category: "Con ovalín",
    details: [
      {
        label: "Distribución",
        value:
          "Mueble doble con dos ovalines sobre cubierta, soportes laterales y repisa inferior abierta.",
      },
      {
        label: "Acabados",
        value:
          "Madera con borde vivo y tono oscuro, ovalines cerámicos blancos y grifería cromada.",
      },
      {
        label: "Funcionalidad",
        value:
          "Dos lavabos independientes y espacio bajo cubierta para toallas o canastos.",
      },
      {
        label: "Sensación",
        value:
          "Estilo rústico-contemporáneo que destaca la madera natural frente al muro de loseta blanca.",
      },
    ],
    images: [
      {
        src: "/images/pagina-catalogo/bano-doble-rustico/imagen-01-bano-hero.jpeg",
        alt: "Baño Doble Rústico con dos ovalines",
        hotspots: [
          {
            id: "doble-ovalin-rustico",
            label: "Doble ovalín",
            detail:
              "Dos lavabos tipo bowl sobre cubierta de madera para uso simultáneo.",
            top: "28%",
            left: "50%",
          },
          {
            id: "borde-vivo",
            label: "Cubierta con borde vivo",
            detail:
              "Madera maciza con canto natural que aporta textura y carácter artesanal.",
            top: "38%",
            left: "48%",
          },
          {
            id: "repisa-inferior",
            label: "Repisa inferior abierta",
            detail:
              "Segundo nivel en madera para almacenamiento visible bajo el vanitorio.",
            top: "72%",
            left: "50%",
          },
        ],
      },
    ],
  },
  {
    id: "bano-geometrico",
    title: "Baño Geométrico",
    description:
      "Vanitorio flotante blanco con ovalín rectangular, espejo circular con luz LED y muro de loseta geométrica en blanco y negro.",
    mainCategory: "Baños",
    subCategory: "Con ovalín",
    category: "Con ovalín",
    details: [
      {
        label: "Distribución",
        value:
          "Mueble suspendido con cajones y puertas, ovalín sobre cubierta y espejo circular central.",
      },
      {
        label: "Acabados",
        value:
          "Frentes blancos mate, loseta con patrón geométrico, grifería cromada y accesorios negros.",
      },
      {
        label: "Iluminación",
        value:
          "Espejo con aro LED perimetral que ilumina la zona de lavabo con luz uniforme.",
      },
      {
        label: "Sensación",
        value:
          "Contraste gráfico entre el muro de patrón y el mueble limpio, con lectura moderna y expresiva.",
      },
    ],
    images: [
      {
        src: "/images/pagina-catalogo/bano-geometrico/imagen-01-bano-hero.jpeg",
        alt: "Baño Geométrico con ovalín y espejo LED",
        objectFit: "contain",
        hotspots: [
          {
            id: "ovalin-rectangular",
            label: "Ovalín rectangular",
            detail:
              "Lavabo sobre cubierta con forma rectangular y acabado blanco liso.",
            top: "52%",
            left: "48%",
          },
          {
            id: "espejo-led",
            label: "Espejo con luz LED",
            detail:
              "Espejo circular con iluminación perimetral integrada para el arreglo diario.",
            top: "22%",
            left: "50%",
          },
          {
            id: "muro-geometrico",
            label: "Muro geométrico",
            detail:
              "Loseta en blanco y negro con patrón de círculos que define el carácter del baño.",
            top: "40%",
            left: "55%",
          },
        ],
      },
    ],
  },
  {
    id: "bano-cantera",
    title: "Baño Cantera",
    description:
      "Vanitorio en madera con cubierta de piedra, doble lavabo integrado y zona de tocador con espejo enmarcado para un baño amplio y elegante.",
    mainCategory: "Baños",
    subCategory: "Con piedras",
    category: "Con piedras",
    details: [
      {
        label: "Distribución",
        value:
          "Módulo lineal con doble lavabo, cajonera y tocador bajo con banco integrado.",
      },
      {
        label: "Acabados",
        value:
          "Piedra blanca vetada en cubierta, madera cálida en mueble y marco de espejo.",
      },
      {
        label: "Funcionalidad",
        value:
          "Lavabos bajo cubierta, cajones con tiradores metálicos y repisa inferior oculta.",
      },
      {
        label: "Sensación",
        value:
          "Combinación de piedra y madera que aporta calidez, orden y presencia contemporánea.",
      },
    ],
    images: [
      {
        src: "/images/pagina-catalogo/bano-cantera/imagen-01-bano-hero.jpeg",
        alt: "Baño Cantera con cubierta de piedra y doble lavabo",
        hotspots: [
          {
            id: "cubierta-piedra",
            label: "Cubierta de piedra",
            detail:
              "Superficie gruesa en tono blanco con vetas grises y lavabos rectangulares integrados.",
            top: "42%",
            left: "38%",
          },
          {
            id: "espejo-enmarcado",
            label: "Espejo enmarcado en madera",
            detail:
              "Panel amplio con marco del mismo tono del mueble que unifica la pared.",
            top: "22%",
            left: "48%",
          },
          {
            id: "zona-tocador",
            label: "Zona de tocador",
            detail:
              "Superficie a menor altura con banco de madera para maquillaje o arreglo personal.",
            top: "55%",
            left: "78%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/bano-cantera/imagen-02-vista-general.jpeg",
        alt: "Vista general del Baño Cantera",
        hotspots: [
          {
            id: "mueble-madera",
            label: "Mueble en madera",
            detail:
              "Vanitorio flotante con cajones y puertas en acabado natural con tiradores horizontales.",
            top: "58%",
            left: "35%",
          },
          {
            id: "muro-marmol",
            label: "Muro tipo mármol",
            detail:
              "Revestimiento claro con veta suave que complementa la cubierta de piedra.",
            top: "30%",
            left: "55%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/bano-cantera/imagen-03-detalle-tocador.jpeg",
        alt: "Detalle del tocador en Baño Cantera",
        hotspots: [
          {
            id: "lavabo-integrado",
            label: "Lavabo bajo cubierta",
            detail:
              "Instalación undermount que mantiene continuidad en la superficie de piedra.",
            top: "38%",
            left: "28%",
          },
          {
            id: "banco-madera",
            label: "Banco en madera",
            detail:
              "Asiento cuadrado del mismo material que el mueble, integrado bajo el tocador.",
            top: "72%",
            left: "72%",
          },
        ],
      },
    ],
  },
  {
    id: "bano-travertino",
    title: "Baño Travertino",
    description:
      "Mueble flotante en madera clara con cubierta de travertino, lavabo integrado en piedra y grifería negra para un baño cálido y natural.",
    mainCategory: "Baños",
    subCategory: "Con piedras",
    category: "Con piedras",
    details: [
      {
        label: "Distribución",
        value:
          "Vanitorio suspendido de tres frentes con lavabo tallado en la misma cubierta de piedra.",
      },
      {
        label: "Acabados",
        value:
          "Travertino beige con veta horizontal, madera clara en frentes y grifería mate en negro.",
      },
      {
        label: "Funcionalidad",
        value:
          "Salpicadero y regatón lateral en piedra continua para protección y acabado uniforme.",
      },
      {
        label: "Sensación",
        value:
          "Tonos tierra y textura natural que aportan calidez y carácter orgánico al espacio.",
      },
    ],
    images: [
      {
        src: "/images/pagina-catalogo/bano-travertino/imagen-01-bano-hero.jpeg",
        alt: "Baño Travertino con lavabo integrado en piedra",
        hotspots: [
          {
            id: "piedra-travertino",
            label: "Cubierta de travertino",
            detail:
              "Loseta gruesa con vetas horizontales en tonos crema y marrón claro.",
            top: "38%",
            left: "50%",
          },
          {
            id: "lavabo-tallado",
            label: "Lavabo integrado en piedra",
            detail:
              "Cubeta rectangular tallada en la misma pieza para continuidad total.",
            top: "42%",
            left: "48%",
          },
          {
            id: "mueble-flotante-madera",
            label: "Mueble flotante en madera",
            detail:
              "Tres frentes en madera clara sin tirador, suspendidos sobre el piso.",
            top: "68%",
            left: "45%",
          },
          {
            id: "griferia-negra-travertino",
            label: "Grifería negra",
            detail:
              "Monomando mate que contrasta con la piedra cálida y la madera.",
            top: "32%",
            left: "52%",
          },
        ],
      },
    ],
  },
  {
    id: "bano-piedra-integrada",
    title: "Baño Piedra Integrada",
    description:
      "Vanitorio flotante en madera oscura con lavabo tallado en piedra travertino y espejo enmarcado para un baño cálido y elegante.",
    mainCategory: "Baños",
    subCategory: "Con piedras",
    category: "Con piedras",
    details: [
      {
        label: "Distribución",
        value:
          "Cubierta de piedra con lavabo integrado, mueble suspendido con cajones y repisa abierta en L.",
      },
      {
        label: "Acabados",
        value:
          "Travertino beige veteado, madera oscura en mueble y marco de espejo, tiradores metálicos.",
      },
      {
        label: "Funcionalidad",
        value:
          "Lavabo tallado en la misma loseta y almacenamiento mixto cerrado y abierto bajo cubierta.",
      },
      {
        label: "Sensación",
        value:
          "Combinación de piedra natural y madera profunda que aporta calidez y presencia sólida.",
      },
    ],
    images: [
      {
        src: "/images/pagina-catalogo/bano-integrado-piedra/imagen-01-bano-hero.jpeg",
        alt: "Baño Piedra Integrada con lavabo en travertino",
        objectFit: "contain",
        hotspots: [
          {
            id: "lavabo-tallado-travertino",
            label: "Lavabo integrado en travertino",
            detail:
              "Cubeta rectangular tallada en loseta gruesa con vetas en tono crema.",
            top: "38%",
            left: "50%",
          },
          {
            id: "mueble-madera-oscura",
            label: "Mueble en madera oscura",
            detail:
              "Vanitorio flotante con cajones y repisa abierta en el mismo tono del espejo.",
            top: "58%",
            left: "48%",
          },
          {
            id: "espejo-enmarcado",
            label: "Espejo enmarcado",
            detail:
              "Marco grueso en madera que unifica la zona de lavabo con el mueble inferior.",
            top: "18%",
            left: "52%",
          },
        ],
      },
    ],
  },
  {
    id: "oficina-ejecutiva",
    title: "Oficina Ejecutiva",
    description:
      "Escritorio a medida en blanco con lambrín de madera y repisas flotantes para un espacio de trabajo limpio, profesional y bien organizado.",
    mainCategory: "Muebles a medida",
    subCategory: "Oficina",
    category: "Oficina",
    details: [
      {
        label: "Distribución",
        value:
          "Escritorio amplio con panel lateral, zona de trabajo central y repisas sobre el muro.",
      },
      {
        label: "Acabados",
        value:
          "Laminado blanco mate en escritorio, lambrín vertical en madera y repisas del mismo tono.",
      },
      {
        label: "Funcionalidad",
        value:
          "Superficie continua para equipo de cómputo y repisas para documentos o certificaciones.",
      },
      {
        label: "Sensación",
        value:
          "Ambiente luminoso y sobrio que transmite orden, enfoque y presencia profesional.",
      },
    ],
    images: [
      {
        src: "/images/pagina-catalogo/oficina-ejecutiva/imagen-01-oficina-hero.jpeg",
        alt: "Oficina Ejecutiva con escritorio y lambrín de madera",
        hotspots: [
          {
            id: "escritorio-blanco",
            label: "Escritorio a medida",
            detail:
              "Módulo en blanco con cubierta gruesa y panel lateral para trabajo diario.",
            top: "58%",
            left: "48%",
          },
          {
            id: "lambrin-madera",
            label: "Lambrín de madera",
            detail:
              "Revestimiento vertical tipo tambour que aporta textura y calidez al fondo.",
            top: "35%",
            left: "62%",
          },
          {
            id: "repisas-flotantes",
            label: "Repisas flotantes",
            detail:
              "Dos niveles abiertos para marcos, libros o elementos de consulta profesional.",
            top: "18%",
            left: "55%",
          },
        ],
      },
    ],
  },
  {
    id: "isla-monolitica",
    title: "Isla Monolítica",
    description:
      "Isla en blanco con canto cascada, cajonera integrada y vitrocerámica empotrada; pieza especial para cocina o espacios con presencia escultórica.",
    mainCategory: "Muebles a medida",
    subCategory: "Especiales",
    category: "Especiales",
    details: [
      {
        label: "Distribución",
        value:
          "Isla con cajonera, puertas de almacenaje y zona de cocción con panel de vitrocerámica integrado.",
      },
      {
        label: "Acabados",
        value:
          "Laminado blanco mate con perfil gola, cubierta gruesa y canto cascada continuo.",
      },
      {
        label: "Funcionalidad",
        value:
          "Vitrocerámica empotrada en cubierta y módulos cerrados para utensilios y almacenaje.",
      },
      {
        label: "Sensación",
        value:
          "Volumen limpio y monolítico que funciona como isla protagonista en cocina o proyecto especial.",
      },
    ],
    images: [
      {
        src: "/images/pagina-catalogo/isla-monolitica/imagen-01-modulo-frontal.jpeg",
        alt: "Isla Monolítica con cajonera y vitrocerámica integrada",
        hotspots: [
          {
            id: "cajonera-gola",
            label: "Cajonera con perfil gola",
            detail:
              "Frentes amplios sin tirador con apertura oculta para organización interna.",
            top: "55%",
            left: "45%",
          },
          {
            id: "vitroceramica-integrada",
            label: "Vitrocerámica integrada",
            detail:
              "Superficie negra empotrada en cubierta para cocción en la isla.",
            top: "32%",
            left: "50%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/isla-monolitica/imagen-02-vista-lateral.jpeg",
        alt: "Vista lateral de la Isla Monolítica",
        hotspots: [
          {
            id: "canto-cascada",
            label: "Canto cascada",
            detail:
              "La cubierta cae en continuidad hasta el piso, reforzando la lectura monolítica.",
            top: "48%",
            left: "28%",
          },
          {
            id: "volumen-continuo",
            label: "Volumen continuo",
            detail:
              "Bloque único en blanco que define la isla sin interrupciones visuales.",
            top: "42%",
            left: "55%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/isla-monolitica/imagen-03-detalle-cubierta.jpeg",
        alt: "Detalle de cubierta en Isla Monolítica",
        hotspots: [
          {
            id: "puertas-almacenaje",
            label: "Puertas de almacenaje",
            detail:
              "Cuatro módulos cerrados con frentes lisos para ollas, vajilla y despensa.",
            top: "52%",
            left: "38%",
          },
          {
            id: "zona-preparacion",
            label: "Zona de preparación",
            detail:
              "Espacio abierto bajo cubierta para circulación y uso cómodo en la isla.",
            top: "58%",
            left: "72%",
          },
        ],
      },
    ],
  },
  {
    id: "isla-movil-granito",
    title: "Isla Móvil con Granito",
    description:
      "Isla de cocina sobre ruedas con cubierta de granito, extensión plegable y cajones de extracción total para espacios flexibles y funcionales.",
    mainCategory: "Muebles a medida",
    subCategory: "Especiales",
    category: "Especiales",
    details: [
      {
        label: "Distribución",
        value:
          "Isla móvil con cajonera, puerta lateral y mesa extensible plegable en un extremo.",
      },
      {
        label: "Acabados",
        value:
          "Melamina en tono madera clara, cubierta de granito pulido y rieles metálicos visibles.",
      },
      {
        label: "Funcionalidad",
        value:
          "Ruedas para reubicar, extensión abatible para barra y cajones de apertura completa.",
      },
      {
        label: "Sensación",
        value:
          "Pieza versátil que adapta la cocina al uso diario o a reuniones informales.",
      },
    ],
    images: [
      {
        src: "/images/pagina-catalogo/isla-movil-granito/imagen-01-isla-hero.jpeg",
        alt: "Isla Móvil con Granito y extensión plegable",
        hotspots: [
          {
            id: "cubierta-granito-isla",
            label: "Cubierta de granito",
            detail:
              "Loseta pulida con vetas en gris y negro para preparación y resistencia al uso.",
            top: "28%",
            left: "48%",
          },
          {
            id: "extension-plegable",
            label: "Extensión plegable",
            detail:
              "Tablero abatible con soporte metálico para barra o zona de apoyo extra.",
            top: "42%",
            left: "18%",
          },
          {
            id: "ruedas-moviles",
            label: "Base sobre ruedas",
            detail:
              "Castores que permiten mover la isla según el flujo de la cocina.",
            top: "78%",
            left: "35%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/isla-movil-granito/imagen-02-detalle-cajones.jpeg",
        alt: "Detalle de cajones en Isla Móvil con Granito",
        hotspots: [
          {
            id: "cajones-extraccion",
            label: "Cajones de extracción total",
            detail:
              "Cuatro cajones profundos con rieles telescópicos para acceso completo al interior.",
            top: "50%",
            left: "52%",
          },
          {
            id: "interior-blanco",
            label: "Interior en blanco",
            detail:
              "Acabado claro en el interior de cajones para ollas, utensilios y despensa.",
            top: "45%",
            left: "42%",
          },
        ],
      },
    ],
  },
  {
    id: "consultorio-dental",
    title: "Consultorio Dental",
    description:
      "Mobiliario clínico en blanco brillo con cubierta tipo mármol, autoclave empotrado y tarja integrada para un consultorio ordenado y funcional.",
    mainCategory: "Muebles a medida",
    subCategory: "Consultorio",
    category: "Consultorio",
    details: [
      {
        label: "Distribución",
        value:
          "Módulo en esquina con alacenas superiores, cajonera, zona de esterilización y tarja lateral.",
      },
      {
        label: "Acabados",
        value:
          "Frentes en blanco alto brillo, cubierta y salpicadero tipo mármol y grifería cromada.",
      },
      {
        label: "Funcionalidad",
        value:
          "Autoclave integrado al mueble, cajones amplios y tarja circular para flujo clínico.",
      },
      {
        label: "Sensación",
        value:
          "Ambiente limpio y profesional que integra equipamiento médico sin recargar el espacio.",
      },
    ],
    images: [
      {
        src: "/images/pagina-catalogo/consultorio-dental/imagen-01-consultorio-hero.jpeg",
        alt: "Consultorio Dental con mobiliario integrado",
        objectFit: "contain",
        hotspots: [
          {
            id: "alacenas-superiores",
            label: "Alacenas superiores",
            detail:
              "Módulos de piso a techo en blanco brillo para insumos y material clínico.",
            top: "22%",
            left: "48%",
          },
          {
            id: "autoclave-integrado",
            label: "Autoclave empotrado",
            detail:
              "Esterilizador integrado en el mueble para mantener continuidad visual.",
            top: "52%",
            left: "42%",
          },
          {
            id: "tarja-clinica",
            label: "Tarja integrada",
            detail:
              "Lavabo circular bajo cubierta con grifería cromada para higiene del consultorio.",
            top: "48%",
            left: "72%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/consultorio-dental/imagen-02-vista-clinica.jpeg",
        alt: "Vista clínica del Consultorio Dental",
        objectFit: "contain",
        hotspots: [
          {
            id: "cubierta-marmol-clinica",
            label: "Cubierta tipo mármol",
            detail:
              "Superficie clara con veta gris resistente al uso diario en consultorio.",
            top: "38%",
            left: "55%",
          },
          {
            id: "cajonera-clinica",
            label: "Cajonera multifunción",
            detail:
              "Cajones de distintos tamaños para instrumentos, toallas y material de trabajo.",
            top: "58%",
            left: "35%",
          },
        ],
      },
    ],
  },
  {
    id: "centro-lare-integrado",
    title: "Centro con Lare",
    description:
      "Mueble de entretenimiento en madera con nicho para TV, repisa en piedra negra y chimenea eléctrica integrada para calidez en la sala.",
    mainCategory: "Muebles a medida",
    subCategory: "Centro de entretenimiento",
    category: "Centro de entretenimiento",
    details: [
      {
        label: "Distribución",
        value:
          "Módulo vertical con nicho superior para pantalla, repisa intermedia y lare en la base.",
      },
      {
        label: "Acabados",
        value:
          "Madera con veta natural, cubierta en piedra negra pulida y marco metálico en chimenea.",
      },
      {
        label: "Funcionalidad",
        value:
          "Contacto eléctrico en nicho para TV y lare empotrado con piedras decorativas.",
      },
      {
        label: "Sensación",
        value:
          "Pieza arquitectónica que combina entretenimiento y ambiente acogedor en un solo módulo.",
      },
    ],
    images: [
      {
        src: "/images/pagina-catalogo/centro-lare-integrado/imagen-01-centro-hero.jpeg",
        alt: "Centro con Lare integrado y nicho para TV",
        hotspots: [
          {
            id: "nicho-tv",
            label: "Nicho para TV",
            detail:
              "Espacio recessado con marco en madera y toma eléctrica para pantalla plana.",
            top: "28%",
            left: "50%",
          },
          {
            id: "repisa-piedra",
            label: "Repisa en piedra negra",
            detail:
              "Cubierta delgada que separa la zona de TV y la chimenea con contraste elegante.",
            top: "52%",
            left: "48%",
          },
          {
            id: "lare-integrado",
            label: "Lare eléctrico integrado",
            detail:
              "Inserto de acero con piedras blancas decorativas para calidez visual sin humo.",
            top: "72%",
            left: "50%",
          },
        ],
      },
    ],
  },
  {
    id: "centro-muro-lambrin",
    title: "Centro Muro Lambrín",
    description:
      "Muro de entretenimiento a medida con TV sobre lambrín vertical, mueble flotante bicolor y paneles en blanco y mármol negro.",
    mainCategory: "Muebles a medida",
    subCategory: "Centro de entretenimiento",
    category: "Centro de entretenimiento",
    details: [
      {
        label: "Distribución",
        value:
          "Módulo mural con TV central, cubos abiertos laterales, mueble flotante y paneles decorativos.",
      },
      {
        label: "Acabados",
        value:
          "Negro mate en marco superior, lambrín claro detrás de TV, madera gris en cajones y panel mármol.",
      },
      {
        label: "Iluminación",
        value:
          "Spots empotrados bajo el marco superior para realzar la zona audiovisual y los paneles.",
      },
      {
        label: "Sensación",
        value:
          "Composición arquitectónica de alto contraste que integra pantalla, almacenaje y decoración.",
      },
    ],
    images: [
      {
        src: "/images/pagina-catalogo/centro-muro-lambrin/imagen-01-centro-hero.jpeg",
        alt: "Centro Muro Lambrín con TV y mueble flotante",
        hotspots: [
          {
            id: "lambrin-vertical",
            label: "Panel de lambrín vertical",
            detail:
              "Revestimiento tipo tambour detrás de la TV que aporta textura y calidez visual.",
            top: "38%",
            left: "42%",
          },
          {
            id: "mueble-flotante",
            label: "Mueble flotante bicolor",
            detail:
              "Base suspendida con frentes en madera clara y marco negro para equipos y almacenaje.",
            top: "68%",
            left: "35%",
          },
          {
            id: "cubos-exhibicion",
            label: "Cubos de exhibición",
            detail:
              "Repisas abiertas en blanco para decoración, libros o elementos personales.",
            top: "45%",
            left: "18%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/centro-muro-lambrin/imagen-02-vista-general.jpeg",
        alt: "Vista general del Centro Muro Lambrín",
        hotspots: [
          {
            id: "marco-superior",
            label: "Marco superior con luz",
            detail:
              "Sobre módulo negro continuo con iluminación empotrada de piso a techo.",
            top: "12%",
            left: "50%",
          },
          {
            id: "panel-marmol",
            label: "Panel tipo mármol negro",
            detail:
              "Superficie de alto brillo con veta blanca que cierra la composición lateral.",
            top: "48%",
            left: "78%",
          },
        ],
      },
    ],
  },
  {
    id: "centro-bar-integrado",
    title: "Centro Bar Integrado",
    description:
      "Módulo mural con nicho de bar, cubierta negra, microondas empotrado e iluminación LED para complementar el área de entretenimiento.",
    mainCategory: "Muebles a medida",
    subCategory: "Centro de entretenimiento",
    category: "Centro de entretenimiento",
    details: [
      {
        label: "Distribución",
        value:
          "Mueble de piso a techo con gabinetes superiores, nicho central de trabajo y cajonera inferior.",
      },
      {
        label: "Acabados",
        value:
          "Paneles en gris mate, marco en madera clara, cubierta negra y salpicadero de alto brillo.",
      },
      {
        label: "Funcionalidad",
        value:
          "Microondas integrado, contactos en nicho y cuatro cajones amplios para vajilla y consumibles.",
      },
      {
        label: "Sensación",
        value:
          "Estación de café o bar que aporta funcionalidad y ambiente lounge al espacio social.",
      },
    ],
    images: [
      {
        src: "/images/pagina-catalogo/centro-bar-integrado/imagen-01-centro-hero.jpeg",
        alt: "Centro Bar Integrado con iluminación LED",
        hotspots: [
          {
            id: "nicho-bar",
            label: "Nicho de bar",
            detail:
              "Espacio recessado con cubierta negra y tomas eléctricas para cafetera o electrodomésticos.",
            top: "52%",
            left: "50%",
          },
          {
            id: "luz-led-bar",
            label: "Iluminación LED",
            detail:
              "Luz bajo repisa y spots en el nicho que crean ambiente y visibilidad en la zona de trabajo.",
            top: "38%",
            left: "48%",
          },
          {
            id: "microondas-empotrado",
            label: "Microondas empotrado",
            detail:
              "Electrodoméstico integrado en el módulo superior para uso rápido en el área social.",
            top: "32%",
            left: "38%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/centro-bar-integrado/imagen-02-vista-general.jpeg",
        alt: "Vista general del Centro Bar Integrado",
        hotspots: [
          {
            id: "marco-madera",
            label: "Marco en madera",
            detail:
              "Perfil continuo en tono madera que enmarca cada módulo y suaviza el gris mate.",
            top: "45%",
            left: "82%",
          },
          {
            id: "cajonera-cuadruple",
            label: "Cajonera de cuatro cajones",
            detail:
              "Almacenamiento amplio con tiradores horizontales en madera para organización.",
            top: "72%",
            left: "50%",
          },
        ],
      },
    ],
  },
  {
    id: "centro-marmol-lamas",
    title: "Centro Mármol & Lamas",
    description:
      "Muro con lamas de madera oscura, panel central en mármol negro para TV y consola flotante en madera natural para la sala.",
    mainCategory: "Muebles a medida",
    subCategory: "Centro de entretenimiento",
    category: "Centro de entretenimiento",
    details: [
      {
        label: "Distribución",
        value:
          "Muro decorativo con TV sobre panel de mármol y consola flotante con repisa y almacenaje.",
      },
      {
        label: "Acabados",
        value:
          "Lamas verticales en madera oscura, panel mármol negro veteado y consola en madera rústica.",
      },
      {
        label: "Funcionalidad",
        value:
          "Repisa superior para equipos audiovisuales y módulo inferior con cajones ocultos.",
      },
      {
        label: "Sensación",
        value:
          "Contraste entre textura, piedra y madera que convierte la pared en punto focal de la sala.",
      },
    ],
    images: [
      {
        src: "/images/pagina-catalogo/centro-marmol-lamas/imagen-01-centro-hero.jpeg",
        alt: "Centro Mármol & Lamas con TV y consola flotante",
        hotspots: [
          {
            id: "lamas-oscuro",
            label: "Muro de lamas oscuras",
            detail:
              "Revestimiento vertical tipo tambour que enmarca el panel central con profundidad.",
            top: "42%",
            left: "50%",
          },
          {
            id: "panel-marmol-tv",
            label: "Panel de mármol negro",
            detail:
              "Superficie pulida con vetas blancas donde se monta la pantalla plana.",
            top: "32%",
            left: "48%",
          },
          {
            id: "consola-flotante",
            label: "Consola flotante",
            detail:
              "Mueble suspendido en madera natural con repisa y cajones para equipos y controles.",
            top: "72%",
            left: "45%",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/centro-marmol-lamas/imagen-02-vista-sala.jpeg",
        alt: "Vista del Centro Mármol & Lamas en sala",
        hotspots: [
          {
            id: "zona-tv",
            label: "Zona audiovisual",
            detail:
              "Composición centrada en la TV con acceso cómodo desde el mobiliario de la sala.",
            top: "35%",
            left: "52%",
          },
          {
            id: "madera-rustica",
            label: "Acabado en madera rústica",
            detail:
              "Veta variada en la consola que aporta calidez frente al mármol y las lamas.",
            top: "68%",
            left: "42%",
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
