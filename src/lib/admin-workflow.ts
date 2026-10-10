import { authApi } from "@/lib/axios";
import {
  asignarIngenierosCita,
  finalizarCita,
  iniciarCita,
} from "@/lib/axios/citasApi";
import {
  obtenerKanbanCitas,
  obtenerKanbanContrato,
  obtenerKanbanCotizacion,
  obtenerKanbanDisenos,
  type KanbanItem,
} from "@/lib/axios/kanbanApi";
import { actualizarTarea, asignarTrabajadoresTarea, cambiarEtapa } from "@/lib/axios/tareasApi";
import { actualizarEstadoOperativoVisita, obtenerVisitas } from "@/lib/axios/visitasApi";
import {
  getTasksFromLocalStorage,
  mergeKanbanTaskLists,
  saveKanbanTasksToLocalStorage,
  type FollowUpStatus,
  type KanbanTask,
  type TaskFile,
  type TaskPriority,
  type TaskStage,
  type TaskStatus,
} from "@/lib/kanban";

const toRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;

const toStringValue = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toPhoneValue = (value: unknown): string | undefined =>
  typeof value === "number" && Number.isFinite(value) ? String(value) : toStringValue(value);

const toFeedbackString = (value: unknown): string | undefined => {
  if (value === null || value === "") return "";
  if (typeof value === "string") return value.trim();
  return undefined;
};

const toBooleanValue = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  return undefined;
};

const toTimestamp = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const toDueDateString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toISOString().slice(0, 16);
};

const toNumberValue = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

/** ISO de backend -> `YYYY-MM-DD` para inputs `type=date`. */
const toDateOnlyString = (value: unknown): string | undefined => {
  const raw = toStringValue(value);
  return raw && /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : undefined;
};

const normalizeStage = (value: unknown): TaskStage => {
  const normalized = toStringValue(value)?.toLowerCase();
  if (normalized === "citas") return "citas";
  if (normalized === "disenos" || normalized === "diseños") return "disenos";
  if (normalized === "cotizacion" || normalized === "cotización") return "cotizacion";
  if (normalized === "contrato" || normalized === "seguimiento") return "contrato";
  return "citas";
};

const normalizeStatus = (value: unknown): TaskStatus => {
  const normalized = toStringValue(value)?.toLowerCase();
  if (normalized === "completada" || normalized === "cancelada") return "completada";
  return "pendiente";
};

const normalizePriority = (value: unknown): TaskPriority => {
  const normalized = toStringValue(value)?.toLowerCase();
  if (normalized === "alta") return "alta";
  if (normalized === "baja") return "baja";
  return "media";
};

const normalizeFollowUpStatus = (value: unknown): FollowUpStatus => {
  const normalized = toStringValue(value)?.toLowerCase();
  if (normalized === "confirmado") return "confirmado";
  if (normalized === "descartado" || normalized === "inactivo") return "descartado";
  return "pendiente";
};

const inferFileType = (tipo: unknown, name?: unknown, url?: unknown): TaskFile["type"] => {
  const normalized = toStringValue(tipo)?.toLowerCase() ?? "";
  if (normalized.includes("pdf")) return "pdf";
  if (
    normalized.includes("diseno") ||
    normalized.includes("diseño") ||
    normalized.includes("render") ||
    normalized.includes("imagen") ||
    normalized.includes("image")
  ) {
    return "render";
  }
  const hints = [toStringValue(name), toStringValue(url)].filter(Boolean).join(" ");
  if (/\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(hints)) return "render";
  return "otro";
};

const getAssignedNames = (raw: Record<string, unknown>): string[] => {
  const direct = raw.assignedTo;
  if (Array.isArray(direct)) {
    const names = direct.map((value) => toStringValue(value)).filter((value): value is string => Boolean(value));
    if (names.length > 0) return names;
  }

  const legacy = raw.asignadoANombre;
  if (Array.isArray(legacy)) {
    const names = legacy.map((value) => toStringValue(value)).filter((value): value is string => Boolean(value));
    if (names.length > 0) return names;
  }

  const ingeniero = toRecord(raw.ingenieroAsignado);
  const nombreIngeniero = toStringValue(ingeniero?.nombre);
  if (nombreIngeniero) return [nombreIngeniero];

  return [];
};

