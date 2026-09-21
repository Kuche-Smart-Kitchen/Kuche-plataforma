"use client";

import { useEffect, useState } from "react";
import { Download, Eye, Loader2 } from "lucide-react";
import type { KanbanTask } from "@/lib/kanban";
import {
  obtenerArchivosCliente,
  obtenerArchivosPanel,
  obtenerArchivosTarea,
  type ClienteArchivo,
} from "@/lib/axios/archivosClienteApi";
import { ExpedientePdfSections } from "@/components/admin/ExpedientePdfSections";

export type ClientDocumentsProps = {
  task: KanbanTask;
};

/** Documentos PDF del expediente (levantamiento detallado + formal/taller). Reutiliza la misma UI que Confirmados e Inactivos. */
export function ClientDocuments({ task }: ClientDocumentsProps) {
  const [remoteFiles, setRemoteFiles] = useState<ClienteArchivo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const codigo = task.codigoProyecto?.trim();
      const tareaId = task.id?.trim();
      if (!codigo && !tareaId) {
        setRemoteFiles([]);
        return;
      }

      setIsLoading(true);
      setError(null);
      const results = await Promise.all([
        codigo ? obtenerArchivosCliente(codigo) : Promise.resolve({ success: true as const, data: [] }),
        tareaId ? obtenerArchivosTarea(tareaId) : Promise.resolve({ success: true as const, data: [] }),
        codigo ? obtenerArchivosPanel(codigo) : Promise.resolve({ success: true as const, data: [] }),
      ]);
      if (cancelled) return;

      const files = new Map<string, ClienteArchivo>();
      results.forEach((result) => {
        if (result.success) {
          (result.data ?? []).forEach((file) => files.set(file.url, file));
        }
      });
      setRemoteFiles([...files.values()]);
      const failed = results.find((result) => !result.success);
      if (failed && files.size === 0) setError(failed.message || "No se pudieron cargar los archivos remotos.");
      setIsLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [task.codigoProyecto, task.id]);

  return (
    <div className="space-y-4">
      <ExpedientePdfSections client={task} />
      {isLoading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando archivos...
        </div>
      ) : null}
      {remoteFiles.length > 0 ? (
        <div className="rounded-2xl bg-sky-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-800">
            Archivos del cliente ({remoteFiles.length})
          </p>
          <div className="mt-3 space-y-2">
            {remoteFiles.map((file) => (
              <div key={`${file._id}-${file.url}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-sky-900">{file.nombre}</p>
                  <p className="text-[10px] uppercase tracking-wide text-sky-700/70">{file.tipo}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100">
                    <Eye className="h-3 w-3" />
                    Ver
                  </a>
                  <a href={file.url} download={file.nombre} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100">
                    <Download className="h-3 w-3" />
                    Descargar
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {error ? <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">{error}</p> : null}
      {!isLoading && remoteFiles.length === 0 && !error ? (
        <p className="text-xs text-secondary">No hay archivos remotos registrados para este cliente.</p>
      ) : null}
    </div>
  );
}
