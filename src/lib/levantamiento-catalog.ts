/** Catálogos y tipos para el Levantamiento Detallado (paredes, electrodomésticos, iluminación). */

export type MedidasCampos = {
  ancho: string;
  alto: string;
  fondo: string;
};

export type ItemCatalogo = {
  id: string;
  label: string;
  /** Agrupación visual (p. ej. electrodomésticos según catálogo Excel). */
  categoria?: string;
  hint?: string;
  image: string;
  /** Precio fijo (iluminación), no por metro. */
  precioFijo?: number;
  /** Precio unitario base por cantidad (accesorios especiales); configurable después. */
  precioBase?: number;
};

export const WALL_ITEMS: ItemCatalogo[] = [
  {
    id: "pared-recta",
    label: "Pared recta",
    hint: "Muro corrido sin vanos",
    image: "/images/materiales/white_seamless_texture.jpg",
  },
  {
    id: "pared-ventana",
    label: "Pared con ventana",
    hint: "Un vano de ventana",
    image: "/images/materiales/white_marble_texture.jpg",
  },
  {
    id: "pared-puerta",
    label: "Pared con puerta",
    hint: "Un vano de puerta",
    image: "/images/materiales/walnut_wood_texture.jpg",
  },
  {
    id: "pared-2-ventanas",
    label: "Pared con 2 ventanas",
    hint: "Dos vanos de ventana; ancho de cada uno por separado",
    image: "/images/materiales/white_marble_texture.jpg",
  },
  {
    id: "pared-puerta-ventana",
    label: "Pared con puerta y ventana",
    hint: "Puerta y ventana en el mismo muro",
    image: "/images/materiales/walnut_wood_texture.jpg",
  },
  {
    id: "pared-puerta-2-ventanas",
    label: "Pared con puerta y 2 ventanas",
    hint: "Una puerta y dos ventanas",
    image: "/images/materiales/walnut_wood_texture.jpg",
  },
  {
    id: "pared-2-puertas",
    label: "Pared con 2 puertas",
    hint: "Dos vanos de puerta",
    image: "/images/materiales/walnut_wood_texture.jpg",
  },
  {
    id: "pared-otro",
    label: "Otro tipo de muro o situación especial",
    hint: "Cuando ningún tipo anterior describe bien el muro; describe la situación y medidas de referencia.",
    image: "/images/materiales/quartz_texture.jpg",
  },
];

/**
 * Nombre de archivo (sin extensión) en `public/images/levantamiento/paredes/` cuando no coincide con el `id` del catálogo.
 */
const WALL_IMAGE_BASENAME_BY_ID: Record<string, string> = {
  "pared-recta": "pared_recta",
  "pared-ventana": "pared-con-ventana",
  "pared-puerta": "pared-con-puerta",
};

/**
 * Ruta de la imagen o diagrama de cada tipo de muro.
 * Por defecto se usa `{id}.jpg`; si el archivo tiene otro nombre, añádelo en `WALL_IMAGE_BASENAME_BY_ID`.
 * Si el archivo no existe, se usa la textura de respaldo del ítem (`image`).
 */
export function wallTypeImageSrc(id: string, ext: "jpg" | "png" | "webp" = "jpg"): string {
  const basename = WALL_IMAGE_BASENAME_BY_ID[id] ?? id;
  return `/images/levantamiento/paredes/${basename}.${ext}`;
}

/** Lista de ids de pared (útil para la página de referencia y comprobar qué archivos faltan). */
export const WALL_ITEM_IDS = WALL_ITEMS.map((w) => w.id);

/** Una sola fila de catálogo: los 7 tipos estándar + «Otro». */
export const WALL_PAGE_INDICES: number[][] = [[0, 1, 2, 3, 4, 5, 6, 7]];

/** Definición de cada medida (clave estable + etiqueta en UI y PDF). */
export type WallMeasureFieldDef = {
  key: string;
  label: string;
  /**
   * Acrónimo de cota (estilo arquitectónico: L, H, A, AP, AV, HV, hV, HP…).
   * En UI y diagramas, si falta se usa letra secuencial `wallMeasureLetter(índice)`.
   */
  acronimo?: string;
  /**
   * Dónde cae la medida en el dibujo y términos en palabras simples (validar que A,B… tienen sentido).
   * No va al PDF salvo lo que ya dice `label`.
   */
  verifyHint?: string;
  /** Si es false, el valor no es cota en metros (p. ej. descripción libre: no se añade " m" en PDF). */
  isMetric?: boolean;
};

/**
 * Medidas sugeridas por tipo de muro (metros salvo nota). Orden = orden en formulario y PDF.
 */
