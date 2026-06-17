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
      "Cocina en L con península, alacenas blancas en alto brillo, módulos en gris mate, cubierta de cuarzo y lambrín de madera con iluminación LED integrada.",
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
            label: "Cuarzos",
            top: "83%",
            left: "57%",
            imageSrc: "/images/pagina-catalogo/terra-clara/hotspot-cuarzos.png",
            imageAlt: "Cuarzo blanco con vetas grises",
          },
          {
            id: "lamparas-ambientales",
            label: "Lambrin",
            top: "68%",
            left: "15%",
            imageSrc:
              "/images/pagina-catalogo/terra-clara/hotspot-lambrin.png",
            imageAlt: "Lambrín vertical en madera con listones",
          },
          {
            id: "alacenas-blancas",
            label: "Alto brillo",
            top: "41%",
            left: "40%",
            imageSrc:
              "/images/pagina-catalogo/terra-clara/hotspot-alto-brillo.png",
            imageAlt: "Melamina blanca en acabado alto brillo",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/terra-clara/imagen-02-render-principal.jpg",
        alt: "Render de isla minimalista",
      },
      {
        src: "/images/pagina-catalogo/terra-clara/imagen-03-render-secundario.jpg",
        alt: "Render de detalles minimalistas",
      },
      {
        src: "/images/pagina-catalogo/terra-clara/imagen-04-galeria.jpg",
        alt: "Vista amplia de cocina minimalista",
      },
    ],
  },
  {
    id: "isla-lumina",
    title: "Residencial con isla",
    description:
      "Cocina con isla central en piedra oscura, madera y melamina supermate, vitrina de cristal con marco de aluminio, iluminación LED y módulo de vinos con granito y parrilla.",
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
            label: "Melamina supermate",
            top: "39%",
            left: "53%",
            imageSrc:
              "/images/pagina-catalogo/lumina-central/hotspot-melamina-supermate.png",
            imageAlt: "Melamina supermate en acabado negro",
          },
          {
            id: "barra-vinos",
            label: "Puerta de cristal con marco de aluminio",
            top: "52%",
            left: "94%",
            imageSrc:
              "/images/pagina-catalogo/lumina-central/hotspot-puerta-cristal-aluminio.png",
            imageAlt: "Puerta de cristal con marco de aluminio e iluminación interior",
          },
          {
            id: "alacena-nogal",
            label: "Iluminación LED",
            top: "28%",
            left: "21%",
            imageSrc:
              "/images/pagina-catalogo/lumina-central/hotspot-iluminacion-led.png",
            imageAlt: "Iluminación LED empotrada bajo sofito de madera",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/lumina-central/imagen-02-isla-real.jpeg",
        alt: "Isla con cubierta de granito y parrilla de gas",
      },
      {
        src: "/images/pagina-catalogo/lumina-central/imagen-03-vitrina-vinos.jpeg",
        alt: "Módulo de vinos con repisas iluminadas y vitrina de cristal",
      },
      {
        src: "/images/pagina-catalogo/lumina-central/imagen-04-detalle-acabados.jpg",
        alt: "Detalle de acabados en isla central",
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
            label: "Melaminas en colores lisos",
            top: "18%",
            left: "84%",
            imageSrc:
              "/images/pagina-catalogo/atelier-clasico/hotspot-acabados-materiales.png",
            imageAlt: "Paleta de acabados y texturas para alacenas",
          },
          {
            id: "griferia-dorada",
            label: "Melamina con textura y acabado de madera",
            top: "39%",
            left: "46%",
            imageSrc:
              "/images/pagina-catalogo/atelier-clasico/hotspot-melamina-madera.png",
            imageAlt: "Melaminas con textura y acabado de madera",
          },
          {
            id: "encimera-marmol",
            label: "Granito",
            top: "78%",
            left: "68%",
            imageSrc:
              "/images/pagina-catalogo/atelier-clasico/hotspot-granito.png",
            imageAlt: "Textura de granito negro",
          },
        ],
      },
      {
        src: "/images/pagina-catalogo/atelier-clasico/imagen-02-cocina-real.jpeg",
        alt: "Cocina Atardecer con isla y vista al atardecer",
      },
      {
        src: "/images/pagina-catalogo/atelier-clasico/imagen-03-render-materiales.jpg",
        alt: "Render de materiales clásicos",
      },
      {
        src: "/images/pagina-catalogo/atelier-clasico/imagen-04-vista-general.jpg",
        alt: "Vista general de cocina clásica",
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
      },
      {
        src: "/images/pagina-catalogo/titanium/imagen-02-render-zona-coccion.jpg",
        alt: "Zona de cocción de cocina Titanium",
      },
      {
        src: "/images/pagina-catalogo/titanium/imagen-03-detalle-tarja.jpg",
        alt: "Detalle de tarja en cocina Titanium",
      },
      {
        src: "/images/pagina-catalogo/titanium/imagen-04-vista-general.jpg",
        alt: "Vista general de cocina Titanium en U",
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
      },
      {
        src: "/images/pagina-catalogo/cocina-inteligente/imagen-02-render-isla.jpg",
        alt: "Isla central de cocina inteligente",
      },
      {
        src: "/images/pagina-catalogo/cocina-inteligente/imagen-03-torre-inteligente.jpg",
        alt: "Torre inteligente con pantalla integrada",
      },
      {
        src: "/images/pagina-catalogo/cocina-inteligente/imagen-04-zona-coccion.jpg",
        alt: "Zona de cocción de cocina inteligente",
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
      },
      {
        src: "/images/pagina-catalogo/vestidor-sereno/imagen-02-vista-general.jpeg",
        alt: "Vista general del walk-in Vestidor Sereno",
      },
      {
        src: "/images/pagina-catalogo/vestidor-sereno/imagen-03-tocador-integrado.jpeg",
        alt: "Tocador integrado en Vestidor Sereno",
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
      },
      {
        src: "/images/pagina-catalogo/vestidor-nogal/imagen-02-detalle-iluminacion.jpeg",
        alt: "Detalle de cajoneras y luz en Vestidor Nogal",
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
      },
      {
        src: "/images/pagina-catalogo/closet-bicolor/imagen-02-detalle-central.jpeg",
        alt: "Detalle del nicho central en Closet Bicolor",
        objectFit: "contain",
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
      },
      {
        src: "/images/pagina-catalogo/closet-roble/imagen-02-interior-organizado.jpeg",
        alt: "Interior organizado del Closet Roble",
        objectFit: "contain",
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
      },
      {
        src: "/images/pagina-catalogo/closet-grafito/imagen-02-repisas-decorativas.jpeg",
        alt: "Detalle de cajonera y repisas en Closet Grafito",
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
      },
      {
        src: "/images/pagina-catalogo/closet-flotante/imagen-02-vista-lateral.jpeg",
        alt: "Vista frontal del Closet Flotante",
        objectFit: "contain",
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
      },
      {
        src: "/images/pagina-catalogo/closet-ebano/imagen-02-vista-esquina.jpeg",
        alt: "Vista de esquina del Closet Ébano",
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
      },
      {
        src: "/images/pagina-catalogo/closet-luminoso/imagen-02-puertas-espejo.jpeg",
        alt: "Puertas espejo y cubos del Closet Luminoso",
      },
      {
        src: "/images/pagina-catalogo/closet-luminoso/imagen-03-tocador-integrado.jpeg",
        alt: "Tocador integrado del Closet Luminoso",
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
      },
      {
        src: "/images/pagina-catalogo/closet-central/imagen-02-vista-isla.jpeg",
        alt: "Vista general de la isla en Closet Central",
        objectFit: "contain",
      },
      {
        src: "/images/pagina-catalogo/closet-central/imagen-03-vitrina-iluminada.jpeg",
        alt: "Vitrina iluminada del Closet Central",
        objectFit: "contain",
      },
      {
        src: "/images/pagina-catalogo/closet-central/imagen-04-zona-colgado.jpeg",
        alt: "Zona de colgado del Closet Central",
        objectFit: "contain",
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
      },
      {
        src: "/images/pagina-catalogo/bano-marmol/imagen-02-detalle-ovalin.jpeg",
        alt: "Detalle del ovalín en Baño Mármol",
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
      },
      {
        src: "/images/pagina-catalogo/bano-dual/imagen-02-vista-lavabos.jpeg",
        alt: "Vista de lavabos en Baño Dual",
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
      },
      {
        src: "/images/pagina-catalogo/bano-niveo/imagen-02-detalle-vanitorio.jpeg",
        alt: "Detalle del vanitorio en Baño Níveo",
        objectFit: "contain",
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
      },
      {
        src: "/images/pagina-catalogo/bano-cantera/imagen-02-vista-general.jpeg",
        alt: "Vista general del Baño Cantera",
      },
      {
        src: "/images/pagina-catalogo/bano-cantera/imagen-03-detalle-tocador.jpeg",
        alt: "Detalle del tocador en Baño Cantera",
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
      },
      {
        src: "/images/pagina-catalogo/isla-monolitica/imagen-02-vista-lateral.jpeg",
        alt: "Vista lateral de la Isla Monolítica",
      },
      {
        src: "/images/pagina-catalogo/isla-monolitica/imagen-03-detalle-cubierta.jpeg",
        alt: "Detalle de cubierta en Isla Monolítica",
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
      },
      {
        src: "/images/pagina-catalogo/isla-movil-granito/imagen-02-detalle-cajones.jpeg",
        alt: "Detalle de cajones en Isla Móvil con Granito",
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
      },
      {
        src: "/images/pagina-catalogo/consultorio-dental/imagen-02-vista-clinica.jpeg",
        alt: "Vista clínica del Consultorio Dental",
        objectFit: "contain",
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
      },
      {
        src: "/images/pagina-catalogo/centro-muro-lambrin/imagen-02-vista-general.jpeg",
        alt: "Vista general del Centro Muro Lambrín",
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
      },
      {
        src: "/images/pagina-catalogo/centro-bar-integrado/imagen-02-vista-general.jpeg",
        alt: "Vista general del Centro Bar Integrado",
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
      },
      {
        src: "/images/pagina-catalogo/centro-marmol-lamas/imagen-02-vista-sala.jpeg",
        alt: "Vista del Centro Mármol & Lamas en sala",
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
