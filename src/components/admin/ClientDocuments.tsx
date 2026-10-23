"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import {
  resolveKanbanTaskPersistenceId,
  taskPublicCode,
  type CotizacionFormalData,
  type KanbanTask,
  type PreliminarData,
} from "@/lib/kanban";
import {
  obtenerArchivosCliente,
  obtenerArchivosPanel,
  obtenerArchivosTarea,
  type ClienteArchivo,
} from "@/lib/axios/archivosClienteApi";
import {
  consultarSeguimientoPorCodigo,
  obtenerArchivosSeguimiento,
  obtenerProyectoSeguimiento,
} from "@/lib/axios/seguimientoApi";
import { mergeSeguimientoProjectQuotes } from "@/lib/seguimiento-project";
import {
  downloadFormalPdf,
  downloadPreliminarPdf,
  openFormalPdfInNewTab,
  openPreliminarPdfInNewTab,
} from "@/lib/pdf-preliminar";
import { SeguimientoArchivosSection } from "@/app/seguimiento/SeguimientoArchivosSection";
import {
  filterArchivosForCliente,
  getFormalesListFromProject,
  installments,
  resolvePreliminarForPdf,
  withCotizacionFormalArchivo,
  withLevantamientoDetalladoArchivo,
  type SeguimientoArchivo,
  type SeguimientoProject,
} from "@/app/seguimiento/lib";

export type ClientDocumentsProps = {
  task: KanbanTask;
};

const remoteUrl = (value: string | undefined) => {
  const trimmed = value?.trim() ?? "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : "";
};

type DedupeArchivo = {
  name?: string;
  nombre?: string;
  type?: string;
  tipo?: string;
  src?: string;
  url?: string;
};

