"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Calendar, CheckCircle2, Download, FileText, Loader2, Upload, User, X } from "lucide-react";

import { useAdminWorkflow } from "@/contexts/AdminWorkflowContext";
import { getAssignedLabel, isTaskConfirmed, type AdminWorkflowTask } from "@/lib/admin-workflow";
import { subirArchivoConMetadata } from "@/lib/axios/uploadsApi";
import { getCotizacionesFormalesList, getPreliminarList } from "@/lib/kanban";
import { downloadFormalPdf, downloadPreliminarPdf } from "@/lib/pdf-preliminar";
import { useClienteArchivos } from "@/hooks/useClienteArchivos";

const stageLabel: Record<string, string> = {
  citas: "Citas",
  disenos: "Diseños",
  cotizacion: "Cotización",
  contrato: "Seguimiento",
};

const stageToneClass: Record<string, string> = {
  citas: "bg-sky-100 text-sky-700 border-sky-500",
  disenos: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-500",
  cotizacion: "bg-indigo-100 text-indigo-700 border-indigo-500",
  contrato: "bg-emerald-100 text-emerald-700 border-emerald-500",
};

type PublicStatusDraft = {
  anticipo: PublicStatusPaymentDraft;
  segundoPago: PublicStatusPaymentDraft;
  liquidacion: PublicStatusPaymentDraft;
  nota: string;
};

type PublicStatusPaymentDraft = {
  amount: number;
  receiptLabel: string;
  receiptImage: string;
  date?: string;
};

const PUBLIC_STATUS_STORAGE_KEY = "kuche-admin-public-status-map-confirmados";

const defaultPublicStatusDraft: PublicStatusDraft = {
  anticipo: { amount: 0, receiptLabel: "Ver recibo", receiptImage: "", date: "" },
  segundoPago: { amount: 0, receiptLabel: "Ver recibo", receiptImage: "", date: "" },
  liquidacion: { amount: 0, receiptLabel: "Ver recibo", receiptImage: "", date: "" },
  nota: "",
};

const paymentFields = [
  { key: "anticipo", label: "Recibo 1 · Anticipo", tipoUpload: "recibo_1" },
  { key: "segundoPago", label: "Recibo 2 · Segundo pago", tipoUpload: "recibo_2" },
  { key: "liquidacion", label: "Recibo 3 · Liquidación", tipoUpload: "recibo_3" },
] as const;

const normalizePaymentDraft = (raw: unknown): PublicStatusPaymentDraft => {
  if (!raw || typeof raw !== "object") {
    return { amount: 0, receiptLabel: "Ver recibo", receiptImage: "", date: "" };
  }

  const record = raw as Record<string, unknown>;
  return {
    amount: Math.max(0, Math.round(Number(record.amount) || 0)),
    receiptLabel: typeof record.receiptLabel === "string" ? record.receiptLabel : "Ver recibo",
    receiptImage: typeof record.receiptImage === "string" ? record.receiptImage : "",
    date: typeof record.date === "string" ? record.date : "",
  };
};

const normalizeDraft = (raw: unknown): PublicStatusDraft => {
  if (!raw || typeof raw !== "object") return defaultPublicStatusDraft;
  const record = raw as Record<string, unknown>;

  const legacyAnticipo = Math.max(0, Math.round(Number(record.anticipo) || 0));
  const legacySegundo = Math.max(0, Math.round(Number(record.segundoPago) || 0));
  const legacyLiquidacion = Math.max(0, Math.round(Number(record.liquidacion) || 0));

  const anticipo = normalizePaymentDraft(record.anticipoPago ?? record.anticipo);
  const segundoPago = normalizePaymentDraft(record.segundoPagoData ?? record.segundoPago);
  const liquidacion = normalizePaymentDraft(record.liquidacionData ?? record.liquidacion);

  return {
    anticipo: { ...anticipo, amount: anticipo.amount || legacyAnticipo },
    segundoPago: { ...segundoPago, amount: segundoPago.amount || legacySegundo },
    liquidacion: { ...liquidacion, amount: liquidacion.amount || legacyLiquidacion },
    nota: typeof record.nota === "string" ? record.nota : "",
  };
};

