import type { LevantamientoConfig } from "@/lib/config-levantamiento";
import { cotizacionIluminacionTotal, type LevantamientoDetalle } from "@/lib/levantamiento-catalog";
import type { MaterialCatalogState, MaterialOption } from "./showroomCatalog";
import type { ScenarioOption } from "@/components/levantamiento/LevantamientoResumen";
import { formatCurrencyMXN as formatCurrency } from "@/lib/formatters";

export type LevantamientoMetricsInput = {
  largo: string;
  selectedCubierta: string;
  selectedFrenteIds: string[];
  selectedHerraje: string;
  materialCatalog: MaterialCatalogState;
  levantamiento: LevantamientoDetalle;
  selectedScenario: "esencial" | "tendencia" | "premium";
  levantamientoConfig: LevantamientoConfig;
  applianceCatalogTotal: number;
  accessoryCatalogTotal: number;
};

export type LevantamientoMetrics = {
  largoValue: number;
  costoBase: number;
  costoMateriales: number;
  costoElectrodomesticos: number;
  costoAccesorios: number;
  costoIluminacion: number;
  subtotal: number;
  iva: number;
  total: number;
  rangeMin: number;
  rangeMax: number;
  rangeLabel: string;
  marginPercent: number;
  factorHastaTechoLegendText: string | null;
};

export function buildLevantamientoMetrics(input: LevantamientoMetricsInput): LevantamientoMetrics {
  const largoValue = Math.max(0, Number.parseFloat(input.largo) || 0);
  const factorConfig = Math.min(5, Math.max(1, input.levantamientoConfig.factorHastaTecho ?? 1.25));
  const hastaTechoActivo = input.levantamiento.medidasGenerales?.hastaTecho === true;
  const factorActivo = hastaTechoActivo ? factorConfig : 1;
  const cubierta = input.materialCatalog.cubiertas.find((item) => item.id === input.selectedCubierta);
  const herraje = input.materialCatalog.herrajes.find((item) => item.id === input.selectedHerraje);
  const sumPrecioFrentePorM = input.selectedFrenteIds.reduce((acc, fid) => {
    const f = input.materialCatalog.frentes.find((item) => item.id === fid);
    return acc + (f?.pricePerM ?? 0);
  }, 0);
  const avgCubierta = cubierta?.pricePerM ?? 0;
  const avgHerraje = herraje?.pricePerM ?? 0;
  const costoMateriales = largoValue * (avgCubierta + sumPrecioFrentePorM * factorActivo + avgHerraje * factorActivo);
  const costoElectrodomesticos = input.applianceCatalogTotal;
  const costoAccesorios = input.accessoryCatalogTotal;
  const costoIluminacion = cotizacionIluminacionTotal(input.levantamiento);
  const precioEscenario = input.levantamientoConfig.scenarioPrices[input.selectedScenario] ?? 5000;
  const costoBase = largoValue * precioEscenario;
  const subtotal = costoBase + costoMateriales + costoElectrodomesticos + costoAccesorios + costoIluminacion;
  const iva = subtotal * input.levantamientoConfig.ivaPercent;
  const total = subtotal + iva;
  const marginPercent = input.levantamientoConfig.marginPercent;
  const rangeMin = total * (1 - marginPercent);
  const rangeMax = total * (1 + marginPercent);
  const factorHastaTechoLegendText = hastaTechoActivo
    ? `(Incluye factor hasta el techo: x${new Intl.NumberFormat("es-MX", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(factorConfig)})`
    : null;

  return {
    largoValue,
    costoBase,
    costoMateriales,
    costoElectrodomesticos,
    costoAccesorios,
    costoIluminacion,
    subtotal,
    iva,
    total,
    rangeMin,
    rangeMax,
    rangeLabel: `${formatCurrency(rangeMin)} - ${formatCurrency(rangeMax)}`,
    marginPercent,
    factorHastaTechoLegendText,
  };
}

export function buildScenarioCardRanges(
  input: LevantamientoMetricsInput & { scenarioOptions: ScenarioOption[] },
) {
  const largoValue = Math.max(0, Number.parseFloat(input.largo) || 0);
  const factorConfig = Math.min(5, Math.max(1, input.levantamientoConfig.factorHastaTecho ?? 1.25));
  const factorActivo = input.levantamiento.medidasGenerales?.hastaTecho === true ? factorConfig : 1;
  const cubierta = input.materialCatalog.cubiertas.find((item) => item.id === input.selectedCubierta);
  const herraje = input.materialCatalog.herrajes.find((item) => item.id === input.selectedHerraje);
  const sumPrecioFrentePorM = input.selectedFrenteIds.reduce((acc, fid) => {
    const f = input.materialCatalog.frentes.find((item) => item.id === fid);
    return acc + (f?.pricePerM ?? 0);
  }, 0);
  const costoMateriales =
    largoValue *
    ((cubierta?.pricePerM ?? 0) + sumPrecioFrentePorM * factorActivo + (herraje?.pricePerM ?? 0) * factorActivo);
  const costoElectrodomesticos = input.applianceCatalogTotal;
  const costoIluminacion = cotizacionIluminacionTotal(input.levantamiento);
  const ivaP = input.levantamientoConfig.ivaPercent;
  const marginPercent = input.levantamientoConfig.marginPercent;
  const def = { esencial: 5000, tendencia: 10000, premium: 15000 };

  return input.scenarioOptions.map((scenario) => {
    const costoBase = largoValue * (input.levantamientoConfig.scenarioPrices[scenario.id] ?? def.esencial);
    const subtotal = costoBase + costoMateriales + costoElectrodomesticos + costoIluminacion;
    const total = subtotal + subtotal * ivaP;
    return { id: scenario.id, min: total * (1 - marginPercent), max: total * (1 + marginPercent) };
  });
}

export function buildMaterialTierAverages(itemsByCategory: MaterialCatalogState) {
  const row = (items: MaterialOption[]) => {
    const grouped: Record<MaterialOption["tier"], number[]> = { Estandar: [], Tendencia: [], Premium: [] };
    for (const item of items) grouped[item.tier].push(item.pricePerM ?? 0);
    return {
      Estandar: grouped.Estandar.length ? grouped.Estandar.reduce((acc, value) => acc + value, 0) / grouped.Estandar.length : 0,
      Tendencia: grouped.Tendencia.length ? grouped.Tendencia.reduce((acc, value) => acc + value, 0) / grouped.Tendencia.length : 0,
      Premium: grouped.Premium.length ? grouped.Premium.reduce((acc, value) => acc + value, 0) / grouped.Premium.length : 0,
    } satisfies Record<MaterialOption["tier"], number>;
  };

  return {
    cubiertas: row(itemsByCategory.cubiertas),
    frentes: row(itemsByCategory.frentes),
    herrajes: row(itemsByCategory.herrajes),
  };
}