const canonicalMediaUrl = (value: string | undefined) => {
  const trimmed = remoteUrl(value);
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    parsed.search = "";
    parsed.hash = "";
    const path = parsed.pathname.replace(/\/$/, "");
    return `${parsed.protocol}//${parsed.host}${path}`.toLowerCase();
  } catch {
    return trimmed.split(/[?#]/)[0].replace(/\/$/, "").toLowerCase();
  }
};

const archivoLabel = (file: DedupeArchivo) =>
  String(file.name ?? file.nombre ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const receiptIdentityKeys = (file: DedupeArchivo) => {
  const type = String(file.type ?? file.tipo ?? "").trim().toLowerCase();
  const name = archivoLabel(file);
  const keys: string[] = [];
  if (type === "recibo_1" || type === "recibo1" || /\brecibo\s*1\b/.test(name)) keys.push("slot:recibo_1");
  if (type === "recibo_2" || type === "recibo2" || /\brecibo\s*2\b/.test(name)) keys.push("slot:recibo_2");
  if (type === "recibo_3" || type === "recibo3" || /\brecibo\s*3\b/.test(name)) keys.push("slot:recibo_3");
  if (type === "recibo" || name.includes("recibo")) keys.push(`name:${name}`);
  return keys;
};

const dedupeArchivoList = <T extends DedupeArchivo>(files: T[]) => {
  const kept: T[] = [];
  const seenUrls = new Set<string>();
  const seenReceipts = new Set<string>();
  for (const file of files) {
    const url = canonicalMediaUrl(file.src || file.url);
    const receiptKeys = receiptIdentityKeys(file);
    if (url && seenUrls.has(url)) continue;
    if (receiptKeys.some((key) => seenReceipts.has(key))) continue;
    if (url) seenUrls.add(url);
    receiptKeys.forEach((key) => seenReceipts.add(key));
    kept.push(file);
  }
  return kept;
};

const receiptImageUrl = (source: unknown, key: string) => {
  if (!source || typeof source !== "object") return "";
  const slot = (source as Record<string, unknown>)[key];
  if (!slot || typeof slot !== "object") return "";
  const image = (slot as { receiptImage?: unknown }).receiptImage;
  return typeof image === "string" ? remoteUrl(image) : "";
};

const receiptLooksLikePdf = (url: string) => /\.pdf(\?|#|$)/i.test(url) || /\/raw\/upload\//i.test(url);

const receiptChips = (snapshotPagos: unknown, taskPagos: KanbanTask["pagos"]): SeguimientoArchivo[] =>
  installments.flatMap((item) => {
    const url = receiptImageUrl(snapshotPagos, item.key) || receiptImageUrl(taskPagos, item.key);
    if (!url) return [];
    return [
      {
        id: `recibo-${item.key}`,
        name: item.label,
        type: receiptLooksLikePdf(url) ? "pdf" : "jpg",
        src: url,
      },
    ];
  });

const taskRecord = (task: KanbanTask): Record<string, unknown> => ({
  codigo: taskPublicCode(task),
  codigoProyecto: task.codigoProyecto,
  clienteId: task.clienteId,
  preliminarData: task.preliminarData,
  preliminarCotizaciones: task.preliminarCotizaciones,
  cotizacionFormalData: task.cotizacionFormalData,
  cotizacionesFormales: task.cotizacionesFormales,
  pagos: task.pagos,
  archivos: (task.files ?? []).map((file) => ({
    id: file.id,
    name: file.name,
    nombre: file.name,
    type: file.type,
    tipo: file.type,
    src: file.src,
    url: file.src,
  })),
});

export function ClientDocuments({ task }: ClientDocumentsProps) {
  const [remoteFiles, setRemoteFiles] = useState<ClienteArchivo[]>([]);
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ name: string; src: string } | null>(null);

  const persistenceTaskId = useMemo(() => resolveKanbanTaskPersistenceId(task), [task]);
  const codigo = taskPublicCode(task);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const tareaId = persistenceTaskId?.trim();
      if (!codigo && !tareaId) {
        setRemoteFiles([]);
        setSnapshot(taskRecord(task));
        return;
      }

      setIsLoading(true);
      setError(null);

      const remoteResults = await Promise.all([
        codigo ? obtenerArchivosCliente(codigo) : Promise.resolve({ success: true as const, data: [] as ClienteArchivo[] }),
        tareaId ? obtenerArchivosTarea(tareaId) : Promise.resolve({ success: true as const, data: [] as ClienteArchivo[] }),
        codigo ? obtenerArchivosPanel(codigo) : Promise.resolve({ success: true as const, data: [] as ClienteArchivo[] }),
      ]);

      let project: Record<string, unknown> = taskRecord(task);
      let snapshotError: string | null = null;
      if (codigo) {
        try {
          const login = await consultarSeguimientoPorCodigo(codigo);
          if (login.success && login.data?.project && login.data.token) {
            project = mergeSeguimientoProjectQuotes(login.data.project, project);
            const token = login.data.token;
            const [projectResponse, filesResponse] = await Promise.all([
              obtenerProyectoSeguimiento(token),
              obtenerArchivosSeguimiento(token),
            ]);
            if (projectResponse.success && projectResponse.data) {
              project = mergeSeguimientoProjectQuotes(projectResponse.data, project);
            }
            if (filesResponse.success && filesResponse.data) {
              const fromEndpoint = filesResponse.data.map((file) => ({
                id: file.id ?? file._id ?? file.url,
                name: file.nombre,
                nombre: file.nombre,
                type: file.tipo ?? "otro",
                tipo: file.tipo ?? "otro",
                src: file.url,
                url: file.url,
              }));
              const fromProject = Array.isArray(project.archivos)
                ? project.archivos.filter((file): file is DedupeArchivo => Boolean(file) && typeof file === "object")
                : [];
              project = { ...project, archivos: dedupeArchivoList([...fromEndpoint, ...fromProject]) };
            } else if (!projectResponse.success) {
              snapshotError = filesResponse.message || projectResponse.message || null;
            }
          } else if (!login.success) {
            snapshotError = login.message || null;
          }
        } catch (caught) {
          snapshotError = caught instanceof Error ? caught.message : "No se pudo cargar el expediente público.";
        }
      }

      if (cancelled) return;
      const files = new Map<string, ClienteArchivo>();
      remoteResults.forEach((result) => {
        if (result.success) {
          (result.data ?? []).forEach((file) => {
            if (remoteUrl(file.url)) files.set(file.url, file);
          });
        }
      });
      setRemoteFiles([...files.values()]);
      setSnapshot(project);
      const remoteFailed = remoteResults.find((result) => !result.success);
      setError(snapshotError || (remoteFailed && files.size === 0 ? remoteFailed.message || null : null));
      setIsLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [codigo, persistenceTaskId, task]);

  const project = useMemo(() => {
    const base = snapshot ?? taskRecord(task);
    return withCotizacionFormalArchivo(withLevantamientoDetalladoArchivo(base)) as SeguimientoProject;
  }, [snapshot, task]);

  const files = useMemo(() => {
    const listed = filterArchivosForCliente(project.archivos as unknown[] | undefined);
    const extras: SeguimientoArchivo[] = remoteFiles
      .filter((file) => remoteUrl(file.url))
      .map((file) => ({
        id: file._id || file.url,
        name: file.nombre,
        type: file.tipo || "otro",
        src: file.url,
      }));
    return dedupeArchivoList([
      ...listed,
      ...extras,
      ...receiptChips(project.pagos, task.pagos),
    ]);
  }, [project.archivos, project.pagos, remoteFiles, task.pagos]);

  const openGeneratedLevantamiento = (action: "open" | "download") => {
    const data = resolvePreliminarForPdf(project) as PreliminarData | null;
    if (!data) return;
    if (action === "download") {
      downloadPreliminarPdf(data, "Levantamiento Detallado.pdf");
      return;
    }
    openPreliminarPdfInNewTab(data);
  };

  const openGeneratedFormal = (action: "open" | "download") => {
    const data = getFormalesListFromProject(project)[0] as CotizacionFormalData | undefined;
    if (!data) return;
    const filename = `cotizacion-formal-${(data.projectType || "proyecto").replace(/\s+/g, "-")}.pdf`;
    if (action === "download") {
      downloadFormalPdf(data, filename);
      return;
    }
    openFormalPdfInNewTab(data);
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando archivos...
        </div>
      ) : null}

      <SeguimientoArchivosSection
        files={files}
        onOpenImage={(name, src) => setSelectedImage({ name, src })}
        onGeneratedLevantamiento={openGeneratedLevantamiento}
        onGeneratedFormal={openGeneratedFormal}
      />

      {error && files.length === 0 ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">{error}</p>
      ) : null}

      {selectedImage ? (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-primary"
            onClick={() => setSelectedImage(null)}
            aria-label="Cerrar vista previa"
          >
            <X className="h-4 w-4" />
          </button>
          <img
            src={selectedImage.src}
            alt={selectedImage.name}
            className="max-h-[85vh] max-w-full rounded-2xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
