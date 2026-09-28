/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Image as ImageIcon,
  Maximize2,
  MessageSquare,
  X,
} from "lucide-react";

import { useEscapeClose } from "@/hooks/useEscapeClose";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { syncTaskPatchWithBackend } from "@/lib/admin-workflow";
import {
  getTasksFromLocalStorage,
  kanbanStorageKey,
  kanbanTasksUpdatedEventName,
  notifyKanbanTasksUpdated,
  type KanbanTask,
  type TaskFile,
} from "@/lib/kanban";
import { downloadTaskFile } from "@/lib/task-file-download";
import { toDropboxDirectImageUrl } from "@/lib/dropbox-url";

type ProjectStatus = "Pendiente" | "Aprobado" | "Revisión";

type DesignProject = {
  id: string;
  taskId: string;
  clientName: string;
  designerName: string;
  image: string | null;
  files: TaskFile[];
  date: string;
  status: ProjectStatus;
};

const statusStyles: Record<ProjectStatus, string> = {
  Pendiente: "bg-amber-100 text-amber-700",
  Aprobado: "bg-emerald-100 text-emerald-700",
  Revisión: "bg-rose-100 text-rose-700",
};

const filters = ["Todos", "Pendientes", "Aprobados"] as const;
type FilterOption = (typeof filters)[number];

function formatDesignDate(ts?: number): string {
  if (ts == null) return "—";
  const d = new Date(ts);
  return d.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" });
}

function isImageFile(f: TaskFile): boolean {
  return Boolean(
    f.src &&
      (f.type === "render" ||
        /\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(f.src) ||
        /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(f.name)),
  );
}

function previewImageSrc(src: string | null | undefined): string | null {
  if (!src) return null;
  return toDropboxDirectImageUrl(src) ?? src;
}

function ProjectThumbnail({
  image,
  alt,
  hasPdf,
  fileCount,
  onClick,
  className,
}: {
  image: string | null;
  alt: string;
  hasPdf: boolean;
  fileCount: number;
  onClick: () => void;
  className: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!image || failed) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex h-full w-full flex-col items-center justify-center gap-2 text-gray-400"
      >
        {hasPdf ? <FileText className="h-12 w-12" /> : <ImageIcon className="h-12 w-12" />}
        <span className="text-xs font-medium">
          {fileCount} archivo{fileCount !== 1 ? "s" : ""}
        </span>
      </button>
    );
  }

  const displaySrc = previewImageSrc(image);

  return (
    <img
      src={displaySrc ?? image}
      alt={alt}
      className={className}
      onClick={onClick}
      onError={() => setFailed(true)}
    />
  );
}