const getAssignedIds = (raw: Record<string, unknown>): string[] => {
  const directIds = raw.assignedToIds;
  if (Array.isArray(directIds)) {
    const ids = directIds
      .map((value) => toStringValue(value))
      .filter((value): value is string => Boolean(value));
    if (ids.length > 0) return ids;
  }

  const legacyIds = raw.asignadoA;
  if (Array.isArray(legacyIds)) {
    const ids = legacyIds
      .map((value) => toStringValue(value))
      .filter((value): value is string => Boolean(value));
    if (ids.length > 0) return ids;
  }

  const singleLegacyId = toStringValue(raw.asignadoA);
  if (singleLegacyId) return [singleLegacyId];

  const ingeniero = toRecord(raw.ingenieroAsignado);
  const ingenieroId = toStringValue(ingeniero?._id);
  if (ingenieroId) return [ingenieroId];

  return [];
};

const mapKanbanItemToTask = (item: KanbanItem): KanbanTask => {
  const raw = (toRecord(item) ?? {}) as Record<string, unknown>;
  const cita = toRecord(raw.cita);
  const cliente = toRecord(raw.cliente) ?? toRecord(cita?.cliente);
  const rawEstado = toStringValue(raw.estado ?? item.estado)?.toLowerCase();
  let stage = normalizeStage(raw.etapa ?? item.etapa);
  const citaFinished = toBooleanValue(raw.citaFinished) ?? rawEstado === "completada";
  const citaStarted =
    toBooleanValue(raw.citaStarted) ?? (rawEstado === "en_proceso" || rawEstado === "completada");

  if (stage === "citas" && (citaFinished || rawEstado === "completada")) {
    stage = "disenos";
  }

  const assignedTo = getAssignedNames(raw);
  const clientName =
    toStringValue(cliente?.nombre) ??
    toStringValue(cita?.nombreCliente) ??
    toStringValue(raw.nombreProyecto) ??
    toStringValue(raw.proyecto) ??
    "Proyecto sin nombre";
  const notes =
    toStringValue(raw.notas) ??
    toStringValue(cita?.informacionAdicional) ??
    "";
  const clientEmail =
    toStringValue(cliente?.correo) ??
    toStringValue(cliente?.email) ??
    toStringValue(cita?.correoCliente) ??
    toStringValue(cita?.email) ??
    toStringValue(raw.correoCliente) ??
    toStringValue(raw.emailCliente) ??
    toStringValue(raw.clientEmail) ??
    toStringValue(raw.email);
  const clientPhone =
    toPhoneValue(cliente?.telefono) ??
    toPhoneValue(cliente?.phone) ??
    toPhoneValue(cita?.telefonoCliente) ??
    toPhoneValue(cita?.telefono) ??
    toPhoneValue(cita?.phone) ??
    toPhoneValue(raw.telefonoCliente) ??
    toPhoneValue(raw.telefono) ??
    toPhoneValue(raw.phoneCliente) ??
    toPhoneValue(raw.clientPhone) ??
    toPhoneValue(raw.phone);
  const scheduledAt =
    toStringValue(raw.fechaLimite) ??
    toStringValue(raw.scheduledAt) ??
    toStringValue(raw.visitScheduledAt) ??
    toStringValue(cita?.fechaAgendada);
  const filesRaw = Array.isArray(raw.archivos) ? raw.archivos : [];

  return {
    id: toStringValue(raw._id) ?? toStringValue(raw.id) ?? `${stage}-${clientName}`,
    sourceId: toStringValue(raw.sourceId) ?? toStringValue(raw._id) ?? toStringValue(raw.id),
    sourceType: toStringValue(raw.sourceType),
    title: clientName,
    stage,
    status: normalizeStatus(raw.estado ?? item.estado),
    assignedTo: assignedTo.length > 0 ? assignedTo : ["Sin asignar"],
    assignedToIds: getAssignedIds(raw),
    project: clientName,
    clientEmail,
    clientPhone,
    notes,
    files: filesRaw
      .map((value) => toRecord(value))
      .filter((value): value is Record<string, unknown> => Boolean(value))
      .map((file, index) => ({
        id: toStringValue(file.id) ?? `${toStringValue(raw._id) ?? toStringValue(raw.id) ?? "task"}-file-${index}`,
        name: toStringValue(file.nombre) ?? `Archivo ${index + 1}`,
        type: inferFileType(file.tipo, file.nombre, file.url),
        provider: toStringValue(file.provider),
        nivel: file.nivel === "final" || file.level === "final" ? "final" as const : file.nivel === "preliminar" || file.level === "preliminar" ? "preliminar" as const : undefined,
        src: toStringValue(file.url),
      })),
    priority: normalizePriority(raw.prioridad),
    dueDate: toDueDateString(scheduledAt),
    location: toStringValue(raw.ubicacion) ?? toStringValue(cita?.ubicacion),
    mapsUrl: toStringValue(raw.mapsUrl),
    createdAt: toTimestamp(raw.createdAt),
    updatedAt: toTimestamp(raw.updatedAt),
    followUpEnteredAt: toTimestamp(raw.followUpEnteredAt),
    followUpStatus: normalizeFollowUpStatus(raw.followUpStatus),
    citaStarted,
    citaFinished,
    designApprovedByAdmin: toBooleanValue(raw.designApprovedByAdmin),
    designApprovedByClient: toBooleanValue(raw.designApprovedByClient),
    designFeedback: toFeedbackString(raw.designFeedback),
    codigoProyecto:
      toStringValue(raw.codigoProyecto) ??
      toStringValue(raw.codigo) ??
      toStringValue(raw.codigoCliente) ??
      toStringValue(raw.clienteId) ??
      toStringValue(raw.clientId),
    contractDate: toDateOnlyString(raw.fechaContrato),
    estimatedDeliveryDate: toDateOnlyString(raw.fechaEntrega),
    projectTypeSummary: toStringValue(raw.tipo),
    presupuestoTotal: toNumberValue(raw.presupuestoTotal),
    totalPagado: toNumberValue(raw.totalPagado),
  };
};