export const WALL_MEASURE_SCHEMA: Record<string, WallMeasureFieldDef[]> = {
  "pared-recta": [
    {
      key: "largo-corrido",
      label: "Largo corrido del muro",
      acronimo: "L",
      verifyHint: "Cota A: borde inferior del muro en alzado, de extremo a extremo.",
    },
    {
      key: "altura-techo",
      label: "Altura hasta techo",
      acronimo: "H",
      verifyHint: "Cota B: vertical en el borde izquierdo, de piso a techo.",
    },
  ],
  "pared-ventana": [
    {
      key: "largo-muro",
      label: "Largo total del muro",
      acronimo: "L",
      verifyHint: "Cota A: ancho total del muro en la línea inferior.",
    },
    {
      key: "altura-techo",
      label: "Altura hasta techo",
      acronimo: "H",
      verifyHint: "Cota B: altura total del muro (piso a techo).",
    },
    {
      key: "ancho-vano",
      label: "Ancho del hueco de la ventana",
      acronimo: "AV",
      verifyHint: "Cota C: ancho del vano (jamba a jamba).",
    },
    {
      key: "alto-vano",
      label: "Alto del hueco de la ventana",
      acronimo: "HV",
      verifyHint: "Cota D: alto del vano.",
    },
    {
      key: "antepecho",
      label: "Antepecho (piso - parte baja del hueco)",
      acronimo: "hV",
      verifyHint: "Cota E: desde piso hasta inicio inferior del hueco.",
    },
    {
      key: "cabezal-ventana",
      label: "Distancia de techo a parte alta de la ventana",
      acronimo: "TV",
      verifyHint: "Cota F: desde techo hasta el borde superior del vano.",
    },
    {
      key: "dist-inicio-vano",
      label: "Distancia desde inicio del muro hasta el hueco",
      acronimo: "A",
      verifyHint: "Cota G: desde el extremo de referencia hasta el inicio del vano.",
    },
  ],
  "pared-puerta": [
    {
      key: "largo-muro",
      label: "Largo total del muro",
      acronimo: "L",
      verifyHint: "Cota A: ancho total del muro.",
    },
    {
      key: "altura-techo",
      label: "Altura hasta techo",
      acronimo: "H",
      verifyHint: "Cota B: altura total del muro (piso a techo).",
    },
    {
      key: "ancho-vano",
      label: "Ancho del hueco de la puerta",
      acronimo: "AP",
      verifyHint: "Cota C: ancho del vano de la puerta.",
    },
    {
      key: "alto-vano",
      label: "Alto del hueco de la puerta",
      acronimo: "HP",
      verifyHint: "Cota D: alto del vano.",
    },
    {
      key: "dist-marco-referencia",
      label: "Distancia desde inicio del muro hasta el hueco",
      acronimo: "A",
      verifyHint: "Cota E: desde el extremo de referencia hasta el inicio del vano.",
    },
    {
      key: "cabezal-puerta",
      label: "Distancia de techo al marco superior de la puerta",
      acronimo: "TP",
      verifyHint: "Cota F: claro entre techo y dintel de la puerta.",
    },
  ],
  "pared-2-ventanas": [
    {
      key: "largo-muro",
      label: "Largo total del muro",
      acronimo: "L",
      verifyHint: "Cota A: ancho total del muro.",
    },
    {
      key: "altura-techo",
      label: "Altura hasta techo",
      acronimo: "H",
      verifyHint: "Cota B: altura total del muro.",
    },
    {
      key: "ancho-ventana-1",
      label: "Ancho del hueco de la ventana 1",
      acronimo: "AV1",
      verifyHint: "Cota C: ancho del vano de la primera ventana.",
    },
    {
      key: "ancho-ventana-2",
      label: "Ancho del hueco de la ventana 2",
      acronimo: "AV2",
      verifyHint: "Cota D: ancho del vano de la segunda ventana.",
    },
    {
      key: "alto-ventana-1",
      label: "Alto del hueco de la ventana 1",
      acronimo: "HV1",
      verifyHint: "Cota E: alto del vano de la ventana 1.",
    },
    {
      key: "alto-ventana-2",
      label: "Alto del hueco de la ventana 2",
      acronimo: "HV2",
      verifyHint: "Cota F: alto del vano de la ventana 2.",
    },
    {
      key: "dist-extremo-ventana-1",
      label: "Distancia desde extremo del muro al inicio de ventana 1",
      acronimo: "A",
      verifyHint: "Cota G: alineación desde el extremo al primer vano.",
    },
    {
      key: "dist-entre-ventanas",
      label: "Distancia entre ventana 1 y ventana 2",
      acronimo: "d",
      verifyHint: "Cota H: tramo libre entre vanos.",
    },
    {
      key: "antepecho-ventana-1",
      label: "Antepecho (piso a parte baja del hueco) · ventana 1",
      acronimo: "hV1",
      verifyHint: "Cota I: desde piso hasta arranque inferior del vano 1.",
    },
    {
      key: "antepecho-ventana-2",
      label: "Antepecho (piso a parte baja del hueco) · ventana 2",
      acronimo: "hV2",
      verifyHint: "Cota J: desde piso hasta arranque inferior del vano 2.",
    },
    {
      key: "cabezal-ventana-1",
      label: "Distancia de techo a parte alta de la ventana 1",
      acronimo: "TV1",
      verifyHint: "Cota K: claro superior entre techo y vano 1.",
    },
    {
      key: "cabezal-ventana-2",
      label: "Distancia de techo a parte alta de la ventana 2",
      acronimo: "TV2",
      verifyHint: "Cota L: claro superior entre techo y vano 2.",
    },
    {
      key: "dist-extremo-ventana-2",
      label: "Distancia desde extremo del muro al inicio de ventana 2",
      acronimo: "A2",
      verifyHint: "Cota M: alineación desde el extremo de referencia al segundo vano.",
    },
  ],
  "pared-puerta-ventana": [
    {
      key: "largo-muro",
      label: "Largo total del muro",
      acronimo: "L",
      verifyHint: "Cota en línea inferior: ancho total del muro.",
    },
    {
      key: "altura-techo",
      label: "Altura hasta techo",
      acronimo: "H",
      verifyHint: "Cota vertical en borde izquierdo: piso a techo.",
    },
    {
      key: "ancho-vano-puerta",
      label: "Ancho del hueco de la puerta",
      acronimo: "AP",
      verifyHint: "Ancho del vano de la puerta (jamba a jamba).",
    },
    {
      key: "ancho-vano-ventana",
      label: "Ancho del hueco de la ventana",
      acronimo: "AV",
      verifyHint: "Ancho del vano de la ventana.",
    },
    {
      key: "alto-vano-puerta",
      label: "Alto del hueco de la puerta",
      acronimo: "HP",
      verifyHint: "Alto del vano de la puerta (paramento exterior izquierdo del hueco).",
    },
    {
      key: "alto-vano-ventana",
      label: "Alto del hueco de la ventana",
      acronimo: "HV",
      verifyHint: "Alto del vano de la ventana (paramento exterior derecho del hueco).",
    },
    {
      key: "dist-extremo-a-puerta",
      label: "Distancia desde extremo del muro al inicio de la puerta",
      acronimo: "A",
      verifyHint: "Tramo horizontal desde el extremo de referencia al inicio del vano de puerta.",
    },
    {
      key: "dist-puerta-a-ventana",
      label: "Distancia libre entre puerta y ventana",
      acronimo: "dPV",
      verifyHint: "Tramo libre entre jamba derecha de puerta y jamba izquierda de ventana.",
    },
    {
      key: "dist-extremo-a-ventana",
      label: "Distancia desde extremo del muro al inicio de la ventana",
      acronimo: "AV0",
      verifyHint: "Ubicación horizontal del inicio del vano de ventana respecto al extremo del muro.",
    },
    {
      key: "dist-fin-ventana-extremo-derecho",
      label: "Distancia desde el extremo derecho del muro al fin de la ventana",
      acronimo: "AV2",
      verifyHint: "Tramo horizontal desde jamba derecha de ventana hasta el extremo derecho del muro.",
    },
    {
      key: "antepecho-ventana",
      label: "Distancia del piso a parte baja de la ventana",
      acronimo: "hV",
      verifyHint: "Desde piso terminado hasta arranque inferior del vano de ventana.",
    },
    {
      key: "cabezal-puerta",
      label: "Distancia de techo al marco superior de la puerta",
      acronimo: "TP",
      verifyHint: "Claro entre techo y dintel o marco superior de la puerta.",
    },
    {
      key: "cabezal-ventana",
      label: "Distancia de techo a parte alta de la ventana",
      acronimo: "TV",
      verifyHint: "Claro superior entre techo y remate superior del vano de ventana.",
    },
  ],
  "pared-puerta-2-ventanas": [
    {
      key: "largo-muro",
      label: "Largo total del muro",
      acronimo: "L",
      verifyHint: "Cota L: ancho total del muro en la línea inferior del alzado.",
    },
    {
      key: "altura-techo",
      label: "Altura hasta techo",
      acronimo: "H",
      verifyHint: "Cota H: altura total del muro (piso a techo) en el borde izquierdo.",
    },
    {
      key: "ancho-ventana-1",
      label: "Ancho del hueco de la ventana 1",
      acronimo: "AV1",
      verifyHint: "Cota AV1: ancho del vano de la ventana izquierda (jamba a jamba).",
    },
    {
      key: "ancho-ventana-2",
      label: "Ancho del hueco de la ventana 2",
      acronimo: "AV2",
      verifyHint: "Cota AV2: ancho del vano de la ventana derecha (jamba a jamba).",
    },
    {
      key: "ancho-vano-puerta",
      label: "Ancho del hueco de la puerta",
      acronimo: "AP",
      verifyHint: "Cota AP: ancho del vano de la puerta central.",
    },
    {
      key: "alto-ventana-1",
      label: "Alto del hueco de la ventana 1",
      acronimo: "HV1",
      verifyHint: "Cota HV1: alto del vano de la ventana 1 (paramento exterior izquierdo del hueco).",
    },
    {
      key: "alto-ventana-2",
      label: "Alto del hueco de la ventana 2",
      acronimo: "HV2",
      verifyHint: "Cota HV2: alto del vano de la ventana 2 (paramento exterior derecho del hueco).",
    },
    {
      key: "alto-vano-puerta",
      label: "Alto del hueco de la puerta",
      acronimo: "HP",
      verifyHint: "Cota HP: alto del vano de la puerta (línea interior del diagrama).",
    },
    {
      key: "dist-extremo-izq-v1",
      label: "Distancia del extremo izquierdo del muro al inicio de la ventana 1",
      acronimo: "A1",
      verifyHint: "Cota A1: tramo horizontal desde el arranque del muro hasta la jamba izquierda de V1.",
    },
    {
      key: "dist-extremo-der-v2",
      label: "Distancia del extremo derecho del muro al fin de la ventana 2",
      acronimo: "A2",
      verifyHint: "Cota A2: tramo horizontal desde la jamba derecha de V2 hasta el extremo derecho del muro.",
    },
    {
      key: "dist-v1-a-puerta",
      label: "Distancia libre entre ventana 1 y puerta",
      acronimo: "dP1",
      verifyHint: "Cota dP1: tramo libre entre jamba derecha de V1 y jamba izquierda de la puerta.",
    },
    {
      key: "dist-puerta-a-v2",
      label: "Distancia libre entre puerta y ventana 2",
      acronimo: "dP2",
      verifyHint: "Cota dP2: tramo libre entre jamba derecha de la puerta y jamba izquierda de V2.",
    },
    {
      key: "cabezal-ventana-1",
      label: "Distancia de techo a parte alta de la ventana 1",
      acronimo: "TV1",
      verifyHint: "Cota TV1: claro superior entre techo y dintel de la ventana 1.",
    },
    {
      key: "cabezal-ventana-2",
      label: "Distancia de techo a parte alta de la ventana 2",
      acronimo: "TV2",
      verifyHint: "Cota TV2: claro superior entre techo y dintel de la ventana 2.",
    },
    {
      key: "cabezal-puerta",
      label: "Distancia de techo al marco superior de la puerta",
      acronimo: "TP",
      verifyHint: "Cota TP: claro entre techo y dintel o marco superior de la puerta.",
    },
    {
      key: "antepecho-ventana-1",
      label: "Antepecho (piso a parte baja del hueco) · ventana 1",
      acronimo: "hV1",
      verifyHint: "Cota hV1: desde piso terminado hasta arranque inferior del vano de la ventana 1.",
    },
    {
      key: "antepecho-ventana-2",
      label: "Antepecho (piso a parte baja del hueco) · ventana 2",
      acronimo: "hV2",
      verifyHint: "Cota hV2: desde piso terminado hasta arranque inferior del vano de la ventana 2.",
    },
  ],
  "pared-2-puertas": [
    {
      key: "largo-muro",
      label: "Largo total del muro",
      acronimo: "L",
      verifyHint: "Cota L: ancho total del muro en la línea inferior del alzado.",
    },
    {
      key: "altura-techo",
      label: "Altura hasta techo",
      acronimo: "H",
      verifyHint: "Cota H: altura total del muro (piso a techo) en el borde izquierdo.",
    },
    {
      key: "ancho-puerta-1",
      label: "Ancho del hueco de la puerta 1",
      acronimo: "AP1",
      verifyHint: "Cota AP1: ancho del vano de la puerta izquierda (jamba a jamba).",
    },
    {
      key: "ancho-puerta-2",
      label: "Ancho del hueco de la puerta 2",
      acronimo: "AP2",
      verifyHint: "Cota AP2: ancho del vano de la puerta derecha (jamba a jamba).",
    },
    {
      key: "alto-vano-puerta-1",
      label: "Alto del hueco de la puerta 1",
      acronimo: "HP1",
      verifyHint: "Cota HP1: alto del vano de la puerta 1 (paramento exterior izquierdo del hueco).",
    },
    {
      key: "alto-vano-puerta-2",
      label: "Alto del hueco de la puerta 2",
      acronimo: "HP2",
      verifyHint: "Cota HP2: alto del vano de la puerta 2 (paramento exterior derecho del hueco).",
    },
    {
      key: "cabezal-puerta-1",
      label: "Distancia de techo al marco superior de la puerta 1",
      acronimo: "TP1",
      verifyHint: "Cota TP1: claro entre techo y dintel o marco superior de la puerta 1.",
    },
    {
      key: "cabezal-puerta-2",
      label: "Distancia de techo al marco superior de la puerta 2",
      acronimo: "TP2",
      verifyHint: "Cota TP2: claro entre techo y dintel o marco superior de la puerta 2.",
    },
    {
      key: "dist-extremo-a-puerta-1",
      label: "Distancia desde extremo izquierdo del muro al inicio de la puerta 1",
      acronimo: "A",
      verifyHint: "Cota A: tramo horizontal desde el arranque izquierdo del muro hasta la jamba izquierda de la puerta 1.",
    },
    {
      key: "dist-entre-puertas",
      label: "Distancia libre entre puerta 1 y puerta 2",
      acronimo: "dPP",
      verifyHint: "Cota dPP: tramo libre horizontal entre jamba derecha de P1 y jamba izquierda de P2.",
    },
    {
      key: "dist-extremo-a-puerta-2",
      label: "Distancia desde extremo derecho del muro al inicio de la puerta 2",
      acronimo: "A2",
      verifyHint:
        "Cota A2: tramo horizontal desde la jamba izquierda de la puerta 2 hasta el extremo derecho del muro (medido desde la derecha).",
    },
  ],
  "pared-otro": [
    {
      key: "descripcion",
      label: "Descripción de la situación",
      isMetric: false,
      verifyHint: "Explica con tus palabras qué muro o condición especial es (no encaja en los tipos anteriores).",
    },
    {
      key: "ancho",
      label: "Ancho",
      acronimo: "An",
      verifyHint: "Referencia en planta o ancho útil (metros).",
    },
    {
      key: "alto",
      label: "Alto",
      acronimo: "Al",
      verifyHint: "Referencia vertical o altura (metros).",
    },
    {
      key: "fondo",
      label: "Fondo / espesor",
      acronimo: "F",
      verifyHint: "Profundidad o espesor del muro si aplica (metros).",
    },
  ],
};

export type WallMeasuresMap = Record<string, Record<string, string>>;

/** Clave persistida por pared en flujo dinámico: wall-0, wall-1, … */
export const WALL_SLOT_META_TYPE = "__typeId";

/** Alias opcional de obra (ej. «pared del refri») por slot; no afecta cotas ni completitud. */
export const WALL_SLOT_META_ALIAS = "__wallAlias";

export function isWallSlotKey(key: string): boolean {
  return /^wall-\d+$/.test(key);
}

export function wallSlotKey(index: number): string {
  return `wall-${index}`;
}

export function getWallMeasureFieldDefs(wallId: string): WallMeasureFieldDef[] {
  return WALL_MEASURE_SCHEMA[wallId] ?? [];
}

/**
 * Letra secuencial (A, B, C…) si un campo no define `acronimo` en el catálogo.
 * Preferir mostrar `def.acronimo ?? wallMeasureLetter(índice)`.
 */
export function wallMeasureLetter(index: number): string {
  const i = ((index % 26) + 26) % 26;
  return String.fromCharCode(65 + i);
}

/** Acrónimos de cotas sobre vanos (tipografía más pequeña en diagramas). */
export function isWallDimensionInteriorLabel(code: string): boolean {
  if (code.startsWith("HP") || code === "HV" || code.startsWith("HV")) return true;
  if (code === "hV" || code.startsWith("hV")) return true;
  if (code === "AP" || code.startsWith("AP")) return true;
  if (code === "AV" || code.startsWith("AV")) return true;
  if (code.startsWith("TV")) return true;
  return false;
}

/** Grupos del formulario de pared (Levantamiento detallado) para foco en el diagrama. */
export type WallDiagramFocusGroupId = "general" | "vano" | "ubicacion";

/**
 * Coloca cada acrónimo de cota en el mismo grupo visual que los bloques del formulario.
 * general: L,H · vano: AP/HP/HV y anchos AV* del hueco · ubicacion: posiciones, antepechos, cabezales, distancias (incl. AV0).
 * En `pared-puerta-ventana`, AV2 es tramo derecho (ubicacion), no ancho de vano.
 */
export function wallCotaFocusGroup(acronym: string, wallId?: string): WallDiagramFocusGroupId {
  const c = acronym.trim();
  if (c === "L" || c === "H") return "general";
  if (c === "AV0") return "ubicacion";
  if (wallId === "pared-puerta-ventana" && c === "AV2") return "ubicacion";
  if (
    c === "AP" ||
    c.startsWith("HP") ||
    c === "HV" ||
    c.startsWith("HV") ||
    c.startsWith("AP") ||
    c.startsWith("AV")
  )
    return "vano";
  return "ubicacion";
}

