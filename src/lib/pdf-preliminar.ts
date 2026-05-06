import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import type { CotizacionFormalData, PreliminarData } from "@/lib/kanban";
import type { LevantamientoDetalle, MedidasCampos, WallMeasureFieldDef } from "@/lib/levantamiento-catalog";
import {
  APPLIANCE_ITEMS,
  applianceAppearsInPdf,
  applianceOtroAppearsInPdf,
  getWallMeasureFieldDefs,
  isWallSlotKey,
  LIGHTING_ITEMS,
  lightingAppearsInPdf,
  lightingOtroAppearsInPdf,
  medidasCamposTieneValor,
  normalizeLevantamientoDetalle,
  wallSlotKey,
  WALL_ITEMS,
  wallMeasureLetter,
  wallMeasuresTieneValor,
} from "@/lib/levantamiento-catalog";
import { getFormalPdf, resolveWorkshopPdfKeysToTry } from "@/lib/formal-pdf-storage";

/** Tiempo antes de revocar el object URL (la pestaña nueva debe terminar de cargar). */
const PDF_OBJECT_URL_TAB_MS = 120_000;

const BRAND_RED: [number, number, number] = [139, 28, 28]; // #8B1C1C
const TEXT_DARK: [number, number, number] = [51, 51, 51]; // #333333
const TEXT_MID: [number, number, number] = [102, 102, 102]; // #666666
const LINE_SOFT: [number, number, number] = [225, 225, 225];
const LINE_THIN = 0.5;
const MARGIN_PDF = 40;

/** Cabecera institucional (cotizador formal). */
const HEADER_BG: [number, number, number] = [26, 26, 26]; // #1A1A1A
const HEADER_H = 46;
const FOOTER_H = 42;
/** Y inicial del contenido bajo la cabecera oscura. */
const CONTENT_TOP = HEADER_H + 16;
/** Tras marca "Levantamiento · …" en página nueva: separa el breadcrumb del título siguiente. */
const Y_AFTER_CONTINUATION = CONTENT_TOP + 42;

/**
 * Espacio mínimo libre (pt) antes de pintar un bloque "título rojo + inicio de tabla" para evitar
 * huérfanos (cabecera de sección o fila de encabezado gris al pie sin cuerpo en la misma página).
 */
const MIN_SPACE_BEFORE_SECTION_TABLE = 72;
/** Espacio mínimo antes de título de pared + autoTable (título + margen + cabecera gris + ≥1 fila). */
const MIN_SPACE_BEFORE_WALL_TABLE = 92;
const FOOTER_TEXT_RGB: [number, number, number] = [150, 150, 150];
const LINE_TABLE: [number, number, number] = [220, 220, 220];
const ZEBRA_FILL: [number, number, number] = [248, 248, 248];
/** Encabezados de tabla autoTable (gris institucional, secundario al rojo de marca). */
const TABLE_HEAD_GRAY: [number, number, number] = [78, 78, 78];

const FOOTER_LINE =
  "Copal No. 303 Fracc. Vista Hermosa Tel. 618 101 7363 | cocinasinteligentesdgo@gmail.com";

function getPageH(doc: jsPDF): number {
  return doc.internal.pageSize.getHeight();
}

function getContentBottom(doc: jsPDF): number {
  return getPageH(doc) - FOOTER_H - 14;
}

/** Logo para cabecera PDF (base64 data URL). Solo en cliente. */
export async function fetchKucheLogoDataUrl(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/images/kuche-logo.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(typeof r.result === "string" ? r.result : null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Escala el logo previo al PDF (máx. acorde a la cabecera institucional). */
export async function getLogoFitSizeForPdf(dataUrl: string | null): Promise<{ w: number; h: number } | undefined> {
  if (!dataUrl || typeof window === "undefined") return undefined;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxW = 230;
      const maxH = 46;
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      if (!nw || !nh) {
        resolve({ w: 140, h: (140 * 28) / 100 });
        return;
      }
      const scale = Math.min(maxW / nw, maxH / nh);
      resolve({ w: nw * scale, h: nh * scale });
    };
    img.onerror = () => resolve({ w: 140, h: (140 * 28) / 100 });
    img.src = dataUrl;
  });
}

function fmtMoneyMx(n: number | undefined): string {
  if (n === undefined || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);
}

