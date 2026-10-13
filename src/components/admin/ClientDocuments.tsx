"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Eye, Loader2 } from "lucide-react";
import type { KanbanTask } from "@/lib/kanban";
import { resolveKanbanTaskPersistenceId } from "@/lib/kanban";
import {
  obtenerArchivosCliente,
  obtenerArchivosPanel,
  obtenerArchivosTarea,
  type ClienteArchivo,
} from "@/lib/axios/archivosClienteApi";
import { ExpedientePdfSections } from "@/components/admin/ExpedientePdfSections";
import { toDropboxDownloadUrl } from "@/lib/dropbox-url";

export type ClientDocumentsProps = {
  task: KanbanTask;
};

type RemoteFileGroup = {
  key: string;
  title: string;
  sectionClass: string;
  titleClass: string;
  linkClass: string;
  files: ClienteArchivo[];
};

const HIGHLIGHTED_REMOTE_TYPES: Record<
  string,
  Omit<RemoteFileGroup, "files" | "key">
> = {
  levantamiento_detallado: {
    title: "Levantamiento detallado (archivo en nube)",
    sectionClass: "rounded-2xl bg-emerald-50 p-4",
    titleClass: "text-xs font-semibold uppercase tracking-wider text-emerald-800",
    linkClass: "text-emerald-700 hover:bg-emerald-100",
  },
  cotizacion_formal: {
    title: "Cotización formal (archivo en nube)",
    sectionClass: "rounded-2xl bg-violet-50 p-4",
    titleClass: "text-xs font-semibold uppercase tracking-wider text-violet-800",
    linkClass: "text-violet-700 hover:bg-violet-100",
  },
  hoja_taller: {
    title: "Hoja de taller (archivo en nube)",
    sectionClass: "rounded-2xl bg-violet-50/80 p-4",
    titleClass: "text-xs font-semibold uppercase tracking-wider text-violet-800",
    linkClass: "text-violet-700 hover:bg-violet-100",
  },
  diseno: {
    title: "Diseño (archivo en nube)",
    sectionClass: "rounded-2xl bg-indigo-50 p-4",
    titleClass: "text-xs font-semibold uppercase tracking-wider text-indigo-800",
    linkClass: "text-indigo-700 hover:bg-indigo-100",
  },
};

function normalizeRemoteTipo(tipo: string): string {
  return tipo.trim().toLowerCase();
}

function RemoteFileRow({
  file,
  linkClass,
}: {
  file: ClienteArchivo;
  linkClass: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium">{file.nombre}</p>
        <p className="text-[10px] uppercase tracking-wide opacity-70">{file.tipo}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${linkClass}`}
        >
          <Eye className="h-3 w-3" />
          Ver
        </a>
        <a
          href={toDropboxDownloadUrl(file.url) ?? file.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${linkClass}`}
        >
          <Download className="h-3 w-3" />
          Descargar
        </a>
      </div>
    </div>
  );
}

/** Documentos PDF del expediente (levantamiento detallado + formal/taller). Reutiliza la misma UI que Confirmados e Inactivos. */
export function ClientDocuments({ task }: ClientDocumentsProps) {
  const [remoteFiles, setRemoteFiles] = useState<ClienteArchivo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persistenceTaskId = useMemo(
    () => resolveKanbanTaskPersistenceId(task),
    [task],
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const codigo = task.codigoProyecto?.trim();
      const tareaId = persistenceTaskId?.trim();
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
  }, [task.codigoProyecto, persistenceTaskId]);

  const { highlightedGroups, otherRemoteFiles } = useMemo(() => {
    const highlighted = new Map<string, ClienteArchivo[]>();
    const other: ClienteArchivo[] = [];

    for (const file of remoteFiles) {
      const tipo = normalizeRemoteTipo(file.tipo);
      if (tipo in HIGHLIGHTED_REMOTE_TYPES) {
        const list = highlighted.get(tipo) ?? [];
        list.push(file);
        highlighted.set(tipo, list);
      } else {
        other.push(file);
      }
    }

    const groups: RemoteFileGroup[] = Object.entries(HIGHLIGHTED_REMOTE_TYPES)
      .map(([key, meta]) => {
        const files = highlighted.get(key) ?? [];
        if (files.length === 0) return null;
        return { key, ...meta, files };
      })
      .filter((group): group is RemoteFileGroup => group !== null);

    return { highlightedGroups: groups, otherRemoteFiles: other };
  }, [remoteFiles]);

  const hideEmptyEmbeddedMessage = remoteFiles.some((file) => {
    const tipo = normalizeRemoteTipo(file.tipo);
    return tipo === "levantamiento_detallado" || tipo === "cotizacion_formal" || tipo === "hoja_taller";
  });

  return (
    <div className="space-y-4">
      <ExpedientePdfSections client={task} hideEmptyCotizacionesMessage={hideEmptyEmbeddedMessage} />

      {highlightedGroups.map((group) => (
        <div key={group.key} className={group.sectionClass}>
          <p className={group.titleClass}>
            {group.title} ({group.files.length})
          </p>
          <div className="mt-3 space-y-2">
            {group.files.map((file) => (
              <RemoteFileRow key={`${file._id}-${file.url}`} file={file} linkClass={group.linkClass} />
            ))}
          </div>
        </div>
      ))}

      {isLoading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando archivos...
        </div>
      ) : null}

      {otherRemoteFiles.length > 0 ? (
        <div className="rounded-2xl bg-sky-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-800">
            Otros archivos del cliente ({otherRemoteFiles.length})
          </p>
          <div className="mt-3 space-y-2">
            {otherRemoteFiles.map((file) => (
              <RemoteFileRow key={`${file._id}-${file.url}`} file={file} linkClass="text-sky-700 hover:bg-sky-100" />
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