/**
 * Misma regla que el diagrama SVG (`wallCotaFocusGroup`): agrupa campos del formulario de pared.
 * Si no hay acrónimo (p. ej. texto libre), se infiere solo por claves obvias L/H.
 */
export function wallMeasureFieldFocusGroup(field: WallMeasureFieldDef, wallId?: string): WallDiagramFocusGroupId {
  const ac = field.acronimo?.trim();
  if (ac) return wallCotaFocusGroup(ac, wallId);
  const key = field.key.toLowerCase();
  if (key.startsWith("largo-")) return "general";
  if (key.startsWith("altura-")) return "general";
  if (key.startsWith("alto-ventana-")) return "vano";
  return "ubicacion";
}

/** Vista compacta base (tipos sin lienzo extra). */
export const WALL_DIAGRAM_VIEWBOX_SIMPLE = "0 0 120 120";

/** `pared-recta`: padding amplio (sobre todo izquierda e inferior) para cotas H/L sin recorte. */
export const WALL_DIAGRAM_VIEWBOX_RECTA = "-56 -28 232 192";

/** Coordenadas de cotas y geometría en el sistema interno [0..180] (tipos complejos). */
export const WALL_DIAGRAM_INNER_SIZE = 180;
/** Margen entre borde del viewBox y el contenido para evitar recorte de etiquetas (≥40u). */
export const WALL_DIAGRAM_CANVAS_PADDING = 46;

export const WALL_DIAGRAM_VIEWBOX_EXPANDED = `0 0 ${WALL_DIAGRAM_INNER_SIZE + 2 * WALL_DIAGRAM_CANVAS_PADDING} ${
  WALL_DIAGRAM_INNER_SIZE + 2 * WALL_DIAGRAM_CANVAS_PADDING
}`;

const EXPANDED_DIAGRAM_WALL_IDS = new Set([
  "pared-ventana",
  "pared-puerta",
  "pared-2-ventanas",
  "pared-puerta-2-ventanas",
  "pared-2-puertas",
]);

export function wallDiagramUsesExpandedCanvas(wallId: string): boolean {
  return EXPANDED_DIAGRAM_WALL_IDS.has(wallId);
}

export function getWallDiagramViewBox(wallId: string): string {
  if (wallId === "pared-recta") return WALL_DIAGRAM_VIEWBOX_RECTA;
  return wallDiagramUsesExpandedCanvas(wallId) ? WALL_DIAGRAM_VIEWBOX_EXPANDED : WALL_DIAGRAM_VIEWBOX_SIMPLE;
}

/**
 * Línea de medición. Coordenadas en sistema interno 180×180 (`pared-recta`: alzado 120×120, viewBox `WALL_DIAGRAM_VIEWBOX_RECTA`).
 * En pantalla se desplaza por `WALL_DIAGRAM_CANVAS_PADDING` en tipos expandidos.
 * Orden = mismo que `WALL_MEASURE_SCHEMA[wallId]` (A, B, C…).
 */
export type WallDimensionSegment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Desplazamiento del badge (letra) respecto al punto medio del segmento, en unidades del viewBox. */
  labelDx?: number;
  labelDy?: number;
};

/**
 * Cotas alineadas al alzado (jambas/dinteles/piso).
 * G separación ~20u del paramento; líneas horizontales inferiores escalonadas para legibilidad.
 */
export const WALL_MEASURE_DIMENSION_LINES: Partial<
  Record<string, readonly WallDimensionSegment[]>
> = {
  /** L: ~40u bajo el paramento (y=96); H: ~40u a la izq. del muro (x=12). Badges centrados en L/H del alzado. */
  "pared-recta": [
    { x1: 12, y1: 136, x2: 108, y2: 136, labelDx: 0, labelDy: 10 },
    { x1: -28, y1: 96, x2: -28, y2: 22, labelDx: -12, labelDy: 0 },
  ],
  /** Muro 18,33 + ventana 57,66 / 66×39 (suelo y=144, techo y=33). */
  "pared-ventana": [
    { x1: 18, y1: 166, x2: 162, y2: 166, labelDx: 0, labelDy: 10 },
    { x1: -4, y1: 144, x2: -4, y2: 33, labelDx: -12, labelDy: 0 },
    { x1: 57, y1: 52, x2: 123, y2: 52, labelDx: 0, labelDy: -9 },
    { x1: 136, y1: 66, x2: 136, y2: 105, labelDx: 12, labelDy: 0 },
    { x1: 41, y1: 144, x2: 41, y2: 105, labelDx: -12, labelDy: 0 },
    { x1: 168, y1: 33, x2: 168, y2: 66, labelDx: 12, labelDy: 0 },
    { x1: 18, y1: 154, x2: 57, y2: 154, labelDx: 0, labelDy: 10 },
  ],
  /** Puerta 66,57 / 48×87 (dintel y=57, piso y=144). */
  "pared-puerta": [
    { x1: 18, y1: 166, x2: 162, y2: 166, labelDx: 0, labelDy: 10 },
    { x1: -4, y1: 144, x2: -4, y2: 33, labelDx: -12, labelDy: 0 },
    { x1: 66, y1: 46, x2: 114, y2: 46, labelDx: 0, labelDy: -9 },
    { x1: 129, y1: 57, x2: 129, y2: 144, labelDx: 12, labelDy: 0 },
    { x1: 18, y1: 154, x2: 66, y2: 154, labelDx: 0, labelDy: 10 },
    { x1: 43, y1: 33, x2: 43, y2: 57, labelDx: -12, labelDy: 0 },
  ],
  /** Alineado al icono 1000×700 (muro 120,60 800×520 → escala al lienzo 180+padding). */
  "pared-2-ventanas": [
    { x1: 18, y1: 156.7, x2: 162, y2: 156.7, labelDx: 0, labelDy: 10 },
    { x1: 7.2, y1: 33, x2: 7.2, y2: 156.7, labelDx: -12, labelDy: 0 },
    { x1: 36, y1: 101.3, x2: 72, y2: 101.3, labelDx: 0, labelDy: 10 },
    { x1: 108, y1: 101.3, x2: 144, y2: 101.3, labelDx: 0, labelDy: 10 },
    { x1: 27, y1: 67.1, x2: 27, y2: 109.8, labelDx: -12, labelDy: 0 },
    { x1: 153, y1: 67.1, x2: 153, y2: 109.8, labelDx: 12, labelDy: 0 },
    { x1: 18, y1: 118.2, x2: 36, y2: 118.2, labelDx: 0, labelDy: 10 },
    { x1: 72, y1: 88.4, x2: 108, y2: 88.4, labelDx: 0, labelDy: -10 },
    { x1: 54, y1: 109.8, x2: 54, y2: 143.8, labelDx: -12, labelDy: 0 },
    { x1: 126, y1: 109.8, x2: 126, y2: 143.8, labelDx: 12, labelDy: 0 },
    { x1: 54, y1: 33, x2: 54, y2: 67.1, labelDx: -12, labelDy: 0 },
    { x1: 126, y1: 33, x2: 126, y2: 67.1, labelDx: 12, labelDy: 0 },
    { x1: 144, y1: 118.2, x2: 162, y2: 118.2, labelDx: 0, labelDy: 10 },
  ],
  /** Alineado al icono 1000×700 (V1–puerta–V2 simétrico); orden = `WALL_MEASURE_SCHEMA["pared-puerta-2-ventanas"]`. */
  "pared-puerta-2-ventanas": [
    { x1: 18, y1: 156.81, x2: 162, y2: 156.81, labelDx: 0, labelDy: 10 },
    { x1: 7.2, y1: 33, x2: 7.2, y2: 144, labelDx: -12, labelDy: 0 },
    { x1: 32.4, y1: 101.31, x2: 61.2, y2: 101.31, labelDx: 0, labelDy: 10 },
    { x1: 118.8, y1: 101.31, x2: 147.6, y2: 101.31, labelDx: 0, labelDy: 10 },
    { x1: 75.6, y1: 122.65, x2: 104.4, y2: 122.65, labelDx: 0, labelDy: 10 },
    { x1: 23.4, y1: 67.15, x2: 23.4, y2: 109.85, labelDx: -12, labelDy: 0 },
    { x1: 156.6, y1: 67.15, x2: 156.6, y2: 109.85, labelDx: 12, labelDy: 0 },
    { x1: 99, y1: 62.88, x2: 99, y2: 144, labelDx: 12, labelDy: 0 },
    { x1: 18, y1: 118.38, x2: 32.4, y2: 118.38, labelDx: 0, labelDy: 10 },
    { x1: 147.6, y1: 118.38, x2: 162, y2: 118.38, labelDx: 0, labelDy: 10 },
    { x1: 61.2, y1: 118.38, x2: 75.6, y2: 118.38, labelDx: 0, labelDy: 10 },
    { x1: 104.4, y1: 118.38, x2: 118.8, y2: 118.38, labelDx: 0, labelDy: 10 },
    { x1: 46.8, y1: 33, x2: 46.8, y2: 67.15, labelDx: -12, labelDy: 0 },
    { x1: 133.2, y1: 33, x2: 133.2, y2: 67.15, labelDx: 12, labelDy: 0 },
    { x1: 90, y1: 33, x2: 90, y2: 62.88, labelDx: -12, labelDy: 0 },
    { x1: 46.8, y1: 109.85, x2: 46.8, y2: 144, labelDx: -12, labelDy: 0 },
    { x1: 133.2, y1: 109.85, x2: 133.2, y2: 144, labelDx: 12, labelDy: 0 },
  ],
  /** Alineado al icono 1000×700 (P1 220,200 | P2 600,200); A2 = jamba izq. P2 → extremo derecho del muro. */
  "pared-2-puertas": [
    { x1: 18, y1: 156.81, x2: 162, y2: 156.81, labelDx: 0, labelDy: 10 },
    { x1: 7.2, y1: 33, x2: 7.2, y2: 144, labelDx: -12, labelDy: 0 },
    { x1: 36, y1: 122.65, x2: 72, y2: 122.65, labelDx: 0, labelDy: 10 },
    { x1: 104.4, y1: 122.65, x2: 140.4, y2: 122.65, labelDx: 0, labelDy: 10 },
    { x1: 27, y1: 62.88, x2: 27, y2: 144, labelDx: -12, labelDy: 0 },
    { x1: 151.2, y1: 62.88, x2: 151.2, y2: 144, labelDx: 12, labelDy: 0 },
    { x1: 54, y1: 33, x2: 54, y2: 62.88, labelDx: -12, labelDy: 0 },
    { x1: 122.4, y1: 33, x2: 122.4, y2: 62.88, labelDx: 12, labelDy: 0 },
    { x1: 18, y1: 118.38, x2: 36, y2: 118.38, labelDx: 0, labelDy: 10 },
    { x1: 72, y1: 118.38, x2: 104.4, y2: 118.38, labelDx: 0, labelDy: 10 },
    { x1: 140.4, y1: 118.38, x2: 162, y2: 118.38, labelDx: 0, labelDy: 10 },
  ],
};

export function getWallMeasureDimensionLines(wallId: string): WallDimensionSegment[] | null {
  const seg = WALL_MEASURE_DIMENSION_LINES[wallId];
  if (!seg || seg.length === 0) return null;
  return [...seg];
}

/**
 * Posiciones opcionales (top/left en %) para badges A,B,… sobre la foto del tipo de muro.
 * Si falta o no coincide el número de campos, se reparten en una cuadrícula automática.
 */
