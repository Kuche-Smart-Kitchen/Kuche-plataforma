import type { LevantamientoConfig } from "@/lib/config-levantamiento";
import { formatCurrencyMXN as formatCurrency } from "@/lib/formatters";

export type ScenarioOption = {
  id: "esencial" | "tendencia" | "premium";
  title: string;
  subtitle: string;
  image: string;
};

export type ScenarioCardRange = {
  id: ScenarioOption["id"];
  min: number;
  max: number;
};

export type LevantamientoResumenMetrics = {
  costoBase: number;
  costoMateriales: number;
  costoElectrodomesticos: number;
  costoAccesorios: number;
  costoIluminacion: number;
  subtotal: number;
  iva: number;
  total: number;
  marginPercent: number;
  factorHastaTechoLegendText: string | null;
};

export type SelectedSummary = {
  meters: number;
  label: string;
};

type Props = {
  scenarioOptions: ScenarioOption[];
  scenarioCardRanges: ScenarioCardRange[];
  selectedScenario: ScenarioOption["id"];
  scenarioRangeLabel: string;
  metrics: LevantamientoResumenMetrics;
  selectedSummary: SelectedSummary;
  levantamientoConfig: LevantamientoConfig;
  dockToBottom: boolean;
  onSelectScenario: (scenarioId: ScenarioOption["id"]) => void;
  onGeneratePdf: () => void;
};

export function LevantamientoResumen({
  scenarioOptions,
  scenarioCardRanges,
  selectedScenario,
  scenarioRangeLabel,
  metrics,
  selectedSummary,
  levantamientoConfig,
  dockToBottom,
  onSelectScenario,
  onGeneratePdf,
}: Props) {
  return (
    <>
      <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-md">
        <div className="space-y-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
              Estimación visual
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Selecciona el nivel de acabados</h2>
            <p className="mt-2 text-sm text-secondary">
              Presentación rápida para ayudar al cliente a imaginar el resultado.
            </p>
            <p className="mt-2 text-xs text-secondary/90">
              El escenario se alinea al cambiar cubierta, frentes u herrajes; puedes elegir otro nivel aquí si lo
              necesitas.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {scenarioOptions.map((scenario) => {
              const cardRange = scenarioCardRanges.find((r) => r.id === scenario.id);
              const min = cardRange?.min ?? 0;
              const max = cardRange?.max ?? 0;
              const isActive = selectedScenario === scenario.id;
              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => onSelectScenario(scenario.id)}
                  className={`group overflow-hidden rounded-3xl border text-left shadow-lg transition hover:-translate-y-1 ${
                    isActive
                      ? "border-[#8B1C1C] bg-white ring-4 ring-[#8B1C1C]"
                      : "border-primary/10 bg-white/80 hover:border-primary/30"
                  }`}
                >
                  <div className="h-44 w-full overflow-hidden">
                    <img
                      src={scenario.image}
                      alt={scenario.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="space-y-3 p-6">
                    <p className="text-xs uppercase tracking-[0.3em] text-secondary">{scenario.title}</p>
                    <h3 className="text-lg font-semibold">{scenario.subtitle}</h3>
                    <div className="rounded-2xl bg-primary/5 px-4 py-3 text-center text-lg font-semibold text-[#8B1C1C]">
                      {formatCurrency(min)} - {formatCurrency(max)}
                    </div>
                    <p className="text-xs text-secondary">Basado en medidas generales y selección del showroom.</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-md">
        <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">Cierre y estimación</p>
            <p className="text-sm text-secondary">Presenta el rango estimado y genera un PDF preliminar para el cliente.</p>
            <button
              onClick={onGeneratePdf}
              className="mt-4 inline-flex items-center justify-center rounded-2xl bg-[#8B1C1C] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
            >
              Generar Estimación en PDF
            </button>
            <p className="mt-3 text-xs text-secondary">
              El PDF incluye portada (datos, materiales, rango) y anexo con comentarios y medidas del levantamiento
              cuando hay información capturada.
            </p>
            <div className="mt-4 max-w-md rounded-lg border border-primary/10 bg-white/80 px-3 py-2.5 text-xs text-secondary/90">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-secondary/70">Desglose técnico</p>
              <div className="mt-2 space-y-1.5 tabular-nums">
                <div className="flex justify-between gap-3">
                  <span>Costo base (escenario)</span>
                  <span className="shrink-0 text-primary/90">{formatCurrency(metrics.costoBase)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Materiales</span>
                  <span className="shrink-0 text-primary/90">{formatCurrency(metrics.costoMateriales)}</span>
                </div>
                {metrics.factorHastaTechoLegendText ? (
                  <p className="text-[10px] text-secondary/85">{metrics.factorHastaTechoLegendText}</p>
                ) : null}
                <div className="flex justify-between gap-3">
                  <span>Electrodomésticos</span>
                  <span className="shrink-0 text-primary/90">{formatCurrency(metrics.costoElectrodomesticos)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Accesorios de organización y tecnología</span>
                  <span className="shrink-0 text-primary/90">{formatCurrency(metrics.costoAccesorios)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Iluminación</span>
                  <span className="shrink-0 text-primary/90">{formatCurrency(metrics.costoIluminacion)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="min-w-0 rounded-2xl border border-primary/10 bg-primary/5 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">Estimación preliminar</p>
            <div className="mt-4 space-y-5">
              <div className="space-y-3 text-right">
                <div className="flex justify-end gap-4 text-sm text-secondary sm:gap-6">
                  <span className="min-w-0 shrink">Subtotal</span>
                  <span className="min-w-0 shrink-0 font-semibold tabular-nums text-primary">
                    {formatCurrency(metrics.subtotal)}
                  </span>
                </div>
                <div className="flex justify-end gap-4 text-sm text-secondary sm:gap-6">
                  <span className="min-w-0 shrink">IVA ({Math.round(levantamientoConfig.ivaPercent * 100)}%)</span>
                  <span className="min-w-0 shrink-0 font-semibold tabular-nums text-primary">
                    {formatCurrency(metrics.iva)}
                  </span>
                </div>
                <div className="flex justify-end gap-4 border-t border-primary/15 pt-2 text-sm text-secondary sm:gap-6">
                  <span className="min-w-0 shrink self-center font-medium">Total</span>
                  <span className="min-w-0 shrink-0 text-2xl font-bold tabular-nums text-[#8B1C1C] sm:text-3xl">
                    {formatCurrency(metrics.total)}
                  </span>
                </div>
              </div>
              <div className="border-t border-primary/10 pt-3 text-xs text-secondary sm:text-right">
                Rango estimado (±{Math.round(metrics.marginPercent * 100)}% sobre total):{" "}
                <span className="font-semibold text-[#8B1C1C]">{scenarioRangeLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div
        className={`fixed right-6 z-40 w-[min(260px,calc(100vw-2rem))] rounded-3xl border border-white/70 bg-white/90 p-4 shadow-2xl backdrop-blur-md ${
          dockToBottom ? "bottom-28" : "top-24"
        }`}
      >
        <p className="text-xs uppercase tracking-[0.25em] text-secondary">Rango estimado</p>
        <p className="mt-2 text-xl font-semibold text-[#8B1C1C]">{scenarioRangeLabel}</p>
        <p className="mt-2 text-[11px] text-secondary">
          {selectedSummary.meters} m lineales / {selectedSummary.label || "Selección en curso"}
        </p>
      </div>
    </>
  );
}
