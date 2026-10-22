import type { LevantamientoDetalle } from "@/lib/levantamiento-catalog";
import { parseDeliveryWeeksRangeFromLabel } from "@/lib/delivery-weeks";

export type TaskStage = "citas" | "disenos" | "cotizacion" | "contrato";

/** Borde izquierdo (con `border-l-4`) y badge de etapa — mismo criterio visual que el Kanban. */
export const stageStyles: Record<TaskStage, { border: string; badge: string }> = {
  citas: { border: "border-sky-500", badge: "bg-sky-50 text-sky-600" },
  disenos: { border: "border-violet-500", badge: "bg-violet-50 text-violet-600" },
  cotizacion: { border: "border-emerald-500", badge: "bg-emerald-50 text-emerald-600" },
  contrato: { border: "border-amber-500", badge: "bg-amber-50 text-amber-700" },
};

export type TaskStatus = "pendiente" | "completada";
export type TaskPriority = "alta" | "media" | "baja";
export type FollowUpStatus = "pendiente" | "confirmado" | "descartado";

export type TaskFile = {
  id: string;
  name: string;
  type: "pdf" | "render" | "otro";
  provider?: "cloudinary" | "dropbox" | "local" | string;
  nivel?: "preliminar" | "final";
  /** Data URL (base64): vista previa y descarga en admin; opcional si falló la lectura o es dato legado. */
  src?: string;
};

/** Datos del cotizador preliminar guardados en la tarjeta del cliente (para regenerar PDF). */
export type PreliminarData = {
  client: string;
  projectType: string;
  location: string;
  date: string;
  rangeLabel: string;
  cubierta: string;
  frente: string;
  herraje: string;
  /** Medidas generales del espacio (formulario preliminar), en metros. */
  largo?: string;
  alto?: string;
  /** Desglose y totales (MXN); opcional en datos legados sin cotización detallada. */
  costoBase?: number;
  costoMateriales?: number;
  costoIluminacion?: number;
  /** Suma accesorios especiales (cantidad × precio base); legados sin campo = 0. */
  costoAccesoriosEspeciales?: number;
  subtotal?: number;
  iva?: number;
  total?: number;
  /** Medidas y comentarios por sección del levantamiento detallado (opcional). */
  levantamiento?: LevantamientoDetalle;
};

/** Datos del cotizador formal guardados en la tarjeta del cliente. */
export type CotizacionFormalData = PreliminarData & {
  /** Clave en IndexedDB donde está guardado el PDF formal (evita exceder cuota de localStorage). */
  formalPdfKey?: string;
  /** Clave en IndexedDB de la hoja de taller generada junto con esta cotización formal. */
  workshopPdfKey?: string;
  /** @deprecated PDF en data URL; ya no se persiste en la tarea (usa formalPdfKey + IndexedDB). */
  pdfDataUrl?: string;
};