function financeFromPreliminar(data: PreliminarData) {
  const cb = data.costoBase;
  const cm = data.costoMateriales;
  const ci = data.costoIluminacion;
  const sub =
    data.subtotal ?? (cb != null && cm != null && ci != null ? cb + cm + ci : undefined);
  const iva = data.iva ?? (sub != null ? sub * 0.16 : undefined);
  const total = data.total ?? (sub != null ? sub * 1.16 : undefined);
  return { cb, cm, ci, sub, iva, total };
}

function safeText(v: unknown, fallback = "N/A"): string {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : fallback;
}

function fmtMedidas(m: MedidasCampos | undefined): string {
  if (!m) return "N/A";
  const a = safeText(m.ancho, "-");
  const al = safeText(m.alto, "-");
  const f = safeText(m.fondo, "-");
  return `${a} x ${al} x ${f} m`;
}

function drawHLine(doc: jsPDF, x1: number, x2: number, y: number) {
  doc.setDrawColor(...LINE_SOFT);
  doc.setLineWidth(LINE_THIN);
  doc.line(x1, y, x2, y);
}

function setText(doc: jsPDF, rgb: [number, number, number], size: number, style: "normal" | "bold" = "normal") {
  doc.setTextColor(...rgb);
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
}

/** Marca de continuación debajo de la cabecera (el bloque oscuro se aplica al final en todas las páginas). */
function addContinuationMark(doc: jsPDF, label: string) {
  const pageW = doc.internal.pageSize.getWidth();
  const x = MARGIN_PDF;
  const yLine = CONTENT_TOP + 2;
  doc.setDrawColor(...LINE_SOFT);
  doc.setLineWidth(LINE_THIN);
  doc.line(x, yLine, pageW - x, yLine);
  setText(doc, TEXT_MID, 8, "normal");
  doc.text(label, x, yLine + 16);
}

function drawInstitutionalHeader(
  doc: jsPDF,
  logoDataUrl: string | null,
  logoDisplay: { w: number; h: number } | undefined,
) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...HEADER_BG);
  doc.rect(0, 0, pageW, HEADER_H, "F");
  const maxLogoH = HEADER_H - 8;
  const maxLogoW = 230;
  if (logoDataUrl) {
    try {
      let lw = logoDisplay?.w ?? 100;
      let lh = logoDisplay?.h ?? 28;
      const scale = Math.min(maxLogoW / lw, maxLogoH / lh);
      lw *= scale;
      lh *= scale;
      doc.addImage(logoDataUrl, "PNG", MARGIN_PDF, (HEADER_H - lh) / 2, lw, lh);
    } catch {
      /* ignore */
    }
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("LEVANTAMIENTO", pageW - MARGIN_PDF, 16, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("ESTIMACIÓN PRELIMINAR", pageW - MARGIN_PDF, HEADER_H - 8, { align: "right" });
  doc.setTextColor(...TEXT_DARK);
}

function drawFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pageW = doc.internal.pageSize.getWidth();
  const ph = getPageH(doc);
  const yLine = ph - FOOTER_H + 10;
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.35);
  doc.line(MARGIN_PDF, yLine, pageW - MARGIN_PDF, yLine);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...FOOTER_TEXT_RGB);
  doc.text(FOOTER_LINE, pageW / 2, yLine + 12, { align: "center", maxWidth: pageW - MARGIN_PDF * 2 });
  doc.text(`Página ${pageNum} de ${totalPages}`, pageW - MARGIN_PDF, yLine + 12, { align: "right" });
  doc.setTextColor(...TEXT_DARK);
}

function applyHeaderFooterAllPages(
  doc: jsPDF,
  logoDataUrl: string | null,
  logoDisplay: { w: number; h: number } | undefined,
) {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    drawInstitutionalHeader(doc, logoDataUrl, logoDisplay);
    drawFooter(doc, i, n);
  }
}

/** Encabezado de sección con fondo rojo de marca y texto blanco (sin bordes). */
function brandSectionHeader(doc: jsPDF, text: string, x: number, y: number): number {
  const pageW = doc.internal.pageSize.getWidth();
  const marginRight = MARGIN_PDF;
  const w = pageW - x - marginRight;
  const padX = 10;
  const padY = 8;
  const lineH = 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(text, Math.max(40, w - padX * 2));
  const boxH = padY * 2 + lines.length * lineH;
  doc.setFillColor(...BRAND_RED);
  doc.rect(x, y, w, boxH, "F");
  doc.setTextColor(255, 255, 255);
  let ty = y + padY + 9;
  for (const line of lines) {
    doc.text(line, x + padX, ty);
    ty += lineH;
  }
  doc.setTextColor(...TEXT_DARK);
  return y + boxH + 12;
}