export type KanbanBackendColumn = "citas" | "disenos" | "cotizacion" | "contrato";

export type FetchBackendKanbanTasksResult = {
  tasks: KanbanTask[];
  failedColumns: KanbanBackendColumn[];
};

const KANBAN_BACKEND_COLUMNS: {
  column: KanbanBackendColumn;
  sourceType: "cita" | "tarea";
  fetch: () => ReturnType<typeof obtenerKanbanCitas>;
}[] = [
  { column: "citas", sourceType: "cita", fetch: obtenerKanbanCitas },
  { column: "disenos", sourceType: "tarea", fetch: obtenerKanbanDisenos },
  { column: "cotizacion", sourceType: "tarea", fetch: obtenerKanbanCotizacion },
  { column: "contrato", sourceType: "tarea", fetch: obtenerKanbanContrato },
];

export async function fetchBackendKanbanTasksWithStatus(): Promise<FetchBackendKanbanTasksResult> {
  const responses = await Promise.all(
    KANBAN_BACKEND_COLUMNS.map(async (spec) => ({
      column: spec.column,
      sourceType: spec.sourceType,
      response: await spec.fetch(),
    })),
  );

  const failedColumns: KanbanBackendColumn[] = [];
  const mapped: KanbanTask[] = [];

  for (const { column, sourceType, response } of responses) {
    if (!response.success || !response.data) {
      failedColumns.push(column);
      continue;
    }
    for (const item of response.data) {
      mapped.push({ ...mapKanbanItemToTask(item), sourceType });
    }
  }

  const unique = new Map<string, KanbanTask>();
  for (const task of mapped) {
    unique.set(task.id, task);
  }

  return { tasks: Array.from(unique.values()), failedColumns };
}

export async function fetchBackendKanbanTasks(): Promise<KanbanTask[]> {
  const { tasks } = await fetchBackendKanbanTasksWithStatus();
  return tasks;
}

