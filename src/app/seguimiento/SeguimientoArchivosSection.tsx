"use client";

import { FileText, Image as ImageIcon } from "lucide-react";
import { openPdfDataUrlOrUrlInNewTab, openPdfFromIndexedKey } from "@/lib/pdf-preliminar";
import {
  resolveSeguimientoMediaRefForUi,
  SEGUIMIENTO_MEDIA_UNAVAILABLE_MSG,
} from "@/lib/seguimiento-storage-blobs";
import {
  getPdfButtonPrimaryLabelFromFileName,
  getPdfButtonSecondaryFromFileName,
  isPlaceholderPreliminarArchivo,
  type SeguimientoArchivo,
} from "./lib";

type Props = {
  files: SeguimientoArchivo[];
  onOpenImage: (name: string, src: string) => void;
  onGeneratedLevantamiento?: (action: "open" | "download") => void;
};

const isImageType = (type: string) => {
  const normalized = type.trim().toLowerCase();
  return ["jpg", "jpeg", "png", "webp", "gif", "image", "render"].includes(normalized);
};

const fileLooksLikePdf = (name: string, src?: string) =>
  name.toLowerCase().includes(".pdf") || (src ?? "").toLowerCase().includes(".pdf");

const fileLooksLikeImage = (name: string, src?: string) =>
  /\.(png|jpe?g|webp|gif)(\?|$)/i.test(name) || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(src ?? "");

export function SeguimientoArchivosSection({ files, onOpenImage, onGeneratedLevantamiento }: Props) {
  const visibleFiles = files.filter((file) => !isPlaceholderPreliminarArchivo(file));
  return (
    <div className="mt-6 rounded-3xl border border-primary/10 bg-white p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-secondary">Archivos</p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        {visibleFiles.length === 0 ? (
          <p className="w-full text-center text-sm text-secondary">
            Aún no hay archivos compartidos en tu expediente.
          </p>
        ) : null}
        {visibleFiles.map((f) => {
          const normalizedType = f.type.trim().toLowerCase();
          const isGenerated = f.isGeneratedPdf === true;
          const isDesign = normalizedType === "diseno";
          const opensAsPdf = isGenerated || normalizedType === "pdf" || (isDesign && fileLooksLikePdf(f.name, f.src));
          const opensAsImage =
            isImageType(normalizedType) ||
            (isDesign && !opensAsPdf && (fileLooksLikeImage(f.name, f.src) || Boolean(f.src?.trim())));
          const primary = opensAsPdf ? getPdfButtonPrimaryLabelFromFileName(f.name) : "";
          const secondary = opensAsPdf ? getPdfButtonSecondaryFromFileName(f.name) : "";
          const canOpenFile = isGenerated
            ? Boolean(onGeneratedLevantamiento)
            : opensAsPdf
              ? Boolean(f.indexedPdfKey || f.src?.trim())
              : Boolean(f.src?.trim());
          if (isGenerated) {
            return (
              <div
                key={f.id}
                className="flex items-center gap-3 rounded-full border border-gray-200 bg-gray-50/50 p-1 pl-4"
              >
                <button
                  type="button"
                  className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-primary"
                  onClick={() => onGeneratedLevantamiento?.("open")}
                >
                  <FileText className="h-4 w-4" />
                  Levantamiento detallado
                </button>
                <button
                  type="button"
                  className="rounded-full bg-black px-3 py-1 text-xs text-white transition hover:bg-gray-800"
                  onClick={() => onGeneratedLevantamiento?.("download")}
                >
                  Descargar
                </button>
              </div>
            );
          }
          return (
            <button
              key={f.id}
              type="button"
              disabled={!canOpenFile}
              title={!canOpenFile ? "Archivo no adjunto aún" : undefined}
              className="inline-flex items-center gap-2 rounded-full border border-primary/10 px-4 py-2 text-xs font-semibold text-primary transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-primary/10 disabled:hover:text-primary"
              onClick={() => {
                if (opensAsPdf) {
                  if (f.indexedPdfKey) {
                    openPdfFromIndexedKey(f.indexedPdfKey);
                    return;
                  }
                  if (f.src?.trim()) {
                    void (async () => {
                      const r = await resolveSeguimientoMediaRefForUi(f.src!);
                      if ("missing" in r) {
                        window.alert(SEGUIMIENTO_MEDIA_UNAVAILABLE_MSG);
                        return;
                      }
                      openPdfDataUrlOrUrlInNewTab(r.url);
                    })();
                  }
                  return;
                }
                if (opensAsImage && f.src?.trim()) {
                  void (async () => {
                    const r = await resolveSeguimientoMediaRefForUi(f.src!);
                    if ("missing" in r) {
                      window.alert(SEGUIMIENTO_MEDIA_UNAVAILABLE_MSG);
                      return;
                    }
                    onOpenImage(f.name, r.url);
                  })();
                }
              }}
            >
              {opensAsPdf ? <FileText className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
              {opensAsPdf ? (
                <span className="flex flex-col items-start leading-4">
                  <span className="leading-4">{primary}</span>
                  {secondary ? (
                    <span className="text-[10px] font-semibold text-secondary/80">{secondary}</span>
                  ) : null}
                </span>
              ) : (
                f.name
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
