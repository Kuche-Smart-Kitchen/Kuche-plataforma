export const LEVANTAMIENTO_CONFIG_STORAGE_KEY = "kuche.config.levantamiento.v2";

export type MaterialCategoria = "cubierta" | "frente" | "herraje";
export type MaterialGama = "Estandar" | "Tendencia" | "Premium";

export interface ExtrasPreciosConfig {
  iluminacion: Record<string, number>;
  accesoriosEspeciales: Record<string, number>;
}

export interface MaterialConfig {
  id: string;
  nombre: string;
  categoria: MaterialCategoria;
  gama: MaterialGama;
  precioPorMetro: number;
}

export interface LevantamientoConfig {
  scenarioPrices: { esencial: number; tendencia: number; premium: number };
  materiales: MaterialConfig[];
  ivaPercent: number;
  marginPercent: number;
  factorHastaTecho: number;
  extrasIluminacionCantidades: Record<string, number>;
  extrasPrecios: ExtrasPreciosConfig;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function clampIvaPercent(value: number): number {
  return clamp(Number.isFinite(value) ? value : 0.16, 0, 1);
}

export function clampMarginPercent(value: number): number {
  return clamp(Number.isFinite(value) ? value : 0.08, 0, 0.5);
}

export function clampFactorHastaTecho(value: number): number {
  return clamp(Number.isFinite(value) ? value : 0.2, 0, 1);
}

/**
 * Acepta fracción (0.16) o porcentaje humano (16) y normaliza al rango permitido.
 */
export function parseFlexiblePercentInput(raw: string | number, maxFraction = 0.5): number {
  const parsed = typeof raw === "number" ? raw : Number.parseFloat(raw.replace(",", "."));
  if (!Number.isFinite(parsed)) return 0;
  const asFraction = parsed > maxFraction && parsed <= maxFraction * 100 ? parsed / 100 : parsed;
  return clamp(asFraction, 0, maxFraction);
}

export function defaultExtrasPrecios(): ExtrasPreciosConfig {
  return {
    iluminacion: {},
    accesoriosEspeciales: {},
  };
}

function defaultMateriales(): MaterialConfig[] {
  return [
    { id: "cub-est-1", nombre: "Laminado Blanco Nieve", categoria: "cubierta", gama: "Estandar", precioPorMetro: 1800 },
    { id: "cub-est-2", nombre: "Granito San Gabriel", categoria: "cubierta", gama: "Estandar", precioPorMetro: 2200 },
    { id: "cub-tend-1", nombre: "Cuarzo Clasico", categoria: "cubierta", gama: "Tendencia", precioPorMetro: 3400 },
    { id: "cub-tend-2", nombre: "Porcelanico Terrazzo", categoria: "cubierta", gama: "Tendencia", precioPorMetro: 3600 },
    { id: "cub-prem-1", nombre: "Marmol Calacatta", categoria: "cubierta", gama: "Premium", precioPorMetro: 5200 },
    { id: "cub-prem-2", nombre: "Piedra sinterizada XL", categoria: "cubierta", gama: "Premium", precioPorMetro: 5800 },
    { id: "fre-est-1", nombre: "Melamina blanca", categoria: "frente", gama: "Estandar", precioPorMetro: 950 },
    { id: "fre-est-2", nombre: "MDF hidrofugo", categoria: "frente", gama: "Estandar", precioPorMetro: 1100 },
    { id: "fre-tend-1", nombre: "Laca semimate", categoria: "frente", gama: "Tendencia", precioPorMetro: 2100 },
    { id: "fre-tend-2", nombre: "Chapa nogal", categoria: "frente", gama: "Tendencia", precioPorMetro: 1950 },
    { id: "fre-prem-1", nombre: "Laca alto brillo", categoria: "frente", gama: "Premium", precioPorMetro: 3600 },
    { id: "fre-prem-2", nombre: "Madera maciza", categoria: "frente", gama: "Premium", precioPorMetro: 3400 },
    { id: "her-est-1", nombre: "Bisagra estandar", categoria: "herraje", gama: "Estandar", precioPorMetro: 750 },
    { id: "her-est-2", nombre: "Corredera basica", categoria: "herraje", gama: "Estandar", precioPorMetro: 850 },
    { id: "her-tend-1", nombre: "Soft-close", categoria: "herraje", gama: "Tendencia", precioPorMetro: 1550 },
    { id: "her-tend-2", nombre: "Push to open", categoria: "herraje", gama: "Tendencia", precioPorMetro: 1450 },
    { id: "her-prem-1", nombre: "Servo drive", categoria: "herraje", gama: "Premium", precioPorMetro: 2600 },
    { id: "her-prem-2", nombre: "Guias ocultas premium", categoria: "herraje", gama: "Premium", precioPorMetro: 2400 },
  ];
}

export function createDefaultLevantamientoConfig(): LevantamientoConfig {
  return {
    scenarioPrices: { esencial: 4500, tendencia: 9000, premium: 13500 },
    materiales: defaultMateriales(),
    ivaPercent: clampIvaPercent(0.16),
    marginPercent: clampMarginPercent(0.08),
    factorHastaTecho: clampFactorHastaTecho(0.2),
    extrasIluminacionCantidades: {},
    extrasPrecios: defaultExtrasPrecios(),
  };
}

function normalizeMaterialCategoria(raw: unknown): MaterialCategoria {
  const v = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (v === "cubierta" || v === "frente" || v === "herraje") return v;
  return "frente";
}

function normalizeMaterialGama(raw: unknown): MaterialGama {
  const v = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (v === "estandar") return "Estandar";
  if (v === "tendencia") return "Tendencia";
  if (v === "premium") return "Premium";
  return "Tendencia";
}

function normalizeNumberMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const entries = Object.entries(raw as Record<string, unknown>).map(([key, value]) => {
    const parsed = Number(value);
    return [key, Number.isFinite(parsed) ? Math.max(0, parsed) : 0] as const;
  });
  return Object.fromEntries(entries);
}

