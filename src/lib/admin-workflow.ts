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

const inferFileType = (tipo: unknown): TaskFile["type"] => {
  const normalized = toStringValue(tipo)?.toLowerCase() ?? "";
  if (normalized.includes("pdf")) return "pdf";
  if (normalized.includes("render") || normalized.includes("imagen") || normalized.includes("image")) {
    return "render";
  }
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
    notes,
    files: filesRaw
      .map((value) => toRecord(value))
      .filter((value): value is Record<string, unknown> => Boolean(value))
      .map((file, index) => ({
        id: toStringValue(file.id) ?? `${toStringValue(raw._id) ?? toStringValue(raw.id) ?? "task"}-file-${index}`,
        name: toStringValue(file.nombre) ?? `Archivo ${index + 1}`,
        type: inferFileType(file.tipo),
        src: toStringValue(file.url),
      })),
    priority: normalizePriority(raw.prioridad),
    dueDate: toDueDateString(scheduledAt),
    location: toStringValue(raw.ubicacion) ?? toStringValue(cita?.ubicacion),
    mapsUrl: toStringValue(raw.mapsUrl),
    createdAt: toTimestamp(raw.createdAt),
    followUpEnteredAt: toTimestamp(raw.followUpEnteredAt),
    followUpStatus: normalizeFollowUpStatus(raw.followUpStatus),
    citaStarted,
    citaFinished,
    designApprovedByAdmin: toBooleanValue(raw.designApprovedByAdmin),
    designApprovedByClient: toBooleanValue(raw.designApprovedByClient),
    codigoProyecto:
      toStringValue(raw.codigo) ??
      toStringValue(raw.codigoCliente) ??
      toStringValue(raw.clienteId) ??
      toStringValue(raw.clientId),
  };
};

export async function fetchBackendKanbanTasks(): Promise<KanbanTask[]> {
  const responses = await Promise.all([
    obtenerKanbanCitas(),
    obtenerKanbanDisenos(),
    obtenerKanbanCotizacion(),
    obtenerKanbanContrato(),
  ]);

  const mapped = responses
    .filter((response) => response.success)
    .flatMap((response) => response.data)
    .map(mapKanbanItemToTask);

  const unique = new Map<string, KanbanTask>();
  for (const task of mapped) {
    unique.set(task.id, task);
  }

  return Array.from(unique.values());
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
  if (patch.followUpEnteredAt !== undefined || task.followUpEnteredAt !== undefined) {
    payload.followUpEnteredAt = snapshot.followUpEnteredAt;
  }
  if (patch.followUpStatus !== undefined || task.followUpStatus !== undefined) {
    payload.followUpStatus = snapshot.followUpStatus;
  }
  if (patch.designApprovedByAdmin !== undefined || task.designApprovedByAdmin !== undefined) {
    payload.designApprovedByAdmin = snapshot.designApprovedByAdmin;
  }
  if (patch.designApprovedByClient !== undefined || task.designApprovedByClient !== undefined) {
    payload.designApprovedByClient = snapshot.designApprovedByClient;
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
    if (validForCita && citaSourceId && assignedIds.length > 0) {
      await asignarIngenierosCita(citaSourceId, { ingenieroIds: assignedIds });
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

    await actualizarTarea(taskId, payload);
    return true;
  } catch (error) {
    console.warn("No se pudo sincronizar avance de tarea en backend", { taskId, patch, error });
    return false;
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
    await iniciarCita(citaId);
    return true;
  } catch (error) {
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
    await finalizarCita(citaId);
    if (taskId) {
      await syncTaskStageWithBackend({ ...task, stage: "disenos" }, "disenos");
    }
    return true;
  } catch (error) {
    console.warn("No se pudo sincronizar finalizacion de cita en backend", { citaId, error });
    return false;
  }
}