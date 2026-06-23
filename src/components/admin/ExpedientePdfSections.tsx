"use client";

import { Eye, Download } from "lucide-react";
import {
  getPreliminarList,
  getCotizacionesFormalesList,
  type KanbanTask,
} from "@/lib/kanban";
import {
  openPreliminarPdfInNewTab,
  downloadPreliminarPdf,
  openFormalPdfInNewTab,
  downloadFormalPdf,
  openWorkshopPdfInNewTab,
  downloadWorkshopPdf,
} from "@/lib/pdf-preliminar";
import { hasWorkshopPdfActions } from "@/lib/formal-pdf-storage";

export type ExpedientePdfSectionsProps = {
  client: KanbanTask;
  /** Adds top border + padding when stacked below other panel sections (ej. contrato en confirmados). */
  withTopDivider?: boolean;
};

/**
 * Bloques compartidos: levantamiento detallado (PDF) y cotización formal + hoja de taller.
 * Usado en expedientes de Clientes confirmados y Proyectos inactivos.
 */
export function ExpedientePdfSections({ client, withTopDivider = false }: ExpedientePdfSectionsProps) {
  const wrapperClass = withTopDivider
    ? "space-y-4 border-t border-gray-100 pt-6"
    : "space-y-4";

  return (
    <div className={wrapperClass}>
      {getPreliminarList(client).length > 0 ? (
        <div className="rounded-2xl bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
            Levantamiento detallado{" "}
            {getPreliminarList(client).length > 1 ? `(${getPreliminarList(client).length})` : ""}
          </p>
          <div className="mt-3 space-y-2">
            {getPreliminarList(client).map((data, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2 rounded-xl bg-white/80 px-3 py-2.5">
                <span className="text-xs font-medium text-emerald-800">{data.projectType}</span>
                <button
                  type="button"
                  onClick={() => openPreliminarPdfInNewTab(data)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  <Eye className="h-3 w-3" />
                  Ver PDF
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadPreliminarPdf(
                      data,
                      `levantamiento-detallado-${(data.projectType || "proyecto").replace(/\s+/g, "-")}-${client.project.replace(/\s+/g, "-")}.pdf`,
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  <Download className="h-3 w-3" />
                  Descargar PDF
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {getCotizacionesFormalesList(client).length > 0 ? (
        <div className="rounded-2xl bg-violet-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-800">
            Cotización formal + hoja de taller{" "}
            {getCotizacionesFormalesList(client).length > 1
              ? `(${getCotizacionesFormalesList(client).length})`
              : ""}
          </p>
          <div className="mt-3 space-y-2">
            {getCotizacionesFormalesList(client).map((data, idx) => (
              <div key={idx} className="space-y-2 rounded-xl bg-white/80 px-3 py-2.5">
                <span className="text-xs font-medium text-violet-800">{data.projectType}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-600/80">Formal</span>
                  <button
                    type="button"
                    onClick={() => openFormalPdfInNewTab(data)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                  >
                    <Eye className="h-3 w-3" />
                    Ver
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadFormalPdf(
                        data,
                        `cotizacion-formal-${(data.projectType || "proyecto").replace(/\s+/g, "-")}-${client.project.replace(/\s+/g, "-")}.pdf`,
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                  >
                    <Download className="h-3 w-3" />
                    Descargar
                  </button>
                  {hasWorkshopPdfActions(data) ? (
                    <>
                      <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-violet-600/80">
                        Taller
                      </span>
                      <button
                        type="button"
                        onClick={() => openWorkshopPdfInNewTab(data)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                      >
                        <Eye className="h-3 w-3" />
                        Ver
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          downloadWorkshopPdf(
                            data,
                            `hoja-taller-${(data.projectType || "proyecto").replace(/\s+/g, "-")}-${client.project.replace(/\s+/g, "-")}.pdf`,
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                      >
                        <Download className="h-3 w-3" />
                        Descargar
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {getPreliminarList(client).length === 0 && getCotizacionesFormalesList(client).length === 0 ? (
        <p className="text-sm text-secondary">Sin cotizaciones PDF en esta tarjeta.</p>
      ) : null}
    </div>
  );
}
