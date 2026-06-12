"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RotateCcw, Save, Search, Trash2, X } from "lucide-react";
import { DashboardBackButton } from "@/components/dashboard/DashboardBackButton";
import { NumericInputEmptyZero } from "@/components/NumericInputEmptyZero";
import {
  createDefaultLevantamientoConfig,
  getLevantamientoConfig,
  resetLevantamientoConfigToDefault,
  saveLevantamientoConfig,
  type LevantamientoConfig,
  type MaterialCategoria,
  type MaterialConfig,
} from "@/lib/config-levantamiento";
import { LIGHTING_ITEMS, SPECIAL_ACCESSORIES_ITEMS } from "@/lib/levantamiento-catalog";

const CATEGORIAS: MaterialCategoria[] = ["cubierta", "frente", "herraje"];
type FiltroCategoria = "todas" | MaterialCategoria;

/** Fracción 0–0.5 → puntos porcentuales para mostrar (p. ej. 0.16 → 16). */
function fractionToPercentUi(fraction: number): number {
  return Math.round(Math.max(0, fraction) * 10000) / 100;
}

function pctLabel(p: number) {
  return `${fractionToPercentUi(p)}%`;
}

/** Valor almacenado (0–0.5) → texto del input; 0 = vacío + placeholder. */
function fractionToDraftString(f: number): string {
  if (f === 0) return "";
  return String(Math.round(Math.max(0, f) * 10000) / 10000);
}

/**
 * Acepta fracción decimal (0.08) o número “humano” como % si es > 0.5 y ≤ 50 (8 → 0.08, 16 → 0.16).
 */
function parseFlexibleFraction(raw: string, maxFraction = 0.5): number {
  const t = raw.trim().replace(",", ".");
  if (t === "") return 0;
  const p = Number.parseFloat(t);
  if (Number.isNaN(p)) return 0;
  if (p > maxFraction && p <= maxFraction * 100) {
    return Math.min(maxFraction, Math.max(0, p / 100));
  }
  return Math.min(maxFraction, Math.max(0, p));
}

type DecimalFractionInputProps = {
  id?: string;
  className?: string;
  value: number;
  onCommit: (fraction: number) => void;
  placeholder?: string;
  "aria-label"?: string;
};

function DecimalFractionInput({
  id,
  className,
  value,
  onCommit,
  placeholder = "0",
  "aria-label": ariaLabel,
}: DecimalFractionInputProps) {
  const [draft, setDraft] = useState(() => fractionToDraftString(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(fractionToDraftString(value));
    }
  }, [value, focused]);

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      placeholder={placeholder}
      className={className}
      aria-label={ariaLabel}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        const next = parseFlexibleFraction(draft);
        onCommit(next);
      }}
    />
  );
}

