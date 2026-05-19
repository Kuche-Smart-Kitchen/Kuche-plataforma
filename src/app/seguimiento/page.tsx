"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useEscapeClose } from "@/hooks/useEscapeClose";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { kanbanStorageKey, type KanbanTask } from "@/lib/kanban";
import { resolveSeguimientoProjectByCode } from "@/lib/seguimiento-access";
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

  const openImage = (name: string, src: string) => setSelectedImage({ name, src });

  const handleAccessSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
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

      const parsed = resolveSeguimientoProjectByCode(rawCode);
      if (!parsed) {
        setCodeError("No encontramos un proyecto con ese código.");
        return;
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            ref={modalRef}
            tabIndex={-1}
            className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-primary">{selectedImage.name}</h3>
              <button
                className="rounded-full border border-primary/10 px-3 py-1 text-xs font-semibold text-primary transition hover:border-accent hover:text-accent"
                onClick={() => setSelectedImage(null)}
              >
                Cerrar
              </button>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl bg-primary/5">
              <img
                src={selectedImage.src}
                alt={selectedImage.name}
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
