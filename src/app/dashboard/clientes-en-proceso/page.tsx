"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, User, FileText, Eye, Download } from "lucide-react";
import {
  kanbanStorageKey,
  kanbanColumns,
  getPreliminarList,
  getCotizacionesFormalesList,
  stageStyles,
  type KanbanTask,
} from "@/lib/kanban";
import {
  openPreliminarPdfInNewTab,
  downloadPreliminarPdf,
  openFormalPdfInNewTab,
  downloadFormalPdf,
  openWorkshopPdfInNewTab,
  downloadWorkshopPdf,
} from "@/lib/pdf-preliminar";
import { hasWorkshopPdfActions } from "@/lib/formal-pdf-storage";
import { splitIntoColumns } from "@/lib/split-into-columns";
import { useClientCardColumns } from "@/hooks/useClientCardColumns";

const CURRENT_USER = "Valeria";

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

export default function ClientesEnProcesoPage() {
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

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

  const inProgress = getTasksInProgress(tasks, CURRENT_USER);
  const columnCount = useClientCardColumns(2);
  const taskColumns = useMemo(() => {
    if (inProgress.length === 0) return [];
    return splitIntoColumns(inProgress, columnCount);
  }, [inProgress, columnCount]);

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-primary">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <Link
            href="/dashboard/empleado"
            className="inline-flex items-center gap-2 text-sm text-secondary hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al tablero
          </Link>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                Clientes en proceso
              </p>
              <h1 className="text-2xl font-semibold">Clientes en proceso</h1>
              <p className="mt-1 text-sm text-secondary">
                Solo se muestran los clientes asignados a ti.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-8"
        >
          {inProgress.length === 0 ? (
            <div className="rounded-3xl border border-primary/10 bg-white p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 font-medium text-gray-600">No hay clientes en proceso</p>
              <p className="mt-2 text-sm text-secondary">Cuando tengas tareas asignadas apareceran aqui.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              {taskColumns.map((col, colIdx) => (
                <div key={colIdx} className="flex min-w-0 flex-1 flex-col gap-4">
                  {col.map((task) => (
                <div
                  key={task.id}
                  className="min-w-0 rounded-3xl border border-primary/10 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-lg font-semibold text-gray-900">{task.project}</h3>
                      <p className="mt-1 text-sm text-secondary">{task.title}</p>
                      {task.codigoProyecto ? (
                        <p className="mt-2 break-all text-[11px] text-secondary">
                          Código:{" "}
                          <span className="font-semibold text-primary">{task.codigoProyecto}</span>
                        </p>
                      ) : null}
                      <span
                        className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${stageStyles[task.stage].badge}`}
                      >
                        {stageLabel[task.stage] ?? task.stage}
                      </span>
                      {task.assignedTo?.length ? (
                        <p className="mt-2 text-xs text-secondary">
                          Asignado: {task.assignedTo.join(", ")}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-6 space-y-3 border-t border-primary/10 pt-4">
                    {getPreliminarList(task).length > 0 ? (
                      <div className="rounded-2xl bg-emerald-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                        Levantamiento Detallado{" "}
                        {getPreliminarList(task).length > 1 ? `(${getPreliminarList(task).length})` : ""}
                        </p>
                        <div className="mt-2 space-y-2">
                          {getPreliminarList(task).map((data, idx) => (
                            <div key={idx} className="flex flex-wrap items-center gap-2 rounded-xl bg-white/80 px-3 py-2">
                              <span className="text-xs font-medium text-emerald-800">{data.projectType}</span>
                              <button
                                type="button"
                                onClick={() => openPreliminarPdfInNewTab(data)}
                                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                              >
                                <Eye className="h-3 w-3" />
                                Ver PDF
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  downloadPreliminarPdf(
                                    data,
                                  `levantamiento-detallado-${(data.projectType || "proyecto").replace(/\s+/g, "-")}-${task.project.replace(/\s+/g, "-")}.pdf`,
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                              >
                                <Download className="h-3 w-3" />
                                Descargar PDF
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {getCotizacionesFormalesList(task).length > 0 ? (
                      <div className="rounded-2xl bg-violet-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-violet-800">
                          Cotización formal + hoja de taller{" "}
                          {getCotizacionesFormalesList(task).length > 1 ? `(${getCotizacionesFormalesList(task).length})` : ""}
                        </p>
                        <div className="mt-2 space-y-2">
                          {getCotizacionesFormalesList(task).map((data, idx) => (
                            <div key={idx} className="space-y-2 rounded-xl bg-white/80 px-3 py-2">
                              <span className="text-xs font-medium text-violet-800">{data.projectType}</span>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-600/80">
                                  Formal
                                </span>
                                <button
                                  type="button"
                                  onClick={() => openFormalPdfInNewTab(data)}
                                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                                >
                                  <Eye className="h-3 w-3" />
                                  Ver
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    downloadFormalPdf(
                                      data,
                                      `cotizacion-formal-${(data.projectType || "proyecto").replace(/\s+/g, "-")}-${task.project.replace(/\s+/g, "-")}.pdf`,
                                    )
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                                >
                                  <Download className="h-3 w-3" />
                                  Descargar
                                </button>
                                {hasWorkshopPdfActions(data) ? (
                                  <>
                                    <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-violet-600/80">
                                      Taller
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => openWorkshopPdfInNewTab(data)}
                                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                                    >
                                      <Eye className="h-3 w-3" />
                                      Ver
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        downloadWorkshopPdf(
                                          data,
                                          `hoja-taller-${(data.projectType || "proyecto").replace(/\s+/g, "-")}-${task.project.replace(/\s+/g, "-")}.pdf`,
                                        )
                                      }
                                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                                    >
                                      <Download className="h-3 w-3" />
                                      Descargar
                                    </button>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {getPreliminarList(task).length === 0 && getCotizacionesFormalesList(task).length === 0 ? (
                      <p className="text-xs text-secondary">Sin PDFs generados aun.</p>
                    ) : null}
                  </div>
                </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}