export default function ConfiguracionLevantamientoPage() {
  const [config, setConfig] = useState<LevantamientoConfig>(() => createDefaultLevantamientoConfig());
  const [mounted, setMounted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [newMat, setNewMat] = useState({
    nombre: "",
    categoria: "cubierta" as MaterialCategoria,
    precioPorMetro: 0,
  });
  const [materialSearch, setMaterialSearch] = useState("");
  const [filterCategoria, setFilterCategoria] = useState<FiltroCategoria>("todas");
  const [deletePending, setDeletePending] = useState<{ id: string; nombre: string } | null>(null);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    setConfig(getLevantamientoConfig());
  }, []);

  const sortedMateriales = useMemo(() => {
    const order = { cubierta: 0, frente: 1, herraje: 2 };
    return [...config.materiales].sort(
      (a, b) => order[a.categoria] - order[b.categoria] || a.nombre.localeCompare(b.nombre),
    );
  }, [config.materiales]);

  const filteredMateriales = useMemo(() => {
    const q = materialSearch.trim().toLowerCase();
    return sortedMateriales.filter((m) => {
      if (filterCategoria !== "todas" && m.categoria !== filterCategoria) return false;
      if (!q) return true;
      return m.nombre.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
    });
  }, [sortedMateriales, materialSearch, filterCategoria]);

  const performSave = useCallback(() => {
    setSaveConfirmOpen(false);
    setSaveStatus("saving");
    const ok = saveLevantamientoConfig(config);
    setSaveStatus(ok ? "ok" : "error");
    if (ok) {
      window.setTimeout(() => setSaveStatus("idle"), 2500);
    }
  }, [config]);

  const performRestore = useCallback(() => {
    setRestoreConfirmOpen(false);
    const fresh = resetLevantamientoConfigToDefault();
    setConfig(fresh);
    setSaveStatus("ok");
    window.setTimeout(() => setSaveStatus("idle"), 2000);
  }, []);

  const updateMaterial = (id: string, patch: Partial<MaterialConfig>) => {
    setConfig((prev) => ({
      ...prev,
      materiales: prev.materiales.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  };

  const removeMaterial = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      materiales: prev.materiales.filter((m) => m.id !== id),
    }));
  };

  const addMaterial = () => {
    const nombre = newMat.nombre.trim();
    if (!nombre) return;
    const precio = Math.max(0, newMat.precioPorMetro);
    const id = `custom-${Date.now()}`;
    setConfig((prev) => ({
      ...prev,
      materiales: [
        ...prev.materiales,
        {
          id,
          nombre,
          categoria: newMat.categoria,
          precioPorMetro: precio,
        },
      ],
    }));
    setNewMat((n) => ({ ...n, nombre: "", precioPorMetro: 0 }));
  };

  if (!mounted) {
    return (
      <main className="min-h-screen bg-background text-primary">
        <DashboardBackButton />
        <p className="text-sm text-secondary">Cargando configuración…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-primary">
      <section className="pb-12 pt-6 md:pt-8">
        <DashboardBackButton />
        <div>
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
                Administración
              </p>
              <h1 className="mt-4 text-3xl font-semibold text-primary md:text-4xl">
                Gestor de Levantamiento
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-secondary md:text-base">
                Precios base por escenario (Esencial / Tendencia / Premium), IVA, margen de rango y catálogo de
                materiales ($/m); al final, precios unitarios de extras (iluminación y accesorios del apartado E). El
                Levantamiento Detallado usa estos valores en vivo.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setSaveConfirmOpen(true)}
              disabled={saveStatus === "saving"}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saveStatus === "saving" ? "Guardando…" : "Guardar configuración"}
            </button>
            <button
              type="button"
              onClick={() => setRestoreConfirmOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-primary/20 bg-white px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/5"
            >
              <RotateCcw className="h-4 w-4" />
              Restaurar por defecto
            </button>
            {saveStatus === "ok" ? (
              <span className="text-sm font-medium text-emerald-600">Cambios guardados.</span>
            ) : null}
            {saveStatus === "error" ? (
              <span className="text-sm font-medium text-rose-600">No se pudo guardar (almacenamiento lleno).</span>
            ) : null}
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-primary/10 bg-white/90 p-6 shadow-lg backdrop-blur-sm">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-secondary">
                Precio base por escenario ($/m lineal)
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {(
                  [
                    ["esencial", "Esencial"],
                    ["tendencia", "Tendencia"],
                    ["premium", "Premium"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block">
                    <span className="text-xs font-medium text-secondary">{label}</span>
                    <NumericInputEmptyZero
                      min={0}
                      step={100}
                      parseAs="float"
                      placeholder="0"
                      className="mt-1 w-full rounded-xl border border-primary/15 bg-white px-3 py-2 text-sm font-semibold text-primary outline-none ring-primary/20 focus:ring-2"
                      value={config.scenarioPrices[key]}
                      onValueChange={(n) =>
                        setConfig((c) => ({
                          ...c,
                          scenarioPrices: {
                            ...c.scenarioPrices,
                            [key]: Math.max(0, n),
                          },
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-primary/10 bg-white/90 p-6 shadow-lg backdrop-blur-sm">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-secondary">
                Impuestos y rango
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium text-secondary">IVA ({pctLabel(config.ivaPercent)})</span>
                  <DecimalFractionInput
                    className="mt-1 w-full rounded-xl border border-primary/15 bg-white px-3 py-2 text-sm font-semibold text-primary outline-none ring-primary/20 focus:ring-2"
                    value={config.ivaPercent}
                    onCommit={(n) =>
                      setConfig((c) => ({
                        ...c,
                        ivaPercent: n,
                      }))
                    }
                    placeholder="0"
                  />
                  <span className="mt-1 block text-[11px] text-secondary">
                    Decimal 0–0.5 (ej. 0.16) o entero como % (ej. 16 = 16%)
                  </span>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-secondary">
                    Margen rango ± ({pctLabel(config.marginPercent)} cada lado)
                  </span>
                  <DecimalFractionInput
                    className="mt-1 w-full rounded-xl border border-primary/15 bg-white px-3 py-2 text-sm font-semibold text-primary outline-none ring-primary/20 focus:ring-2"
                    value={config.marginPercent}
                    onCommit={(n) =>
                      setConfig((c) => ({
                        ...c,
                        marginPercent: n,
                      }))
                    }
                    placeholder="0"
                  />
                  <span className="mt-1 block text-[11px] text-secondary">
                    Decimal 0–0.5 (ej. 0.08, 0.10) o entero como % (ej. 8 = ±8%)
                  </span>
                </label>
              </div>
              <label className="mt-4 block">
                <span className="text-xs font-medium text-secondary">
                  Factor hasta el techo (carpintería: frentes + herrajes)
                </span>
                <NumericInputEmptyZero
                  min={1}
                  max={5}
                  step={0.05}
                  parseAs="float"
                  placeholder="1.25"
                  className="mt-1 w-full max-w-xs rounded-xl border border-primary/15 bg-white px-3 py-2 text-sm font-semibold text-primary outline-none ring-primary/20 focus:ring-2"
                  value={config.factorHastaTecho}
                  onValueChange={(n) =>
                    setConfig((c) => ({
                      ...c,
                      factorHastaTecho: Math.min(5, Math.max(1, n)),
                    }))
                  }
                />
                <span className="mt-1 block text-[11px] text-secondary">
                  Se aplica en Levantamiento detallado solo si se marca «cocina hasta el techo» (1–5; por defecto 1.25).
                </span>
              </label>
            </div>
          </div>

          <div className="mt-10 rounded-3xl border border-primary/10 bg-white/90 p-6 shadow-lg backdrop-blur-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-secondary">
              Catálogo de materiales (precio $/m)
            </h2>
            <p className="mt-2 text-xs text-secondary">
              Cada material tiene su precio por metro; el escenario solo define el costo base de referencia lineal.
            </p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <label className="min-w-[12rem] flex-1">
                <span className="text-[11px] font-medium text-secondary">Buscar</span>
                <div className="relative mt-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
                  <input
                    type="search"
                    value={materialSearch}
                    onChange={(e) => setMaterialSearch(e.target.value)}
                    placeholder="Nombre o id…"
                    className="w-full rounded-xl border border-primary/15 bg-white py-2 pl-9 pr-3 text-sm outline-none ring-primary/20 focus:ring-2"
                  />
                </div>
              </label>
              <label>
                <span className="text-[11px] font-medium text-secondary">Categoría</span>
                <select
                  className="mt-1 rounded-xl border border-primary/15 bg-white px-3 py-2 text-sm outline-none"
                  value={filterCategoria}
                  onChange={(e) => setFilterCategoria(e.target.value as FiltroCategoria)}
                >
                  <option value="todas">Todas</option>
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 overflow-x-auto rounded-2xl border border-primary/10">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-primary/10 bg-primary/[0.03] text-xs uppercase tracking-wide text-secondary">
                    <th className="px-3 py-3 font-semibold">Nombre</th>
                    <th className="px-3 py-3 font-semibold">Categoría</th>
                    <th className="px-3 py-3 font-semibold">$/m</th>
                    <th className="w-12 px-2 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredMateriales.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-sm text-secondary">
                        No hay materiales con estos criterios.
                      </td>
                    </tr>
                  ) : null}
                  {filteredMateriales.map((m) => (
                    <tr key={m.id} className="border-b border-primary/5 last:border-0">
                      <td className="px-3 py-2">
                        <input
                          className="w-full min-w-[8rem] rounded-lg border border-primary/10 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                          value={m.nombre}
                          onChange={(e) => updateMaterial(m.id, { nombre: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="rounded-lg border border-primary/10 bg-white px-2 py-1.5 text-sm outline-none"
                          value={m.categoria}
                          onChange={(e) =>
                            updateMaterial(m.id, { categoria: e.target.value as MaterialCategoria })
                          }
                        >
                          {CATEGORIAS.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <NumericInputEmptyZero
                          min={0}
                          step={50}
                          parseAs="float"
                          placeholder="0"
                          className="w-28 rounded-lg border border-primary/10 bg-white px-2 py-1.5 text-sm font-semibold tabular-nums outline-none focus:ring-2 focus:ring-primary/20"
                          value={m.precioPorMetro}
                          onValueChange={(n) =>
                            updateMaterial(m.id, {
                              precioPorMetro: Math.max(0, n),
                            })
                          }
                        />
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => setDeletePending({ id: m.id, nombre: m.nombre })}
                          className="rounded-lg p-2 text-secondary transition hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Eliminar material"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-dashed border-primary/20 bg-primary/[0.02] p-4 md:flex-row md:flex-wrap md:items-end">
              <label className="min-w-[10rem] flex-1">
                <span className="text-xs font-medium text-secondary">Nuevo material</span>
                <input
                  className="mt-1 w-full rounded-xl border border-primary/15 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Nombre"
                  value={newMat.nombre}
                  onChange={(e) => setNewMat((n) => ({ ...n, nombre: e.target.value }))}
                />
              </label>
              <label>
                <span className="text-xs font-medium text-secondary">Categoría</span>
                <select
                  className="mt-1 rounded-xl border border-primary/15 bg-white px-3 py-2 text-sm outline-none"
                  value={newMat.categoria}
                  onChange={(e) =>
                    setNewMat((n) => ({ ...n, categoria: e.target.value as MaterialCategoria }))
                  }
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="text-xs font-medium text-secondary">$/m</span>
                <NumericInputEmptyZero
                  min={0}
                  parseAs="float"
                  placeholder="0"
                  className="mt-1 w-28 rounded-xl border border-primary/15 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  value={newMat.precioPorMetro}
                  onValueChange={(n) => setNewMat((prev) => ({ ...prev, precioPorMetro: n }))}
                />
              </label>
              <button
                type="button"
                onClick={addMaterial}
                className="rounded-2xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
              >
                Agregar
              </button>
            </div>
          </div>

          <div className="mt-10 rounded-3xl border border-primary/10 bg-white/90 p-6 shadow-lg backdrop-blur-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-secondary">
              Extras — iluminación y accesorios (precio unitario MXN)
            </h2>
            <p className="mt-2 text-xs text-secondary">
              Aplica a la sección E del Levantamiento Detallado (luminarios del catálogo y accesorios como Alexa,
              botelleros, etc.). Cada unidad cotizada multiplica este precio.
            </p>

            <div className="mt-6 grid gap-8 lg:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-secondary">Iluminación</h3>
                <div className="mt-3 space-y-3">
                  {LIGHTING_ITEMS.map((item) => (
                    <label key={item.id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                      <span className="min-w-0 flex-1 text-sm text-primary">{item.label}</span>
                      <NumericInputEmptyZero
                        min={0}
                        step={50}
                        parseAs="float"
                        placeholder="0"
                        className="w-full rounded-xl border border-primary/15 bg-white px-3 py-2 text-sm font-semibold tabular-nums outline-none ring-primary/20 focus:ring-2 sm:w-36"
                        value={config.extrasPrecios.iluminacion[item.id] ?? 0}
                        onValueChange={(n) =>
                          setConfig((c) => ({
                            ...c,
                            extrasPrecios: {
                              ...c.extrasPrecios,
                              iluminacion: {
                                ...c.extrasPrecios.iluminacion,
                                [item.id]: Math.max(0, n),
                              },
                            },
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-secondary">
                  Accesorios especiales
                </h3>
                <div className="mt-3 space-y-3">
                  {SPECIAL_ACCESSORIES_ITEMS.map((item) => (
                    <label key={item.id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                      <span className="min-w-0 flex-1 text-sm text-primary">{item.label}</span>
                      <NumericInputEmptyZero
                        min={0}
                        step={50}
                        parseAs="float"
                        placeholder="0"
                        className="w-full rounded-xl border border-primary/15 bg-white px-3 py-2 text-sm font-semibold tabular-nums outline-none ring-primary/20 focus:ring-2 sm:w-36"
                        value={config.extrasPrecios.accesoriosEspeciales[item.id] ?? 0}
                        onValueChange={(n) =>
                          setConfig((c) => ({
                            ...c,
                            extrasPrecios: {
                              ...c.extrasPrecios,
                              accesoriosEspeciales: {
                                ...c.extrasPrecios.accesoriosEspeciales,
                                [item.id]: Math.max(0, n),
                              },
                            },
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {saveConfirmOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-confirm-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-primary/10 bg-white p-6 shadow-2xl">
            <h3 id="save-confirm-title" className="text-lg font-semibold text-primary">
              ¿Guardar configuración?
            </h3>
            <p className="mt-3 text-sm text-secondary">
              Se guardarán en este navegador los escenarios, IVA, margen, la lista de materiales y los precios de
              extras. El Levantamiento Detallado usará estos valores de inmediato.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setSaveConfirmOpen(false)}
                className="rounded-xl border border-primary/15 bg-white px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={performSave}
                disabled={saveStatus === "saving"}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
              >
                Sí, guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {restoreConfirmOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="restore-confirm-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-primary/10 bg-white p-6 shadow-2xl">
            <h3 id="restore-confirm-title" className="text-lg font-semibold text-primary">
              ¿Restaurar valores por defecto?
            </h3>
            <p className="mt-3 text-sm text-secondary">
              Se reemplazará la configuración por la predeterminada (precios de ejemplo, lista inicial de materiales y
              precios de extras del catálogo). Los cambios no guardados en pantalla se perderán; puedes cancelar y usar
              «Guardar» antes si necesitas conservar algo.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setRestoreConfirmOpen(false)}
                className="rounded-xl border border-primary/15 bg-white px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={performRestore}
                className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
              >
                Sí, restaurar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deletePending ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-mat-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-primary/10 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <h3 id="delete-mat-title" className="text-lg font-semibold text-primary">
                ¿Eliminar material?
              </h3>
              <button
                type="button"
                onClick={() => setDeletePending(null)}
                className="rounded-lg p-1 text-secondary transition hover:bg-primary/5 hover:text-primary"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-3 text-sm text-secondary">
              Se quitará <span className="font-semibold text-primary">«{deletePending.nombre}»</span> de la lista.
              Podrás guardar o deshacer con «Restaurar por defecto» si hace falta.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletePending(null)}
                className="rounded-xl border border-primary/15 bg-white px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  removeMaterial(deletePending.id);
                  setDeletePending(null);
                }}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
