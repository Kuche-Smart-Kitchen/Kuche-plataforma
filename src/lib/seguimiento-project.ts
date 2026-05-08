/**
 * Modelo y utilidades del proyecto de seguimiento del cliente (`kuche_project_${codigo}` en localStorage).
 */

import type { KanbanTask } from "@/lib/kanban";

/** Orden del embudo en el tablero. Las etapas que se añadan después de `contrato` deben ir al final. */
export const KANBAN_PIPELINE_STAGES = ["citas", "disenos", "cotizacion", "contrato"] as const;

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

/** Conserva montos/fecha/recibo ya capturados al recalcular parcialidades. */
export function mergePagosPreservingReceipts(
  previous: unknown,
  inversion: number,
): SeguimientoPagos {
  const fresh = defaultPagosForInversion(inversion);
  if (!previous || typeof previous !== "object") return fresh;
  const p = previous as Record<string, unknown>;
  const pick = (key: keyof SeguimientoPagos): SeguimientoPago => {
    const old = coercePago(p[key], fresh[key]);
    if (old.receiptImage?.trim() || old.date?.trim()) {
      return {
        ...fresh[key],
        ...old,
        amount: old.amount > 0 ? old.amount : fresh[key].amount,
      };
    }
    return fresh[key];
  };
  return {
    anticipo: pick("anticipo"),
    segundoPago: pick("segundoPago"),
    liquidacion: pick("liquidacion"),
  };
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
    estadoProyecto:
      typeof parsed.estadoProyecto === "string" && parsed.estadoProyecto.trim()
        ? parsed.estadoProyecto
        : "En proceso",
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
