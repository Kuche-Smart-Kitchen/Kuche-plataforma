import type { CotizacionFormalData, PreliminarData } from "@/lib/kanban";
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
};

const asText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const normalizeText = (value: string) =>
  value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

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
  };
};

export function getPreliminarListFromProject(project: SeguimientoProject): PreliminarData[] {
  if (project.preliminarCotizaciones && project.preliminarCotizaciones.length > 0) {
    return project.preliminarCotizaciones;
  }
  return project.preliminarData ? [project.preliminarData] : [];
}

export function getFormalesListFromProject(project: SeguimientoProject): CotizacionFormalData[] {
  if (project.cotizacionesFormales && project.cotizacionesFormales.length > 0) {
    return project.cotizacionesFormales;
  }
  return project.cotizacionFormalData ? [project.cotizacionFormalData] : [];
}

export function filterArchivosForCliente(archivos: unknown[] | undefined): SeguimientoArchivo[] {
  const all = archivos ?? [];

  return all
    .map((file, index) => normalizeSeguimientoFile(file, index))
    .filter((file): file is SeguimientoArchivo => Boolean(file))
    .filter((file) => {
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
  { key: "liquidacion" as const, label: "Liquidacion" },
];

export const inversionPdfCtaPrimaryClass =
  "inline-flex max-w-full items-center justify-center rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold leading-tight text-white shadow-sm ring-1 ring-black/5 transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
export const inversionPdfCtaSecondaryClass =
  "inline-flex items-center justify-center rounded-full border border-primary/15 bg-white px-2.5 py-1 text-[11px] font-semibold leading-tight text-primary shadow-sm transition hover:border-accent/40 hover:bg-accent/5 hover:text-accent";
export const inversionPdfQuoteRowClass =
  "flex flex-row flex-wrap items-center gap-1.5 rounded-lg border border-primary/10 bg-primary/[0.02] px-2 py-1 sm:gap-2 sm:px-2.5";

export function getPdfButtonPrimaryLabelFromFileName(fileName: string) {
  const normalized = normalizeText(fileName);
  if (normalized.includes("levantamiento detallado")) return "Ver Levantamiento Detallado";
  if (normalized.includes("cotizacion formal")) return "Ver cotizacion formal";
  return "Ver PDF";
}

export function getPdfButtonSecondaryFromFileName(fileName: string) {
  const raw = fileName.replace(/\.pdf$/i, "").trim();
  const emDashSplit = raw.split("—");
  if (emDashSplit.length >= 2) return emDashSplit[emDashSplit.length - 1].trim();
  const dashSplit = raw.split("-");
  if (dashSplit.length >= 2) return dashSplit[dashSplit.length - 1].trim();
  return "";
}