function DesignFileDownloadRow({
  file,
  onSelectPreview,
  isPreviewSelected,
}: {
  file: TaskFile;
  onSelectPreview?: () => void;
  isPreviewSelected?: boolean;
}) {
  const canDownload = Boolean(file.src);
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border bg-white px-3 py-2 ${
        isPreviewSelected ? "border-[#8B1C1C] ring-1 ring-[#8B1C1C]/30" : "border-gray-200"
      }`}
    >
      <button
        type="button"
        disabled={!file.src}
        title={file.src ? "Ver en vista previa" : "Sin URL de archivo"}
        onClick={(e) => {
          e.stopPropagation();
          onSelectPreview?.();
        }}
        className="min-w-0 flex-1 truncate text-left text-xs font-medium text-gray-700 hover:text-[#8B1C1C] disabled:cursor-default disabled:opacity-60"
      >
        {file.name}
      </button>
      <button
        type="button"
        disabled={!canDownload}
        title={
          canDownload
            ? "Descargar archivo"
            : "Sin copia en el navegador. Vuelve a subir el archivo desde Diseños en el tablero."
        }
        onClick={(e) => {
          e.stopPropagation();
          if (canDownload) void downloadTaskFile(file);
        }}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Download className="h-3.5 w-3.5" />
        Descargar
      </button>
    </div>
  );
}

function PreviewImagePane({
  src,
  alt,
  onOpenZoom,
}: {
  src: string;
  alt: string;
  onOpenZoom?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const displaySrc = previewImageSrc(src);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed) {
    return (
      <p className="py-8 text-center text-sm text-gray-500">
        No se pudo cargar la vista previa. Usa Descargar o abre el archivo en una pestaña nueva.
      </p>
    );
  }

  return (
    <img
      src={displaySrc ?? src}
      alt={alt}
      title="Clic para ver en pantalla completa"
      className="h-auto max-h-[48vh] w-auto max-w-full cursor-zoom-in select-none rounded-lg object-contain"
      onClick={() => onOpenZoom?.()}
      onError={() => setFailed(true)}
    />
  );
}

function designProjectsFromTasks(tasks: KanbanTask[]): DesignProject[] {
  return tasks
    .filter((t) => t.stage === "disenos" && t.files && t.files.length > 0)
    .map((task) => {
      const firstImage = task.files?.find(isImageFile);
      const image = firstImage?.src ?? null;
      return {
        id: task.id,
        taskId: task.id,
        clientName: task.project || "Sin nombre",
        designerName: task.assignedTo?.[0] ?? "—",
        image,
        files: task.files ?? [],
        date: formatDesignDate(task.createdAt),
        status: (task.designApprovedByAdmin
          ? "Aprobado"
          : task.designFeedback && !task.designApprovedByAdmin
            ? "Revisión"
            : "Pendiente") as ProjectStatus,
      };
    });
}

export default function DisenosPage() {
  const [projects, setProjects] = useState<DesignProject[]>([]);
  const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterOption>("Todos");
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});
  const [activePreview, setActivePreview] = useState<DesignProject | null>(null);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isZoomedIn, setIsZoomedIn] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [confirmingClientId, setConfirmingClientId] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const closeActivePreview = useCallback(() => {
    setIsZoomOpen(false);
    setIsZoomedIn(false);
    setActivePreview(null);
  }, []);

  const openZoomViewer = useCallback(() => {
    setIsZoomOpen(true);
    setIsZoomedIn(false);
  }, []);

  useEffect(() => {
    if (!activePreview) {
      setPreviewFileId(null);
      setIsZoomOpen(false);
      setIsZoomedIn(false);
      return;
    }
    const defaultFile =
      activePreview.files.find(isImageFile) ?? activePreview.files[0] ?? null;
    setPreviewFileId(defaultFile?.id ?? null);
    setIsZoomOpen(false);
    setIsZoomedIn(false);
  }, [activePreview]);

  const loadProjects = useCallback(async () => {
    const currentTasks = getTasksFromLocalStorage();
    setProjects(designProjectsFromTasks(currentTasks));

    try {
      await import("@/lib/admin-workflow").then(({ syncKanbanTasksFromBackend }) => syncKanbanTasksFromBackend());
      setProjects(designProjectsFromTasks(getTasksFromLocalStorage()));
    } catch {
      // Se mantiene el estado del tablero local si el backend no responde.
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    void loadProjects();

    const handleKanbanUpdated = () => {
      setProjects(designProjectsFromTasks(getTasksFromLocalStorage()));
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== kanbanStorageKey) return;
      setProjects(designProjectsFromTasks(getTasksFromLocalStorage()));
    };

    window.addEventListener(kanbanTasksUpdatedEventName, handleKanbanUpdated);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(kanbanTasksUpdatedEventName, handleKanbanUpdated);
      window.removeEventListener("storage", handleStorage);
    };
  }, [loadProjects]);

  useEscapeClose(Boolean(activePreview && !isZoomOpen), closeActivePreview);
  useFocusTrap(Boolean(activePreview && !isZoomOpen), previewRef);

  const filteredProjects = useMemo(() => {
    if (filter === "Todos") return projects;
    if (filter === "Pendientes") return projects.filter((p) => p.status === "Pendiente");
    return projects.filter((p) => p.status === "Aprobado");
  }, [filter, projects]);

  const previewIndex = useMemo(
    () => filteredProjects.findIndex((p) => p.id === activePreview?.id),
    [activePreview?.id, filteredProjects],
  );

  const activePreviewImageSrc = useMemo(() => {
    if (!activePreview) return null;
    const selected = activePreview.files.find((f) => f.id === previewFileId);
    if (selected?.src) {
      return isImageFile(selected) ? selected.src : null;
    }
    if (activePreview.image) return activePreview.image;
    const fallback = activePreview.files.find(isImageFile);
    return fallback?.src ?? null;
  }, [activePreview, previewFileId]);

  const goToNext = useCallback(() => {
    if (!filteredProjects.length) return;
    const nextIndex = previewIndex >= 0 ? (previewIndex + 1) % filteredProjects.length : 0;
    setActivePreview(filteredProjects[nextIndex]);
  }, [filteredProjects, previewIndex]);

  const goToPrev = useCallback(() => {
    if (!filteredProjects.length) return;
    const nextIndex =
      previewIndex >= 0
        ? (previewIndex - 1 + filteredProjects.length) % filteredProjects.length
        : filteredProjects.length - 1;
    setActivePreview(filteredProjects[nextIndex]);
  }, [filteredProjects, previewIndex]);

  useEffect(() => {
    if (!activePreview) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isZoomOpen) {
          setIsZoomOpen(false);
          setIsZoomedIn(false);
          return;
        }
        closeActivePreview();
        return;
      }
      if (isZoomOpen) return;
      if (event.key === "ArrowRight") goToNext();
      else if (event.key === "ArrowLeft") goToPrev();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activePreview, closeActivePreview, goToNext, goToPrev, isZoomOpen]);

  const handleApprove = async (taskId: string) => {
    const currentTasks = getTasksFromLocalStorage();
    const taskSnapshot = currentTasks.find((task) => task.id === taskId);
    const nextTasks = currentTasks.map((task) =>
      task.id === taskId ? { ...task, designApprovedByAdmin: true } : task,
    );

    const persisted = notifyKanbanTasksUpdated(nextTasks);
    if (persisted) {
      setProjects(designProjectsFromTasks(nextTasks));
      window.dispatchEvent(new CustomEvent(kanbanTasksUpdatedEventName, { detail: { tasks: nextTasks } }));
    }

    if (taskSnapshot) {
      const ok = await syncTaskPatchWithBackend(taskSnapshot, { designApprovedByAdmin: true });
      if (!ok) {
        console.warn("No se pudo sincronizar la aprobación de diseño con el backend.");
      }
    }

    setActiveFeedbackId(null);
  };

  const handleConfirmClientApproval = async (taskId: string) => {
    setConfirmingClientId(taskId);
    const patch = {
      designApprovedByClient: true,
      stage: "cotizacion" as const,
      status: "pendiente" as const,
      citaStarted: false,
      citaFinished: false,
    };

    try {
      const currentTasks = getTasksFromLocalStorage();
      const taskSnapshot = currentTasks.find((task) => task.id === taskId);
      const nextTasks = currentTasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task));

      const persisted = notifyKanbanTasksUpdated(nextTasks);
      if (persisted) {
        setProjects(designProjectsFromTasks(nextTasks));
        window.dispatchEvent(new CustomEvent(kanbanTasksUpdatedEventName, { detail: { tasks: nextTasks } }));
      }

      if (taskSnapshot) {
        const ok = await syncTaskPatchWithBackend(taskSnapshot, patch);
        if (!ok) {
          console.warn("No se pudo sincronizar la aprobación del cliente con el backend.");
        }
      }
    } finally {
      setConfirmingClientId(null);
    }
  };

  const handleSendFeedback = async (projectId: string) => {
    const comment = feedbackDrafts[projectId]?.trim();
    if (!comment) return;

    const currentTasks = getTasksFromLocalStorage();
    const taskSnapshot = currentTasks.find((task) => task.id === projectId);
    if (!taskSnapshot) return;

    const patch = { designApprovedByAdmin: false, designFeedback: comment };
    const nextTasks = currentTasks.map((task) =>
      task.id === projectId ? { ...task, ...patch } : task,
    );

    const persisted = notifyKanbanTasksUpdated(nextTasks);
    if (persisted) {
      setProjects(designProjectsFromTasks(nextTasks));
      window.dispatchEvent(new CustomEvent(kanbanTasksUpdatedEventName, { detail: { tasks: nextTasks } }));
    }

    const ok = await syncTaskPatchWithBackend(taskSnapshot, patch);
    if (!ok) {
      console.warn("No se pudo sincronizar el feedback de diseño con el backend.");
    }

    setFeedbackDrafts((prev) => ({ ...prev, [projectId]: "" }));
    setActiveFeedbackId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Aprobación de Diseños</h1>
        <p className="mt-2 text-sm text-gray-500">
          Revisa y autoriza los renders o planos subidos desde el tablero antes de la presentación al cliente.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {filters.map((item) => {
            const isActive = filter === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  isActive ? "bg-[#8B1C1C] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      {!isHydrated ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-12 text-center">
          <p className="text-gray-500">
            {projects.length === 0
              ? "No hay diseños con archivos aún. Los archivos subidos en la columna Diseños del tablero aparecerán aquí."
              : "No hay diseños que coincidan con el filtro."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filteredProjects.map((project, index) => (
              <motion.article
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
                className="flex flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm"
              >
                <div className="relative h-60 overflow-hidden bg-gray-100">
                  <ProjectThumbnail
                    image={project.image}
                    alt={`Diseño ${project.clientName}`}
                    hasPdf={project.files.some((f) => f.type === "pdf")}
                    fileCount={project.files.length}
                    onClick={() => setActivePreview(project)}
                    className="h-full w-full cursor-zoom-in object-cover transition-transform duration-500 hover:scale-105"
                  />
                  <span
                    className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[project.status]}`}
                  >
                    {project.status}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-4 p-5">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{project.clientName}</p>
                    <p className="text-sm text-gray-500">Responsable: {project.designerName}</p>
                  </div>
                  <p className="text-xs text-gray-400">Actualizado: {project.date}</p>
                  <div className="space-y-2 border-t border-gray-100 pt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Archivos · descarga directa
                    </p>
                    <div className="max-h-32 space-y-2 overflow-y-auto">
                      {project.files.map((f) => (
                        <DesignFileDownloadRow key={f.id} file={f} />
                      ))}
                    </div>
                  </div>
                  <div className="mt-auto">
                    {activeFeedbackId === project.id ? (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3"
                      >
                        <textarea
                          placeholder="Escribe los cambios necesarios..."
                          value={feedbackDrafts[project.id] ?? ""}
                          onChange={(event) =>
                            setFeedbackDrafts((prev) => ({
                              ...prev,
                              [project.id]: event.target.value,
                            }))
                          }
                          className="min-h-[90px] w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none focus:border-[#8B1C1C]"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleSendFeedback(project.id)}
                            className="rounded-2xl bg-[#8B1C1C] px-4 py-2 text-xs font-semibold text-white"
                          >
                            Enviar feedback
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveFeedbackId(null)}
                            className="rounded-2xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600"
                          >
                            Cancelar
                          </button>
                        </div>
                      </motion.div>
                    ) : project.status === "Pendiente" || project.status === "Revisión" ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleApprove(project.taskId)}
                          className="flex items-center gap-2 rounded-2xl bg-[#8B1C1C] px-4 py-2 text-xs font-semibold text-white"
                        >
                          <Check className="h-4 w-4" />
                          Aprobar
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveFeedbackId(project.id)}
                          className="flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Solicitar cambios
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={confirmingClientId === project.taskId}
                        onClick={() => handleConfirmClientApproval(project.taskId)}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Check className="h-4 w-4" />
                        {confirmingClientId === project.taskId
                          ? "Confirmando…"
                          : "Confirmar aprobación del cliente"}
                      </button>
                    )}
                  </div>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {activePreview ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={closeActivePreview}
          >
            <motion.div
              ref={previewRef}
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{activePreview.clientName}</p>
                  <p className="text-xs text-gray-500">Responsable: {activePreview.designerName}</p>
                </div>
                <button
                  type="button"
                  onClick={closeActivePreview}
                  className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500"
                >
                  Cerrar
                </button>
              </div>
              <div className="border-b border-gray-100 bg-white px-6 py-4">
                <p className="text-xs font-semibold text-gray-600">
                  Descargar sin abrir vista previa
                </p>
                <p className="mt-1 text-[11px] text-gray-500">
                  SketchUp, PDF, imágenes y demás: usa los botones siguientes. La vista de abajo es opcional.
                </p>
                <div className="mt-3 flex max-h-36 flex-col gap-2 overflow-y-auto">
                  {activePreview.files.map((f) => (
                    <DesignFileDownloadRow
                      key={f.id}
                      file={f}
                      isPreviewSelected={previewFileId === f.id}
                      onSelectPreview={() => setPreviewFileId(f.id)}
                    />
                  ))}
                </div>
              </div>
              <div className="border-t border-gray-100 bg-gray-50 px-6 pb-2 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Vista previa</p>
              </div>
              <div className="relative flex max-h-[55vh] min-h-[200px] items-center justify-center overflow-hidden bg-gray-100 px-4 pb-4">
                {activePreviewImageSrc ? (
                  <>
                    <PreviewImagePane
                      src={activePreviewImageSrc}
                      alt={`Diseño ${activePreview.clientName}`}
                      onOpenZoom={openZoomViewer}
                    />
                    <button
                      type="button"
                      onClick={openZoomViewer}
                      className="absolute right-6 top-2 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-gray-600 shadow-sm backdrop-blur-sm transition hover:bg-white"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      Pantalla completa
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Sin imagen disponible</p>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
                <button
                  type="button"
                  onClick={goToPrev}
                  className="flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </button>
                <p className="text-xs text-gray-400">Usa ← → para navegar · ESC para cerrar</p>
                <button
                  type="button"
                  onClick={goToNext}
                  className="flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {isZoomOpen && activePreview && activePreviewImageSrc ? (
        <div
          className="fixed inset-0 z-[100] flex select-none items-center justify-center bg-black/95 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Vista previa en pantalla completa"
        >
          <button
            type="button"
            onClick={() => {
              setIsZoomOpen(false);
              setIsZoomedIn(false);
            }}
            className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            <X className="h-4 w-4" />
            Cerrar (Esc)
          </button>

          <div className="flex h-full w-full items-center justify-center overflow-auto p-4">
            <img
              src={previewImageSrc(activePreviewImageSrc) ?? activePreviewImageSrc}
              alt={`Diseño ${activePreview.clientName}`}
              onClick={() => setIsZoomedIn((current) => !current)}
              className={`object-contain transition-transform duration-200 select-none ${
                isZoomedIn
                  ? "max-w-none scale-150 cursor-zoom-out"
                  : "max-h-[90vh] max-w-[90vw] cursor-zoom-in"
              }`}
            />
          </div>

          <p className="pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/50 px-4 py-2 text-xs text-white/90">
            Clic en la imagen para acercar/alejar · Esc para salir
          </p>
        </div>
      ) : null}
    </div>
  );
}