export const WALL_MEASURE_BADGE_POSITIONS: Partial<
  Record<string, readonly { top: string; left: string }[]>
> = {
  "pared-recta": [
    { top: "82%", left: "50%" },
    { top: "48%", left: "10%" },
  ],
  "pared-ventana": [
    { top: "84%", left: "50%" },
    { top: "48%", left: "10%" },
    { top: "58%", left: "52%" },
    { top: "38%", left: "68%" },
    { top: "62%", left: "48%" },
    { top: "26%", left: "82%" },
    { top: "86%", left: "24%" },
  ],
  "pared-puerta": [
    { top: "84%", left: "50%" },
    { top: "48%", left: "10%" },
    { top: "56%", left: "52%" },
    { top: "42%", left: "62%" },
    { top: "86%", left: "28%" },
    { top: "22%", left: "82%" },
  ],
  "pared-puerta-ventana": [
    { top: "84%", left: "50%" },
    { top: "48%", left: "10%" },
    { top: "56%", left: "28%" },
    { top: "54%", left: "78%" },
    { top: "42%", left: "32%" },
    { top: "40%", left: "88%" },
    { top: "88%", left: "14%" },
    { top: "76%", left: "48%" },
    { top: "88%", left: "52%" },
    { top: "92%", left: "42%" },
    { top: "62%", left: "72%" },
    { top: "24%", left: "38%" },
    { top: "26%", left: "72%" },
  ],
  "pared-puerta-2-ventanas": [
    { top: "84%", left: "50%" },
    { top: "48%", left: "10%" },
    { top: "58%", left: "28%" },
    { top: "58%", left: "78%" },
    { top: "56%", left: "52%" },
    { top: "38%", left: "18%" },
    { top: "38%", left: "88%" },
    { top: "44%", left: "52%" },
    { top: "88%", left: "18%" },
    { top: "88%", left: "82%" },
    { top: "76%", left: "40%" },
    { top: "76%", left: "64%" },
    { top: "22%", left: "30%" },
    { top: "22%", left: "76%" },
    { top: "20%", left: "52%" },
    { top: "72%", left: "30%" },
    { top: "72%", left: "76%" },
  ],
  "pared-2-puertas": [
    { top: "84%", left: "50%" },
    { top: "48%", left: "10%" },
    { top: "56%", left: "32%" },
    { top: "56%", left: "70%" },
    { top: "42%", left: "22%" },
    { top: "42%", left: "80%" },
    { top: "22%", left: "32%" },
    { top: "22%", left: "70%" },
    { top: "88%", left: "22%" },
    { top: "76%", left: "50%" },
    { top: "88%", left: "78%" },
  ],
};

export function getWallMeasureBadgePositions(wallId: string): { top: string; left: string }[] {
  const defs = getWallMeasureFieldDefs(wallId);
  const n = defs.length;
  const custom = WALL_MEASURE_BADGE_POSITIONS[wallId];
  if (custom && custom.length === n) {
    return custom.map((p) => ({ top: p.top, left: p.left }));
  }
  const cols = n <= 4 ? Math.min(2, n) : Math.min(3, Math.max(2, n));
  const rows = Math.ceil(n / cols);
  return Array.from({ length: n }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const topPct = 14 + ((row + 0.5) / rows) * 68;
    const leftPct = 12 + ((col + 0.5) / cols) * 76;
    return { top: `${topPct}%`, left: `${leftPct}%` };
  });
}

export function emptyWallMeasuresForId(wallId: string): Record<string, string> {
  const defs = getWallMeasureFieldDefs(wallId);
  return Object.fromEntries(defs.map((d) => [d.key, ""]));
}

function isLegacyMedidasCampos(v: unknown): v is MedidasCampos {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  if (!Object.keys(o).every((k) => k === "ancho" || k === "alto" || k === "fondo")) return false;
  return typeof o.ancho === "string" && typeof o.alto === "string" && typeof o.fondo === "string";
}

/** Convierte filas antiguas (ancho/alto/fondo) o parciales al esquema actual del tipo. */
export function migrateWallMeasuresEntry(wallId: string, raw: unknown): Record<string, string> {
  const base = emptyWallMeasuresForId(wallId);
  const keys = Object.keys(base);
  if (isLegacyMedidasCampos(raw)) {
    if (wallId === "pared-otro") {
      if (keys[1]) base[keys[1]] = raw.ancho;
      if (keys[2]) base[keys[2]] = raw.alto;
      if (keys[3]) base[keys[3]] = raw.fondo;
      return base;
    }
    if (keys[0]) base[keys[0]] = raw.ancho;
    if (keys[1]) base[keys[1]] = raw.alto;
    if (keys[2]) base[keys[2]] = raw.fondo;
    return base;
  }
  if (typeof raw === "object" && raw !== null) {
    const o = raw as Record<string, unknown>;
    for (const k of keys) {
      const v = o[k];
      if (typeof v === "string") base[k] = v;
    }
    if (wallId === "pared-2-ventanas") {
      const str = (k: string) => (typeof o[k] === "string" ? (o[k] as string).trim() : "");
      const hv = str("alto-vano");
      const ante = str("antepecho");
      const tv = str("cabezal-ventana");
      if (hv) {
        if (!(base["alto-ventana-1"] ?? "").trim()) base["alto-ventana-1"] = hv;
        if (!(base["alto-ventana-2"] ?? "").trim()) base["alto-ventana-2"] = hv;
      }
      if (ante) {
        if (!(base["antepecho-ventana-1"] ?? "").trim()) base["antepecho-ventana-1"] = ante;
        if (!(base["antepecho-ventana-2"] ?? "").trim()) base["antepecho-ventana-2"] = ante;
      }
      if (tv) {
        if (!(base["cabezal-ventana-1"] ?? "").trim()) base["cabezal-ventana-1"] = tv;
        if (!(base["cabezal-ventana-2"] ?? "").trim()) base["cabezal-ventana-2"] = tv;
      }
    }
    if (wallId === "pared-puerta-2-ventanas") {
      const str = (k: string) => (typeof o[k] === "string" ? (o[k] as string).trim() : "");
      const hvOld = str("alto-vano-ventana");
      if (hvOld) {
        if (!(base["alto-ventana-1"] ?? "").trim()) base["alto-ventana-1"] = hvOld;
        if (!(base["alto-ventana-2"] ?? "").trim()) base["alto-ventana-2"] = hvOld;
      }
      const anteOld = str("antepecho-ventana");
      if (anteOld) {
        if (!(base["antepecho-ventana-1"] ?? "").trim()) base["antepecho-ventana-1"] = anteOld;
        if (!(base["antepecho-ventana-2"] ?? "").trim()) base["antepecho-ventana-2"] = anteOld;
      }
      const tvOld = str("cabezal-ventana");
      if (tvOld) {
        if (!(base["cabezal-ventana-1"] ?? "").trim()) base["cabezal-ventana-1"] = tvOld;
        if (!(base["cabezal-ventana-2"] ?? "").trim()) base["cabezal-ventana-2"] = tvOld;
      }
      const dp1Old = str("dist-puerta-a-ventana-1");
      if (dp1Old && !(base["dist-v1-a-puerta"] ?? "").trim()) base["dist-v1-a-puerta"] = dp1Old;
    }
    if (wallId === "pared-2-puertas") {
      const str = (k: string) => (typeof o[k] === "string" ? (o[k] as string).trim() : "");
      const hpOld = str("alto-vano");
      if (hpOld) {
        if (!(base["alto-vano-puerta-1"] ?? "").trim()) base["alto-vano-puerta-1"] = hpOld;
        if (!(base["alto-vano-puerta-2"] ?? "").trim()) base["alto-vano-puerta-2"] = hpOld;
      }
      const tpOld = str("cabezal-puertas");
      if (tpOld) {
        if (!(base["cabezal-puerta-1"] ?? "").trim()) base["cabezal-puerta-1"] = tpOld;
        if (!(base["cabezal-puerta-2"] ?? "").trim()) base["cabezal-puerta-2"] = tpOld;
      }
    }
  }
  return base;
}

export function initWallMeasuresMap(): WallMeasuresMap {
  const map: WallMeasuresMap = {};
  for (const w of WALL_ITEMS) {
    map[w.id] = emptyWallMeasuresForId(w.id);
  }
  return map;
}

export function normalizeWallMeasuresPayload(raw: unknown): WallMeasuresMap {
  const out = initWallMeasuresMap();
  if (typeof raw !== "object" || raw === null) return out;
  const obj = raw as Record<string, unknown>;
  for (const w of WALL_ITEMS) {
    if (w.id in obj) {
      out[w.id] = migrateWallMeasuresEntry(w.id, obj[w.id]);
    }
  }
  for (const key of Object.keys(obj)) {
    if (!isWallSlotKey(key)) continue;
    const entry = obj[key];
    if (typeof entry !== "object" || entry === null) continue;
    const o = entry as Record<string, unknown>;
    const typeIdRaw = o[WALL_SLOT_META_TYPE];
    const typeId = typeof typeIdRaw === "string" ? typeIdRaw.trim() : "";
    if (!typeId || !WALL_ITEMS.some((w) => w.id === typeId)) {
      const aliasRaw = o[WALL_SLOT_META_ALIAS];
      const alias = typeof aliasRaw === "string" ? aliasRaw : "";
      out[key] = {
        [WALL_SLOT_META_TYPE]: typeId,
        ...(alias.trim() ? { [WALL_SLOT_META_ALIAS]: alias } : {}),
      };
      continue;
    }
    const base = emptyWallMeasuresForId(typeId);
    base[WALL_SLOT_META_TYPE] = typeId;
    for (const k of Object.keys(base)) {
      if (k === WALL_SLOT_META_TYPE) continue;
      const v = o[k];
      if (typeof v === "string") base[k] = v;
    }
    const aliasRaw = o[WALL_SLOT_META_ALIAS];
    if (typeof aliasRaw === "string" && aliasRaw.trim()) base[WALL_SLOT_META_ALIAS] = aliasRaw;
    out[key] = base;
  }
  return out;
}

export function wallMeasuresTieneValor(m: Record<string, string>): boolean {
  for (const [k, v] of Object.entries(m)) {
    if (k.startsWith("__")) continue;
    if ((v ?? "").trim() !== "") return true;
  }
  return false;
}

export function wallSlotIsComplete(m: Record<string, string> | undefined): boolean {
  if (!m) return false;
  const t = (m[WALL_SLOT_META_TYPE] ?? "").trim();
  if (!t) return false;
  return wallMeasuresTieneValor(m);
}

/** Texto para PDF: solo pares etiqueta–valor rellenados. */
export function formatWallMeasuresForPdf(wallId: string, values: Record<string, string>): string {
  const defs = getWallMeasureFieldDefs(wallId);
  if (!defs.length) {
    return Object.entries(values)
      .filter(([, v]) => (v ?? "").trim() !== "")
      .map(([k, v]) => `${k}: ${v.trim()}`)
      .join("; ");
  }
  const parts: string[] = [];
  for (const def of defs) {
    const v = (values[def.key] ?? "").trim();
    if (v) parts.push(`${def.label}: ${v}${def.isMetric === false ? "" : " m"}`);
  }
  return parts.join("; ");
}

/** Respaldo del ítem en catálogo (rutas antiguas render/cocina no existen en `public`). */
export const APPLIANCE_CATALOGO_IMAGE_FALLBACK = "/images/ui/hero-placeholder.svg";