/**
 * Si no cabe `needed` (pt) hasta el pie útil, añade página y deja `y` bajo la marca de continuación.
 * Usar con umbrales altos antes de títulos de sección + tablas para evitar huérfanos.
 */
function ensureSpace(doc: jsPDF, y: number, needed: number, onNewPage: () => void): number {
  if (y + needed <= getContentBottom(doc)) return y;
  doc.addPage();
  onNewPage();
  return Y_AFTER_CONTINUATION;
}

function wallRowsForTable(wallId: string, measures: Record<string, string>): Array<[string, string, string]> {
  const defs = getWallMeasureFieldDefs(wallId);
  return defs.map((d, i) => [wallMeasureLetter(i), d.label, safeText(measures[d.key], "-")]);
}

function commentsLabelForKey(key: string): string {
  switch (key) {
    case "a":
      return "Notas de Accesos y Datos";
    case "b":
      return "Notas de Muros";
    case "c":
      return "Notas de Electrodomesticos";
    case "d":
      return "Notas de Materiales / Acabados";
    case "e":
      return "Notas de Iluminacion";
    default:
      return "Notas";
  }
}

/** Bloque editorial: datos del proyecto (2 columnas) + estimación. El logo va en la cabecera oscura (applyHeaderFooterAllPages). */
function addEditorialProjectBlock(doc: jsPDF, data: PreliminarData, lev: LevantamientoDetalle | undefined): number {
  const marginX = MARGIN_PDF;
  const pageW = doc.internal.pageSize.getWidth();
  const gap = 28;
  const colW = (pageW - marginX * 2 - gap) / 2;
  const leftX = marginX;
  const rightX = marginX + colW + gap;
  const rightEdge = marginX + colW * 2 + gap;
  const typeProyecto = safeText(data.projectType);
  const conIsla = lev?.conIsla === "si" ? " · Con isla" : lev?.conIsla === "no" ? " · Sin isla" : "";
  const fecha =
    safeText(data.date, "") ||
    new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  const fin = financeFromPreliminar(data);
  const lineH = 13;

  let y = CONTENT_TOP;

  const leftStack: { label: string; value: string }[] = [
    { label: "FECHA", value: fecha },
    { label: "TIPO DE PROYECTO", value: `${typeProyecto}${conIsla}` },
    { label: "CLIENTE", value: safeText(data.client, "—") },
    { label: "DIRECCIÓN", value: safeText(data.location, "—") },
  ];

  let yL = y;
  for (const row of leftStack) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...TEXT_MID);
    doc.text(row.label, leftX, yL);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...TEXT_DARK);
    const vLines = doc.splitTextToSize(row.value, colW);
    doc.text(vLines, leftX, yL + 10);
    yL += 10 + vLines.length * 11 + 8;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...TEXT_MID);
  doc.text("ACABADOS", leftX, yL);
  yL += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_DARK);
  doc.text(`Cubierta: ${safeText(data.cubierta, "—")}`, leftX, yL, { maxWidth: colW });
  yL += 12;
  doc.text(`Frente: ${safeText(data.frente, "—")}`, leftX, yL, { maxWidth: colW });
  yL += 12;
  doc.text(`Herrajes: ${safeText(data.herraje, "—")}`, leftX, yL, { maxWidth: colW });
  yL += 18;

  let yR = y;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...TEXT_MID);
  doc.text("ESTIMACIÓN", rightX, yR);
  yR += 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MID);
  doc.text("RANGO ESTIMADO", rightX, yR);
  yR += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...BRAND_RED);
  const rangeLines = doc.splitTextToSize(safeText(data.rangeLabel, "—"), colW);
  let yyRange = yR;
  for (const rl of rangeLines) {
    doc.text(rl, rightEdge, yyRange, { align: "right" });
    yyRange += 18;
  }
  yR = yyRange + 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MID);
  const labelX = rightX + colW - 72;
  doc.text("Subtotal", labelX, yR, { align: "right" });
  doc.setTextColor(...TEXT_DARK);
  doc.setFontSize(10);
  doc.text(fmtMoneyMx(fin.sub), rightEdge, yR, { align: "right" });
  yR += lineH;
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MID);
  doc.text("IVA (16%)", labelX, yR, { align: "right" });
  doc.setTextColor(...TEXT_DARK);
  doc.setFontSize(10);
  doc.text(fmtMoneyMx(fin.iva), rightEdge, yR, { align: "right" });
  yR += lineH + 4;
  doc.setDrawColor(...LINE_SOFT);
  doc.setLineWidth(LINE_THIN);
  doc.line(labelX - 24, yR - 4, rightEdge, yR - 4);
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MID);
  doc.text("Total", labelX, yR + 6, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...BRAND_RED);
  doc.text(fmtMoneyMx(fin.total), rightEdge, yR + 6, { align: "right" });
  yR += 22;

  const yEnd = Math.max(yL, yR) + 28;
  return yEnd;
}

