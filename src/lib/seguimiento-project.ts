/**
 * Modelo y utilidades del proyecto de seguimiento del cliente (`kuche_project_${codigo}` en localStorage).
 */

import { seguimientoProjectStoragePrefix, type KanbanTask } from "@/lib/kanban";

/** Orden del embudo en el tablero. Las etapas que se añadan después de `contrato` deben ir al final. */
export const KANBAN_PIPELINE_STAGES = ["citas", "disenos", "cotizacion", "contrato"] as const;

/** Valores de `estadoProyecto` en seguimiento (modal «Editar estatus público»). */
export const ESTADO_PROYECTO = {
  EN_PROCESO: "Cliente en proceso",
  CONFIRMADO: "Cliente confirmado",
  ENTREGADO: "Proyecto entregado",
} as const;

export type EstadoProyectoValue = (typeof ESTADO_PROYECTO)[keyof typeof ESTADO_PROYECTO];

const LEGACY_ESTADO_MAP: Record<string, EstadoProyectoValue> = {
  "En proceso": ESTADO_PROYECTO.EN_PROCESO,
  Prospecto: ESTADO_PROYECTO.EN_PROCESO,
  "Completado/Entregado": ESTADO_PROYECTO.ENTREGADO,
};

/** Normaliza valores guardados (incluye etiquetas antiguas). */
export function normalizeEstadoProyecto(raw: unknown): EstadoProyectoValue {
  const t = typeof raw === "string" ? raw.trim() : "";
  if (!t) return ESTADO_PROYECTO.EN_PROCESO;
  if (t === ESTADO_PROYECTO.EN_PROCESO || t === ESTADO_PROYECTO.CONFIRMADO || t === ESTADO_PROYECTO.ENTREGADO) {
    return t;
  }
  return LEGACY_ESTADO_MAP[t] ?? ESTADO_PROYECTO.EN_PROCESO;
}

export function isProyectoEntregado(estado: unknown): boolean {
  return normalizeEstadoProyecto(estado) === ESTADO_PROYECTO.ENTREGADO;
}

/**
 * Portal `/seguimiento` completo cuando:
 * - Se pulsó «Confirmar cliente» en cualquier etapa del tablero, o
 * - La tarjeta ya está en columna Seguimiento (`contrato`) y no está descartada.
 *
 * Descartado en Seguimiento → vista limitada (prospecto).
 */
export function isClienteConfirmadoSegunKanban(stage: unknown, followUpStatus: unknown): boolean {
  if (followUpStatus === "confirmado") return true;

  const s = typeof stage === "string" ? stage : "";
  if (s === "contrato" && followUpStatus !== "descartado") return true;

  return false;
}

/** Prospecto mientras no cumpla la condición de confirmación en Kanban. */
export function computeIsProspectFromKanban(stage: unknown, followUpStatus: unknown): boolean {
  return !isClienteConfirmadoSegunKanban(stage, followUpStatus);
}

function resolveIsProspectFromParsed(parsed: Record<string, unknown>): boolean {
  const hasKanbanSync =
    typeof parsed.kanbanStage === "string" || typeof parsed.kanbanFollowUpStatus === "string";
  if (hasKanbanSync) {
    return computeIsProspectFromKanban(parsed.kanbanStage, parsed.kanbanFollowUpStatus);
  }
  return Boolean(parsed.isProspect);
}

/**
 * Si el JSON no trae snapshot de Kanban, intenta enlazarlo con la tarea actual por `codigoProyecto`.
 */
export function enrichSeguimientoParsedWithKanbanIfMissing(
  parsed: Record<string, unknown>,
  tasks: KanbanTask[] | null | undefined,
): Record<string, unknown> {
  if (
    typeof parsed.kanbanStage === "string" &&
    typeof parsed.kanbanFollowUpStatus === "string"
  ) {
    return parsed;
  }
  const codigo = String(parsed.codigo ?? "").trim();
  if (!codigo || !tasks?.length) return parsed;
  const task = tasks.find((t) => (t.codigoProyecto ?? "").trim() === codigo);
  if (!task) return parsed;
  return {
    ...parsed,
    kanbanStage: task.stage,
    kanbanFollowUpStatus: task.followUpStatus ?? "pendiente",
  };
}

export const TIMELINE_STEPS = [
  "Diseño Aprobado",
  "Materiales en Taller",
  "Corte CNC",
  "Ensamble",
  "Instalación Final",
] as const;

