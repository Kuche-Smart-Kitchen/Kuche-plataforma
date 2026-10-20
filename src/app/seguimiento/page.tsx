"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useEscapeClose } from "@/hooks/useEscapeClose";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { seguimientoApi } from "@/lib/axios";
import { getTasksFromLocalStorage, type KanbanTask } from "@/lib/kanban";
import { loadKanbanTasksForEmpleadoView } from "@/lib/empleado-kanban-filters";
import {
  normalizeSeguimientoLookupCode,
  seguimientoProjectFromLocalKanban,
} from "@/lib/seguimiento-access";
import {
  mergeSeguimientoFromStorage,
  mergeSeguimientoProjectQuotes,
  enrichSeguimientoParsedWithKanbanIfMissing,
} from "@/lib/seguimiento-project";
import { ConfirmedDashboard } from "./ConfirmedDashboard";
import { ProspectDashboard } from "./ProspectDashboard";
import {
  isPlaceholderPreliminarArchivo,
  applyEntregaDesdeLevantamiento,
  withCotizacionFormalArchivo,
  withLevantamientoDetalladoArchivo,
  type SeguimientoProject,
} from "./lib";

/** Evita null en hooks antes de cargar proyecto con código. */
const VOID_SEGUIMIENTO = mergeSeguimientoFromStorage({ codigo: "", cliente: "" });

function positiveAmount(value: unknown): number {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0;
}

function totalFromQuoteRecord(value: unknown): number {
  if (!value || typeof value !== "object" || Array.isArray(value)) return 0;
  return positiveAmount((value as Record<string, unknown>).total);
}

function totalFromQuoteList(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  for (const item of value) {
    const total = totalFromQuoteRecord(item);
    if (total > 0) return total;
  }
  return 0;
}

function sumPagosAmounts(pagos: unknown): number {
  if (!pagos || typeof pagos !== "object") return 0;
  const record = pagos as Record<string, unknown>;
  const amountOf = (key: string) => {
    const row = record[key];
    if (!row || typeof row !== "object") return 0;
    return positiveAmount((row as Record<string, unknown>).amount);
  };
  return amountOf("anticipo") + amountOf("segundoPago") + amountOf("liquidacion");
}

/** Si el portal no trae inversión, la cotización formal gana al levantamiento y, si no hay cotización, a la suma de pagos. */
function coalesceSeguimientoInversion(parsed: Record<string, unknown>): Record<string, unknown> {
  if (positiveAmount(parsed.inversion) > 0) return parsed;
  const inversion =
    totalFromQuoteList(parsed.cotizacionesFormales) ||
    totalFromQuoteRecord(parsed.cotizacionFormalData) ||
    totalFromQuoteList(parsed.preliminarCotizaciones) ||
    totalFromQuoteRecord(parsed.preliminarData) ||
    sumPagosAmounts(parsed.pagos);
  if (inversion <= 0) return parsed;
  return { ...parsed, inversion };
}

function preferQuoteRecord<T>(primary: unknown, fallback: T | undefined): T | undefined {
  if (primary && typeof primary === "object" && !Array.isArray(primary) && Object.keys(primary).length > 0) {
    return primary as T;
  }
  return fallback;
}

function preferQuoteList<T>(primary: unknown, fallback: T[] | undefined): T[] | undefined {
  if (Array.isArray(primary) && primary.length > 0) return primary as T[];
  return fallback;
}

function archivoIdentity(file: unknown): string {
  if (!file || typeof file !== "object") return "";
  const row = file as Record<string, unknown>;
  return String(row.id ?? row.src ?? row.url ?? row.name ?? row.nombre ?? "").trim();
}

function mergeSeguimientoArchivos(fromProject: unknown[], fromEndpoint: unknown[]): unknown[] {
  const merged: unknown[] = [];
  const seen = new Set<string>();
  for (const file of [...fromEndpoint, ...fromProject]) {
    if (!file || typeof file !== "object") continue;
    const row = file as { id?: unknown; name?: unknown; nombre?: unknown };
    if (isPlaceholderPreliminarArchivo(row)) continue;
    const key = archivoIdentity(file);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(file);
  }
  return merged;
}

