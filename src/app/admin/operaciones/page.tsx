"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, UserPlus, Calculator, FileText, MapPin, Calendar, Loader2, CheckCircle2, Clock, Upload, XCircle, AlertTriangle, FileUp, PencilLine } from "lucide-react";

import { useEscapeClose } from "@/hooks/useEscapeClose";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useAdminWorkflow } from "@/contexts/AdminWorkflowContext";
import { subirArchivoConMetadata } from "@/lib/axios/uploadsApi";
import { agregarArchivos } from "@/lib/axios/tareasApi";
import {
  activeCitaTaskStorageKey,
  activeCitaTaskSnapshotStorageKey,
  activeCotizacionFormalTaskStorageKey,
  citaReturnUrlStorageKey,
  finishedCitaTaskStorageKey,
  getCotizacionesFormalesList,
  getPreliminarList,
  kanbanColumns,
  type TaskStage,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/kanban";
import { runtimeStore } from "@/lib/runtime-store";
import { crearUsuario, listarEmpleados, listarUsuarios, type Usuario } from "@/lib/axios/usuariosApi";
import { isTaskInProgress, type AdminWorkflowTask } from "@/lib/admin-workflow";
import { VisitScheduleModal } from "@/components/admin/VisitScheduleModal";
import { FinalDesignUploadModal } from "@/components/admin/FinalDesignUploadModal";
import { ConfirmClientAmountModal } from "@/components/admin/ConfirmClientAmountModal";
import TaskDetailModal from "@/components/admin/TaskDetailModal";

const stageStyles: Record<TaskStage, { border: string; badge: string }> = {
  citas: { border: "border-sky-500", badge: "bg-sky-50 text-sky-600" },
  disenos: { border: "border-violet-500", badge: "bg-violet-50 text-violet-600" },
  cotizacion: { border: "border-emerald-500", badge: "bg-emerald-50 text-emerald-600" },
  contrato: { border: "border-amber-500", badge: "bg-amber-50 text-amber-700" },
};

const priorityStyles: Record<TaskPriority, string> = {
  alta: "bg-rose-100 text-rose-700",
  media: "bg-amber-100 text-amber-700",
  baja: "bg-emerald-100 text-emerald-700",
};

const statusStyles: Record<"pendiente" | "completada", string> = {
  pendiente: "bg-sky-50 text-sky-600",
  completada: "bg-emerald-50 text-emerald-700",
};

const formatDate = (date?: string) => {
  if (!date) return "Sin fecha";
  return new Date(date).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
};

const pad = (value: number) => value.toString().padStart(2, "0");

const toLocalSlot = (isoDateTime?: string) => {
  if (!isoDateTime) return null;
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatDateTime = (isoDateTime?: string) => {
  if (!isoDateTime) return "Sin agenda";
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return "Sin agenda";
  return date.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const FOLLOW_UP_WARNING_DAYS = 3;
const FOLLOW_UP_URGENT_DAYS = 7;
const FOLLOW_UP_EXPIRED_DAYS = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

const getFollowUpDays = (enteredAt?: number, createdAt?: number, now = Date.now()) => {
  const reference = enteredAt ?? createdAt;
  if (!reference) return 0;
  return Math.max(0, Math.floor((now - reference) / DAY_MS));
};

const getFollowUpAlertLevel = (enteredAt?: number, createdAt?: number, now = Date.now()): "none" | "warning" | "urgent" | "expired" => {
  const days = getFollowUpDays(enteredAt, createdAt, now);
  if (days >= FOLLOW_UP_EXPIRED_DAYS) return "expired";
  if (days >= FOLLOW_UP_URGENT_DAYS) return "urgent";
  if (days >= FOLLOW_UP_WARNING_DAYS) return "warning";
  return "none";
};

type TaskDraft = {
  title: string;
  project: string;
  assignedToIds: string[];
  notes: string;
  priority: TaskPriority;
  dueDate: string;
  location: string;
  mapsUrl: string;
  stage: TaskStage;
  status: TaskStatus;
};

const emptyDraft: TaskDraft = {
  title: "",
  project: "",
  assignedToIds: [],
  notes: "",
  priority: "media",
  dueDate: "",
  location: "",
  mapsUrl: "",
  stage: "citas",
  status: "pendiente",
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const prettyJson = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "No se pudo serializar a JSON";
  }
};

type ActionFeedbackTone = "success" | "error" | "warning" | "info";

type ActionFeedbackState = {
  message: string;
  tone: ActionFeedbackTone;
} | null;

const buildTrackingCodeFromTask = (task: AdminWorkflowTask) => {
  const rawTask = task as unknown as Record<string, unknown>;
  const citaRecord = rawTask.cita && typeof rawTask.cita === "object"
    ? (rawTask.cita as Record<string, unknown>)
    : null;
  const clienteRecord = citaRecord?.cliente && typeof citaRecord.cliente === "object"
    ? (citaRecord.cliente as Record<string, unknown>)
    : null;

  const isMongoObjectId = (value: string) => /^[a-f0-9]{24}$/i.test(value.trim());
  const normalizeClientId = (value: unknown) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    if (!trimmed || isMongoObjectId(trimmed)) return undefined;
    return trimmed;
  };

  const candidates = [
    normalizeClientId(rawTask.clienteId),
    normalizeClientId(citaRecord?.clienteId),
    normalizeClientId(clienteRecord?.clienteId),
    normalizeClientId(task.clientId),
  ];

  return candidates.find((value): value is string => Boolean(value)) ?? "Sin clienteId";
};

export default function OperacionesPage() {
  const router = useRouter();
  const { tasks, refresh, updateTask, moveTask, createTask, isLoading, assignWorkers } = useAdminWorkflow();

  const [employees, setEmployees] = useState<Usuario[]>([]);
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState("Todos");
  const [isSaving, setIsSaving] = useState(false);
  const [clockNow, setClockNow] = useState(Date.now());
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [visitModalTaskId, setVisitModalTaskId] = useState<string | null>(null);
  const [finalDesignUploadTaskId, setFinalDesignUploadTaskId] = useState<string | null>(null);
  const [confirmClientModalTaskId, setConfirmClientModalTaskId] = useState<string | null>(null);
  const [cotizacionEntregadaTaskId, setCotizacionEntregadaTaskId] = useState<string | null>(null);
  const [pendingUploadTaskId, setPendingUploadTaskId] = useState<string | null>(null);
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedbackState>(null);
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(emptyDraft);
  const [assignedWorkersByTaskId, setAssignedWorkersByTaskId] = useState<Record<string, string[]>>({});
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskModalError, setTaskModalError] = useState<string | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [newTaskProject, setNewTaskProject] = useState("");
  const [newTaskStage, setNewTaskStage] = useState<TaskStage>("citas");
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>("media");
  const [newTaskAssignedToIds, setNewTaskAssignedToIds] = useState<string[]>([]);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [teamError, setTeamError] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<Usuario["rol"]>("empleado");
  const [newMemberPassword, setNewMemberPassword] = useState("");
  const [isApplyingFinishedCita, setIsApplyingFinishedCita] = useState(false);

  const designUploadInputRef = useRef<HTMLInputElement | null>(null);
  const assignModalRef = useRef<HTMLDivElement | null>(null);
  const teamModalRef = useRef<HTMLDivElement | null>(null);
  const taskModalRef = useRef<HTMLDivElement | null>(null);

  const loadEmployees = async () => {
    const usersResponse = await listarUsuarios().catch(() => null);
    const employeesResponse = await listarEmpleados().catch(() => null);

    const source =
      usersResponse?.success && usersResponse.data
        ? usersResponse.data
        : employeesResponse?.success && employeesResponse.data
          ? employeesResponse.data
          : [];

    setEmployees(source.filter((user) => user.activo !== false));
  };

  useEscapeClose(Boolean(isAssignModalOpen), () => setIsAssignModalOpen(false));
  useEscapeClose(Boolean(isTeamModalOpen), () => setIsTeamModalOpen(false));
  useEscapeClose(Boolean(visitModalTaskId), () => setVisitModalTaskId(null));
  useEscapeClose(Boolean(confirmClientModalTaskId), () => setConfirmClientModalTaskId(null));
  useEscapeClose(Boolean(cotizacionEntregadaTaskId), () => setCotizacionEntregadaTaskId(null));

  useFocusTrap(Boolean(isAssignModalOpen), assignModalRef);
  useFocusTrap(Boolean(isTeamModalOpen), teamModalRef);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    void loadEmployees();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setClockNow(Date.now());
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      void refresh();
    }, 20 * 60_000);

    return () => clearInterval(interval);
  }, [refresh]);

  // Helper to show transient action feedback
  const showActionFeedback = (message: string, tone: ActionFeedbackTone = "info") => {
    setActionFeedback({ message, tone });
    window.setTimeout(() => setActionFeedback(null), 5_000);
  };

  // Columns derived from kanbanColumns and current tasks
  const columns = useMemo(() => {
    return kanbanColumns.map((col) => {
      const stageTasks = tasks.filter((t) => t.stage === col.id);
      if (col.id === "contrato") {
        return {
          id: col.id,
          label: col.label,
          tasks: stageTasks.filter((t) => (t.followUpStatus ?? "pendiente") === "pendiente"),
        };
      }
      return { id: col.id, label: col.label, tasks: stageTasks };
    });
  }, [tasks]);

  const openTeamModal = () => setIsTeamModalOpen(true);
  const openAssignModal = () => setIsAssignModalOpen(true);

  const openTaskModal = (taskId: string) => {
    const t = tasks.find((x) => x.id === taskId);
    if (!t) return;
    setActiveTaskId(t.id);
    setIsTaskModalOpen(true);
    setTaskModalError(null);
    const cachedAssignedToIds = assignedWorkersByTaskId[t.id] ?? t.assignedToIds ?? [];
    setTaskDraft((prev) => ({
      title: t.title ?? "",
      project: t.project ?? "",
      assignedToIds: cachedAssignedToIds,
      notes: (t as any).notes ?? "",
      priority: (t.priority as TaskPriority) ?? "media",
      dueDate: (t as any).dueDate ?? "",
      location: (t as any).location ?? "",
      mapsUrl: (t as any).mapsUrl ?? "",
      stage: t.stage,
      status: t.status,
    }));
  };

  const requestDesignUpload = (taskId: string) => {
    setPendingUploadTaskId(taskId);
    designUploadInputRef.current?.click();
  };

  const handleFinalDesignUpload = async (task: AdminWorkflowTask, file: File) => {
    return handleDesignUpload(task, file);
  };

  const visitModalTask = tasks.find((t) => t.id === visitModalTaskId) ?? null;
  const finalDesignUploadTask = tasks.find((t) => t.id === finalDesignUploadTaskId) ?? null;
  const confirmClientModalTask = tasks.find((t) => t.id === confirmClientModalTaskId) ?? null;
  const cotizacionEntregadaTask = tasks.find((t) => t.id === cotizacionEntregadaTaskId) ?? null;
  const activeTask = tasks.find((t) => t.id === activeTaskId) ?? null;

  const occupiedVisitSlots = useMemo(() => {
    return tasks
      .map((t) => toLocalSlot((t as any).visitScheduledAt))
      .filter((s): s is string => Boolean(s));
  }, [tasks]);

  const handleSaveVisitForTask = async (task: AdminWorkflowTask, isoDateTime?: string) => {
    if (!task) return;
    const nowIso = new Date().toISOString();
    await updateTask(task, {
      visitScheduledAt: isoDateTime ?? undefined,
      designApprovedByAdmin: true,
      status: "pendiente",
      visita: {
        ...(task.visita ?? {}),
        fechaProgramada: isoDateTime,
        aprobadaPorAdmin: true,
        actualizadaEn: nowIso,
      },
    });
    await refresh();
    setVisitModalTaskId(null);
    showActionFeedback("Visita guardada. Flujo listo para aprobación de cliente.", "success");
  };

  const resolveInitialProjectTotal = (task: AdminWorkflowTask) => {
    const rawTask = task as unknown as Record<string, unknown>;
    const direct = Number(rawTask.inversionTotal ?? rawTask.inversion ?? 0);
    if (Number.isFinite(direct) && direct > 0) return Math.round(direct);

    const fromPagos = task.pagos
      ? (task.pagos.anticipo.amount || 0) + (task.pagos.segundoPago.amount || 0) + (task.pagos.liquidacion.amount || 0)
      : 0;
    if (fromPagos > 0) return Math.round(fromPagos);

    const formalList = getCotizacionesFormalesList(task);
    const formal = formalList[0] as Record<string, unknown> | undefined;
    const formalTotal = Number(formal?.total ?? formal?.inversion ?? formal?.subtotal ?? 0);
    if (Number.isFinite(formalTotal) && formalTotal > 0) return Math.round(formalTotal);

    const preliminarList = getPreliminarList(task);
    const preliminar = preliminarList[0] as Record<string, unknown> | undefined;
    const preliminarTotal = Number(preliminar?.total ?? preliminar?.inversion ?? preliminar?.subtotal ?? 0);
    if (Number.isFinite(preliminarTotal) && preliminarTotal > 0) return Math.round(preliminarTotal);

    return undefined;
  };

  const handleConfirmClientWithTotal = async (task: AdminWorkflowTask, projectTotal: number) => {
    const normalizedTotal = Math.max(0, Math.round(Number(projectTotal) || 0));
    if (!normalizedTotal) {
      showActionFeedback("Ingresa un monto total valido para confirmar al cliente.", "warning");
      return;
    }

    try {
      setIsSaving(true);
      setActionFeedback(null);

      const pagos = {
        anticipo: { amount: 0, date: "", receiptLabel: "Ver recibo", receiptImage: "" },
        segundoPago: { amount: 0, date: "", receiptLabel: "Ver recibo", receiptImage: "" },
        liquidacion: { amount: 0, date: "", receiptLabel: "Ver recibo", receiptImage: "" },
      };

      await updateTask(task, {
        followUpStatus: "confirmado",
        status: "completada",
        inversion: normalizedTotal,
        pagos,
      } as Partial<AdminWorkflowTask>);

      const reloaded = await refresh();
      const updated = reloaded.find((item) => item.id === task.id);
      const updatedRecord = updated as unknown as Record<string, unknown> | undefined;
      const persistedTotal = Number(updatedRecord?.inversion ?? updatedRecord?.inversionTotal ?? 0);

      if (updated?.followUpStatus !== "confirmado") {
        showActionFeedback("El backend no guardó 'confirmado'. Revisa el contrato del endpoint PATCH /api/tareas/:id.", "warning");
      } else if (!Number.isFinite(persistedTotal) || persistedTotal <= 0) {
        showActionFeedback("Cliente confirmado, pero el backend no devolvió el total del proyecto. Revisa el contrato de seguimiento.", "warning");
      } else {
        showActionFeedback("Cliente confirmado y total del proyecto guardado correctamente.", "success");
      }

      setConfirmClientModalTaskId(null);
    } catch (error) {
      console.error("Error al confirmar cliente con total:", error);
      showActionFeedback(error instanceof Error ? error.message : "No se pudo confirmar al cliente.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMember = async () => {
    try {
      setIsSaving(true);
      await crearUsuario({ nombre: newMemberName, correo: newMemberEmail, rol: newMemberRole, password: newMemberPassword });
      setNewMemberName("");
      setNewMemberEmail("");
      setNewMemberPassword("");
      await loadEmployees();
      setIsTeamModalOpen(false);
      showActionFeedback("Miembro creado.", "success");
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : "No se pudo crear el miembro");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssignWorkers = async () => {
    if (!activeTask) {
      setTaskModalError("Selecciona una tarea para asignar");
      return;
    }
    try {
      setIsSaving(true);
      await assignWorkers(activeTask, taskDraft.assignedToIds);
      setTaskModalError(null);
      setAssignedWorkersByTaskId((prev) => ({
        ...prev,
        [activeTask.id]: [...taskDraft.assignedToIds],
      }));
      showActionFeedback("Responsables asignados.", "success");
      await refresh();
    } catch (error) {
      setTaskModalError(error instanceof Error ? error.message : "No se pudo asignar");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTask = async () => {
    if (!activeTask) {
      setTaskModalError("No hay tarea activa seleccionada");
      return;
    }
    const payload = {
      title: taskDraft.title,
      project: taskDraft.project,
      assignedToIds: taskDraft.assignedToIds,
      notes: taskDraft.notes,
      priority: taskDraft.priority,
      dueDate: taskDraft.dueDate || undefined,
      location: taskDraft.location || undefined,
      mapsUrl: taskDraft.mapsUrl || undefined,
      stage: taskDraft.stage,
      status: taskDraft.status,
    };

    console.log(JSON.stringify(payload, null, 2));

    try {
      setIsSaving(true);
      await updateTask(activeTask, payload);
      setAssignedWorkersByTaskId((prev) => {
        const next = { ...prev };
        delete next[activeTask.id];
        return next;
      });
      setIsTaskModalOpen(false);
      showActionFeedback("Tarea guardada.", "success");
      await refresh();
    } catch (error) {
      setTaskModalError(error instanceof Error ? error.message : "No se pudo guardar la tarea");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const finishedTaskId = runtimeStore.getItem(finishedCitaTaskStorageKey);
    if (!finishedTaskId || isApplyingFinishedCita) return;

    const task = tasks.find((currentTask) => currentTask.id === finishedTaskId);
    if (!task) return;

    const alreadyFinished =
      task.status === "completada" &&
      task.citaFinished === true &&
      (task.priority ?? "media") === "alta";

    if (alreadyFinished) {
      runtimeStore.removeItem(finishedCitaTaskStorageKey);
      return;
    }

    setIsApplyingFinishedCita(true);
    void (async () => {
      try {
        await updateTask(task, {
          citaStarted: true,
          citaFinished: true,
          status: "completada",
          priority: "alta",
        });
      } catch (error) {
        console.error("[Operaciones] Error al sincronizar cierre de cita desde cotizador:", error);
      } finally {
        runtimeStore.removeItem(finishedCitaTaskStorageKey);
        setIsApplyingFinishedCita(false);
      }
    })();
  }, [isApplyingFinishedCita, tasks, updateTask]);

  const handleAssignPending = async () => {
    const project = newTaskProject.trim();
    if (!project) {
      setAssignError("Ingresa un proyecto o cliente.");
      return;
    }
    try {
      setIsSaving(true);
      await createTask({
        titulo: project,
        etapa: newTaskStage,
        estado: "pendiente",
        asignadoA: newTaskAssignedToIds,
        proyecto: project,
        nombreProyecto: project,
        prioridad: newTaskPriority,
        codigoProyecto: `OP-${Date.now()}`,
      });
      setAssignError("");
      setIsAssignModalOpen(false);
      setNewTaskProject("");
      setNewTaskStage("citas");
      setNewTaskPriority("media");
      setNewTaskAssignedToIds([]);
    } catch (error) {
      setAssignError(error instanceof Error ? error.message : "Error al asignar");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTaskAction = async (task: AdminWorkflowTask, action: string) => {
    const hasAssignedPeople = (task.assignedToIds?.length ?? 0) > 0;

    try {
      setIsSaving(true);
      setActionFeedback(null);

      if (action === "start-cita") {
        if (!hasAssignedPeople) {
          showActionFeedback("No puedes iniciar la cita sin asignar al menos una persona responsable.", "warning");
          return;
        }
        await updateTask(task, { citaStarted: true, status: "pendiente" });
        showActionFeedback("Cita iniciada. Abriendo cotizador preliminar...", "success");
        window.setTimeout(() => {
          runtimeStore.setItem(activeCitaTaskStorageKey, task.id);
          runtimeStore.setItem(activeCitaTaskSnapshotStorageKey, JSON.stringify(task));
          runtimeStore.setItem(citaReturnUrlStorageKey, window.location.pathname);
          router.push("/dashboard/cotizador-preliminar");
        }, 220);
        return;
      }

      if (action === "finish-cita") {
        await updateTask(task, {
          citaFinished: true,
          citaStarted: false,
          stage: "disenos",
          status: "pendiente",
          priority: "alta",
        });
        showActionFeedback("Cita completada. Tarjeta movida a Diseños.", "success");
        return;
      }

      if (action === "approve-design-admin") {
        const nowIso = new Date().toISOString();
        await updateTask(task, {
          designApprovedByAdmin: true,
          status: "pendiente",
          visita: {
            ...(task.visita ?? {}),
            aprobadaPorAdmin: true,
            actualizadaEn: nowIso,
          },
        });
        setVisitModalTaskId(task.id);
        showActionFeedback("Diseño aprobado por admin. Ahora puedes agendar la visita.", "success");
        return;
      }

      if (action === "approve-design-client") {
        await updateTask(task, {
          designApprovedByClient: true,
          stage: "cotizacion",
          status: "pendiente",
          citaStarted: false,
          citaFinished: false,
        });
        showActionFeedback("Diseño aprobado por cliente. Se movió a cotización formal.", "success");
        return;
      }

      if (action === "start-cotizacion") {
        await updateTask(task, { citaStarted: true, citaFinished: false, status: "pendiente" });
        showActionFeedback("Cotización formal iniciada. Abriendo cotizador...", "success");
        window.setTimeout(() => {
          runtimeStore.setItem(activeCotizacionFormalTaskStorageKey, task.id);
          runtimeStore.setItem(citaReturnUrlStorageKey, window.location.pathname);
          router.push("/dashboard/cotizador");
        }, 220);
        return;
      }

      if (action === "resume-cotizacion") {
        showActionFeedback("Reanudando cotización formal...", "success");
        window.setTimeout(() => {
          runtimeStore.setItem(activeCotizacionFormalTaskStorageKey, task.id);
          runtimeStore.setItem(citaReturnUrlStorageKey, window.location.pathname);
          router.push("/dashboard/cotizador");
        }, 180);
        return;
      }

      if (action === "finish-cotizacion") {
        showActionFeedback("La cotización se termina dentro del cotizador con el botón Terminar.", "info");
        window.setTimeout(() => {
          runtimeStore.setItem(activeCotizacionFormalTaskStorageKey, task.id);
          runtimeStore.setItem(citaReturnUrlStorageKey, window.location.pathname);
          router.push("/dashboard/cotizador");
        }, 180);
        return;
      }

      if (action === "pass-to-seguimiento") {
        await updateTask(task, {
          stage: "contrato",
          status: "pendiente",
          followUpStatus: "pendiente",
          followUpEnteredAt: Date.now(),
          citaStarted: false,
          citaFinished: false,
        });
        showActionFeedback("Proyecto movido a seguimiento.", "success");
        return;
      }

      if (action === "confirm-client") {
        setConfirmClientModalTaskId(task.id);
        return;
      }

      if (action === "discard-client") {
        await updateTask(task, { followUpStatus: "inactivo", status: "completada" });
        const reloaded = await refresh();
        const updated = reloaded.find((item) => item.id === task.id);
        if (updated?.followUpStatus !== "inactivo") {
          showActionFeedback("El backend no guardó 'inactivo'. Revisa el contrato del endpoint PATCH /api/tareas/:id.", "warning");
        } else {
          showActionFeedback("Proyecto marcado como inactivo correctamente.", "success");
        }
        return;
      }

      if (action === "reactivate-client") {
        await updateTask(task, {
          followUpStatus: "pendiente",
          status: "pendiente",
          followUpEnteredAt: Date.now(),
        });
        showActionFeedback("Seguimiento reactivado.", "success");
        return;
      }
    } catch (error) {
      console.error("Error de acción de tarjeta:", error);
      showActionFeedback(error instanceof Error ? error.message : "No se pudo completar la acción.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDrop = async (stage: TaskStage) => {
    if (!draggedTaskId) return;
    const task = tasks.find((t) => t.id === draggedTaskId);
    setDraggedTaskId(null);
    if (!task || task.stage === stage) return;

    try {
      setIsSaving(true);
      await moveTask(task, stage);
      showActionFeedback("Tarjeta movida correctamente.", "success");
    } catch (error) {
      console.error("Error al mover tarea:", error);
      showActionFeedback(error instanceof Error ? error.message : "No se pudo mover la tarjeta.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDesignUpload = async (task: AdminWorkflowTask, file: File) => {
    try {
      setUploadingTaskId(task.id);
      setIsSaving(true);

      if (task.backendSource !== "tarea") {
        throw new Error("No se encontro tarea backend valida para este diseño. No se puede subir sin tareasId real.");
      }

      const backendTaskId = task.sourceId?.trim() || task.id;
      const uploadInfo = await subirArchivoConMetadata(file, {
        tipo: "diseno_final",
        relacionadoA: "tarea",
        relacionadoId: backendTaskId,
        clienteId: task.clientId,
        tareasId: backendTaskId,
      });

      try {
        const response = await agregarArchivos(backendTaskId, [
          {
            nombre: file.name,
            tipo: "diseno_final",
            url: uploadInfo.url,
          },
        ]);

        if (!response.success) {
          throw new Error(response.message || "No se pudo adjuntar el diseño final");
        }
      } catch (syncError) {
        console.warn("[admin/operaciones] fallback agregarArchivos omitido en diseño final:", syncError);
      }

      // Actualizar la tarea para pasar a cotizacion
      await updateTask(task, {
        designApprovedByClient: true,
        stage: "cotizacion",
        status: "pendiente",
        citaStarted: false,
        citaFinished: false,
        visita: {
          ...(task.visita ?? {}),
          aprobadaPorCliente: true,
          actualizadaEn: new Date().toISOString(),
        },
      });

      await refresh();
      setFinalDesignUploadTaskId(null);
      showActionFeedback("Diseño final cargado. Tarjeta movida a cotización formal.", "success");
    } catch (error) {
      console.error("Error subiendo diseño final:", error);
      throw error;
    } finally {
      setIsSaving(false);
      setUploadingTaskId(null);
      setPendingUploadTaskId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {actionFeedback ? (
          <motion.div
            key={actionFeedback.message}
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="fixed left-4 right-4 top-4 z-50 mx-auto w-[min(92vw,42rem)]"
          >
            <div
              className={`overflow-hidden rounded-2xl border px-4 py-2 shadow-md ${
                actionFeedback.tone === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : actionFeedback.tone === "warning"
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : actionFeedback.tone === "error"
                      ? "border-rose-200 bg-rose-50 text-rose-900"
                      : "border-sky-200 bg-sky-50 text-sky-900"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl ${
                    actionFeedback.tone === "success"
                      ? "bg-emerald-100 text-emerald-700"
                      : actionFeedback.tone === "warning"
                        ? "bg-amber-100 text-amber-700"
                        : actionFeedback.tone === "error"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-sky-100 text-sky-700"
                  }`}
                >
                  {actionFeedback.tone === "success" ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <AlertCircle className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-5">{actionFeedback.message}</p>
                  <p className="mt-1 text-xs opacity-80">
                    {actionFeedback.tone === "success"
                      ? "La acción se aplicó y el tablero se actualizará automáticamente."
                      : actionFeedback.tone === "warning"
                        ? "Corrige la condición indicada y vuelve a intentarlo."
                        : actionFeedback.tone === "error"
                          ? "Revisa el detalle del error o prueba nuevamente."
                          : "Estado informativo."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActionFeedback(null)}
                  className="rounded-full px-2 py-1 text-xs font-semibold opacity-70 transition hover:opacity-100"
                  aria-label="Cerrar alerta"
                >
                  ✕
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <input
        ref={designUploadInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          const taskId = pendingUploadTaskId;
          event.currentTarget.value = "";
          if (!file || !taskId) return;
          const task = tasks.find((item) => item.id === taskId);
          if (!task) return;
          void handleDesignUpload(task, file);
        }}
      />

      <section className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.28)] backdrop-blur-md md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-secondary">Operaciones y taller</p>
            <h1 className="text-2xl font-semibold text-gray-900 md:text-[2rem]">Control de tareas y citas</h1>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-3 lg:justify-end">
          <select
            value={selectedEmployeeFilter}
            onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
            className="rounded-2xl border border-primary/10 bg-white px-4 py-2.5 text-sm font-medium text-secondary shadow-sm outline-none"
          >
            <option value="Todos">Ver todo</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.nombre}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={openTeamModal}
            className="flex items-center gap-2 rounded-2xl border border-primary/10 bg-white px-4 py-2.5 text-sm font-semibold text-secondary shadow-sm transition hover:bg-primary/5"
          >
            <UserPlus className="h-4 w-4" />
            Integrantes
          </button>
          <button
            type="button"
            onClick={openAssignModal}
            className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            Asignar pendiente
          </button>
          </div>
        </div>

      </section>

      {isLoading ? (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur-md"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando tablero...
        </motion.section>
      ) : (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid gap-4 xl:grid-cols-4"
        >
          {columns.map((column) => (
            <div
              key={column.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => void handleDrop(column.id)}
              className={`rounded-3xl border bg-white/80 p-4 shadow-lg backdrop-blur-md ${stageStyles[column.id].border}`}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">{column.label}</h2>
                  <p className="text-xs text-secondary">{column.tasks.length} elementos</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${stageStyles[column.id].badge}`}>
                  {column.id}
                </span>
              </div>

              <div className="space-y-3">
                {column.tasks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-primary/10 bg-white/50 px-4 py-6 text-center text-xs text-secondary">
                    Sin tareas en esta etapa.
                  </div>
                ) : (
                  column.tasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => setDraggedTaskId(task.id)}
                      onClick={() => openTaskModal(task.id)}
                      className={`flex min-h-[220px] flex-col rounded-2xl border border-primary/10 bg-white px-4 py-4 text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${stageStyles[task.stage].border ? `border-l-4 ${stageStyles[task.stage].border}` : ""}`}
                    >
                      {/** Contador de seguimiento: a los 3 dias muestra aviso de contacto. */}
                      {(() => {
                        const followUpDays = getFollowUpDays(task.followUpEnteredAt, task.createdAt, clockNow);
                        const remainingDays = Math.max(0, FOLLOW_UP_WARNING_DAYS - followUpDays);
                        const isFollowUpWarning =
                          task.stage === "contrato" &&
                          task.followUpStatus === "pendiente" &&
                          followUpDays >= FOLLOW_UP_WARNING_DAYS;

                        return (
                      <div className="flex flex-wrap items-center gap-2">
                        {task.stage === "contrato" && task.followUpStatus === "pendiente" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700">
                            <Clock className="h-3 w-3" />
                            {isFollowUpWarning
                              ? `Dar seguimiento (${followUpDays} dia${followUpDays === 1 ? "" : "s"})`
                              : `Seguimiento en ${remainingDays} dia${remainingDays === 1 ? "" : "s"}`}
                          </span>
                        ) : (
                          <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${statusStyles[task.status]}`}>
                            {task.status === "completada" ? "Completada" : "Pendiente"}
                          </span>
                        )}
                        {task.stage === "contrato" && task.followUpStatus === "confirmado" ? (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                            Cliente confirmado
                          </span>
                        ) : null}
                        {task.stage === "contrato" && task.followUpStatus === "inactivo" ? (
                          <span className="inline-flex rounded-full bg-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-700">
                            Proyecto inactivo
                          </span>
                        ) : null}
                        {task.stage !== "contrato" ? (
                          <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${priorityStyles[task.priority ?? "media"]}`}>
                            {(task.priority ?? "media").charAt(0).toUpperCase() + (task.priority ?? "media").slice(1)}
                          </span>
                        ) : null}
                      </div>
                        );
                      })()}

                      <div className="mt-3 flex flex-1 flex-col">
                        <div className="space-y-1.5">
                          <p className="line-clamp-2 break-words text-base font-semibold leading-6 text-gray-900" title={task.project}>
                            {task.project}
                          </p>
                          {task.stage === "disenos" || task.stage === "cotizacion" ? (
                            <p className="mt-1 line-clamp-1 break-words text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8B1C1C]">
                              Codigo: {buildTrackingCodeFromTask(task)}
                            </p>
                          ) : null}
                          {task.location || task.mapsUrl ? (
                            <p className="mt-1 line-clamp-1 break-words text-xs leading-4 text-secondary">
                              {task.location}
                              {task.mapsUrl ? (
                                <>
                                  {task.location ? " · " : ""}
                                  <a href={task.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">Ver en Maps</a>
                                </>
                              ) : null}
                            </p>
                          ) : null}
                          {task.title && task.title !== task.project ? (
                            <p className="mt-1 line-clamp-1 break-words text-xs leading-4 text-secondary" title={task.title}>
                              {task.title}
                            </p>
                          ) : null}
                          {task.assignedTo.length > 0 ? (
                            <p className="line-clamp-1 break-words text-xs leading-4 text-secondary" title={task.assignedTo.join(", ")}>
                              Responsable: {task.assignedTo.join(", ")}
                            </p>
                          ) : null}
                        </div>

                        <div className="mt-3 min-h-[1.75rem]">
                          <div className="flex flex-wrap gap-2">
                            {task.stage === "citas" && task.status === "pendiente" && !task.citaStarted ? (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleTaskAction(task, "start-cita");
                                }}
                                className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-white"
                                disabled={isSaving || (task.assignedTo?.length ?? 0) === 0}
                                title={(task.assignedTo?.length ?? 0) === 0 ? "Asigna al menos una persona para iniciar la cita" : undefined}
                              >
                                {(task.assignedTo?.length ?? 0) === 0 ? "Asigna responsable" : "Iniciar cita"}
                              </button>
                            ) : null}
                            {task.stage === "citas" && task.citaStarted && !task.citaFinished ? (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleTaskAction(task, "finish-cita");
                                }}
                                className="inline-flex items-center rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white"
                                disabled={isSaving}
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

                            {task.stage === "disenos" ? (
                              (task.files?.length ?? 0) === 0 ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    requestDesignUpload(task.id);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-700"
                                  disabled={isSaving || uploadingTaskId === task.id}
                                >
                                  <Upload className="h-3.5 w-3.5" />
                                  {uploadingTaskId === task.id ? "Subiendo..." : "Subir diseño"}
                                </button>
                              ) : !(task.designApprovedByAdmin ?? task.visita?.aprobadaPorAdmin ?? false) ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void handleTaskAction(task, "approve-design-admin");
                                  }}
                                  className="inline-flex items-center rounded-full bg-violet-600 px-3 py-1 text-[11px] font-semibold text-white"
                                  disabled={isSaving}
                                >
                                  Aprobar admin
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Aprobado
                                </span>
                              )
                            ) : null}
                            {task.stage === "disenos" && (task.designApprovedByAdmin ?? task.visita?.aprobadaPorAdmin ?? false) && !(task.designApprovedByClient ?? task.visita?.aprobadaPorCliente ?? false) ? (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setFinalDesignUploadTaskId(task.id);
                                }}
                                className="inline-flex items-center rounded-full bg-violet-700 px-3 py-1 text-[11px] font-semibold text-white"
                                disabled={isSaving}
                              >
                                Aprobar cliente
                              </button>
                            ) : null}

                            {task.stage === "cotizacion" && !task.citaStarted ? (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleTaskAction(task, "start-cotizacion");
                                }}
                                className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-white"
                                disabled={isSaving}
                              >
                                Iniciar cotizacion
                              </button>
                            ) : null}
                            {task.stage === "cotizacion" && task.citaStarted && !task.citaFinished ? (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleTaskAction(task, "resume-cotizacion");
                                }}
                                className="inline-flex items-center rounded-full bg-amber-600 px-3 py-1 text-[11px] font-semibold text-white"
                                disabled={isSaving}
                              >
                                Continuar cotizacion
                              </button>
                            ) : null}
                            {task.stage === "cotizacion" && task.citaStarted && task.citaFinished ? (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setCotizacionEntregadaTaskId(task.id);
                                }}
                                className="inline-flex items-center rounded-full bg-emerald-700 px-3 py-1 text-[11px] font-semibold text-white"
                                disabled={isSaving || !task.citaFinished || getCotizacionesFormalesList(task).length === 0}
                                title={
                                  !task.citaFinished
                                    ? "La cita debe estar completada para pasar a seguimiento"
                                    : getCotizacionesFormalesList(task).length === 0
                                      ? "Debes generar una cotización formal antes de pasar a seguimiento"
                                      : undefined
                                }
                              >
                                Cotización entregada
                              </button>
                            ) : null}

                            {task.stage === "contrato" ? (
                              <div className="grid w-full grid-cols-1 gap-2">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void handleTaskAction(task, "confirm-client");
                                  }}
                                  className="w-full rounded-2xl bg-emerald-600 px-3 py-2 text-[11px] font-semibold text-white"
                                  disabled={isSaving}
                                >
                                  Confirmar cliente
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void handleTaskAction(task, "discard-client");
                                  }}
                                  className="w-full rounded-2xl bg-rose-600 px-3 py-2 text-[11px] font-semibold text-white"
                                  disabled={isSaving}
                                >
                                  Marcar inactivo
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void handleTaskAction(task, "reactivate-client");
                                  }}
                                  className="w-full rounded-2xl border border-amber-300 bg-white px-3 py-2 text-[11px] font-semibold text-amber-800"
                                  disabled={isSaving}
                                >
                                  Reactivar seguimiento
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {task.location ? (
                        <div className="mt-3 flex items-center gap-1.5 rounded-2xl bg-slate-50 px-3 py-2 text-[11px] text-secondary">
                          <MapPin className="h-3 w-3" />
                          <span>{task.location}</span>
                        </div>
                      ) : null}
                      {task.dueDate ? (
                        <div className="mt-3 flex items-center gap-1.5 rounded-2xl bg-slate-50 px-3 py-2 text-[11px] text-secondary">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(task.dueDate)}</span>
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </motion.section>
      )}

      <AnimatePresence>
        {actionFeedback ? (
          <motion.div
            key={actionFeedback.message}
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="fixed left-4 right-4 top-4 z-50 mx-auto w-[min(92vw,42rem)]"
          >
            <div
              className={`overflow-hidden rounded-3xl border px-4 py-3 shadow-2xl backdrop-blur-md ${
                actionFeedback.tone === "success"
                  ? "border-emerald-200 bg-emerald-50/95 text-emerald-900"
                  : actionFeedback.tone === "warning"
                    ? "border-amber-200 bg-amber-50/95 text-amber-900"
                    : actionFeedback.tone === "error"
                      ? "border-rose-200 bg-rose-50/95 text-rose-900"
                      : "border-sky-200 bg-sky-50/95 text-sky-900"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl ${
                    actionFeedback.tone === "success"
                      ? "bg-emerald-100 text-emerald-700"
                      : actionFeedback.tone === "warning"
                        ? "bg-amber-100 text-amber-700"
                        : actionFeedback.tone === "error"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-sky-100 text-sky-700"
                  }`}
                >
                  {actionFeedback.tone === "success" ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <AlertCircle className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-5">{actionFeedback.message}</p>
                  <p className="mt-1 text-xs opacity-80">
                    {actionFeedback.tone === "success"
                      ? "La acción se aplicó y el tablero se actualizará automáticamente."
                      : actionFeedback.tone === "warning"
                        ? "Corrige la condición indicada y vuelve a intentarlo."
                        : actionFeedback.tone === "error"
                          ? "Revisa el detalle del error o prueba nuevamente."
                          : "Estado informativo."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActionFeedback(null)}
                  className="rounded-full px-2 py-1 text-xs font-semibold opacity-70 transition hover:opacity-100"
                  aria-label="Cerrar alerta"
                >
                  ✕
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur-md">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Calculator className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">Cotizacion</p>
              <h3 className="mt-1 text-xl font-semibold">Cotizador Pro</h3>
              <p className="mt-2 text-sm text-secondary">
                Genera estimaciones detalladas con desglose tecnico completo para el taller.
              </p>
              <button
                type="button"
                onClick={() => router.push("/dashboard/cotizador")}
                className="mt-4 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              >
                Abrir Cotizador Pro
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur-md">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
              <FileText className="h-6 w-6 text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">Cotizacion</p>
              <h3 className="mt-1 text-xl font-semibold">Cotizador Preliminar</h3>
              <p className="mt-2 text-sm text-secondary">
                Crea una estimacion rapida para prospectos antes de formalizar el proyecto.
              </p>
              <button
                type="button"
                onClick={() => router.push("/dashboard/cotizador-preliminar")}
                className="mt-4 rounded-2xl border border-primary/20 bg-white px-5 py-2.5 text-sm font-semibold text-primary shadow-sm transition hover:border-primary/40"
              >
                Abrir Preliminar
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur-md">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Calculator className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">Configuracion</p>
              <h3 className="mt-1 text-xl font-semibold">Precios y Catalogo</h3>
              <p className="mt-2 text-sm text-secondary">
                Ajusta escenarios, IVA, margen, factor y extras para el levantamiento detallado.
              </p>
              <button
                type="button"
                onClick={() => router.push("/admin/precios")}
                className="mt-4 rounded-2xl border border-primary/20 bg-white px-5 py-2.5 text-sm font-semibold text-primary shadow-sm transition hover:border-primary/40"
              >
                Abrir Precios y Catalogo
              </button>
            </div>
          </div>
        </div>
      </div>

      <VisitScheduleModal
        isOpen={Boolean(visitModalTask)}
        taskLabel={visitModalTask?.project ?? "Proyecto"}
        initialIso={visitModalTask?.visitScheduledAt}
        occupiedSlots={occupiedVisitSlots}
        isSaving={isSaving}
        onClose={() => setVisitModalTaskId(null)}
        onConfirm={async (isoDateTime) => {
          if (!visitModalTask) return;
          await handleSaveVisitForTask(visitModalTask, isoDateTime);
        }}
      />

      <FinalDesignUploadModal
        isOpen={Boolean(finalDesignUploadTaskId)}
        taskLabel={finalDesignUploadTask?.project ?? "Proyecto"}
        isSaving={isSaving}
        onClose={() => setFinalDesignUploadTaskId(null)}
        onConfirm={async (file) => {
          if (!finalDesignUploadTask) return;
          await handleFinalDesignUpload(finalDesignUploadTask, file);
        }}
      />

      <ConfirmClientAmountModal
        isOpen={Boolean(confirmClientModalTask)}
        taskLabel={confirmClientModalTask?.project ?? "Proyecto"}
        initialAmount={confirmClientModalTask ? resolveInitialProjectTotal(confirmClientModalTask) : undefined}
        isSaving={isSaving}
        onClose={() => setConfirmClientModalTaskId(null)}
        onConfirm={async (amount) => {
          if (!confirmClientModalTask) return;
          await handleConfirmClientWithTotal(confirmClientModalTask, amount);
        }}
      />

      {cotizacionEntregadaTask ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={() => setCotizacionEntregadaTaskId(null)}>
          <div
            className="w-full max-w-md rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">Confirmación</p>
            <h3 className="mt-2 text-xl font-semibold text-gray-900">¿Cotización entregada?</h3>
            <p className="mt-2 text-sm text-secondary">
              Confirma que el cliente ya recibió su cotización formal para mover el proyecto a seguimiento.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCotizacionEntregadaTaskId(null)}
                className="rounded-2xl border border-primary/10 bg-white px-5 py-2 text-xs font-semibold text-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleTaskAction(cotizacionEntregadaTask, "pass-to-seguimiento");
                  setCotizacionEntregadaTaskId(null);
                }}
                disabled={isSaving}
                className="rounded-2xl bg-emerald-700 px-5 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                Confirmar y mover
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isAssignModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setIsAssignModalOpen(false)}>
          <div
            ref={assignModalRef}
            tabIndex={-1}
            className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl border border-white/70 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-primary/5 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Asignar pendiente</h3>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="rounded-full border border-primary/10 px-3 py-1 text-xs font-semibold text-secondary"
              >
                Cerrar
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                  Proyecto / Cliente
                  <input
                    value={newTaskProject}
                    onChange={(e) => setNewTaskProject(e.target.value)}
                    placeholder="Ej. Residencial Vega"
                    className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                  />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                  Etapa inicial
                  <select
                    value={newTaskStage}
                    onChange={(e) => setNewTaskStage(e.target.value as TaskStage)}
                    className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                  >
                    {kanbanColumns.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                  Prioridad
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                    className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                  >
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                </label>

                <div className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                  Responsables (uno o mas)
                  <div className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-2xl border border-primary/10 bg-white p-3">
                    {employees.length === 0 ? (
                      <p className="text-[11px] normal-case tracking-normal text-secondary">Sin empleados disponibles.</p>
                    ) : (
                      employees.map((employee) => {
                        const checked = newTaskAssignedToIds.includes(employee._id);
                        return (
                          <label key={employee._id} className="flex items-center gap-2 text-xs font-medium normal-case tracking-normal text-gray-800">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setNewTaskAssignedToIds((prev) =>
                                  checked ? prev.filter((id) => id !== employee._id) : [...prev, employee._id],
                                )
                              }
                              className="h-4 w-4 accent-primary"
                            />
                            <span>{employee.nombre}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
              {assignError ? (
                <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">{assignError}</p>
              ) : null}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="rounded-2xl border border-primary/10 bg-white px-5 py-2 text-xs font-semibold text-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAssignPending}
                  disabled={isSaving}
                  className="rounded-2xl bg-primary px-5 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {isSaving ? "Guardando..." : "Guardar pendiente"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isTeamModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setIsTeamModalOpen(false)}>
          <div
            ref={teamModalRef}
            tabIndex={-1}
            className="w-full max-w-2xl rounded-3xl border border-white/70 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Integrantes del equipo</h3>
              <button
                type="button"
                onClick={() => setIsTeamModalOpen(false)}
                className="rounded-full border border-primary/10 px-3 py-1 text-xs font-semibold text-secondary"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-4 text-sm text-gray-600">Equipo disponible de {employees.length} integrantes:</p>
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {employees.length > 0 ? (
                    employees.map((emp) => (
                      <div
                        key={emp._id}
                        className="flex items-center justify-between rounded-2xl border border-primary/10 bg-white/50 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{emp.nombre}</p>
                          <p className="text-xs text-secondary">{emp.correo}</p>
                        </div>
                        <span className="text-[11px] font-semibold text-primary uppercase tracking-wide">
                          {emp.rol}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-secondary py-4 text-center">
                      Sin integrantes cargados
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-primary/10 bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Agregar integrante</p>
                <div className="mt-3 space-y-3">
                  <label className="block text-xs font-semibold text-secondary">
                    Nombre
                    <input
                      value={newMemberName}
                      onChange={(event) => setNewMemberName(event.target.value)}
                      placeholder="Ej. Juan Perez"
                      className="mt-1.5 w-full rounded-2xl border border-primary/10 bg-white px-4 py-2.5 text-sm outline-none"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-secondary">
                    Correo
                    <input
                      type="email"
                      value={newMemberEmail}
                      onChange={(event) => setNewMemberEmail(event.target.value)}
                      placeholder="correo@empresa.com"
                      className="mt-1.5 w-full rounded-2xl border border-primary/10 bg-white px-4 py-2.5 text-sm outline-none"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-secondary">
                    Rol
                    <select
                      value={newMemberRole}
                      onChange={(event) => setNewMemberRole(event.target.value as Usuario["rol"])}
                      className="mt-1.5 w-full rounded-2xl border border-primary/10 bg-white px-4 py-2.5 text-sm outline-none"
                    >
                      <option value="empleado">Empleado</option>
                      <option value="arquitecto">Arquitecto</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-secondary">
                    Password (opcional)
                    <input
                      type="password"
                      value={newMemberPassword}
                      onChange={(event) => setNewMemberPassword(event.target.value)}
                      placeholder="Solo si backend lo requiere"
                      className="mt-1.5 w-full rounded-2xl border border-primary/10 bg-white px-4 py-2.5 text-sm outline-none"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => void handleAddMember()}
                    disabled={isSaving}
                    className="w-full rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {isSaving ? "Agregando..." : "Agregar integrante"}
                  </button>
                </div>
              </div>
            </div>
            {teamError ? (
              <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">{teamError}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <AnimatePresence>
        {isTaskModalOpen && activeTask ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={() => setIsTaskModalOpen(false)}
          >
            <motion.aside
              ref={taskModalRef}
              tabIndex={-1}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className="absolute right-0 top-0 flex h-full w-full max-w-lg flex-col rounded-l-3xl border border-white/40 bg-white/95 shadow-2xl backdrop-blur-md"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-primary/10 px-6 py-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary">Detalle de tarea</p>
                  <h3 className="mt-1 text-xl font-semibold text-gray-900">{activeTask.project}</h3>
                  {activeTask.stage === "disenos" ? (
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8B1C1C]">
                      Codigo de seguimiento: {buildTrackingCodeFromTask(activeTask)}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-sm text-secondary">{activeTask.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="shrink-0 rounded-full border border-primary/10 px-3 py-2 text-xs font-semibold text-secondary transition hover:bg-primary/5"
                >
                  Cerrar
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Configuracion</p>
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary">
                        Etapa
                        <select
                          value={taskDraft.stage}
                          onChange={(event) =>
                            setTaskDraft((prev) => ({
                              ...prev,
                              stage: event.target.value as TaskStage,
                            }))
                          }
                          className="mt-1.5 w-full rounded-2xl border border-primary/10 bg-white px-3 py-2.5 text-xs outline-none"
                        >
                          {kanbanColumns.map((column) => (
                            <option key={column.id} value={column.id}>
                              {column.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary">
                        Estado
                        <select
                          value={taskDraft.status}
                          onChange={(event) =>
                            setTaskDraft((prev) => ({
                              ...prev,
                              status: event.target.value as TaskStatus,
                            }))
                          }
                          className="mt-1.5 w-full rounded-2xl border border-primary/10 bg-white px-3 py-2.5 text-xs outline-none"
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="completada">Completada</option>
                        </select>
                      </label>
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary">
                        Prioridad
                        <select
                          value={taskDraft.priority}
                          onChange={(event) =>
                            setTaskDraft((prev) => ({
                              ...prev,
                              priority: event.target.value as TaskPriority,
                            }))
                          }
                          className="mt-1.5 w-full rounded-2xl border border-primary/10 bg-white px-3 py-2.5 text-xs outline-none"
                        >
                          <option value="alta">Alta</option>
                          <option value="media">Media</option>
                          <option value="baja">Baja</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Responsables</p>
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                        {taskDraft.assignedToIds.length} seleccionado{taskDraft.assignedToIds.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="mt-3 rounded-2xl border border-primary/10 bg-white p-3">
                      {taskDraft.assignedToIds.length === 0 ? (
                        <p className="text-xs text-secondary">Sin asignar</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {taskDraft.assignedToIds.map((employeeId) => {
                            const employeeName =
                              employees.find((emp) => emp._id === employeeId)?.nombre ||
                              activeTask?.assignedTo?.[taskDraft.assignedToIds.indexOf(employeeId)] ||
                              activeTask?.assignedTo?.find((name) => !/^[a-f0-9]{24}$/i.test(name)) ||
                              "Responsable";
                            return (
                              <span key={employeeId} className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1.5 text-sm text-gray-800">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-primary shadow-sm">
                                  {getInitials(employeeName)}
                                </span>
                                <span className="max-w-[10rem] truncate">{employeeName}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setTaskDraft((prev) => ({
                                      ...prev,
                                      assignedToIds: prev.assignedToIds.filter((id) => id !== employeeId),
                                    }))
                                  }
                                  className="rounded-full px-1.5 text-[11px] font-semibold text-secondary transition hover:bg-rose-100 hover:text-rose-700"
                                  aria-label={`Quitar a ${employeeName}`}
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 max-h-48 space-y-2 overflow-y-auto rounded-2xl border border-primary/10 bg-gradient-to-b from-white to-slate-50 p-2.5">
                      {employees.length === 0 ? (
                        <p className="px-2 py-3 text-xs text-secondary">No hay integrantes disponibles.</p>
                      ) : (
                        employees.map((employee) => {
                          const checked = taskDraft.assignedToIds.includes(employee._id);
                          return (
                            <button
                              key={employee._id}
                              type="button"
                              onClick={() =>
                                setTaskDraft((prev) => ({
                                  ...prev,
                                  assignedToIds: checked
                                    ? prev.assignedToIds.filter((id) => id !== employee._id)
                                    : [...prev.assignedToIds, employee._id],
                                }))
                              }
                              className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                                checked
                                  ? "border-primary/30 bg-primary/10"
                                  : "border-primary/10 bg-white hover:border-primary/20 hover:bg-primary/[0.03]"
                              }`}
                            >
                              <span className="flex min-w-0 items-center gap-2.5">
                                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-semibold ${checked ? "bg-primary text-white" : "bg-primary/10 text-primary"}`}>
                                  {getInitials(employee.nombre)}
                                </span>
                                <span className="min-w-0">
                                  <span className="block truncate text-xs font-semibold text-gray-900">{employee.nombre}</span>
                                  <span className="block truncate text-[11px] text-secondary">{employee.correo ?? "Sin correo"}</span>
                                </span>
                              </span>
                              <span className={`ml-3 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${checked ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                                {checked ? "Activo" : "Agregar"}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {activeTask.stage === "citas" && activeTask.status === "pendiente" ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Flujo de cita</p>
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
                            onClick={() => void handleTaskAction(activeTask, "start-cita")}
                            className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
                            disabled={isSaving || (activeTask.assignedToIds?.length ?? 0) === 0}
                          >
                            {(activeTask.assignedToIds?.length ?? 0) === 0 ? "Asigna responsable" : "Iniciar cita"}
                          </button>
                        ) : !activeTask.citaFinished ? (
                          <button
                            type="button"
                            onClick={() => void handleTaskAction(activeTask, "finish-cita")}
                            className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
                            disabled={isSaving}
                          >
                            Terminar cita
                          </button>
                        ) : (
                          <span className="text-sm font-medium text-emerald-600">Cita completada</span>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {activeTask.stage === "cotizacion" ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Flujo de cotizacion formal</p>
                      <div className="mt-3 space-y-2">
                        <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${activeTask.citaStarted ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                          {activeTask.citaStarted ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-4 w-4 rounded-full border-2 border-gray-300" />}
                          <span>1. Iniciar cotizacion</span>
                        </div>
                        <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${activeTask.citaFinished ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                          {activeTask.citaFinished ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-4 w-4 rounded-full border-2 border-gray-300" />}
                          <span>2. Terminar dentro del cotizador</span>
                        </div>
                        <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${getCotizacionesFormalesList(activeTask).length > 0 ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                          {getCotizacionesFormalesList(activeTask).length > 0 ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-4 w-4 rounded-full border-2 border-gray-300" />}
                          <span>3. Cotizacion formal lista para entregar</span>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {!activeTask.citaStarted ? (
                          <button
                            type="button"
                            onClick={() => void handleTaskAction(activeTask, "start-cotizacion")}
                            className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
                            disabled={isSaving}
                          >
                            Iniciar cotizacion
                          </button>
                        ) : activeTask.citaStarted && !activeTask.citaFinished ? (
                          <button
                            type="button"
                            onClick={() => void handleTaskAction(activeTask, "resume-cotizacion")}
                            className="rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white"
                            disabled={isSaving}
                          >
                            Continuar cotizacion
                          </button>
                        ) : getCotizacionesFormalesList(activeTask).length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setCotizacionEntregadaTaskId(activeTask.id)}
                            className="min-h-[36px] rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold leading-tight text-white"
                            disabled={isSaving}
                          >
                            Cotizacion entregada
                          </button>
                        ) : (
                          <p className="text-xs text-secondary">Genera y guarda la cotizacion formal en el cotizador; luego podras marcarla como entregada.</p>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {activeTask.stage === "disenos" ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Flujo de diseño</p>
                      <div className="mt-3 space-y-2">
                        <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${(activeTask.files?.length ?? 0) > 0 ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                          {(activeTask.files?.length ?? 0) > 0 ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-4 w-4 rounded-full border-2 border-gray-300" />}
                          <span>1. Subir archivo</span>
                        </div>
                        <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${(activeTask.designApprovedByAdmin ?? activeTask.visita?.aprobadaPorAdmin ?? false) ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                          {(activeTask.designApprovedByAdmin ?? activeTask.visita?.aprobadaPorAdmin ?? false) ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-4 w-4 rounded-full border-2 border-gray-300" />}
                          <span>2. Aprobación del admin</span>
                        </div>
                        <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${(activeTask.designApprovedByClient ?? activeTask.visita?.aprobadaPorCliente ?? false) ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                          {(activeTask.designApprovedByClient ?? activeTask.visita?.aprobadaPorCliente ?? false) ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-4 w-4 rounded-full border-2 border-gray-300" />}
                          <span>3. Cliente acepta</span>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(activeTask.files?.length ?? 0) === 0 ? (
                          <button
                            type="button"
                            onClick={() => requestDesignUpload(activeTask.id)}
                            className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
                            disabled={isSaving || uploadingTaskId === activeTask.id}
                          >
                            {(uploadingTaskId === activeTask.id) ? "Subiendo..." : "Subir archivo"}
                          </button>
                        ) : !(activeTask.designApprovedByAdmin ?? activeTask.visita?.aprobadaPorAdmin ?? false) ? (
                          <button
                            type="button"
                            onClick={() => void handleTaskAction(activeTask, "approve-design-admin")}
                            className="rounded-full bg-violet-600 px-4 py-2 text-xs font-semibold text-white"
                            disabled={isSaving}
                          >
                            Aprobar admin
                          </button>
                        ) : !(activeTask.designApprovedByClient ?? activeTask.visita?.aprobadaPorCliente ?? false) ? (
                          <button
                            type="button"
                            onClick={() => setFinalDesignUploadTaskId(activeTask.id)}
                            className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
                            disabled={isSaving}
                          >
                            Cliente aceptó
                          </button>
                        ) : (
                          <span className="text-sm font-medium text-emerald-600">Diseño aprobado</span>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {activeTask.stage === "contrato" && activeTask.followUpStatus === "pendiente" ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Alertas de seguimiento</p>
                      {(() => {
                        const alertLevel = getFollowUpAlertLevel(activeTask.followUpEnteredAt, activeTask.createdAt, clockNow);
                        const days = getFollowUpDays(activeTask.followUpEnteredAt, activeTask.createdAt, clockNow);

                        if (alertLevel === "urgent" || alertLevel === "expired") {
                          return (
                            <div className="mt-3 rounded-2xl bg-rose-50 px-4 py-3">
                              <div className="flex items-center gap-2 text-rose-700">
                                <AlertTriangle className="h-5 w-5 animate-pulse" />
                                <span className="font-semibold">¡Contactar urgente!</span>
                              </div>
                              <p className="mt-1 text-xs text-rose-600">Han pasado {days} días. Contacta al cliente para saber si continúa con el proyecto.</p>
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
                              <p className="mt-1 text-xs text-amber-600">Han pasado {days} días. Es momento de contactar al cliente.</p>
                            </div>
                          );
                        }

                        return (
                          <div className="mt-3 rounded-2xl bg-sky-50 px-4 py-3">
                            <div className="flex items-center gap-2 text-sky-600">
                              <Clock className="h-5 w-5" />
                              <span className="font-semibold">En seguimiento</span>
                            </div>
                            <p className="mt-1 text-xs text-sky-500">{days > 0 ? `${days} día${days > 1 ? "s" : ""} en seguimiento.` : "Recién agregado."}</p>
                          </div>
                        );
                      })()}
                    </div>
                  ) : null}

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Estado del cliente</p>
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
                          onClick={() => void handleTaskAction(activeTask, "confirm-client")}
                          className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                          disabled={isSaving}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Confirmar cliente
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleTaskAction(activeTask, "discard-client")}
                          className="flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                          disabled={isSaving}
                        >
                          <XCircle className="h-4 w-4" />
                          Marcar inactivo
                        </button>
                      </div>
                    )}
                  </div>

                  {activeTask.stage === "disenos" || activeTask.stage === "contrato" ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Archivos</p>
                      <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/20 bg-white px-4 py-6 text-sm text-secondary transition hover:border-primary/40 hover:bg-primary/[0.03]">
                        <FileUp className="h-4 w-4" />
                        Subir PDF o renders
                        <input
                          type="file"
                          className="sr-only"
                          accept="image/*,.pdf"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.currentTarget.value = "";
                            if (!file) return;
                            void handleDesignUpload(activeTask, file);
                          }}
                        />
                      </label>
                      <div className="mt-4 space-y-2">
                        {(activeTask.files ?? []).length === 0 ? (
                          <div className="rounded-2xl border border-primary/10 bg-white px-4 py-3 text-xs text-secondary">Sin archivos cargados.</div>
                        ) : (
                          (activeTask.files ?? []).map((file) => (
                            <div key={file.id} className="flex items-center justify-between rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm">
                              <span className="truncate pr-3">{file.name}</span>
                              <span className="shrink-0 text-xs uppercase text-secondary">{file.type}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : null}

                  <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary">
                    Titulo
                    <input
                      value={taskDraft.title}
                      onChange={(event) => setTaskDraft((prev) => ({ ...prev, title: event.target.value }))}
                      className="mt-1.5 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                    />
                  </label>

                  <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary">
                    Proyecto / Cliente
                    <input
                      value={taskDraft.project}
                      onChange={(event) => setTaskDraft((prev) => ({ ...prev, project: event.target.value }))}
                      className="mt-1.5 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                    />
                  </label>

                  <div className="grid grid-cols-1 gap-3">
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary">
                      Fecha limite
                      <input
                        type="date"
                        value={taskDraft.dueDate}
                        onChange={(event) => setTaskDraft((prev) => ({ ...prev, dueDate: event.target.value }))}
                        className="mt-1.5 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                      />
                    </label>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary">
                      Direccion / Localidad
                      <input
                        value={taskDraft.location}
                        onChange={(event) => setTaskDraft((prev) => ({ ...prev, location: event.target.value }))}
                        className="mt-1.5 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                      />
                    </label>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary">
                      Enlace Google Maps
                      <input
                        type="url"
                        value={taskDraft.mapsUrl}
                        onChange={(event) => setTaskDraft((prev) => ({ ...prev, mapsUrl: event.target.value }))}
                        className="mt-1.5 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                      />
                    </label>
                  </div>

                  <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary">
                    Notas
                    <textarea
                      value={taskDraft.notes}
                      onChange={(event) => setTaskDraft((prev) => ({ ...prev, notes: event.target.value }))}
                      className="mt-1.5 min-h-[120px] w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                    />
                  </label>
                </div>
              </div>

              <div className="border-t border-primary/10 px-6 py-4">
                {taskModalError ? (
                  <p className="mb-3 rounded-2xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">{taskModalError}</p>
                ) : null}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTaskModalOpen(false)}
                    className="rounded-2xl border border-primary/10 bg-white px-4 py-2.5 text-xs font-semibold text-secondary transition hover:bg-primary/5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleAssignWorkers()}
                    disabled={isSaving}
                    className="flex items-center gap-2 rounded-2xl border border-primary/10 bg-white px-4 py-2.5 text-xs font-semibold text-secondary transition hover:bg-primary/5 disabled:opacity-50"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Asignar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSaveTask()}
                    disabled={isSaving}
                    className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    Guardar
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