export type TimelineStep = (typeof TIMELINE_STEPS)[number];

export type SeguimientoPago = {
  amount: number;
  date?: string;
  receiptLabel?: string;
  /** Data URL o ruta pública; vacío = aún no hay comprobante. */
  receiptImage?: string;
};

export type SeguimientoPagos = {
  anticipo: SeguimientoPago;
  segundoPago: SeguimientoPago;
  liquidacion: SeguimientoPago;
};

export function defaultPagosForInversion(inversion: number): SeguimientoPagos {
  const t = Math.max(0, Math.round(Number(inversion) || 0));
  const mk = (amount: number): SeguimientoPago => ({
    amount,
    date: "",
    receiptLabel: "Ver recibo",
    receiptImage: "",
  });
  if (t === 0) {
    return { anticipo: mk(0), segundoPago: mk(0), liquidacion: mk(0) };
  }
  const a = Math.floor(t / 3);
  const b = Math.floor(t / 3);
  const c = t - a - b;
  return { anticipo: mk(a), segundoPago: mk(b), liquidacion: mk(c) };
}

function coercePago(raw: unknown, fallback: SeguimientoPago): SeguimientoPago {
  if (!raw || typeof raw !== "object") return fallback;
  const r = raw as Record<string, unknown>;
  return {
    amount: Math.max(0, Math.round(Number(r.amount) || 0)),
    date: typeof r.date === "string" ? r.date : "",
    receiptLabel: typeof r.receiptLabel === "string" ? r.receiptLabel : "Ver recibo",
    receiptImage: typeof r.receiptImage === "string" ? r.receiptImage : "",
  };
}

/** Conserva montos/fecha/recibo ya capturados; no reparte la inversión en tercios. */
export function mergePagosPreservingReceipts(previous: unknown, _inversion?: number): SeguimientoPagos {
  const zeroPagos = defaultPagosForInversion(0);
  if (!previous || typeof previous !== "object") return zeroPagos;
  const p = previous as Record<string, unknown>;
  return {
    anticipo: coercePago(p.anticipo, zeroPagos.anticipo),
    segundoPago: coercePago(p.segundoPago, zeroPagos.segundoPago),
    liquidacion: coercePago(p.liquidacion, zeroPagos.liquidacion),
  };
}

/** Detecta montos generados por el reparto automático legado (tercios de la inversión). */
export function pagosMatchDefaultInversionSplit(inversion: number, pagos: SeguimientoPagos): boolean {
  const t = Math.max(0, Math.round(Number(inversion) || 0));
  if (t <= 0) return false;
  const auto = defaultPagosForInversion(t);
  return (
    pagos.anticipo.amount === auto.anticipo.amount &&
    pagos.segundoPago.amount === auto.segundoPago.amount &&
    pagos.liquidacion.amount === auto.liquidacion.amount &&
    auto.anticipo.amount > 0
  );
}

export function normalizeEtapaForStorage(raw: unknown): TimelineStep {
  if (typeof raw === "string" && (TIMELINE_STEPS as readonly string[]).includes(raw)) {
    return raw as TimelineStep;
  }
  return TIMELINE_STEPS[0];
}

/** Hay comprobante o fecha de pago registrada. */
export function isPagoRegistrado(p: SeguimientoPago): boolean {
  return Boolean(
    (p.receiptImage && p.receiptImage.trim().length > 2) || (p.date && p.date.trim().length > 0),
  );
}

/** Proyecto tal como lo consume la vista `/seguimiento` (más campos opcionales desde el cotizador). */
export type SeguimientoClienteProject = {
  codigo: string;
  cliente: string;
  isProspect: boolean;
  /** Copiados del Kanban para calcular `isProspect` de forma determinista. */
  kanbanStage?: string;
  kanbanFollowUpStatus?: string;
  inversion: number;
  fechaInicio: string;
  fechaEntrega: string;
  garantiaInicio: string;
  estadoProyecto: string;
  etapaActual: TimelineStep;
  pagos: SeguimientoPagos;
  archivos: unknown[];
  cotizacionPreliminarImage: string;
  cotizacionFormalImage: string;
};

/**
 * Completa y sanea lo guardado en localStorage (sin datos de ejemplo: lo que no venga queda vacío o “Por definir”).
 */
