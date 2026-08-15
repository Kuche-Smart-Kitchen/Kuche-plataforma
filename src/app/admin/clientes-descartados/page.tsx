/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, XCircle, User, Calendar, RotateCcw, X } from "lucide-react";
import {
  getTasksFromLocalStorage,
  getTaskCardSubtitle,
  saveKanbanTasksToLocalStorage,
  type KanbanTask,
} from "@/lib/kanban";
import { ExpedientePdfSections } from "@/components/admin/ExpedientePdfSections";
import { splitIntoColumns } from "@/lib/split-into-columns";
import { useClientCardColumns } from "@/hooks/useClientCardColumns";

const formatDate = (timestamp: number | undefined): string => {
  if (!timestamp) return "Sin fecha";
  const date = new Date(timestamp);
  return date.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
};


export default function ClientesDescartadosPage() {
  const [clients, setClients] = useState<KanbanTask[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedClient, setSelectedClient] = useState<KanbanTask | null>(null);
  const columnCount = useClientCardColumns(3);
  const clientColumns = useMemo(() => {
    if (clients.length === 0) return [];
    return splitIntoColumns(clients, columnCount);
  }, [clients, columnCount]);

  useEffect(() => {
    const allTasks = getTasksFromLocalStorage();
    const discarded = allTasks.filter((task) => task.followUpStatus === "descartado");
    setClients(discarded);
    setIsHydrated(true);
  }, []);

  const handleReactivate = (clientId: string) => {
    try {
      const tasks = getTasksFromLocalStorage();
      const updatedTasks = tasks.map((task) => {
          if (task.id === clientId) {
            return {
              ...task,
              followUpStatus: "pendiente" as const,
              status: "pendiente" as const,
              stage: "contrato" as const,
              followUpEnteredAt: Date.now(),
            };
          }
          return task;
        });
        saveKanbanTasksToLocalStorage(updatedTasks);
        setClients(updatedTasks.filter((t) => t.followUpStatus === "descartado"));
        setSelectedClient(null);
    } catch {
      console.error("Error al reactivar cliente");
    }
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
    <div className="min-h-screen bg-gradient-to-b from-slate-200/25 to-white px-4 py-8 md:px-8">
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
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200/90">
              <XCircle className="h-6 w-6 text-slate-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Administración</p>
              <h1 className="text-2xl font-semibold text-gray-900">Proyectos Inactivos</h1>
            </div>
          </div>
          <p className="ml-15 mt-2 text-sm text-secondary">
            Proyectos que por ahora no continúan. Conservamos la información por si el cliente regresa más adelante.
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
              <p className="mt-4 text-lg font-medium text-gray-900">No hay proyectos inactivos</p>
              <p className="mt-2 text-sm text-secondary">Los proyectos que no continúen aparecerán aquí.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              {clientColumns.map((col, colIdx) => (
                <div key={colIdx} className="flex min-w-0 flex-1 flex-col gap-4">
                  {col.map((client) => {
                    const cardSubtitle = getTaskCardSubtitle(client);
                    return (
                    <div
                      key={client.id}
                      className="min-w-0 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100">
                            <User className="h-5 w-5 text-slate-500" />
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
                        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                          Inactivo
                        </span>
                      </div>

                      <div className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-sm text-secondary">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 shrink-0 opacity-70" />
                          <span>Registro: {formatDate(client.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 shrink-0 opacity-70" />
                          <span>Asignado a: {client.assignedTo?.join(", ") || "Sin asignar"}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedClient(client)}
                        className="mt-5 w-full rounded-xl bg-slate-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
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
          className="mt-8 rounded-2xl bg-slate-100 px-6 py-4"
        >
          <p className="text-sm text-slate-700">
            <strong>Total de proyectos inactivos:</strong> {clients.length}
          </p>
          <p className="mt-1 text-xs text-secondary">
            Puedes reactivar a cualquier cliente si decide volver a contactar con la empresa.
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
              aria-labelledby="inactivo-expediente-title"
              className="flex h-full w-full max-w-lg shrink-0 flex-col bg-white shadow-2xl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
                <div className="min-w-0">
                  <p id="inactivo-expediente-title" className="text-xs font-semibold uppercase tracking-wider text-secondary">
                    Expediente
                  </p>
                  <h2 className="mt-1 break-words text-xl font-semibold leading-tight text-gray-900">
                    {selectedClient.project}
                  </h2>
                  {(() => {
                    const subtitle = getTaskCardSubtitle(selectedClient);
                    return subtitle ? <p className="mt-1 text-sm text-secondary">{subtitle}</p> : null;
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
                <div className="space-y-6 pb-6">
                  <ExpedientePdfSections client={selectedClient} />
                </div>

                <div className="border-t border-gray-100 pt-6">
                  <button
                    type="button"
                    onClick={() => handleReactivate(selectedClient.id)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/15 bg-primary py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reactivar cliente
                  </button>
                </div>
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