export default function SeguimientoPage() {
  const [codigo, setCodigo] = useState("");
  const [hasAccess, setHasAccess] = useState(false);
  const [trackingToken, setTrackingToken] = useState<string | null>(null);
  const [project, setProject] = useState<SeguimientoProject | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<null | { name: string; src: string }>(null);
  const codigoInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEscapeClose(Boolean(selectedImage), () => setSelectedImage(null));
  useFocusTrap(Boolean(selectedImage), modalRef);

  const currentProject = project ?? VOID_SEGUIMIENTO;
  const isProspect = currentProject.isProspect;
  const [filesWarning, setFilesWarning] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const lookupInFlight = useRef(false);

  const BUSY_MESSAGE = "Servidor ocupado. Espera unos segundos e intenta de nuevo";

  const openImage = (name: string, src: string) => setSelectedImage({ name, src });

  const handleAccessSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (lookupInFlight.current) return;

      const fromForm = new FormData(event.currentTarget).get("codigo");
      const rawCode =
        (typeof fromForm === "string" && fromForm) ||
        codigoInputRef.current?.value ||
        codigo;
      const lookupCode = normalizeSeguimientoLookupCode(rawCode);

      if (!lookupCode) {
        setCodeError("Ingresa un código de proyecto.");
        return;
      }

      setFilesWarning(null);
      setCodeError(null);

      if (typeof window === "undefined") {
        setCodeError("No se pudo validar el código en este dispositivo.");
        return;
      }

      lookupInFlight.current = true;
      setIsLookingUp(true);

      const openProject = async (parsed: Record<string, unknown>) => {
        let tasks: KanbanTask[] = getTasksFromLocalStorage();
        const lookup = lookupCode.trim().toUpperCase().replace(/^K-/, "");
        const memoryHasQuote = tasks.some((task) => {
          const code = (task.codigoProyecto || task.clienteId || task.codigo || task.codigoCliente || "")
            .trim()
            .toUpperCase()
            .replace(/^K-/, "");
          return code === lookup && Boolean(task.preliminarData || task.preliminarCotizaciones?.length);
        });
        if (!memoryHasQuote) {
          try {
            const loaded = await loadKanbanTasksForEmpleadoView();
            if (loaded.length > 0) tasks = loaded;
          } catch {
            tasks = getTasksFromLocalStorage();
          }
        }
        const enriched = coalesceSeguimientoInversion(
          enrichSeguimientoParsedWithKanbanIfMissing(parsed, tasks),
        );
        const merged = mergeSeguimientoFromStorage(enriched) as SeguimientoProject;
        setProject(
          applyEntregaDesdeLevantamiento(
          withCotizacionFormalArchivo(
            withLevantamientoDetalladoArchivo({
              ...merged,
              preliminarData: preferQuoteRecord(enriched.preliminarData, merged.preliminarData),
              preliminarCotizaciones: preferQuoteList(
                enriched.preliminarCotizaciones,
                merged.preliminarCotizaciones,
              ),
              cotizacionFormalData: preferQuoteRecord(
                enriched.cotizacionFormalData,
                merged.cotizacionFormalData,
              ),
              cotizacionesFormales: preferQuoteList(
                enriched.cotizacionesFormales,
                merged.cotizacionesFormales,
              ),
            }),
          ),
          ),
        );
        setCodigo(String(enriched.codigo ?? lookupCode).trim());
        setHasAccess(true);
        setCodeError(null);
      };

      try {
        let parsed: Record<string, unknown> | null = null;

        try {
          const response = await seguimientoApi.consultarSeguimientoPorCodigo(lookupCode);
          if (response.success && response.data?.project) {
            const token = response.data.token;
            setTrackingToken(token);
            parsed = response.data.project;
            try {
              const [projectResponse, filesResponse, paymentsResponse] = await Promise.all([
                seguimientoApi.obtenerProyectoSeguimiento(token),
                seguimientoApi.obtenerArchivosSeguimiento(token),
                seguimientoApi.obtenerPagosSeguimiento(token),
              ]);
              if (projectResponse.success && projectResponse.data) {
                parsed = mergeSeguimientoProjectQuotes(projectResponse.data, parsed, project);
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
                const fromProject = Array.isArray(parsed.archivos) ? parsed.archivos : [];
                parsed = {
                  ...parsed,
                  archivos: mergeSeguimientoArchivos(fromProject, fromEndpoint),
                };
              } else {
                setFilesWarning(filesResponse.message || "No pudimos cargar los archivos del seguimiento.");
              }
              if (paymentsResponse.success && paymentsResponse.data) {
                parsed = { ...parsed, pagos: paymentsResponse.data.pagos ?? paymentsResponse.data };
              }
            } catch (detailError) {
              if (seguimientoApi.seguimientoHttpStatus(detailError) === 429) {
                setCodeError(BUSY_MESSAGE);
                return;
              }
              if (seguimientoApi.seguimientoHttpStatus(detailError) === 404) {
                parsed = seguimientoProjectFromLocalKanban(lookupCode) ?? parsed;
              }
            }
          }
        } catch (error) {
          const status = seguimientoApi.seguimientoHttpStatus(error);
          if (status === 429) {
            setCodeError(BUSY_MESSAGE);
            return;
          }
          if (status === 404) {
            parsed = seguimientoProjectFromLocalKanban(lookupCode);
          } else {
            setCodeError("No encontramos un proyecto con ese código.");
            return;
          }
        }

        if (!parsed) {
          parsed = seguimientoProjectFromLocalKanban(lookupCode);
        }
        if (!parsed) {
          setCodeError("No encontramos un proyecto con ese código.");
          return;
        }

        await openProject(parsed);
      } catch {
        setCodeError("Hubo un problema al leer tu proyecto. Intenta de nuevo.");
      } finally {
        lookupInFlight.current = false;
        setIsLookingUp(false);
      }
    },
    [codigo, project],
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
                    disabled={isLookingUp}
                    className="mt-6 w-full rounded-2xl bg-accent py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
                  >
                    {isLookingUp ? "Consultando..." : "Ver Progreso"}
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