/** Tipos de electrodomésticos (orden de presentación: refrigeración, estufas, tarjas, luego el resto). */
export const APPLIANCE_ITEMS: ItemCatalogo[] = [
  {
    id: "refri-top-mount",
    categoria: "Refrigeradores",
    label: "Top mount (congelador superior)",
    hint: "Clásicos; congelador arriba. Suele ser económico y eficiente en espacio.",
    image: APPLIANCE_CATALOGO_IMAGE_FALLBACK,
  },
  {
    id: "refri-bottom-mount",
    categoria: "Refrigeradores",
    label: "Bottom mount (congelador inferior)",
    hint: "Refrigerador a altura de ojos; congelador abajo.",
    image: APPLIANCE_CATALOGO_IMAGE_FALLBACK,
  },
  {
    id: "refri-side-side",
    categoria: "Refrigeradores",
    label: "Side by side (dúplex)",
    hint: "Refrigerador y congelador uno al lado del otro en vertical.",
    image: APPLIANCE_CATALOGO_IMAGE_FALLBACK,
  },
  {
    id: "refri-french-door",
    categoria: "Refrigeradores",
    label: "French door (puerta francesa)",
    hint: "Dos puertas arriba para refrigerador y cajón abajo para congelador.",
    image: APPLIANCE_CATALOGO_IMAGE_FALLBACK,
  },
  {
    id: "refri-frigobar",
    categoria: "Refrigeradores",
    label: "Frigobar / compactos",
    hint: "Pequeños; oficinas o espacios reducidos.",
    image: APPLIANCE_CATALOGO_IMAGE_FALLBACK,
  },
  {
    id: "estufa-gas",
    categoria: "Estufas",
    label: "Estufas de gas (LP o natural)",
    hint: "Tradicionales; buena potencia y horno integrado. Parrillas hierro fundido, encendido electrónico.",
    image: APPLIANCE_CATALOGO_IMAGE_FALLBACK,
  },
  {
    id: "estufa-electrica",
    categoria: "Estufas",
    label: "Estufas eléctricas",
    hint: "Resistencia, vitrocerámica o inducción; sin instalación de gas.",
    image: APPLIANCE_CATALOGO_IMAGE_FALLBACK,
  },
  {
    id: "estufa-piso-material",
    categoria: "Estufas",
    label: "Estufas de piso (diseño y material)",
    hint: "Inox durables; porcelanizadas blanco/negro, resistentes a corrosión.",
    image: APPLIANCE_CATALOGO_IMAGE_FALLBACK,
  },
  {
    id: "estufa-compacta",
    categoria: "Estufas",
    label: "Estufas compactas o de puesto",
    hint: "Más pequeñas; de uno a cuatro quemadores.",
    image: APPLIANCE_CATALOGO_IMAGE_FALLBACK,
  },
  {
    id: "tarja-empotrar-sobreponer",
    categoria: "Tarjas",
    label: "De empotrar o de sobreponer",
    hint: "Encimera o sobreponer; el borde apoya sobre la cubierta.",
    image: "/images/levantamiento/electrodomesticos/tarja-empotrar-sobreponer.jpeg",
  },
  {
    id: "tarja-submontar-bajo-cubierta",
    categoria: "Tarjas",
    label: "De submontar o bajo cubierta",
    hint: "Bajo la cubierta; terminación limpia sin borde visible.",
    image: "/images/levantamiento/electrodomesticos/tarja-submontar-bajo-cubierta.jpeg",
  },
  {
    id: "tarja-farmhouse",
    categoria: "Tarjas",
    label: "Tipo farmhouse o granjero",
    hint: "Frente expuesto (apron); cubeta profunda, estilo clásico o rústico.",
    image: "/images/levantamiento/electrodomesticos/tarja-farmhouse.jpeg",
  },
  {
    id: "tarja-con-escurridor",
    categoria: "Tarjas",
    label: "Con escurridor",
    hint: "Incluyen una superficie integrada para secar los trastes.",
    image: "/images/levantamiento/electrodomesticos/tarja-con-escurridor.jpeg",
  },
  {
    id: "tarja-simple",
    categoria: "Tarjas",
    label: "Sencilla",
    hint: "Seno único; práctica en cocinas compactas.",
    image: "/images/levantamiento/electrodomesticos/tarja-sencilla.png",
  },
  {
    id: "tarja-doble",
    categoria: "Tarjas",
    label: "Doble",
    hint: "Permite separar tareas (lavar y enjuagar simultáneamente).",
    image: "/images/levantamiento/electrodomesticos/tarja-doble.jpg",
  },
  {
    id: "tarja-trabajo",
    categoria: "Tarjas",
    label: "Tina grande (o tipo granja)",
    hint: "Gran capacidad para ollas grandes; formato amplio.",
    image: "/images/levantamiento/electrodomesticos/tarja-tina-grande.png",
  },
  {
    id: "tarja-acero-inoxidable",
    categoria: "Tarjas",
    label: "Acero inoxidable",
    hint: "Material duradero; atención al calibre (gauge) y acabado.",
    image: "/images/levantamiento/electrodomesticos/tarja-acero-inoxidable.jpeg",
  },
  {
    id: "tarja-granito-cuarzo",
    categoria: "Tarjas",
    label: "Granito o cuarzo compuesto",
    hint: "Muy duraderos; resistentes a manchas y rayones.",
    image: "/images/levantamiento/electrodomesticos/tarja-granito-cuarzo.jpeg",
  },
  {
    id: "tarja-ceramica-arcilla",
    categoria: "Tarjas",
    label: "Cerámica / arcilla refractaria",
    hint: "Resistentes al calor; estilo clásico.",
    image: "/images/levantamiento/electrodomesticos/tarja-ceramica-arcilla.jpeg",
  },
  {
    id: "micro-sobremesa",
    categoria: "Microondas",
    label: "De libre instalación (sobremesa)",
    hint: "Se colocan sobre la encimera; fáciles de instalar y transportar.",
    image: APPLIANCE_CATALOGO_IMAGE_FALLBACK,
  },
  {
    id: "micro-empotrable",
    categoria: "Microondas",
    label: "Empotrables o de integración",
    hint: "Dentro de muebles de cocina; estética limpia y más espacio en encimera.",
    image: APPLIANCE_CATALOGO_IMAGE_FALLBACK,
  },
  {
    id: "micro-campana",
    categoria: "Microondas",
    label: "Con campana extractora",
    hint: "Sobre la estufa; combina calentamiento y extracción de humo y olores.",
    image: "/images/levantamiento/campanas/microcampanas.JPG",
  },
  {
    id: "parrilla-gas",
    categoria: "Parrillas",
    label: "Parrillas de gas",
    hint: "Muy comunes en México; control fino de flama. Pueden ser empotrables.",
    image: APPLIANCE_CATALOGO_IMAGE_FALLBACK,
  },
  {
    id: "parrilla-induccion",
    categoria: "Parrillas",
    label: "Parrillas de inducción",
    hint: "Calientan el sartén por campo magnético; rápidas y eficientes. Batería ferromagnética.",
    image: APPLIANCE_CATALOGO_IMAGE_FALLBACK,
  },
  {
    id: "parrilla-electrica-vitro",
    categoria: "Parrillas",
    label: "Parrillas eléctricas / vitrocerámica",
    hint: "Superficie lisa; resistencias. Ideales sin gas.",
    image: APPLIANCE_CATALOGO_IMAGE_FALLBACK,
  },
  {
    id: "parrilla-mixta",
    categoria: "Parrillas",
    label: "Parrillas mixtas",
    hint: "Combinan gas e inducción u otras zonas.",
    image: APPLIANCE_CATALOGO_IMAGE_FALLBACK,
  },
  {
    id: "parrilla-domino",
    categoria: "Parrillas",
    label: "Parrillas dominó",
    hint: "Módulos pequeños combinables para personalizar la cocción.",
    image: APPLIANCE_CATALOGO_IMAGE_FALLBACK,
  },
  {
    id: "campana-decorativa-pared",
    categoria: "Campanas",
    label: "Campana de pared (decorativa)",
    hint: "Sobre muro, visible; suele acompañar a la parrilla a modo de frente o diseño.",
    image: "/images/levantamiento/campanas/campanas-de-pared.webp",
  },
  {
    id: "campana-isla",
    categoria: "Campanas",
    label: "Campana de isla",
    hint: "Instalación central sobre la cocción en isla o península; suele colgarse del techo o de estructura fija.",
    image: "/images/levantamiento/campanas/campanas-de-isla.png",
  },
  {
    id: "campana-integrada",
    categoria: "Campanas",
    label: "Campana integrable o encastrable (filtrable, etc.)",
    hint: "Línea limpia: se esconde tras o dentro del mobiliario; el motor o filtros suelen quedar disimulados.",
    image: "/images/levantamiento/campanas/campanas-integrables.jpg",
  },
  {
    id: "campana-telescopica",
    categoria: "Campanas",
    label: "Campana extraíble o telescópica",
    hint: "Sobre la cocción y se retrae en el mueble o altura; útil con altura baja o cristal superior.",
    image: "/images/levantamiento/campanas/camapanas-telescopicas.jpeg",
  },
  {
    id: "campana-de-techo",
    categoria: "Campanas",
    label: "Campanas de techo",
    hint: "Sistema fijo o empotrable en cielo; adecuada cuando la cocción no pega a pared.",
    image: "/images/levantamiento/campanas/campanas-de-techo.jpg",
  },
  {
    id: "campana-encimera",
    categoria: "Campanas",
    label: "Campanas de encimera o en superficie",
    hint: "Extraen a nivel o junto a la bancada; a veces integran control en la encimera.",
    image: "/images/levantamiento/campanas/campanas-encimera.jpg",
  },
  {
    id: "campana-micro",
    categoria: "Campanas",
    label: "Micro campanas",
    hint: "Formato compacto; para cocinas o huecos con poco frente sin renunciar a la extracción.",
    image: "/images/levantamiento/campanas/microcampanas.JPG",
  },
  {
    id: "otro-cafetera",
    categoria: "Otros",
    label: "Cafetera",
    hint: "Café espresso, americano u oficina según espacio asignado.",
    image: "/images/levantamiento/otros/cafetera.webp",
  },
  {
    id: "otro-lavavajillas",
    categoria: "Otros",
    label: "Lavavajillas",
    hint: "Integrado, semi-integrado o de libre instalación.",
    image: "/images/levantamiento/otros/lavavajillas.jpeg",
  },
  {
    id: "otro-freidora-aire",
    categoria: "Otros",
    label: "Freidora de aire",
    hint: "Sobremesa o hueco dedicado en torre o mueble bajo.",
    image: "/images/levantamiento/otros/freidora-de-aire.jpg",
  },
  {
    id: "otro-horno-gas",
    categoria: "Otros",
    label: "Horno de gas",
    hint: "Independiente o columna de cocción; validar toma de gas y ventilación.",
    image: "/images/levantamiento/otros/horno-de-gas.jpg",
  },
  {
    id: "otro-tostadora",
    categoria: "Otros",
    label: "Tostadora",
    hint: "Pequeño electro de apoyo en encimera o cajón.",
    image: "/images/levantamiento/otros/tostadoraa.webp",
  },
  {
    id: "otro-dispensador-agua",
    categoria: "Otros",
    label: "Dispensador de agua",
    hint: "Filtrada, fría/caliente; fijo o sobre cubierta.",
    image: "/images/levantamiento/otros/dispensador-agua.png",
  },
  {
    id: "otro-enfriador-vinos",
    categoria: "Otros",
    label: "Enfriador de vinos",
    hint: "Columna o bajo cubierta según capacidad de botellas.",
    image: "/images/levantamiento/otros/enfriador-vino.jpeg",
  },
  {
    id: "otro-tarja-extra",
    categoria: "Otros",
    label: "Tarja extra",
    hint: "Segunda tarja en barista, isla o área de apoyo (distinta de la tarja principal de la cocina).",
    image: "/images/levantamiento/otros/tarja-extraa.jpg",
  },
];

