import { runtimeStore } from "@/lib/runtime-store";
import { parseDeliveryWeeksRangeFromLabel } from "@/lib/delivery-weeks";

export type TaskStage = "citas" | "disenos" | "cotizacion" | "contrato";
export type TaskStatus = "pendiente" | "completada";
export type TaskPriority = "alta" | "media" | "baja";
export type FollowUpStatus = "pendiente" | "confirmado" | "inactivo" | "descartado";

export type TaskFile = {
  id: string;
  name: string;
  type: "pdf" | "render" | "otro";
  /** Data URL para vista previa (imágenes); opcional en PDF/otro */
  src?: string;
};

/** Datos del cotizador preliminar guardados en la tarjeta del cliente (para regenerar PDF). */
export type PreliminarWallType = "pared_lisa" | "pared_con_ventana" | "pared_con_puerta" | "pared_mixta";

export type PreliminarWallSpec = {
  id: string;
  type: PreliminarWallType;
  totalWidthCm: number;
  totalHeightCm: number;
  openingWidthCm?: number;
  openingHeightCm?: number;
  topGapToCeilingCm?: number;
  leftSpanCm?: number;
  rightSpanCm?: number;
};

export type PreliminarData = {
  [key: string]: unknown;
  client: string;
  /** Identificador estable del cliente para relacionar archivos y seguimientos. */
  clienteId?: string;
  projectType: string;
  location: string;
  date: string;
  rangeLabel: string;
  cubierta: string;
  frente: string;
  herraje: string;
  wallSpecs?: PreliminarWallSpec[];
  wallCostEstimate?: number;
  /** URL remota del PDF generado al terminar el levantamiento detallado. */
  levantamientoPdfUrl?: string;
};

/** Datos del cotizador formal guardados en la tarjeta del cliente. */
export type CotizacionFormalData = PreliminarData & {
  /** Clave en IndexedDB donde está guardado el PDF formal (evita exceder cuota de localStorage). */
  formalPdfKey?: string;
  /** Clave en IndexedDB para la hoja de taller asociada. */
  workshopPdfKey?: string;
  /** URL remota del PDF formal guardado en Cloudinary. */
  formalPdfUrl?: string;
  /** URL remota de la hoja de taller guardada en Cloudinary. */
  workshopPdfUrl?: string;
  /** @deprecated PDF en data URL; ya no se persiste en la tarea (usa formalPdfKey + IndexedDB). */
  pdfDataUrl?: string;
};

export type KanbanTask = {
  id: string;
  title: string;
  stage: TaskStage;
  status: TaskStatus;
  /** Uno o más responsables (permite que 2+ empleados tengan la misma actividad). */
  assignedTo: string[];
  project: string;
  notes?: string;
  files?: TaskFile[];
  priority?: TaskPriority;
  dueDate?: string;
  /** Dirección / localidad del cliente; se muestra debajo del nombre en la tarjeta. */
  location?: string;
  /** Enlace de Google Maps; en la tarjeta se muestra como "Ver en Maps" para abrir la ubicación. */
  mapsUrl?: string;
  createdAt?: number;
  /** Para tareas en seguimiento: fecha en que entró a la columna de seguimiento */
  followUpEnteredAt?: number;
  /** Estado del seguimiento: pendiente, confirmado o inactivo */
  followUpStatus?: FollowUpStatus;
  /** Citas/Cotización: si se inició la cita */
  citaStarted?: boolean;
  /** Citas/Cotización: si se terminó la cita */
  citaFinished?: boolean;
  /** Diseños: si el admin aprobó el diseño */
  designApprovedByAdmin?: boolean;
  /** Diseños: si el cliente aprobó el diseño */
  designApprovedByClient?: boolean;
  /** Diseños: fecha y hora de visita programada tras aprobar diseño (ISO string). */
  visitScheduledAt?: string;
  /** Datos de la cotización preliminar (cita); para ver/descargar PDF en Clientes en proceso */
  preliminarData?: PreliminarData;
  /** Datos de la cotización formal; para ver/descargar PDF en Clientes en proceso */
  cotizacionFormalData?: CotizacionFormalData;
  /** Varias cotizaciones preliminares (ej. cocina, clóset, baño) en la misma tarjeta. Si existe, tiene prioridad sobre preliminarData. */
  preliminarCotizaciones?: PreliminarData[];
  /** Varias cotizaciones formales en la misma tarjeta. Si existe, tiene prioridad sobre cotizacionFormalData. */
  cotizacionesFormales?: CotizacionFormalData[];
  /** Monto total del proyecto para el seguimiento de pagos del cliente. */
  inversion?: number;
  /** Fecha de contrato guardada para planeacion de entrega. */
  contractDate?: string;
  /** Fecha estimada de entrega guardada manualmente. */
  estimatedDeliveryDate?: string;
  /** Paso actual de la linea de tiempo visible para el cliente en seguimiento. */
  etapaActual?: string;
  /** Código para que el cliente acceda a /seguimiento (ej. K-8821). Se genera al crear la tarea. */
  codigoProyecto?: string;
};

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

