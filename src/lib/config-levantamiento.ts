export const LEVANTAMIENTO_CONFIG_STORAGE_KEY = "kuche.config.levantamiento.v2";

import { runtimeStore } from "@/lib/runtime-store";

export type MaterialCategoria = "cubierta" | "frente" | "herraje";
export type MaterialGama = "Estandar" | "Tendencia" | "Premium";

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
  extrasPrecios: {
    iluminacion: Record<string, number>;
    accesoriosEspeciales: Record<string, number>;
  };
  extrasIluminacionCantidades: Record<string, number>;
}

function defaultMateriales(): MaterialConfig[] {
  return [
    { id: "cub-est-1", nombre: "Laminado Blanco Nieve", categoria: "cubierta", gama: "Estandar", precioPorMetro: 1800 },
    { id: "cub-est-2", nombre: "Granito San Gabriel", categoria: "cubierta", gama: "Estandar", precioPorMetro: 2200 },
    { id: "cub-tend-1", nombre: "Cuarzo Clásico", categoria: "cubierta", gama: "Tendencia", precioPorMetro: 3400 },
    { id: "cub-tend-2", nombre: "Porcelánico Terrazzo", categoria: "cubierta", gama: "Tendencia", precioPorMetro: 3600 },
    { id: "cub-prem-1", nombre: "Mármol Calacatta", categoria: "cubierta", gama: "Premium", precioPorMetro: 5200 },
    { id: "cub-prem-2", nombre: "Piedra sinterizada XL", categoria: "cubierta", gama: "Premium", precioPorMetro: 5800 },
    { id: "fre-est-1", nombre: "Melamina blanca", categoria: "frente", gama: "Estandar", precioPorMetro: 950 },
    { id: "fre-est-2", nombre: "MDF hidrófugo", categoria: "frente", gama: "Estandar", precioPorMetro: 1100 },
    { id: "fre-tend-1", nombre: "Laca semimate", categoria: "frente", gama: "Tendencia", precioPorMetro: 2100 },
    { id: "fre-tend-2", nombre: "Chapa nogal", categoria: "frente", gama: "Tendencia", precioPorMetro: 1950 },
    { id: "fre-prem-1", nombre: "Laca alto brillo", categoria: "frente", gama: "Premium", precioPorMetro: 3600 },
    { id: "fre-prem-2", nombre: "Madera maciza", categoria: "frente", gama: "Premium", precioPorMetro: 3400 },
    { id: "her-est-1", nombre: "Bisagra estándar", categoria: "herraje", gama: "Estandar", precioPorMetro: 750 },
    { id: "her-est-2", nombre: "Corredera básica", categoria: "herraje", gama: "Estandar", precioPorMetro: 850 },
    { id: "her-tend-1", nombre: "Soft-close", categoria: "herraje", gama: "Tendencia", precioPorMetro: 1550 },
    { id: "her-tend-2", nombre: "Push to open", categoria: "herraje", gama: "Tendencia", precioPorMetro: 1450 },
    { id: "her-prem-1", nombre: "Servo drive", categoria: "herraje", gama: "Premium", precioPorMetro: 2600 },
    { id: "her-prem-2", nombre: "Guías ocultas premium", categoria: "herraje", gama: "Premium", precioPorMetro: 2400 },
  ];
}

export function createDefaultLevantamientoConfig(): LevantamientoConfig {
  return {
    scenarioPrices: { esencial: 5000, tendencia: 10000, premium: 15000 },
    materiales: defaultMateriales(),
    ivaPercent: 0.16,
    marginPercent: 0.08,
    extrasPrecios: {
      iluminacion: {
        "led-bajo": 250,
        spots: 120,
        colgante: 450,
        "perfil-led": 300,
        indirecta: 180,
        sensor: 220,
        sink: 180,
        "foco-ajustable": 160,
        "tira-vitrina": 140,
      },
      accesoriosEspeciales: {},
    },
    extrasIluminacionCantidades: {},
  };
}

