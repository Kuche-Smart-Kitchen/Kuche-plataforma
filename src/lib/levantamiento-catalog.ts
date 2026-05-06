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
};

export const WALL_ITEMS: ItemCatalogo[] = [
  {
    id: "pared-recta",
    label: "Pared recta (corrida)",
    hint: "Muro principal sin cortes",
    image: "/images/materiales/white_seamless_texture.jpg",
  },
  {
    id: "pared-ventana",
    label: "Pared con ventana",
    hint: "Hueco ventana / vano",
    image: "/images/materiales/white_marble_texture.jpg",
  },
  {
    id: "pared-puerta",
    label: "Pared con puerta",
    hint: "Acceso a otro espacio",
    image: "/images/materiales/walnut_wood_texture.jpg",
  },
  {
    id: "esquina-90",
    label: "Esquina 90°",
    hint: "Encuentro de dos muros",
    image: "/images/materiales/stone_texture.jpg",
  },
  {
    id: "pared-nicho",
    label: "Pared con nicho",
    hint: "Hueco empotrado",
    image: "/images/materiales/smooth_stone.jpg",
  },
  {
    id: "pared-media-altura",
    label: "Pared media altura / barra",
    hint: "Desnivel o antepecho",
    image: "/images/materiales/plywood_texture.jpg",
  },
  {
    id: "pared-divisoria",
    label: "Pared divisoria",
    hint: "Tabique interior",
    image: "/images/materiales/dark_wood_background.jpg",
  },
  {
    id: "falso-muro",
    label: "Falso muro / tabique liviano",
    hint: "Espesor reducido",
    image: "/images/materiales/white_seamless_texture.jpg",
  },
  {
    id: "pared-salientes",
    label: "Pared con salientes (ducto / bajante)",
    hint: "Retrasos o desnivel",
    image: "/images/materiales/terazzo_texture.jpg",
  },
  {
    id: "pared-l",
    label: "Pared en L / retorno",
    hint: "Cambio de eje",
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
  "esquina-90": "esquina-90grados",
  "pared-nicho": "pared-con-nicho",
  "pared-media-altura": "pared-media-altura-barra",
  "pared-divisoria": "pared-divisora",
  "pared-salientes": "pared-con-salientes",
  "pared-l": "pared-en-L",
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

/** Páginas 1–3: índices en WALL_ITEMS; página 4 = “Otro”. */
export const WALL_PAGE_INDICES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8, 9],
];

/** Definición de cada medida (clave estable + etiqueta en UI y PDF). */
export type WallMeasureFieldDef = {
  key: string;
  label: string;
};

/**
 * Medidas sugeridas por tipo de muro (metros salvo nota). Orden = orden en formulario y PDF.
 */
