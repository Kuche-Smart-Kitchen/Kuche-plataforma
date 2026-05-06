"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Minus, Plus, Save, RotateCcw, Trash2 } from "lucide-react";

import {
  createDefaultLevantamientoConfig,
  getLevantamientoConfig,
  normalizeLevantamientoConfig,
  parseFlexiblePercentInput,
  saveLevantamientoConfig,
  type LevantamientoConfig,
  type MaterialCategoria,
  type MaterialGama,
} from "@/lib/config-levantamiento";
import { LIGHTING_ITEMS } from "@/lib/levantamiento-catalog";
import {
  guardarConfiguracionLevantamiento,
  obtenerConfiguracionLevantamiento,
} from "@/lib/axios/levantamientoConfigApi";

const formatFractionAsPercent = (value: number) => `${(value * 100).toFixed(2).replace(/\.00$/, "")}%`;
const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);

const materialCategories: MaterialCategoria[] = ["cubierta", "frente", "herraje"];
const materialTiers: MaterialGama[] = ["Estandar", "Tendencia", "Premium"];

const lightingHelpById: Record<string, string> = {
  "led-bajo": "Luz directa bajo alacena para superficie de trabajo.",
  spots: "Puntos de luz generales en techo o plafón.",
  colgante: "Luminaria decorativa sobre isla o barra.",
  "perfil-led": "Línea continua para efecto limpio y uniforme.",
  indirecta: "Apoyo ambiental escondido en cornisas o molduras.",
  sensor: "Encendido práctico dentro de gabinetes o vitrinas.",
  sink: "Iluminación focal para tarja y zona de lavado.",
  "foco-ajustable": "Haz direccional para acentos o rincones.",
  "tira-vitrina": "Iluminación decorativa para vitrinas y cristal.",
};

type AccesorioRow = { id: string; nombre: string; precio: number };

function toAccesorioRows(input: Record<string, number>): AccesorioRow[] {
  return Object.entries(input).map(([id, precio]) => ({ id, nombre: id, precio }));
}

