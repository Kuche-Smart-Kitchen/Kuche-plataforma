"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, User, X } from "lucide-react";
import { getTaskCardSubtitle, kanbanStorageKey, stageStyles, type KanbanTask } from "@/lib/kanban";
import { ClientDocuments } from "@/components/admin/ClientDocuments";
import { splitIntoColumns } from "@/lib/split-into-columns";
import { useClientCardColumns } from "@/hooks/useClientCardColumns";

const stageLabel: Record<string, string> = {
  citas: "Citas",
  disenos: "Diseños",
  cotizacion: "Cotización",
  contrato: "Seguimiento",
};

function getTasksInProgress(tasks: KanbanTask[], filterByUser: string | null): KanbanTask[] {
  const inProgress = tasks.filter((task) => {
    if (task.stage === "contrato" && (task.followUpStatus === "confirmado" || task.followUpStatus === "descartado")) {
      return false;
    }
    return true;
  });
  if (filterByUser) {
    return inProgress.filter((task) =>
      Array.isArray(task.assignedTo) ? task.assignedTo.includes(filterByUser) : false,
    );
  }
  return inProgress;
}

export default function AdminClientesEnProcesoPage() {
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedClient, setSelectedClient] = useState<KanbanTask | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(kanbanStorageKey);
      const parsed = stored ? (JSON.parse(stored) as KanbanTask[]) : [];
      setTasks(Array.isArray(parsed) ? parsed : []);
    } catch {
      setTasks([]);
    }
    setIsHydrated(true);
  }, []);

  const inProgress = getTasksInProgress(tasks, null);
  const columnCount = useClientCardColumns(3);
  const taskColumns = useMemo(() => {
    if (inProgress.length === 0) return [];
    return splitIntoColumns(inProgress, columnCount);
  }, [inProgress, columnCount]);

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
    <div className="min-h-screen bg-gradient-to-b from-sky-100/35 to-white px-4 py-8 md:px-8">
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
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100">
              <User className="h-6 w-6 text-sky-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Administración</p>
              <h1 className="text-2xl font-semibold text-gray-900">Clientes en proceso</h1>
            </div>
          </div>
          <p className="ml-15 mt-2 text-sm text-secondary">
            Todos los clientes que aun no han confirmado o descartado.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-8"
        >
          {inProgress.length === 0 ? (
            <div className="rounded-3xl border border-primary/10 bg-white p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <User className="h-8 w-8 text-gray-400" />
              </div>
              <p className="mt-4 text-lg font-medium text-gray-900">No hay clientes en proceso</p>
              <p className="mt-2 text-sm text-secondary">Cuando haya clientes activos en el embudo, aparecerán aquí.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              {taskColumns.map((col, colIdx) => (
                <div key={colIdx} className="flex min-w-0 flex-1 flex-col gap-4">
                  {col.map((task) => {
                    const cardSubtitle = getTaskCardSubtitle(task);
                    return (
                    <div
                      key={task.id}
                      className={`min-w-0 rounded-2xl border border-primary/10 bg-white p-5 shadow-sm transition hover:shadow-md border-l-4 ${stageStyles[task.stage].border}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-100">
                            <User className="h-5 w-5 text-sky-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-secondary">Proyecto</p>
                            <h3 className="break-words text-base font-semibold text-gray-900">{task.project}</h3>
                            {cardSubtitle ? (
                              <p className="mt-0.5 text-sm text-secondary">{cardSubtitle}</p>
                            ) : null}
                            {task.codigoProyecto ? (
                              <p className="mt-2 break-all text-[11px] text-secondary">
                                Código:{" "}
                                <span className="font-semibold text-primary">{task.codigoProyecto}</span>
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${stageStyles[task.stage].badge}`}
                        >
                          {stageLabel[task.stage] ?? task.stage}
                        </span>
                      </div>

                      <div className="mt-4 border-t border-gray-100 pt-4 text-xs text-secondary">
                        Asignado:{" "}
                        {task.assignedTo?.length ? task.assignedTo.join(", ") : "Sin asignar"}
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedClient(task)}
                        className="mt-5 w-full rounded-xl bg-sky-700 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800"
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
          className="mt-8 rounded-2xl bg-sky-50 px-6 py-4"
        >
          <p className="text-sm text-sky-900">
            <strong>Total de clientes en proceso:</strong> {inProgress.length}
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
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="en-proceso-expediente-title"
              className="flex h-full w-full max-w-lg shrink-0 flex-col overflow-y-auto bg-white shadow-2xl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
                <div className="min-w-0">
                  <p id="en-proceso-expediente-title" className="text-lg font-semibold text-gray-900">
                    Expediente
                  </p>
                  <p className="mt-1 break-words text-sm font-medium text-primary">{selectedClient.project}</p>
                  {(() => {
                    const subtitle = getTaskCardSubtitle(selectedClient);
                    return subtitle ? <p className="text-xs text-secondary">{subtitle}</p> : null;
                  })()}
                  {selectedClient.codigoProyecto ? (
                    <p className="mt-2 break-all text-[11px] text-secondary">
                      Código:{" "}
                      <span className="font-semibold text-primary">{selectedClient.codigoProyecto}</span>
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

              <div className="min-h-0 flex-1 px-6 py-6">
                <ClientDocuments task={selectedClient} />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