/**
 * Imagen en `public/images/levantamiento/electrodomesticos/` por id de catálogo (nombre de archivo real del proyecto).
 */
const APPLIANCE_LEVANTAMIENTO_IMAGE_BY_ID: Record<string, string> = {
  "micro-sobremesa": "/images/levantamiento/electrodomesticos/microondas-libre-instalacion.JPEG",
  "micro-empotrable": "/images/levantamiento/electrodomesticos/microondas-empotrables.png",
  "micro-campana": "/images/levantamiento/campanas/microcampanas.JPG",
  "estufa-gas": "/images/levantamiento/electrodomesticos/estufa-gas.jpg",
  "estufa-electrica": "/images/levantamiento/electrodomesticos/estufa-electrica.jpg",
  "estufa-piso-material": "/images/levantamiento/electrodomesticos/estufa-de-piso-diseno.jpg",
  "estufa-compacta": "/images/levantamiento/electrodomesticos/estufa-piso-compactas.JPG",
  "refri-top-mount": "/images/levantamiento/electrodomesticos/top-mount2.jpg",
  "refri-bottom-mount": "/images/levantamiento/electrodomesticos/botton-mount1.jpg",
  "refri-side-side": "/images/levantamiento/electrodomesticos/side-by-side.png",
  "refri-french-door": "/images/levantamiento/electrodomesticos/french-door.jpg",
  "refri-frigobar": "/images/levantamiento/electrodomesticos/frigobar1.jpg",
  "tarja-empotrar-sobreponer": "/images/levantamiento/electrodomesticos/tarja-empotrar-sobreponer.jpeg",
  "tarja-submontar-bajo-cubierta": "/images/levantamiento/electrodomesticos/tarja-submontar-bajo-cubierta.jpeg",
  "tarja-farmhouse": "/images/levantamiento/electrodomesticos/tarja-farmhouse.jpeg",
  "tarja-con-escurridor": "/images/levantamiento/electrodomesticos/tarja-con-escurridor.jpeg",
  "tarja-granito-cuarzo": "/images/levantamiento/electrodomesticos/tarja-granito-cuarzo.jpeg",
  "tarja-ceramica-arcilla": "/images/levantamiento/electrodomesticos/tarja-ceramica-arcilla.jpeg",
  "tarja-simple": "/images/levantamiento/electrodomesticos/tarja-sencilla.png",
  "tarja-doble": "/images/levantamiento/electrodomesticos/tarja-doble.jpg",
  "tarja-trabajo": "/images/levantamiento/electrodomesticos/tarja-tina-grande.png",
  "tarja-acero-inoxidable": "/images/levantamiento/electrodomesticos/tarja-acero-inoxidable.jpeg",
  "parrilla-gas": "/images/levantamiento/electrodomesticos/parrilla-gas1.jpg",
  "parrilla-induccion": "/images/levantamiento/electrodomesticos/parrillas-induccion1.jpg",
  "parrilla-electrica-vitro": "/images/levantamiento/electrodomesticos/parrillas-electricas.jpeg",
  "parrilla-mixta": "/images/levantamiento/electrodomesticos/parrilla-mixta.jpeg",
  "parrilla-domino": "/images/levantamiento/electrodomesticos/parrillas-domino.jpeg",
  "campana-decorativa-pared": "/images/levantamiento/campanas/campanas-de-pared.webp",
  "campana-isla": "/images/levantamiento/campanas/campanas-de-isla.png",
  "campana-integrada": "/images/levantamiento/campanas/campanas-integrables.jpg",
  "campana-telescopica": "/images/levantamiento/campanas/camapanas-telescopicas.jpeg",
  "campana-de-techo": "/images/levantamiento/campanas/campanas-de-techo.jpg",
  "campana-encimera": "/images/levantamiento/campanas/campanas-encimera.jpg",
  "campana-micro": "/images/levantamiento/campanas/microcampanas.JPG",
  "otro-cafetera": "/images/levantamiento/otros/cafetera.webp",
  "otro-lavavajillas": "/images/levantamiento/otros/lavavajillas.jpeg",
  "otro-freidora-aire": "/images/levantamiento/otros/freidora-de-aire.jpg",
  "otro-horno-gas": "/images/levantamiento/otros/horno-de-gas.jpg",
  "otro-tostadora": "/images/levantamiento/otros/tostadoraa.webp",
  "otro-dispensador-agua": "/images/levantamiento/otros/dispensador-agua.png",
  "otro-enfriador-vinos": "/images/levantamiento/otros/enfriador-vino.jpeg",
  "otro-tarja-extra": "/images/levantamiento/otros/tarja-extraa.jpg",
};

/** Rutas extra a probar si la principal falla (typos en nombres de archivo, variantes). */
const APPLIANCE_LEVANTAMIENTO_IMAGE_EXTRAS: Record<string, readonly string[]> = {
  "micro-sobremesa": ["/images/levantamiento/electrodomesticos/microondas-con-campana.jpg"],
  "estufa-piso-material": ["/images/levantamiento/electrodomesticos/estufa-de-piso-por-diseno.jpg"],
  "estufa-electrica": ["/images/levantamiento/electrodomesticos/estufa-electrica2.jpg"],
  "refri-top-mount": ["/images/levantamiento/electrodomesticos/top-moount.jpg"],
  "parrilla-gas": [
    "/images/levantamiento/electrodomesticos/parrila-gas2.jpg",
    "/images/levantamiento/electrodomesticos/parrilla-gas3.jpg",
  ],
  "parrilla-induccion": ["/images/levantamiento/electrodomesticos/parrilla-induccion2.png"],
  "parrilla-electrica-vitro": [
    "/images/levantamiento/electrodomesticos/parrilla-electrica2.jpg",
    "/images/levantamiento/electrodomesticos/parrilla-electrica2.png",
    "/images/levantamiento/electrodomesticos/parrilla-electrica3.jpeg",
  ],
  "tarja-granito-cuarzo": [
    "/images/levantamiento/electrodomesticos/tarja-granito-cuarzo-variante.jpeg",
    "/images/levantamiento/electrodomesticos/tarja-granito-cuarzo-escurridor.jpeg",
  ],
  "tarja-ceramica-arcilla": ["/images/levantamiento/electrodomesticos/tarja-ceramica-arcilla-variante.jpeg"],
  "otro-tostadora": [
    "/images/levantamiento/otros/tostadora.webp",
    "/images/levantamiento/otros/tostadora.png",
    "/images/levantamiento/otros/tostadora.jpg",
  ],
  "otro-tarja-extra": ["/images/levantamiento/otros/tarjaextra.jpg", "/images/levantamiento/otros/tarja-extra.jpg", "/images/levantamiento/otros/tarjaextra.jpeg"],
};

const ELECTRO_PUBLIC_PREFIX = "/images/levantamiento/electrodomesticos/";

/** URLs que usa la UI: electrodomésticos vía API (query `n=` para nombres con `.jpg`). */
function toApplianceDisplayUrl(url: string): string {
  if (!url.startsWith(ELECTRO_PUBLIC_PREFIX)) return url;
  const file = url.slice(ELECTRO_PUBLIC_PREFIX.length);
  return `/api/electro-img?n=${encodeURIComponent(file)}`;
}

/** Orden: principal dedicada, alternativas en carpeta, imagen del catálogo, placeholder (sin duplicados). */
export function applianceLevantamientoImageCandidates(item: ItemCatalogo): string[] {
  const primary = APPLIANCE_LEVANTAMIENTO_IMAGE_BY_ID[item.id];
  const extras = APPLIANCE_LEVANTAMIENTO_IMAGE_EXTRAS[item.id] ?? [];
  const raw = [primary, ...extras, item.image, APPLIANCE_CATALOGO_IMAGE_FALLBACK].filter(
    (u): u is string => Boolean(u?.trim()),
  );
  return [...new Set(raw)].map(toApplianceDisplayUrl);
}

/** Primera ruta dedicada en `electrodomesticos/`, si existe en el mapa. */
export function applianceLevantamientoImageSrc(id: string): string | undefined {
  return APPLIANCE_LEVANTAMIENTO_IMAGE_BY_ID[id];
}

/** Pasos 0..length−1 = un electrodoméstico por vista (orden por categoría); último paso = «Otro». */
export const APPLIANCE_STEPS_TOTAL = APPLIANCE_ITEMS.length + 1;

/** Índice del paso «Otro» (después del último ítem del catálogo). */
export const APPLIANCE_OTRO_STEP_INDEX = APPLIANCE_ITEMS.length;

/** Posición dentro de la categoría del ítem en `APPLIANCE_ITEMS[index]` (1-based). */
export function getApplianceCategoryProgress(globalIndex: number): {
  categoria: string;
  indexInCategory: number;
  totalInCategory: number;
} {
  const item = APPLIANCE_ITEMS[globalIndex];
  const cat = item.categoria ?? "Electrodoméstico";
  const totalInCategory = APPLIANCE_ITEMS.filter((x) => x.categoria === cat).length;
  let indexInCategory = 0;
  for (let i = 0; i <= globalIndex; i++) {
    if (APPLIANCE_ITEMS[i].categoria === cat) indexInCategory++;
  }
  return { categoria: cat, indexInCategory, totalInCategory };
}

/** Orden fijo de categorías en el catálogo (misma secuencia que en `APPLIANCE_ITEMS`). */
export const APPLIANCE_CATEGORIAS: readonly string[] = [
  "Refrigeradores",
  "Estufas",
  "Tarjas",
  "Microondas",
  "Parrillas",
  "Campanas",
  "Otros",
];

/** Primer índice en `APPLIANCE_ITEMS` para una categoría (para saltar desde la UI). */
export function applianceFirstIndexForCategory(categoria: string): number {
  const i = APPLIANCE_ITEMS.findIndex((x) => x.categoria === categoria);
  return i === -1 ? 0 : i;
}

/**
 * Fotos en `public/images/levantamiento/iluminacion/`. Pueden no coincidir al 100% con la etiqueta; sirven como referencia visual.
 */
const LIGHTING_IMAGE_BY_ID: Record<string, string> = {
  "spots-copete": "/images/levantamiento/iluminacion/spots-empotrados-techo-cocina.jpg",
  "tira-led-copete": "/images/levantamiento/iluminacion/perfil-led.jpg",
  "tira-led-alacenas": "/images/levantamiento/iluminacion/led-bajo.jpg",
  "led-golas": "/images/levantamiento/iluminacion/luz-indirecta-cornisa.jpg",
  "led-zoclos": "/images/levantamiento/iluminacion/tira-led-vitrina.jpg",
  "led-interiores": "/images/levantamiento/iluminacion/sensor-led-interior.jpg",
};

/**
 * `object-position` en CSS (se aplica como estilo inline en `LightingTypeImage` para que no dependa de Tailwind).
 * La foto de spots suele ser panorámica: el foco queda arriba-derecha.
 */
export const LIGHTING_CATALOG_OBJECT_POSITION: Partial<Record<string, string>> = {
  "spots-copete": "68% 18%",
};

export function lightingLevantamientoImageCandidates(item: ItemCatalogo): string[] {
  const primary = LIGHTING_IMAGE_BY_ID[item.id] ?? item.image;
  const raw = [primary, APPLIANCE_CATALOGO_IMAGE_FALLBACK].filter((u): u is string => Boolean(u?.trim()));
  return [...new Set(raw)];
}