export type KanbanTask = {
  id: string;
  /** ID de entidad de origen cuando la tarjeta viene del backend (cita/tarea/proyecto). */
  sourceId?: string;
  /** Tipo de entidad original reportada por backend para resolver mutaciones específicas. */
  sourceType?: string;
  title: string;
  stage: TaskStage;
  status: TaskStatus;
  /** Uno o más responsables (permite que 2+ empleados tengan la misma actividad). */
  assignedTo: string[];
  /** IDs backend de los responsables cuando están disponibles. */
  assignedToIds?: string[];
  project: string;
  /** Datos de contacto disponibles en la cita/cliente de origen. */
  clientEmail?: string;
  clientPhone?: string;
  notes?: string;
  files?: TaskFile[];
  priority?: TaskPriority;
  /** Fecha límite o cita: `YYYY-MM-DD` o `YYYY-MM-DDTHH:mm` (hora local). */
  dueDate?: string;
  /** Dirección / localidad del cliente; se muestra debajo del nombre en la tarjeta. */
  location?: string;
  /** Enlace de Google Maps; en la tarjeta se muestra como "Ver en Maps" para abrir la ubicación. */
  mapsUrl?: string;
  createdAt?: number;
  /** Última actualización en backend (ms epoch); usada para ciclos de designFeedback. */
  updatedAt?: number;
  /** Para tareas en seguimiento: fecha en que entró a la columna de seguimiento */
  followUpEnteredAt?: number;
  /** Estado del seguimiento: pendiente, confirmado o descartado */
  followUpStatus?: FollowUpStatus;
  /** Citas/Cotización: si se inició la cita */
  citaStarted?: boolean;
  /** Citas/Cotización: si se terminó la cita */
  citaFinished?: boolean;
  /** Diseños: si el admin aprobó el diseño */
  designApprovedByAdmin?: boolean;
  /** Diseños: si el cliente aprobó el diseño */
  designApprovedByClient?: boolean;
  /** Observaciones del admin cuando solicita cambios al diseño */
  designFeedback?: string;
  /** Datos de la cotización preliminar (cita); para ver/descargar PDF en Clientes en proceso */
  preliminarData?: PreliminarData;
  /** Datos de la cotización formal; para ver/descargar PDF en Clientes en proceso */
  cotizacionFormalData?: CotizacionFormalData;
  /** Varias cotizaciones preliminares (ej. cocina, clóset, baño) en la misma tarjeta. Si existe, tiene prioridad sobre preliminarData. */
  preliminarCotizaciones?: PreliminarData[];
  /** Varias cotizaciones formales en la misma tarjeta. Si existe, tiene prioridad sobre cotizacionFormalData. */
  cotizacionesFormales?: CotizacionFormalData[];
  /** Código para que el cliente acceda a /seguimiento. Se genera al crear la tarea. */
  codigoProyecto?: string;
  /** Mismo código público. La tarjeta y el selector de estatus leen cualquiera de estos alias. */
  codigo?: string;
  clienteId?: string;
  codigoCliente?: string;
  /** `Tarea.proyectoId`: ObjectId del `Proyecto` ya vinculado a esta tarea (backend). Si falta,
   * el cliente aún no tiene proyecto creado/ligado (ver docs/AREA_CONTRATOS_Y_PROYECTOS_RUTAS.md). */
  proyectoId?: string;
  /** Admin «Clientes confirmados»: fecha de contrato (ISO `YYYY-MM-DD`). */
  contractDate?: string;
  /** Admin «Clientes confirmados»: fecha estimada de entrega manual (ISO `YYYY-MM-DD`). */
  estimatedDeliveryDate?: string;
  /** Tipo de proyecto capturado por el admin (`Proyecto.tipo` en backend). */
  projectTypeSummary?: string;
  /** `Proyecto.presupuestoTotal` (MXN). */
  presupuestoTotal?: number;
  /** Suma de `Proyecto.pagos.*.amount` (MXN). */
  totalPagado?: number;
  /** Inversión estimada / total para seguimiento (MXN), cuando el backend la expone en la tarea. */
  inversion?: number;
  /** Paso público del timeline de fabricación, guardado desde el estatus público. */
  etapaActual?: string;
  /** Pagos públicos (anticipo, segundo pago y liquidación) reflejados en la tarjeta. */
  pagos?: {
    anticipo?: { amount?: number; date?: string; receiptLabel?: string; receiptImage?: string };
    segundoPago?: { amount?: number; date?: string; receiptLabel?: string; receiptImage?: string };
    liquidacion?: { amount?: number; date?: string; receiptLabel?: string; receiptImage?: string };
  };
  /** ID de documento Tarea en Mongo cuando la tarjeta kanban representa una cita u otra entidad. */
  linkedTareaId?: string;
};

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

function normalizeProjectCodeForMatch(code: string): string {
  return code.trim().toUpperCase().replace(/^K-?/, "");
}

/** Código público de 6 caracteres, sin depender de un solo nombre de campo. */
export function taskPublicCode(task: {
  codigoProyecto?: string;
  codigo?: string;
  clienteId?: string;
  codigoCliente?: string;
  clientId?: string;
}): string {
  return (
    task.codigoProyecto?.trim() ||
    task.codigo?.trim() ||
    task.clienteId?.trim() ||
    task.codigoCliente?.trim() ||
    task.clientId?.trim() ||
    ""
  );
}

export function withUnifiedProjectCode<T extends object>(task: T, code: string): T {
  const unified = code.trim();
  if (!unified) return task;
  return {
    ...task,
    codigoProyecto: unified,
    codigo: unified,
    clienteId: unified,
    codigoCliente: unified,
  };
}

export function isMongoObjectId(value: string | undefined): boolean {
  return Boolean(value?.trim() && OBJECT_ID_RE.test(value.trim()));
}

/**
 * ID de tarea Mongo para PATCH y registro de archivos (`tareasId`).
 * Evita usar el id de cita cuando existe una tarea vinculada o una tarjeta de etapa posterior.
 */
