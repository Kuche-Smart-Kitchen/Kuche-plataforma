import { formatCurrencyMXN } from "@/lib/formatters";
import {
  cotizacionExtrasTotal,
  cotizacionIluminacionTotal,
  cotizacionSpecialAccessoriesTotal,
  type LevantamientoDetalle,
} from "@/lib/levantamiento-catalog";
import {
  resolvePrecioPorMetroForShowroomSelection,
  type LevantamientoConfig,
} from "@/lib/config-levantamiento";

export type LevantamientoScenarioId = "esencial" | "tendencia" | "premium";

type ShowroomOption = {
  id: string;
  name: string;
};

type MaterialCatalogInput = {
  cubiertas: ShowroomOption[];
  frentes: ShowroomOption[];
  herrajes: ShowroomOption[];
};

export type LevantamientoMetricsInput = {
  largo: string;
  selectedCubierta: string | null;
  selectedFrenteIds: string[];
  selectedHerraje: string | null;
  materialCatalog: MaterialCatalogInput;
  levantamientoConfig: LevantamientoConfig;
  levantamiento: LevantamientoDetalle;
  selectedScenario: LevantamientoScenarioId;
};

export type LevantamientoMetrics = {
  largoValue: number;
  costoReferenciaEscenario: number;
  costoBase: number;
  costoCubiertas: number;
  costoFrentes: number;
  costoHerrajes: number;
  costoMateriales: number;
  costoIluminacion: number;
  costoAccesoriosEspeciales: number;
  costoExtras: number;
  subtotal: number;
  iva: number;
  total: number;
  rangeMin: number;
  rangeMax: number;
  rangeLabel: string;
  marginPercent: number;
  factorHastaTechoLegendText: string | null;
};

function computeShowroomFrentesCost(
  largoValue: number,
  selectedFrenteIds: string[],
  catalog: MaterialCatalogInput,
  config: LevantamientoConfig,
): number {
  const count = selectedFrenteIds.length;
  if (count === 0 || largoValue <= 0) return 0;

  const metrosPorFrente = largoValue / count;

  return selectedFrenteIds.reduce((acc, frenteId) => {
    const frente = catalog.frentes.find((item) => item.id === frenteId);
    if (!frente) return acc;

    const precioPorMetro = resolvePrecioPorMetroForShowroomSelection(
      config.materiales,
      "frente",
      { id: frente.id, name: frente.name },
    );

    return acc + metrosPorFrente * precioPorMetro;
  }, 0);
}

export function buildLevantamientoMetrics(input: LevantamientoMetricsInput): LevantamientoMetrics {
  const largoValue = Math.max(0, Number.parseFloat(input.largo) || 0);

  const cubiertaOpt = input.materialCatalog.cubiertas.find(
    (item) => item.id === input.selectedCubierta,
  );
  const herrajeOpt = input.materialCatalog.herrajes.find(
    (item) => item.id === input.selectedHerraje,
  );

  const pickC = cubiertaOpt ? { id: cubiertaOpt.id, name: cubiertaOpt.name } : null;
  const pickH = herrajeOpt ? { id: herrajeOpt.id, name: herrajeOpt.name } : null;

  const precioCubiertaM = resolvePrecioPorMetroForShowroomSelection(
    input.levantamientoConfig.materiales,
    "cubierta",
    pickC,
  );
  const precioHerrajeM = resolvePrecioPorMetroForShowroomSelection(
    input.levantamientoConfig.materiales,
    "herraje",
    pickH,
  );

  const factorConfig = Math.min(5, Math.max(1, input.levantamientoConfig.factorHastaTecho ?? 1.25));
  const factorActivo = input.levantamiento.medidasGenerales?.hastaTecho === true ? factorConfig : 1;

  const costoCubiertas = largoValue * precioCubiertaM;
  const costoFrentes =
    computeShowroomFrentesCost(
      largoValue,
      input.selectedFrenteIds,
      input.materialCatalog,
      input.levantamientoConfig,
    ) * factorActivo;
  const costoHerrajes = largoValue * precioHerrajeM * factorActivo;

  const ep = input.levantamientoConfig.extrasPrecios;
  const costoIluminacion = cotizacionIluminacionTotal(input.levantamiento, ep.iluminacion);
  const costoAccesoriosEspeciales = cotizacionSpecialAccessoriesTotal(
    input.levantamiento,
    ep.accesoriosEspeciales,
  );
  const costoExtras = cotizacionExtrasTotal(input.levantamiento, ep);

  const subtotal = costoCubiertas + costoFrentes + costoHerrajes + costoExtras;
  const costoMateriales = costoCubiertas + costoFrentes + costoHerrajes;

  const precioEscenarioLineal =
    input.levantamientoConfig.scenarioPrices[input.selectedScenario] ?? 5000;
  const costoReferenciaEscenario = largoValue * precioEscenarioLineal;

  const iva = subtotal * input.levantamientoConfig.ivaPercent;
  const total = subtotal + iva;
  const marginPercent = input.levantamientoConfig.marginPercent;
  const rangeMin = total * (1 - marginPercent);
  const rangeMax = total * (1 + marginPercent);

  const factorHastaTechoLegendText =
    input.levantamiento.medidasGenerales?.hastaTecho === true
      ? `(Incluye factor hasta el techo: x${new Intl.NumberFormat("es-MX", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(factorConfig)})`
      : null;

  return {
    largoValue,
    costoReferenciaEscenario,
    costoBase: costoReferenciaEscenario,
    costoCubiertas,
    costoFrentes,
    costoHerrajes,
    costoMateriales,
    costoIluminacion,
    costoAccesoriosEspeciales,
    costoExtras,
    subtotal,
    iva,
    total,
    rangeMin,
    rangeMax,
    rangeLabel: `${formatCurrencyMXN(rangeMin)} - ${formatCurrencyMXN(rangeMax)}`,
    marginPercent,
    factorHastaTechoLegendText,
  };
}