export const WALL_MEASURE_SCHEMA: Record<string, WallMeasureFieldDef[]> = {
  "pared-recta": [
    { key: "largo-corrido", label: "Largo corrido" },
    { key: "altura-techo", label: "Altura hasta techo" },
    { key: "espesor-muro", label: "Espesor del muro" },
  ],
  "pared-ventana": [
    { key: "largo-muro", label: "Largo total del muro" },
    { key: "ancho-vano", label: "Ancho del vano" },
    { key: "alto-vano", label: "Alto del vano" },
    { key: "antepecho", label: "Antepecho (suelo → inferior ventana)" },
    { key: "dist-inicio-vano", label: "Dist. inicio corrido → vano" },
  ],
  "pared-puerta": [
    { key: "largo-muro", label: "Largo total del muro" },
    { key: "ancho-vano", label: "Ancho del vano / hoja" },
    { key: "alto-vano", label: "Alto del vano" },
    { key: "dist-marco-referencia", label: "Dist. marco a esquina o referencia" },
  ],
  "esquina-90": [
    { key: "pata-1", label: "Longitud pata 1" },
    { key: "pata-2", label: "Longitud pata 2" },
    { key: "altura-techo", label: "Altura hasta techo" },
    { key: "espesor-muro", label: "Espesor del muro" },
  ],
  "pared-nicho": [
    { key: "largo-muro", label: "Largo del muro" },
    { key: "ancho-nicho", label: "Ancho del nicho" },
    { key: "profundidad-nicho", label: "Profundidad del nicho" },
    { key: "alto-nicho", label: "Alto del nicho" },
    { key: "altura-suelo-nicho", label: "Suelo → piso del nicho" },
  ],
  "pared-media-altura": [
    { key: "largo-tramo", label: "Largo del tramo" },
    { key: "altura-muro-bajo", label: "Altura muro bajo / antepecho" },
    { key: "fondo-barra", label: "Fondo / voladizo barra" },
    { key: "altura-techo", label: "Altura libre hasta techo" },
  ],
  "pared-divisoria": [
    { key: "largo", label: "Largo" },
    { key: "altura", label: "Altura" },
    { key: "espesor", label: "Espesor" },
  ],
  "falso-muro": [
    { key: "largo", label: "Largo" },
    { key: "altura", label: "Altura" },
    { key: "espesor", label: "Espesor" },
  ],
  "pared-salientes": [
    { key: "largo-tramo", label: "Largo del tramo afectado" },
    { key: "profundidad-saliente", label: "Profundidad del saliente" },
    { key: "ancho-saliente", label: "Ancho del saliente" },
    { key: "altura-saliente", label: "Altura del saliente" },
    { key: "dist-desde-inicio", label: "Dist. saliente desde inicio corrido" },
  ],
  "pared-l": [
    { key: "tramo-a", label: "Longitud tramo A" },
    { key: "tramo-b", label: "Longitud tramo B" },
    { key: "altura-techo", label: "Altura hasta techo" },
    { key: "espesor-muro", label: "Espesor del muro" },
  ],
};

export type WallMeasuresMap = Record<string, Record<string, string>>;

export function getWallMeasureFieldDefs(wallId: string): WallMeasureFieldDef[] {
  return WALL_MEASURE_SCHEMA[wallId] ?? [];
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
  return out;
}

export function wallMeasuresTieneValor(m: Record<string, string>): boolean {
  return Object.values(m).some((v) => (v ?? "").trim() !== "");
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
  for (const { key, label } of defs) {
    const v = (values[key] ?? "").trim();
    if (v) parts.push(`${label}: ${v} m`);
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
  "refri-bottom-mount": "/images/electrodomesticos/bottom-mount.png",
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
];

/** Primer índice en `APPLIANCE_ITEMS` para una categoría (para saltar desde la UI). */
export function applianceFirstIndexForCategory(categoria: string): number {
  const i = APPLIANCE_ITEMS.findIndex((x) => x.categoria === categoria);
  return i === -1 ? 0 : i;
}

/** Fotos en `public/images/levantamiento/iluminacion/` (nombres al exportar desde Documentos). */
const LIGHTING_LEVANTAMIENTO_IMAGE_BY_ID: Record<string, string> = {
  "led-bajo": "/images/levantamiento/iluminacion/led-bajo.jpg",
  spots: "/images/levantamiento/iluminacion/spots-empotrados-techo-cocina.jpg",
  colgante: "/images/levantamiento/iluminacion/lampara-colgante-isla-cocina.jpg",
  "perfil-led": "/images/levantamiento/iluminacion/perfil-led.jpg",
  indirecta: "/images/levantamiento/iluminacion/luz-indirecta-cornisa.jpg",
  sensor: "/images/levantamiento/iluminacion/sensor-led-interior.jpg",
  sink: "/images/levantamiento/iluminacion/luz-focal-fregadero.jpg",
  "foco-ajustable": "/images/levantamiento/iluminacion/foco-ajustable-riel.jpg",
  "tira-vitrina": "/images/levantamiento/iluminacion/tira-led-vitrina.jpg",
};

export function lightingLevantamientoImageCandidates(item: ItemCatalogo): string[] {
  const primary = LIGHTING_LEVANTAMIENTO_IMAGE_BY_ID[item.id] ?? item.image;
  const raw = [primary, APPLIANCE_CATALOGO_IMAGE_FALLBACK].filter((u): u is string => Boolean(u?.trim()));
  return [...new Set(raw)];
}

export const LIGHTING_ITEMS: ItemCatalogo[] = [
  {
    id: "led-bajo",
    label: "LED bajo alacena",
    image: LIGHTING_LEVANTAMIENTO_IMAGE_BY_ID["led-bajo"]!,
  },
  {
    id: "spots",
    label: "Spots empotrados techo",
    image: LIGHTING_LEVANTAMIENTO_IMAGE_BY_ID.spots!,
  },
  {
    id: "colgante",
    label: "Colgante isla / mesón",
    image: LIGHTING_LEVANTAMIENTO_IMAGE_BY_ID.colgante!,
  },
  {
    id: "perfil-led",
    label: "Perfil LED lineal",
    image: LIGHTING_LEVANTAMIENTO_IMAGE_BY_ID["perfil-led"]!,
  },
  {
    id: "indirecta",
    label: "Luz indirecta / cornisa",
    image: LIGHTING_LEVANTAMIENTO_IMAGE_BY_ID.indirecta!,
  },
  {
    id: "sensor",
    label: "Sensor / LED gabinete interior",
    image: LIGHTING_LEVANTAMIENTO_IMAGE_BY_ID.sensor!,
  },
  {
    id: "sink",
    label: "Luz focal tarja",
    image: LIGHTING_LEVANTAMIENTO_IMAGE_BY_ID.sink!,
  },
  {
    id: "foco-ajustable",
    label: "Foco ajustable riel",
    image: LIGHTING_LEVANTAMIENTO_IMAGE_BY_ID["foco-ajustable"]!,
  },
  {
    id: "tira-vitrina",
    label: "Tira LED vitrina",
    image: LIGHTING_LEVANTAMIENTO_IMAGE_BY_ID["tira-vitrina"]!,
  },
];

export const LIGHTING_PAGE_INDICES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
];

