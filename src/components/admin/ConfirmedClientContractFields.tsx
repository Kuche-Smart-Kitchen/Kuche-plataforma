"use client";

import { useEffect, useState } from "react";
import { CalendarRange, Package, Pencil, CalendarClock } from "lucide-react";
import {
  kanbanStorageKey,
  saveKanbanTasksToLocalStorage,
  getAggregatedDeliveryWeeksFromTask,
  getConfirmedCardProjectLines,
  type KanbanTask,
} from "@/lib/kanban";
import { formatApproximateDeliveryWindowEs } from "@/lib/delivery-weeks";

type Props = {
  task: KanbanTask;
  onUpdate: (next: KanbanTask) => void;
};

function formatIsoDateEs(iso: string): string {
  const d = new Date(`${iso.trim()}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

export function ConfirmedClientContractFields({ task, onUpdate }: Props) {
  const hasSavedContractDate = Boolean(task.contractDate?.trim());
  const hasSavedDeliveryDate = Boolean(task.estimatedDeliveryDate?.trim());

  const [contractDate, setContractDate] = useState("");
  const [editingContract, setEditingContract] = useState(!hasSavedContractDate);
  const [savedContractFlash, setSavedContractFlash] = useState(false);

  const [deliveryDate, setDeliveryDate] = useState("");
  const [editingDelivery, setEditingDelivery] = useState(!hasSavedDeliveryDate);
  const [savedDeliveryFlash, setSavedDeliveryFlash] = useState(false);

  useEffect(() => {
    setContractDate(task.contractDate ?? "");
  }, [task.id, task.contractDate]);

  useEffect(() => {
    setDeliveryDate(task.estimatedDeliveryDate ?? "");
  }, [task.id, task.estimatedDeliveryDate]);

  useEffect(() => {
    setEditingContract(!task.contractDate?.trim());
  }, [task.id]);

  useEffect(() => {
    setEditingDelivery(!task.estimatedDeliveryDate?.trim());
  }, [task.id]);

  const projectLines = getConfirmedCardProjectLines(task);
  const aggWeeks = getAggregatedDeliveryWeeksFromTask(task);
  const calendarDelivery =
    contractDate.trim() && aggWeeks
      ? formatApproximateDeliveryWindowEs(contractDate.trim(), aggWeeks.min, aggWeeks.max)
      : "";

  const persistTaskPatch = (patch: Partial<KanbanTask>) => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(kanbanStorageKey);
    if (!stored) return;
    try {
      const tasks = JSON.parse(stored) as KanbanTask[];
      const next = tasks.map((t) => (t.id === task.id ? { ...t, ...patch } : t));
      saveKanbanTasksToLocalStorage(next);
      const updated = next.find((t) => t.id === task.id);
      if (updated) onUpdate(updated);
    } catch {
      // ignore
    }
  };

  const saveContract = () => {
    if (!window.confirm("¿Estás seguro de establecer esta fecha de contrato?")) return;
    persistTaskPatch({ contractDate: contractDate.trim() || undefined });
    setEditingContract(false);
    setSavedContractFlash(true);
    window.setTimeout(() => setSavedContractFlash(false), 2000);
  };

  const saveDelivery = () => {
    if (!window.confirm("¿Estás seguro de establecer esta fecha estimada de entrega?")) return;
    persistTaskPatch({ estimatedDeliveryDate: deliveryDate.trim() || undefined });
    setEditingDelivery(false);
    setSavedDeliveryFlash(true);
    window.setTimeout(() => setSavedDeliveryFlash(false), 2000);
  };

  const cancelContractEdit = () => {
    setContractDate(task.contractDate ?? "");
    setEditingContract(false);
  };

  const cancelDeliveryEdit = () => {
    setDeliveryDate(task.estimatedDeliveryDate ?? "");
    setEditingDelivery(false);
  };

  const showContractEditor = !hasSavedContractDate || editingContract;
  const showDeliveryEditor = !hasSavedDeliveryDate || editingDelivery;

  return (
    <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/60 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-900">
        <CalendarRange className="h-3.5 w-3.5" />
        Contrato y proyecto
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-emerald-900/90">Fecha de contrato</label>
          {showContractEditor ? (
            <div className="mt-2 space-y-2">
              <input
                type="date"
                value={contractDate}
                onChange={(e) => setContractDate(e.target.value)}
                className="w-full rounded-lg border border-emerald-200 bg-white px-2 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={saveContract}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800"
                >
                  {savedContractFlash ? "Guardado" : "Guardar"}
                </button>
                {hasSavedContractDate ? (
                  <button
                    type="button"
                    onClick={cancelContractEdit}
                    className="rounded-lg border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-50"
                  >
                    Cancelar
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-gray-900">{formatIsoDateEs(task.contractDate!)}</p>
              <button
                type="button"
                onClick={() => {
                  setContractDate(task.contractDate ?? "");
                  setEditingContract(true);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white p-1.5 text-emerald-800 shadow-sm hover:bg-emerald-50"
                title="Editar fecha de contrato"
                aria-label="Editar fecha de contrato"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-900/90">
            <CalendarClock className="h-3 w-3 shrink-0" />
            Fecha estimada de entrega
          </label>
          {showDeliveryEditor ? (
            <div className="mt-2 space-y-2">
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full rounded-lg border border-emerald-200 bg-white px-2 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={saveDelivery}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800"
                >
                  {savedDeliveryFlash ? "Guardado" : "Guardar"}
                </button>
                {hasSavedDeliveryDate ? (
                  <button
                    type="button"
                    onClick={cancelDeliveryEdit}
                    className="rounded-lg border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-50"
                  >
                    Cancelar
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-gray-900">{formatIsoDateEs(task.estimatedDeliveryDate!)}</p>
              <button
                type="button"
                onClick={() => {
                  setDeliveryDate(task.estimatedDeliveryDate ?? "");
                  setEditingDelivery(true);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white p-1.5 text-emerald-800 shadow-sm hover:bg-emerald-50"
                title="Editar fecha estimada de entrega"
                aria-label="Editar fecha estimada de entrega"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <p className="mt-1.5 text-[10px] leading-relaxed text-emerald-800/75">
            Opcional: puedes fijarla a mano; si no, la tarjeta puede usar el cálculo desde cotizador y fecha de contrato.
          </p>
        </div>

        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-900/90">
            <Package className="h-3 w-3 shrink-0" />
            Tipos de proyecto
          </p>
          {projectLines.length > 0 ? (
            <ul className="mt-2 space-y-2 rounded-lg border border-emerald-100 bg-white/90 px-3 py-2.5 text-sm text-gray-800">
              {projectLines.map((line, i) => (
                <li
                  key={i}
                  className="flex flex-col gap-0.5 border-b border-emerald-50 pb-2 last:border-0 last:pb-0"
                >
                  <span className="font-medium text-emerald-950">{line.projectType}</span>
                  <span className="text-xs text-emerald-800/85">{line.weeksLabel}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-emerald-800/80">
              Aún no hay cotizaciones guardadas en esta tarjeta. Cuando se generen desde el tablero, el tipo y las
              semanas aparecerán aquí.
            </p>
          )}
        </div>

        <div>
          <p className="text-[11px] font-medium text-emerald-900/90">Entrega estimada (referencia cotizador)</p>
          {aggWeeks ? (
            <p className="mt-2 text-sm text-gray-800">
              <span className="font-medium">Plazo en cotización(es): </span>
              {aggWeeks.min === aggWeeks.max
                ? `${aggWeeks.min} semanas aprox.`
                : `${aggWeeks.min} a ${aggWeeks.max} semanas aprox.`}
            </p>
          ) : (
            <p className="mt-2 text-xs text-emerald-800/80">
              No se encontraron semanas en las cotizaciones (revisa que el cotizador formal tenga el rango de semanas
              completado).
            </p>
          )}
          {calendarDelivery ? (
            <p className="mt-3 rounded-lg border border-emerald-100 bg-white/90 px-3 py-2.5 text-sm leading-relaxed text-gray-800">
              {calendarDelivery}
            </p>
          ) : aggWeeks ? (
            <p className="mt-2 text-xs text-emerald-800/80">
              Indica la <strong>fecha de contrato</strong> arriba y guárdala para ver fechas aproximadas de entrega en
              calendario.
            </p>
          ) : null}
          {hasSavedDeliveryDate ? (
            <p className="mt-2 text-[10px] text-emerald-800/80">
              La fecha manual de entrega registrada arriba es la que se muestra en la tarjeta principal (tiene prioridad).
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