export function resolveKanbanTaskPersistenceId(
  task: Pick<KanbanTask, "id" | "sourceType" | "sourceId" | "codigoProyecto" | "linkedTareaId" | "project">,
  allTasks?: KanbanTask[],
): string {
  const linked = task.linkedTareaId?.trim();
  if (isMongoObjectId(linked)) return linked!;

  const id = task.id?.trim() ?? "";
  const sourceType = (task.sourceType ?? "").toLowerCase();

  if (sourceType !== "cita" && isMongoObjectId(id)) return id;

  const pool = allTasks ?? (typeof window !== "undefined" ? runtimeKanbanTasks : []);
  const code = task.codigoProyecto?.trim();
  if (code) {
    const normalized = normalizeProjectCodeForMatch(code);
    const byCode = pool.find(
      (t) =>
        t.id !== task.id &&
        (t.sourceType ?? "").toLowerCase() !== "cita" &&
        isMongoObjectId(t.id) &&
        t.codigoProyecto?.trim() &&
        normalizeProjectCodeForMatch(t.codigoProyecto) === normalized,
    );
    if (byCode) return byCode.id;
  }

  if (task.project?.trim()) {
    const projectKey = task.project.trim().toLowerCase();
    const byProject = pool.find(
      (t) =>
        t.id !== task.id &&
        (t.sourceType ?? "").toLowerCase() !== "cita" &&
        isMongoObjectId(t.id) &&
        t.project.trim().toLowerCase() === projectKey &&
        (t.stage === "disenos" || t.stage === "cotizacion" || t.stage === "contrato"),
    );
    if (byProject) return byProject.id;
  }

  return id;
}

/** Monto pendiente por pagar; `null` si el proyecto aún no tiene presupuesto. */
export function getMontoRestante(task: Pick<KanbanTask, "presupuestoTotal" | "totalPagado">): number | null {
  if (!task.presupuestoTotal || task.presupuestoTotal <= 0) return null;
  return Math.max(0, task.presupuestoTotal - (task.totalPagado ?? 0));
}

/**
 * Segunda línea opcional en tarjetas administrativas: `title` a veces repite `project`
 * (mismo nombre del cliente). Si son equivalentes tras normalizar mayúsculas/espacios, no se muestra.
 */
export function getTaskCardSubtitle(task: Pick<KanbanTask, "project" | "title">): string | null {
  const trimmedTitle = task.title.trim();
  if (!trimmedTitle) return null;
  const trimmedProject = task.project.trim();
  if (trimmedTitle.toLowerCase() === trimmedProject.toLowerCase()) return null;
  return trimmedTitle;
}

/** Lista efectiva de cotizaciones preliminares (array nuevo o migrado desde preliminarData). */
export function getPreliminarList(task: KanbanTask): PreliminarData[] {
  if (task.preliminarCotizaciones && task.preliminarCotizaciones.length > 0) {
    return task.preliminarCotizaciones;
  }
  return task.preliminarData ? [task.preliminarData] : [];
}

/** Lista efectiva de cotizaciones formales (array nuevo o migrado desde cotizacionFormalData). */
export function getCotizacionesFormalesList(task: KanbanTask): CotizacionFormalData[] {
  if (task.cotizacionesFormales && task.cotizacionesFormales.length > 0) {
    return task.cotizacionesFormales;
  }
  return task.cotizacionFormalData ? [task.cotizacionFormalData] : [];
}

/** Tipos de espacio únicos desde cotizaciones (formal + preliminar). */
export function deriveProjectTypesLabel(task: KanbanTask): string {
  const types = new Set<string>();
  for (const c of getCotizacionesFormalesList(task)) {
    const t = c.projectType?.trim();
    if (t) types.add(t);
  }
  for (const p of getPreliminarList(task)) {
    const t = p.projectType?.trim();
    if (t) types.add(t);
  }
  return Array.from(types).join(", ");
}

/** Líneas para la tarjeta de confirmados: prioriza cotizaciones formales; si no hay, preliminares. */
export function getConfirmedCardProjectLines(
  task: KanbanTask,
): { projectType: string; weeksLabel: string }[] {
  const formals = getCotizacionesFormalesList(task);
  if (formals.length > 0) {
    return formals.map((c) => ({
      projectType: c.projectType?.trim() || "Proyecto",
      weeksLabel:
        c.date?.trim() && c.date !== "—" ? c.date.trim() : "Sin plazo en cotización formal",
    }));
  }
  const pre = getPreliminarList(task);
  return pre.map((p) => ({
    projectType: p.projectType?.trim() || "Proyecto",
    weeksLabel:
      p.date?.trim() && p.date !== "—" ? p.date.trim() : "Sin plazo en cotización",
  }));
}