/** Catálogo fijo: 6 tipos + «Otro» en UI (7.ª opción). */
export const LIGHTING_ITEMS: ItemCatalogo[] = [
  {
    id: "spots-copete",
    label: "Spots en copete",
    categoria: "Iluminación",
    image: LIGHTING_IMAGE_BY_ID["spots-copete"]!,
    precioFijo: 2000,
  },
  {
    id: "tira-led-copete",
    label: "Tira LED en copete",
    categoria: "Iluminación",
    image: LIGHTING_IMAGE_BY_ID["tira-led-copete"]!,
    precioFijo: 1500,
  },
  {
    id: "tira-led-alacenas",
    label: "Tira LED abajo de alacenas",
    categoria: "Iluminación",
    image: LIGHTING_IMAGE_BY_ID["tira-led-alacenas"]!,
    precioFijo: 1800,
  },
  {
    id: "led-golas",
    label: "LED en golas",
    categoria: "Iluminación",
    image: LIGHTING_IMAGE_BY_ID["led-golas"]!,
    precioFijo: 2500,
  },
  {
    id: "led-zoclos",
    label: "LED en zoclos",
    categoria: "Iluminación",
    image: LIGHTING_IMAGE_BY_ID["led-zoclos"]!,
    precioFijo: 2000,
  },
  {
    id: "led-interiores",
    label: "LED interiores",
    categoria: "Iluminación",
    image: LIGHTING_IMAGE_BY_ID["led-interiores"]!,
    precioFijo: 3000,
  },
];

/** Un solo grupo (compatibilidad); la UI mapea `LIGHTING_ITEMS` directamente. */
export const LIGHTING_PAGE_INDICES: number[][] = [[0, 1, 2, 3, 4, 5]];

export function defaultLightingQty(): Record<string, number> {
  const o: Record<string, number> = {};
  for (const item of LIGHTING_ITEMS) {
    o[item.id] = 0;
  }
  return o;
}

type LightingQtySlice = {
  lightingQty?: Record<string, number>;
  lightingMeasures: Record<string, MedidasCampos>;
};

/** Ids de luminarios con cantidad &gt; 0 o con medidas capturadas (PDF / compatibilidad). */
export function computeLightingSelectedIds(lev: LightingQtySlice): string[] {
  return LIGHTING_ITEMS.filter((l) => {
    const q = Math.max(0, Math.floor(Number(lev.lightingQty?.[l.id]) || 0));
    if (q > 0) return true;
    const m = lev.lightingMeasures[l.id];
    return m ? medidasCamposTieneValor(m) : false;
  }).map((l) => l.id);
}

type LightingEffectiveQtyLev = LightingQtySlice & { lightingSelectedIds?: string[] };

/**
 * Cantidad efectiva para cotización/PDF: `lightingQty`, o 1 si legado (solo ids/medidas sin mapa de cantidades).
 */
export function getLightingEffectiveQty(lev: LightingEffectiveQtyLev, lightingId: string): number {
  const raw = lev.lightingQty?.[lightingId];
  const q = Math.max(0, Math.floor(Number(raw) || 0));
  if (q > 0) return Math.min(999, q);
  const ids = lev.lightingSelectedIds ?? [];
  if (ids.includes(lightingId)) return 1;
  const m = lev.lightingMeasures[lightingId];
  if (m && medidasCamposTieneValor(m)) return 1;
  return 0;
}

const SPECIAL_ACCESSORY_IMAGES = [
  "/images/levantamiento/extras/alacena-extraible.jpg",
  "/images/levantamiento/extras/bote-de-basura.webp",
  "/images/levantamiento/extras/space-tower.jpg",
  "/images/levantamiento/extras/mecanismos-electronicos.jpg",
  "/images/levantamiento/extras/alexa.jpg",
  "/images/levantamiento/extras/esquinas-magicas.jpg",
  "/images/levantamiento/extras/persianas-enrollables.jpg",
  "/images/levantamiento/extras/botelleros.webp",
] as const;

/**
 * Accesorios y herrajes especiales (Sección E · extras).
 * `precioBase` simbólico por ítem; se reemplazará por valores de configuración.
 */
export const SPECIAL_ACCESSORIES_ITEMS: ItemCatalogo[] = [
  {
    id: "alacena-extraible",
    label: "Alacena extraíble",
    categoria: "Accesorios especiales",
    image: SPECIAL_ACCESSORY_IMAGES[0]!,
    precioBase: 0,
  },
  {
    id: "bote-basura",
    label: "Bote de basura",
    categoria: "Accesorios especiales",
    image: SPECIAL_ACCESSORY_IMAGES[1]!,
    precioBase: 0,
  },
  {
    id: "space-tower",
    label: "Space Tower",
    categoria: "Accesorios especiales",
    image: SPECIAL_ACCESSORY_IMAGES[2]!,
    precioBase: 0,
  },
  {
    id: "mecanismos-electronicos",
    label: "Mecanismos electrónicos",
    categoria: "Accesorios especiales",
    image: SPECIAL_ACCESSORY_IMAGES[3]!,
    precioBase: 0,
  },
  {
    id: "sistemas-inteligentes-alexa",
    label: "Sistemas inteligentes (Alexa)",
    categoria: "Accesorios especiales",
    image: SPECIAL_ACCESSORY_IMAGES[4]!,
    precioBase: 0,
  },
  {
    id: "esquinas-magicas",
    label: "Esquinas mágicas",
    categoria: "Accesorios especiales",
    image: SPECIAL_ACCESSORY_IMAGES[5]!,
    precioBase: 0,
  },
  {
    id: "persianas-enrollables",
    label: "Persianas enrollables",
    categoria: "Accesorios especiales",
    image: SPECIAL_ACCESSORY_IMAGES[6]!,
    precioBase: 0,
  },
  {
    id: "botelleros",
    label: "Botelleros",
    categoria: "Accesorios especiales",
    image: SPECIAL_ACCESSORY_IMAGES[7]!,
    precioBase: 0,
  },
];

export function defaultSpecialAccessoriesQty(): Record<string, number> {
  const o: Record<string, number> = {};
  for (const item of SPECIAL_ACCESSORIES_ITEMS) {
    o[item.id] = 0;
  }
  return o;
}

export type OtroMedidas = MedidasCampos & {
  descripcion: string;
  /** Solo iluminación «Otro»: precio manual opcional (MXN). */
  precioEstimado?: number;
};

/** Respuesta «¿con isla?» en Sección A (cocina). Vacío = sin indicar. */
export type ConIslaRespuesta = "" | "si" | "no";

/** Payload opcional guardado con la cotización preliminar / PDF. */
export type LevantamientoDetalle = {
  /** Solo aplica de forma relevante a cocina; en otros tipos puede quedar vacío. */
  conIsla?: ConIslaRespuesta;
  /** Medidas generales del espacio (m), formulario preliminar / PDF. */
  largo?: string;
  alto?: string;
  /** Opciones de cálculo ligadas a medidas generales (p. ej. cocina hasta el techo). */
  medidasGenerales?: {
    hastaTecho?: boolean;
  };
  sectionComments: Partial<Record<"a" | "b" | "c" | "d" | "e", string>>;
  /** Cantidad de paredes del flujo dinámico (wall-0 … wall-N-1). 0 = sin definir. Máximo 4 en UI. */
  wallSlotCount: number;
  wallMeasures: WallMeasuresMap;
  wallOtro: OtroMedidas;
  /**
   * Medidas de muros solo por texto + ancho/alto/fondo (sin slots wall-0…).
   * Sustituye el antiguo flujo de 5–8 paredes.
   */
  wallMedidasModoLibre?: boolean;
  /** Electrodomésticos del catálogo a incluir en PDF; las medidas son opcionales. */
  applianceDocumentIds: string[];
  /** Incluir bloque «Otro electrodoméstico» en PDF. */
  applianceOtroInDocument: boolean;
  applianceMeasures: Record<string, MedidasCampos>;
  applianceOtro: OtroMedidas;
  /** Luminarios del catálogo elegidos para el proyecto/PDF (varios a la vez; medidas opcionales). */
  lightingSelectedIds: string[];
  /** Cantidades por id de luminario de catálogo (varios / mismo tipo). */
  lightingQty: Record<string, number>;
  /** Incluir bloque «Otro luminario» en PDF. */
  lightingOtroInDocument: boolean;
  lightingMeasures: Record<string, MedidasCampos>;
  lightingOtro: OtroMedidas;
  /** Cantidades por id de `SPECIAL_ACCESSORIES_ITEMS`. */
  specialAccessoriesQty: Record<string, number>;
  /** Medidas opcionales por id de accesorio especial (ancho / alto / fondo). */
  specialAccessoriesMeasures: Record<string, MedidasCampos>;
};

export function emptyOtro(): OtroMedidas {
  return { ...emptyMedidas(), descripcion: "", precioEstimado: undefined };
}

export function emptyMedidas(): MedidasCampos {
  return { ancho: "", alto: "", fondo: "" };
}

export function medidasCamposTieneValor(m: MedidasCampos): boolean {
  return [m.ancho, m.alto, m.fondo].some((v) => (v ?? "").trim() !== "");
}

/** PDF: ítem de catálogo si está marcado o tenía medidas (datos antiguos). */
export function applianceAppearsInPdf(lev: LevantamientoDetalle, applianceId: string): boolean {
  const ids = lev.applianceDocumentIds ?? [];
  if (ids.includes(applianceId)) return true;
  const m = lev.applianceMeasures[applianceId];
  return m ? medidasCamposTieneValor(m) : false;
}

/** PDF: bloque Otro electro si está marcado o tenía contenido (datos antiguos). */
export function applianceOtroAppearsInPdf(lev: LevantamientoDetalle): boolean {
  if (lev.applianceOtroInDocument) return true;
  const o = lev.applianceOtro;
  return o.descripcion.trim() !== "" || medidasCamposTieneValor(o);
}

/** PDF: luminario de catálogo si cantidad &gt; 0 o tenía medidas / selección legada. */
export function lightingAppearsInPdf(lev: LevantamientoDetalle, lightingId: string): boolean {
  return getLightingEffectiveQty(lev, lightingId) > 0;
}

/** PDF: bloque Otro luminario si está marcado o tenía contenido (datos antiguos). */
export function lightingOtroAppearsInPdf(lev: LevantamientoDetalle): boolean {
  if (lev.lightingOtroInDocument) return true;
  const o = lev.lightingOtro;
  return (
    o.descripcion.trim() !== "" ||
    medidasCamposTieneValor(o) ||
    (typeof o.precioEstimado === "number" && o.precioEstimado > 0)
  );
}

/** PDF: accesorio especial si cantidad &gt; 0 o tiene medidas opcionales capturadas. */
export function specialAccessoryAppearsInPdf(lev: LevantamientoDetalle, accessoryId: string): boolean {
  const q = Math.max(0, Math.floor(Number(lev.specialAccessoriesQty?.[accessoryId]) || 0));
  if (q > 0) return true;
  const m = lev.specialAccessoriesMeasures?.[accessoryId];
  return m ? medidasCamposTieneValor(m) : false;
}

/** Overrides opcionales desde `LevantamientoConfig.extrasPrecios` (precio unitario MXN por id). */
export type CotizacionExtrasPreciosMaps = {
  iluminacion?: Record<string, number>;
  accesoriosEspeciales?: Record<string, number>;
};