function addFichaTecnica(doc: jsPDF, data: PreliminarData, lev: LevantamientoDetalle | undefined, startY: number): number {
  const marginX = MARGIN_PDF;
  const pageW = doc.internal.pageSize.getWidth();

  let y = startY + 20;
  y = ensureSpace(doc, y, 100, () => addContinuationMark(doc, "Levantamiento · especificaciones"));
  y = brandSectionHeader(doc, "Especificaciones para arquitectura e instalación", marginX, y);

  setText(doc, TEXT_DARK, 10, "bold");
  doc.text("Medidas generales", marginX, y);
  y += 16;

  const largoRaw = (lev?.largo ?? data.largo ?? "").trim();
  const altoRaw = (lev?.alto ?? data.alto ?? "").trim();
  const largoTxt = largoRaw || "—";
  const altoTxt = altoRaw || "—";
  setText(doc, TEXT_DARK, 9, "normal");
  doc.text(`Largo total: ${largoTxt} m   |   Alto total: ${altoTxt} m`, marginX, y, {
    maxWidth: pageW - marginX * 2,
  });
  y += 22;

  if (!lev) {
    setText(doc, TEXT_MID, 10, "normal");
    doc.text("Sin levantamiento detallado capturado.", marginX, y);
    return y + 18;
  }

  // Muros (salto de página si no cabe título rojo + al menos el inicio de la primera tabla)
  y = ensureSpace(doc, y, MIN_SPACE_BEFORE_SECTION_TABLE, () =>
    addContinuationMark(doc, "Levantamiento · especificaciones"),
  );
  y = brandSectionHeader(doc, "Muros", marginX, y);

  const slotWallKeys = Object.keys(lev.wallMeasures)
    .filter(isWallSlotKey)
    .sort((a, b) => Number(a.slice(5)) - Number(b.slice(5)));

  const wallsWithValuesCatalog = WALL_ITEMS.filter((w) => {
    const m = lev.wallMeasures[w.id];
    return m && wallMeasuresTieneValor(m);
  });

  const useSlotLayout = slotWallKeys.length > 0 || lev.wallSlotCount > 0;

  const slotRowsForPdf: Array<{ title: string; typeId: string; measures: Record<string, string>; label: string }> =
    [];
  if (useSlotLayout) {
    const n = Math.max(
      lev.wallSlotCount,
      slotWallKeys.length ? Math.max(...slotWallKeys.map((k) => Number(k.slice(5)))) + 1 : 0,
    );
    for (let i = 0; i < n; i++) {
      const key = wallSlotKey(i);
      const measures = lev.wallMeasures[key];
      if (!measures || !wallMeasuresTieneValor(measures)) continue;
      const typeId = (measures["__typeId"] ?? "").trim();
      if (!typeId) continue;
      const cat = WALL_ITEMS.find((w) => w.id === typeId);
      slotRowsForPdf.push({
        title: `Pared ${i + 1}`,
        typeId,
        measures,
        label: cat?.label ?? typeId,
      });
    }
  }

  if (
    (useSlotLayout ? slotRowsForPdf.length : wallsWithValuesCatalog.length) === 0 &&
    !(lev.wallOtro.descripcion.trim() || medidasCamposTieneValor(lev.wallOtro))
  ) {
    setText(doc, TEXT_MID, 10, "normal");
    doc.text("No se registraron medidas de muros.", marginX, y);
    y += 18;
  } else {
    const rows = useSlotLayout
      ? slotRowsForPdf.map((r) => ({ kind: "slot" as const, ...r }))
      : wallsWithValuesCatalog.map((w) => ({
          kind: "cat" as const,
          title: w.label,
          typeId: w.id,
          measures: lev.wallMeasures[w.id] ?? {},
          label: w.label,
        }));

    for (const row of rows) {
      y = ensureSpace(doc, y, MIN_SPACE_BEFORE_WALL_TABLE, () =>
        addContinuationMark(doc, "Levantamiento · especificaciones"),
      );
      setText(doc, TEXT_DARK, 11, "bold");
      doc.text(row.kind === "slot" ? `${row.title} - ${row.label}` : row.label, marginX, y);
      y += 14;

      const measures = row.measures;
      const tableStartY = y + 8;
      autoTable(doc, {
        startY: tableStartY,
        pageBreak: "auto",
        margin: { left: marginX, right: marginX, top: CONTENT_TOP, bottom: FOOTER_H + 12 },
        theme: "plain",
        head: [["Ref.", "Medida", "Valor (m)"]],
        body: wallRowsForTable(row.typeId, measures),
        styles: {
          font: "helvetica",
          fontSize: 8,
          textColor: TEXT_DARK,
          cellPadding: { top: 4, right: 5, bottom: 4, left: 5 },
          lineColor: LINE_TABLE,
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: TABLE_HEAD_GRAY,
          textColor: 255,
          fontStyle: "bold",
          fontSize: 8,
          cellPadding: { top: 6, right: 5, bottom: 6, left: 5 },
        },
        alternateRowStyles: { fillColor: ZEBRA_FILL },
        columnStyles: {
          0: { cellWidth: 36, textColor: TEXT_DARK, fontStyle: "bold" },
          1: { cellWidth: 300 },
          2: { halign: "right" as const },
        },
        didDrawCell: (d) => {
          if (d.section === "body") {
            doc.setDrawColor(...LINE_TABLE);
            doc.setLineWidth(0.1);
            doc.line(
              d.cell.x,
              d.cell.y + d.cell.height,
              d.cell.x + d.cell.width,
              d.cell.y + d.cell.height,
            );
          }
        },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
    }

    if (lev.wallOtro.descripcion.trim() || medidasCamposTieneValor(lev.wallOtro)) {
      y = ensureSpace(doc, y, 70, () => addContinuationMark(doc, "Levantamiento · especificaciones"));
      y += 6;
      setText(doc, TEXT_DARK, 11, "bold");
      doc.text("Otro muro / situacion especial", marginX, y);
      y += 14;
      setText(doc, TEXT_MID, 9, "normal");
      doc.text(`Descripcion: ${safeText(lev.wallOtro.descripcion, "(sin descripcion)")}`, marginX, y, {
        maxWidth: pageW - marginX * 2,
      });
      y += 14;
      setText(doc, TEXT_MID, 9, "normal");
      doc.text(`Medidas: ${fmtMedidas(lev.wallOtro)}`, marginX, y);
      y += 18;
    }
  }

  // Electrodomésticos e iluminación
  y = ensureSpace(doc, y, MIN_SPACE_BEFORE_SECTION_TABLE, () =>
    addContinuationMark(doc, "Levantamiento · especificaciones"),
  );
  y = brandSectionHeader(doc, "Electrodomésticos e iluminación", marginX, y);

  const appliances = APPLIANCE_ITEMS.filter((a) => applianceAppearsInPdf(lev, a.id));
  const lights = LIGHTING_ITEMS.filter((l) => lightingAppearsInPdf(lev, l.id));

  const rows: Array<[string, string, string, string]> = [];
  for (const a of appliances) {
    const m = lev.applianceMeasures[a.id];
    rows.push([`Electro - ${a.label}`, safeText(m?.ancho, "-"), safeText(m?.alto, "-"), safeText(m?.fondo, "-")]);
  }
  if (applianceOtroAppearsInPdf(lev)) {
    rows.push([`Electro - Otro: ${safeText(lev.applianceOtro.descripcion, "(sin descripcion)")}`, safeText(lev.applianceOtro.ancho, "-"), safeText(lev.applianceOtro.alto, "-"), safeText(lev.applianceOtro.fondo, "-")]);
  }
  for (const l of lights) {
    const m = lev.lightingMeasures[l.id];
    rows.push([`Luz - ${l.label}`, safeText(m?.ancho, "-"), safeText(m?.alto, "-"), safeText(m?.fondo, "-")]);
  }
  if (lightingOtroAppearsInPdf(lev)) {
    rows.push([`Luz - Otro: ${safeText(lev.lightingOtro.descripcion, "(sin descripcion)")}`, safeText(lev.lightingOtro.ancho, "-"), safeText(lev.lightingOtro.alto, "-"), safeText(lev.lightingOtro.fondo, "-")]);
  }

  if (rows.length === 0) {
    setText(doc, TEXT_MID, 10, "normal");
    doc.text("No se registraron electrodomesticos ni iluminacion.", marginX, y);
    return y + 18;
  }

  y = ensureSpace(doc, y, MIN_SPACE_BEFORE_WALL_TABLE, () =>
    addContinuationMark(doc, "Levantamiento · especificaciones"),
  );
  const electroTableStartY = y + 8;
  autoTable(doc, {
    startY: electroTableStartY,
    pageBreak: "auto",
    margin: { left: marginX, right: marginX, top: CONTENT_TOP, bottom: FOOTER_H + 12 },
    theme: "plain",
    head: [["Elemento", "Ancho", "Alto", "Fondo"]],
    body: rows,
    styles: {
      font: "helvetica",
      fontSize: 8,
      textColor: TEXT_DARK,
      cellPadding: { top: 4, right: 5, bottom: 4, left: 5 },
      lineColor: LINE_TABLE,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: TABLE_HEAD_GRAY,
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: { top: 6, right: 5, bottom: 6, left: 5 },
    },
    alternateRowStyles: { fillColor: ZEBRA_FILL },
    columnStyles: {
      0: { cellWidth: 310 },
      1: { halign: "right" as const, cellWidth: 68 },
      2: { halign: "right" as const, cellWidth: 68 },
      3: { halign: "right" as const, cellWidth: 68 },
    },
    didDrawCell: (d) => {
      if (d.section === "body") {
        doc.setDrawColor(...LINE_TABLE);
        doc.setLineWidth(0.1);
        doc.line(
          d.cell.x,
          d.cell.y + d.cell.height,
          d.cell.x + d.cell.width,
          d.cell.y + d.cell.height,
        );
      }
    },
  });
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
}

function addObservaciones(doc: jsPDF, lev: LevantamientoDetalle | undefined, startY: number): number {
  const marginX = MARGIN_PDF;
  const pageW = doc.internal.pageSize.getWidth();

  let y = startY + 20;
  y = ensureSpace(doc, y, 80, () => addContinuationMark(doc, "Levantamiento · observaciones"));

  if (!lev) {
    setText(doc, TEXT_MID, 9, "normal");
    doc.text("Sin observaciones capturadas.", marginX, y);
    return y + 16;
  }

  const entries = (Object.entries(lev.sectionComments ?? {}) as Array<[string, string]>)
    .map(([k, v]) => [k, (v ?? "").trim()] as const)
    .filter(([, v]) => Boolean(v));

  if (entries.length === 0) {
    setText(doc, TEXT_MID, 9, "normal");
    doc.text("Sin observaciones capturadas.", marginX, y);
    return y + 16;
  }

  y = brandSectionHeader(doc, "Observaciones de sitio", marginX, y);

  for (const [k, v] of entries) {
    y = ensureSpace(doc, y, 100, () => addContinuationMark(doc, "Levantamiento · observaciones"));
    y += 6;
    setText(doc, TEXT_DARK, 10, "bold");
    doc.text(commentsLabelForKey(k), marginX, y);
    y += 14;
    setText(doc, TEXT_DARK, 9, "normal");
    doc.text(v, marginX, y, { maxWidth: pageW - marginX * 2 });
    y += 16 + Math.min(72, Math.ceil((v.length / 95) * 11));
  }
  return y;
}

function addCondicionesEstimacion(doc: jsPDF, startY: number): void {
  const marginX = MARGIN_PDF;
  const pageW = doc.internal.pageSize.getWidth();
  let y = startY + 24;
  y = ensureSpace(doc, y, 160, () => addContinuationMark(doc, "Levantamiento · condiciones"));
  y = brandSectionHeader(doc, "CONDICIONES DE LA ESTIMACIÓN", marginX, y);

  const bullets: string[] = [
    "Este documento es una estimación preliminar basada en un levantamiento rápido.",
    "El rango de precio presentado es una guía y no representa el costo final del proyecto.",
    "El diseño, medidas finales y la cotización vinculante se presentarán tras el proceso de diseño.",
    "La selección de materiales, herrajes y electrodomésticos está sujeta a disponibilidad.",
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_DARK);
  for (const line of bullets) {
    const wrapped = doc.splitTextToSize(`• ${line}`, pageW - marginX * 2 - 10);
    y = ensureSpace(doc, y, wrapped.length * 12 + 10, () => addContinuationMark(doc, "Levantamiento · condiciones"));
    doc.text(wrapped, marginX + 4, y);
    y += wrapped.length * 11 + 8;
  }
}

function buildPreliminarJsPdf(
  data: PreliminarData,
  logoDataUrl: string | null,
  logoDisplay?: { w: number; h: number },
): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const lev = data.levantamiento ? normalizeLevantamientoDetalle(data.levantamiento) : undefined;
  let y = addEditorialProjectBlock(doc, data, lev);
  y = addFichaTecnica(doc, data, lev, y);
  y = addObservaciones(doc, lev, y);
  addCondicionesEstimacion(doc, y);
  applyHeaderFooterAllPages(doc, logoDataUrl, logoDisplay);
  return doc;
}

/** Genera el PDF preliminar (como Uint8Array) a partir de los datos guardados. Sin logo (sincronía). */
export function buildPreliminarPdf(data: PreliminarData): Uint8Array {
  const doc = buildPreliminarJsPdf(data, null);
  const ab = doc.output("arraybuffer");
  return new Uint8Array(ab);
}

/** Abre un PDF desde data URL o URL http (comprobantes / archivos de seguimiento). */
export function openPdfDataUrlOrUrlInNewTab(stored: string): void {
  openStoredPdfInNewTab(stored);
}

function openStoredPdfInNewTab(stored: string): void {
  void (async () => {
    if (!stored) return;
    try {
      if (stored.startsWith("data:")) {
        const res = await fetch(stored);
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const win = window.open(objectUrl, "_blank");
        if (!win) {
          URL.revokeObjectURL(objectUrl);
          window.alert(
            "El navegador bloqueó la nueva pestaña. Permite ventanas emergentes para este sitio e inténtalo de nuevo.",
          );
          return;
        }
        setTimeout(() => URL.revokeObjectURL(objectUrl), PDF_OBJECT_URL_TAB_MS);
        return;
      }
      const w = window.open(stored, "_blank", "noopener,noreferrer");
      if (!w && typeof window !== "undefined") {
        window.alert(
          "El navegador bloqueó la nueva pestaña. Permite ventanas emergentes para este sitio e inténtalo de nuevo.",
        );
      }
    } catch {
      try {
        const w = window.open(stored, "_blank");
        if (!w && typeof window !== "undefined") {
          window.alert(
            "El navegador bloqueó la nueva pestaña. Permite ventanas emergentes para este sitio e inténtalo de nuevo.",
          );
        }
      } catch {
        /* ignore */
      }
    }
  })();
}

/** Abre el PDF en una nueva pestaña. */
export function openPreliminarPdfInNewTab(data: PreliminarData): void {
  void (async () => {
    const logo = await fetchKucheLogoDataUrl();
    const logoFit = await getLogoFitSizeForPdf(logo);
    const doc = buildPreliminarJsPdf(data, logo, logoFit);
    const bytes = new Uint8Array(doc.output("arraybuffer"));
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
      URL.revokeObjectURL(url);
      return;
    }
    setTimeout(() => URL.revokeObjectURL(url), PDF_OBJECT_URL_TAB_MS);
  })();
}