const formatDate = (timestamp: number | undefined): string => {
  if (!timestamp) return "Sin fecha";
  const date = new Date(timestamp);
  return date.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(value || 0)));

const normalizeDraftNumber = (value: string): number => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
};

const splitIntoColumns = <T,>(items: T[], columnCount: number): T[][] => {
  if (items.length === 0) return [];
  const count = Math.max(1, Math.min(columnCount, items.length));
  const columns = Array.from({ length: count }, () => [] as T[]);

  items.forEach((item, index) => {
    columns[index % count].push(item);
  });

  return columns;
};

const buildTrackingCodeFromTask = (task: AdminWorkflowTask) => {
  console.log("=== DATOS COMPLETOS DEL TASK ===");
  console.log("Task completo:", task);
  console.log("task.clientId:", task.clientId);
  console.log("task.sourceId:", task.sourceId);
  console.log("task.id:", task.id);
  console.log("task.project:", task.project);
  console.log("task.title:", task.title);
  console.log("task.cita:", task.cita);
  console.log("task.sourceCitaId:", task.sourceCitaId);
  console.log("task.codigoProyecto:", (task as any).codigoProyecto);
  console.log("Todos los keys del task:", Object.keys(task));
  console.log("====================================");

  const rawTask = task as unknown as Record<string, unknown>;
  const citaRecord = rawTask.cita && typeof rawTask.cita === "object"
    ? (rawTask.cita as Record<string, unknown>)
    : null;

  const clientIdFromCita = citaRecord?.cliente && typeof citaRecord.cliente === "object"
    ? ((citaRecord.cliente as Record<string, unknown>)._id as string | undefined)
    : undefined;

  const candidates = [
    task.clientId,
    clientIdFromCita,
    typeof citaRecord?.clienteId === "string" ? citaRecord.clienteId : undefined,
    task.sourceCitaId,
    task.sourceId,
    task.id,
  ];

  const base = candidates.find((value): value is string => Boolean(value && value.trim().length > 0)) ?? task.id;
  const cleaned = base.replace(/[^a-zA-Z0-9]/g, "");
  return (cleaned || base).slice(0, 6).toUpperCase();
};

