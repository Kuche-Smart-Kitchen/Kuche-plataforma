import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type WorkshopWallRow = {
  wall: string;
  alias: string;
  type: string;
  measures: string;
};

type WorkshopItemRow = {
  category: string;
  item: string;
  measures: string;
  notes?: string;
};

type WorkshopNoteRow = {
  section: string;
  note: string;
};

export type LevantamientoWorkshopPdfInput = {
  client: string;
  projectType: string;
  location: string;
  generatedAtLabel: string;
  deliveryWeeksLabel: string;
  largo?: string;
  alto?: string;
  conIsla?: string;
  hastaTecho?: string;
  walls: WorkshopWallRow[];
  items: WorkshopItemRow[];
  notes: WorkshopNoteRow[];
};

const COLORS = {
  dark: [31, 41, 55] as const,
  muted: [100, 116, 139] as const,
  softFill: [248, 250, 252] as const,
  border: [226, 232, 240] as const,
};

function getFinalY(doc: jsPDF): number {
  return (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 0;
}

export async function buildLevantamientoWorkshopPdfDataUrl(
  input: LevantamientoWorkshopPdfInput,
): Promise<string> {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 42;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...COLORS.dark);
  doc.text("Hoja de taller - Levantamiento detallado", marginX, 44);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.text(input.generatedAtLabel, pageWidth - marginX, 44, { align: "right" });

  doc.setFontSize(10);
  doc.setTextColor(...COLORS.dark);
  doc.text(`${input.client} - ${input.projectType}`, marginX, 66);
  doc.setTextColor(...COLORS.muted);
  doc.text(input.location || "Sin ubicacion", marginX, 80);

  autoTable(doc, {
    startY: 96,
    theme: "grid",
    margin: { left: marginX, right: marginX },
    styles: {
      fontSize: 9,
      textColor: COLORS.dark,
      lineColor: COLORS.border,
      lineWidth: 0.5,
      cellPadding: 6,
    },
    columnStyles: {
      0: { fillColor: COLORS.softFill, fontStyle: "bold" },
    },
    body: [
      ["Entrega", input.deliveryWeeksLabel || "Por definir"],
      ["Largo (m)", input.largo?.trim() || "-"],
      ["Alto (m)", input.alto?.trim() || "-"],
      ["Con isla", input.conIsla || "Sin definir"],
      ["Hasta techo", input.hastaTecho || "Sin definir"],
    ],
  });

  const wallsStartY = getFinalY(doc) + 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.dark);
  doc.text("Medidas muro por muro", marginX, wallsStartY);

  autoTable(doc, {
    startY: wallsStartY + 8,
    head: [["Muro", "Alias", "Tipo", "Medidas"]],
    body:
      input.walls.length > 0
        ? input.walls.map((row) => [row.wall, row.alias, row.type, row.measures])
        : [["Sin muros capturados", "-", "-", "-"]],
    theme: "grid",
    margin: { left: marginX, right: marginX },
    styles: {
      fontSize: 8,
      textColor: COLORS.dark,
      lineColor: COLORS.border,
      lineWidth: 0.5,
      cellPadding: 5,
      valign: "top",
    },
    headStyles: { fillColor: COLORS.softFill, textColor: COLORS.dark, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 54 },
      1: { cellWidth: 48 },
      2: { cellWidth: 126 },
      3: { cellWidth: "auto" },
    },
  });

  let nextY = getFinalY(doc) + 18;
  if (nextY > pageHeight - 220) {
    doc.addPage();
    nextY = 48;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.dark);
  doc.text("Equipamiento y notas tecnicas", marginX, nextY);

  autoTable(doc, {
    startY: nextY + 8,
    head: [["Categoria", "Elemento", "Medidas", "Notas"]],
    body:
      input.items.length > 0
        ? input.items.map((row) => [row.category, row.item, row.measures, row.notes || "-"])
        : [["Sin seleccion", "-", "-", "-"]],
    theme: "grid",
    margin: { left: marginX, right: marginX },
    styles: {
      fontSize: 8,
      textColor: COLORS.dark,
      lineColor: COLORS.border,
      lineWidth: 0.5,
      cellPadding: 5,
      valign: "top",
    },
    headStyles: { fillColor: COLORS.softFill, textColor: COLORS.dark, fontStyle: "bold" },
  });

  nextY = getFinalY(doc) + 18;
  if (nextY > pageHeight - 120) {
    doc.addPage();
    nextY = 48;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.dark);
  doc.text("Observaciones por seccion", marginX, nextY);

  autoTable(doc, {
    startY: nextY + 8,
    head: [["Seccion", "Observacion"]],
    body:
      input.notes.length > 0
        ? input.notes.map((row) => [row.section, row.note])
        : [["General", "Sin observaciones adicionales"]],
    theme: "grid",
    margin: { left: marginX, right: marginX },
    styles: {
      fontSize: 8,
      textColor: COLORS.dark,
      lineColor: COLORS.border,
      lineWidth: 0.5,
      cellPadding: 5,
      valign: "top",
    },
    headStyles: { fillColor: COLORS.softFill, textColor: COLORS.dark, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 72 },
      1: { cellWidth: "auto" },
    },
  });

  const footerY = pageHeight - 24;
  doc.setDrawColor(...COLORS.border);
  doc.line(marginX, footerY - 8, pageWidth - marginX, footerY - 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.muted);
  doc.text("Kuche - Hoja de taller generada desde Levantamiento Detallado", marginX, footerY);

  const blob = doc.output("blob");
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function downloadPdfDataUrl(dataUrl: string, filename: string): void {
  if (typeof document === "undefined") return;
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
