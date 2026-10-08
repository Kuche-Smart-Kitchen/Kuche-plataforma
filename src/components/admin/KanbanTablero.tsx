 "use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  FileUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Trash2,
  CloudUpload,
  CalendarPlus,
  Loader2,
} from "lucide-react";

import Captcha, { type CaptchaRef } from "@/components/ui/Captcha";
import { DueDateInput } from "@/components/ui/DueDateInput";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useTareasContext } from "@/contexts/TareasContext";
import {
  fetchBackendKanbanTasks,
  approveClientDesignWithBackend,
  syncCitaFinishWithBackend,
  syncCitaStartWithBackend,
  syncTaskFollowUpWithBackend,
  syncTaskPatchWithBackend,
  syncTaskStageWithBackend,
} from "@/lib/admin-workflow";
import { syncSeguimientoEstadoFromKanbanConfirm } from "@/lib/seguimiento-project";
import {
  activeCitaTaskStorageKey,
  kanbanColumns,
  initialKanbanTasks,
  kanbanTasksUpdatedEventName,
  notifyKanbanTasksUpdated,
  syncSeguimientoProjectKanbanStage,
  type KanbanTask,
  type TaskFile,
  type TaskPriority,
  type TaskStage,
  type TaskStatus,
  type FollowUpStatus,
  type PreliminarData,
  type CotizacionFormalData,
  stageStyles,
  getCotizacionesFormalesList,
} from "@/lib/kanban";
import { dueDateToSortTimestamp, formatDueDateTimeDisplay } from "@/lib/kanban-due-datetime";
import { subirArchivoCliente, subirDisenoDropbox } from "@/lib/axios/archivosClienteApi";
import { obtenerDisponibilidadDia } from "@/lib/axios/citasApi";
import { agendarVisita, obtenerDisponibilidadVisita } from "@/lib/axios/visitasApi";
import { eliminarTarea } from "@/lib/axios/tareasApi";

const currentUser = "Valeria";
const hasFinalDesign = (task: KanbanTask) => Boolean(task.files?.some((file) => file.nivel === "final"));
const VISIT_TIME_SLOTS = Array.from({ length: 9 }, (_, index) => `${String(index + 9).padStart(2, "0")}:00`);

const getTimeInMinutes = (value: string) => {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return Number.isInteger(hours) && Number.isInteger(minutes) ? hours * 60 + minutes : null;
};

const getVisitRequestErrorMessage = (error: unknown) => {
  if (error && typeof error === "object") {
    const requestError = error as {
      message?: unknown;
      response?: { status?: number; data?: unknown };
    };
    const responseData = requestError.response?.data;
    if (typeof responseData === "string" && responseData.trim()) return responseData;
    if (responseData && typeof responseData === "object") {
      const body = responseData as Record<string, unknown>;
      if (typeof body.message === "string" && body.message.trim()) return body.message;
      if (typeof body.error === "string" && body.error.trim()) return body.error;
    }
    if (requestError.response?.status === 409) {
      return "Conflicto del backend (409): revisa si el horario está ocupado o si ya existe una visita para esta tarjeta.";
    }
    if (typeof requestError.message === "string" && requestError.message.trim()) return requestError.message;
  }
  return "No se pudo registrar la visita.";
};

const statusStyles: Record<TaskStatus, string> = {
  pendiente: "bg-rose-50 text-rose-600",
  completada: "bg-emerald-50 text-emerald-600",
};