export default function ClientesConfirmadosPage() {
  const { refresh, updateTask } = useAdminWorkflow();
  const [tasks, setTasks] = useState<AdminWorkflowTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<AdminWorkflowTask | null>(null);
  const [publicStatusTaskId, setPublicStatusTaskId] = useState<string | null>(null);
  const [publicStatusMap, setPublicStatusMap] = useState<Record<string, PublicStatusDraft>>({});
  const [uploadingReceiptKey, setUploadingReceiptKey] = useState<string | null>(null);
  const [isSavingPublicStatus, setIsSavingPublicStatus] = useState(false);
  const [publicStatusError, setPublicStatusError] = useState<string | null>(null);
  const selectedTaskClientFiles = useClienteArchivos(selectedTask?.clientId, Boolean(selectedTask));

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(PUBLIC_STATUS_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Record<string, PublicStatusDraft>;
      if (parsed && typeof parsed === "object") {
        const normalized: Record<string, PublicStatusDraft> = {};
        for (const [key, value] of Object.entries(parsed)) {
          normalized[key] = normalizeDraft(value);
        }
        setPublicStatusMap(normalized);
      }
    } catch {
      setPublicStatusMap({});
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PUBLIC_STATUS_STORAGE_KEY, JSON.stringify(publicStatusMap));
  }, [publicStatusMap]);

  useEffect(() => {
    const load = async () => {
      try {
        const loadedTasks = await refresh();
        setTasks(loadedTasks.filter(isTaskConfirmed));
      } catch (currentError) {
        setError(currentError instanceof Error ? currentError.message : "No se pudieron cargar clientes confirmados");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [refresh]);

  const taskColumns = useMemo(() => splitIntoColumns(tasks, 3), [tasks]);
  console.log("Clientes confirmados:", tasks);
  const publicStatusTask = useMemo(
    () => tasks.find((task) => task.id === publicStatusTaskId) ?? null,
    [publicStatusTaskId, tasks],
  );

  const publicStatusDraft = publicStatusTaskId
    ? publicStatusMap[publicStatusTaskId] ?? defaultPublicStatusDraft
    : defaultPublicStatusDraft;

  const totalPagado =
    publicStatusDraft.anticipo.amount + publicStatusDraft.segundoPago.amount + publicStatusDraft.liquidacion.amount;

  useEffect(() => {
    if (!publicStatusTaskId || !publicStatusTask) return;
    if (publicStatusMap[publicStatusTaskId]) return;

    const taskPagos = (publicStatusTask as any).pagos as
      | {
          anticipo?: PublicStatusPaymentDraft;
          segundoPago?: PublicStatusPaymentDraft;
          liquidacion?: PublicStatusPaymentDraft;
        }
      | undefined;

    const seeded: PublicStatusDraft = {
      anticipo: normalizePaymentDraft(taskPagos?.anticipo),
      segundoPago: normalizePaymentDraft(taskPagos?.segundoPago),
      liquidacion: normalizePaymentDraft(taskPagos?.liquidacion),
      nota: typeof (publicStatusTask as any).seguimientoNota === "string" ? (publicStatusTask as any).seguimientoNota : "",
    };

    setPublicStatusMap((prev) => ({ ...prev, [publicStatusTaskId]: seeded }));
  }, [publicStatusMap, publicStatusTask, publicStatusTaskId]);

  const updateDraft = (patch: Partial<PublicStatusDraft>) => {
    if (!publicStatusTaskId) return;
    setPublicStatusMap((prev) => ({
      ...prev,
      [publicStatusTaskId]: {
        ...normalizeDraft(prev[publicStatusTaskId] ?? defaultPublicStatusDraft),
        ...patch,
      },
    }));
  };

  const updatePaymentDraft = (
    paymentKey: "anticipo" | "segundoPago" | "liquidacion",
    patch: Partial<PublicStatusPaymentDraft>,
  ) => {
    if (!publicStatusTaskId) return;

    setPublicStatusMap((prev) => {
      const current = normalizeDraft(prev[publicStatusTaskId] ?? defaultPublicStatusDraft);
      return {
        ...prev,
        [publicStatusTaskId]: {
          ...current,
          [paymentKey]: {
            ...current[paymentKey],
            ...patch,
          },
        },
      };
    });
  };

  const closePublicStatus = () => {
    setPublicStatusTaskId(null);
    setPublicStatusError(null);
    setUploadingReceiptKey(null);
    setIsSavingPublicStatus(false);
  };

  const handleUploadReceipt = async (
    paymentKey: "anticipo" | "segundoPago" | "liquidacion",
    tipoUpload: "recibo_1" | "recibo_2" | "recibo_3",
    file: File,
  ) => {
    if (!publicStatusTask) return;

    setPublicStatusError(null);
    setUploadingReceiptKey(paymentKey);

    try {
      const upload = await subirArchivoConMetadata(file, {
        tipo: tipoUpload,
        relacionadoA: "tarea",
        relacionadoId: publicStatusTask.sourceId,
        tareasId: publicStatusTask.sourceId,
        clienteId: publicStatusTask.clientId ?? publicStatusTask.codigoProyecto,
      });

      updatePaymentDraft(paymentKey, {
        receiptImage: upload.url,
        receiptLabel: file.name,
      });
    } catch (currentError) {
      setPublicStatusError(currentError instanceof Error ? currentError.message : "No se pudo subir el recibo.");
    } finally {
      setUploadingReceiptKey(null);
    }
  };

  const savePublicStatus = async () => {
    if (!publicStatusTask) return;
    setPublicStatusError(null);
    setIsSavingPublicStatus(true);

    try {
      const pagos = {
        anticipo: { ...publicStatusDraft.anticipo, amount: Math.max(0, Math.round(publicStatusDraft.anticipo.amount || 0)) },
        segundoPago: {
          ...publicStatusDraft.segundoPago,
          amount: Math.max(0, Math.round(publicStatusDraft.segundoPago.amount || 0)),
        },
        liquidacion: {
          ...publicStatusDraft.liquidacion,
          amount: Math.max(0, Math.round(publicStatusDraft.liquidacion.amount || 0)),
        },
      };

      await updateTask(publicStatusTask, {
        ...(publicStatusTask as any),
        pagos,
        seguimientoNota: publicStatusDraft.nota,
        notes: publicStatusDraft.nota,
      } as any);

      closePublicStatus();
    } catch (currentError) {
      setPublicStatusError(currentError instanceof Error ? currentError.message : "No se pudo guardar el estatus público.");
    } finally {
      setIsSavingPublicStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-secondary hover:text-primary">
            <ArrowLeft className="h-4 w-4" />
            Volver al panel
          </Link>
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Administración</p>
              <h1 className="text-2xl font-semibold text-primary">Clientes confirmados</h1>
            </div>
          </div>
          <p className="mt-2 text-sm text-secondary">Clientes que ya confirmaron su proyecto con la empresa.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-8"
        >
          {tasks.length === 0 ? (
            <div className="rounded-3xl border border-primary/10 bg-white p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <User className="h-8 w-8 text-secondary" />
              </div>
              <p className="mt-4 text-lg font-medium text-primary">No hay clientes confirmados aún</p>
              <p className="mt-2 text-sm text-secondary">Cuando un cliente confirme su proyecto aparecerá aquí.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              {taskColumns.map((column, colIdx) => (
                <div key={colIdx} className="flex min-w-0 flex-1 flex-col gap-4">
                  {column.map((task) => {
                    const tone = stageToneClass[task.stage] ?? "bg-primary/10 text-primary border-primary";
                    return (
                      <div
                        key={task.id}
                        className={`min-w-0 rounded-2xl border border-primary/10 bg-white p-5 shadow-sm transition hover:shadow-md border-l-4 ${tone.split(" ")[2]}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-secondary">Proyecto</p>
                              <h3 className="break-words text-base font-semibold text-primary">{task.project}</h3>
                              <p className="mt-2 inline-block rounded-lg bg-accent/15 px-2.5 py-1 text-xs font-bold text-accent">
                                {buildTrackingCodeFromTask(task)}
                              </p>
                              <p className="mt-2 text-sm text-secondary">{task.title}</p>
                            </div>
                          </div>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${tone}`}>
                            {stageLabel[task.stage] ?? task.stage}
                          </span>
                        </div>

                        <div className="mt-4 border-t border-primary/10 pt-4 text-xs text-secondary">
                          <div>Asignado: {getAssignedLabel(task)}</div>
                          <div className="mt-1 inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(task.createdAt)}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedTask(task)}
                          className="mt-5 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
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
          className="mt-8 rounded-2xl border border-primary/10 bg-primary/[0.04] px-6 py-4"
        >
          <p className="text-sm text-primary">
            <strong>Total de clientes confirmados:</strong> {tasks.length}
          </p>
        </motion.div>
      </div>

      <AnimatePresence>
        {selectedTask ? (
          <motion.div
            key={selectedTask.id}
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
              onClick={() => setSelectedTask(null)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirmados-expediente-title"
              className="flex h-full w-full max-w-xl shrink-0 flex-col overflow-y-auto bg-white shadow-2xl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-primary/10 px-6 py-5">
                <div className="min-w-0">
                  <p id="confirmados-expediente-title" className="text-lg font-semibold text-primary">
                    Expediente
                  </p>
                  <p className="mt-1 break-words text-sm font-medium text-primary">{selectedTask.project}</p>
                  <p className="mt-3 inline-block rounded-lg bg-accent/15 px-3 py-1.5 text-sm font-bold text-accent">
                    {buildTrackingCodeFromTask(selectedTask)}
                  </p>
                  <p className="mt-2 text-xs text-secondary">{selectedTask.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="rounded-xl p-2 text-secondary hover:bg-primary/10 hover:text-primary"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-6 px-6 py-6">
                <div className="rounded-2xl bg-background p-4 text-sm text-secondary">
                  <p><strong>Etapa:</strong> {stageLabel[selectedTask.stage] ?? selectedTask.stage}</p>
                  <p className="mt-1"><strong>Asignado a:</strong> {getAssignedLabel(selectedTask)}</p>
                  <p className="mt-1"><strong>Creado:</strong> {formatDate(selectedTask.createdAt)}</p>
                </div>

                {selectedTaskClientFiles.archivos.length > 0 ? (
                  <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-800">Archivos del cliente</p>
                    <div className="mt-3 space-y-2">
                      {selectedTaskClientFiles.archivos.map((file) => (
                        <a
                          key={`client-file-${file.id}`}
                          href={file.src}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs font-medium text-sky-900"
                        >
                          <span className="truncate">{file.name}</span>
                          <span className="rounded-full bg-sky-100 px-2 py-1 uppercase">{file.type}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}

                {getPreliminarList(selectedTask).length > 0 ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Cotización preliminar</p>
                    <div className="mt-3 space-y-2">
                      {getPreliminarList(selectedTask).map((data, index) => (
                        <div key={`preliminar-${index}`} className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                          <span className="text-xs font-medium text-emerald-800">{data.projectType}</span>
                          <button
                            type="button"
                            onClick={() =>
                              downloadPreliminarPdf(
                                data,
                                `cotizacion-preliminar-${(data.projectType || "proyecto").replace(/\s+/g, "-")}-${selectedTask.project.replace(/\s+/g, "-")}.pdf`,
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1.5 text-xs font-semibold text-emerald-800"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Descargar PDF
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {getCotizacionesFormalesList(selectedTask).length > 0 ? (
                  <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-800">Cotización formal</p>
                    <div className="mt-3 space-y-2">
                      {getCotizacionesFormalesList(selectedTask).map((data, index) => (
                        <div key={`formal-${index}`} className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                          <span className="text-xs font-medium text-violet-800">{data.projectType}</span>
                          <button
                            type="button"
                            onClick={() =>
                              downloadFormalPdf(
                                data,
                                `cotizacion-formal-${(data.projectType || "proyecto").replace(/\s+/g, "-")}-${selectedTask.project.replace(/\s+/g, "-")}.pdf`,
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-violet-100 px-2.5 py-1.5 text-xs font-semibold text-violet-800"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Descargar PDF
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selectedTaskClientFiles.archivos.length === 0 && getPreliminarList(selectedTask).length === 0 && getCotizacionesFormalesList(selectedTask).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-primary/15 bg-primary/5 px-4 py-3 text-xs text-secondary">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Sin archivos vinculados aún.
                    </div>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    setPublicStatusError(null);
                    setPublicStatusTaskId(selectedTask.id);
                  }}
                  className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-white"
                >
                  Estatus público
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {publicStatusTask ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-start justify-center bg-black/45 px-3 py-3 md:items-center md:px-4"
            onClick={closePublicStatus}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/70 bg-white p-4 shadow-2xl sm:p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Estatus público</p>
                  <h3 className="mt-2 text-xl font-semibold text-primary">{publicStatusTask.project}</h3>
                  <p className="mt-1 text-sm text-secondary">{publicStatusTask.title}</p>
                </div>
                <button
                  type="button"
                  onClick={closePublicStatus}
                  className="rounded-xl p-2 text-secondary hover:bg-primary/10"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-primary/10 bg-primary/[0.03] p-4 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Información del cliente</p>
                    <p className="mt-3"><strong>Proyecto:</strong> {publicStatusTask.project}</p>
                    <p className="mt-2">
                      <span className="inline-block rounded-lg bg-accent/15 px-3 py-1.5 text-xs font-bold text-accent">
                        {buildTrackingCodeFromTask(publicStatusTask)}
                      </span>
                    </p>
                    <p className="mt-3"><strong>Etapa:</strong> {stageLabel[publicStatusTask.stage] ?? publicStatusTask.stage}</p>
                    <p className="mt-1"><strong>Asignado:</strong> {getAssignedLabel(publicStatusTask)}</p>
                  </div>

                  <div className="rounded-2xl border border-primary/10 bg-white p-4">
                    <label className="text-xs font-semibold text-secondary">
                      Nota de seguimiento
                      <textarea
                        value={publicStatusDraft.nota}
                        onChange={(event) => updateDraft({ nota: event.target.value })}
                        placeholder="Anota acuerdos con cliente, recordatorios o estatus de cobro..."
                        className="mt-2 min-h-[160px] w-full rounded-2xl border border-primary/10 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>

                  <div className="rounded-2xl border border-primary/10 bg-primary/[0.03] px-4 py-3 text-xs">
                    <span className="text-secondary">
                      Pagado acumulado: <span className="font-semibold text-primary">{formatCurrency(totalPagado)}</span>
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-primary/10 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Seguimiento de pagos</p>
                  <div className="mt-3 grid gap-3">
                    {paymentFields.map((paymentField) => {
                      const payment = publicStatusDraft[paymentField.key];
                      return (
                        <div key={paymentField.key} className="rounded-2xl border border-primary/10 bg-primary/[0.02] p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">{paymentField.label}</p>
                          <label className="mt-2 block text-xs font-semibold text-secondary">
                            Cantidad
                            <input
                              type="number"
                              min={0}
                              value={payment.amount}
                              onChange={(event) =>
                                updatePaymentDraft(paymentField.key, { amount: normalizeDraftNumber(event.target.value) })
                              }
                              className="mt-1 w-full rounded-xl border border-primary/10 px-3 py-2 text-sm"
                            />
                          </label>
                          <div className="mt-3 rounded-xl border border-dashed border-primary/20 bg-white p-3">
                            {payment.receiptImage ? (
                              <div className="space-y-2">
                                <img
                                  src={payment.receiptImage}
                                  alt={`Comprobante ${paymentField.label}`}
                                  className="h-28 w-full rounded-lg object-cover"
                                />
                                <p className="truncate text-[11px] text-secondary">{payment.receiptLabel || "Recibo cargado"}</p>
                              </div>
                            ) : (
                              <p className="text-[11px] text-secondary">Sin comprobante cargado.</p>
                            )}

                            <div className="mt-3 flex items-center gap-2">
                              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-3 py-2 text-[11px] font-semibold text-white">
                                {uploadingReceiptKey === paymentField.key ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Upload className="h-3.5 w-3.5" />
                                )}
                                Subir recibo
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  disabled={uploadingReceiptKey === paymentField.key}
                                  onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (!file) return;
                                    void handleUploadReceipt(paymentField.key, paymentField.tipoUpload, file);
                                    event.currentTarget.value = "";
                                  }}
                                />
                              </label>
                              {payment.receiptImage ? (
                                <button
                                  type="button"
                                  onClick={() => updatePaymentDraft(paymentField.key, { receiptImage: "", receiptLabel: "Ver recibo" })}
                                  className="rounded-lg border border-primary/10 px-3 py-2 text-[11px] font-semibold text-secondary"
                                >
                                  Quitar
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {publicStatusError ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
                  {publicStatusError}
                </div>
              ) : null}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={closePublicStatus}
                  className="w-full rounded-2xl border border-primary/10 bg-white py-3 text-xs font-semibold text-secondary"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  disabled={isSavingPublicStatus || Boolean(uploadingReceiptKey)}
                  onClick={() => {
                    void savePublicStatus();
                  }}
                  className="w-full rounded-2xl bg-accent py-3 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {isSavingPublicStatus ? "Guardando..." : "Guardar seguimiento"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
