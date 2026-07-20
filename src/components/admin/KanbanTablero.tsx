 "use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { FileUp, AlertTriangle, CheckCircle2, XCircle, Clock, Calendar, Trash2 } from "lucide-react";

import { useEscapeClose } from "@/hooks/useEscapeClose";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import {
  kanbanColumns,
  kanbanStorageKey,
  initialKanbanTasks,
  activeCitaTaskStorageKey,
  activeCitaTaskSnapshotStorageKey,
  citaReturnUrlStorageKey,
  activeCotizacionFormalTaskStorageKey,
  type KanbanTask,
  type TaskFile,
  type TaskPriority,
  type TaskStage,
  type TaskStatus,
  type FollowUpStatus,
  type PreliminarData,
  type CotizacionFormalData,
} from "@/lib/kanban";
import { runtimeStore } from "@/lib/runtime-store";

const currentUser = "Valeria";

const stageStyles: Record<TaskStage, { border: string; badge: string }> = {
  citas: { border: "border-sky-500", badge: "bg-sky-50 text-sky-600" },
  disenos: { border: "border-violet-500", badge: "bg-violet-50 text-violet-600" },
  cotizacion: { border: "border-emerald-500", badge: "bg-emerald-50 text-emerald-600" },
  contrato: { border: "border-amber-500", badge: "bg-amber-50 text-amber-700" },
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

const getDemoFollowUpDate = (taskId: string): number => {
  const hash = taskId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const daysVariants = [1, 4, 7, 10];
  const days = daysVariants[hash % daysVariants.length];
  return Date.now() - (days * 24 * 60 * 60 * 1000);
};

const formatDate = (timestamp: number | undefined): string => {
  if (!timestamp) return "Sin fecha";
  const date = new Date(timestamp);
  return date.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
};

const toString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value : undefined;

const getClientNameFromTask = (task: Partial<KanbanTask> & Record<string, unknown>): string | undefined => {
  const rawCita = task.cita && typeof task.cita === "object" ? (task.cita as Record<string, unknown>) : null;
  const nestedClient = rawCita?.cliente && typeof rawCita.cliente === "object" ? (rawCita.cliente as Record<string, unknown>) : null;
  return (
    toString(nestedClient?.nombre) ??
    toString(rawCita?.nombreCliente) ??
    toString(task.nombreCliente) ??
    toString(task.clientName) ??
    toString(task.project)
  );
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

const generateDateFromId = (taskId: string): number => {
  const hash = taskId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const daysAgo = (hash % 25) + 1;
  return Date.now() - (daysAgo * 24 * 60 * 60 * 1000);
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
  const stage =
    typeof task.stage === "string" && kanbanColumns.some((col) => col.id === task.stage)
      ? (task.stage as TaskStage)
      : legacyStage ?? "citas";
  const status = task.status === "completada" ? "completada" : "pendiente";
  const rawAssigned = task.assignedTo ?? task.employee;
  const assignedTo: string[] = Array.isArray(rawAssigned)
    ? rawAssigned.filter((s): s is string => typeof s === "string")
    : typeof rawAssigned === "string" && rawAssigned
      ? [rawAssigned]
      : ["Sin asignar"];
  const priority: TaskPriority =
    task.priority === "alta" || task.priority === "baja" ? task.priority : "media";
  const rawFollowUp = (task as { followUpStatus?: string }).followUpStatus;
  const followUpStatus: FollowUpStatus =
    rawFollowUp === "confirmado"
      ? "confirmado"
      : rawFollowUp === "inactivo" || rawFollowUp === "descartado"
        ? "inactivo"
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
  const sourceType = typeof task.sourceType === "string" ? task.sourceType : undefined;
  const clientName = sourceType === "cita" || task.cita || task.nombreCliente || task.clientName
    ? getClientNameFromTask(task)
    : undefined;

  return {
    id: typeof task.id === "string" ? task.id : `task-${Date.now()}`,
    title: typeof task.title === "string" ? task.title : "Tarea sin título",
    stage,
    status,
    assignedTo,
    project: clientName ?? (typeof task.project === "string" ? task.project : "General"),
    notes: typeof task.notes === "string" ? task.notes : "",
    files: Array.isArray(task.files) ? (task.files as TaskFile[]) : [],
    priority,
    dueDate: typeof task.dueDate === "string" ? task.dueDate : undefined,
    location: typeof task.location === "string" ? task.location : undefined,
    mapsUrl: typeof task.mapsUrl === "string" ? task.mapsUrl : undefined,
    createdAt: typeof task.createdAt === "number" && task.createdAt > 1600000000000
      ? task.createdAt
      : generateDateFromId(typeof task.id === "string" ? task.id : `task-${Date.now()}`),
    followUpEnteredAt: typeof task.followUpEnteredAt === "number"
      ? task.followUpEnteredAt
      : stage === "contrato"
        ? getDemoFollowUpDate(typeof task.id === "string" ? task.id : "")
        : undefined,
    followUpStatus,
    preliminarData,
    cotizacionFormalData,
    preliminarCotizaciones,
    cotizacionesFormales,
    citaStarted: Boolean(task.citaStarted),
    citaFinished: Boolean(task.citaFinished),
    designApprovedByAdmin: Boolean(task.designApprovedByAdmin),
    designApprovedByClient: Boolean(task.designApprovedByClient),
    codigoProyecto: typeof task.codigoProyecto === "string" ? task.codigoProyecto : undefined,
  };
};

/** Enriquece las tareas guardadas con datos de initial (createdAt, files, etc.). */
const mergeTasks = (storedTasks: KanbanTask[]) => {
  const initialMap = new Map(initialKanbanTasks.map((task) => [task.id, task]));
  return storedTasks.map((task) => {
    const initialTask = initialMap.get(task.id);
    if (initialTask) {
      return {
        ...task,
        createdAt: initialTask.createdAt,
        files: initialTask.files && initialTask.files.length > 0 ? initialTask.files : task.files,
        designApprovedByAdmin: initialTask.designApprovedByAdmin ?? task.designApprovedByAdmin,
      };
    }
    return { ...task, createdAt: task.createdAt || generateDateFromId(task.id) };
  });
};

/** Mueve a la siguiente columna las tareas que ya completaron su flujo en la etapa actual. */
const autoAdvanceCompletedTasks = (tasks: KanbanTask[]): KanbanTask[] => {
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
    if (task.stage === "cotizacion" && task.citaStarted && task.citaFinished) {
      changed = true;
      return {
        ...task,
        stage: "contrato" as TaskStage,
        status: "pendiente" as TaskStatus,
        followUpEnteredAt: task.followUpEnteredAt ?? Date.now(),
        followUpStatus: "pendiente" as FollowUpStatus,
      };
    }
    return task;
  });
  return changed ? next : tasks;
};

