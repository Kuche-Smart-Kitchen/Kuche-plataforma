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
  files: SeguimientoArchivo[] | undefined;
  onOpenImage: (name: string, src: string) => void;
};

const isImageType = (type: string) => {
  const normalized = type.trim().toLowerCase();
  return ["jpg", "jpeg", "png", "webp", "gif", "image"].includes(normalized);
};

export function SeguimientoArchivosSection({ files, onOpenImage }: Props) {
  const safeFiles = files ?? [];

  return (
    <div className="mt-6 rounded-3xl border border-primary/10 bg-white p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-secondary">Archivos</p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        {safeFiles.length === 0 ? (
          <p className="w-full text-center text-sm text-secondary">
            Aun no hay archivos compartidos en tu expediente.
          </p>
        ) : null}
        {safeFiles.map((file) => {
          const primary = file.type.toLowerCase() === "pdf" ? getPdfButtonPrimaryLabelFromFileName(file.name) : "";
          const secondary = file.type.toLowerCase() === "pdf" ? getPdfButtonSecondaryFromFileName(file.name) : "";
          const canOpenFile = file.type.toLowerCase() === "pdf"
            ? Boolean(file.indexedPdfKey || file.src?.trim())
            : Boolean(file.src?.trim());

          return (
            <button
              key={file.id}
              type="button"
              disabled={!canOpenFile}
              title={!canOpenFile ? "Archivo no adjunto aun" : undefined}
              className="inline-flex items-center gap-2 rounded-full border border-primary/10 px-4 py-2 text-xs font-semibold text-primary transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-primary/10 disabled:hover:text-primary"
              onClick={() => {
                if (file.type.toLowerCase() === "pdf") {
                  if (file.indexedPdfKey) {
                    openPdfFromIndexedKey(file.indexedPdfKey);
                    return;
                  }

                  if (file.src?.trim()) {
                    void (async () => {
                      const resolved = await resolveSeguimientoMediaRefForUi(file.src as string);
                      if ("missing" in resolved) {
                        window.alert(SEGUIMIENTO_MEDIA_UNAVAILABLE_MSG);
                        return;
                      }
                      openPdfDataUrlOrUrlInNewTab(resolved.url);
                    })();
                  }
                  return;
                }

                if (isImageType(file.type) && file.src?.trim()) {
                  void (async () => {
                    const resolved = await resolveSeguimientoMediaRefForUi(file.src as string);
                    if ("missing" in resolved) {
                      window.alert(SEGUIMIENTO_MEDIA_UNAVAILABLE_MSG);
                      return;
                    }
                    onOpenImage(file.name, resolved.url);
                  })();
                }
              }}
            >
              {file.type.toLowerCase() === "pdf" ? <FileText className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
              {file.type.toLowerCase() === "pdf" ? (
                <span className="flex flex-col items-start leading-4">
                  <span className="leading-4">{primary}</span>
                  {secondary ? (
                    <span className="text-[10px] font-semibold text-secondary/80">{secondary}</span>
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
