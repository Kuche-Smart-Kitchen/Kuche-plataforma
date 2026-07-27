"use client";

import {
  openPreliminarPdfInNewTab,
  downloadPreliminarPdf,
  openPdfDataUrlOrUrlInNewTab,
} from "@/lib/pdf-preliminar";
import {
  isPdfDataUrl,
  resolveSeguimientoMediaRefForUi,
  SEGUIMIENTO_MEDIA_UNAVAILABLE_MSG,
} from "@/lib/seguimiento-storage-blobs";
import { SeguimientoArchivosSection } from "./SeguimientoArchivosSection";
import {
  formatCurrency,
  getPreliminarListFromProject,
  inversionPdfCtaPrimaryClass,
  inversionPdfCtaSecondaryClass,
  inversionPdfQuoteRowClass,
  filterArchivosForCliente,
  type SeguimientoProject,
} from "./lib";

type Props = {
  project: SeguimientoProject;
  onOpenImage: (name: string, src: string) => void;
};

export function ProspectDashboard({ project, onOpenImage }: Props) {
  const preliminarList = getPreliminarListFromProject(project);
  const quoteButtonLabel = "Ver Levantamiento Detallado";
  const quoteImageSrc = String(project.cotizacionPreliminarImage ?? "");
  const files = filterArchivosForCliente(project.archivos as unknown[] | undefined);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-secondary">Seguimiento</p>
        <h1 className="mt-2 text-3xl font-semibold">
          {project.nombre || project.titulo || project.cliente || project.codigo}
        </h1>
      </div>

      <div className="grid items-start gap-4 md:grid-cols-1">
        <div className="rounded-3xl border border-white bg-white p-6 shadow-lg">
          <p className="text-xs uppercase tracking-[0.2em] text-secondary">Inversión total</p>
          <p className="mt-3 text-xl font-semibold text-primary">
            {project.inversion > 0 ? formatCurrency(project.inversion) : "Por definir"}
          </p>
          {(() => {
            if (preliminarList.length > 0) {
              return (
                <div className="mt-3 flex w-full flex-row flex-wrap items-center gap-2">
                  {preliminarList.map((data, idx) => {
                    const filename = `levantamiento-detallado-${(data.projectType || "proyecto").replace(/\s+/g, "-")}-${(project.cliente || "cliente").replace(/\s+/g, "-")}.pdf`;
                    return (
                      <div key={idx} className={inversionPdfQuoteRowClass}>
                        <span className="whitespace-nowrap text-[11px] font-semibold text-primary">
                          {data.projectType}
                        </span>
                        <span className="text-[10px] font-semibold leading-tight text-secondary/80 sm:whitespace-nowrap">
                          Levantamiento detallado
                        </span>
                        <button
                          type="button"
                          className={inversionPdfCtaPrimaryClass}
                          aria-label={preliminarList.length === 1 ? quoteButtonLabel : undefined}
                          onClick={() => openPreliminarPdfInNewTab(data)}
                        >
                          Ver PDF
                        </button>
                        <button
                          type="button"
                          className={inversionPdfCtaSecondaryClass}
                          onClick={() => downloadPreliminarPdf(data, filename)}
                        >
                          Descargar
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            }
            if (quoteImageSrc.trim()) {
              return (
                <div className="mt-4 flex w-full justify-center">
                  <button
                    type="button"
                    className={inversionPdfCtaPrimaryClass}
                    onClick={async () => {
                      const r = await resolveSeguimientoMediaRefForUi(quoteImageSrc);
                      if ("missing" in r) {
                        window.alert(SEGUIMIENTO_MEDIA_UNAVAILABLE_MSG);
                        return;
                      }
                      if (isPdfDataUrl(r.url)) {
                        openPdfDataUrlOrUrlInNewTab(r.url);
                        return;
                      }
                      onOpenImage(quoteButtonLabel, r.url);
                    }}
                  >
                    {quoteButtonLabel}
                  </button>
                </div>
              );
            }
            return (
              <p className="mt-3 text-xs text-secondary">
                Cuando el equipo adjunte la vista previa o el PDF, podrás verla aquí.
              </p>
            );
          })()}
        </div>
      </div>

      <SeguimientoArchivosSection files={files} onOpenImage={onOpenImage} />

      <div className="rounded-3xl border border-accent/25 bg-gradient-to-br from-accent/10 via-white to-white p-8 shadow-lg">
        <p className="text-sm leading-relaxed text-secondary">
          <span className="font-semibold text-primary">A la espera de confirmación.</span> Una vez que
          apruebes tu proyecto con el equipo de Küche, aquí se desbloqueará tu línea de tiempo de
          fabricación, el control de tus pagos y el conteo de tu garantía.
        </p>
      </div>
    </section>
  );
}