export async function syncKanbanTasksFromBackend(): Promise<KanbanTask[] | null> {
  if (typeof window === "undefined") return null;
  if (!authApi.isAuthenticated()) return null;

  try {
    const backendTasks = await fetchBackendKanbanTasks();
    saveKanbanTasksToLocalStorage(backendTasks);
    return backendTasks;
  } catch (error) {
    console.warn("No se pudo sincronizar el kanban desde backend.", error);
    return null;
  }
}

const isObjectId = (value: string) => /^[a-fA-F0-9]{24}$/.test(value);
const isMissingRouteError = (error: unknown) => {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 404 || status === 405;
};

const buildTaskPatchPayload = (task: KanbanTask, patch: Partial<KanbanTask>): Record<string, unknown> => {
  const snapshot = { ...task, ...patch };
  const payload: Record<string, unknown> = {};

  if (patch.title !== undefined || task.title) payload.titulo = snapshot.title;
  if (patch.stage !== undefined || task.stage) payload.etapa = snapshot.stage;
  if (patch.status !== undefined || task.status) payload.estado = snapshot.status;
  if (patch.notes !== undefined || task.notes !== undefined) payload.notas = snapshot.notes;
  if (patch.location !== undefined || task.location !== undefined) payload.ubicacion = snapshot.location;
  if (patch.mapsUrl !== undefined || task.mapsUrl !== undefined) payload.mapsUrl = snapshot.mapsUrl;
  if (patch.dueDate !== undefined || task.dueDate !== undefined) payload.fechaLimite = snapshot.dueDate;
  if (patch.priority !== undefined || task.priority !== undefined) payload.prioridad = snapshot.priority;
  if (patch.codigoProyecto !== undefined || task.codigoProyecto !== undefined) {
    payload.codigoProyecto = snapshot.codigoProyecto;
  }
  // followUpEnteredAt/followUpReminderStepsSent/followUpLastReminderAt son propiedad exclusiva del backend/cron
  // (ver GUIA_FRONTEND_CRON_SEGUIMIENTO_EMAIL.md): nunca se envían al servidor, solo se leen.
  if (patch.followUpStatus !== undefined || task.followUpStatus !== undefined) {
    payload.followUpStatus = snapshot.followUpStatus;
  }
  if (patch.designApprovedByAdmin !== undefined || task.designApprovedByAdmin !== undefined) {
    payload.designApprovedByAdmin = snapshot.designApprovedByAdmin;
  }
  if (patch.designApprovedByClient !== undefined || task.designApprovedByClient !== undefined) {
    payload.designApprovedByClient = snapshot.designApprovedByClient;
  }
  if (patch.designFeedback !== undefined) {
    payload.designFeedback = patch.designFeedback ? String(patch.designFeedback) : null;
  }
  if (patch.citaStarted !== undefined || task.citaStarted !== undefined) {
    payload.citaStarted = snapshot.citaStarted;
  }
  if (patch.citaFinished !== undefined || task.citaFinished !== undefined) {
    payload.citaFinished = snapshot.citaFinished;
  }
  if (patch.preliminarData !== undefined || task.preliminarData !== undefined) {
    payload.preliminarData = snapshot.preliminarData;
  }
  if (patch.cotizacionFormalData !== undefined || task.cotizacionFormalData !== undefined) {
    payload.cotizacionFormalData = snapshot.cotizacionFormalData;
  }
  if (patch.preliminarCotizaciones !== undefined || task.preliminarCotizaciones !== undefined) {
    payload.preliminarCotizaciones = snapshot.preliminarCotizaciones;
  }
  if (patch.cotizacionesFormales !== undefined || task.cotizacionesFormales !== undefined) {
    payload.cotizacionesFormales = snapshot.cotizacionesFormales;
  }

  return payload;
};

