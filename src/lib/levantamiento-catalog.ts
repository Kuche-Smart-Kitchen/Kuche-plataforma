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
 * Si el archivo no existe, `WallTypeImage` usa la textura de respaldo del ítem (`image`).
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
      verifyHint: "Cota A: borde inferior del muro en alzado, de extremo a extremo.",
    },
    {
      key: "altura-techo",
      label: "Altura hasta techo",
      verifyHint: "Cota B: vertical en el borde izquierdo, de piso a techo.",
    },
  ],
  "pared-ventana": [
    {
      key: "largo-muro",
      label: "Largo total del muro",
      verifyHint: "Cota A: ancho total del muro en la línea inferior.",
    },
    {
      key: "altura-techo",
      label: "Altura hasta techo",
      verifyHint: "Cota B: altura total del muro (piso a techo).",
    },
    {
      key: "ancho-vano",
      label: "Ancho del hueco de la ventana",
      verifyHint: "Cota C: ancho del vano (jamba a jamba).",
    },
    {
      key: "alto-vano",
      label: "Alto del hueco de la ventana",
      verifyHint: "Cota D: alto del vano.",
    },
    {
      key: "antepecho",
      label: "Antepecho (piso - parte baja del hueco)",
      verifyHint: "Cota E: desde piso hasta inicio inferior del hueco.",
    },
    {
      key: "dist-inicio-vano",
      label: "Distancia desde inicio del muro hasta el hueco",
      verifyHint: "Cota F: desde el extremo de referencia hasta el inicio del vano.",
    },
  ],
  "pared-puerta": [
    {
      key: "largo-muro",
      label: "Largo total del muro",
      verifyHint: "Cota A: ancho total del muro.",
    },
    {
      key: "altura-techo",
      label: "Altura hasta techo",
      verifyHint: "Cota B: altura total del muro (piso a techo).",
    },
    {
      key: "ancho-vano",
      label: "Ancho del hueco de la puerta",
      verifyHint: "Cota C: ancho del vano de la puerta.",
    },
    {
      key: "alto-vano",
      label: "Alto del hueco de la puerta",
      verifyHint: "Cota D: alto del vano.",
    },
    {
      key: "dist-marco-referencia",
      label: "Distancia desde inicio del muro hasta el hueco",
      verifyHint: "Cota E: desde el extremo de referencia hasta el inicio del vano.",
    },
  ],
  "pared-2-ventanas": [
    {
      key: "largo-muro",
      label: "Largo total del muro",
      verifyHint: "Cota A: ancho total del muro.",
    },
    {
      key: "altura-techo",
      label: "Altura hasta techo",
      verifyHint: "Cota B: altura total del muro.",
    },
    {
      key: "ancho-ventana-1",
      label: "Ancho ventana 1",
      verifyHint: "Cota C: ancho del vano de la primera ventana.",
    },
    {
      key: "ancho-ventana-2",
      label: "Ancho ventana 2",
      verifyHint: "Cota D: ancho del vano de la segunda ventana.",
    },
    {
      key: "alto-vano",
      label: "Alto del hueco (ventanas)",
      verifyHint: "Cota E: alto común de los vanos (si aplica).",
    },
    {
      key: "antepecho",
      label: "Antepecho (piso - parte baja del hueco)",
      verifyHint: "Cota F: antepecho hasta el inicio del vano.",
    },
    {
      key: "dist-extremo-ventana-1",
      label: "Distancia desde extremo del muro al inicio de ventana 1",
      verifyHint: "Cota G: alineación desde el extremo al primer vano.",
    },
    {
      key: "dist-entre-ventanas",
      label: "Distancia entre ventana 1 y ventana 2",
      verifyHint: "Cota H: tramo libre entre vanos (eje a eje o jamba según tu criterio).",
    },
  ],
  "pared-puerta-ventana": [
    {
      key: "largo-muro",
      label: "Largo total del muro",
      verifyHint: "Cota A: ancho total del muro.",
    },
    {
      key: "altura-techo",
      label: "Altura hasta techo",
      verifyHint: "Cota B: altura total del muro.",
    },
    {
      key: "ancho-vano-puerta",
      label: "Ancho del hueco de la puerta",
      verifyHint: "Cota C: ancho del vano de la puerta.",
    },
    {
      key: "ancho-vano-ventana",
      label: "Ancho del hueco de la ventana",
      verifyHint: "Cota D: ancho del vano de la ventana.",
    },
    {
      key: "alto-vano-puerta",
      label: "Alto del hueco de la puerta",
      verifyHint: "Cota E: alto del vano de la puerta.",
    },
    {
      key: "alto-vano-ventana",
      label: "Alto del hueco de la ventana",
      verifyHint: "Cota F: alto del vano de la ventana.",
    },
    {
      key: "dist-extremo-a-puerta",
      label: "Distancia desde extremo del muro al inicio de la puerta",
      verifyHint: "Cota G: desde el extremo de referencia al vano de la puerta.",
    },
  ],
  "pared-puerta-2-ventanas": [
    {
      key: "largo-muro",
      label: "Largo total del muro",
      verifyHint: "Cota A: ancho total del muro.",
    },
    {
      key: "altura-techo",
      label: "Altura hasta techo",
      verifyHint: "Cota B: altura total del muro.",
    },
    {
      key: "ancho-vano-puerta",
      label: "Ancho del hueco de la puerta",
      verifyHint: "Cota C: ancho del vano de la puerta.",
    },
    {
      key: "ancho-ventana-1",
      label: "Ancho ventana 1",
      verifyHint: "Cota D: ancho del primer vano de ventana.",
    },
    {
      key: "ancho-ventana-2",
      label: "Ancho ventana 2",
      verifyHint: "Cota E: ancho del segundo vano de ventana.",
    },
    {
      key: "alto-vano-puerta",
      label: "Alto del hueco de la puerta",
      verifyHint: "Cota F: alto del vano de la puerta.",
    },
    {
      key: "alto-vano-ventana",
      label: "Alto del hueco de las ventanas",
      verifyHint: "Cota G: alto común de los vanos de ventana (si aplica).",
    },
    {
      key: "dist-extremo-a-puerta",
      label: "Distancia desde extremo del muro al inicio de la puerta",
      verifyHint: "Cota H: desde el extremo al vano de la puerta.",
    },
  ],
  "pared-2-puertas": [
    {
      key: "largo-muro",
      label: "Largo total del muro",
      verifyHint: "Cota A: ancho total del muro.",
    },
    {
      key: "altura-techo",
      label: "Altura hasta techo",
      verifyHint: "Cota B: altura total del muro.",
    },
    {
      key: "ancho-puerta-1",
      label: "Ancho puerta 1",
      verifyHint: "Cota C: ancho del vano de la primera puerta.",
    },
    {
      key: "ancho-puerta-2",
      label: "Ancho puerta 2",
      verifyHint: "Cota D: ancho del vano de la segunda puerta.",
    },
    {
      key: "alto-vano",
      label: "Alto del hueco (puertas)",
      verifyHint: "Cota E: alto común de los vanos.",
    },
    {
      key: "dist-extremo-a-puerta-1",
      label: "Distancia desde extremo del muro al inicio de puerta 1",
      verifyHint: "Cota F: desde el extremo al primer vano.",
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
      verifyHint: "Referencia en planta o ancho útil (metros).",
    },
    {
      key: "alto",
      label: "Alto",
      verifyHint: "Referencia vertical o altura (metros).",
    },
    {
      key: "fondo",
      label: "Fondo / espesor",
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

/** Letra de referencia en diagrama (A, B, C…) alineada al orden del formulario. */
export function wallMeasureLetter(index: number): string {
  const i = ((index % 26) + 26) % 26;
  return String.fromCharCode(65 + i);
}

/**
 * Línea de medición en el overlay. Coords en viewBox 120×120 (alineado a `WallTypeIcons`).
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

/** Alzado: rect exterior ~ (12,22) 96×74; base y≈96. */
export const WALL_MEASURE_DIMENSION_LINES: Partial<
  Record<string, readonly WallDimensionSegment[]>
> = {
  "pared-recta": [
    { x1: 12, y1: 102, x2: 108, y2: 102, labelDx: 0, labelDy: 4 },
    { x1: 8, y1: 96, x2: 8, y2: 22, labelDx: -4, labelDy: 0 },
  ],
  "pared-ventana": [
    { x1: 12, y1: 102, x2: 108, y2: 102, labelDx: 0, labelDy: 4 },
    { x1: 8, y1: 96, x2: 8, y2: 22, labelDx: -4, labelDy: 0 },
    { x1: 38, y1: 72, x2: 82, y2: 72 },
    { x1: 84, y1: 44, x2: 84, y2: 70 },
    { x1: 60, y1: 70, x2: 60, y2: 96 },
    { x1: 12, y1: 98, x2: 38, y2: 98 },
  ],
  "pared-puerta": [
    { x1: 12, y1: 102, x2: 108, y2: 102, labelDx: 0, labelDy: 4 },
    { x1: 8, y1: 96, x2: 8, y2: 22, labelDx: -4, labelDy: 0 },
    { x1: 44, y1: 70, x2: 76, y2: 70 },
    { x1: 78, y1: 38, x2: 78, y2: 96 },
    { x1: 12, y1: 98, x2: 44, y2: 98 },
  ],
  "pared-2-ventanas": [
    { x1: 12, y1: 102, x2: 108, y2: 102, labelDx: 0, labelDy: 4 },
    { x1: 8, y1: 96, x2: 8, y2: 22, labelDx: -4, labelDy: 0 },
    { x1: 22, y1: 68, x2: 46, y2: 68 },
    { x1: 74, y1: 68, x2: 98, y2: 68 },
    { x1: 34, y1: 42, x2: 34, y2: 66 },
    { x1: 60, y1: 66, x2: 60, y2: 96 },
    { x1: 12, y1: 96, x2: 22, y2: 96 },
    { x1: 46, y1: 96, x2: 74, y2: 96 },
  ],
  "pared-puerta-ventana": [
    { x1: 12, y1: 102, x2: 108, y2: 102, labelDx: 0, labelDy: 4 },
    { x1: 8, y1: 96, x2: 8, y2: 22, labelDx: -4, labelDy: 0 },
    { x1: 14, y1: 72, x2: 44, y2: 72 },
    { x1: 62, y1: 70, x2: 98, y2: 70 },
    { x1: 46, y1: 40, x2: 46, y2: 96 },
    { x1: 100, y1: 36, x2: 100, y2: 66 },
    { x1: 12, y1: 98, x2: 14, y2: 98 },
  ],
  "pared-puerta-2-ventanas": [
    { x1: 12, y1: 102, x2: 108, y2: 102, labelDx: 0, labelDy: 4 },
    { x1: 8, y1: 96, x2: 8, y2: 22, labelDx: -4, labelDy: 0 },
    { x1: 44, y1: 72, x2: 76, y2: 72 },
    { x1: 14, y1: 66, x2: 34, y2: 66 },
    { x1: 86, y1: 66, x2: 106, y2: 66 },
    { x1: 78, y1: 38, x2: 78, y2: 96 },
    { x1: 24, y1: 40, x2: 24, y2: 64 },
    { x1: 12, y1: 98, x2: 44, y2: 98 },
  ],
  "pared-2-puertas": [
    { x1: 12, y1: 102, x2: 108, y2: 102, labelDx: 0, labelDy: 4 },
    { x1: 8, y1: 96, x2: 8, y2: 22, labelDx: -4, labelDy: 0 },
    { x1: 18, y1: 70, x2: 46, y2: 70 },
    { x1: 74, y1: 70, x2: 102, y2: 70 },
    { x1: 48, y1: 38, x2: 48, y2: 96 },
    { x1: 12, y1: 98, x2: 18, y2: 98 },
  ],
};

export function getWallMeasureDimensionLines(wallId: string): WallDimensionSegment[] | null {
  const defs = getWallMeasureFieldDefs(wallId);
  const seg = WALL_MEASURE_DIMENSION_LINES[wallId];
  if (!seg || seg.length !== defs.length) return null;
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
    { top: "86%", left: "24%" },
  ],
  "pared-puerta": [
    { top: "84%", left: "50%" },
    { top: "48%", left: "10%" },
    { top: "56%", left: "52%" },
    { top: "42%", left: "62%" },
    { top: "86%", left: "28%" },
  ],
  "pared-2-ventanas": [
    { top: "84%", left: "50%" },
    { top: "48%", left: "10%" },
    { top: "54%", left: "30%" },
    { top: "54%", left: "78%" },
    { top: "40%", left: "28%" },
    { top: "62%", left: "48%" },
    { top: "88%", left: "18%" },
    { top: "88%", left: "58%" },
  ],
  "pared-puerta-ventana": [
    { top: "84%", left: "50%" },
    { top: "48%", left: "10%" },
    { top: "56%", left: "28%" },
    { top: "54%", left: "78%" },
    { top: "40%", left: "36%" },
    { top: "38%", left: "82%" },
    { top: "88%", left: "12%" },
  ],
  "pared-puerta-2-ventanas": [
    { top: "84%", left: "50%" },
    { top: "48%", left: "10%" },
    { top: "56%", left: "52%" },
    { top: "52%", left: "22%" },
    { top: "52%", left: "82%" },
    { top: "42%", left: "62%" },
    { top: "38%", left: "22%" },
    { top: "88%", left: "28%" },
  ],
  "pared-2-puertas": [
    { top: "84%", left: "50%" },
    { top: "48%", left: "10%" },
    { top: "54%", left: "28%" },
    { top: "54%", left: "78%" },
    { top: "42%", left: "38%" },
    { top: "88%", left: "18%" },
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
export const APPLIANCE_CATALOGO_IMAGE_FALLBACK = "/images/hero-placeholder.svg";

/** Tipos de electrodomésticos (catálogo Excel: microondas, estufas, refrigeradores, parrillas). */
export const APPLIANCE_ITEMS: ItemCatalogo[] = [
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
    hint: "Sobre la estufa; también extraen humo y olores.",
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
    id: "tarja-simple",
    categoria: "Tarjas",
    label: "Tarja seno único",
    hint: "Una cubeta; la más común en cocinas compactas.",
    image: APPLIANCE_CATALOGO_IMAGE_FALLBACK,
  },
  {
    id: "tarja-doble",
    categoria: "Tarjas",
    label: "Tarja doble taza",
    hint: "Dos cubetas para lavar y escurrir por separado.",
    image: APPLIANCE_CATALOGO_IMAGE_FALLBACK,
  },
  {
    id: "tarja-farmhouse",
    categoria: "Tarjas",
    label: "Tarja tipo granja (apron front)",
    hint: "Frente visto; estilo rústico o escandinavo.",
    image: APPLIANCE_CATALOGO_IMAGE_FALLBACK,
  },
  {
    id: "tarja-trabajo",
    categoria: "Tarjas",
    label: "Tarja de gran formato / estación de trabajo",
    hint: "Mayor profundidad o ancho para preparación intensa.",
    image: APPLIANCE_CATALOGO_IMAGE_FALLBACK,
  },
  {
    id: "campana-telescopica",
    categoria: "Campanas",
    label: "Campana telescópica o extraíble",
    hint: "Se oculta en el mueble alto; buena opción si el espacio es limitado.",
    image: APPLIANCE_CATALOGO_IMAGE_FALLBACK,
  },
  {
    id: "campana-decorativa-pared",
    categoria: "Campanas",
    label: "Campana decorativa de pared",
    hint: "Visible como elemento de diseño sobre la parrilla.",
    image: APPLIANCE_CATALOGO_IMAGE_FALLBACK,
  },
  {
    id: "campana-isla",
    categoria: "Campanas",
    label: "Campana de isla o colgante",
    hint: "Instalación central sobre parrilla en isla o península.",
    image: APPLIANCE_CATALOGO_IMAGE_FALLBACK,
  },
  {
    id: "campana-integrada",
    categoria: "Campanas",
    label: "Campana integrada o empotrable al mueble",
    hint: "Línea limpia; el motor queda oculto tras frentes.",
    image: APPLIANCE_CATALOGO_IMAGE_FALLBACK,
  },
  {
    id: "otro-cafetera",
    categoria: "Otros",
    label: "Cafetera",
    hint: "Café espresso, americano u oficina según espacio asignado.",
    image: APPLIANCE_CATALOGO_IMAGE_FALLBACK,
  },
  {
    id: "otro-lavavajillas",
    categoria: "Otros",
    label: "Lavavajillas",
    hint: "Integrado, semi-integrado o de libre instalación.",
    image: APPLIANCE_CATALOGO_IMAGE_FALLBACK,
  },
  {
    id: "otro-freidora-aire",
    categoria: "Otros",
    label: "Freidora de aire",
    hint: "Sobremesa o hueco dedicado en torre o mueble bajo.",
    image: APPLIANCE_CATALOGO_IMAGE_FALLBACK,
  },
  {
    id: "otro-horno-gas",
    categoria: "Otros",
    label: "Horno de gas",
    hint: "Independiente o columna de cocción; validar toma de gas y ventilación.",
    image: APPLIANCE_CATALOGO_IMAGE_FALLBACK,
  },
  {
    id: "otro-tostadora",
    categoria: "Otros",
    label: "Tostadora",
    hint: "Pequeño electro de apoyo en encimera o cajón.",
    image: APPLIANCE_CATALOGO_IMAGE_FALLBACK,
  },
  {
    id: "otro-dispensador-agua",
    categoria: "Otros",
    label: "Dispensador de agua",
    hint: "Filtrada, fría/caliente; fijo o sobre cubierta.",
    image: APPLIANCE_CATALOGO_IMAGE_FALLBACK,
  },
  {
    id: "otro-enfriador-vinos",
    categoria: "Otros",
    label: "Enfriador de vinos",
    hint: "Columna o bajo cubierta según capacidad de botellas.",
    image: APPLIANCE_CATALOGO_IMAGE_FALLBACK,
  },
  {
    id: "otro-tarja-extra",
    categoria: "Otros",
    label: "Tarja extra",
    hint: "Segunda tarja en barista, isla o área de apoyo (distinta de la tarja principal de la cocina).",
    image: APPLIANCE_CATALOGO_IMAGE_FALLBACK,
  },
];

/**
 * Imagen en `public/images/electrodomesticos/` por id de catálogo (nombre de archivo real del proyecto).
 */
const APPLIANCE_LEVANTAMIENTO_IMAGE_BY_ID: Record<string, string> = {
  "micro-sobremesa": "/images/electrodomesticos/microondas-libre-instalacion.JPEG",
  "micro-empotrable": "/images/electrodomesticos/microondas-empotrables.png",
  "micro-campana": "/images/electrodomesticos/microondas-con-campana.jpg",
  "estufa-gas": "/images/electrodomesticos/estufa-gas.jpg",
  "estufa-electrica": "/images/electrodomesticos/estufa-electrica.jpg",
  "estufa-piso-material": "/images/electrodomesticos/estufa-de-piso-diseno.jpg",
  "estufa-compacta": "/images/electrodomesticos/estufa-piso-compactas.JPG",
  "refri-top-mount": "/images/electrodomesticos/top-mount2.jpg",
  "refri-bottom-mount": "/images/electrodomesticos/botton-mount1.jpg",
  "refri-side-side": "/images/electrodomesticos/side-by-side.png",
  "refri-french-door": "/images/electrodomesticos/french-door.jpg",
  "refri-frigobar": "/images/electrodomesticos/frigobar1.jpg",
  "parrilla-gas": "/images/electrodomesticos/parrilla-gas1.jpg",
  "parrilla-induccion": "/images/electrodomesticos/parrillas-induccion1.jpg",
  "parrilla-electrica-vitro": "/images/electrodomesticos/parrillas-electricas.jpeg",
  "parrilla-mixta": "/images/electrodomesticos/parrilla-mixta.jpeg",
  "parrilla-domino": "/images/electrodomesticos/parrillas-domino.jpeg",
};

/** Rutas extra a probar si la principal falla (typos en nombres de archivo, variantes). */
const APPLIANCE_LEVANTAMIENTO_IMAGE_EXTRAS: Record<string, readonly string[]> = {
  "micro-sobremesa": ["/images/electrodomesticos/microondas-con-campana.jpg"],
  "estufa-piso-material": ["/images/electrodomesticos/estufa-de-piso-por-diseno.jpg"],
  "estufa-electrica": ["/images/electrodomesticos/estufa-electrica2.jpg"],
  "refri-top-mount": ["/images/electrodomesticos/top-moount.jpg"],
  "parrilla-gas": [
    "/images/electrodomesticos/parrila-gas2.jpg",
    "/images/electrodomesticos/parrilla-gas3.jpg",
  ],
  "parrilla-induccion": ["/images/electrodomesticos/parrilla-induccion2.png"],
  "parrilla-electrica-vitro": [
    "/images/electrodomesticos/parrilla-electrica2.jpg",
    "/images/electrodomesticos/parrilla-electrica2.png",
    "/images/electrodomesticos/parrilla-electrica3.jpeg",
  ],
};

const ELECTRO_PUBLIC_PREFIX = "/images/electrodomesticos/";

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
  "Microondas",
  "Estufas",
  "Refrigeradores",
  "Parrillas",
  "Tarjas",
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
  sectionComments: Partial<Record<"a" | "b" | "c" | "d" | "e", string>>;
  /** Cantidad de paredes del flujo dinámico (wall-0 … wall-N-1). 0 = sin definir. */
  wallSlotCount: number;
  wallMeasures: WallMeasuresMap;
  wallOtro: OtroMedidas;
  /** Electrodomésticos del catálogo a incluir en PDF; las medidas son opcionales. */
  applianceDocumentIds: string[];
  /** Incluir bloque «Otro electrodoméstico» en PDF. */
  applianceOtroInDocument: boolean;
  applianceMeasures: Record<string, MedidasCampos>;
  applianceOtro: OtroMedidas;
  /** Luminarios del catálogo elegidos para el proyecto/PDF (varios a la vez; medidas opcionales). */
  lightingSelectedIds: string[];
  /** Incluir bloque «Otro luminario» en PDF. */
  lightingOtroInDocument: boolean;
  lightingMeasures: Record<string, MedidasCampos>;
  lightingOtro: OtroMedidas;
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

/** PDF: luminario de catálogo si está seleccionado o tenía medidas (datos antiguos). */
export function lightingAppearsInPdf(lev: LevantamientoDetalle, lightingId: string): boolean {
  const ids = lev.lightingSelectedIds ?? [];
  if (ids.includes(lightingId)) return true;
  const m = lev.lightingMeasures[lightingId];
  return m ? medidasCamposTieneValor(m) : false;
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

/** Suma precios fijos de iluminación seleccionada + precio manual «Otro». */
export function cotizacionIluminacionTotal(lev: LevantamientoDetalle): number {
  let sum = 0;
  for (const item of LIGHTING_ITEMS) {
    if (lightingAppearsInPdf(lev, item.id)) {
      sum += item.precioFijo ?? 0;
    }
  }
  const extra = lev.lightingOtro.precioEstimado;
  if (typeof extra === "number" && Number.isFinite(extra) && extra > 0) {
    sum += extra;
  }
  return sum;
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
    applianceDocumentIds: [],
    applianceOtroInDocument: false,
    applianceMeasures: initMeasuresMap(APPLIANCE_ITEMS.map((a) => a.id)),
    applianceOtro: emptyOtro(),
    lightingSelectedIds: [],
    lightingOtroInDocument: false,
    lightingMeasures: initMeasuresMap(LIGHTING_ITEMS.map((l) => l.id)),
    lightingOtro: emptyOtro(),
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
  const wallSlotCount =
    typeof wallSlotCountRaw === "number" && Number.isFinite(wallSlotCountRaw)
      ? Math.min(20, Math.max(0, Math.floor(wallSlotCountRaw)))
      : d.wallSlotCount;

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

  let lightingOtroInDocument = r.lightingOtroInDocument === true;
  if (!lightingOtroInDocument && (lightingOtro.descripcion.trim() !== "" || medidasCamposTieneValor(lightingOtro))) {
    lightingOtroInDocument = true;
  }

  const largoGen = typeof r.largo === "string" ? r.largo : undefined;
  const altoGen = typeof r.alto === "string" ? r.alto : undefined;

  return {
    conIsla,
    largo: largoGen,
    alto: altoGen,
    sectionComments,
    wallSlotCount,
    wallMeasures: normalizeWallMeasuresPayload(r.wallMeasures),
    wallOtro,
    applianceDocumentIds,
    applianceOtroInDocument,
    applianceMeasures,
    applianceOtro,
    lightingSelectedIds,
    lightingOtroInDocument,
    lightingMeasures,
    lightingOtro,
  };
}
