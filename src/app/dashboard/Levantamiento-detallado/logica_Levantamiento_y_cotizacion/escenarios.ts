import type { LevantamientoConfig } from "@/lib/config-levantamiento";
import type { LevantamientoScenarioId } from "./calculos";

export type LevantamientoScenarioOption = {
  id: LevantamientoScenarioId;
  title: string;
  subtitle: string;
  image: string;
};

export const LEVANTAMIENTO_SCENARIO_OPTIONS: LevantamientoScenarioOption[] = [
  {
    id: "esencial",
    title: "Estandar",
    subtitle: "Funcional y accesible",
    image: "/images/escenarios/estimacion-base.jpeg",
  },
  {
    id: "tendencia",
    title: "Tendencia",
    subtitle: "Balance moderno",
    image: "/images/escenarios/estimacion-tendencia.jpeg",
  },
  {
    id: "premium",
    title: "Premium",
    subtitle: "Detalles superiores",
    image: "/images/escenarios/estimacion-premium.jpeg",
  },
];

export function resolveScenarioReferenceCateo(
  scenarioId: LevantamientoScenarioId,
  largo: string,
  scenarioPrices: LevantamientoConfig["scenarioPrices"],
): number {
  const largoValue = Math.max(0, Number.parseFloat(largo) || 0);
  const precioLineal = scenarioPrices[scenarioId] ?? 0;
  return largoValue * precioLineal;
}
