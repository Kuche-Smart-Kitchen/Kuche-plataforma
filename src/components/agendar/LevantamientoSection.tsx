"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Ruler, Sparkles } from "lucide-react";

import { useEscapeClose } from "@/hooks/useEscapeClose";
import { useFocusTrap } from "@/hooks/useFocusTrap";

const stepTitles = ["Geometria", "Necesidades", "Escenarios"];
const basePrice = 5000;

const materialFactors: Record<string, number> = {
  "Granito Basico": 1,
  Cuarzo: 1.2,
  "Piedra Sinterizada": 1.5,
};

const scenarios = [
  {
    id: "esencial",
    title: "Estilo esencial",
    subtitle: "Melaminas",
    multiplier: 0.9,
    items: ["Melamina premium", "Herrajes estandar", "Cubierta basica"],
    style: "border border-primary/10 bg-white",
  },
  {
    id: "tendencia",
    title: "Estilo tendencia",
    subtitle: "Alto brillo / Textura",
    multiplier: 1.1,
    items: ["Texturas importadas", "Herrajes soft-close", "Cubierta mejorada"],
    style: "border border-accent/40 bg-white",
  },
  {
    id: "premium",
    title: "Estilo premium",
    subtitle: "Laca / Madera / Tech",
    multiplier: 1.35,
    items: ["Laca o madera natural", "Iluminacion integrada", "Hardware premium"],
    style: "bg-gradient-to-br from-white via-white to-accent/10 border border-accent/20",
  },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);