/** Rango global de semanas (min/máx) a partir de todas las cotizaciones con texto de semanas. */
export function getAggregatedDeliveryWeeksFromTask(task: KanbanTask): { min: number; max: number } | null {
  const ranges: { min: number; max: number }[] = [];
  for (const c of getCotizacionesFormalesList(task)) {
    const r = parseDeliveryWeeksRangeFromLabel(c.date || "");
    if (r) ranges.push(r);
  }
  if (ranges.length === 0) {
    for (const p of getPreliminarList(task)) {
      const r = parseDeliveryWeeksRangeFromLabel(p.date || "");
      if (r) ranges.push(r);
    }
  }
  if (ranges.length === 0) return null;
  return {
    min: Math.min(...ranges.map((x) => x.min)),
    max: Math.max(...ranges.map((x) => x.max)),
  };
}

export const kanbanColumns = [
  { id: "citas", label: "Citas" },
  { id: "disenos", label: "Diseños" },
  { id: "cotizacion", label: "Cotización Formal" },
  { id: "contrato", label: "Seguimiento" },
] as const;

/** Lista inicial de tareas del tablero. Vacía para que el tablero se llene solo con "Asignar pendiente". */
export const initialKanbanTasks: KanbanTask[] = [];

export const kanbanStorageKey = "kuche-kanban-tasks";
export const activeCitaTaskStorageKey = "kuche-active-cita-task";
export const citaReturnUrlStorageKey = "kuche-cita-return-url";
export const activeCotizacionFormalTaskStorageKey = "kuche-active-cotizacion-formal-task";

/** Prefijo histórico de claves de seguimiento por código: kuche_project_${codigoProyecto}. Ya no se lee/escribe nada con él. */
export const seguimientoProjectStoragePrefix = "kuche_project_";

let runtimeKanbanTasks: KanbanTask[] = [];

const writePersistedKanbanTasks = (tasks: KanbanTask[]) => {
  runtimeKanbanTasks = tasks;
};

/** Mantiene la lista vigente en memoria para que la UI se alimente del backend. */
export function stripKanbanTasksForStorage(tasks: KanbanTask[]): KanbanTask[] {
  return tasks;
}

/** Persiste en memoria la lista vigente del tablero. */
export function saveKanbanTasksToLocalStorage(tasks: KanbanTask[]): boolean {
  writePersistedKanbanTasks(tasks);
  return true;
}

export const kanbanTasksUpdatedEventName = "kuche:kanban-tasks-updated";

export function kanbanTaskMergeKey(task: KanbanTask): string {
  const code = taskPublicCode(task);
  if (code) return `code:${normalizeProjectCodeForMatch(code)}`;
  const sourceId = task.sourceId?.trim();
  if (sourceId) return `src:${sourceId}`;
  return `id:${task.id}`;
}

const STAGE_RANK: Record<TaskStage, number> = {
  citas: 0,
  disenos: 1,
  cotizacion: 2,
  contrato: 3,
};

const isUnassignedLabel = (value: string) => {
  const trimmed = value.trim().toLowerCase();
  return trimmed.length === 0 || trimmed === "sin asignar";
};

const hasRealAssignee = (values: string[] | undefined) =>
  Array.isArray(values) && values.some((value) => !isUnassignedLabel(value));

