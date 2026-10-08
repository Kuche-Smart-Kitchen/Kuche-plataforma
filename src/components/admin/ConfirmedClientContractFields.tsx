"use client";

import { useState } from "react";
import { isAxiosError } from "axios";
import { CalendarRange } from "lucide-react";
import { getAggregatedDeliveryWeeksFromTask, type KanbanTask } from "@/lib/kanban";
import { formatApproximateDeliveryWindowEs } from "@/lib/delivery-weeks";
import {
  actualizarDatosContratoProyecto,
  TIPOS_PROYECTO,
  type TipoProyecto,
} from "@/lib/axios/proyectosApi";

type Props = {
  task: KanbanTask;
  onUpdate: (next: KanbanTask) => void;
};

const inputClass =
  "mt-2 w-full rounded-lg border border-emerald-200 bg-white px-2 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400";

const labelClass = "block text-[11px] font-medium text-emerald-900/90";

export function ConfirmedClientContractFields({ task, onUpdate }: Props) {
  const [tipo, setTipo] = useState(task.projectTypeSummary ?? "");
  const [contractDate, setContractDate] = useState(task.contractDate ?? "");
  const [deliveryDate, setDeliveryDate] = useState(task.estimatedDeliveryDate ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const aggWeeks = getAggregatedDeliveryWeeksFromTask(task);
  const calendarDelivery =
    contractDate && aggWeeks
      ? formatApproximateDeliveryWindowEs(contractDate, aggWeeks.min, aggWeeks.max)
      : "";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const codigo = task.codigoProyecto?.trim();
    if (!codigo) return;

    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await actualizarDatosContratoProyecto(codigo, {
        ...(tipo ? { tipo: tipo as TipoProyecto } : {}),
        fechaContrato: contractDate,
        fechaEntrega: deliveryDate,
      });
      if (!response.success) {
        setError(response.message || "No se pudieron guardar los datos del proyecto.");
        return;
      }
      onUpdate({
        ...task,
        projectTypeSummary: tipo || undefined,
        contractDate: contractDate || undefined,
        estimatedDeliveryDate: deliveryDate || undefined,
      });
      setSaved(true);
    } catch (e) {
      const backendMessage = isAxiosError(e) ? e.response?.data?.message : undefined;
      setError(backendMessage || "No se pudieron guardar los datos del proyecto.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-emerald-200/90 bg-emerald-50/60 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-900">
        <CalendarRange className="h-3.5 w-3.5" />
        Contrato y proyecto
      </p>

      <div className="mt-4 space-y-4">
        <label className={labelClass}>
          Tipo de proyecto
          <select
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value);
              setSaved(false);
            }}
            className={inputClass}
          >
            <option value="">Sin definir</option>
            {TIPOS_PROYECTO.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          Fecha de contrato
          <input
            type="date"
            value={contractDate}
            onChange={(e) => {
              setContractDate(e.target.value);
              setSaved(false);
            }}
            className={inputClass}
          />
        </label>

        <div>
          <label className={labelClass}>
            Fecha de entrega
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => {
                setDeliveryDate(e.target.value);
                setSaved(false);
              }}
              className={inputClass}
            />
          </label>
          {calendarDelivery ? (
            <p className="mt-2 text-[11px] leading-relaxed text-emerald-800/85">
              Referencia del cotizador: {calendarDelivery}
            </p>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={isSaving || !task.codigoProyecto || !task.proyectoId}
        className="mt-4 w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSaving ? "Guardando..." : saved ? "Guardado" : "Guardar"}
      </button>
      {!task.proyectoId ? (
        <p className="mt-2 text-[11px] text-amber-700">Este cliente aún no tiene proyecto vinculado.</p>
      ) : null}
    </form>
  );
}
