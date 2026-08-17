/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  User,
  X,
  LayoutTemplate,
  FileSignature,
  CalendarClock,
} from "lucide-react";
import {
  deriveProjectTypesLabel,
  getAggregatedDeliveryWeeksFromTask,
  getTaskCardSubtitle,
  type KanbanTask,
} from "@/lib/kanban";
import { syncKanbanTasksFromBackend } from "@/lib/admin-workflow";
import { ConfirmedClientContractFields } from "@/components/admin/ConfirmedClientContractFields";
import { ExpedientePdfSections } from "@/components/admin/ExpedientePdfSections";
import { splitIntoColumns } from "@/lib/split-into-columns";
import { useClientCardColumns } from "@/hooks/useClientCardColumns";

/** Fecha ISO (YYYY-MM-DD) legible, mismo estilo que el registro del sistema. */
function formatIsoDateLong(iso: string): string {
  const d = new Date(`${iso.trim()}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Entrega estimada para la tarjeta: `estimatedDeliveryDate` guardado, o rango calculado
 * desde fecha de contrato + semanas del cotizador.
 */
function getCardDeliverySummary(task: KanbanTask): string | null {
  if (task.estimatedDeliveryDate?.trim()) {
    return formatIsoDateLong(task.estimatedDeliveryDate);
  }
  const contract = task.contractDate?.trim();
  const weeks = getAggregatedDeliveryWeeksFromTask(task);
  if (!contract || !weeks) return null;
  const base = new Date(`${contract}T12:00:00`);
  if (Number.isNaN(base.getTime())) return null;
  const from = new Date(base);
  from.setDate(from.getDate() + weeks.min * 7);
  const to = new Date(base);
  to.setDate(to.getDate() + weeks.max * 7);
  const fmt = (dt: Date) =>
    dt.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
  if (weeks.min === weeks.max) return fmt(from);
  return `${fmt(from)} – ${fmt(to)}`;
}

export default function ClientesConfirmadosPage() {
  const [clients, setClients] = useState<KanbanTask[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedClient, setSelectedClient] = useState<KanbanTask | null>(null);
  const columnCount = useClientCardColumns(3);
  const clientColumns = useMemo(() => {
    if (clients.length === 0) return [];
    return splitIntoColumns(clients, columnCount);
  }, [clients, columnCount]);

  useEffect(() => {
    const load = async () => {
      try {
        const synced = await syncKanbanTasksFromBackend();
        const tasks = (synced ?? []) as KanbanTask[];
        const confirmed = tasks.filter((task) => task.followUpStatus === "confirmado");
        setClients(confirmed);
      } catch {
        setClients([]);
      } finally {
        setIsHydrated(true);
      }
    };

    void load();
  }, []);

  const handleConfirmedTaskUpdate = (updated: KanbanTask) => {
    setClients((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setSelectedClient((sel) => (sel?.id === updated.id ? updated : sel));
  };

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (selectedClient) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [selectedClient]);

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent/30 to-white px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm text-secondary hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al panel
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Administración</p>
              <h1 className="text-2xl font-semibold text-gray-900">Clientes Confirmados</h1>
            </div>
          </div>
          <p className="ml-15 mt-2 text-sm text-secondary">
            Clientes que han confirmado su proyecto con la empresa.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-8"
        >
          {clients.length === 0 ? (
            <div className="rounded-3xl border border-primary/10 bg-white p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <User className="h-8 w-8 text-gray-400" />
              </div>
              <p className="mt-4 text-lg font-medium text-gray-900">No hay clientes confirmados aún</p>
              <p className="mt-2 text-sm text-secondary">Cuando un cliente confirme su proyecto, aparecerá aquí.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              {clientColumns.map((col, colIdx) => (
                <div key={colIdx} className="flex min-w-0 flex-1 flex-col gap-4">
                  {col.map((client) => {
                    const projectTypesLabel = deriveProjectTypesLabel(client).trim();
                    const deliverySummary = getCardDeliverySummary(client);
                    const cardSubtitle = getTaskCardSubtitle(client);
                    return (
                    <div
                      key={client.id}
                      className="min-w-0 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition hover:border-emerald-200/80 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                            <User className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-secondary">Proyecto</p>
                            <h3 className="break-words text-base font-semibold text-gray-900">{client.project}</h3>
                            {cardSubtitle ? (
                              <p className="mt-0.5 text-sm text-secondary">{cardSubtitle}</p>
                            ) : null}
                            {client.codigoProyecto ? (
                              <p className="mt-2 break-all text-[11px] text-secondary">
                                Código:{" "}
                                <span className="font-semibold text-primary">{client.codigoProyecto}</span>
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                          Confirmado
                        </span>
                      </div>

                      <div className="mt-4 space-y-3 border-t border-gray-100 pt-4 text-sm text-secondary">
                        <div className="flex items-start gap-2">
                          <LayoutTemplate className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
                          <span className="min-w-0 leading-snug">
                            <span className="block text-[10px] font-semibold uppercase tracking-wide text-secondary/90">
                              Tipo(s) de proyecto
                            </span>
                            {projectTypesLabel ? (
                              <span className="text-secondary">{projectTypesLabel}</span>
                            ) : (
                              <span className="italic text-secondary/80">Sin definir</span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <FileSignature className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
                          <span className="min-w-0 leading-snug">
                            <span className="block text-[10px] font-semibold uppercase tracking-wide text-secondary/90">
                              Fecha de contrato
                            </span>
                            {client.contractDate?.trim() ? (
                              <span className="font-medium text-gray-800">{formatIsoDateLong(client.contractDate)}</span>
                            ) : (
                              <span className="text-amber-600">Pendiente</span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
                          <span className="min-w-0 leading-snug">
                            <span className="block text-[10px] font-semibold uppercase tracking-wide text-secondary/90">
                              Fecha de entrega
                            </span>
                            {deliverySummary ? (
                              <span className="text-secondary">{deliverySummary}</span>
                            ) : (
                              <span className="text-secondary/90">Por definir</span>
                            )}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedClient(client)}
                        className="mt-5 w-full rounded-xl bg-emerald-700 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
                      >
                        Abrir expediente
                      </button>
                    </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-8 rounded-2xl bg-emerald-50 px-6 py-4"
        >
          <p className="text-sm text-emerald-800">
            <strong>Total de clientes confirmados:</strong> {clients.length}
          </p>
        </motion.div>
      </div>

      <AnimatePresence>
        {selectedClient ? (
          <motion.div
            key={selectedClient.id}
            className="fixed inset-0 z-[100] flex"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              aria-label="Cerrar panel"
              className="h-full min-h-0 flex-1 cursor-default bg-black/50"
              onClick={() => setSelectedClient(null)}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-labelledby="expediente-title"
              className="flex h-full w-full max-w-lg shrink-0 flex-col bg-white shadow-2xl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
                <div className="min-w-0">
                  <p id="expediente-title" className="text-lg font-semibold text-gray-900">
                    Expediente
                  </p>
                  <p className="mt-1 break-words text-sm font-medium text-primary">{selectedClient.project}</p>
                  {(() => {
                    const subtitle = getTaskCardSubtitle(selectedClient);
                    return subtitle ? <p className="text-xs text-secondary">{subtitle}</p> : null;
                  })()}
                  {selectedClient.codigoProyecto ? (
                    <p className="mt-2 break-all text-[11px] text-secondary">
                      Código: <span className="font-semibold text-primary">{selectedClient.codigoProyecto}</span>
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedClient(null)}
                  className="rounded-xl p-2 text-secondary hover:bg-gray-100 hover:text-gray-900"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                <div className="space-y-8 pb-8">
                  <ConfirmedClientContractFields key={selectedClient.id} task={selectedClient} onUpdate={handleConfirmedTaskUpdate} />
                  <ExpedientePdfSections client={selectedClient} withTopDivider />
                </div>
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