/** Suma (cantidad × precio fijo) por luminario + precio manual «Otro». */
export function cotizacionIluminacionTotal(
  lev: LevantamientoDetalle,
  preciosPorId?: Record<string, number>,
): number {
  let sum = 0;
  for (const item of LIGHTING_ITEMS) {
    const q = getLightingEffectiveQty(lev, item.id);
    if (q > 0) {
      const fromCfg = preciosPorId?.[item.id];
      const unit =
        typeof fromCfg === "number" && Number.isFinite(fromCfg)
          ? Math.max(0, fromCfg)
          : (item.precioFijo ?? 0);
      sum += q * unit;
    }
  }
  const extra = lev.lightingOtro.precioEstimado;
  if (typeof extra === "number" && Number.isFinite(extra) && extra > 0) {
    sum += extra;
  }
  return sum;
}

/** Suma cantidad × precio base por accesorio especial. */
export function cotizacionSpecialAccessoriesTotal(
  lev: LevantamientoDetalle,
  preciosPorId?: Record<string, number>,
): number {
  const qtyMap = lev.specialAccessoriesQty ?? defaultSpecialAccessoriesQty();
  let sum = 0;
  for (const item of SPECIAL_ACCESSORIES_ITEMS) {
    const q = Math.max(0, Math.floor(Number(qtyMap[item.id]) || 0));
    const fromCfg = preciosPorId?.[item.id];
    const unit =
      typeof fromCfg === "number" && Number.isFinite(fromCfg)
        ? Math.max(0, fromCfg)
        : (item.precioBase ?? item.precioFijo ?? 0);
    sum += q * unit;
  }
  return sum;
}

/** Iluminación + accesorios especiales (línea «Extras» en cotización). */
export function cotizacionExtrasTotal(
  lev: LevantamientoDetalle,
  maps?: CotizacionExtrasPreciosMaps,
): number {
  return (
    cotizacionIluminacionTotal(lev, maps?.iluminacion) +
    cotizacionSpecialAccessoriesTotal(lev, maps?.accesoriosEspeciales)
  );
}

export function initMeasuresMap(ids: string[]): Record<string, MedidasCampos> {
  const map: Record<string, MedidasCampos> = {};
  ids.forEach((id) => {
    map[id] = emptyMedidas();
  });
  return map;
}

export function defaultLevantamientoDetalle(): LevantamientoDetalle {
  return {
    conIsla: "",
    sectionComments: {},
    wallSlotCount: 0,
    wallMeasures: initWallMeasuresMap(),
    wallOtro: emptyOtro(),
    wallMedidasModoLibre: false,
    applianceDocumentIds: [],
    applianceOtroInDocument: false,
    applianceMeasures: initMeasuresMap(APPLIANCE_ITEMS.map((a) => a.id)),
    applianceOtro: emptyOtro(),
    lightingSelectedIds: [],
    lightingQty: defaultLightingQty(),
    lightingOtroInDocument: false,
    lightingMeasures: initMeasuresMap(LIGHTING_ITEMS.map((l) => l.id)),
    lightingOtro: emptyOtro(),
    specialAccessoriesQty: defaultSpecialAccessoriesQty(),
    specialAccessoriesMeasures: initMeasuresMap(SPECIAL_ACCESSORIES_ITEMS.map((i) => i.id)),
    medidasGenerales: {},
  };
}

function mergeMeasuresMapFromRaw(
  raw: unknown,
  ids: string[],
): Record<string, MedidasCampos> {
  const base = initMeasuresMap(ids);
  if (typeof raw !== "object" || raw === null) return base;
  const o = raw as Record<string, unknown>;
  for (const id of ids) {
    const v = o[id];
    if (isLegacyMedidasCampos(v)) {
      base[id] = { ancho: v.ancho, alto: v.alto, fondo: v.fondo };
    }
  }
  return base;
}

/**
 * Unifica datos guardados (paredes en formato antiguo ancho/alto/fondo o parcial) con el estado por defecto.
 */
export function normalizeLevantamientoDetalle(raw: unknown): LevantamientoDetalle {
  const d = defaultLevantamientoDetalle();
  if (typeof raw !== "object" || raw === null) return d;
  const r = raw as Partial<LevantamientoDetalle>;
  const conIslaRaw = r.conIsla;
  const conIsla: ConIslaRespuesta =
    conIslaRaw === "si" || conIslaRaw === "no" ? conIslaRaw : "";
  const sectionComments =
    typeof r.sectionComments === "object" && r.sectionComments !== null
      ? { ...d.sectionComments, ...r.sectionComments }
      : d.sectionComments;
  const wallOtro =
    typeof r.wallOtro === "object" && r.wallOtro !== null
      ? {
          descripcion: String(r.wallOtro.descripcion ?? ""),
          ancho: String(r.wallOtro.ancho ?? ""),
          alto: String(r.wallOtro.alto ?? ""),
          fondo: String(r.wallOtro.fondo ?? ""),
        }
      : d.wallOtro;
  const applianceOtro =
    typeof r.applianceOtro === "object" && r.applianceOtro !== null
      ? {
          descripcion: String(r.applianceOtro.descripcion ?? ""),
          ancho: String(r.applianceOtro.ancho ?? ""),
          alto: String(r.applianceOtro.alto ?? ""),
          fondo: String(r.applianceOtro.fondo ?? ""),
        }
      : d.applianceOtro;
  const lightingOtroRaw = r.lightingOtro;
  const lightingOtro =
    typeof lightingOtroRaw === "object" && lightingOtroRaw !== null
      ? {
          descripcion: String(lightingOtroRaw.descripcion ?? ""),
          ancho: String(lightingOtroRaw.ancho ?? ""),
          alto: String(lightingOtroRaw.alto ?? ""),
          fondo: String(lightingOtroRaw.fondo ?? ""),
          precioEstimado: (() => {
            const p = (lightingOtroRaw as { precioEstimado?: unknown }).precioEstimado;
            if (typeof p === "number" && Number.isFinite(p)) {
              const v = Math.max(0, p);
              return v === 0 ? undefined : v;
            }
            return undefined;
          })(),
        }
      : d.lightingOtro;

  const wallSlotCountRaw = r.wallSlotCount;
  let wallMedidasModoLibre = r.wallMedidasModoLibre === true;
  let wallSlotCount: number;
  if (wallMedidasModoLibre) {
    wallSlotCount = 0;
  } else {
    wallSlotCount =
      typeof wallSlotCountRaw === "number" && Number.isFinite(wallSlotCountRaw)
        ? Math.min(4, Math.max(0, Math.floor(wallSlotCountRaw)))
        : d.wallSlotCount;
  }

  const applianceMeasures = mergeMeasuresMapFromRaw(r.applianceMeasures, APPLIANCE_ITEMS.map((a) => a.id));

  const rawDocIds = r.applianceDocumentIds;
  let applianceDocumentIds: string[] = Array.isArray(rawDocIds)
    ? [
        ...new Set(
          (rawDocIds as unknown[]).filter(
            (x): x is string => typeof x === "string" && APPLIANCE_ITEMS.some((a) => a.id === x),
          ),
        ),
      ]
    : [];
  for (const a of APPLIANCE_ITEMS) {
    if (medidasCamposTieneValor(applianceMeasures[a.id]) && !applianceDocumentIds.includes(a.id)) {
      applianceDocumentIds = [...applianceDocumentIds, a.id];
    }
  }

  let applianceOtroInDocument = r.applianceOtroInDocument === true;
  if (!applianceOtroInDocument && (applianceOtro.descripcion.trim() !== "" || medidasCamposTieneValor(applianceOtro))) {
    applianceOtroInDocument = true;
  }

  const lightingMeasures = mergeMeasuresMapFromRaw(r.lightingMeasures, LIGHTING_ITEMS.map((l) => l.id));

  const rawLightIds = r.lightingSelectedIds;
  let lightingSelectedIds: string[] = Array.isArray(rawLightIds)
    ? [
        ...new Set(
          (rawLightIds as unknown[]).filter(
            (x): x is string => typeof x === "string" && LIGHTING_ITEMS.some((l) => l.id === x),
          ),
        ),
      ]
    : [];
  for (const l of LIGHTING_ITEMS) {
    if (medidasCamposTieneValor(lightingMeasures[l.id]) && !lightingSelectedIds.includes(l.id)) {
      lightingSelectedIds = [...lightingSelectedIds, l.id];
    }
  }

  const lightingQty = (() => {
    const merged = defaultLightingQty();
    const rawLq = r.lightingQty;
    if (typeof rawLq === "object" && rawLq !== null && !Array.isArray(rawLq)) {
      const o = rawLq as Record<string, unknown>;
      for (const item of LIGHTING_ITEMS) {
        const v = o[item.id];
        if (typeof v === "number" && Number.isFinite(v)) {
          merged[item.id] = Math.min(999, Math.max(0, Math.floor(v)));
        }
      }
    }
    for (const l of LIGHTING_ITEMS) {
      if (lightingSelectedIds.includes(l.id) && (merged[l.id] ?? 0) === 0) {
        merged[l.id] = 1;
      }
    }
    return merged;
  })();

  lightingSelectedIds = computeLightingSelectedIds({ lightingQty, lightingMeasures });

  let lightingOtroInDocument = r.lightingOtroInDocument === true;
  if (!lightingOtroInDocument && (lightingOtro.descripcion.trim() !== "" || medidasCamposTieneValor(lightingOtro))) {
    lightingOtroInDocument = true;
  }

  const specialAccessoriesQty = (() => {
    const merged = defaultSpecialAccessoriesQty();
    const rawSa = r.specialAccessoriesQty;
    if (typeof rawSa === "object" && rawSa !== null && !Array.isArray(rawSa)) {
      const o = rawSa as Record<string, unknown>;
      for (const item of SPECIAL_ACCESSORIES_ITEMS) {
        const v = o[item.id];
        if (typeof v === "number" && Number.isFinite(v)) {
          merged[item.id] = Math.min(999, Math.max(0, Math.floor(v)));
        }
      }
    }
    return merged;
  })();

  const specialAccessoriesMeasures = mergeMeasuresMapFromRaw(
    r.specialAccessoriesMeasures,
    SPECIAL_ACCESSORIES_ITEMS.map((i) => i.id),
  );

  const largoGen = typeof r.largo === "string" ? r.largo : undefined;
  const altoGen = typeof r.alto === "string" ? r.alto : undefined;

  const rawMg = r.medidasGenerales;
  const medidasGenerales =
    typeof rawMg === "object" && rawMg !== null && !Array.isArray(rawMg)
      ? {
          hastaTecho: (rawMg as { hastaTecho?: unknown }).hastaTecho === true,
        }
      : { ...d.medidasGenerales };

  let wallMeasures = normalizeWallMeasuresPayload(r.wallMeasures);
  if (wallMedidasModoLibre) {
    wallSlotCount = 0;
    wallMeasures = { ...wallMeasures };
    for (const k of Object.keys(wallMeasures)) {
      if (isWallSlotKey(k)) delete wallMeasures[k];
    }
  } else {
    wallMeasures = { ...wallMeasures };
    for (const k of Object.keys(wallMeasures)) {
      if (!isWallSlotKey(k)) continue;
      const idx = Number(k.slice(5));
      if (Number.isFinite(idx) && idx >= wallSlotCount) delete wallMeasures[k];
    }
  }

  return {
    conIsla,
    largo: largoGen,
    alto: altoGen,
    medidasGenerales,
    sectionComments,
    wallSlotCount,
    wallMeasures,
    wallOtro,
    wallMedidasModoLibre,
    applianceDocumentIds,
    applianceOtroInDocument,
    applianceMeasures,
    applianceOtro,
    lightingSelectedIds,
    lightingQty,
    lightingOtroInDocument,
    lightingMeasures,
    lightingOtro,
    specialAccessoriesQty,
    specialAccessoriesMeasures,
  };
}
