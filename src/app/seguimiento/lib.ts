import type { CotizacionFormalData, PreliminarData } from "@/lib/kanban";
import { parseDeliveryWeeksRangeFromLabel } from "@/lib/delivery-weeks";
import type { SeguimientoClienteProject } from "@/lib/seguimiento-project";

export type SeguimientoProject = SeguimientoClienteProject & {
  preliminarData?: PreliminarData;
  cotizacionFormalData?: CotizacionFormalData;
  preliminarCotizaciones?: PreliminarData[];
  cotizacionesFormales?: CotizacionFormalData[];
};

export type SeguimientoArchivo = {
  id: string;
  name: string;
  type: string;
  src?: string;
  indexedPdfKey?: string;
  isGeneratedPdf?: boolean;
};

export const LEVANTAMIENTO_ARCHIVO_ID = "pdf-levantamiento-detallado";

const MONTHS_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const asText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const normalizeSeguimientoFile = (raw: unknown, index: number): SeguimientoArchivo | null => {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;

  const name = asText(row.name) || asText(row.nombre);
  const type = asText(row.type) || asText(row.tipo);
  const src = asText(row.src) || asText(row.url);
  const indexedPdfKey = asText(row.indexedPdfKey);
  const id = asText(row.id) || asText(row._id) || `${name || "file"}-${index}`;

  if (!name && !src && !indexedPdfKey) return null;

  return {
    id,
    name: name || `Archivo ${index + 1}`,
    type: type || "otro",
    src: src || undefined,
    indexedPdfKey: indexedPdfKey || undefined,
    isGeneratedPdf: row.isGeneratedPdf === true || id === LEVANTAMIENTO_ARCHIVO_ID,
  };
};

/** Cotización con texto, importe o levantamiento capturado. Un objeto vacío no cuenta. */
export function preliminarHasRealData(value: unknown): value is PreliminarData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const textKeys = ["client", "projectType", "location", "cubierta", "frente", "herraje", "largo", "alto", "rangeLabel", "date"];
  const hasText = textKeys.some((key) => {
    const text = record[key];
    return typeof text === "string" && text.trim().length > 0 && !["—", "por definir", "sin definir"].includes(text.trim().toLowerCase());
  });
  const hasMoney = ["total", "subtotal", "iva", "costoBase", "costoMateriales"].some((key) => {
    const amount = typeof record[key] === "number" ? record[key] : Number(record[key]);
    return Number.isFinite(amount) && amount > 0;
  });
  const hasLevantamiento = Boolean(record.levantamiento && typeof record.levantamiento === "object");
  return hasText || hasMoney || hasLevantamiento;
}

export function resolvePreliminarForPdf(project: SeguimientoProject): PreliminarData | null {
  if (preliminarHasRealData(project.preliminarData)) return project.preliminarData;
  return project.preliminarCotizaciones?.find((item) => preliminarHasRealData(item)) ?? null;
}

export function withLevantamientoDetalladoArchivo<T extends { archivos?: unknown; preliminarData?: unknown; preliminarCotizaciones?: unknown }>(
  project: T,
): T {
  const hasQuote =
    preliminarHasRealData(project.preliminarData) ||
    (Array.isArray(project.preliminarCotizaciones) && project.preliminarCotizaciones.some((item) => preliminarHasRealData(item)));
  const archivos = (Array.isArray(project.archivos) ? [...project.archivos] : []).filter(
    (file) => !file || typeof file !== "object" ? false : !isPlaceholderPreliminarArchivo(file as { id?: unknown; name?: unknown; nombre?: unknown }),
  );
  if (!hasQuote) return { ...project, archivos };
  const alreadyListed = archivos.some((file) => {
    if (!file || typeof file !== "object") return false;
    const row = file as Record<string, unknown>;
    return row.id === LEVANTAMIENTO_ARCHIVO_ID || row.isGeneratedPdf === true;
  });
  if (alreadyListed) return { ...project, archivos };
  archivos.push({
    id: LEVANTAMIENTO_ARCHIVO_ID,
    nombre: "Levantamiento Detallado.pdf",
    name: "Levantamiento Detallado.pdf",
    type: "pdf",
    tipo: "pdf",
    isGeneratedPdf: true,
  });
  return { ...project, archivos };
}

