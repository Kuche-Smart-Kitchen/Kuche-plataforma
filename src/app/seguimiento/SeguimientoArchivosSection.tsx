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
  onGeneratedFormal?: (action: "open" | "download") => void;
};

const isImageType = (type: string) => {
  const normalized = type.trim().toLowerCase();
  return ["jpg", "jpeg", "png", "webp", "gif", "image", "render"].includes(normalized);
};

const fileLooksLikePdf = (name: string, src?: string) =>
  name.toLowerCase().includes(".pdf") ||
  /\.pdf(\?|#|$)/i.test(src ?? "") ||
  /\/raw\/upload\//i.test(src ?? "");

const fileLooksLikeImage = (name: string, src?: string) =>
  /\.(png|jpe?g|webp|gif)(\?|$)/i.test(name) || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(src ?? "");

const chipClassName =
  "group inline-flex items-center gap-2 rounded-full border border-primary/10 px-4 py-2 text-xs font-semibold text-primary transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-primary/10 disabled:hover:text-primary";

export function SeguimientoArchivosSection({
  files,
  onOpenImage,
  onGeneratedLevantamiento,
  onGeneratedFormal,
}: Props) {
  const visibleFiles = files.filter((file) => !isPlaceholderPreliminarArchivo(file));

  const openStored = async (src: string, onReady: (url: string) => void) => {
    const resolved = await resolveSeguimientoMediaRefForUi(src);
    if ("missing" in resolved) {
      window.alert(SEGUIMIENTO_MEDIA_UNAVAILABLE_MSG);
      return;
    }
    onReady(resolved.url);
  };

  return (
    <div className="mt-6 rounded-3xl border border-primary/10 bg-white p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-secondary">Archivos</p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        {visibleFiles.length === 0 ? (
          <p className="w-full text-center text-sm text-secondary">
            Aún no hay archivos compartidos en tu expediente.
          </p>
        ) : null}
        {visibleFiles.map((file) => {
          const normalizedType = file.type.trim().toLowerCase();
          const isGenerated = file.isGeneratedPdf === true;
          const isGeneratedFormal = file.isGeneratedFormal === true;
          const isDesign = normalizedType === "diseno";
          const opensAsPdf =
            isGenerated ||
            isGeneratedFormal ||
            normalizedType === "pdf" ||
            fileLooksLikePdf(file.name, file.src) ||
            (isDesign && fileLooksLikePdf(file.name, file.src));
          const opensAsImage =
            !opensAsPdf &&
            (isImageType(normalizedType) || fileLooksLikeImage(file.name, file.src) || (isDesign && Boolean(file.src?.trim())));
          const primary = opensAsPdf ? getPdfButtonPrimaryLabelFromFileName(file.name) : "";
          const secondary = opensAsPdf ? getPdfButtonSecondaryFromFileName(file.name) : "";
          const canOpenFile = isGenerated
            ? Boolean(onGeneratedLevantamiento)
            : isGeneratedFormal
              ? Boolean(onGeneratedFormal)
              : opensAsPdf
                ? Boolean(file.indexedPdfKey || file.src?.trim())
                : Boolean(file.src?.trim());

          return (
            <button
              key={file.id}
              type="button"
              disabled={!canOpenFile}
              title={!canOpenFile ? "Archivo no adjunto aún" : undefined}
              className={chipClassName}
              onClick={() => {
                if (isGenerated) {
                  onGeneratedLevantamiento?.("open");
                  return;
                }
                if (isGeneratedFormal) {
                  onGeneratedFormal?.("open");
                  return;
                }
                if (opensAsPdf) {
                  if (file.indexedPdfKey) {
                    openPdfFromIndexedKey(file.indexedPdfKey);
                    return;
                  }
                  if (file.src?.trim()) {
                    void openStored(file.src, (url) => openPdfDataUrlOrUrlInNewTab(url));
                  }
                  return;
                }
                if (opensAsImage && file.src?.trim()) {
                  void openStored(file.src, (url) => onOpenImage(file.name, url));
                }
              }}
            >
              {opensAsPdf ? <FileText className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
              {opensAsPdf ? (
                <span className="flex flex-col items-start leading-4">
                  <span className="leading-4">{primary}</span>
                  {secondary ? (
                    <span className="text-[10px] font-semibold text-secondary/80 group-hover:text-accent">
                      {secondary}
                    </span>
                  ) : null}
                </span>
              ) : (
                file.name
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
