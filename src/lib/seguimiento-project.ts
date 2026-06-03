/**
 * Modelo y utilidades del proyecto de seguimiento del cliente (`kuche_project_${codigo}` en localStorage).
 */

import type { CotizacionFormalData, PreliminarData, TaskStage, TaskStatus } from "@/lib/kanban";

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

export function defaultPagosForInversion(_inversion: number): SeguimientoPagos {
  const mk = (amount: number): SeguimientoPago => ({
    amount,
    date: "",
    receiptLabel: "Ver recibo",
    receiptImage: "",
  });
  return { anticipo: mk(0), segundoPago: mk(0), liquidacion: mk(0) };
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
  clienteId?: string;
  clienteRef?: string;
  followUpStatus?: "pendiente" | "confirmado" | "inactivo";
  clienteMeta?: {
    nombre?: string;
    correo?: string;
    telefono?: string;
  };
  cliente: string;
  projectType?: string;
  location?: string;
  isProspect: boolean;
  inversion: number;
  fechaInicio: string;
  fechaEntrega: string;
  garantiaInicio: string;
  estadoProyecto: string;
  stage?: TaskStage;
  status?: TaskStatus;
  sourceType?: "cita" | "diseno" | null;
  notes?: string;
  etapaActual: TimelineStep;
  pagos: SeguimientoPagos;
  archivos: unknown[];
  cotizacionPreliminarImage: string;
  cotizacionFormalImage: string;
  cita?: {
    fechaAgendada?: string;
    nombreCliente?: string;
    correoCliente?: string;
    telefonoCliente?: string;
    ubicacion?: string;
    informacionAdicional?: string;
  };
  visita?: {
    fechaProgramada?: string;
    aprobadaPorAdmin?: boolean;
    aprobadaPorCliente?: boolean;
  };
  preliminarData?: PreliminarData;
  cotizacionFormalData?: CotizacionFormalData;
  preliminarCotizaciones?: PreliminarData[];
  cotizacionesFormales?: CotizacionFormalData[];
};

/**
 * Completa y sanea lo guardado en localStorage (sin datos de ejemplo: lo que no venga queda vacío o “Por definir”).
 */
export function mergeSeguimientoFromStorage(parsed: Record<string, unknown>): SeguimientoClienteProject {
  const normalizeBooleanLike = (value: unknown): boolean | undefined => {
    if (typeof value === "boolean") return value;
    if (typeof value !== "string") return undefined;

    const normalized = value.trim().toLowerCase();
    if (["true", "1", "si", "sí", "yes"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
    return undefined;
  };

  const normalizeFollowUpStatus = (value: unknown): SeguimientoClienteProject["followUpStatus"] | undefined => {
    if (typeof value !== "string") return undefined;
    const normalized = value.trim().toLowerCase();
    if (normalized === "confirmado") return "confirmado";
    if (normalized === "inactivo" || normalized === "descartado") return "inactivo";
    if (normalized === "pendiente") return "pendiente";
    return undefined;
  };

  const deriveIsProspect = (): boolean => {
    const explicit = normalizeBooleanLike(parsed.isProspect);
    const followUpStatus = normalizeFollowUpStatus(
      parsed.followUpStatus ?? parsed.estadoSeguimiento ?? parsed.seguimiento,
    );

    if (followUpStatus === "confirmado") return false;
    if (followUpStatus === "pendiente") return true;
    if (explicit !== undefined) return explicit;

    const stage = typeof parsed.stage === "string" ? parsed.stage.trim().toLowerCase() : "";
    if (stage === "contrato") return false;

    return false;
  };

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

  const codigo = String(parsed.codigo ?? "").trim() || "—";
  const cliente = String(parsed.cliente ?? "Cliente").trim() || "Cliente";
  const clienteId = typeof parsed.clienteId === "string" ? parsed.clienteId.trim() : "";
  const clienteRef = typeof parsed.clienteRef === "string" ? parsed.clienteRef.trim() : "";
  const followUpStatus = normalizeFollowUpStatus(
    parsed.followUpStatus ?? parsed.estadoSeguimiento ?? parsed.seguimiento,
  );
  const clienteMetaRaw = parsed.clienteMeta && typeof parsed.clienteMeta === "object"
    ? (parsed.clienteMeta as Record<string, unknown>)
    : null;

  return {
    ...parsed,
    codigo,
    clienteId: clienteId || undefined,
    clienteRef: clienteRef || undefined,
    followUpStatus,
    clienteMeta: clienteMetaRaw
      ? {
          nombre: typeof clienteMetaRaw.nombre === "string" ? clienteMetaRaw.nombre : undefined,
          correo: typeof clienteMetaRaw.correo === "string" ? clienteMetaRaw.correo : undefined,
          telefono: typeof clienteMetaRaw.telefono === "string" ? clienteMetaRaw.telefono : undefined,
        }
      : undefined,
    cliente,
    projectType: typeof parsed.projectType === "string" ? parsed.projectType : undefined,
    location: typeof parsed.location === "string" ? parsed.location : undefined,
    isProspect: deriveIsProspect(),
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
    stage:
      typeof parsed.stage === "string" && ["citas", "disenos", "cotizacion", "contrato"].includes(parsed.stage)
        ? (parsed.stage as SeguimientoClienteProject["stage"])
        : undefined,
    status:
      typeof parsed.status === "string" && ["pendiente", "completada"].includes(parsed.status)
        ? (parsed.status as SeguimientoClienteProject["status"])
        : undefined,
    sourceType:
      parsed.sourceType === "cita" || parsed.sourceType === "diseno" ? parsed.sourceType : undefined,
    notes: typeof parsed.notes === "string" ? parsed.notes : undefined,
    etapaActual: normalizeEtapaForStorage(parsed.etapaActual),
    pagos,
    archivos: Array.isArray(parsed.archivos) ? parsed.archivos : [],
    cotizacionPreliminarImage:
      typeof parsed.cotizacionPreliminarImage === "string" ? parsed.cotizacionPreliminarImage : "",
    cotizacionFormalImage:
      typeof parsed.cotizacionFormalImage === "string" ? parsed.cotizacionFormalImage : "",
    cita: typeof parsed.cita === "object" && parsed.cita !== null ? (parsed.cita as SeguimientoClienteProject["cita"]) : undefined,
    visita: typeof parsed.visita === "object" && parsed.visita !== null ? (parsed.visita as SeguimientoClienteProject["visita"]) : undefined,
    preliminarData:
      typeof parsed.preliminarData === "object" && parsed.preliminarData !== null
        ? (parsed.preliminarData as PreliminarData)
        : undefined,
    cotizacionFormalData:
      typeof parsed.cotizacionFormalData === "object" && parsed.cotizacionFormalData !== null
        ? (parsed.cotizacionFormalData as CotizacionFormalData)
        : undefined,
    preliminarCotizaciones: Array.isArray(parsed.preliminarCotizaciones)
      ? (parsed.preliminarCotizaciones as PreliminarData[])
      : undefined,
    cotizacionesFormales: Array.isArray(parsed.cotizacionesFormales)
      ? (parsed.cotizacionesFormales as CotizacionFormalData[])
      : undefined,
  } as SeguimientoClienteProject;
}

export function formatSeguimientoDateLong(d: Date = new Date()): string {
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}