function parseFlexibleDate(value: string): Date | null {
  const trimmed = value.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const date = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T12:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const numeric = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (numeric) {
    const date = new Date(Number(numeric[3]), Number(numeric[2]) - 1, Number(numeric[1]), 12);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const long = trimmed
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .match(/(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})/);
  if (long) {
    const month = MONTHS_ES.indexOf(long[2]);
    if (month >= 0) {
      const date = new Date(Number(long[3]), month, Number(long[1]), 12);
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }
  return null;
}

function sameCalendarDay(left: string, right: string): boolean {
  const start = parseFlexibleDate(left);
  const end = parseFlexibleDate(right);
  if (!start || !end) return false;
  return start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth() && start.getDate() === end.getDate();
}

function weeksFromQuote(value: unknown): { min: number; max: number } | null {
  if (!value || typeof value !== "object") return null;
  const record = value as { rangeLabel?: unknown; date?: unknown };
  const rangeLabel = typeof record.rangeLabel === "string" ? record.rangeLabel : "";
  const dateLabel = typeof record.date === "string" ? record.date : "";
  return parseDeliveryWeeksRangeFromLabel(rangeLabel) ?? parseDeliveryWeeksRangeFromLabel(dateLabel);
}

function firstQuoteWeeks(values: unknown[] | undefined): { min: number; max: number } | null {
  if (!values) return null;
  for (const value of values) {
    const weeks = weeksFromQuote(value);
    if (weeks) return weeks;
  }
  return null;
}

function formatWeekWindow(start: Date, min: number, max: number): string {
  const format = (weeks: number) => {
    const date = new Date(start.getTime());
    date.setDate(date.getDate() + weeks * 7);
    return date.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  };
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  if (lo === hi) return format(lo);
  return `${format(lo)} – ${format(hi)}`;
}

/** Si la entrega copió el inicio, usa el plazo del levantamiento o proyecta de 8 a 11 semanas. */
export function resolveEntregaEstimada(project: SeguimientoProject): string {
  const inicio = project.fechaInicio?.trim() || "";
  const entrega = project.fechaEntrega?.trim() || "";
  if (!inicio || !entrega || inicio === "Por definir" || !sameCalendarDay(inicio, entrega)) {
    return entrega || "Por definir";
  }
  const weeks =
    weeksFromQuote(project.preliminarData) ??
    firstQuoteWeeks(project.preliminarCotizaciones) ??
    weeksFromQuote(project.cotizacionFormalData) ??
    firstQuoteWeeks(project.cotizacionesFormales) ??
    { min: 8, max: 11 };
  const start = parseFlexibleDate(inicio);
  if (!start) return entrega;
  return formatWeekWindow(start, weeks.min, weeks.max);
}

export function getPreliminarListFromProject(p: SeguimientoProject): PreliminarData[] {
  if (p.preliminarCotizaciones && p.preliminarCotizaciones.length > 0) return p.preliminarCotizaciones;
  return p.preliminarData ? [p.preliminarData] : [];
}

export function getFormalesListFromProject(p: SeguimientoProject): CotizacionFormalData[] {
  if (p.cotizacionesFormales && p.cotizacionesFormales.length > 0) return p.cotizacionesFormales;
  return p.cotizacionFormalData ? [p.cotizacionFormalData] : [];
}

const normalizeText = (value: string) =>
  value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/**
 * Chip fantasma del preliminar. Esos nombres e id no se pintan en Archivos,
 * tampoco cuando llegan sin una URL http(s) real.
 */
export function isPlaceholderPreliminarArchivo(file: {
  id?: unknown;
  name?: unknown;
  nombre?: unknown;
}): boolean {
  const name = String(file.name ?? file.nombre ?? "")
    .trim()
    .toLowerCase();
  const id = String(file.id ?? "")
    .trim()
    .toLowerCase();
  return (
    id === "preliminar-1" ||
    name === "levantamiento preliminar.pdf" ||
    name === "levantamiento preliminar"
  );
}

export function filterArchivosForCliente(archivos: unknown[] | undefined): SeguimientoArchivo[] {
  const all = archivos ?? [];
  return all
    .map((file, index) => normalizeSeguimientoFile(file, index))
    .filter((file): file is SeguimientoArchivo => Boolean(file))
    .filter((file) => {
      if (isPlaceholderPreliminarArchivo(file)) return false;
      if (typeof file.indexedPdfKey === "string" && file.indexedPdfKey.startsWith("workshop-")) {
        return false;
      }
      if (normalizeText(file.name).includes("hoja de taller")) return false;
      return true;
    });
}

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);

export const installments = [
  { key: "anticipo" as const, label: "Anticipo" },
  { key: "segundoPago" as const, label: "2do pago" },
  { key: "liquidacion" as const, label: "Liquidación" },
];

export const inversionPdfCtaPrimaryClass =
  "inline-flex max-w-full items-center justify-center rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold leading-tight text-white shadow-sm ring-1 ring-black/5 transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
export const inversionPdfCtaSecondaryClass =
  "inline-flex items-center justify-center rounded-full border border-primary/15 bg-white px-2.5 py-1 text-[11px] font-semibold leading-tight text-primary shadow-sm transition hover:border-accent/40 hover:bg-accent/5 hover:text-accent";
export const inversionPdfQuoteRowClass =
  "flex flex-row flex-wrap items-center gap-1.5 rounded-lg border border-primary/10 bg-primary/[0.02] px-2 py-1 sm:gap-2 sm:px-2.5";

export function getPdfButtonPrimaryLabelFromFileName(fileName: string) {
  const n = normalizeText(fileName);
  if (n.includes("levantamiento detallado")) return "Ver Levantamiento Detallado";
  if (n.includes("cotizacion formal")) return "Ver cotización formal";
  return "Ver PDF";
}

export function getPdfButtonSecondaryFromFileName(fileName: string) {
  const raw = fileName.replace(/\.pdf$/i, "").trim();
  const parts = raw.split("—");
  if (parts.length >= 2) return parts[parts.length - 1].trim();
  const dashParts = raw.split("-");
  if (dashParts.length >= 2) return dashParts[dashParts.length - 1].trim();
  return "";
}
