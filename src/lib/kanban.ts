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
  /** Datos de la cotización preliminar (cita); para ver/descargar PDF en Clientes en proceso */
  preliminarData?: PreliminarData;
  /** Datos de la cotización formal; para ver/descargar PDF en Clientes en proceso */
  cotizacionFormalData?: CotizacionFormalData;
  /** Varias cotizaciones preliminares (ej. cocina, clóset, baño) en la misma tarjeta. Si existe, tiene prioridad sobre preliminarData. */
  preliminarCotizaciones?: PreliminarData[];
  /** Varias cotizaciones formales en la misma tarjeta. Si existe, tiene prioridad sobre cotizacionFormalData. */
  cotizacionesFormales?: CotizacionFormalData[];
  /** Código para que el cliente acceda a /seguimiento (ej. K-8821). Se genera al crear la tarea. */
  codigoProyecto?: string;
  /** Admin «Clientes confirmados»: fecha de contrato (ISO `YYYY-MM-DD`). */
  contractDate?: string;
  /** Admin «Clientes confirmados»: fecha estimada de entrega manual (ISO `YYYY-MM-DD`). */
  estimatedDeliveryDate?: string;
  /** @deprecated Tipos se leen de cotizaciones en la tarjeta. */
  projectTypeSummary?: string;
};

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

import { mergeKanbanSnapshotIntoSeguimientoRecord } from "@/lib/seguimiento-project";

/** Prefijo para guardar datos de seguimiento por código: kuche_project_${codigoProyecto} */
export const seguimientoProjectStoragePrefix = "kuche_project_";

function isQuotaExceededError(e: unknown): boolean {
  return (
    (typeof DOMException !== "undefined" && e instanceof DOMException && e.name === "QuotaExceededError") ||
    (typeof e === "object" &&
      e !== null &&
      "name" in e &&
      (e as { name: string }).name === "QuotaExceededError")
  );
}

function stripFormalPdfDataUrlIfRedundant(d: CotizacionFormalData): CotizacionFormalData {
  if (d.pdfDataUrl && d.formalPdfKey) {
    const { pdfDataUrl: _drop, ...rest } = d;
    return rest as CotizacionFormalData;
  }
  return d;
}

/** Quita adjuntos pesados antes de serializar (localStorage ~5MB). El PDF formal sigue en IndexedDB por `formalPdfKey`. */
export function stripKanbanTasksForStorage(tasks: KanbanTask[]): KanbanTask[] {
  return tasks.map((task) => {
    const next: KanbanTask = { ...task };
    if (next.files?.length) {
      next.files = next.files.map(({ src: _s, ...rest }) => rest);
    }
    if (next.cotizacionFormalData) {
      next.cotizacionFormalData = stripFormalPdfDataUrlIfRedundant(next.cotizacionFormalData);
    }
    if (next.cotizacionesFormales?.length) {
      next.cotizacionesFormales = next.cotizacionesFormales.map(stripFormalPdfDataUrlIfRedundant);
    }
    return next;
  });
}

function stripAllFormalPdfDataUrl(tasks: KanbanTask[]): KanbanTask[] {
  const dropUrl = (d: CotizacionFormalData): CotizacionFormalData => {
    if (!d.pdfDataUrl) return d;
    const { pdfDataUrl: _u, ...rest } = d;
    return rest as CotizacionFormalData;
  };
  return stripKanbanTasksForStorage(tasks).map((task) => {
    const next = { ...task };
    if (next.cotizacionFormalData?.pdfDataUrl) {
      next.cotizacionFormalData = dropUrl(next.cotizacionFormalData);
    }
    if (next.cotizacionesFormales?.length) {
      next.cotizacionesFormales = next.cotizacionesFormales.map(dropUrl);
    }
    return next;
  });
}

/** Último recurso: quita el detalle de levantamiento embebido (el PDF en IndexedDB / seguimiento puede seguir existiendo). */
function stripPreliminarLevantamiento(d: PreliminarData): PreliminarData {
  if (!d.levantamiento) return d;
  const { levantamiento: _l, ...rest } = d;
  return rest;
}

function stripAllPreliminarLevantamiento(tasks: KanbanTask[]): KanbanTask[] {
  return stripAllFormalPdfDataUrl(tasks).map((task) => {
    const next = { ...task };
    if (next.preliminarData) {
      next.preliminarData = stripPreliminarLevantamiento(next.preliminarData);
    }
    if (next.preliminarCotizaciones?.length) {
      next.preliminarCotizaciones = next.preliminarCotizaciones.map(stripPreliminarLevantamiento);
    }
    return next;
  });
}

/**
 * Persiste tareas en localStorage recortando datos pesados. Reintenta con estrategias más agresivas si se excede la cuota.
 * La UI puede seguir teniendo `files[].src` en memoria hasta recargar; no muta el arreglo recibido.
 */
/** Mantiene `kanbanStage` / `kanbanFollowUpStatus` en cada `kuche_project_*` para `/seguimiento`. */
function syncSeguimientoKanbanSnapshotForTasks(tasks: KanbanTask[]): void {
  if (typeof window === "undefined") return;
  for (const task of tasks) {
    const code = task.codigoProyecto?.trim();
    if (!code) continue;
    const key = `${seguimientoProjectStoragePrefix}${code}`;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const next = mergeKanbanSnapshotIntoSeguimientoRecord(parsed, task);
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // ignore
    }
  }
}

export function saveKanbanTasksToLocalStorage(tasks: KanbanTask[]): boolean {
  if (typeof window === "undefined") return false;
  const attempts: (() => KanbanTask[])[] = [
    () => stripKanbanTasksForStorage(tasks),
    () => stripAllFormalPdfDataUrl(tasks),
    () => stripAllPreliminarLevantamiento(tasks),
  ];
  for (const build of attempts) {
    try {
      const payload = build();
      window.localStorage.setItem(kanbanStorageKey, JSON.stringify(payload));
      syncSeguimientoKanbanSnapshotForTasks(payload);
      return true;
    } catch (e) {
      if (!isQuotaExceededError(e)) {
        console.error("saveKanbanTasksToLocalStorage", e);
        return false;
      }
    }
  }
  return false;
}