export async function syncTaskAssigneesWithBackend(task: KanbanTask, assignedTo: string[]): Promise<boolean> {
  const taskId = task.id?.trim();
  if (!taskId) return false;

  const assignedIds = (task.assignedToIds ?? []).filter((id) => isObjectId(id));
  const validForCita = (task.sourceType ?? "").toLowerCase() === "cita";
  const citaSourceId = task.sourceId?.trim();

  try {
    if (validForCita && citaSourceId) {
      await asignarIngenierosCita(citaSourceId, { ingenierosIds: assignedIds });
      return true;
    }

    const assignmentPayload = assignedIds.length > 0 ? assignedIds : assignedTo;
    await asignarTrabajadoresTarea(taskId, assignmentPayload);
    return true;
  } catch (error) {
    console.warn("No se pudo sincronizar responsables en backend", { taskId, error });
    return false;
  }
}

export async function syncTaskPatchWithBackend(task: KanbanTask, patch: Partial<KanbanTask>): Promise<boolean> {
  const taskId = task.id?.trim();
  if (!taskId) return false;

  try {
    const payload = buildTaskPatchPayload(task, patch);
    if (Object.keys(payload).length === 0) return true;

    const response = await actualizarTarea(taskId, payload);
    return response.success !== false;
  } catch (error) {
    console.warn("No se pudo sincronizar avance de tarea en backend", { taskId, patch, error });
    return false;
  }
}

export async function approveClientDesignWithBackend(
  task: KanbanTask,
): Promise<{ success: boolean; message?: string }> {
  if (
    task.stage !== "disenos" ||
    !task.designApprovedByAdmin ||
    !task.files?.some((file) => file.nivel === "final")
  ) return { success: false, message: "La tarea requiere etapa Diseños, aprobación administrativa y archivo final." };

  const taskId = task.id.trim();
  if (!taskId) return { success: false, message: "No se encontró el ID de la tarea." };

  try {
    const visitsResponse = await obtenerVisitas();
    if (!visitsResponse.success || !Array.isArray(visitsResponse.data)) {
      return { success: false, message: visitsResponse.message || "No se pudieron consultar las visitas vinculadas." };
    }

    const relatedVisits = visitsResponse.data.filter((visit) => {
      const rawTaskId = visit.tareaId;
      const linkedTaskId = typeof rawTaskId === "string"
        ? rawTaskId
        : rawTaskId && typeof rawTaskId === "object"
          ? String((rawTaskId as Record<string, unknown>)._id ?? (rawTaskId as Record<string, unknown>).id ?? "")
          : "";
      return linkedTaskId === taskId;
    });
    const activeVisits = relatedVisits.filter(
      (item) => !["cancelada", "cancelado"].includes(String(item.estado ?? "").toLowerCase()),
    );
    const visit = activeVisits.find((item) => item.operationalStatus === "completed")
      ?? activeVisits.find((item) => item.operationalStatus === "in_progress")
      ?? activeVisits.find((item) => item.operationalStatus === "pending");

    if (!visit) {
      if (relatedVisits.length > 0) {
        return { success: false, message: "No se puede aprobar el diseño desde una visita cancelada." };
      }
      return { success: false, message: "No existe una visita vinculada y activa para esta tarea. Agenda una visita desde Operaciones." };
    }

    const visitId = String(visit._id ?? visit.id ?? "");
    if (!visitId) return { success: false, message: "La visita vinculada no tiene un ID válido." };

    let operationalStatus = visit.operationalStatus;
    if (operationalStatus === "pending") {
      const startResponse = await actualizarEstadoOperativoVisita(visitId, "in_progress");
      if (
        !startResponse.success ||
        startResponse.data?.operationalStatus !== "in_progress"
      ) {
        return { success: false, message: startResponse.message || "Backend no confirmó el inicio de la visita." };
      }
      operationalStatus = "in_progress";
    }

    if (operationalStatus === "in_progress") {
      const finishResponse = await actualizarEstadoOperativoVisita(visitId, "completed");
      if (
        !finishResponse.success ||
        finishResponse.data?.operationalStatus !== "completed"
      ) {
        return { success: false, message: finishResponse.message || "Backend no confirmó la finalización de la visita." };
      }
    }

    const patch: Partial<KanbanTask> = {
      designApprovedByClient: true,
      stage: "cotizacion",
      status: "pendiente",
      citaStarted: false,
      citaFinished: false,
    };
    const taskResponse = await actualizarTarea(taskId, buildTaskPatchPayload(task, patch));
    const updatedTask = taskResponse.success ? taskResponse.data : null;
    const confirmed = Boolean(
      taskResponse.success &&
      updatedTask?.designApprovedByClient === true &&
      updatedTask?.etapa === "cotizacion" &&
      updatedTask?.estado === "pendiente" &&
      updatedTask?.citaStarted === false &&
      updatedTask?.citaFinished === false,
    );
    if (!confirmed) {
      return { success: false, message: taskResponse.message || "Backend no confirmó la aprobación del cliente ni el avance a Cotización." };
    }

    const refreshedTasks = await fetchBackendKanbanTasks();
    const refreshedTask = refreshedTasks.find((item) => item.id === taskId);
    if (!refreshedTask?.designApprovedByClient || refreshedTask.stage !== "cotizacion") {
      return { success: false, message: "La respuesta fue correcta, pero Kanban no devolvió la tarea actualizada." };
    }
    saveKanbanTasksToLocalStorage(refreshedTasks);
    return { success: true };
  } catch (error) {
    const requestError = error as {
      response?: { status?: number; data?: { message?: string } };
      message?: string;
    };
    const status = requestError.response?.status;
    const message = requestError.response?.data?.message || requestError.message;
    console.error("Error aprobando diseño del cliente", {
      status,
      message,
      response: requestError.response?.data,
    });
    return {
      success: false,
      message: message || "No se pudo completar la aprobación del cliente.",
    };
  }
}