export type OtroMedidas = MedidasCampos & { descripcion: string; precioEstimado?: number };

/** Payload opcional guardado con la cotización preliminar / PDF. */
export type LevantamientoDetalle = {
  [key: string]: any;
  sectionComments: Partial<Record<"a" | "b" | "c" | "d" | "e" | "f", string>>;
  wallMeasures: WallMeasuresMap;
  wallOtro: OtroMedidas;
  applianceMeasures: Record<string, MedidasCampos>;
  applianceOtro: OtroMedidas;
  lightingMeasures: Record<string, MedidasCampos>;
  lightingOtro: OtroMedidas;
  wallSlotCount: number;
  applianceDocumentIds: string[];
  applianceOtroInDocument: boolean;
  lightingSelectedIds: string[];
  lightingOtroInDocument: boolean;
  lightingQty: Record<string, number>;
  specialAccessoriesQty: Record<string, number>;
  medidasGenerales: { hastaTecho: boolean };
  conIsla: "si" | "no" | "";
};

export function emptyOtro(): OtroMedidas {
  return { ...emptyMedidas(), descripcion: "", precioEstimado: 0 };
}

export function emptyMedidas(): MedidasCampos {
  return { ancho: "", alto: "", fondo: "" };
}

export function medidasCamposTieneValor(m: MedidasCampos): boolean {
  return [m.ancho, m.alto, m.fondo].some((v) => (v ?? "").trim() !== "");
}

export function initMeasuresMap(ids: string[]): Record<string, MedidasCampos> {
  const map: Record<string, MedidasCampos> = {};
  ids.forEach((id) => {
    map[id] = emptyMedidas();
  });
  return map;
}

export function defaultLevantamientoDetalle(): LevantamientoDetalle {
  const lightingQty = Object.fromEntries(LIGHTING_ITEMS.map((item) => [item.id, 0]));
  return {
    sectionComments: {},
    wallMeasures: initWallMeasuresMap(),
    wallOtro: emptyOtro(),
    applianceMeasures: initMeasuresMap(APPLIANCE_ITEMS.map((a) => a.id)),
    applianceOtro: emptyOtro(),
    lightingMeasures: initMeasuresMap(LIGHTING_ITEMS.map((l) => l.id)),
    lightingOtro: emptyOtro(),
    wallSlotCount: 0,
    applianceDocumentIds: [],
    applianceOtroInDocument: false,
    lightingSelectedIds: [],
    lightingOtroInDocument: false,
    lightingQty,
    specialAccessoriesQty: {},
    medidasGenerales: { hastaTecho: false },
    conIsla: "",
  };
}

