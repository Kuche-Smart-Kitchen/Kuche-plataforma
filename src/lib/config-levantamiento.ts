import { LIGHTING_ITEMS, SPECIAL_ACCESSORIES_ITEMS } from "@/lib/levantamiento-catalog";

export type MaterialCategoria = "cubierta" | "frente" | "herraje";

/** @deprecated Las gamas de material ya no clasifican el catálogo; solo persisten en datos viejos de localStorage. */
export type MaterialGama = "Estandar" | "Tendencia" | "Premium";

export interface MaterialConfig {
  id: string;
  nombre: string;
  categoria: MaterialCategoria;
  precioPorMetro: number;
  /** @deprecated Ignorado en lógica nueva; puede existir en datos guardados antes de la migración. */
  gama?: MaterialGama;
}

/** Precios unitarios fijos (MXN) para iluminación y accesorios especiales del Levantamiento Detallado. */
export type ExtrasPreciosConfig = {
  iluminacion: Record<string, number>;
  accesoriosEspeciales: Record<string, number>;
};

export function defaultExtrasPrecios(): ExtrasPreciosConfig {
  return {
    iluminacion: Object.fromEntries(
      LIGHTING_ITEMS.map((i) => [i.id, Math.max(0, Number(i.precioFijo) || 0)]),
    ),
    accesoriosEspeciales: Object.fromEntries(
      SPECIAL_ACCESSORIES_ITEMS.map((i) => [
        i.id,
        Math.max(0, Number(i.precioBase ?? i.precioFijo) || 0),
      ]),
    ),
  };
}



export interface LevantamientoConfig {
  scenarioPrices: { esencial: number; tendencia: number; premium: number };
  materiales: MaterialConfig[];
  ivaPercent: number;
  marginPercent: number;
  /** Multiplicador de frentes y herrajes (lineal) cuando la cocina es hasta el techo. No aplica a cubiertas. */
  factorHastaTecho: number;
  /** Precios unitarios (MXN) para catálogo de iluminación y accesorios especiales (sección E). */
  extrasPrecios: ExtrasPreciosConfig;
}

/**
 * Catálogo oficial por defecto (precios $/m). Misma lista que el showroom del Levantamiento Detallado.
 */
export const DEFAULT_LEVANTAMIENTO_MATERIALES: MaterialConfig[] = [
  { id: "cub-cuarcita", nombre: "Cuarcita", categoria: "cubierta", precioPorMetro: 7000 },
  { id: "cub-formaica", nombre: "Formaica", categoria: "cubierta", precioPorMetro: 1800 },
  { id: "cub-granito", nombre: "Granito", categoria: "cubierta", precioPorMetro: 4000 },
  { id: "cub-cuarzo", nombre: "Cuarzo", categoria: "cubierta", precioPorMetro: 5500 },
  { id: "cub-cubierta-solida", nombre: "Cubierta solida", categoria: "cubierta", precioPorMetro: 6000 },
  { id: "cub-marmol", nombre: "Mármol", categoria: "cubierta", precioPorMetro: 3500 },
  { id: "cub-piedra-sinterizada", nombre: "Piedra sinterizada", categoria: "cubierta", precioPorMetro: 6500 },
  { id: "fre-enchapados-naturales", nombre: "Enchapados naturales", categoria: "frente", precioPorMetro: 4000 },
  { id: "fre-premium", nombre: "Premium", categoria: "frente", precioPorMetro: 10000 },
  { id: "fre-melamina-1-estandar", nombre: "1 Melamina estandar", categoria: "frente", precioPorMetro: 3500 },
  { id: "fre-madera-solida", nombre: "Madera solida", categoria: "frente", precioPorMetro: 6000 },
  { id: "fre-melamina-2-tendencia", nombre: "2 Melamina Tendencia", categoria: "frente", precioPorMetro: 4500 },
  { id: "fre-altos-brillos", nombre: "Altos Brillos", categoria: "frente", precioPorMetro: 7500 },
  { id: "fre-supermates", nombre: "Supermates", categoria: "frente", precioPorMetro: 8000 },
  { id: "her-basico", nombre: "Basico", categoria: "herraje", precioPorMetro: 500 },
  {
    id: "her-intermedio",
    nombre: "Intermedio (cierre lento / push to open)",
    categoria: "herraje",
    precioPorMetro: 1000,
  },
  { id: "her-alta", nombre: "Alta", categoria: "herraje", precioPorMetro: 2000 },
  { id: "her-premium", nombre: "Premium", categoria: "herraje", precioPorMetro: 4000 },
];

function defaultMateriales(): MaterialConfig[] {
  return DEFAULT_LEVANTAMIENTO_MATERIALES.map((m) => ({ ...m }));
}

export function createDefaultLevantamientoConfig(): LevantamientoConfig {
  return {
    scenarioPrices: { esencial: 5000, tendencia: 10000, premium: 15000 },
    materiales: defaultMateriales(),
    ivaPercent: 0.16,
    marginPercent: 0.08,
    factorHastaTecho: 1.25,
    extrasPrecios: defaultExtrasPrecios(),
  };
}

/** Sin persistencia: siempre entrega el catálogo por defecto. */
export function getLevantamientoConfig(): LevantamientoConfig {
  return createDefaultLevantamientoConfig();
}

/** Sin persistencia: no guarda nada, se mantiene la firma para no romper llamadores. */
export function saveLevantamientoConfig(_config: LevantamientoConfig): boolean {
  return false;
}

export function resetLevantamientoConfigToDefault(): LevantamientoConfig {
  return createDefaultLevantamientoConfig();
}

/** Promedio de precioPorMetro en una categoría (respaldo si no hay match por id/nombre). */
export function getAveragePrecioPorCategoria(materiales: MaterialConfig[], categoria: MaterialCategoria): number {
  const list = materiales.filter((m) => m.categoria === categoria);
  if (list.length === 0) return 0;
  const sum = list.reduce((acc, m) => acc + (Number.isFinite(m.precioPorMetro) ? m.precioPorMetro : 0), 0);
  return sum / list.length;
}

function normalizeMaterialName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}|\uFEFF/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Selección del showroom (id + nombre visibles), alineada al catálogo de configuración. */
export type ShowroomMaterialPick = {
  id: string;
  name: string;
};

/**
 * Precio $/m del material en configuración para una opción del showroom.
 * Orden: id exacto en config → coincidencia por nombre → promedio por categoría.
 */
export function resolvePrecioPorMetroForShowroomSelection(
  materiales: MaterialConfig[],
  categoria: MaterialCategoria,
  selection: ShowroomMaterialPick | null | undefined,
): number {
  if (!selection) return 0;
  const byId = materiales.find((m) => m.id === selection.id);
  if (byId && Number.isFinite(byId.precioPorMetro)) return Math.max(0, byId.precioPorMetro);

  const n = normalizeMaterialName(selection.name);
  const pool = materiales.filter((m) => m.categoria === categoria);
  let hit = pool.find((m) => normalizeMaterialName(m.nombre) === n);
  if (hit && Number.isFinite(hit.precioPorMetro)) return Math.max(0, hit.precioPorMetro);
  hit = pool.find((m) => {
    const mn = normalizeMaterialName(m.nombre);
    return mn.includes(n) || n.includes(mn);
  });
  if (hit && Number.isFinite(hit.precioPorMetro)) return Math.max(0, hit.precioPorMetro);

  return getAveragePrecioPorCategoria(materiales, categoria);
}