/** Combina tarjetas locales con datos del backend sin perder trabajo offline. */
export function mergeKanbanTaskLists(local: KanbanTask[], incoming: KanbanTask[]): KanbanTask[] {
  const merged = new Map<string, KanbanTask>();

  for (const task of local) {
    merged.set(kanbanTaskMergeKey(task), task);
  }

  for (const task of incoming) {
    let key = kanbanTaskMergeKey(task);
    let existing = merged.get(key);
    if (!existing && task.id) {
      for (const [existingKey, candidate] of merged) {
        if (candidate.id === task.id) {
          key = existingKey;
          existing = candidate;
          break;
        }
      }
    }
    if (!existing) {
      merged.set(key, withUnifiedProjectCode(task, taskPublicCode(task)));
      continue;
    }
    if (kanbanTaskMergeKey(task) !== key) {
      merged.delete(key);
      key = kanbanTaskMergeKey({ ...existing, ...task, codigoProyecto: taskPublicCode(existing) || taskPublicCode(task) });
    }

    const stage =
      STAGE_RANK[existing.stage] >= STAGE_RANK[task.stage] ? existing.stage : task.stage;

    merged.set(key, {
      ...task,
      ...existing,
      sourceId: task.sourceId ?? existing.sourceId,
      sourceType: task.sourceType ?? existing.sourceType,
      assignedTo:
        !hasRealAssignee(existing.assignedTo) && hasRealAssignee(task.assignedTo)
          ? task.assignedTo
          : existing.assignedTo,
      assignedToIds: task.assignedToIds?.length ? task.assignedToIds : existing.assignedToIds,
      stage,
      preliminarData: existing.preliminarData ?? task.preliminarData,
      preliminarCotizaciones: existing.preliminarCotizaciones?.length
        ? existing.preliminarCotizaciones
        : task.preliminarCotizaciones,
      cotizacionFormalData: existing.cotizacionFormalData ?? task.cotizacionFormalData,
      cotizacionesFormales: existing.cotizacionesFormales?.length
        ? existing.cotizacionesFormales
        : task.cotizacionesFormales,
      inversion: existing.inversion ?? task.inversion,
      linkedTareaId: existing.linkedTareaId ?? task.linkedTareaId,
      citaStarted: Boolean(existing.citaStarted || task.citaStarted),
      citaFinished: Boolean(existing.citaFinished || task.citaFinished),
      ...(() => {
        const code = taskPublicCode(existing) || taskPublicCode(task);
        return {
          codigoProyecto: code || undefined,
          codigo: code || undefined,
          clienteId: code || undefined,
          codigoCliente: code || undefined,
        };
      })(),
      location: existing.location?.trim() ? existing.location : task.location,
      followUpStatus: existing.followUpStatus ?? task.followUpStatus,
      designApprovedByAdmin: existing.designApprovedByAdmin || task.designApprovedByAdmin,
      designApprovedByClient: existing.designApprovedByClient || task.designApprovedByClient,
      designFeedback:
        existing.designFeedback === undefined && existing.files?.length
          ? undefined
          : task.designFeedback?.trim()
            ? task.designFeedback.trim()
            : undefined,
    });
  }

  return Array.from(merged.values());
}

/** Devuelve la lista vigente del tablero desde memoria. */
export function getTasksFromLocalStorage(): KanbanTask[] {
  return runtimeKanbanTasks;
}

/** Sin persistencia: no-op, se mantiene la firma para no romper llamadores. */
export function syncSeguimientoProjectKanbanStage(_codigoProyecto: string, _stage: TaskStage): void {
  // no-op: ya no se persiste en localStorage
}

export function isValidTaskStage(value: unknown): value is TaskStage {
  return typeof value === "string" && kanbanColumns.some((col) => col.id === value);
}

export type KanbanTaskMatchCriteria = {
  targetId: string;
  projectCode?: string;
  clientName?: string;
};

/** Coincidencia flexible para actualizar tarjetas tras levantamiento/cita. */
export function taskMatchesKanbanUpdate(task: KanbanTask, criteria: KanbanTaskMatchCriteria): boolean {
  const targetId = criteria.targetId.trim();
  const projectCode = criteria.projectCode?.trim() ?? "";
  const clientName = criteria.clientName?.trim() ?? "";

  if (!targetId && !projectCode && !clientName) return false;
  if (targetId && task.id === targetId) return true;
  if (targetId && task.sourceId === targetId) return true;
  if (projectCode && task.codigoProyecto) {
    if (task.codigoProyecto === projectCode) return true;
    if (normalizeProjectCodeForMatch(task.codigoProyecto) === normalizeProjectCodeForMatch(projectCode)) {
      return true;
    }
  }
  if (clientName && task.project.trim().toLowerCase() === clientName.toLowerCase()) return true;
  if (clientName && task.title.trim().toLowerCase() === clientName.toLowerCase()) return true;
  return false;
}

/** Notifica cambios del tablero y los deja disponibles para la UI en memoria. */
export function notifyKanbanTasksUpdated(tasks: KanbanTask[]): boolean {
  writePersistedKanbanTasks(tasks);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(kanbanTasksUpdatedEventName, { detail: { tasks } }),
    );
  }
  return true;
}