export function getLevantamientoConfig(): LevantamientoConfig {
  if (typeof window === "undefined") return createDefaultLevantamientoConfig();
  try {
    const raw = runtimeStore.getItem(LEVANTAMIENTO_CONFIG_STORAGE_KEY);
    if (!raw) return createDefaultLevantamientoConfig();
    const parsed = JSON.parse(raw) as Partial<LevantamientoConfig>;
    const base = createDefaultLevantamientoConfig();
    return {
      scenarioPrices: {
        esencial: Number(parsed.scenarioPrices?.esencial) || base.scenarioPrices.esencial,
        tendencia: Number(parsed.scenarioPrices?.tendencia) || base.scenarioPrices.tendencia,
        premium: Number(parsed.scenarioPrices?.premium) || base.scenarioPrices.premium,
      },
      materiales:
        Array.isArray(parsed.materiales) && parsed.materiales.length > 0
          ? parsed.materiales.map((m, i) => ({
              id: typeof m.id === "string" ? m.id : `mat-${i}`,
              nombre: typeof m.nombre === "string" ? m.nombre : "Material",
              categoria:
                m.categoria === "cubierta" || m.categoria === "frente" || m.categoria === "herraje"
                  ? m.categoria
                  : "cubierta",
              gama:
                m.gama === "Estandar" || m.gama === "Tendencia" || m.gama === "Premium"
                  ? m.gama
                  : "Estandar",
              precioPorMetro: Math.max(0, Number(m.precioPorMetro) || 0),
            }))
          : base.materiales,
      ivaPercent:
        typeof parsed.ivaPercent === "number" && Number.isFinite(parsed.ivaPercent)
          ? Math.min(1, Math.max(0, parsed.ivaPercent))
          : base.ivaPercent,
      marginPercent:
        typeof parsed.marginPercent === "number" && Number.isFinite(parsed.marginPercent)
          ? Math.min(0.5, Math.max(0, parsed.marginPercent))
          : base.marginPercent,
      extrasPrecios:
        typeof parsed.extrasPrecios === "object" && parsed.extrasPrecios
          ? {
              iluminacion: typeof parsed.extrasPrecios?.iluminacion === "object"
                ? parsed.extrasPrecios.iluminacion
                : base.extrasPrecios!.iluminacion,
              accesoriosEspeciales: typeof parsed.extrasPrecios?.accesoriosEspeciales === "object"
                ? parsed.extrasPrecios.accesoriosEspeciales
                : base.extrasPrecios!.accesoriosEspeciales,
            }
          : base.extrasPrecios,
      extrasIluminacionCantidades:
        typeof parsed.extrasIluminacionCantidades === "object" && parsed.extrasIluminacionCantidades
          ? parsed.extrasIluminacionCantidades
          : base.extrasIluminacionCantidades,
    };
  } catch {
    return createDefaultLevantamientoConfig();
  }
}

export function saveLevantamientoConfig(config: Partial<LevantamientoConfig> | LevantamientoConfig): LevantamientoConfig {
  const normalized = normalizeLevantamientoConfig(config as Partial<LevantamientoConfig>);
  if (typeof window === "undefined") return normalized;
  try {
    runtimeStore.setItem(LEVANTAMIENTO_CONFIG_STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent("kuche:levantamiento-config-updated"));
  } catch {
    // ignore
  }
  return normalized;
}

export function resetLevantamientoConfigToDefault(): LevantamientoConfig {
  const fresh = createDefaultLevantamientoConfig();
  saveLevantamientoConfig(fresh);
  return fresh;
}

/**
 * Promedio de precioPorMetro para materiales que coinciden en categoría y gama.
 */
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

export function parseFlexiblePercentInput(value: string | number): number {
  if (typeof value === "number") return Math.max(0, Math.min(1, value));
  const trimmed = String(value).trim();
  if (trimmed.endsWith("%")) {
    const n = parseFloat(trimmed.replace("%", ""));
    if (Number.isFinite(n)) return Math.max(0, Math.min(1, n / 100));
  }
  const parsed = parseFloat(trimmed);
  if (Number.isFinite(parsed)) return Math.max(0, Math.min(1, parsed));
  return 0;
}

export function normalizeLevantamientoConfig(raw: Partial<LevantamientoConfig> | undefined): LevantamientoConfig {
  const base = createDefaultLevantamientoConfig();
  if (!raw) return base;
  return {
    scenarioPrices: {
      esencial: Number(raw.scenarioPrices?.esencial) || base.scenarioPrices.esencial,
      tendencia: Number(raw.scenarioPrices?.tendencia) || base.scenarioPrices.tendencia,
      premium: Number(raw.scenarioPrices?.premium) || base.scenarioPrices.premium,
    },
    materiales:
      Array.isArray(raw.materiales) && raw.materiales.length > 0
        ? raw.materiales.map((m, i) => ({
            id: typeof m.id === "string" ? m.id : `mat-${i}`,
            nombre: typeof m.nombre === "string" ? m.nombre : "Material",
            categoria:
              m.categoria === "cubierta" || m.categoria === "frente" || m.categoria === "herraje"
                ? m.categoria
                : "cubierta",
            gama: m.gama === "Estandar" || m.gama === "Tendencia" || m.gama === "Premium" ? m.gama : "Estandar",
            precioPorMetro: Math.max(0, Number(m.precioPorMetro) || 0),
          }))
        : base.materiales,
    ivaPercent: parseFlexiblePercentInput(raw.ivaPercent ?? base.ivaPercent),
    marginPercent: parseFlexiblePercentInput(raw.marginPercent ?? base.marginPercent),
  };
}
