"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useEscapeClose } from "@/hooks/useEscapeClose";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useClienteArchivos } from "@/hooks/useClienteArchivos";
import { seguimientoApi } from "@/lib/axios";
import { kanbanStorageKey, type KanbanTask } from "@/lib/kanban";
import {
  normalizePublicProjectCodeInput,
  resolveSeguimientoProjectByCode,
} from "@/lib/seguimiento-access";
import {
  mergeSeguimientoFromStorage,
  enrichSeguimientoParsedWithKanbanIfMissing,
} from "@/lib/seguimiento-project";
import { ConfirmedDashboard } from "./ConfirmedDashboard";
import { ProspectDashboard } from "./ProspectDashboard";
import type { SeguimientoProject } from "./lib";

/** Evita null en hooks antes de cargar proyecto con código. */
const VOID_SEGUIMIENTO = mergeSeguimientoFromStorage({ codigo: "", cliente: "" });

export default function SeguimientoPage() {
  const [codigo, setCodigo] = useState("");
  const [hasAccess, setHasAccess] = useState(false);
  const [project, setProject] = useState<SeguimientoProject | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<null | { name: string; src: string }>(null);
  const codigoInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEscapeClose(Boolean(selectedImage), () => setSelectedImage(null));
  useFocusTrap(Boolean(selectedImage), modalRef);

  const currentProject = project ?? VOID_SEGUIMIENTO;
  const isProspect = currentProject.isProspect;
  const normalizedCodigo = useMemo(() => normalizePublicProjectCodeInput(codigo), [codigo]);
  const backendLookupCode = useMemo(() => normalizedCodigo.replace(/^K-/, ""), [normalizedCodigo]);
  const projectFilesCount = project?.archivos?.length ?? 0;
  const shouldFetchRemoteFiles = Boolean(project) && hasAccess && projectFilesCount === 0;
  const { archivos: remoteFiles, error: remoteFilesError } = useClienteArchivos(
    backendLookupCode,
    shouldFetchRemoteFiles,
  );

  const filesWarning = shouldFetchRemoteFiles && remoteFilesError
    ? "No pudimos cargar archivos remotos; se muestran los archivos guardados localmente."
    : null;

  const currentProject = useMemo(() => {
    if (!project) {
      return VOID_SEGUIMIENTO;
    }

    if (!shouldFetchRemoteFiles || remoteFiles.length === 0) {
      return project;
    }

    const mappedRemoteFiles = remoteFiles.map((f) => ({
      id: f._id,
      name: f.nombre,
      type: f.tipo,
      src: f.url,
    }));

    const currentSignature = JSON.stringify(project.archivos ?? []);
    const nextSignature = JSON.stringify(mappedRemoteFiles);
    if (currentSignature === nextSignature) {
      return project;
    }

    return {
      ...project,
      archivos: mappedRemoteFiles,
    };
  }, [project, remoteFiles, shouldFetchRemoteFiles]);

  const openImage = (name: string, src: string) => setSelectedImage({ name, src });

  const handleAccessSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const fromForm = new FormData(event.currentTarget).get("codigo");
      const rawCode =
        (typeof fromForm === "string" && fromForm) ||
        codigoInputRef.current?.value ||
        codigo;

      if (!rawCode.trim()) {
        setCodeError("Ingresa un código de proyecto.");
        return;
      }

      if (typeof window === "undefined") {
        setCodeError("No se pudo validar el código en este dispositivo.");
        return;
      }

      let parsed = resolveSeguimientoProjectByCode(rawCode);

      if (!parsed) {
        const candidates = [
          rawCode.trim().toUpperCase().replace(/\s+/g, ""),
          normalizePublicProjectCodeInput(rawCode),
          normalizePublicProjectCodeInput(rawCode).replace(/^K-/, ""),
        ].filter(Boolean);

        const uniqueCandidates = Array.from(new Set(candidates));

        for (const candidate of uniqueCandidates) {
          try {
            const response = await seguimientoApi.autenticarSeguimientoCliente(candidate);
            if (!response.success || !response.data?.project) continue;

            parsed = response.data.project;
            break;
          } catch {
            // Keep trying fallback code formats before reporting an error.
          }
        }

        if (!parsed) {
          setCodeError("No encontramos un proyecto con ese código.");
          return;
        }
      }

      let tasks: KanbanTask[] = [];
      try {
        const kt = window.localStorage.getItem(kanbanStorageKey);
        if (kt) tasks = JSON.parse(kt) as KanbanTask[];
      } catch {
        tasks = [];
      }

      try {
        const enriched = enrichSeguimientoParsedWithKanbanIfMissing(parsed, tasks);
        setProject(mergeSeguimientoFromStorage(enriched) as SeguimientoProject);
        setCodigo(String(enriched.codigo ?? rawCode).trim());
        setHasAccess(true);
        setCodeError(null);
      } catch {
        setCodeError("Hubo un problema al leer tu proyecto. Intenta de nuevo.");
      }
    },
    [codigo],
  );

  return (
    <main className="min-h-screen bg-background pt-28 text-primary md:pt-32">
      <div className="mx-auto max-w-6xl px-4 pb-12">
        <AnimatePresence mode="wait">
          {!hasAccess ? (
            <motion.div
              key="access"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4 }}
              className="flex min-h-[70vh] items-center justify-center"
            >
              <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl sm:p-10">
                <h1 className="text-2xl font-semibold">Rastrea tu Proyecto Küche</h1>
                <p className="mt-2 text-sm text-secondary">
                  Ingresa tu código único para ver el avance de tu cocina.
                </p>
                <form onSubmit={handleAccessSubmit}>
                  <label className="mt-6 block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                    Ingresa tu Código de Proyecto
                    <input
                      ref={codigoInputRef}
                      name="codigo"
                      type="text"
                      inputMode="text"
                      autoComplete="off"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      enterKeyHint="go"
                      value={codigo}
                      onChange={(event) => {
                        setCodigo(event.target.value);
                        setCodeError(null);
                      }}
                      placeholder="K-8821"
                      className="mt-3 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-base outline-none sm:text-sm"
                    />
                  </label>
                  {codeError ? (
                    <p className="mt-3 text-xs font-semibold text-red-600">{codeError}</p>
                  ) : null}
                  <button
                    type="submit"
                    className="mt-6 w-full rounded-2xl bg-accent py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
                  >
                    Ver Progreso
                  </button>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4 }}
              className="space-y-10"
            >
              {filesWarning ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {filesWarning}
                </div>
              ) : null}
              {isProspect ? (
                <ProspectDashboard project={currentProject} onOpenImage={openImage} />
              ) : (
                <ConfirmedDashboard project={currentProject} onOpenImage={openImage} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {selectedImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div
            ref={modalRef}
            tabIndex={-1}
            className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-white p-5 shadow-2xl"
          >
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-primary/5 pb-3">
              <h3 className="max-w-[70%] truncate text-base font-semibold text-primary">
                {selectedImage.name}
              </h3>
              <button
                type="button"
                className="rounded-full border border-primary/10 bg-primary/5 px-4 py-1.5 text-xs font-bold text-primary transition hover:border-accent hover:bg-accent hover:text-white"
                onClick={() => setSelectedImage(null)}
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4 flex w-full justify-center overflow-hidden rounded-2xl bg-neutral-900/5 p-2">
              <img
                src={selectedImage.src}
                alt={selectedImage.name}
                className="h-auto w-auto max-h-[60vh] max-w-full rounded-lg object-contain md:max-h-[65vh]"
              />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
