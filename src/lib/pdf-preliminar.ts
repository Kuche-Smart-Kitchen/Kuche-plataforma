import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import type { CotizacionFormalData, PreliminarData, PreliminarWallSpec } from "@/lib/kanban";
import { getFormalPdf } from "@/lib/formal-pdf-storage";
import {
  WALL_ITEMS,
  WALL_SLOT_META_TYPE,
  getWallMeasureFieldDefs,
  isWallSlotKey,
  wallMeasureLetter,
} from "@/lib/levantamiento-catalog";

type WallSection = {
  title: string;
  rows: Array<[string, string, string]>;
};

const COLOR = {
  black: [19, 19, 19] as const,
  darkGray: [76, 76, 76] as const,
  red: [149, 25, 28] as const,
  softGray: [235, 235, 235] as const,
  text: [35, 35, 35] as const,
  muted: [90, 90, 90] as const,
};

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);

const isEspesor = (label: string) => label.toLowerCase().includes("espesor");

const readLevantamientoWallSections = (data: PreliminarData): WallSection[] => {
  const lev = (data.levantamiento ?? {}) as {
    wallSlotCount?: number;
    wallMeasures?: Record<string, Record<string, string>>;
  };

  const wallMeasures = lev.wallMeasures ?? {};
  const count = Math.max(0, toNumber(lev.wallSlotCount));

  const orderedIndices =
    count > 0
      ? Array.from({ length: count }, (_, i) => i)
      : Object.keys(wallMeasures)
          .filter((k) => isWallSlotKey(k))
          .map((k) => Number(k.slice(5)))
          .filter((n) => Number.isFinite(n))
          .sort((a, b) => a - b);

  const sections: WallSection[] = [];

  for (const idx of orderedIndices) {
    const key = `wall-${idx}`;
    const slot = wallMeasures[key];
    if (!slot) continue;

    const wallId = (slot[WALL_SLOT_META_TYPE] ?? "").trim();
    const wallItem = wallId ? WALL_ITEMS.find((item) => item.id === wallId) : undefined;
    const defs = wallId
      ? getWallMeasureFieldDefs(wallId).filter((def) => !isEspesor(`${def.key} ${def.label}`))
      : [];

    const rows = defs
      .map((def, defIdx): [string, string, string] => {
        const raw = (slot[def.key] ?? "").trim();
        return [wallMeasureLetter(defIdx), def.label, raw || "-"];
      })
      .filter((row) => row[2] !== "-");

    if (!rows.length) continue;

    sections.push({
      title: `Pared ${idx + 1} - ${wallItem?.label ?? "Pared"}`,
      rows,
    });
  }

  return sections;
};

const readLegacyWallSections = (data: PreliminarData): WallSection[] => {
  const wallSpecs = Array.isArray(data.wallSpecs) ? (data.wallSpecs as PreliminarWallSpec[]) : [];
  return wallSpecs.map((wall, idx) => {
    const rows: Array<[string, string, string]> = [
      ["A", "Largo total del muro", String(wall.totalWidthCm / 100)],
      ["B", "Altura hasta techo", String(wall.totalHeightCm / 100)],
    ];

    if (wall.openingWidthCm) rows.push(["C", "Ancho de vano", String(wall.openingWidthCm / 100)]);
    if (wall.openingHeightCm) rows.push(["D", "Alto de vano", String(wall.openingHeightCm / 100)]);
    if (wall.leftSpanCm) rows.push(["E", "Distancia desde extremo", String(wall.leftSpanCm / 100)]);

    return {
      title: `Pared ${idx + 1}`,
      rows,
    };
  });
};

const getWallSections = (data: PreliminarData): WallSection[] => {
  const dynamic = readLevantamientoWallSections(data);
  if (dynamic.length) return dynamic;
  return readLegacyWallSections(data);
};

const drawTopHeader = (doc: jsPDF) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(...COLOR.black);
  doc.rect(0, 0, pageWidth, 48, "F");

  doc.setFillColor(255, 255, 255);
  doc.rect(36, 6, 40, 36, "F");
  doc.setTextColor(...COLOR.red);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("KUCHE", 40, 27);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(25);
  doc.text("LEVANTAMIENTO", pageWidth - 36, 18, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("ESTIMACION PRELIMINAR", pageWidth - 36, 35, { align: "right" });
};