/**
 * Heurística para el rango preliminar: más secciones con texto, tipos con medidas u «Otro»
 * implican más alcance de diseño/taller. No sustituye partidas ni cotización formal.
 * ~1.2% por unidad de alcance, tope +18%.
 */
export function levantamientoDetalleScopeMultiplier(lev: LevantamientoDetalle): number {
  let n = 0;
  const com = lev.sectionComments;
  for (const k of ["a", "b", "c", "d", "e", "f"] as const) {
    if (com[k]?.trim()) n += 1;
  }
  for (const m of Object.values(lev.wallMeasures)) {
    if (wallMeasuresTieneValor(m)) n += 1;
  }
  if (lev.wallOtro.descripcion.trim() || medidasCamposTieneValor(lev.wallOtro)) n += 1;
  for (const m of Object.values(lev.applianceMeasures)) {
    if (medidasCamposTieneValor(m)) n += 1;
  }
  if (lev.applianceOtro.descripcion.trim() || medidasCamposTieneValor(lev.applianceOtro)) n += 1;
  for (const m of Object.values(lev.lightingMeasures)) {
    if (medidasCamposTieneValor(m)) n += 1;
  }
  if (lev.lightingOtro.descripcion.trim() || medidasCamposTieneValor(lev.lightingOtro)) n += 1;
  return 1 + Math.min(0.18, n * 0.012);
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
          precioEstimado: Number((r.wallOtro as any).precioEstimado ?? 0) || 0,
        }
      : d.wallOtro;
  const applianceOtro =
    typeof r.applianceOtro === "object" && r.applianceOtro !== null
      ? {
          descripcion: String(r.applianceOtro.descripcion ?? ""),
          ancho: String(r.applianceOtro.ancho ?? ""),
          alto: String(r.applianceOtro.alto ?? ""),
          fondo: String(r.applianceOtro.fondo ?? ""),
          precioEstimado: Number((r.applianceOtro as any).precioEstimado ?? 0) || 0,
        }
      : d.applianceOtro;
  const lightingOtro =
    typeof r.lightingOtro === "object" && r.lightingOtro !== null
      ? {
          descripcion: String(r.lightingOtro.descripcion ?? ""),
          ancho: String(r.lightingOtro.ancho ?? ""),
          alto: String(r.lightingOtro.alto ?? ""),
          fondo: String(r.lightingOtro.fondo ?? ""),
          precioEstimado: Number((r.lightingOtro as any).precioEstimado ?? 0) || 0,
        }
      : d.lightingOtro;

  return {
    sectionComments,
    wallMeasures: normalizeWallMeasuresPayload(r.wallMeasures),
    wallOtro,
    applianceMeasures: mergeMeasuresMapFromRaw(r.applianceMeasures, APPLIANCE_ITEMS.map((a) => a.id)),
    applianceOtro,
    lightingMeasures: mergeMeasuresMapFromRaw(r.lightingMeasures, LIGHTING_ITEMS.map((l) => l.id)),
    lightingOtro,
    wallSlotCount: typeof (r as any).wallSlotCount === "number" ? Math.max(0, (r as any).wallSlotCount) : 0,
    applianceDocumentIds: Array.isArray((r as any).applianceDocumentIds) ? (r as any).applianceDocumentIds : [],
    applianceOtroInDocument: Boolean((r as any).applianceOtroInDocument),
    lightingSelectedIds: Array.isArray((r as any).lightingSelectedIds) ? (r as any).lightingSelectedIds : [],
    lightingOtroInDocument: Boolean((r as any).lightingOtroInDocument),
    lightingQty:
      typeof (r as any).lightingQty === "object" && (r as any).lightingQty !== null
        ? Object.fromEntries(
            Object.entries((r as any).lightingQty as Record<string, unknown>).map(([id, qty]) => [
              id,
              Number.isFinite(Number(qty)) ? Math.max(0, Math.floor(Number(qty))) : 0,
            ]),
          )
        : d.lightingQty,
    specialAccessoriesQty:
      typeof (r as any).specialAccessoriesQty === "object" && (r as any).specialAccessoriesQty !== null
        ? Object.fromEntries(
            Object.entries((r as any).specialAccessoriesQty as Record<string, unknown>).map(([id, qty]) => [
              id,
              Number.isFinite(Number(qty)) ? Math.max(0, Math.floor(Number(qty))) : 0,
            ]),
          )
        : d.specialAccessoriesQty,
    medidasGenerales:
      typeof (r as any).medidasGenerales === "object" && (r as any).medidasGenerales !== null
        ? { hastaTecho: Boolean((r as any).medidasGenerales.hastaTecho) }
        : d.medidasGenerales,
    conIsla: (r as any).conIsla === "si" || (r as any).conIsla === "no" ? (r as any).conIsla : "",
  };
}