export type KanbanTableroProps = {
  /** Filtrar por nombre de empleado. null = ver todo, string = solo ese empleado. */
  filterByEmployee?: string | null;
  /** Incrementar para forzar re-lectura desde almacenamiento en memoria (ej. tras crear tarea). */
  refreshTrigger?: number;
  /** Lista de integrantes para reasignar desde el detalle. */
  teamMembers?: { id: string; name: string }[];
  /** Si false, no se muestra el botón Eliminar tarea (ej. vista empleado). Por defecto true. */
  allowDeleteTask?: boolean;
  /** Llamado después de marcar un cliente como inactivo en Seguimiento (ej. admin redirige a proyectos-inactivos). */
  onAfterDiscard?: () => void;
};

export function KanbanTablero(props: KanbanTableroProps = {}) {
  const { filterByEmployee, refreshTrigger = 0, teamMembers, allowDeleteTask = true, onAfterDiscard } = props;
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"all" | "mine">("all");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [uploadTaskId, setUploadTaskId] = useState<string | null>(null);
  const [kanbanTasks, setKanbanTasks] = useState<KanbanTask[]>(initialKanbanTasks);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<TaskStage | null>(null);
  const [sortBy, setSortBy] = useState<"default" | "priority" | "date">("default");
  const [dragErrorMessage, setDragErrorMessage] = useState<string | null>(null);
  const [confirmClientTaskId, setConfirmClientTaskId] = useState<string | null>(null);
  const [deleteConfirmTaskId, setDeleteConfirmTaskId] = useState<string | null>(null);
  const skipNextWriteRef = useRef(false);
  const activeTaskRef = useRef<HTMLDivElement | null>(null);
  const uploadTaskRef = useRef<HTMLDivElement | null>(null);
  const confirmClientRef = useRef<HTMLDivElement | null>(null);
  const deleteConfirmRef = useRef<HTMLDivElement | null>(null);

  useEscapeClose(Boolean(activeTaskId), () => setActiveTaskId(null));
  useEscapeClose(Boolean(uploadTaskId), () => setUploadTaskId(null));
  useEscapeClose(Boolean(confirmClientTaskId), () => setConfirmClientTaskId(null));
  useEscapeClose(Boolean(deleteConfirmTaskId), () => setDeleteConfirmTaskId(null));
  useFocusTrap(Boolean(activeTaskId), activeTaskRef);
  useFocusTrap(Boolean(uploadTaskId), uploadTaskRef);
  useFocusTrap(Boolean(confirmClientTaskId), confirmClientRef);
  useFocusTrap(Boolean(deleteConfirmTaskId), deleteConfirmRef);

  useEffect(() => {
    const syncFromStorage = () => {
      const stored = runtimeStore.getItem(kanbanStorageKey);
      if (!stored) {
        const merged = mergeTasks(initialKanbanTasks);
        const advanced = autoAdvanceCompletedTasks(merged);
        skipNextWriteRef.current = true;
        setKanbanTasks(advanced);
        runtimeStore.setItem(kanbanStorageKey, JSON.stringify(advanced));
        return;
      }
      try {
        const parsed = JSON.parse(stored) as KanbanTask[];
        if (!Array.isArray(parsed) || parsed.length === 0) {
          skipNextWriteRef.current = true;
          setKanbanTasks([]);
          runtimeStore.setItem(kanbanStorageKey, JSON.stringify([]));
          return;
        }
        const normalized = parsed.map((task) => normalizeTask(task));
        const merged = mergeTasks(normalized);
        const advanced = autoAdvanceCompletedTasks(merged);
        skipNextWriteRef.current = true;
        setKanbanTasks(advanced);
        if (advanced !== merged) {
          runtimeStore.setItem(kanbanStorageKey, JSON.stringify(advanced));
        }
      } catch {
        // ignore malformed storage
      }
    };

    syncFromStorage();
    const handleFocus = () => syncFromStorage();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        syncFromStorage();
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (refreshTrigger === 0) return;
    const stored = runtimeStore.getItem(kanbanStorageKey);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as KanbanTask[];
      if (Array.isArray(parsed) && parsed.length) {
        const normalized = parsed.map((task) => normalizeTask(task));
        const merged = mergeTasks(normalized);
        const advanced = autoAdvanceCompletedTasks(merged);
        skipNextWriteRef.current = true;
        setKanbanTasks(advanced);
        if (advanced !== merged) {
          runtimeStore.setItem(kanbanStorageKey, JSON.stringify(advanced));
        }
      }
    } catch {
      // ignore
    }
  }, [refreshTrigger]);

  useEffect(() => {
    if (skipNextWriteRef.current) {
      skipNextWriteRef.current = false;
      return;
    }
    runtimeStore.setItem(kanbanStorageKey, JSON.stringify(kanbanTasks));
  }, [kanbanTasks]);

  useEffect(() => {
    const autoDiscardExpiredFollowUps = () => {
      let hasChanges = false;

      setKanbanTasks((prev) => {
        const updated = prev.map((task) => {
          if (
            task.stage === "contrato" &&
            task.followUpStatus === "pendiente" &&
            task.followUpEnteredAt
          ) {
            const daysPassed = Math.floor((Date.now() - task.followUpEnteredAt) / (1000 * 60 * 60 * 24));
            if (daysPassed >= FOLLOWUP_AUTO_DISCARD_DAYS) {
              hasChanges = true;
              return {
                ...task,
                followUpStatus: "inactivo" as FollowUpStatus,
                status: "completada" as TaskStatus,
              };
            }
          }
          return task;
        });
        return hasChanges ? updated : prev;
      });
    };

    const runAutoAdvance = () => {
      setKanbanTasks((prev) => {
        const advanced = autoAdvanceCompletedTasks(prev);
        return advanced !== prev ? advanced : prev;
      });
    };

    autoDiscardExpiredFollowUps();
    runAutoAdvance();
    const interval = setInterval(() => {
      autoDiscardExpiredFollowUps();
      runAutoAdvance();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const filteredTasks = useMemo(() => {
    if (filterByEmployee !== undefined) {
      if (filterByEmployee === null || filterByEmployee === "") return kanbanTasks;
      return kanbanTasks.filter((task) =>
        Array.isArray(task.assignedTo) ? task.assignedTo.includes(filterByEmployee) : false,
      );
    }
    if (viewMode === "mine") {
      return kanbanTasks.filter((task) =>
        Array.isArray(task.assignedTo) ? task.assignedTo.includes(currentUser) : false,
      );
    }
    return kanbanTasks;
  }, [kanbanTasks, viewMode, filterByEmployee]);

  const updateTask = (taskId: string, updater: (task: KanbanTask) => KanbanTask) => {
    setKanbanTasks((prev) =>
      prev.map((task) => (task.id === taskId ? updater(task) : task)),
    );
  };

  const setTaskStatus = (taskId: string, status: TaskStatus) => {
    updateTask(taskId, (task) => ({ ...task, status }));
  };

  const moveTaskToStage = (taskId: string, stage: TaskStage) => {
    updateTask(taskId, (task) => {
      const updates: Partial<KanbanTask> = { stage };
      if (stage === "contrato" && task.stage !== "contrato") {
        updates.followUpEnteredAt = Date.now();
        updates.followUpStatus = "pendiente";
      }
      return { ...task, ...updates };
    });
  };

  const tryMoveTaskToStage = (taskId: string, targetStage: TaskStage): boolean => {
    const task = kanbanTasks.find((t) => t.id === taskId);
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
    }

    if (task.stage === "contrato") {
      if (task.followUpStatus !== "confirmado" && task.followUpStatus !== "inactivo") {
        showError("Debes confirmar o marcar inactivo el seguimiento antes de mover esta tarea");
        return false;
      }
    }

    // Validación general: cada etapa se considera completa por sus propios flags
    const flowComplete =
      task.stage === "citas" ? Boolean(task.citaStarted && task.citaFinished) :
      task.stage === "disenos" ? Boolean(task.designApprovedByAdmin && task.designApprovedByClient) :
      task.stage === "cotizacion" ? Boolean(task.citaStarted && task.citaFinished) :
      task.stage === "contrato" ? (task.followUpStatus === "confirmado" || task.followUpStatus === "inactivo") :
      task.status === "completada";
    if (!flowComplete) {
      showError("Debes completar la tarea antes de moverla a otra columna");
      return false;
    }

    moveTaskToStage(taskId, targetStage);
    return true;
  };

  const confirmFollowUp = (taskId: string) => {
    updateTask(taskId, (task) => ({ ...task, followUpStatus: "confirmado" as FollowUpStatus, status: "completada" as TaskStatus }));
  };

  const discardFollowUp = (taskId: string) => {
    updateTask(taskId, (task) => ({ ...task, followUpStatus: "inactivo" as FollowUpStatus, status: "completada" as TaskStatus }));
    onAfterDiscard?.();
  };

  const startCita = (taskId: string) => {
    updateTask(taskId, (task) => ({ ...task, citaStarted: true }));
    const selectedTask = kanbanTasks.find((task) => task.id === taskId);
    runtimeStore.setItem(activeCitaTaskStorageKey, taskId);
    if (selectedTask) {
      runtimeStore.setItem(activeCitaTaskSnapshotStorageKey, JSON.stringify(selectedTask));
    }
    runtimeStore.setItem(citaReturnUrlStorageKey, window.location.pathname);
    router.push("/dashboard/cotizador-preliminar");
  };

  const finishCita = (taskId: string) => {
    updateTask(taskId, (task) => ({
      ...task,
      citaFinished: true,
      stage: "disenos" as TaskStage,
      status: "pendiente" as TaskStatus,
    }));
  };

  const startCotizacionFormal = (taskId: string) => {
    updateTask(taskId, (t) => ({ ...t, citaStarted: true }));
    runtimeStore.setItem(activeCotizacionFormalTaskStorageKey, taskId);
    runtimeStore.setItem(citaReturnUrlStorageKey, window.location.pathname);
    router.push("/dashboard/cotizador");
  };

  const approveDesignAsAdmin = (taskId: string) => {
    updateTask(taskId, (task) => ({ ...task, designApprovedByAdmin: true }));
  };

  const approveDesignAsClient = (taskId: string) => {
    updateTask(taskId, (task) => ({
      ...task,
      designApprovedByClient: true,
      stage: "cotizacion" as TaskStage,
      status: "pendiente" as TaskStatus,
      citaStarted: false,
      citaFinished: false,
    }));
  };

  const completeCotizacion = (taskId: string) => {
    updateTask(taskId, (task) => ({
      ...task,
      stage: "contrato" as TaskStage,
      status: "pendiente" as TaskStatus,
      followUpEnteredAt: Date.now(),
      followUpStatus: "pendiente" as FollowUpStatus,
    }));
  };

  const deleteTask = (taskId: string) => {
    setKanbanTasks((prev) => prev.filter((t) => t.id !== taskId));
    setActiveTaskId(null);
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
        const da = a.dueDate ? new Date(a.dueDate).getTime() : a.createdAt ?? 0;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : b.createdAt ?? 0;
        return da - db;
      });
    }
    return tasks;
  };

  const activeTask = useMemo(
    () => kanbanTasks.find((task) => task.id === activeTaskId) ?? null,
    [activeTaskId, kanbanTasks],
  );
  const uploadTask = useMemo(
    () => kanbanTasks.find((task) => task.id === uploadTaskId) ?? null,
    [kanbanTasks, uploadTaskId],
  );

  const inferFileType = (name: string): TaskFile["type"] => {
    const lower = name.toLowerCase();
    if (lower.endsWith(".pdf")) return "pdf";
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png")) {
      return "render";
    }
    return "otro";
  };

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFilesUpload = async (taskId: string, fileList: FileList | null) => {
    if (!fileList?.length) return;
    const files = Array.from(fileList);
    const nextFiles: TaskFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const type = inferFileType(file.name);
      let src: string | undefined;
      if (type === "render") {
        try {
          src = await readFileAsDataUrl(file);
        } catch {
          // omit src on read error
        }
      }
      nextFiles.push({
        id: `file-${Date.now()}-${i}-${file.name}`,
        name: file.name,
        type,
        ...(src ? { src } : {}),
      });
    }
    updateTask(taskId, (task) => ({
      ...task,
      files: [...(task.files ?? []), ...nextFiles],
    }));
  };

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur-md"
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

        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          {kanbanColumns.map((column) => {
            const columnTasksRaw = filteredTasks.filter((task) => task.stage === column.id);
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
                    tryMoveTaskToStage(taskId, column.id);
                  }
                  setDraggedTaskId(null);
                  setDragOverColumnId(null);
                }}
                className={`rounded-2xl border border-primary/10 bg-white/70 p-4 transition ${
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
                    return (
                      <div
                        key={task.id}
                        draggable
                        onClick={() => setActiveTaskId(task.id)}
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/plain", task.id);
                          event.dataTransfer.effectAllowed = "move";
                          setDraggedTaskId(task.id);
                        }}
                        onDragEnd={() => {
                          setDraggedTaskId(null);
                          setDragOverColumnId(null);
                        }}
                        className={`flex min-h-[220px] cursor-pointer flex-col rounded-2xl border border-primary/10 bg-white px-4 py-4 text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                          stageStyle?.border ? `border-l-4 ${stageStyle.border}` : ""
                        }`}
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
                                    Marcando inactivo automáticamente...
                                  </span>
                                );
                              }
                              if (alertLevel === "urgent") {
                                return (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-[10px] font-semibold text-rose-700 animate-pulse">
                                    <AlertTriangle className="h-3 w-3" />
                                    ¡Urgente! Se inactiva en {daysUntilDiscard} días
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
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700">
                              <Clock className="h-3 w-3" />
                              Esperando aprobación
                            </span>
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
                              {task.stage === "citas" && task.status === "pendiente" && !task.citaStarted ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    startCita(task.id);
                                  }}
                                  className="inline-flex w-auto items-center rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-white"
                                >
                                  Iniciar cita
                                </button>
                              ) : null}
                              {task.stage === "citas" && task.citaStarted && !task.citaFinished ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    finishCita(task.id);
                                  }}
                                  className="inline-flex w-auto items-center rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white"
                                >
                                  Terminar cita
                                </button>
                              ) : null}
                              {task.stage === "citas" && task.status === "completada" ? (
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
                              {task.stage === "cotizacion" && task.citaStarted && task.citaFinished ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    completeCotizacion(task.id);
                                  }}
                                  className="inline-flex w-auto items-center rounded-full bg-emerald-700 px-3 py-1 text-[11px] font-semibold text-white"
                                >
                                  Pasar a seguimiento
                                </button>
                              ) : null}

                              {/* DISEÑOS: Subir → Admin aprueba → Cliente acepta */}
                              {task.stage === "disenos" && task.status === "pendiente" && (!task.files || task.files.length === 0) ? (
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
                              {task.stage === "disenos" && task.designApprovedByAdmin && !task.designApprovedByClient ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setConfirmClientTaskId(task.id);
                                  }}
                                  className="inline-flex w-auto items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  Cliente aceptó
                                </button>
                              ) : null}

                              {/* SEGUIMIENTO: Confirmar/Marcar inactivo */}
                              {task.stage === "contrato" && task.followUpStatus === "pendiente" ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      confirmFollowUp(task.id);
                                    }}
                                    className="inline-flex w-auto items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                    Confirmar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      discardFollowUp(task.id);
                                    }}
                                    className="inline-flex w-auto items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                                  >
                                    <XCircle className="h-3 w-3" />
                                    Marcar inactivo
                                  </button>
                                </>
                              ) : null}
                              {task.stage === "contrato" && task.followUpStatus === "confirmado" ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Cliente confirmado
                                </span>
                              ) : null}
                              {task.stage === "contrato" && task.followUpStatus === "inactivo" ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-500">
                                  <XCircle className="h-3 w-3" />
                                  Proyecto inactivo
                                </span>
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

      <AnimatePresence>
        {activeTask ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={() => setActiveTaskId(null)}
          >
            <motion.aside
              ref={activeTaskRef}
              tabIndex={-1}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className="absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto rounded-l-3xl border border-white/40 bg-white/95 p-6 shadow-2xl backdrop-blur-md"
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
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTaskId(null)}
                  className="rounded-full border border-primary/10 px-3 py-2 text-xs font-semibold text-secondary"
                >
                  Cerrar
                </button>
              </div>

              <div className="mt-6 space-y-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                    {teamMembers && teamMembers.length > 0
                      ? "Responsables (varios permitidos)"
                      : "Responsables"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(Array.isArray(activeTask.assignedTo) ? activeTask.assignedTo : []).map(
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
                              onClick={() =>
                                updateTask(activeTask.id, (task) => ({
                                  ...task,
                                  assignedTo: (task.assignedTo as string[]).filter((n) => n !== name),
                                }))
                              }
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
                          updateTask(activeTask.id, (task) => ({
                            ...task,
                            assignedTo: [...(Array.isArray(task.assignedTo) ? task.assignedTo : []), name],
                          }));
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
                        const moved = tryMoveTaskToStage(activeTask.id, event.target.value as TaskStage);
                        if (!moved) {
                          event.target.value = activeTask.stage;
                        }
                      }}
                      className="mt-3 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm font-semibold text-secondary"
                    >
                      {kanbanColumns.map((col) => (
                        <option key={col.id} value={col.id}>
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
                    onChange={(e) =>
                      updateTask(activeTask.id, (task) => ({
                        ...task,
                        priority: e.target.value as TaskPriority,
                      }))
                    }
                    className="mt-3 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm font-semibold text-secondary"
                  >
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                    Dirección / Localidad (opcional)
                  </p>
                  <input
                    type="text"
                    value={activeTask.location ?? ""}
                    onChange={(e) =>
                      updateTask(activeTask.id, (task) => ({
                        ...task,
                        location: e.target.value.trim() || undefined,
                      }))
                    }
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
                    onChange={(e) =>
                      updateTask(activeTask.id, (task) => ({
                        ...task,
                        mapsUrl: e.target.value.trim() || undefined,
                      }))
                    }
                    placeholder="https://maps.google.com/..."
                    className="mt-3 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                    Fecha límite (opcional)
                  </p>
                  <input
                    type="date"
                    value={activeTask.dueDate ?? ""}
                    onChange={(e) =>
                      updateTask(activeTask.id, (task) => ({
                        ...task,
                        dueDate: e.target.value || undefined,
                      }))
                    }
                    className="mt-3 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                  />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                    Estatus interno
                  </p>
                  <select
                    value={activeTask.status}
                    onChange={(event) =>
                      setTaskStatus(activeTask.id, event.target.value as TaskStatus)
                    }
                    className="mt-3 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm font-semibold text-secondary"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="completada">Completada</option>
                  </select>
                </div>

                {activeTask.stage === "citas" && activeTask.status === "pendiente" ? (
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
                          onClick={() => startCita(activeTask.id)}
                          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
                        >
                          Iniciar cita
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => finishCita(activeTask.id)}
                          className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
                        >
                          Terminar cita
                        </button>
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
                      <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${activeTask.citaStarted && activeTask.citaFinished ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {activeTask.citaStarted && activeTask.citaFinished ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-4 w-4 rounded-full border-2 border-gray-300" />}
                        <span>3. Pasar a seguimiento</span>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
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
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            completeCotizacion(activeTask.id);
                            setActiveTaskId(null);
                          }}
                          className="rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white"
                        >
                          Completar y pasar a seguimiento
                        </button>
                      )}
                    </div>
                  </div>
                ) : null}
                {activeTask.stage === "disenos" ? (
                  <div>
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
                        <span>3. Cliente acepta</span>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {!activeTask.files || activeTask.files.length === 0 ? (
                        <button
                          type="button"
                          onClick={() => setUploadTaskId(activeTask.id)}
                          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
                        >
                          Subir archivo
                        </button>
                      ) : !activeTask.designApprovedByAdmin ? (
                        <span className="text-sm text-amber-600 font-medium">Esperando aprobación del admin</span>
                      ) : !activeTask.designApprovedByClient ? (
                        <button
                          type="button"
                          onClick={() => setConfirmClientTaskId(activeTask.id)}
                          className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
                        >
                          Cliente aceptó
                        </button>
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
                  ) : activeTask.followUpStatus === "inactivo" ? (
                    <div className="mt-3 flex items-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-500">
                      <XCircle className="h-5 w-5" />
                      <span className="font-semibold">Proyecto inactivo</span>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => confirmFollowUp(activeTask.id)}
                        className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Confirmar cliente
                      </button>
                      <button
                        type="button"
                        onClick={() => discardFollowUp(activeTask.id)}
                        className="flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        <XCircle className="h-4 w-4" />
                        Marcar inactivo
                      </button>
                    </div>
                  )}
                </div>

                {activeTask.stage === "disenos" || activeTask.stage === "contrato" ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                      Archivos
                    </p>
                    <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/20 bg-white px-4 py-6 text-sm text-secondary">
                      <FileUp className="h-4 w-4" />
                      Subir PDF o renders
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(event) => handleFilesUpload(activeTask.id, event.target.files)}
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
                      type="button"
                      onClick={() => setDeleteConfirmTaskId(activeTask.id)}
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
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirmTaskId ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4"
            onClick={() => setDeleteConfirmTaskId(null)}
          >
            <motion.div
              ref={deleteConfirmRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-confirm-title"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl"
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
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmTaskId(null)}
                  className="flex-1 rounded-2xl border border-primary/10 bg-white py-3 text-sm font-semibold text-secondary transition hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (deleteConfirmTaskId) {
                      deleteTask(deleteConfirmTaskId);
                      setDeleteConfirmTaskId(null);
                      setActiveTaskId(null);
                    }
                  }}
                  className="flex-1 rounded-2xl bg-rose-600 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
                >
                  Sí, eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {uploadTaskId ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={() => setUploadTaskId(null)}
          >
            <motion.div
              ref={uploadTaskRef}
              tabIndex={-1}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-md rounded-3xl border border-white/70 bg-white/90 p-6 shadow-2xl backdrop-blur-md"
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
              <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/20 bg-white px-4 py-8 text-center text-sm text-secondary">
                <FileUp className="h-4 w-4" />
                Seleccionar archivos
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(event) => {
                    const target = event.target;
                    handleFilesUpload(uploadTaskId, target.files).finally(() => {
                      setUploadTaskId(null);
                      target.value = "";
                    });
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => setUploadTaskId(null)}
                className="mt-6 w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-white"
              >
                Listo
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {confirmClientTaskId ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={() => setConfirmClientTaskId(null)}
          >
            <motion.div
              ref={confirmClientRef}
              tabIndex={-1}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl border border-white/70 bg-white p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                </div>
              </div>
              <h3 className="mt-4 text-center text-lg font-semibold">
                ¿Confirmar que el cliente aceptó?
              </h3>
              <p className="mt-2 text-center text-sm text-secondary">
                Esta acción marcará el diseño como aprobado por el cliente y completará la tarea.
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmClientTaskId(null)}
                  className="flex-1 rounded-2xl border border-primary/10 bg-white py-3 text-sm font-semibold text-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    approveDesignAsClient(confirmClientTaskId);
                    setConfirmClientTaskId(null);
                  }}
                  className="flex-1 rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white"
                >
                  Sí, confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {dragErrorMessage ? (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              x: [0, -10, 10, -10, 10, 0],
            }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ 
              duration: 0.4,
              x: { duration: 0.4, delay: 0.1 }
            }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl border-2 border-rose-300 bg-rose-50 px-6 py-4 shadow-xl"
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
      </AnimatePresence>
    </>
  );
}

