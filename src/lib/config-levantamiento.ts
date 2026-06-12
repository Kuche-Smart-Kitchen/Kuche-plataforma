import { LIGHTING_ITEMS, SPECIAL_ACCESSORIES_ITEMS } from "@/lib/levantamiento-catalog";

export const LEVANTAMIENTO_CONFIG_STORAGE_KEY = "kuche.config.levantamiento.v2";

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

function mergeExtrasPreciosMap(
  defaults: Record<string, number>,
  partial: unknown,
): Record<string, number> {
  const out = { ...defaults };
  if (typeof partial !== "object" || partial === null) return out;
  const p = partial as Record<string, unknown>;
  for (const id of Object.keys(defaults)) {
    const v = p[id];
    if (typeof v === "number" && Number.isFinite(v)) {
      out[id] = Math.max(0, v);
    } else if (typeof v === "string" && v.trim() !== "") {
      const n = Number.parseFloat(v.replace(",", "."));
      if (Number.isFinite(n)) out[id] = Math.max(0, n);
    }
  }
  return out;
}

export function mergeExtrasPrecios(raw: unknown, base: ExtrasPreciosConfig): ExtrasPreciosConfig {
  if (typeof raw !== "object" || raw === null) return base;
  const r = raw as Partial<ExtrasPreciosConfig>;
  return {
    iluminacion: mergeExtrasPreciosMap(base.iluminacion, r.iluminacion),
    accesoriosEspeciales: mergeExtrasPreciosMap(base.accesoriosEspeciales, r.accesoriosEspeciales),
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

export function getLevantamientoConfig(): LevantamientoConfig {
  if (typeof window === "undefined") return createDefaultLevantamientoConfig();
  try {
    const raw = window.localStorage.getItem(LEVANTAMIENTO_CONFIG_STORAGE_KEY);
    if (!raw) return createDefaultLevantamientoConfig();
    const parsed = JSON.parse(raw) as Partial<LevantamientoConfig>;
    const base = createDefaultLevantamientoConfig();
    const extrasBase = defaultExtrasPrecios();
    return {
      scenarioPrices: {
        esencial: Number(parsed.scenarioPrices?.esencial) || base.scenarioPrices.esencial,
        tendencia: Number(parsed.scenarioPrices?.tendencia) || base.scenarioPrices.tendencia,
        premium: Number(parsed.scenarioPrices?.premium) || base.scenarioPrices.premium,
      },
      materiales:
        Array.isArray(parsed.materiales) && parsed.materiales.length > 0
          ? parsed.materiales.map((m, i) => {
              const row: MaterialConfig = {
                id: typeof m.id === "string" ? m.id : `mat-${i}`,
                nombre: typeof m.nombre === "string" ? m.nombre : "Material",
                categoria:
                  m.categoria === "cubierta" || m.categoria === "frente" || m.categoria === "herraje"
                    ? m.categoria
                    : "cubierta",
                precioPorMetro: Math.max(0, Number(m.precioPorMetro) || 0),
              };
              if (m.gama === "Estandar" || m.gama === "Tendencia" || m.gama === "Premium") {
                row.gama = m.gama;
              }
              return row;
            })
          : base.materiales,
      ivaPercent:
        typeof parsed.ivaPercent === "number" && Number.isFinite(parsed.ivaPercent)
          ? Math.min(1, Math.max(0, parsed.ivaPercent))
          : base.ivaPercent,
      marginPercent:
        typeof parsed.marginPercent === "number" && Number.isFinite(parsed.marginPercent)
          ? Math.min(0.5, Math.max(0, parsed.marginPercent))
          : base.marginPercent,
      factorHastaTecho:
        typeof parsed.factorHastaTecho === "number" && Number.isFinite(parsed.factorHastaTecho)
          ? Math.min(5, Math.max(1, parsed.factorHastaTecho))
          : base.factorHastaTecho,
      extrasPrecios: mergeExtrasPrecios(parsed.extrasPrecios, extrasBase),
    };
  } catch {
    return createDefaultLevantamientoConfig();
  }
}

export function saveLevantamientoConfig(config: LevantamientoConfig): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(LEVANTAMIENTO_CONFIG_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent("kuche:levantamiento-config-updated"));
    return true;
  } catch {
    return false;
  }
}

export function resetLevantamientoConfigToDefault(): LevantamientoConfig {
  const fresh = createDefaultLevantamientoConfig();
  saveLevantamientoConfig(fresh);
  return fresh;
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