/** Compatibilidad Front_plataforna */
export const WALL_SLOT_META_TYPE = "__typeId";
export const WALL_SLOT_META_ALIAS = "__alias";

export function wallSlotKey(index: number): string {
  return `wall-${index}`;
}

export function isWallSlotKey(key: string): boolean {
  return /^wall-\d+$/.test(key);
}

export function wallMeasureLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

export function wallSlotIsComplete(values: Record<string, string> | undefined): boolean {
  if (!values) return false;
  const wallId = (values[WALL_SLOT_META_TYPE] ?? "").trim();
  if (!wallId) return false;
  const defs = getWallMeasureFieldDefs(wallId);
  if (!defs.length) return false;
  return defs.every((field) => (values[field.key] ?? "").trim() !== "");
}

const DEFAULT_LIGHTING_PRICE_BY_ID: Record<string, number> = Object.fromEntries(
  LIGHTING_ITEMS.map((item) => [item.id, 1800]),
);

export function cotizacionIluminacionTotal(
  lev: LevantamientoDetalle,
  extrasPreciosIluminacion?: Record<string, number>,
): number {
  const selected = Array.isArray(lev.lightingSelectedIds) ? lev.lightingSelectedIds : [];
  const selectedSet = new Set(selected);
  const qtyMap = (lev as any).lightingQty as Record<string, unknown> | undefined;
  const bySelected = LIGHTING_ITEMS.reduce((acc, item) => {
    const rawQty = qtyMap ? Number(qtyMap[item.id]) : 0;
    const clampedQty = Number.isFinite(rawQty) ? Math.max(0, Math.min(999, Math.floor(rawQty))) : 0;
    const legacyQty = selectedSet.has(item.id) || medidasCamposTieneValor(lev.lightingMeasures[item.id] ?? emptyMedidas()) ? 1 : 0;
    const qty = clampedQty > 0 ? clampedQty : legacyQty;
    if (qty <= 0) return acc;
    const configUnit = Number(extrasPreciosIluminacion?.[item.id]);
    const fallbackUnit = DEFAULT_LIGHTING_PRICE_BY_ID[item.id] ?? 0;
    const unit = Number.isFinite(configUnit) && configUnit > 0 ? configUnit : fallbackUnit;
    return acc + qty * unit;
  }, 0);
  const otro = Number((lev.lightingOtro as any)?.precioEstimado ?? 0) || 0;
  return Math.max(0, bySelected + otro);
}

export function cotizacionAccesoriosEspecialesTotal(
  lev: LevantamientoDetalle,
  extrasPreciosAccesorios?: Record<string, number>,
): number {
  const qtyMap = (lev as any).specialAccessoriesQty as Record<string, unknown> | undefined;
  const source = qtyMap ?? {};
  return Object.entries(source).reduce((acc, [id, rawQty]) => {
    const q = Number.isFinite(Number(rawQty)) ? Math.max(0, Math.floor(Number(rawQty))) : 0;
    if (q <= 0) return acc;
    const unit = Number(extrasPreciosAccesorios?.[id]);
    const safeUnit = Number.isFinite(unit) && unit > 0 ? unit : 0;
    return acc + q * safeUnit;
  }, 0);
}