export async function syncTaskStageWithBackend(task: KanbanTask, targetStage: TaskStage): Promise<boolean> {
  const taskId = task.id?.trim();
  if (!taskId) return false;

  try {
    await cambiarEtapa(taskId, targetStage);
    return true;
  } catch (error) {
    console.warn("No se pudo sincronizar etapa en backend", { taskId, targetStage, error });
    return false;
  }
}

export async function syncTaskFollowUpWithBackend(
  task: KanbanTask,
  followUpStatus: FollowUpStatus,
): Promise<boolean> {
  const taskId = task.id?.trim();
  if (!taskId) return false;

  try {
    await actualizarTarea(taskId, {
      followUpStatus: followUpStatus === "descartado" ? "inactivo" : followUpStatus,
      estado: followUpStatus === "pendiente" ? "pendiente" : "completada",
    });
    return true;
  } catch (error) {
    console.warn("No se pudo sincronizar seguimiento en backend", { taskId, followUpStatus, error });
    return false;
  }
}

export async function syncCitaStartWithBackend(task: KanbanTask): Promise<boolean> {
  const sourceType = (task.sourceType ?? "").toLowerCase();
  const citaId = task.sourceId?.trim();
  if (sourceType !== "cita" || !citaId) return false;

  try {
    const response = await iniciarCita(citaId);
    return response.success;
  } catch (error) {
    if (isMissingRouteError(error)) {
      return syncTaskPatchWithBackend(task, { citaStarted: true });
    }
    console.warn("No se pudo sincronizar inicio de cita en backend", { citaId, error });
    return false;
  }
}

export async function syncCitaFinishWithBackend(task: KanbanTask): Promise<boolean> {
  const sourceType = (task.sourceType ?? "").toLowerCase();
  const citaId = task.sourceId?.trim();
  const taskId = task.id?.trim();
  if (sourceType !== "cita" || !citaId) return false;

  try {
    const response = await finalizarCita(citaId);
    if (!response.success) return false;
    if (taskId) {
      await syncTaskStageWithBackend({ ...task, stage: "disenos" }, "disenos");
    }
    return true;
  } catch (error) {
    if (isMissingRouteError(error)) {
      const patch: Partial<KanbanTask> = {
        citaStarted: true,
        citaFinished: true,
        stage: "disenos",
        status: "pendiente",
      };
      const [stageSaved, taskSaved] = await Promise.all([
        syncTaskStageWithBackend(task, "disenos"),
        syncTaskPatchWithBackend(task, patch),
      ]);
      return stageSaved && taskSaved;
    }
    console.warn("No se pudo sincronizar finalizacion de cita en backend", { citaId, error });
    return false;
  }
}