const drawMetaBlock = (doc: jsPDF, data: PreliminarData) => {
  const leftX = 36;
  const rightX = 310;

  const subtotal = toNumber(data.subtotal);
  const iva = toNumber(data.iva);
  const total = toNumber(data.total);

  doc.setTextColor(...COLOR.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);

  doc.text("FECHA", leftX, 66);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(String(data.date || "Por definir"), leftX, 80);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("TIPO DE PROYECTO", leftX, 102);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(String(data.projectType || "Sin definir"), leftX, 116);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("CLIENTE", leftX, 138);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(String(data.client || "Sin nombre"), leftX, 152);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("DIRECCION", leftX, 174);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(String(data.location || "Por definir"), leftX, 188);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("ACABADOS", leftX, 210);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Cubierta: ${String(data.cubierta || "Sin definir")}`, leftX, 224);
  doc.text(`Frente: ${String(data.frente || "Sin definir")}`, leftX, 237);
  doc.text(`Herrajes: ${String(data.herraje || "Sin definir")}`, leftX, 250);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("ESTIMACION", rightX, 66);
  doc.setFontSize(13);
  doc.text("RANGO ESTIMADO", rightX, 82);

  doc.setTextColor(...COLOR.red);
  doc.setFontSize(29);
  doc.text(String(data.rangeLabel || "-"), rightX, 108);

  doc.setTextColor(...COLOR.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Subtotal", rightX + 118, 128, { align: "right" });
  doc.text("IVA (16%)", rightX + 118, 145, { align: "right" });
  doc.text("Total", rightX + 118, 163, { align: "right" });

  doc.setTextColor(...COLOR.text);
  doc.setFont("helvetica", "normal");
  doc.text(formatCurrency(subtotal), rightX + 255, 128, { align: "right" });
  doc.text(formatCurrency(iva), rightX + 255, 145, { align: "right" });

  doc.setTextColor(...COLOR.red);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(formatCurrency(total), rightX + 255, 164, { align: "right" });
};

const drawSectionBar = (doc: jsPDF, y: number, text: string) => {
  doc.setFillColor(...COLOR.red);
  doc.rect(36, y, 540, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(text, 46, y + 17);
};

const buildPreliminarPdfDoc = (data: PreliminarData): jsPDF => {
  const doc = new jsPDF({ unit: "pt", format: "letter" });

  drawTopHeader(doc);
  drawMetaBlock(doc, data);

  drawSectionBar(doc, 302, "Especificaciones para arquitectura e instalacion");

  const largo = String(data.largo || "0");
  const alto = String(data.alto || "0");

  doc.setTextColor(...COLOR.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Medidas generales", 36, 348);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Largo total: ${largo} m   |   Alto total: ${alto} m`, 36, 366);

  drawSectionBar(doc, 388, "Muros");

  const sections = getWallSections(data);
  let cursorY = 430;

  if (!sections.length) {
    doc.setTextColor(...COLOR.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Sin medidas de muros capturadas.", 36, cursorY);
    return doc;
  }

  for (const section of sections) {
    if (cursorY > 720) {
      doc.addPage();
      cursorY = 48;
    }

    doc.setTextColor(...COLOR.text);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(section.title, 36, cursorY);

    autoTable(doc, {
      startY: cursorY + 10,
      margin: { left: 36, right: 36 },
      head: [["Ref.", "Medida", "Valor (m)"]],
      body: section.rows,
      styles: {
        font: "helvetica",
        fontSize: 9,
        textColor: [35, 35, 35],
        lineColor: [190, 190, 190],
        lineWidth: 0.6,
      },
      headStyles: {
        fillColor: COLOR.darkGray,
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 300 },
        2: { cellWidth: 140, halign: "right" },
      },
      alternateRowStyles: {
        fillColor: COLOR.softGray,
      },
    });

    const finalY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? cursorY + 10;
    cursorY = finalY + 24;
  }

  return doc;
};

/** Genera el PDF de cotizacion preliminar (estilo levantamiento detallado). */
export function buildPreliminarPdf(data: PreliminarData): string {
  return buildPreliminarPdfDoc(data).output();
}

/** Data URL del PDF para persistencia temporal/subida. */
export function buildPreliminarPdfDataUrl(data: PreliminarData): string {
  return buildPreliminarPdfDoc(data).output("datauristring");
}

const openRemotePdf = (url: string): void => {
  window.open(url, "_blank", "noopener,noreferrer");
};

/** Abre el PDF en una nueva pestaña. */
export function openPreliminarPdfInNewTab(data: PreliminarData): void {
  if (data.levantamientoPdfUrl) {
    openRemotePdf(data.levantamientoPdfUrl);
    return;
  }
  const blob = buildPreliminarPdfDoc(data).output("blob");
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  URL.revokeObjectURL(url);
}

/** Descarga el PDF con nombre sugerido. */
export function downloadPreliminarPdf(data: PreliminarData, filename?: string): void {
  if (data.levantamientoPdfUrl) {
    const link = document.createElement("a");
    link.href = data.levantamientoPdfUrl;
    link.download = filename ?? `cotizacion-preliminar-${(data.client || "cliente").replace(/\s+/g, "-")}.pdf`;
    link.click();
    return;
  }
  const blob = buildPreliminarPdfDoc(data).output("blob");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename ?? `cotizacion-preliminar-${(data.client || "cliente").replace(/\s+/g, "-")}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Abre el PDF formal en una nueva pestaña. */
export function openFormalPdfInNewTab(data: CotizacionFormalData): void {
  if (data.formalPdfUrl) {
    openRemotePdf(data.formalPdfUrl);
    return;
  }
  if (data.pdfDataUrl) {
    window.open(data.pdfDataUrl, "_blank", "noopener,noreferrer");
    return;
  }
  if (data.formalPdfKey) {
    getFormalPdf(data.formalPdfKey).then((url) => {
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else openPreliminarPdfInNewTab(data);
    });
    return;
  }
  openPreliminarPdfInNewTab(data);
}

/** Descarga el PDF formal. */
export function downloadFormalPdf(data: CotizacionFormalData, filename?: string): void {
  if (data.formalPdfUrl) {
    const link = document.createElement("a");
    link.href = data.formalPdfUrl;
    link.download = filename ?? `cotizacion-formal-${(data.client || "cliente").replace(/\s+/g, "-")}.pdf`;
    link.click();
    return;
  }
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
