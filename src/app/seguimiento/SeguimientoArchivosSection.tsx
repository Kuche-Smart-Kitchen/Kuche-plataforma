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
  type SeguimientoArchivo,
} from "./lib";

type Props = {
  files: SeguimientoArchivo[];
  onOpenImage: (name: string, src: string) => void;
};

const isImageType = (type: string) => {
  const normalized = type.trim().toLowerCase();
  return ["jpg", "jpeg", "png", "webp", "gif", "image", "render"].includes(normalized);
};

export function SeguimientoArchivosSection({ files, onOpenImage }: Props) {
  return (
    <div className="mt-6 rounded-3xl border border-primary/10 bg-white p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-secondary">Archivos</p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        {files.length === 0 ? (
          <p className="w-full text-center text-sm text-secondary">
            Aún no hay archivos compartidos en tu expediente.
          </p>
        ) : null}
        {files.map((f) => {
          const normalizedType = f.type.trim().toLowerCase();
          const primary = normalizedType === "pdf" ? getPdfButtonPrimaryLabelFromFileName(f.name) : "";
          const secondary = normalizedType === "pdf" ? getPdfButtonSecondaryFromFileName(f.name) : "";
          const canOpenFile =
            normalizedType === "pdf"
              ? Boolean(f.indexedPdfKey || f.src?.trim())
              : Boolean(f.src?.trim());
          return (
            <button
              key={f.id}
              type="button"
              disabled={!canOpenFile}
              title={!canOpenFile ? "Archivo no adjunto aún" : undefined}
              className="inline-flex items-center gap-2 rounded-full border border-primary/10 px-4 py-2 text-xs font-semibold text-primary transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-primary/10 disabled:hover:text-primary"
              onClick={() => {
                if (normalizedType === "pdf") {
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
                if (isImageType(normalizedType) && f.src?.trim()) {
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
              {normalizedType === "pdf" ? <FileText className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
              {normalizedType === "pdf" ? (
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