export const kanbanColumns = [
  { id: "citas", label: "Citas" },
  { id: "disenos", label: "Diseños" },
  { id: "cotizacion", label: "Cotización Formal" },
  { id: "contrato", label: "Seguimiento" },
] as const;

export const stageStyles: Record<TaskStage, { border: string; badge: string }> = {
  citas: { border: "border-sky-500", badge: "bg-sky-50 text-sky-600" },
  disenos: { border: "border-violet-500", badge: "bg-violet-50 text-violet-600" },
  cotizacion: { border: "border-emerald-500", badge: "bg-emerald-50 text-emerald-600" },
  contrato: { border: "border-amber-500", badge: "bg-amber-50 text-amber-700" },
};

type ConfirmedProjectLine = {
  projectType: string;
  weeksLabel: string;
};

export function getConfirmedCardProjectLines(task: KanbanTask): ConfirmedProjectLine[] {
  const source = getCotizacionesFormalesList(task).length > 0
    ? getCotizacionesFormalesList(task)
    : getPreliminarList(task);

  return source.map((item) => ({
    projectType: typeof item.projectType === "string" ? item.projectType.trim() : "",
    weeksLabel: typeof item.date === "string" ? item.date.trim() : "",
  }));
}

export function deriveProjectTypesLabel(task: KanbanTask): string {
  const seen = new Set<string>();
  const labels: string[] = [];

  for (const line of getConfirmedCardProjectLines(task)) {
    const label = line.projectType;
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
  }

  return labels.join(", ");
}

export function getAggregatedDeliveryWeeksFromTask(
  task: KanbanTask,
): { min: number; max: number } | null {
  const ranges = getConfirmedCardProjectLines(task)
    .map((line) => parseDeliveryWeeksRangeFromLabel(line.weeksLabel))
    .filter((range): range is { min: number; max: number } => Boolean(range));

  if (ranges.length === 0) return null;

  return {
    min: Math.min(...ranges.map((r) => r.min)),
    max: Math.max(...ranges.map((r) => r.max)),
  };
}

export function getTaskCardSubtitle(task: KanbanTask): string | null {
  const location = task.location?.trim();
  const dueDate = task.dueDate?.trim();
  const meta = [location, dueDate].filter(Boolean);

  if (meta.length > 0) return meta.join(" · ");

  const notes = task.notes?.trim();
  if (!notes) return null;

  return notes.length > 96 ? `${notes.slice(0, 93)}...` : notes;
}

/** Lista inicial de tareas del tablero. Vacía para que el tablero se llene solo con "Asignar pendiente". */
export const initialKanbanTasks: KanbanTask[] = [];

export const kanbanStorageKey = "kuche-kanban-tasks";
export const activeCitaTaskStorageKey = "kuche-active-cita-task";
export const activeCitaTaskSnapshotStorageKey = "kuche-active-cita-task-snapshot";
export const citaReturnUrlStorageKey = "kuche-cita-return-url";
export const finishedCitaTaskStorageKey = "kuche-finished-cita-task";
export const activeCotizacionFormalTaskStorageKey = "kuche-active-cotizacion-formal-task";

/** Prefijo para guardar datos de seguimiento por código: kuche_project_${codigoProyecto} */
export const seguimientoProjectStoragePrefix = "kuche_project_";

/** Compatibilidad sin localStorage: persiste en memoria de runtime durante la sesión. */
export function saveKanbanTasksToLocalStorage(tasks: KanbanTask[]): void {
  runtimeStore.setItem(kanbanStorageKey, JSON.stringify(tasks));
}