export default function ConfiguracionLevantamientoPage() {
  const [config, setConfig] = useState<LevantamientoConfig>(() => getLevantamientoConfig());
  const [mensaje, setMensaje] = useState<string>("");
  const [errorConexion, setErrorConexion] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState(false);

  const [accesoriosRows, setAccesoriosRows] = useState<AccesorioRow[]>(() =>
    toAccesorioRows(getLevantamientoConfig().extrasPrecios.accesoriosEspeciales),
  );
  const [lightingQuantities, setLightingQuantities] = useState<Record<string, number>>(
    () => getLevantamientoConfig().extrasIluminacionCantidades,
  );

  useEffect(() => {
    let isCancelled = false;

    const loadFromBackend = async () => {
      setIsSyncing(true);
      setErrorConexion("");
      try {
        const response = await obtenerConfiguracionLevantamiento();
        if (!response.success || !response.data) {
          if (!isCancelled) {
            setErrorConexion(response.message || "No se pudo cargar la configuracion desde backend. Se usa configuracion local.");
          }
          return;
        }

        const normalized = saveLevantamientoConfig(response.data);
        if (isCancelled) return;
        setConfig(normalized);
        setAccesoriosRows(toAccesorioRows(normalized.extrasPrecios.accesoriosEspeciales));
        setLightingQuantities(normalized.extrasIluminacionCantidades);
        setMensaje("Configuracion cargada desde backend.");
      } finally {
        if (!isCancelled) setIsSyncing(false);
      }
    };

    void loadFromBackend();

    return () => {
      isCancelled = true;
    };
  }, []);

  const costoEscenarioPromedio = useMemo(() => {
    const p = config.scenarioPrices;
    return (p.esencial + p.tendencia + p.premium) / 3;
  }, [config.scenarioPrices]);

  const updateMaterial = (index: number, patch: Partial<LevantamientoConfig["materiales"][number]>) => {
    setConfig((prev) => {
      const next = [...prev.materiales];
      next[index] = { ...next[index], ...patch };
      return { ...prev, materiales: next };
    });
  };

  const addMaterial = () => {
    setConfig((prev) => ({
      ...prev,
      materiales: [
        ...prev.materiales,
        {
          id: `mat-${Date.now().toString(36)}`,
          nombre: "",
          categoria: "frente",
          gama: "Tendencia",
          precioPorMetro: 0,
        },
      ],
    }));
  };

  const removeMaterial = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      materiales: prev.materiales.filter((_, i) => i !== index),
    }));
  };

  const setLightingPrice = (id: string, value: number) => {
    setConfig((prev) => ({
      ...prev,
      extrasPrecios: {
        ...prev.extrasPrecios,
        iluminacion: {
          ...prev.extrasPrecios.iluminacion,
          [id]: Math.max(0, value),
        },
      },
    }));
  };

  const setLightingQuantity = (id: string, value: number) => {
    const nextValue = Math.max(0, Math.floor(value));
    setLightingQuantities((prev) => ({ ...prev, [id]: nextValue }));
    setConfig((prev) => ({
      ...prev,
      extrasIluminacionCantidades: {
        ...prev.extrasIluminacionCantidades,
        [id]: nextValue,
      },
    }));
  };

  const adjustLightingPrice = (id: string, delta: number) => {
    setLightingPrice(id, (config.extrasPrecios.iluminacion[id] ?? 0) + delta);
  };

  const adjustLightingQuantity = (id: string, delta: number) => {
    setLightingQuantity(id, (lightingQuantities[id] ?? 0) + delta);
  };

  const syncAccesoriosConfig = (rows: AccesorioRow[]) => {
    const map = Object.fromEntries(
      rows
        .filter((row) => row.id.trim())
        .map((row) => [row.id.trim(), Math.max(0, Number(row.precio) || 0)]),
    );
    setConfig((prev) => ({
      ...prev,
      extrasPrecios: {
        ...prev.extrasPrecios,
        accesoriosEspeciales: map,
      },
    }));
  };

  const updateAccesorioRow = (index: number, patch: Partial<AccesorioRow>) => {
    setAccesoriosRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      syncAccesoriosConfig(next);
      return next;
    });
  };

  const addAccesorioRow = () => {
    setAccesoriosRows((prev) => {
      const next = [...prev, { id: `accesorio-${prev.length + 1}`, nombre: "", precio: 0 }];
      syncAccesoriosConfig(next);
      return next;
    });
  };

  const removeAccesorioRow = (index: number) => {
    setAccesoriosRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
      syncAccesoriosConfig(next);
      return next;
    });
  };

  const handleGuardar = async () => {
    setIsSyncing(true);
    setMensaje("");
    setErrorConexion("");
    try {
      const normalizedLocal = saveLevantamientoConfig(config);
      setConfig(normalizedLocal);
      setAccesoriosRows(toAccesorioRows(normalizedLocal.extrasPrecios.accesoriosEspeciales));
      setLightingQuantities(normalizedLocal.extrasIluminacionCantidades);

      const response = await guardarConfiguracionLevantamiento(normalizedLocal);
      if (!response.success) {
        setErrorConexion(response.message || "No se pudo guardar en backend. Se guardo solo en local.");
        setMensaje("Cambios guardados localmente.");
        return;
      }

      const normalized = normalizeLevantamientoConfig(response.data ?? normalizedLocal);
      saveLevantamientoConfig(normalized);
      setConfig(normalized);
      setAccesoriosRows(toAccesorioRows(normalized.extrasPrecios.accesoriosEspeciales));
      setLightingQuantities(normalized.extrasIluminacionCantidades);
      setMensaje("Configuracion guardada en backend y sincronizada con levantamiento.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestaurar = async () => {
    const defaults = createDefaultLevantamientoConfig();
    setIsSyncing(true);
    setMensaje("");
    setErrorConexion("");
    try {
      saveLevantamientoConfig(defaults);
      setConfig(defaults);
      setAccesoriosRows(toAccesorioRows(defaults.extrasPrecios.accesoriosEspeciales));
      setLightingQuantities(defaults.extrasIluminacionCantidades);

      const response = await guardarConfiguracionLevantamiento(defaults);
      if (!response.success) {
        setErrorConexion(response.message || "No se pudo restaurar en backend. Se restauraron valores locales.");
        setMensaje("Valores restaurados localmente.");
        return;
      }

      const normalized = normalizeLevantamientoConfig(response.data ?? defaults);
      saveLevantamientoConfig(normalized);
      setConfig(normalized);
      setAccesoriosRows(toAccesorioRows(normalized.extrasPrecios.accesoriosEspeciales));
      setLightingQuantities(normalized.extrasIluminacionCantidades);
      setMensaje("Valores restaurados y sincronizados con backend.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/dashboard/Levantamiento-detallado"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-secondary hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al levantamiento
          </Link>
          <h1 className="mt-2 text-3xl font-semibold text-primary">Configuracion de Levantamiento</h1>
          <p className="mt-1 text-sm text-secondary">Controla precios, porcentajes y factores de cotizacion preliminar.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleRestaurar}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 rounded-2xl border border-primary/15 bg-white px-4 py-2 text-xs font-semibold text-secondary"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar
          </button>
          <button
            type="button"
            onClick={() => void handleGuardar()}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#8B1C1C] px-4 py-2 text-xs font-semibold text-white"
          >
            <Save className="h-4 w-4" />
            {isSyncing ? "Sincronizando..." : "Guardar"}
          </button>
        </div>
      </div>

      {mensaje ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{mensaje}</p>
      ) : null}
      {errorConexion ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{errorConexion}</p>
      ) : null}

      <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-md">
        <h2 className="text-lg font-semibold text-primary">Escenarios</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {([
            ["esencial", "Esencial"],
            ["tendencia", "Tendencia"],
            ["premium", "Premium"],
          ] as const).map(([key, label]) => (
            <label key={key} className="text-xs font-semibold uppercase tracking-[0.15em] text-secondary">
              {label} (MXN / m)
              <input
                type="number"
                min={0}
                value={config.scenarioPrices[key]}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    scenarioPrices: {
                      ...prev.scenarioPrices,
                      [key]: Math.max(0, Number(event.target.value) || 0),
                    },
                  }))
                }
                className="mt-2 w-full rounded-xl border border-primary/15 px-3 py-2 text-sm text-primary outline-none"
              />
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs text-secondary">
          Referencia promedio actual: <strong>{formatMoney(costoEscenarioPromedio)}</strong>
        </p>
      </section>

      <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-md">
        <h2 className="text-lg font-semibold text-primary">Porcentajes y factor</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-primary/10 bg-primary/[0.03] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-secondary">IVA</p>
            <div className="mt-3 inline-flex rounded-xl border border-primary/10 bg-white px-3 py-2 text-sm font-semibold text-primary">
              {formatFractionAsPercent(config.ivaPercent)}
            </div>
          </div>

          <label className="text-xs font-semibold uppercase tracking-[0.15em] text-secondary">
            Margen de rango
            <input
              value={String(config.marginPercent)}
              onChange={(event) =>
                setConfig((prev) => ({
                  ...prev,
                  marginPercent: parseFlexiblePercentInput(event.target.value, 0.5),
                }))
              }
              className="mt-2 w-full rounded-xl border border-primary/15 px-3 py-2 text-sm text-primary outline-none"
            />
            <span className="mt-1 block text-[11px] font-medium normal-case tracking-normal text-secondary">
              Actual: {formatFractionAsPercent(config.marginPercent)}
            </span>
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.15em] text-secondary">
            Factor hasta techo
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={Number((config.factorHastaTecho * 100).toFixed(2))}
              onChange={(event) =>
                setConfig((prev) => ({
                  ...prev,
                  factorHastaTecho: Math.min(1, Math.max(0, (Number(event.target.value) || 0) / 100)),
                }))
              }
              className="mt-2 w-full rounded-xl border border-primary/15 px-3 py-2 text-sm text-primary outline-none"
            />
            <span className="mt-1 block text-[11px] font-medium normal-case tracking-normal text-secondary">
              Actual: {formatFractionAsPercent(config.factorHastaTecho)} de recargo
            </span>
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-primary">Materiales por metro</h2>
          <button
            type="button"
            onClick={addMaterial}
            className="inline-flex items-center gap-2 rounded-full border border-primary/15 px-3 py-1.5 text-xs font-semibold text-primary"
          >
            <Plus className="h-4 w-4" />
            Agregar material
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {config.materiales.map((item, index) => (
            <div key={`${item.id}-${index}`} className="grid gap-2 rounded-2xl border border-primary/10 p-3 md:grid-cols-[1.6fr_1fr_1fr_1fr_auto]">
              <input
                value={item.nombre}
                onChange={(event) => updateMaterial(index, { nombre: event.target.value })}
                placeholder="Nombre"
                className="rounded-xl border border-primary/15 px-3 py-2 text-sm outline-none"
              />
              <select
                value={item.categoria}
                onChange={(event) => updateMaterial(index, { categoria: event.target.value as MaterialCategoria })}
                className="rounded-xl border border-primary/15 px-3 py-2 text-sm outline-none"
              >
                {materialCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <select
                value={item.gama}
                onChange={(event) => updateMaterial(index, { gama: event.target.value as MaterialGama })}
                className="rounded-xl border border-primary/15 px-3 py-2 text-sm outline-none"
              >
                {materialTiers.map((tier) => (
                  <option key={tier} value={tier}>
                    {tier}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                value={item.precioPorMetro}
                onChange={(event) => updateMaterial(index, { precioPorMetro: Math.max(0, Number(event.target.value) || 0) })}
                placeholder="Precio/m"
                className="rounded-xl border border-primary/15 px-3 py-2 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => removeMaterial(index)}
                className="inline-flex items-center justify-center rounded-xl border border-rose-200 px-3 py-2 text-rose-700"
                aria-label="Eliminar material"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-md">
        <h2 className="text-lg font-semibold text-primary">Extras de iluminacion</h2>
        <p className="mt-2 text-sm text-secondary">
          Cada bloque representa un tipo de luz; ajusta su precio de referencia con los botones laterales.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {LIGHTING_ITEMS.map((item) => {
            const currentValue = config.extrasPrecios.iluminacion[item.id] ?? 0;
            const currentQty = lightingQuantities[item.id] ?? 0;
            const rowTotal = currentValue * currentQty;
            return (
              <div key={item.id} className="rounded-2xl border border-primary/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">{item.label}</p>
                    <p className="mt-1 text-sm text-secondary">{lightingHelpById[item.id] ?? "Referencia de iluminación para el cálculo preliminar."}</p>
                  </div>
                  <div className="inline-flex rounded-full border border-primary/10 bg-primary/[0.03] px-2 py-1 text-[11px] font-semibold text-secondary">
                    {currentQty} x {formatMoney(currentValue)}
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => adjustLightingQuantity(item.id, -1)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-primary/10 bg-white text-primary hover:bg-primary/5"
                      aria-label={`Bajar cantidad de ${item.label}`}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <div className="min-w-14 rounded-xl border border-primary/10 bg-background px-3 py-2 text-center text-sm font-semibold text-primary">
                      {currentQty}
                    </div>
                    <button
                      type="button"
                      onClick={() => adjustLightingQuantity(item.id, 1)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-primary/10 bg-white text-primary hover:bg-primary/5"
                      aria-label={`Subir cantidad de ${item.label}`}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-secondary">
                    Precio unitario
                    <input
                      type="number"
                      min={0}
                      value={currentValue}
                      onChange={(event) => setLightingPrice(item.id, Number(event.target.value) || 0)}
                      className="mt-2 w-full max-w-40 rounded-xl border border-primary/15 px-3 py-2 text-sm normal-case tracking-normal text-primary outline-none"
                    />
                  </label>

                  <div className="inline-flex items-center justify-center rounded-xl border border-primary/10 bg-white px-3 py-2 text-xs font-semibold text-primary">
                    Total: {formatMoney(rowTotal)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-primary">Extras de accesorios especiales</h2>
          <button
            type="button"
            onClick={addAccesorioRow}
            className="inline-flex items-center gap-2 rounded-full border border-primary/15 px-3 py-1.5 text-xs font-semibold text-primary"
          >
            <Plus className="h-4 w-4" />
            Agregar accesorio
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {accesoriosRows.map((row, index) => (
            <div key={`${row.id}-${index}`} className="grid gap-2 rounded-2xl border border-primary/10 p-3 md:grid-cols-[1.4fr_1.2fr_1fr_auto]">
              <input
                value={row.id}
                onChange={(event) => updateAccesorioRow(index, { id: event.target.value })}
                placeholder="id"
                className="rounded-xl border border-primary/15 px-3 py-2 text-sm outline-none"
              />
              <input
                value={row.nombre}
                onChange={(event) => updateAccesorioRow(index, { nombre: event.target.value })}
                placeholder="Nombre visual"
                className="rounded-xl border border-primary/15 px-3 py-2 text-sm outline-none"
              />
              <input
                type="number"
                min={0}
                value={row.precio}
                onChange={(event) => updateAccesorioRow(index, { precio: Math.max(0, Number(event.target.value) || 0) })}
                placeholder="Precio"
                className="rounded-xl border border-primary/15 px-3 py-2 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => removeAccesorioRow(index)}
                className="inline-flex items-center justify-center rounded-xl border border-rose-200 px-3 py-2 text-rose-700"
                aria-label="Eliminar accesorio"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