export function mergeSeguimientoFromStorage(parsed: Record<string, unknown>): SeguimientoClienteProject {
  const pagosRaw = parsed.pagos;
  const zeroPagos = defaultPagosForInversion(0);
  let pagos: SeguimientoPagos;
  if (pagosRaw && typeof pagosRaw === "object") {
    const pr = pagosRaw as Record<string, unknown>;
    pagos = {
      anticipo: coercePago(pr.anticipo, zeroPagos.anticipo),
      segundoPago: coercePago(pr.segundoPago, zeroPagos.segundoPago),
      liquidacion: coercePago(pr.liquidacion, zeroPagos.liquidacion),
    };
  } else {
    pagos = zeroPagos;
  }

  let inversion = Math.max(0, Math.round(Number(parsed.inversion) || 0));
  const sumPagos =
    pagos.anticipo.amount + pagos.segundoPago.amount + pagos.liquidacion.amount;
  if (inversion === 0 && sumPagos > 0) inversion = sumPagos;
  /** No repartir la inversión en tercios automáticamente: los montos los capturan admin/empleado en el modal. */

  const codigo = String(parsed.codigo ?? "").trim() || "—";
  const cliente = String(parsed.cliente ?? "Cliente").trim() || "Cliente";

  return {
    ...parsed,
    codigo,
    cliente,
    isProspect: resolveIsProspectFromParsed(parsed),
    inversion,
    fechaInicio:
      typeof parsed.fechaInicio === "string" && parsed.fechaInicio.trim()
        ? parsed.fechaInicio
        : "Por definir",
    fechaEntrega:
      typeof parsed.fechaEntrega === "string" && parsed.fechaEntrega.trim()
        ? parsed.fechaEntrega
        : "Por definir",
    garantiaInicio: typeof parsed.garantiaInicio === "string" ? parsed.garantiaInicio : "",
    estadoProyecto: normalizeEstadoProyecto(parsed.estadoProyecto),
    etapaActual: normalizeEtapaForStorage(parsed.etapaActual),
    pagos,
    archivos: Array.isArray(parsed.archivos) ? parsed.archivos : [],
    cotizacionPreliminarImage:
      typeof parsed.cotizacionPreliminarImage === "string" ? parsed.cotizacionPreliminarImage : "",
    cotizacionFormalImage:
      typeof parsed.cotizacionFormalImage === "string" ? parsed.cotizacionFormalImage : "",
  } as SeguimientoClienteProject;
}

export function formatSeguimientoDateLong(d: Date = new Date()): string {
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Actualiza snapshot de Kanban en `kuche_project_*` y, si el cliente fue confirmado en el tablero,
 * pone `estadoProyecto` en «Cliente confirmado» (sin pisar «Proyecto entregado»).
 */
export function mergeKanbanSnapshotIntoSeguimientoRecord(
  parsed: Record<string, unknown>,
  task: Pick<KanbanTask, "stage" | "followUpStatus">,
): Record<string, unknown> {
  const next: Record<string, unknown> = {
    ...parsed,
    kanbanStage: task.stage,
    kanbanFollowUpStatus: task.followUpStatus ?? "pendiente",
  };
  const estadoActual = normalizeEstadoProyecto(parsed.estadoProyecto);
  if (task.followUpStatus === "confirmado" && estadoActual !== ESTADO_PROYECTO.ENTREGADO) {
    next.estadoProyecto = ESTADO_PROYECTO.CONFIRMADO;
  }
  return next;
}

/** Tras «Confirmar cliente» en cualquier columna del tablero. */
export function syncSeguimientoEstadoFromKanbanConfirm(
  task: Pick<KanbanTask, "codigoProyecto" | "project" | "title" | "stage" | "followUpStatus">,
): void {
  if (typeof window === "undefined") return;
  const code = task.codigoProyecto?.trim();
  if (!code || task.followUpStatus !== "confirmado") return;
  const key = `${seguimientoProjectStoragePrefix}${code}`;
  try {
    const raw = window.localStorage.getItem(key);
    const base = raw
      ? (JSON.parse(raw) as Record<string, unknown>)
      : {
          codigo: code,
          cliente: String(task.project ?? task.title ?? "Cliente").trim() || "Cliente",
        };
    const merged = mergeKanbanSnapshotIntoSeguimientoRecord(base, task);
    window.localStorage.setItem(key, JSON.stringify(merged));
  } catch {
    // ignore
  }
}