const priorityStyles: Record<TaskPriority, string> = {
  alta: "bg-rose-100 text-rose-700",
  media: "bg-amber-100 text-amber-700",
  baja: "bg-emerald-100 text-emerald-700",
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const FOLLOWUP_WARNING_DAYS = 3;
const FOLLOWUP_URGENT_DAYS = 7;
const FOLLOWUP_AUTO_DISCARD_DAYS = 10;

const getFollowUpAlertLevel = (enteredAt: number | undefined): "none" | "warning" | "urgent" | "expired" => {
  if (!enteredAt) return "none";
  const now = Date.now();
  const daysPassed = Math.floor((now - enteredAt) / (1000 * 60 * 60 * 24));
  if (daysPassed >= FOLLOWUP_AUTO_DISCARD_DAYS) return "expired";
  if (daysPassed >= FOLLOWUP_URGENT_DAYS) return "urgent";
  if (daysPassed >= FOLLOWUP_WARNING_DAYS) return "warning";
  return "none";
};

const getDaysInFollowUp = (enteredAt: number | undefined): number => {
  if (!enteredAt) return 0;
  return Math.floor((Date.now() - enteredAt) / (1000 * 60 * 60 * 24));
};

const formatDate = (timestamp: number | undefined): string => {
  if (!timestamp) return "Sin fecha";
  const date = new Date(timestamp);
  return date.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
};

/**
 * Convierte el valor guardado en "Enlace de Google Maps" en una URL que abra correctamente.
 * - Si ya es un enlace (http/https o contiene google.com/maps), se normaliza con protocolo.
 * - Si es texto de dirección (ej. "Constitución 214, Durango"), se construye la búsqueda en Google Maps.
 */
const normalizeMapsUrl = (url: string | undefined): string => {
  if (!url || !url.trim()) return "#";
  const u = url.trim();
  const hasProtocol = /^https?:\/\//i.test(u);
  const looksLikeMapsLink = hasProtocol || /google\.com\/maps|maps\.google|goo\.gl\/maps/i.test(u);
  if (looksLikeMapsLink) return hasProtocol ? u : `https://${u}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(u)}`;
};

const normalizeTask = (task: Partial<KanbanTask> & Record<string, unknown>): KanbanTask => {
  const legacyType = typeof task.type === "string" ? task.type : undefined;
  const legacyStage =
    legacyType === "cita"
      ? "citas"
      : legacyType === "diseño" || legacyType === "diseno"
        ? "disenos"
        : legacyType === "todo"
          ? "cotizacion"
          : undefined;
  const kanbanStageFromRecord =
    typeof task.kanbanStage === "string" ? task.kanbanStage : undefined;

  let stage: TaskStage =
    typeof task.stage === "string" && kanbanColumns.some((col) => col.id === task.stage)
      ? (task.stage as TaskStage)
      : legacyStage ?? "citas";

  const citaStarted = Boolean(task.citaStarted) || kanbanStageFromRecord === "disenos";
  const citaFinished = Boolean(task.citaFinished) || kanbanStageFromRecord === "disenos";

  if (kanbanStageFromRecord === "disenos" || (citaStarted && citaFinished && stage === "citas")) {
    stage = "disenos";
  }

  let status: TaskStatus = task.status === "completada" ? "completada" : "pendiente";
  if (stage === "disenos" && (kanbanStageFromRecord === "disenos" || (citaStarted && citaFinished))) {
    status = "pendiente";
  }

  const rawAssigned = task.assignedTo ?? task.employee;
  const assignedTo: string[] = Array.isArray(rawAssigned)
    ? rawAssigned.filter((s): s is string => typeof s === "string")
    : typeof rawAssigned === "string" && rawAssigned
      ? [rawAssigned]
      : ["Sin asignar"];
  const assignedToIds: string[] = Array.isArray(task.assignedToIds)
    ? task.assignedToIds.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    : [];
  const priority: TaskPriority =
    task.priority === "alta" || task.priority === "baja" ? task.priority : "media";
  const followUpStatus: FollowUpStatus =
    task.followUpStatus === "confirmado" || task.followUpStatus === "descartado"
      ? task.followUpStatus
      : "pendiente";
  const preliminarData =
    task.preliminarData &&
    typeof task.preliminarData === "object" &&
    typeof (task.preliminarData as PreliminarData).client === "string"
      ? (task.preliminarData as PreliminarData)
      : undefined;
  const cotizacionFormalData =
    task.cotizacionFormalData &&
    typeof task.cotizacionFormalData === "object" &&
    typeof (task.cotizacionFormalData as CotizacionFormalData).client === "string"
      ? (task.cotizacionFormalData as CotizacionFormalData)
      : undefined;
  const preliminarCotizaciones: PreliminarData[] =
    Array.isArray(task.preliminarCotizaciones) && task.preliminarCotizaciones.length > 0
      ? task.preliminarCotizaciones.filter(
          (p): p is PreliminarData => typeof p === "object" && typeof (p as PreliminarData).client === "string",
        )
      : preliminarData
        ? [preliminarData]
        : [];
  const cotizacionesFormales: CotizacionFormalData[] =
    Array.isArray(task.cotizacionesFormales) && task.cotizacionesFormales.length > 0
      ? task.cotizacionesFormales.filter(
          (c): c is CotizacionFormalData =>
            typeof c === "object" && typeof (c as CotizacionFormalData).client === "string",
        )
      : cotizacionFormalData
        ? [cotizacionFormalData]
        : [];

  const rawFeedback = typeof task.designFeedback === "string" ? task.designFeedback.trim() : "";
  const resolvedKey = `kuche_feedback_resolved_${task.id}`;
  const resolvedTimestampStr = typeof window !== "undefined" ? localStorage.getItem(resolvedKey) : null;

  let effectiveFeedback: string | undefined = rawFeedback || undefined;

  if (rawFeedback && resolvedTimestampStr) {
    const resolvedAt = Number(resolvedTimestampStr);
    const updatedAtRaw = task.updatedAt;
    const taskUpdatedAt =
      typeof updatedAtRaw === "number" && Number.isFinite(updatedAtRaw)
        ? updatedAtRaw
        : typeof updatedAtRaw === "string"
          ? Date.parse(updatedAtRaw)
          : 0;

    if (taskUpdatedAt > resolvedAt + 1000) {
      try {
        localStorage.removeItem(resolvedKey);
      } catch {
        // ignore
      }
      effectiveFeedback = rawFeedback;
    } else {
      effectiveFeedback = undefined;
    }
  } else if (!rawFeedback && resolvedTimestampStr) {
    try {
      localStorage.removeItem(resolvedKey);
    } catch {
      // ignore
    }
  }

  const updatedAt =
    typeof task.updatedAt === "number" && Number.isFinite(task.updatedAt)
      ? task.updatedAt
      : typeof task.updatedAt === "string"
        ? Date.parse(task.updatedAt) || undefined
        : undefined;

  return {
    id: typeof task.id === "string" ? task.id : `task-${Date.now()}`,
    sourceId: typeof task.sourceId === "string" ? task.sourceId : undefined,
    sourceType: typeof task.sourceType === "string" ? task.sourceType : undefined,
    title: typeof task.title === "string" ? task.title : "Tarea sin título",
    stage,
    status,
    assignedTo,
    assignedToIds,
    project: typeof task.project === "string" ? task.project : "General",
    clientEmail: typeof task.clientEmail === "string" ? task.clientEmail : undefined,
    clientPhone: typeof task.clientPhone === "string" ? task.clientPhone : undefined,
    notes: typeof task.notes === "string" ? task.notes : "",
    files: Array.isArray(task.files) ? (task.files as TaskFile[]) : [],
    priority,
    dueDate: typeof task.dueDate === "string" ? task.dueDate : undefined,
    location: typeof task.location === "string" ? task.location : undefined,
    mapsUrl: typeof task.mapsUrl === "string" ? task.mapsUrl : undefined,
    createdAt: typeof task.createdAt === "number" && task.createdAt > 1600000000000
      ? task.createdAt
      : undefined,
    updatedAt,
    followUpEnteredAt: typeof task.followUpEnteredAt === "number"
      ? task.followUpEnteredAt
      : undefined,
    followUpStatus,
    preliminarData,
    cotizacionFormalData,
    preliminarCotizaciones,
    cotizacionesFormales,
    citaStarted,
    citaFinished,
    designApprovedByAdmin: Boolean(task.designApprovedByAdmin),
    designApprovedByClient: Boolean(task.designApprovedByClient),
    designFeedback: effectiveFeedback,
    codigoProyecto:
      (typeof task.codigoProyecto === "string" && task.codigoProyecto.trim()) ||
      (typeof task.codigoCliente === "string" && task.codigoCliente.trim()) ||
      (typeof task.clientId === "string" && task.clientId.trim()) ||
      (typeof task.codigo === "string" && task.codigo.trim()) ||
      undefined,
    contractDate: typeof task.contractDate === "string" ? task.contractDate : undefined,
    estimatedDeliveryDate:
      typeof task.estimatedDeliveryDate === "string" ? task.estimatedDeliveryDate : undefined,
    projectTypeSummary:
      typeof task.projectTypeSummary === "string" ? task.projectTypeSummary : undefined,
    presupuestoTotal: typeof task.presupuestoTotal === "number" ? task.presupuestoTotal : undefined,
    totalPagado: typeof task.totalPagado === "number" ? task.totalPagado : undefined,
  };
};

/** Normaliza y corrige las tareas recibidas desde el backend sin inventar datos. */
const mergeTasks = (storedTasks: KanbanTask[]) => {
  return storedTasks.map((task) => repairTaskStatusAfterEarlyFollowUp(task));
};

/** Confirmar/descartar en Seguimiento cierra la tarjeta en el tablero; en otras columnas solo marca compromiso. */
const followUpDecisionUpdates = (
  task: KanbanTask,
  decision: "confirmado" | "descartado",
): Partial<Pick<KanbanTask, "followUpStatus" | "status">> => {
  if (task.stage === "contrato") {
    return { followUpStatus: decision, status: "completada" };
  }
  return { followUpStatus: decision };
};

/**
 * Repara tareas guardadas cuando confirmar cliente puso `status: completada` fuera de Seguimiento.
 */
const repairTaskStatusAfterEarlyFollowUp = (task: KanbanTask): KanbanTask => {
  if (task.stage === "contrato" || task.status !== "completada") return task;
  if (task.followUpStatus !== "confirmado" && task.followUpStatus !== "descartado") return task;

  const columnWorkComplete =
    task.stage === "citas"
      ? Boolean(task.citaStarted && task.citaFinished)
      : task.stage === "disenos"
        ? Boolean(task.designApprovedByAdmin && task.designApprovedByClient)
        : task.stage === "cotizacion"
          ? Boolean(task.citaStarted && task.citaFinished)
          : false;

  return columnWorkComplete ? task : { ...task, status: "pendiente" };
};

/** Mueve a la siguiente columna las tareas que ya completaron su flujo en la etapa actual. */
const autoAdvanceCompletedTasks = (tasks: KanbanTask[]): { tasks: KanbanTask[]; changed: boolean } => {
  let changed = false;
  const next = tasks.map((task) => {
    if (task.stage === "citas" && task.citaStarted && task.citaFinished) {
      changed = true;
      return { ...task, stage: "disenos" as TaskStage, status: "pendiente" as TaskStatus };
    }
    if (task.stage === "disenos" && task.designApprovedByAdmin && task.designApprovedByClient) {
      changed = true;
      return {
        ...task,
        stage: "cotizacion" as TaskStage,
        status: "pendiente" as TaskStatus,
        citaStarted: false,
        citaFinished: false,
      };
    }
    return task;
  });
  return { tasks: changed ? next : tasks, changed };
};

const hydrateKanbanTasksFromLocalStorage = (
  rawTasks: KanbanTask[],
): { tasks: KanbanTask[]; changed: boolean } => {
  if (!Array.isArray(rawTasks) || rawTasks.length === 0) {
    return { tasks: rawTasks, changed: false };
  }
  const normalized = rawTasks.map((task) => normalizeTask(task));
  const merged = mergeTasks(normalized);
  const { tasks, changed } = autoAdvanceCompletedTasks(merged);
  return { tasks, changed };
};

const KANBAN_PERSIST_ERROR =
  "No se pudo guardar el tablero: almacenamiento lleno. Libera espacio del navegador o reduce tareas/archivos.";

export type KanbanTableroProps = {
  /** Filtrar por nombre de empleado. null = ver todo, string = solo ese empleado. */
  filterByEmployee?: string | null;
  /** Filtro adicional (ej. solo pipeline “en proceso” en dashboard empleado). */
  pipelineFilter?: (task: KanbanTask) => boolean;
  /** Incrementar para forzar re-lectura desde localStorage (ej. tras crear tarea). */
  refreshTrigger?: number;
  /** Lista de integrantes para reasignar desde el detalle. */
  teamMembers?: { id: string; name: string }[];
  /** Si false, no se muestra el botón Eliminar tarea (ej. vista empleado). Por defecto true. */
  allowDeleteTask?: boolean;
  /** Habilita la aprobación administrativa de diseños en el tablero de Operaciones. */
  allowDesignApproval?: boolean;
  /** Llamado después de descartar un cliente en Seguimiento (ej. admin redirige a clientes-descartados). */
  onAfterDiscard?: () => void;
};

export function KanbanTablero(props: KanbanTableroProps = {}) {
  const {
    filterByEmployee,
    pipelineFilter,
    refreshTrigger = 0,
    teamMembers,
    allowDeleteTask = true,
    allowDesignApproval = false,
    onAfterDiscard,
  } = props;
  const { actualizar: actualizarTareaEnBackend, asignarTrabajadores } = useTareasContext();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"all" | "mine">("all");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [uploadTaskId, setUploadTaskId] = useState<string | null>(null);
  const [kanbanTasks, setKanbanTasks] = useState<KanbanTask[]>(initialKanbanTasks);
  const kanbanTasksRef = useRef<KanbanTask[]>(initialKanbanTasks);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<TaskStage | null>(null);
  const [sortBy, setSortBy] = useState<"default" | "priority" | "date">("default");
  const [dragErrorMessage, setDragErrorMessage] = useState<string | null>(null);
  const [kanbanPersistError, setKanbanPersistError] = useState<string | null>(null);
  const [backendSyncMessage, setBackendSyncMessage] = useState<string | null>(null);
  const [uploadToast, setUploadToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [savingTask, setSavingTask] = useState(false);
  const [taskSaveMessage, setTaskSaveMessage] = useState<string | null>(null);
  const [uploadAcceptedDesignsTaskId, setUploadAcceptedDesignsTaskId] = useState<string | null>(null);
  const [dropboxStagingFile, setDropboxStagingFile] = useState<File | null>(null);
  const [dropboxUploading, setDropboxUploading] = useState(false);
  const [designStagingFiles, setDesignStagingFiles] = useState<File[]>([]);
  const [designFilesUploading, setDesignFilesUploading] = useState(false);
  const [panelFilesUploading, setPanelFilesUploading] = useState(false);
  const [deleteConfirmTaskId, setDeleteConfirmTaskId] = useState<string | null>(null);
  const [deleteTaskInProgress, setDeleteTaskInProgress] = useState(false);
  const [deleteConfirmError, setDeleteConfirmError] = useState<string | null>(null);
  const ignoreDeleteBackdropClickRef = useRef(false);
  const [cotizacionEntregadaTaskId, setCotizacionEntregadaTaskId] = useState<string | null>(null);
  const [scheduleVisitTaskId, setScheduleVisitTaskId] = useState<string | null>(null);
  const [visitDraft, setVisitDraft] = useState({
    date: "",
    time: "09:00",
    client: "",
    email: "",
    phone: "",
    location: "",
  });
  const [visitCaptchaToken, setVisitCaptchaToken] = useState("");
  const [visitSaving, setVisitSaving] = useState(false);
  const [visitError, setVisitError] = useState<string | null>(null);
  const [approvingDesignTaskId, setApprovingDesignTaskId] = useState<string | null>(null);
  const [approvingClientTaskId, setApprovingClientTaskId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const activeTaskRef = useRef<HTMLElement | null>(null);
  const panelScrollRef = useRef<HTMLElement | null>(null);
  const uploadTaskRef = useRef<HTMLDivElement | null>(null);
  const uploadAcceptedDesignsRef = useRef<HTMLDivElement | null>(null);
  const deleteConfirmRef = useRef<HTMLDivElement | null>(null);
  const deleteTaskTriggerRef = useRef<HTMLButtonElement | null>(null);
  const skipPanelTrapInitialFocusRef = useRef(false);
  const restoreFocusToDeleteTriggerRef = useRef(false);
  const cotizacionEntregadaRef = useRef<HTMLDivElement | null>(null);
  const scheduleVisitRef = useRef<HTMLDivElement | null>(null);
  const visitCaptchaRef = useRef<CaptchaRef | null>(null);

  const commitKanbanTasks = useCallback((nextTasks: KanbanTask[]) => {
    kanbanTasksRef.current = nextTasks;
    setKanbanTasks(nextTasks);
    const ok = notifyKanbanTasksUpdated(nextTasks);
    setKanbanPersistError(ok ? null : KANBAN_PERSIST_ERROR);
  }, []);

  const hydrateAndApplyTasks = useCallback(
    (rawTasks: KanbanTask[], persistIfChanged = false) => {
      const { tasks, changed } = hydrateKanbanTasksFromLocalStorage(rawTasks);
      kanbanTasksRef.current = tasks;
      setKanbanTasks(tasks);
      if (persistIfChanged && changed && tasks.length > 0) {
        const ok = notifyKanbanTasksUpdated(tasks);
        setKanbanPersistError(ok ? null : KANBAN_PERSIST_ERROR);
      }
      return tasks;
    },
    [],
  );

  useEffect(() => {
    setMounted(true);
    setActiveTaskId(null);
    setDeleteConfirmTaskId(null);
    setUploadTaskId(null);
    setUploadAcceptedDesignsTaskId(null);
    setDropboxStagingFile(null);
    setDesignStagingFiles([]);
    setCotizacionEntregadaTaskId(null);
    setDragErrorMessage(null);
    setTaskSaveMessage(null);
  }, []);

  useEscapeClose(Boolean(activeTaskId) && !deleteConfirmTaskId, () => setActiveTaskId(null));
  useEscapeClose(Boolean(uploadTaskId), () => {
    setUploadTaskId(null);
    setDesignStagingFiles([]);
  });
  useEscapeClose(Boolean(uploadAcceptedDesignsTaskId), () => {
    setUploadAcceptedDesignsTaskId(null);
    setDropboxStagingFile(null);
  });
  useEscapeClose(Boolean(deleteConfirmTaskId) && !deleteTaskInProgress, () => {
    closeDeleteConfirm();
  });
  useEscapeClose(Boolean(cotizacionEntregadaTaskId), () => setCotizacionEntregadaTaskId(null));
  useEscapeClose(Boolean(scheduleVisitTaskId), () => setScheduleVisitTaskId(null));
  useFocusTrap(Boolean(activeTaskId) && !deleteConfirmTaskId, activeTaskRef, {
    skipInitialFocusRef: skipPanelTrapInitialFocusRef,
  });
  useFocusTrap(Boolean(uploadTaskId), uploadTaskRef);
  useFocusTrap(Boolean(uploadAcceptedDesignsTaskId), uploadAcceptedDesignsRef);
  useFocusTrap(Boolean(deleteConfirmTaskId), deleteConfirmRef, { deferInitialFocus: true });
  useFocusTrap(Boolean(cotizacionEntregadaTaskId), cotizacionEntregadaRef);
  useFocusTrap(Boolean(scheduleVisitTaskId), scheduleVisitRef);
  // Al abrir el panel de detalle, aseguramos que se muestre desde el inicio.
  useEffect(() => {
    if (!activeTaskId) return;
    const el = panelScrollRef.current;
    if (!el) return;

    // Doble rAF: por si el focus trap o la animación realizan cambios
    // que también ajusten el scroll.
    requestAnimationFrame(() => {
      el.scrollTop = 0;
      requestAnimationFrame(() => {
        el.scrollTop = 0;
      });
    });
  }, [activeTaskId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncFromBackend = async () => {
      try {
        const backendTasks = await fetchBackendKanbanTasks();
        hydrateAndApplyTasks(backendTasks, backendTasks.length > 0);
      } catch (error) {
        console.warn("No se pudieron cargar las tareas del kanban desde backend.", error);
        hydrateAndApplyTasks([], false);
      }
    };

    void syncFromBackend();
    const handleFocus = () => {
      void syncFromBackend();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void syncFromBackend();
      }
    };
    const handleKanbanTasksUpdated = () => void syncFromBackend();
    window.addEventListener("focus", handleFocus);
    window.addEventListener(kanbanTasksUpdatedEventName, handleKanbanTasksUpdated);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener(kanbanTasksUpdatedEventName, handleKanbanTasksUpdated);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [hydrateAndApplyTasks]);

  useEffect(() => {
    if (typeof window === "undefined" || refreshTrigger === 0) return;

    const refreshFromBackend = async () => {
      try {
        const backendTasks = await fetchBackendKanbanTasks();
        hydrateAndApplyTasks(backendTasks, backendTasks.length > 0);
      } catch (error) {
        console.warn("No se pudo refrescar el kanban desde backend.", error);
        hydrateAndApplyTasks([], false);
      }
    };

    void refreshFromBackend();
  }, [refreshTrigger, hydrateAndApplyTasks]);

  useEffect(() => {
    const autoDiscardExpiredFollowUps = () => {
      const updated = kanbanTasksRef.current.map((task) => {
        if (
          task.stage === "contrato" &&
          task.followUpStatus === "pendiente" &&
          task.followUpEnteredAt
        ) {
          const daysPassed = Math.floor((Date.now() - task.followUpEnteredAt) / (1000 * 60 * 60 * 24));
          if (daysPassed >= FOLLOWUP_AUTO_DISCARD_DAYS) {
            return {
              ...task,
              followUpStatus: "descartado" as FollowUpStatus,
              status: "completada" as TaskStatus,
            };
          }
        }
        return task;
      });

      if (updated.some((task, index) => task !== kanbanTasksRef.current[index])) {
        commitKanbanTasks(updated);
      }
    };

    const runAutoAdvance = () => {
      const { tasks, changed } = autoAdvanceCompletedTasks(kanbanTasksRef.current);
      if (changed) commitKanbanTasks(tasks);
    };

    autoDiscardExpiredFollowUps();
    runAutoAdvance();
    const interval = setInterval(() => {
      autoDiscardExpiredFollowUps();
      runAutoAdvance();
    }, 60000);
    return () => clearInterval(interval);
  }, [commitKanbanTasks]);

  const filteredTasks = useMemo(() => {
    let list: KanbanTask[];
    if (filterByEmployee !== undefined) {
      if (filterByEmployee === null || filterByEmployee === "") {
        list = kanbanTasks;
      } else {
        list = kanbanTasks.filter((task) =>
          Array.isArray(task.assignedTo) ? task.assignedTo.includes(filterByEmployee) : false,
        );
      }
    } else if (viewMode === "mine") {
      list = kanbanTasks.filter((task) =>
        Array.isArray(task.assignedTo) ? task.assignedTo.includes(currentUser) : false,
      );
    } else {
      list = kanbanTasks;
    }
    if (pipelineFilter) {
      list = list.filter(pipelineFilter);
    }
    return list;
  }, [kanbanTasks, viewMode, filterByEmployee, pipelineFilter]);

  const updateTask = (taskId: string, updater: (task: KanbanTask) => KanbanTask) => {
    const nextTasks = kanbanTasksRef.current.map((task) =>
      task.id === taskId ? updater(task) : task,
    );
    commitKanbanTasks(nextTasks);
  };

  const updateTaskAndSync = async (taskId: string, patch: Partial<KanbanTask>) => {
    const taskSnapshot = kanbanTasksRef.current.find((task) => task.id === taskId);
    updateTask(taskId, (task) => ({ ...task, ...patch }));

    if (!taskSnapshot) return;

    try {
      await actualizarTareaEnBackend(taskSnapshot, patch);
    } catch {
      setBackendSyncMessage("Los cambios se guardaron localmente, pero no se pudo sincronizar con backend.");
      window.setTimeout(() => setBackendSyncMessage(null), 4500);
    }
  };

  const removeTask = (taskId: string) => {
    const nextTasks = kanbanTasksRef.current.filter((task) => task.id !== taskId);
    commitKanbanTasks(nextTasks);
    setActiveTaskId((current) => (current === taskId ? null : current));
  };

  const setTaskStatus = (taskId: string, status: TaskStatus) => {
    updateTask(taskId, (task) => ({ ...task, status }));
  };

  const moveTaskToStage = async (taskId: string, stage: TaskStage) => {
    const taskSnapshot = kanbanTasksRef.current.find((t) => t.id === taskId);
    const updates: Partial<KanbanTask> = { stage };
    if (stage === "contrato" && taskSnapshot?.stage !== "contrato") {
      updates.followUpEnteredAt = Date.now();
      updates.followUpStatus = "pendiente";
    }

    updateTask(taskId, (task) => ({ ...task, ...updates }));

    if (taskSnapshot) {
      const [stageOk, patchOk] = await Promise.all([
        syncTaskStageWithBackend(taskSnapshot, stage),
        syncTaskPatchWithBackend(taskSnapshot, updates),
      ]);
      if (!stageOk || !patchOk) {
        setBackendSyncMessage("Se movió localmente, pero no se pudo sincronizar la etapa con backend.");
        window.setTimeout(() => setBackendSyncMessage(null), 4500);
      }
    }
  };

  const tryMoveTaskToStage = async (taskId: string, targetStage: TaskStage): Promise<boolean> => {
    const task = kanbanTasksRef.current.find((t) => t.id === taskId);
    if (!task) return false;
    
    if (task.stage === targetStage) return true;

    const showError = (message: string) => {
      setDragErrorMessage(message);
      setTimeout(() => setDragErrorMessage(null), 4000);
    };

    // Validaciones específicas por etapa
    if (task.stage === "citas") {
      if (!task.citaStarted) {
        showError("Debes iniciar la cita antes de mover esta tarea");
        return false;
      }
      if (!task.citaFinished) {
        showError("Debes terminar la cita antes de mover esta tarea");
        return false;
      }
    }

    if (task.stage === "disenos") {
      if (!task.designApprovedByAdmin) {
        showError("El diseño debe ser aprobado por el admin antes de mover esta tarea");
        return false;
      }
      if (!task.designApprovedByClient) {
        showError("El cliente debe aprobar el diseño antes de mover esta tarea");
        return false;
      }
    }

    if (task.stage === "cotizacion") {
      if (!task.citaStarted || !task.citaFinished) {
        showError("Debes iniciar y terminar la cotizacion antes de mover a seguimiento");
        return false;
      }
      if (getCotizacionesFormalesList(task).length > 0 && targetStage === "contrato") {
        showError('Usa el botón «Cotización entregada» en la tarjeta para pasar a Seguimiento.');
        return false;
      }
    }

    if (task.stage === "contrato") {
      if (task.followUpStatus !== "confirmado" && task.followUpStatus !== "descartado") {
        showError("Debes confirmar o descartar el seguimiento antes de mover esta tarea");
        return false;
      }
    }

    // Validación general: cada etapa se considera completa por sus propios flags
    const flowComplete =
      task.stage === "citas" ? Boolean(task.citaStarted && task.citaFinished) :
      task.stage === "disenos" ? Boolean(task.designApprovedByAdmin && task.designApprovedByClient) :
      task.stage === "cotizacion" ? Boolean(task.citaStarted && task.citaFinished) :
      task.stage === "contrato"
        ? task.followUpStatus === "confirmado" || task.followUpStatus === "descartado"
        : false;
    if (!flowComplete) {
      showError("Debes completar la tarea antes de moverla a otra columna");
      return false;
    }

    await moveTaskToStage(taskId, targetStage);
    return true;
  };

  const confirmFollowUp = async (taskId: string) => {
    const task = kanbanTasksRef.current.find((t) => t.id === taskId);
    // Compromiso del cliente: en Seguimiento la tarjeta sale del tablero; en Citas/Diseños/Cotización el flujo sigue.
    updateTask(taskId, (t) => ({
      ...t,
      ...followUpDecisionUpdates(t, "confirmado"),
    }));
    if (task) {
      syncSeguimientoEstadoFromKanbanConfirm({
        ...task,
        followUpStatus: "confirmado",
      });
      if (task.stage === "contrato") {
        setActiveTaskId(null);
      }
      const ok = await syncTaskFollowUpWithBackend(task, "confirmado");
      if (!ok) {
        setBackendSyncMessage("Se confirmó localmente, pero backend no respondió para seguimiento.");
        window.setTimeout(() => setBackendSyncMessage(null), 4500);
      }
    }
  };

  const discardFollowUp = async (taskId: string) => {
    const task = kanbanTasksRef.current.find((t) => t.id === taskId);
    updateTask(taskId, (t) => ({
      ...t,
      ...followUpDecisionUpdates(t, "descartado"),
    }));
    if (task?.stage === "contrato") {
      setActiveTaskId(null);
    }
    if (task) {
      const ok = await syncTaskFollowUpWithBackend(task, "descartado");
      if (!ok) {
        setBackendSyncMessage("Se descartó localmente, pero backend no respondió para seguimiento.");
        window.setTimeout(() => setBackendSyncMessage(null), 4500);
      }
    }
    onAfterDiscard?.();
  };

  const openScheduleVisit = (task: KanbanTask) => {
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 1);
    const date = `${scheduledDate.getFullYear()}-${String(scheduledDate.getMonth() + 1).padStart(2, "0")}-${String(scheduledDate.getDate()).padStart(2, "0")}`;
    setVisitDraft({
      date,
      time: "09:00",
      client: task.project,
      email: task.clientEmail ?? "",
      phone: task.clientPhone ?? "",
      location: task.location ?? "",
    });
    setVisitError(null);
    setVisitCaptchaToken("");
    setScheduleVisitTaskId(task.id);
  };

  const saveScheduledVisit = async () => {
    const task = kanbanTasksRef.current.find((item) => item.id === scheduleVisitTaskId);
    if (!task) return;
    if (!visitDraft.client.trim() || !visitDraft.email.trim() || !visitDraft.phone.trim() || !visitDraft.date || !visitDraft.time) {
      setVisitError("Completa cliente, correo, teléfono, fecha y hora.");
      return;
    }
    if (!visitCaptchaToken) {
      setVisitError("Confirma el captcha para registrar la visita.");
      return;
    }
    if (new Date(`${visitDraft.date}T${visitDraft.time}:00`) <= new Date()) {
      setVisitError("La visita debe programarse en una fecha y hora futuras.");
      return;
    }

    setVisitSaving(true);
    setVisitError(null);
    try {
      const [visitsAvailability, appointmentsAvailability] = await Promise.all([
        obtenerDisponibilidadVisita(visitDraft.date),
        obtenerDisponibilidadDia(visitDraft.date),
      ]);
      if (!visitsAvailability.success || !appointmentsAvailability.success) {
        throw new Error("No se pudo confirmar la disponibilidad. Intenta de nuevo en unos segundos.");
      }
      const requestedMinutes = getTimeInMinutes(visitDraft.time);
      const occupiedTimes = [
        ...(visitsAvailability.horariosOcupados ?? []),
        ...(appointmentsAvailability.horariosOcupados ?? []),
      ];
      const isOccupied = requestedMinutes !== null && occupiedTimes.some((time) => {
        const occupiedMinutes = getTimeInMinutes(time);
        return occupiedMinutes !== null && Math.abs(occupiedMinutes - requestedMinutes) <= 60;
      });
      if (isOccupied) {
        throw new Error("Ese horario ya está ocupado por una cita o visita. Elige otra hora.");
      }

      const response = await agendarVisita(
        {
          fechaProgramada: new Date(`${visitDraft.date}T${visitDraft.time}:00`).toISOString(),
          nombreCliente: visitDraft.client.trim(),
          correoCliente: visitDraft.email.trim(),
          telefonoCliente: visitDraft.phone.trim(),
          ubicacion: visitDraft.location.trim() || undefined,
          informacionAdicional: "Presentación de diseño",
          tareaId: task.id,
        },
        visitCaptchaToken,
      );
      if (!response.success) throw new Error(response.message || "No se pudo registrar la visita.");
      setScheduleVisitTaskId(null);
      setVisitCaptchaToken("");
      setUploadToast({ type: "success", message: "Visita agendada; la tarjeta permanece en Diseños." });
    } catch (error) {
      setVisitCaptchaToken("");
      visitCaptchaRef.current?.reset();
      setVisitError(getVisitRequestErrorMessage(error));
    } finally {
      setVisitSaving(false);
    }
  };

  const startCita = async (taskId: string) => {
    const taskSnapshot = kanbanTasksRef.current.find((t) => t.id === taskId);
    updateTask(taskId, (task) => ({ ...task, citaStarted: true }));
    let canContinue = true;
    if (taskSnapshot) {
      const isCita = taskSnapshot.sourceType?.toLowerCase() === "cita";
      const citaOk = isCita ? await syncCitaStartWithBackend(taskSnapshot) : true;
      const patchOk = isCita
        ? true
        : await syncTaskPatchWithBackend(taskSnapshot, { citaStarted: true });
      if (!citaOk || !patchOk) {
        canContinue = false;
        updateTask(taskId, (task) => ({ ...task, citaStarted: taskSnapshot.citaStarted ?? false }));
        setBackendSyncMessage("No se pudo sincronizar el inicio de cita en backend.");
        window.setTimeout(() => setBackendSyncMessage(null), 4500);
      }
    }
    if (canContinue) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(activeCitaTaskStorageKey, taskId);
      }
      router.push(`/dashboard/Levantamiento-detallado?taskId=${encodeURIComponent(taskId)}`);
    }
  };

  const resumeCita = (taskId: string) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(activeCitaTaskStorageKey, taskId);
    }
    router.push(`/dashboard/Levantamiento-detallado?taskId=${encodeURIComponent(taskId)}`);
  };

  const finishCita = async (taskId: string) => {
    const taskSnapshot = kanbanTasksRef.current.find((t) => t.id === taskId);
    const patch: Partial<KanbanTask> = {
      citaStarted: true,
      citaFinished: true,
      stage: "disenos",
      status: "pendiente",
    };

    updateTask(taskId, (task) => ({ ...task, ...patch }));

    if (taskSnapshot?.codigoProyecto?.trim()) {
      syncSeguimientoProjectKanbanStage(taskSnapshot.codigoProyecto, "disenos");
    }

    if (taskSnapshot) {
      const isCita = taskSnapshot.sourceType?.toLowerCase() === "cita";
      const finishOk = isCita ? await syncCitaFinishWithBackend(taskSnapshot) : true;
      const stageOk = isCita ? true : await syncTaskStageWithBackend(taskSnapshot, "disenos");
      const patchOk = isCita ? true : await syncTaskPatchWithBackend(taskSnapshot, patch);
      if (!finishOk || !stageOk || !patchOk) {
        setBackendSyncMessage("La cita terminó localmente, pero no se sincronizó completamente con backend.");
        window.setTimeout(() => setBackendSyncMessage(null), 4500);
      }
    }
  };

  const startCotizacionFormal = (taskId: string) => {
    updateTask(taskId, (t) => ({ ...t, citaStarted: true }));
    router.push(`/dashboard/cotizador?taskId=${encodeURIComponent(taskId)}`);
  };

  const approveDesignAsAdmin = async (taskId: string) => {
    const taskSnapshot = kanbanTasksRef.current.find((t) => t.id === taskId);
    if (
      !taskSnapshot ||
      taskSnapshot.stage !== "disenos" ||
      !taskSnapshot.files?.length ||
      taskSnapshot.designFeedback
    ) return;

    setApprovingDesignTaskId(taskId);
    try {
      const ok = await syncTaskPatchWithBackend(taskSnapshot, { designApprovedByAdmin: true });
      if (!ok) {
        setBackendSyncMessage("No se pudo persistir la aprobación de diseño en backend.");
        window.setTimeout(() => setBackendSyncMessage(null), 4500);
        return;
      }
      const refreshedTasks = await fetchBackendKanbanTasks();
      const refreshedTask = refreshedTasks.find((task) => task.id === taskId);
      if (!refreshedTask?.designApprovedByAdmin || refreshedTask.stage !== "disenos") {
        setBackendSyncMessage("Backend no confirmó la aprobación administrativa; la tarjeta conserva su estado anterior.");
        window.setTimeout(() => setBackendSyncMessage(null), 6000);
        return;
      }
      updateTask(taskId, (task) => ({ ...task, designApprovedByAdmin: true }));
      showUploadToast("success", "Diseño aprobado. Ya puedes agendar la visita.");
    } finally {
      setApprovingDesignTaskId(null);
    }
  };

  const showUploadToast = (type: "success" | "error", message: string) => {
    setUploadToast({ type, message });
    window.setTimeout(() => setUploadToast(null), 4500);
  };

  const handleDropboxUpload = async (taskId: string, file: File) => {
    const taskSnapshot = kanbanTasksRef.current.find((t) => t.id === taskId);
    const clienteId =
      taskSnapshot?.codigoProyecto?.trim() ||
      (taskSnapshot as any)?.codigoCliente?.trim() ||
      (taskSnapshot as any)?.clientId?.trim() ||
      (taskSnapshot as any)?.codigo?.trim() ||
      taskSnapshot?.id;

    if (!clienteId) {
      showUploadToast("error", "No se pudo subir el archivo: falta el código de cliente/proyecto de la tarea.");
      return;
    }

    setDropboxUploading(true);
    try {
      if (!taskSnapshot?.id) {
        showUploadToast("error", "No se encontró la tarea para relacionar el diseño.");
        return;
      }
      const result = await subirDisenoDropbox(file, {
        tareaId: taskSnapshot.id,
        clienteId,
        nivel: "final",
      });

      if (!result.success) {
        showUploadToast("error", result.message || "No se pudo subir el diseño final.");
        return;
      }

      const finalFile: TaskFile = {
        id: result.data?._id || `final-${Date.now()}`,
        name: result.data?.nombre || file.name,
        type: inferFileType(file.name),
        provider: "dropbox",
        nivel: "final",
        src: result.data?.url,
      };
      updateTask(taskId, (task) => ({
        ...task,
        files: [...(task.files ?? []).filter((existing) => existing.nivel !== "final"), finalFile],
      }));
      showUploadToast("success", "Diseño final cargado. Ya está disponible para aprobación del cliente.");
      setUploadAcceptedDesignsTaskId(null);
      setDropboxStagingFile(null);
    } finally {
      setDropboxUploading(false);
    }
  };

  const approveClientDesign = async (taskId: string) => {
    const taskSnapshot = kanbanTasksRef.current.find((task) => task.id === taskId);
    if (!taskSnapshot || !hasFinalDesign(taskSnapshot)) return;
    setApprovingClientTaskId(taskId);
    setBackendSyncMessage(null);
    try {
      const result = await approveClientDesignWithBackend(taskSnapshot);
      if (!result.success) {
        setBackendSyncMessage(result.message || "Backend no confirmó la aprobación del cliente ni el avance a Cotización.");
        window.setTimeout(() => setBackendSyncMessage(null), 6000);
        return;
      }
      updateTask(taskId, (task) => ({
        ...task,
        designApprovedByClient: true,
        stage: "cotizacion",
        status: "pendiente",
        citaStarted: false,
        citaFinished: false,
      }));
      setActiveTaskId(null);
      showUploadToast("success", "Aprobación guardada. La tarjeta avanzó a Cotización.");
    } finally {
      setApprovingClientTaskId(null);
    }
  };

  const completeCotizacion = async (taskId: string) => {
    const taskSnapshot = kanbanTasksRef.current.find((t) => t.id === taskId);
    const patch: Partial<KanbanTask> = {
      stage: "contrato",
      status: "pendiente",
      followUpEnteredAt: Date.now(),
      followUpStatus: "pendiente",
    };

    updateTask(taskId, (task) => ({ ...task, ...patch }));

    if (taskSnapshot) {
      const [stageOk, patchOk] = await Promise.all([
        syncTaskStageWithBackend(taskSnapshot, "contrato"),
        syncTaskPatchWithBackend(taskSnapshot, patch),
      ]);
      if (!stageOk || !patchOk) {
        setBackendSyncMessage("Se pasó a seguimiento localmente, pero no se sincronizó completamente con backend.");
        window.setTimeout(() => setBackendSyncMessage(null), 4500);
      }
    }
  };

  const deleteTask = (taskId: string) => {
    removeTask(taskId);
  };

  const openDeleteConfirm = (taskId: string) => {
    setDeleteConfirmError(null);
    ignoreDeleteBackdropClickRef.current = true;
    setDeleteConfirmTaskId(taskId);
    window.setTimeout(() => {
      ignoreDeleteBackdropClickRef.current = false;
    }, 400);
  };

  const closeDeleteConfirm = () => {
    if (deleteTaskInProgress) return;
    skipPanelTrapInitialFocusRef.current = true;
    restoreFocusToDeleteTriggerRef.current = true;
    setDeleteConfirmTaskId(null);
    setDeleteConfirmError(null);
  };

  useLayoutEffect(() => {
    if (!restoreFocusToDeleteTriggerRef.current) return;
    restoreFocusToDeleteTriggerRef.current = false;
    if (deleteConfirmTaskId !== null) return;
    if (!activeTaskId) return;
    const trigger = deleteTaskTriggerRef.current;
    if (!trigger) return;
    try {
      trigger.focus({ preventScroll: true });
    } catch {
      trigger.focus();
    }
  }, [deleteConfirmTaskId, activeTaskId]);

  const confirmDeleteTask = async () => {
    const taskId = deleteConfirmTaskId;
    if (!taskId || deleteTaskInProgress) return;

    setDeleteTaskInProgress(true);
    setDeleteConfirmError(null);

    try {
      const response = await eliminarTarea(taskId);
      if (!response.success) {
        throw new Error(response.message || "No se pudo eliminar la tarea.");
      }
      deleteTask(taskId);
      setDeleteConfirmTaskId(null);
      setDeleteConfirmError(null);
      setActiveTaskId(null);
    } catch (error) {
      const err = error as { response?: { status?: number; data?: { message?: string } } };
      const status = err.response?.status;
      const serverMessage =
        typeof err.response?.data?.message === "string" ? err.response.data.message.trim() : "";
      let message = "No se pudo eliminar la tarea. Intenta de nuevo.";
      if (serverMessage) {
        message = serverMessage;
      } else if (error instanceof Error && error.message.trim() && !error.message.includes("Request failed")) {
        message = error.message;
      } else if (status === 403) {
        message = "No tienes permiso para eliminar esta tarea.";
      } else if (status === 404) {
        message = "La tarea ya no existe en el servidor.";
      } else if (status && status >= 500) {
        message = "Error del servidor al eliminar. Intenta más tarde.";
      }
      setDeleteConfirmError(message);
    } finally {
      setDeleteTaskInProgress(false);
    }
  };

  const priorityOrder: Record<TaskPriority, number> = { alta: 0, media: 1, baja: 2 };
  const sortTasks = (tasks: KanbanTask[]) => {
    if (sortBy === "priority") {
      return [...tasks].sort(
        (a, b) =>
          priorityOrder[a.priority ?? "media"] - priorityOrder[b.priority ?? "media"],
      );
    }
    if (sortBy === "date") {
      return [...tasks].sort((a, b) => {
        const da = dueDateToSortTimestamp(a.dueDate, a.createdAt ?? 0);
        const db = dueDateToSortTimestamp(b.dueDate, b.createdAt ?? 0);
        return da - db;
      });
    }
    return tasks;
  };

  const activeTask = useMemo(
    () => kanbanTasks.find((task) => task.id === activeTaskId) ?? null,
    [activeTaskId, kanbanTasks],
  );

  const activeTaskAssignedNames = useMemo(() => {
    if (!activeTask) return [];
    const assignedIds = new Set(activeTask.assignedToIds ?? []);
    const assignedNames = new Set(activeTask.assignedTo ?? []);
    return (teamMembers ?? [])
      .filter((member) => assignedIds.has(member.id) || assignedNames.has(member.name))
      .map((member) => member.name);
  }, [activeTask, teamMembers]);

  const saveActiveTask = async () => {
    if (!activeTask || savingTask) return;
    setSavingTask(true);
    setTaskSaveMessage(null);

    const latestTask = kanbanTasksRef.current.find((task) => task.id === activeTask.id) ?? activeTask;
    let patchResult = true;
    try {
      await actualizarTareaEnBackend(latestTask, latestTask);
    } catch {
      patchResult = false;
    }
    const assignmentResult = teamMembers?.length && (latestTask.assignedToIds ?? []).length > 0
      ? await (async () => {
          try {
            await asignarTrabajadores(latestTask.id, latestTask.assignedToIds ?? []);
            return true;
          } catch {
            return false;
          }
        })()
      : true;

    setSavingTask(false);
    if (patchResult && assignmentResult) {
      setTaskSaveMessage("Cambios guardados en la base de datos.");
      return;
    }

    setTaskSaveMessage("No se pudieron guardar todos los cambios. Revisa la conexión e inténtalo de nuevo.");
  };

  useEffect(() => {
    if (activeTaskId && !activeTask) {
      setActiveTaskId(null);
    }
  }, [activeTaskId, activeTask]);

  const uploadTask = useMemo(
    () => kanbanTasks.find((task) => task.id === uploadTaskId) ?? null,
    [kanbanTasks, uploadTaskId],
  );

  const scheduleVisitTask = useMemo(
    () => kanbanTasks.find((task) => task.id === scheduleVisitTaskId) ?? null,
    [kanbanTasks, scheduleVisitTaskId],
  );

  const inferFileType = (name: string): TaskFile["type"] => {
    const lower = name.toLowerCase();
    if (lower.endsWith(".pdf")) return "pdf";
    if (
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      lower.endsWith(".png") ||
      lower.endsWith(".webp") ||
      lower.endsWith(".gif")
    ) {
      return "render";
    }
    return "otro";
  };

  const handleFilesUpload = async (taskId: string, fileList: FileList | File[] | null): Promise<boolean> => {
    if (!fileList?.length) return false;
    const taskSnapshot = kanbanTasksRef.current.find((t) => t.id === taskId);
    const clienteId =
      taskSnapshot?.codigoProyecto?.trim() ||
      (taskSnapshot as any)?.codigoCliente?.trim() ||
      (taskSnapshot as any)?.clientId?.trim() ||
      (taskSnapshot as any)?.codigo?.trim() ||
      taskSnapshot?.id;

    if (!clienteId) {
      showUploadToast("error", "No se pudo subir el archivo: falta el código de cliente/proyecto de la tarea.");
      return false;
    }

    const tipo = taskSnapshot?.stage === "contrato" ? "fotos_proyecto" : "diseno";
    const files = Array.from(fileList);
    const nextFiles: TaskFile[] = [];
    const failedNames: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const type = inferFileType(file.name);
      if (!taskSnapshot?.id) {
        failedNames.push(file.name);
        continue;
      }
      const result = tipo === "diseno"
        ? await subirDisenoDropbox(file, {
            tareaId: taskSnapshot.id,
            clienteId,
            nivel: "preliminar",
          })
        : await subirArchivoCliente(file, clienteId, tipo, { tareasId: taskSnapshot.id });

      if (!result.success || !result.data) {
        failedNames.push(file.name);
        continue;
      }

      nextFiles.push({
        id: result.data._id ?? `file-${Date.now()}-${i}-${file.name}`,
        name: result.data.nombre ?? file.name,
        type,
        provider: result.data.provider,
        nivel: result.data.nivel,
        src: result.data.url,
      });
    }

    if (nextFiles.length > 0) {
      try {
        localStorage.setItem(`kuche_feedback_resolved_${taskId}`, String(Date.now()));
      } catch {
        // ignore quota / private mode
      }

      const patchUpdates: Partial<KanbanTask> = {
        files: [...nextFiles],
        designFeedback: undefined,
        designApprovedByAdmin: false,
      };
      updateTask(taskId, (task) => ({ ...task, ...patchUpdates }));

      if (taskSnapshot) {
        try {
          await syncTaskPatchWithBackend(taskSnapshot, {
            designFeedback: null as any,
            designApprovedByAdmin: false,
          });
        } catch (e) {
          console.warn("Error al sincronizar limpieza de feedback en backend:", e);
        }
      }
    }

    if (failedNames.length > 0) {
      showUploadToast(
        "error",
        nextFiles.length > 0
          ? `Se subieron ${nextFiles.length} archivo(s), pero falló: ${failedNames.join(", ")}.`
          : "No se pudo subir el archivo. Revisa la conexión e inténtalo de nuevo.",
      );
      return false;
    }

    showUploadToast(
      "success",
      nextFiles.length === 1 ? "Archivo subido correctamente." : `${nextFiles.length} archivos subidos correctamente.`,
    );
    return true;
  };

  return (
    <>
      <motion.section
        // Evita que el tablero "re-entre" cada vez que se abre/cierra el panel lateral.
        // (Framer solo debería animar al montar, no al cambiar estado interno.)
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0 }}
        className="pointer-events-auto relative z-0 rounded-3xl border border-white/70 bg-white/80 p-4 shadow-lg backdrop-blur-md md:p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">Flujo de la empresa</p>
            <h2 className="mt-2 text-xl font-semibold">Tablero general</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-medium text-secondary">
              Ordenar columnas
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "default" | "priority" | "date")}
                className="rounded-xl border border-primary/10 bg-white px-3 py-2 text-sm outline-none"
              >
                <option value="default">Predeterminado</option>
                <option value="priority">Por prioridad</option>
                <option value="date">Por fecha</option>
              </select>
            </label>
            {filterByEmployee === undefined ? (
            <div className="flex items-center gap-2 rounded-full border border-primary/10 bg-white p-1">
              {[
                { id: "all", label: "Ver todo" },
                { id: "mine", label: "Mis tareas" },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setViewMode(option.id as "all" | "mine")}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    viewMode === option.id
                      ? "bg-accent text-white"
                      : "text-secondary hover:text-primary"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            ) : null}
          </div>
        </div>

        {kanbanPersistError ? (
          <div
            role="alert"
            className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          >
            {kanbanPersistError}
          </div>
        ) : null}

        {backendSyncMessage ? (
          <div
            role="status"
            className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900"
          >
            {backendSyncMessage}
          </div>
        ) : null}

        <div className="mt-6 flex flex-row gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:grid md:grid-cols-4 md:overflow-x-visible md:pb-0">
          {kanbanColumns.map((column) => {
            const columnTasksRaw = filteredTasks.filter((task) => {
              if (task.stage !== column.id) return false;
              // En la columna de Seguimiento solo mostramos seguimientos pendientes.
              if (column.id === "contrato" && task.followUpStatus && task.followUpStatus !== "pendiente") {
                return false;
              }
              return true;
            });
            const columnTasks = sortTasks(columnTasksRaw);
            const isDragOver = dragOverColumnId === column.id;
            return (
              <div
                key={column.id}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOverColumnId(column.id);
                }}
                onDragLeave={() => setDragOverColumnId(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  const taskId = event.dataTransfer.getData("text/plain");
                  if (taskId) {
                    void tryMoveTaskToStage(taskId, column.id);
                  }
                  setDraggedTaskId(null);
                  setDragOverColumnId(null);
                }}
                className={`w-[280px] shrink-0 snap-center rounded-2xl border border-primary/10 bg-white/70 p-4 transition md:w-full ${
                  isDragOver ? "bg-accent/5 ring-2 ring-accent/30" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                    {column.label}
                  </p>
                  <span className="rounded-full bg-primary/5 px-2 py-1 text-[11px] text-secondary">
                    {columnTasks.length}
                  </span>
                </div>
                <div className="mt-3 space-y-3">
                  {columnTasks.map((task) => {
                    const stageStyle = stageStyles[task.stage];
                    const cotizacionFormalLista =
                      task.stage === "cotizacion" && getCotizacionesFormalesList(task).length > 0;
                    const cardDraggable = !cotizacionFormalLista;
                    return (
                      <div
                        key={task.id}
                        draggable={cardDraggable}
                        title={
                          cotizacionFormalLista
                            ? "Para pasar a Seguimiento usa «Cotización entregada» (arrastre desactivado)"
                            : undefined
                        }
                        onClick={() => setActiveTaskId(task.id)}
                        onDragStart={(event) => {
                          if (!cardDraggable) {
                            event.preventDefault();
                            return;
                          }
                          event.dataTransfer.setData("text/plain", task.id);
                          event.dataTransfer.effectAllowed = "move";
                          setDraggedTaskId(task.id);
                        }}
                        onDragEnd={() => {
                          setDraggedTaskId(null);
                          setDragOverColumnId(null);
                        }}
                        className={`flex min-h-[220px] cursor-pointer flex-col rounded-2xl border border-primary/10 bg-white px-4 py-4 text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                          cotizacionFormalLista ? "cursor-default" : ""
                        } ${stageStyle?.border ? `border-l-4 ${stageStyle.border}` : ""}`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          {task.stage === "contrato" && task.followUpStatus === "pendiente" ? (
                            (() => {
                              const alertLevel = getFollowUpAlertLevel(task.followUpEnteredAt);
                              const days = getDaysInFollowUp(task.followUpEnteredAt);
                              const daysUntilDiscard = FOLLOWUP_AUTO_DISCARD_DAYS - days;
                              if (alertLevel === "expired" || daysUntilDiscard <= 0) {
                                return (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-800 px-2 py-1 text-[10px] font-semibold text-white animate-pulse">
                                    <XCircle className="h-3 w-3" />
                                    Descartando automáticamente...
                                  </span>
                                );
                              }
                              if (alertLevel === "urgent") {
                                return (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-[10px] font-semibold text-rose-700 animate-pulse">
                                    <AlertTriangle className="h-3 w-3" />
                                    ¡Urgente! Se descarta en {daysUntilDiscard} días
                                  </span>
                                );
                              }
                              if (alertLevel === "warning") {
                                return (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700">
                                    <Clock className="h-3 w-3" />
                                    Dar seguimiento ({days} días)
                                  </span>
                                );
                              }
                              return (
                                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-1 text-[10px] font-semibold text-sky-600">
                                  <Clock className="h-3 w-3" />
                                  En seguimiento ({days} días)
                                </span>
                              );
                            })()
                          ) : task.stage === "disenos" && task.files && task.files.length > 0 && !task.designApprovedByAdmin ? (
                            Boolean(task.designFeedback) ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-[10px] font-semibold text-rose-700 animate-pulse">
                                <AlertTriangle className="h-3 w-3" />
                                Cambios solicitados
                              </span>
                            ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700">
                              <Clock className="h-3 w-3" />
                              Esperando aprobación
                            </span>
                            )
                          ) : task.stage === "disenos" && task.designApprovedByAdmin && !task.designApprovedByClient ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-1 text-[10px] font-semibold text-violet-700">
                              <Clock className="h-3 w-3" />
                              Pendiente de cliente
                            </span>
                          ) : (
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                                statusStyles[task.status]
                              }`}
                            >
                              {task.status === "completada" ? "Completada" : "Pendiente"}
                            </span>
                          )}
                          {task.stage !== "contrato" ? (
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${
                                priorityStyles[task.priority ?? "media"]
                              }`}
                            >
                              {(task.priority ?? "media").charAt(0).toUpperCase() +
                                (task.priority ?? "media").slice(1)}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-3 flex flex-1 flex-col">
                          <div className="min-h-[3.75rem] max-h-[3.75rem]">
                            <p
                              className="line-clamp-2 break-words text-base font-semibold leading-6 text-gray-900"
                              title={task.project}
                            >
                              {task.project}
                            </p>
                            {(task.location || task.mapsUrl) ? (
                              <p className="mt-1 line-clamp-1 break-words text-xs leading-4 text-secondary">
                                {task.location}
                                {task.mapsUrl ? (
                                  <> · <a href={normalizeMapsUrl(task.mapsUrl)} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline" onClick={(e) => e.stopPropagation()}>Ver en Maps</a></>
                                ) : null}
                              </p>
                            ) : null}
                            {task.stage === "citas" && task.dueDate ? (
                              <p className="mt-1 flex items-center gap-1 line-clamp-2 break-words text-xs font-medium leading-4 text-sky-700">
                                <Calendar className="h-3 w-3 shrink-0" aria-hidden />
                                <span>{formatDueDateTimeDisplay(task.dueDate)}</span>
                              </p>
                            ) : null}
                            {task.title && task.title !== task.project ? (
                              <p
                                className="mt-1 line-clamp-1 break-words text-xs leading-4 text-secondary"
                                title={task.title}
                              >
                                {task.title}
                              </p>
                            ) : null}
                          </div>
                          <div className="mt-3 min-h-[1.75rem]">
                            <div className="flex flex-wrap gap-2">
                              {/* CITAS: Iniciar → Terminar */}
                              {task.stage === "citas" && !task.citaStarted ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void startCita(task.id);
                                  }}
                                  className="inline-flex w-auto items-center rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-white"
                                >
                                  Iniciar cita
                                </button>
                              ) : null}
                              {task.stage === "citas" && task.citaStarted && !task.citaFinished ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      resumeCita(task.id);
                                    }}
                                    className="inline-flex w-auto items-center rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-white"
                                  >
                                    Completar cita
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void finishCita(task.id);
                                    }}
                                    className="inline-flex w-auto items-center rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white"
                                  >
                                    Terminar cita
                                  </button>
                                </>
                              ) : null}
                              {task.stage === "citas" && task.citaFinished ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Cita completada
                                </span>
                              ) : null}

                              {/* COTIZACIÓN FORMAL: Iniciar → Terminar → Completar y pasar a seguimiento */}
                              {task.stage === "cotizacion" && !task.citaStarted ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    startCotizacionFormal(task.id);
                                  }}
                                  className="inline-flex w-auto items-center rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-white"
                                >
                                  Iniciar cotizacion
                                </button>
                              ) : null}
                              {task.stage === "cotizacion" && task.citaStarted && !task.citaFinished ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    updateTask(task.id, (t) => ({ ...t, citaFinished: true }));
                                  }}
                                  className="inline-flex w-auto items-center rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white"
                                >
                                  Terminar cotizacion
                                </button>
                              ) : null}
                              {task.stage === "cotizacion" &&
                              getCotizacionesFormalesList(task).length > 0 ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setCotizacionEntregadaTaskId(task.id);
                                  }}
                                  className="inline-flex min-h-[32px] w-auto items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold leading-tight text-white"
                                >
                                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                                  Cotización entregada
                                </button>
                              ) : null}
                              {/* Pasar a Seguimiento: manual vía botón */}

                              {/* DISEÑOS: Admin aprueba → Agendar visita → Cliente aprueba en Agenda */}
                              {task.stage === "disenos" &&
                              !hasFinalDesign(task) &&
                              ((!task.files || task.files.length === 0) || Boolean(task.designFeedback)) ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setUploadTaskId(task.id);
                                  }}
                                  className="inline-flex w-auto items-center rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-white"
                                >
                                  Subir archivo
                                </button>
                              ) : null}
                              {allowDesignApproval &&
                              task.stage === "disenos" &&
                              Boolean(task.files?.length) &&
                              !hasFinalDesign(task) &&
                              !task.designApprovedByAdmin &&
                              !task.designFeedback ? (
                                <button
                                  type="button"
                                  disabled={approvingDesignTaskId === task.id}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void approveDesignAsAdmin(task.id);
                                  }}
                                  className="inline-flex min-h-[32px] w-auto items-center gap-1 rounded-full bg-emerald-700 px-2.5 py-1 text-[11px] font-semibold leading-tight text-white disabled:cursor-wait disabled:opacity-60"
                                >
                                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                                  {approvingDesignTaskId === task.id ? "Aprobando..." : "Aprobar diseño"}
                                </button>
                              ) : null}
                              {task.stage === "disenos" && task.designApprovedByAdmin && !hasFinalDesign(task) && !task.designApprovedByClient ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setDropboxStagingFile(null);
                                    setUploadAcceptedDesignsTaskId(task.id);
                                  }}
                                  className="inline-flex min-h-[32px] w-auto items-center gap-1 rounded-full bg-sky-600 px-2.5 py-1 text-[11px] font-semibold leading-tight text-white"
                                >
                                  <CloudUpload className="h-3 w-3 shrink-0" />
                                  Subir diseño final
                                </button>
                              ) : null}
                              {task.stage === "disenos" && task.designApprovedByAdmin && !hasFinalDesign(task) && !task.designApprovedByClient ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openScheduleVisit(task);
                                  }}
                                  className="inline-flex min-h-[32px] w-auto items-center gap-1 rounded-full border border-sky-200 bg-white px-2.5 py-1 text-[11px] font-semibold leading-tight text-sky-800"
                                >
                                  <CalendarPlus className="h-3 w-3 shrink-0" />
                                  Agendar visita
                                </button>
                              ) : null}
                              {allowDesignApproval && task.stage === "disenos" && task.designApprovedByAdmin && hasFinalDesign(task) && !task.designApprovedByClient ? (
                                <button
                                  type="button"
                                  disabled={approvingClientTaskId === task.id}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void approveClientDesign(task.id);
                                  }}
                                  className="inline-flex min-h-[32px] w-auto items-center gap-1 rounded-full bg-emerald-700 px-2.5 py-1 text-[11px] font-semibold leading-tight text-white disabled:cursor-wait disabled:opacity-60"
                                >
                                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                                  {approvingClientTaskId === task.id ? "Confirmando..." : "Aprobar por cliente"}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-primary/5 pt-3 text-sm text-gray-600">
                          <div className="flex flex-wrap items-center gap-2">
                            {(Array.isArray(task.assignedTo) ? task.assignedTo : []).length === 0 ? (
                              <span className="text-xs text-secondary">Sin asignar</span>
                            ) : (Array.isArray(task.assignedTo) ? task.assignedTo : []).length <= 2 ? (
                              (Array.isArray(task.assignedTo) ? task.assignedTo : []).map((name) => (
                                <span key={name} className="flex items-center gap-1.5">
                                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary">
                                    {getInitials(name)}
                                  </span>
                                </span>
                              ))
                            ) : (
                              <>
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary">
                                  {getInitials((task.assignedTo as string[])[0])}
                                </span>
                                <span className="text-xs text-secondary">
                                  +{(task.assignedTo as string[]).length - 1}
                                </span>
                              </>
                            )}
                          </div>
                          <span className="flex items-center gap-1 text-[10px] text-secondary">
                            <Calendar className="h-3 w-3" />
                            {formatDate(task.createdAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {columnTasks.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-primary/10 bg-white/50 px-4 py-6 text-center text-xs text-secondary">
                      Sin tareas en esta etapa.
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </motion.section>

      {mounted
        ? createPortal(
            <AnimatePresence mode="sync">
              {activeTaskId && activeTask ? (
                <motion.div
                  key={activeTaskId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, pointerEvents: "none" }}
                  transition={{ duration: 0.2 }}
                  className="pointer-events-auto fixed inset-0 z-[100] bg-black/40"
                  onClick={() => setActiveTaskId(null)}
                >
            <motion.aside
              ref={(node) => {
                activeTaskRef.current = node;
                panelScrollRef.current = node;
              }}
              tabIndex={-1}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{
                type: "tween",
                duration: 0.35,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="pointer-events-auto absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto rounded-l-3xl border border-white/40 bg-white/95 p-6 shadow-2xl backdrop-blur-md"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                    Detalle de tarea
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-gray-900">
                    {activeTask.project}
                  </h3>
                  {activeTask.title && activeTask.title !== activeTask.project ? (
                    <p className="mt-1 text-sm text-secondary">{activeTask.title}</p>
                  ) : null}
                  {activeTask.location || activeTask.mapsUrl ? (
                    <p className="mt-1 text-sm text-secondary">
                      {activeTask.location}
                      {activeTask.mapsUrl ? (
                        <> · <a href={normalizeMapsUrl(activeTask.mapsUrl)} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">Ver en Maps</a></>
                      ) : null}
                    </p>
                  ) : null}
                  {activeTask.codigoProyecto ? (
                    <p className="mt-2 text-sm text-secondary">
                      Código de seguimiento{" "}
                      <span className="font-mono text-base font-semibold tracking-wide text-primary">
                        {activeTask.codigoProyecto}
                      </span>
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void saveActiveTask()}
                    disabled={savingTask}
                    className="rounded-full bg-primary px-3 py-2 text-xs font-semibold text-white disabled:cursor-wait disabled:opacity-60"
                  >
                    {savingTask ? "Guardando..." : "Guardar cambios"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTaskId(null)}
                    className="rounded-full border border-primary/10 px-3 py-2 text-xs font-semibold text-secondary"
                  >
                    Cerrar
                  </button>
                </div>
              </div>

              {taskSaveMessage ? (
                <p className={`mt-3 text-sm ${taskSaveMessage.startsWith("Cambios") ? "text-emerald-700" : "text-rose-600"}`}>
                  {taskSaveMessage}
                </p>
              ) : null}

              <div className="mt-6 space-y-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                    {teamMembers && teamMembers.length > 0
                      ? "Responsables (varios permitidos)"
                      : "Responsables"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeTaskAssignedNames.map(
                      (name) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white px-3 py-1.5 text-sm"
                        >
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                            {getInitials(name)}
                          </span>
                          {name}
                          {teamMembers && teamMembers.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                const currentNames = Array.isArray(activeTask.assignedTo)
                                  ? activeTask.assignedTo
                                  : [];
                                if (currentNames.length <= 1) {
                                  setTaskSaveMessage("La API exige al menos un trabajador asignado.");
                                  return;
                                }
                                const nextAssigned = (Array.isArray(activeTask.assignedTo)
                                  ? activeTask.assignedTo
                                  : []
                                ).filter((n) => n !== name);
                                const nextAssignedIds = teamMembers
                                  .filter((member) => nextAssigned.includes(member.name))
                                  .map((member) => member.id);
                                const taskSnapshot = kanbanTasks.find((t) => t.id === activeTask.id) ?? activeTask;
                                updateTask(activeTask.id, (task) => ({
                                  ...task,
                                  assignedTo: nextAssigned,
                                  assignedToIds: nextAssignedIds,
                                }));
                                void asignarTrabajadores(taskSnapshot.id, nextAssignedIds).catch(() => {
                                  setBackendSyncMessage("No se pudo sincronizar la asignación con la base de datos.");
                                  window.setTimeout(() => setBackendSyncMessage(null), 4500);
                                });
                              }}
                              className="ml-1 rounded-full p-0.5 text-secondary hover:bg-rose-100 hover:text-rose-600"
                              aria-label={`Quitar a ${name}`}
                            >
                              ×
                            </button>
                          ) : null}
                        </span>
                      ),
                    )}
                    {teamMembers && teamMembers.length > 0 ? (
                      <select
                        value=""
                        onChange={(e) => {
                          const name = e.target.value;
                          if (!name) return;
                          const current = Array.isArray(activeTask.assignedTo)
                            ? activeTask.assignedTo
                            : [];
                          if (current.includes(name)) return;
                          const nextAssigned = [...current, name];
                          const nextAssignedIds = teamMembers
                            .filter((member) => nextAssigned.includes(member.name))
                            .map((member) => member.id);
                          const taskSnapshot = kanbanTasks.find((t) => t.id === activeTask.id) ?? activeTask;
                          updateTask(activeTask.id, (task) => ({
                            ...task,
                            assignedTo: nextAssigned,
                            assignedToIds: nextAssignedIds,
                          }));
                          void asignarTrabajadores(taskSnapshot.id, nextAssignedIds).catch(() => {
                            setBackendSyncMessage("No se pudo sincronizar la asignación con la base de datos.");
                            window.setTimeout(() => setBackendSyncMessage(null), 4500);
                          });
                          e.target.value = "";
                        }}
                        className="rounded-xl border border-primary/10 bg-white px-3 py-2 text-sm text-secondary outline-none"
                      >
                        <option value="">+ Agregar responsable</option>
                        {teamMembers.map((m) => (
                          <option key={m.id} value={m.name}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                  {(!activeTask.assignedTo || (activeTask.assignedTo as string[]).length === 0) && (
                    <p className="mt-2 text-xs text-secondary">Sin asignar</p>
                  )}
                </div>

                {teamMembers && teamMembers.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                      Etapa
                    </p>
                    <select
                      value={activeTask.stage}
                      onChange={(event) => {
                        void tryMoveTaskToStage(activeTask.id, event.target.value as TaskStage).then((moved) => {
                          if (!moved) {
                            event.target.value = activeTask.stage;
                          }
                        });
                      }}
                      className="mt-3 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm font-semibold text-secondary"
                    >
                      {kanbanColumns.map((col) => (
                        <option
                          key={col.id}
                          value={col.id}
                          disabled={
                            activeTask.stage === "cotizacion" &&
                            getCotizacionesFormalesList(activeTask).length > 0 &&
                            col.id === "contrato"
                          }
                        >
                          {col.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                    Prioridad
                  </p>
                  <select
                    value={activeTask.priority ?? "media"}
                    onChange={(e) => {
                      void updateTaskAndSync(activeTask.id, { priority: e.target.value as TaskPriority });
                    }}
                    className="mt-3 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm font-semibold text-secondary"
                  >
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                    Nombre del proyecto
                  </p>
                  <input
                    type="text"
                    value={activeTask.project ?? ""}
                    onChange={(e) => {
                      const nextProject = e.target.value.trim() || "General";
                      void updateTaskAndSync(activeTask.id, {
                        project: nextProject,
                        title: nextProject,
                      });
                    }}
                    placeholder="Nombre del proyecto"
                    className="mt-3 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                    Notas internas
                  </p>
                  <textarea
                    value={activeTask.notes ?? ""}
                    onChange={(e) => {
                      const nextNotes = e.target.value.trim() || undefined;
                      void updateTaskAndSync(activeTask.id, { notes: nextNotes });
                    }}
                    placeholder="Detalle de seguimiento, requerimientos o acuerdos"
                    className="mt-3 min-h-24 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                    Dirección / Localidad (opcional)
                  </p>
                  <input
                    type="text"
                    value={activeTask.location ?? ""}
                    onChange={(e) => {
                      const nextLocation = e.target.value.trim() || undefined;
                      void updateTaskAndSync(activeTask.id, { location: nextLocation });
                    }}
                    placeholder="Ej. Av. Principal 123, Monterrey"
                    className="mt-3 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                    Enlace de Google Maps (opcional)
                  </p>
                  <input
                    type="url"
                    value={activeTask.mapsUrl ?? ""}
                    onChange={(e) => {
                      const nextMapsUrl = e.target.value.trim() || undefined;
                      void updateTaskAndSync(activeTask.id, { mapsUrl: nextMapsUrl });
                    }}
                    placeholder="https://maps.google.com/..."
                    className="mt-3 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                    {activeTask.stage === "citas"
                      ? "Fecha de la cita (opcional)"
                      : "Fecha límite (opcional)"}
                  </p>
                  <DueDateInput
                    value={activeTask.dueDate}
                    onChange={(next) => {
                      void updateTaskAndSync(activeTask.id, { dueDate: next });
                    }}
                    className="mt-3"
                  />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                    Estatus interno
                  </p>
                  <select
                    value={activeTask.status}
                    onChange={(event) => {
                      void updateTaskAndSync(activeTask.id, { status: event.target.value as TaskStatus });
                    }}
                    className="mt-3 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm font-semibold text-secondary"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="completada">Completada</option>
                  </select>
                </div>

                {activeTask.stage === "citas" ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                      Flujo de cita
                    </p>
                    <div className="mt-3 space-y-2">
                      <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${activeTask.citaStarted ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {activeTask.citaStarted ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-4 w-4 rounded-full border-2 border-gray-300" />}
                        <span>1. Iniciar cita</span>
                      </div>
                      <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${activeTask.citaFinished ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {activeTask.citaFinished ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-4 w-4 rounded-full border-2 border-gray-300" />}
                        <span>2. Terminar cita</span>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {!activeTask.citaStarted ? (
                        <button
                          type="button"
                          onClick={() => void startCita(activeTask.id)}
                          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
                        >
                          Iniciar cita
                        </button>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => resumeCita(activeTask.id)}
                            className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
                          >
                            Completar cita
                          </button>
                          <button
                            type="button"
                            onClick={() => void finishCita(activeTask.id)}
                            className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
                          >
                            Terminar cita
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
                {activeTask.stage === "cotizacion" ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                      Flujo de cotizacion formal
                    </p>
                    <div className="mt-3 space-y-2">
                      <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${activeTask.citaStarted ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {activeTask.citaStarted ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-4 w-4 rounded-full border-2 border-gray-300" />}
                        <span>1. Iniciar cotizacion</span>
                      </div>
                      <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${activeTask.citaFinished ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {activeTask.citaFinished ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-4 w-4 rounded-full border-2 border-gray-300" />}
                        <span>2. Terminar cotizacion</span>
                      </div>
                      <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${getCotizacionesFormalesList(activeTask).length > 0 ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {getCotizacionesFormalesList(activeTask).length > 0 ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-4 w-4 rounded-full border-2 border-gray-300" />}
                        <span>3. Cotización formal lista para entregar</span>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col gap-2">
                      {!activeTask.citaStarted ? (
                        <button
                          type="button"
                          onClick={() => startCotizacionFormal(activeTask.id)}
                          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
                        >
                          Iniciar cotizacion
                        </button>
                      ) : activeTask.citaStarted && !activeTask.citaFinished ? (
                        <button
                          type="button"
                          onClick={() => updateTask(activeTask.id, (t) => ({ ...t, citaFinished: true }))}
                          className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
                        >
                          Terminar cotizacion
                        </button>
                      ) : getCotizacionesFormalesList(activeTask).length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setCotizacionEntregadaTaskId(activeTask.id)}
                          className="min-h-[36px] rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold leading-tight text-white"
                        >
                          Cotización entregada
                        </button>
                      ) : (
                        <p className="text-xs text-secondary">
                          Genera y guarda la cotización formal en el cotizador; luego podrás marcarla como entregada.
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
                {activeTask.stage === "disenos" ? (
                  <div>
                    {activeTask.designFeedback && !activeTask.designApprovedByAdmin ? (
                      <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                        <p className="flex items-center gap-2 text-sm font-semibold text-rose-800">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          Observaciones del Administrador
                        </p>
                        <p className="mt-2 text-sm text-rose-900">{activeTask.designFeedback}</p>
                      </div>
                    ) : null}
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                      Flujo de diseño
                    </p>
                    <div className="mt-3 space-y-2">
                      <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${activeTask.files && activeTask.files.length > 0 ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {activeTask.files && activeTask.files.length > 0 ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-4 w-4 rounded-full border-2 border-gray-300" />}
                        <span>1. Subir archivo</span>
                      </div>
                      <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${activeTask.designApprovedByAdmin ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {activeTask.designApprovedByAdmin ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-4 w-4 rounded-full border-2 border-gray-300" />}
                        <span>2. Aprobación del admin</span>
                      </div>
                      <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${activeTask.designApprovedByClient ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {activeTask.designApprovedByClient ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-4 w-4 rounded-full border-2 border-gray-300" />}
                        <span>3. Aprobación del cliente</span>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {hasFinalDesign(activeTask) && activeTask.designApprovedByAdmin && !activeTask.designApprovedByClient ? (
                        allowDesignApproval ? (
                          <button
                            type="button"
                            disabled={approvingClientTaskId === activeTask.id}
                            onClick={() => void approveClientDesign(activeTask.id)}
                            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-semibold leading-tight text-white disabled:cursor-wait disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            {approvingClientTaskId === activeTask.id ? "Confirmando..." : "Aprobar por cliente"}
                          </button>
                        ) : null
                      ) : !hasFinalDesign(activeTask) && (!activeTask.files || activeTask.files.length === 0) ? (
                        <button
                          type="button"
                          onClick={() => setUploadTaskId(activeTask.id)}
                          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
                        >
                          Subir archivo
                        </button>
                      ) : !hasFinalDesign(activeTask) && !activeTask.designApprovedByAdmin ? (
                        activeTask.designFeedback ? (
                          <button
                            type="button"
                            onClick={() => setUploadTaskId(activeTask.id)}
                            className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
                          >
                            Actualizar diseño
                          </button>
                        ) : allowDesignApproval ? (
                          <button
                            type="button"
                            disabled={approvingDesignTaskId === activeTask.id}
                            onClick={() => void approveDesignAsAdmin(activeTask.id)}
                            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-semibold leading-tight text-white disabled:cursor-wait disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            {approvingDesignTaskId === activeTask.id ? "Aprobando..." : "Aprobar diseño"}
                          </button>
                        ) : (
                          <span className="text-sm text-amber-600 font-medium">Esperando aprobación del admin</span>
                        )
                      ) : !hasFinalDesign(activeTask) && !activeTask.designApprovedByClient ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setDropboxStagingFile(null);
                              setUploadAcceptedDesignsTaskId(activeTask.id);
                            }}
                            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-sky-600 px-3 py-1.5 text-xs font-semibold leading-tight text-white"
                          >
                            <CloudUpload className="h-3.5 w-3.5 shrink-0" />
                            Subir diseño final
                          </button>
                          <button
                            type="button"
                            onClick={() => openScheduleVisit(activeTask)}
                            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold leading-tight text-sky-800"
                          >
                            <CalendarPlus className="h-3.5 w-3.5 shrink-0" />
                            Agendar visita
                          </button>
                        </>
                      ) : (
                        <span className="text-sm text-emerald-600 font-medium">Diseño aprobado</span>
                      )}
                    </div>
                  </div>
                ) : null}
                {activeTask.stage === "contrato" && activeTask.followUpStatus === "pendiente" ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                      Alertas de seguimiento
                    </p>
                    {(() => {
                      const alertLevel = getFollowUpAlertLevel(activeTask.followUpEnteredAt);
                      const days = getDaysInFollowUp(activeTask.followUpEnteredAt);
                      if (alertLevel === "urgent") {
                        return (
                          <div className="mt-3 rounded-2xl bg-rose-50 px-4 py-3">
                            <div className="flex items-center gap-2 text-rose-700">
                              <AlertTriangle className="h-5 w-5 animate-pulse" />
                              <span className="font-semibold">¡Contactar urgente!</span>
                            </div>
                            <p className="mt-1 text-xs text-rose-600">
                              Han pasado {days} días. Contacta al cliente para saber si continúa con el proyecto.
                            </p>
                          </div>
                        );
                      }
                      if (alertLevel === "warning") {
                        return (
                          <div className="mt-3 rounded-2xl bg-amber-50 px-4 py-3">
                            <div className="flex items-center gap-2 text-amber-700">
                              <Clock className="h-5 w-5" />
                              <span className="font-semibold">Dar seguimiento</span>
                            </div>
                            <p className="mt-1 text-xs text-amber-600">
                              Han pasado {days} días. Es momento de contactar al cliente.
                            </p>
                          </div>
                        );
                      }
                      return (
                        <div className="mt-3 rounded-2xl bg-sky-50 px-4 py-3">
                          <div className="flex items-center gap-2 text-sky-600">
                            <Clock className="h-5 w-5" />
                            <span className="font-semibold">En seguimiento</span>
                          </div>
                          <p className="mt-1 text-xs text-sky-500">
                            {days > 0 ? `${days} día${days > 1 ? "s" : ""} en seguimiento.` : "Recién agregado."}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                ) : null}

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                    Estado del cliente
                  </p>
                  {activeTask.followUpStatus === "confirmado" ? (
                    <div className="mt-3 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-semibold">Cliente confirmado</span>
                    </div>
                  ) : activeTask.followUpStatus === "descartado" ? (
                    <div className="mt-3 flex items-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-500">
                      <XCircle className="h-5 w-5" />
                      <span className="font-semibold">Cliente descartado</span>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void confirmFollowUp(activeTask.id)}
                        className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Confirmar cliente
                      </button>
                      <button
                        type="button"
                        onClick={() => void discardFollowUp(activeTask.id)}
                        className="flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        <XCircle className="h-4 w-4" />
                        Descartar
                      </button>
                    </div>
                  )}
                </div>

                {activeTask.stage === "disenos" || activeTask.stage === "contrato" ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                      Archivos
                    </p>
                    <label className={`mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/20 bg-white px-4 py-6 text-sm text-secondary transition hover:border-primary/40 hover:bg-primary/[0.03] ${panelFilesUploading ? "pointer-events-none opacity-60" : ""}`}>
                      {panelFilesUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <FileUp className="h-4 w-4" />
                          Subir PDF o renders
                        </>
                      )}
                      <input
                        type="file"
                        multiple
                        tabIndex={-1}
                        disabled={panelFilesUploading}
                        className="sr-only"
                        onChange={(event) => {
                          const target = event.target;
                          const files = target.files;
                          if (!files?.length) {
                            target.value = "";
                            window.requestAnimationFrame(() => {
                              activeTaskRef.current?.focus({ preventScroll: true });
                            });
                            return;
                          }
                          setPanelFilesUploading(true);
                          void handleFilesUpload(activeTask.id, files).finally(() => {
                            target.value = "";
                            setPanelFilesUploading(false);
                          });
                        }}
                      />
                    </label>
                    <div className="mt-4 space-y-2">
                      {(activeTask.files ?? []).length === 0 ? (
                        <div className="rounded-2xl border border-primary/10 bg-white px-4 py-3 text-xs text-secondary">
                          Sin archivos cargados.
                        </div>
                      ) : (
                        (activeTask.files ?? []).map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm"
                          >
                            <span>{file.name}</span>
                            <span className="text-xs uppercase text-secondary">{file.type}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}

                {allowDeleteTask && teamMembers && teamMembers.length > 0 ? (
                  <div className="border-t border-primary/10 pt-6">
                    <button
                      ref={deleteTaskTriggerRef}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteConfirm(activeTask.id);
                      }}
                      className="w-full rounded-2xl border border-rose-200 bg-rose-50 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
                    >
                      Eliminar tarea
                    </button>
                  </div>
                ) : null}
              </div>
            </motion.aside>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}

      {mounted && deleteConfirmTaskId
        ? createPortal(
            <div
              className="pointer-events-auto fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4"
              onClick={() => {
                if (ignoreDeleteBackdropClickRef.current) return;
                closeDeleteConfirm();
              }}
              onMouseDown={(e) => {
                if (ignoreDeleteBackdropClickRef.current) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
            >
            <div
              ref={deleteConfirmRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-confirm-title"
              className="pointer-events-auto w-full max-w-sm rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100">
                  <Trash2 className="h-7 w-7 text-rose-600" />
                </div>
              </div>
              <h3 id="delete-confirm-title" className="mt-4 text-center text-lg font-semibold text-gray-900">
                ¿Eliminar esta tarea?
              </h3>
              <p className="mt-2 text-center text-sm text-secondary">
                Esta acción no se puede deshacer. La tarea se quitará del tablero.
              </p>
              {deleteConfirmError ? (
                <p className="mt-3 rounded-2xl bg-rose-50 px-3 py-2 text-center text-xs font-semibold text-rose-700">
                  {deleteConfirmError}
                </p>
              ) : null}
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  disabled={deleteTaskInProgress}
                  onClick={closeDeleteConfirm}
                  className="flex-1 rounded-2xl border border-primary/10 bg-white py-3 text-sm font-semibold text-secondary transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={deleteTaskInProgress}
                  onClick={() => void confirmDeleteTask()}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {deleteTaskInProgress ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Eliminando…
                    </>
                  ) : (
                    "Sí, eliminar"
                  )}
                </button>
              </div>
            </div>
            </div>,
            document.body,
          )
        : null}

      {mounted
        ? createPortal(
            <AnimatePresence mode="sync">
              {uploadTaskId ? (
                <motion.div
                  key={uploadTaskId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, pointerEvents: "none" }}
                  transition={{ duration: 0.2 }}
                  className="pointer-events-auto fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4"
                  onClick={() => setUploadTaskId(null)}
                >
            <motion.div
              ref={uploadTaskRef}
              tabIndex={-1}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="pointer-events-auto w-full max-w-md rounded-3xl border border-white/70 bg-white/90 p-6 shadow-2xl backdrop-blur-md"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 className="text-lg font-semibold">
                {uploadTask?.stage === "contrato" ? "Subir archivo de seguimiento" : "Subir diseño"}
              </h3>
              <p className="mt-2 text-sm text-secondary">
                {uploadTask?.stage === "contrato"
                  ? "Adjunta documentos de seguimiento del proyecto."
                  : "Adjunta renders o planos para esta tarea de diseño."}
              </p>
              <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/20 bg-white px-4 py-8 text-center text-sm text-secondary transition hover:border-primary/40 hover:bg-primary/[0.03]">
                <FileUp className="h-4 w-4" />
                {designStagingFiles.length > 0
                  ? designStagingFiles.length === 1
                    ? designStagingFiles[0].name
                    : `${designStagingFiles.length} archivos seleccionados`
                  : "Seleccionar archivos"}
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  tabIndex={-1}
                  className="sr-only"
                  onChange={(event) => {
                    const target = event.target;
                    const list = target.files;
                    if (!list?.length) {
                      target.value = "";
                      window.requestAnimationFrame(() => {
                        uploadTaskRef.current?.focus({ preventScroll: true });
                      });
                      return;
                    }
                    setDesignStagingFiles(Array.from(list));
                    target.value = "";
                  }}
                />
              </label>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setUploadTaskId(null);
                    setDesignStagingFiles([]);
                  }}
                  disabled={designFilesUploading}
                  className="flex-1 rounded-2xl border border-primary/10 bg-white py-3 text-sm font-semibold text-secondary transition hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={designStagingFiles.length === 0 || designFilesUploading}
                  onClick={async () => {
                    const id = uploadTaskId;
                    if (!id || designStagingFiles.length === 0) return;
                    setDesignFilesUploading(true);
                    try {
                      await handleFilesUpload(id, designStagingFiles);
                      setUploadTaskId(null);
                      setDesignStagingFiles([]);
                    } catch {
                      /* persistencia u otro error: el modal sigue abierto */
                    } finally {
                      setDesignFilesUploading(false);
                    }
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {designFilesUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    "Listo"
                  )}
                </button>
              </div>
            </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}

      {mounted
        ? createPortal(
            <AnimatePresence mode="sync">
              {uploadAcceptedDesignsTaskId ? (
                <motion.div
                  key={uploadAcceptedDesignsTaskId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, pointerEvents: "none" }}
                  transition={{ duration: 0.2 }}
                  className="pointer-events-auto fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4"
                  onClick={() => {
                    setUploadAcceptedDesignsTaskId(null);
                    setDropboxStagingFile(null);
                  }}
                >
                  <motion.div
                    ref={uploadAcceptedDesignsRef}
                    tabIndex={-1}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="dropbox-upload-title"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="pointer-events-auto w-full max-w-md rounded-3xl border border-white/70 bg-white p-6 shadow-2xl"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-center justify-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-100">
                        <CloudUpload className="h-7 w-7 text-sky-600" />
                      </div>
                    </div>
                    <h3 id="dropbox-upload-title" className="mt-4 text-center text-lg font-semibold text-gray-900">
                      Subir diseño final
                    </h3>
                    <p className="mt-2 text-center text-sm text-secondary">
                      El archivo se adjunta al proyecto. La tarjeta no avanza hasta que el cliente apruebe el diseño
                      desde el detalle de su visita en Agenda.
                    </p>
                    <label className="mt-5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/20 bg-sky-50/50 px-4 py-8 text-center text-sm text-secondary transition hover:border-sky-300 hover:bg-sky-50">
                      <CloudUpload className="h-5 w-5 text-sky-600" />
                      <span className="font-medium text-primary">
                        {dropboxStagingFile ? dropboxStagingFile.name : "Seleccionar archivo"}
                      </span>
                      <span className="text-xs text-secondary">PDF, imágenes u otros (un archivo)</span>
                      <input
                        type="file"
                        className="sr-only"
                        accept="image/*,.pdf,.dwg,.dxf"
                        tabIndex={-1}
                        onChange={(event) => {
                          const f = event.target.files?.[0];
                          setDropboxStagingFile(f ?? null);
                        }}
                      />
                    </label>
                    <div className="mt-6 flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setUploadAcceptedDesignsTaskId(null);
                          setDropboxStagingFile(null);
                        }}
                        className="flex-1 rounded-2xl border border-primary/10 bg-white py-3 text-sm font-semibold text-secondary transition hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={!dropboxStagingFile || dropboxUploading}
                        onClick={() => {
                          if (!uploadAcceptedDesignsTaskId || !dropboxStagingFile) return;
                          void handleDropboxUpload(uploadAcceptedDesignsTaskId, dropboxStagingFile);
                        }}
                        className="flex-1 rounded-2xl bg-sky-600 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {dropboxUploading ? "Subiendo…" : "Subir archivo"}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}

      {mounted
        ? createPortal(
            <AnimatePresence mode="sync">
              {cotizacionEntregadaTaskId ? (
                <motion.div
                  key={cotizacionEntregadaTaskId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, pointerEvents: "none" }}
                  transition={{ duration: 0.2 }}
                  className="pointer-events-auto fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4"
                  onClick={() => setCotizacionEntregadaTaskId(null)}
                >
                  <motion.div
                    ref={cotizacionEntregadaRef}
                    tabIndex={-1}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="cotizacion-entregada-title"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="pointer-events-auto w-full max-w-md rounded-3xl border border-primary/10 bg-white p-6 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 id="cotizacion-entregada-title" className="text-lg font-semibold text-gray-900">
                      ¿Confirmar entrega?
                    </h3>
                    <p className="mt-2 text-sm text-secondary">
                      ¿Confirmas que el cliente ya recibió su cotización formal? El proyecto pasará a la etapa de Seguimiento
                      para esperar su decisión.
                    </p>
                    <div className="mt-6 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setCotizacionEntregadaTaskId(null)}
                        className="flex-1 rounded-2xl border border-primary/10 bg-white py-3 text-sm font-semibold text-secondary transition hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (cotizacionEntregadaTaskId) {
                            void completeCotizacion(cotizacionEntregadaTaskId);
                            setCotizacionEntregadaTaskId(null);
                            setActiveTaskId(null);
                          }
                        }}
                        className="flex-1 rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                      >
                        Confirmar
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}

      {mounted
        ? createPortal(
            <AnimatePresence mode="sync">
              {dragErrorMessage ? (
                <motion.div
                  key="kanban-drag-error"
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    x: [0, -10, 10, -10, 10, 0],
                  }}
                  exit={{ opacity: 0, y: 50, scale: 0.9, pointerEvents: "none" }}
                  transition={{
                    duration: 0.4,
                    x: { duration: 0.4, delay: 0.1 },
                  }}
                  className="pointer-events-auto fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-2xl border-2 border-rose-300 bg-rose-50 px-6 py-4 shadow-xl"
                >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-rose-500">No puedes mover esta tarea</p>
                <p className="mt-1 text-sm font-medium text-rose-800">{dragErrorMessage}</p>
              </div>
            </div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}

      {mounted
        ? createPortal(
            <AnimatePresence mode="sync">
              {scheduleVisitTask ? (
                <motion.div
                  key={`schedule-visit-${scheduleVisitTask.id}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, pointerEvents: "none" }}
                  className="pointer-events-auto fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 px-4 py-6"
                  onClick={() => setScheduleVisitTaskId(null)}
                >
                  <motion.div
                    ref={scheduleVisitRef}
                    tabIndex={-1}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="schedule-visit-title"
                    initial={{ y: 24, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 24, opacity: 0 }}
                    className="pointer-events-auto max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-sky-100 bg-white p-6 shadow-2xl"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase text-sky-700">Diseños</p>
                        <h3 id="schedule-visit-title" className="mt-1 text-lg font-semibold text-gray-900">Agendar visita</h3>
                        <p className="mt-1 text-sm text-secondary">{scheduleVisitTask.project}. La tarjeta seguirá en Diseños.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setScheduleVisitTaskId(null)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600"
                        aria-label="Cerrar formulario"
                      >
                        Cerrar
                      </button>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-semibold text-gray-600">
                        Cliente
                        <input value={visitDraft.client} onChange={(event) => setVisitDraft((draft) => ({ ...draft, client: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-normal text-gray-900 outline-none focus:border-sky-500" />
                      </label>
                      <label className="text-xs font-semibold text-gray-600">
                        Correo
                        <input type="email" value={visitDraft.email} onChange={(event) => setVisitDraft((draft) => ({ ...draft, email: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-normal text-gray-900 outline-none focus:border-sky-500" />
                      </label>
                      <label className="text-xs font-semibold text-gray-600">
                        Teléfono
                        <input value={visitDraft.phone} onChange={(event) => setVisitDraft((draft) => ({ ...draft, phone: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-normal text-gray-900 outline-none focus:border-sky-500" />
                      </label>
                      <label className="text-xs font-semibold text-gray-600">
                        Dirección
                        <input value={visitDraft.location} onChange={(event) => setVisitDraft((draft) => ({ ...draft, location: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-normal text-gray-900 outline-none focus:border-sky-500" />
                      </label>
                      <label className="text-xs font-semibold text-gray-600">
                        Fecha
                        <input type="date" min={new Date().toLocaleDateString("en-CA")} value={visitDraft.date} onChange={(event) => setVisitDraft((draft) => ({ ...draft, date: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-normal text-gray-900 outline-none focus:border-sky-500" />
                      </label>
                      <label className="text-xs font-semibold text-gray-600">
                        Hora
                        <select value={visitDraft.time} onChange={(event) => setVisitDraft((draft) => ({ ...draft, time: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-normal text-gray-900 outline-none focus:border-sky-500">
                          {VISIT_TIME_SLOTS.map((time) => <option key={time} value={time}>{time}</option>)}
                        </select>
                      </label>
                    </div>
                    <div className="mt-4">
                      <Captcha
                        ref={visitCaptchaRef}
                        onVerify={setVisitCaptchaToken}
                        onExpire={() => setVisitCaptchaToken("")}
                        onError={() => setVisitCaptchaToken("")}
                      />
                    </div>
                    {visitError ? <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{visitError}</p> : null}
                    <div className="mt-5 flex justify-end gap-2">
                      <button type="button" onClick={() => setScheduleVisitTaskId(null)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700">Cancelar</button>
                      <button type="button" disabled={visitSaving || !visitCaptchaToken} onClick={() => void saveScheduledVisit()} className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                        {visitSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
                        {visitSaving ? "Guardando..." : "Guardar visita"}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}

      {mounted
        ? createPortal(
            <AnimatePresence mode="sync">
              {uploadToast ? (
                <motion.div
                  key="kanban-upload-toast"
                  initial={{ opacity: 0, y: -20, x: "-50%" }}
                  animate={{ opacity: 1, y: 0, x: "-50%" }}
                  exit={{ opacity: 0, y: -20, x: "-50%" }}
                  transition={{ duration: 0.25 }}
                  role="status"
                  className={`pointer-events-auto fixed left-1/2 top-6 z-[100] flex items-center gap-3 rounded-2xl border-2 px-5 py-3 shadow-xl ${
                    uploadToast.type === "success"
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-rose-300 bg-rose-50"
                  }`}
                >
                  {uploadToast.type === "success" ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle className="h-5 w-5 shrink-0 text-rose-600" />
                  )}
                  <p
                    className={`text-sm font-medium ${
                      uploadToast.type === "success" ? "text-emerald-800" : "text-rose-800"
                    }`}
                  >
                    {uploadToast.message}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}

