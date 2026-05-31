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
  factorHastaTecho: number;
}

function defaultMateriales(): MaterialConfig[] {
  return [];
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
    factorHastaTecho: 0,
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
      factorHastaTecho:
        typeof parsed.factorHastaTecho === "number" && Number.isFinite(parsed.factorHastaTecho)
          ? Math.min(1, Math.max(0, parsed.factorHastaTecho))
          : base.factorHastaTecho,
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

export function parseFlexiblePercentInput(value: string | number, max = 1): number {
  let v: number;
  if (typeof value === "number") v = value;
  else {
    const trimmed = String(value).trim();
    if (trimmed.endsWith("%")) {
      const n = parseFloat(trimmed.replace("%", ""));
      v = Number.isFinite(n) ? n / 100 : 0;
    } else {
      const parsed = parseFloat(trimmed);
      v = Number.isFinite(parsed) ? parsed : 0;
    }
  }
  v = Math.max(0, v);
  return Math.min(max, v);
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
    extrasPrecios:
      typeof raw.extrasPrecios === "object" && raw.extrasPrecios
        ? {
            iluminacion: typeof raw.extrasPrecios?.iluminacion === "object"
              ? raw.extrasPrecios.iluminacion
              : base.extrasPrecios!.iluminacion,
            accesoriosEspeciales:
              typeof raw.extrasPrecios?.accesoriosEspeciales === "object"
                ? raw.extrasPrecios.accesoriosEspeciales
                : base.extrasPrecios!.accesoriosEspeciales,
          }
        : base.extrasPrecios,
    extrasIluminacionCantidades:
      typeof raw.extrasIluminacionCantidades === "object" && raw.extrasIluminacionCantidades
        ? raw.extrasIluminacionCantidades
        : base.extrasIluminacionCantidades,
    factorHastaTecho:
      typeof raw.factorHastaTecho === "number" && Number.isFinite(raw.factorHastaTecho)
        ? Math.min(1, Math.max(0, raw.factorHastaTecho))
        : base.factorHastaTecho,
  };
}