export function normalizeLevantamientoConfig(raw: unknown): LevantamientoConfig {
  const defaults = createDefaultLevantamientoConfig();
  if (!raw || typeof raw !== "object") return defaults;
  const input = raw as Partial<LevantamientoConfig> & Record<string, unknown>;

  const scenario = input.scenarioPrices && typeof input.scenarioPrices === "object"
    ? (input.scenarioPrices as Record<string, unknown>)
    : {};

  const materiales = Array.isArray(input.materiales)
    ? input.materiales
        .map((item, index) => {
          if (!item || typeof item !== "object") return null;
          const m = item as Record<string, unknown>;
          const nombre = typeof m.nombre === "string" ? m.nombre.trim() : "";
          if (!nombre) return null;
          const id = typeof m.id === "string" && m.id.trim() ? m.id.trim() : `mat-${index + 1}`;
          const precio = Number(m.precioPorMetro);
          return {
            id,
            nombre,
            categoria: normalizeMaterialCategoria(m.categoria),
            gama: normalizeMaterialGama(m.gama),
            precioPorMetro: Number.isFinite(precio) ? Math.max(0, precio) : 0,
          } satisfies MaterialConfig;
        })
        .filter((item): item is MaterialConfig => item !== null)
    : defaults.materiales;

  const extras = input.extrasPrecios && typeof input.extrasPrecios === "object"
    ? (input.extrasPrecios as Record<string, unknown>)
    : {};

  return {
    scenarioPrices: {
      esencial: Math.max(0, Number(scenario.esencial) || defaults.scenarioPrices.esencial),
      tendencia: Math.max(0, Number(scenario.tendencia) || defaults.scenarioPrices.tendencia),
      premium: Math.max(0, Number(scenario.premium) || defaults.scenarioPrices.premium),
    },
    materiales: materiales.length > 0 ? materiales : defaults.materiales,
    ivaPercent: clampIvaPercent(Number(input.ivaPercent)),
    marginPercent: clampMarginPercent(Number(input.marginPercent)),
    factorHastaTecho: clampFactorHastaTecho(Number(input.factorHastaTecho)),
    extrasIluminacionCantidades: normalizeNumberMap(input.extrasIluminacionCantidades),
    extrasPrecios: {
      iluminacion: normalizeNumberMap(extras.iluminacion),
      accesoriosEspeciales: normalizeNumberMap(extras.accesoriosEspeciales),
    },
  };
}

function dispatchLevantamientoConfigUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("kuche:levantamiento-config-updated"));
}

export function getLevantamientoConfig(): LevantamientoConfig {
  if (typeof window === "undefined") return createDefaultLevantamientoConfig();
  try {
    const stored = window.localStorage.getItem(LEVANTAMIENTO_CONFIG_STORAGE_KEY);
    if (!stored) return createDefaultLevantamientoConfig();
    return normalizeLevantamientoConfig(JSON.parse(stored));
  } catch {
    return createDefaultLevantamientoConfig();
  }
}

export function saveLevantamientoConfig(nextConfig: LevantamientoConfig): LevantamientoConfig {
  const normalized = normalizeLevantamientoConfig(nextConfig);
  if (typeof window === "undefined") return normalized;
  window.localStorage.setItem(LEVANTAMIENTO_CONFIG_STORAGE_KEY, JSON.stringify(normalized));
  dispatchLevantamientoConfigUpdated();
  return normalized;
}

export function restoreDefaultLevantamientoConfig(): LevantamientoConfig {
  const defaults = createDefaultLevantamientoConfig();
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LEVANTAMIENTO_CONFIG_STORAGE_KEY, JSON.stringify(defaults));
    dispatchLevantamientoConfigUpdated();
  }
  return defaults;
}

export function getAveragePriceByTier(
  materiales: MaterialConfig[],
  categoria: MaterialCategoria,
  gama: MaterialGama,
): number {
  const list = materiales.filter((m) => m.categoria === categoria && m.gama === gama);
  if (list.length === 0) return 0;
  const sum = list.reduce((acc, m) => acc + (Number.isFinite(m.precioPorMetro) ? m.precioPorMetro : 0), 0);
  return sum / list.length;
}