export default function LevantamientoSection() {
  const [step, setStep] = useState(1);
  const [metros, setMetros] = useState("6");
  const [isla, setIsla] = useState(false);
  const [alacenas, setAlacenas] = useState(false);
  const [material, setMaterial] = useState("Granito Basico");
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEscapeClose(Boolean(selectedScenario), () => setSelectedScenario(null));
  useFocusTrap(Boolean(selectedScenario), modalRef);

  const metrosNumber = Number.parseFloat(metros) || 0;
  const materialFactor = materialFactors[material] ?? 1;

  const prices = useMemo(() => {
    const islaFactor = isla ? 1.12 : 1;
    const alacenasFactor = alacenas ? 1.08 : 1;
    const base = metrosNumber * basePrice * materialFactor * islaFactor * alacenasFactor;

    return scenarios.map((scenario) => {
      const scenarioPrice = base * scenario.multiplier;
      const min = Math.max(0, Math.round(scenarioPrice * 0.93));
      const max = Math.round(scenarioPrice * 1.08);
      return { ...scenario, min, max };
    });
  }, [metrosNumber, materialFactor, isla, alacenas]);

  const goNext = () => setStep((prev) => Math.min(prev + 1, stepTitles.length));
  const goBack = () => setStep((prev) => Math.max(prev - 1, 1));

  return (
    <section id="levantamiento" className="scroll-mt-28 bg-background px-4 pb-20">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-lg md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">Levantamiento rapido</p>
            <h2 className="mt-2 text-2xl font-semibold">Tu posible cocina</h2>
            <p className="mt-2 text-sm text-secondary">
              Estimacion basada en metros lineales, necesidades y materiales.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-sm text-secondary">
            <span>{stepTitles[step - 1]}</span>
            <div className="h-2 w-56 overflow-hidden rounded-full bg-primary/10">
              <motion.div
                className="h-full bg-accent"
                initial={{ width: 0 }}
                animate={{ width: `${(step / stepTitles.length) * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-xl">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.4 }}
                className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]"
              >
                <div>
                  <h3 className="text-2xl font-semibold">Paso 1 - La geometria</h3>
                  <p className="mt-2 text-sm text-secondary">
                    Cuantos metros lineales aproximados tiene el proyecto?
                  </p>
                  <div className="mt-8 flex items-center justify-center rounded-3xl border border-primary/10 bg-white p-10">
                    <input
                      value={metros}
                      onChange={(event) => setMetros(event.target.value)}
                      type="number"
                      min="0"
                      className="w-full max-w-sm bg-transparent text-center text-5xl font-semibold text-primary outline-none"
                    />
                    <span className="ml-4 text-xl text-secondary">m</span>
                  </div>
                </div>
                <div className="rounded-3xl border border-primary/10 bg-white p-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                    <Ruler className="h-4 w-4" />
                    Que es un metro lineal?
                  </div>
                  <div className="mt-4 rounded-2xl bg-primary/5 p-4">
                    <svg viewBox="0 0 200 100" className="h-28 w-full text-primary/70" aria-hidden="true">
                      <line x1="10" y1="70" x2="190" y2="70" stroke="currentColor" strokeWidth="4" />
                      <line x1="10" y1="60" x2="10" y2="80" stroke="currentColor" strokeWidth="4" />
                      <line x1="190" y1="60" x2="190" y2="80" stroke="currentColor" strokeWidth="4" />
                      <text x="100" y="45" textAnchor="middle" fontSize="16" fill="currentColor">
                        Largo de la pared
                      </text>
                    </svg>
                    <p className="mt-2 text-xs text-secondary">
                      Medimos el largo total de los muros donde iran los muebles.
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : null}

            {step === 2 ? (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.4 }}
                className="space-y-8"
              >
                <div>
                  <h3 className="text-2xl font-semibold">Paso 2 - Necesidades</h3>
                  <p className="mt-2 text-sm text-secondary">
                    Activa filtros rapidos para ajustar el rango estimado.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    { id: "isla", label: "Requiere isla?", value: isla, setValue: setIsla },
                    {
                      id: "alacenas",
                      label: "Alacenas altas hasta el techo?",
                      value: alacenas,
                      setValue: setAlacenas,
                    },
                  ].map((toggle) => (
                    <button
                      key={toggle.id}
                      type="button"
                      onClick={() => toggle.setValue(!toggle.value)}
                      className={`flex items-center justify-between rounded-3xl border px-6 py-6 text-left text-sm font-semibold transition ${
                        toggle.value
                          ? "border-accent bg-accent text-white"
                          : "border-primary/10 bg-white text-primary hover:border-primary/30"
                      }`}
                    >
                      {toggle.label}
                      <span className="text-xs">{toggle.value ? "Si" : "No"}</span>
                    </button>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                    Tipo de cubierta estimada
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {Object.keys(materialFactors).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setMaterial(option)}
                        className={`rounded-3xl border px-4 py-4 text-sm font-semibold transition ${
                          material === option
                            ? "border-accent bg-accent text-white"
                            : "border-primary/10 bg-white text-primary hover:border-primary/30"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : null}

            {step === 3 ? (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-2xl font-semibold">Paso 3 - Escenarios</h3>
                  <p className="mt-2 text-sm text-secondary">
                    Selecciona una estimacion para comparar estilos.
                  </p>
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                  {prices.map((scenario, index) => (
                    <motion.div
                      key={scenario.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.08 }}
                      className={`rounded-3xl p-6 shadow-lg ${scenario.style}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-secondary">{scenario.title}</p>
                          <h4 className="mt-2 text-lg font-semibold">{scenario.subtitle}</h4>
                        </div>
                        <Sparkles className="h-5 w-5 text-accent" />
                      </div>
                      <div className="mt-6 rounded-2xl bg-primary/5 px-4 py-3 text-center text-lg font-semibold">
                        {formatCurrency(scenario.min)} - {formatCurrency(scenario.max)}
                      </div>
                      <ul className="mt-4 space-y-2 text-xs text-secondary">
                        {scenario.items.map((item) => (
                          <li key={item} className="flex items-center gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                            {item}
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onClick={() => setSelectedScenario(scenario.id)}
                        className="mt-6 w-full rounded-2xl bg-primary py-3 text-xs font-semibold text-white"
                      >
                        Seleccionar este escenario
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="mt-10 flex items-center justify-between">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 1}
              className="rounded-full border border-primary/10 px-4 py-2 text-xs font-semibold text-secondary disabled:opacity-40"
            >
              Atras
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={step === stepTitles.length}
              className="rounded-full bg-primary px-6 py-2 text-xs font-semibold text-white disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>

        <AnimatePresence>
          {selectedScenario ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            >
              <motion.div
                ref={modalRef}
                tabIndex={-1}
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                className="w-full max-w-md rounded-3xl border border-white/70 bg-white/90 p-6 shadow-2xl backdrop-blur-md"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <div>
                    <h4 className="text-lg font-semibold">Escenario guardado</h4>
                    <p className="text-sm text-secondary">Puedes compartirlo en tu primera visita.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedScenario(null)}
                  className="mt-6 w-full rounded-2xl bg-accent py-3 text-sm font-semibold text-white shadow"
                >
                  Entendido
                </button>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
}