/** Descarga el PDF con nombre sugerido. */
export function downloadPreliminarPdf(data: PreliminarData, filename?: string): void {
  void (async () => {
    const logo = await fetchKucheLogoDataUrl();
    const logoFit = await getLogoFitSizeForPdf(logo);
    const doc = buildPreliminarJsPdf(data, logo, logoFit);
    const bytes = new Uint8Array(doc.output("arraybuffer"));
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename ?? `levantamiento-detallado-${(data.client || "cliente").replace(/\s+/g, "-")}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  })();
}

/** Data URL del PDF preliminar (para guardar en IndexedDB y enlazar al seguimiento). */
export async function buildPreliminarPdfDataUrl(data: PreliminarData): Promise<string> {
  const logo = await fetchKucheLogoDataUrl();
  const logoFit = await getLogoFitSizeForPdf(logo);
  const doc = buildPreliminarJsPdf(data, logo, logoFit);
  return doc.output("datauristring");
}

/** Abre un PDF guardado en IndexedDB por clave (formal, taller o levantamiento-seguimiento). */
export function openPdfFromIndexedKey(key: string): void {
  getFormalPdf(key).then((url) => {
    if (url) {
      openStoredPdfInNewTab(url);
      return;
    }
    if (typeof window !== "undefined") {
      window.alert(
        "No se encontró el PDF en este navegador. Si lo subiste en otro dispositivo, vuelve a adjuntarlo desde «Editar estatus público» aquí.",
      );
    }
  });
}

/** Abre el PDF formal en una nueva pestaña. Busca en IndexedDB por formalPdfKey, o usa pdfDataUrl si existe; si no, genera el PDF preliminar como fallback. */
export function openFormalPdfInNewTab(data: CotizacionFormalData): void {
  if (data.pdfDataUrl) {
    openStoredPdfInNewTab(data.pdfDataUrl);
    return;
  }
  if (data.formalPdfKey) {
    getFormalPdf(data.formalPdfKey).then((url) => {
      if (url) openStoredPdfInNewTab(url);
      else openPreliminarPdfInNewTab(data);
    });
    return;
  }
  openPreliminarPdfInNewTab(data);
}

/** Descarga el PDF formal. Busca en IndexedDB por formalPdfKey, o usa pdfDataUrl si existe; si no, genera el PDF preliminar como fallback. */
export function downloadFormalPdf(data: CotizacionFormalData, filename?: string): void {
  if (data.pdfDataUrl) {
    const link = document.createElement("a");
    link.href = data.pdfDataUrl;
    link.download = filename ?? `cotizacion-formal-${(data.client || "cliente").replace(/\s+/g, "-")}.pdf`;
    link.click();
    return;
  }
  if (data.formalPdfKey) {
    getFormalPdf(data.formalPdfKey).then((url) => {
      if (url) {
        const link = document.createElement("a");
        link.href = url;
        link.download = filename ?? `cotizacion-formal-${(data.client || "cliente").replace(/\s+/g, "-")}.pdf`;
        link.click();
      } else {
        downloadPreliminarPdf(data, filename);
      }
    });
    return;
  }
  downloadPreliminarPdf(data, filename);
}

async function getFirstStoredWorkshopPdfUrl(data: CotizacionFormalData): Promise<string | null> {
  for (const key of resolveWorkshopPdfKeysToTry(data)) {
    const url = await getFormalPdf(key);
    if (url) return url;
  }
  return null;
}

/** Abre la hoja de taller guardada con la cotización formal (IndexedDB; prueba workshopPdfKey y clave emparejada desde formalPdfKey). */
export function openWorkshopPdfInNewTab(data: CotizacionFormalData): void {
  if (resolveWorkshopPdfKeysToTry(data).length === 0) return;
  void getFirstStoredWorkshopPdfUrl(data).then((url) => {
    if (url) openStoredPdfInNewTab(url);
    else window.alert("No se encontró la hoja de taller guardada en este dispositivo.");
  });
}

/** Descarga la hoja de taller (misma tienda IndexedDB que el PDF formal). */
export function downloadWorkshopPdf(data: CotizacionFormalData, filename?: string): void {
  if (resolveWorkshopPdfKeysToTry(data).length === 0) return;
  void getFirstStoredWorkshopPdfUrl(data).then((url) => {
    if (!url) {
      window.alert("No se encontró la hoja de taller guardada en este dispositivo.");
      return;
    }
    const link = document.createElement("a");
    link.href = url;
    link.download =
      filename ??
      `hoja-taller-${(data.client || "cliente").replace(/\s+/g, "-").toLowerCase()}.pdf`;
    link.click();
  });
}
