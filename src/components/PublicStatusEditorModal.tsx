"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

import DateMaskInput from "@/components/ui/DateMaskInput";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { seguimientoProjectStoragePrefix } from "@/lib/kanban";
import { persistSeguimientoRecordForLocalStorage } from "@/lib/seguimiento-storage-blobs";
import {
  mergeSeguimientoFromStorage,
  pagosMatchDefaultInversionSplit,
  TIMELINE_STEPS,
  type SeguimientoClienteProject,
  type SeguimientoPagos,
  type TimelineStep,
} from "@/lib/seguimiento-project";

export type PublicStatusEditorRole = "admin" | "employee";

type ArchivoSeg = {
  id: string;
  name: string;
  type: string;
  src?: string;
  indexedPdfKey?: string;
};

/** Contenedor visible para `<input type="file">` oculto (hover claro; el nativo casi no se estiliza). */
const filePickButtonClass =
  "flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary/30 bg-white px-4 py-3 text-xs font-semibold text-secondary transition hover:border-primary/50 hover:bg-primary/[0.06] hover:text-primary";

const digitsOnly = (raw: string) => raw.replace(/\D/g, "");

function parseMoneyInput(raw: string): number {
  if (raw.trim() === "") return 0;
  const n = Number.parseInt(raw.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Objetivo por debajo del umbral de offload (~40KB) para no depender solo de IndexedDB al guardar. */
const RECEIPT_JPEG_TARGET_MAX_LEN = 35 * 1024;

function compressImageFileToJpegDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        const maxW = 1600;
        if (w > maxW) {
          h = Math.round((h * maxW) / w);
          w = maxW;
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          void readFileAsDataUrl(file).then(resolve).catch(reject);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        let q = 0.88;
        let jpeg = "";
        for (let i = 0; i < 12; i++) {
          jpeg = canvas.toDataURL("image/jpeg", q);
          if (jpeg.length <= RECEIPT_JPEG_TARGET_MAX_LEN || q <= 0.52) break;
          q -= 0.07;
        }
        resolve(jpeg);
      } catch {
        void readFileAsDataUrl(file).then(resolve).catch(reject);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      void readFileAsDataUrl(file).then(resolve).catch(reject);
    };
    img.src = objectUrl;
  });
}

/** PDF sin tocar; imágenes se comprimen a JPEG para el seguimiento del cliente. */
async function readReceiptOrPdfAsStoredDataUrl(file: File): Promise<string> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return readFileAsDataUrl(file);
  }
  if (file.type.startsWith("image/")) {
    return compressImageFileToJpegDataUrl(file);
  }
  return readFileAsDataUrl(file);
}

function toInputDate(isoLike: string): string {
  const t = Date.parse(isoLike);
  if (Number.isNaN(t)) return "";
  const d = new Date(t);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type PublicStatusEditorModalProps = {
  open: boolean;
  onClose: () => void;
  role: PublicStatusEditorRole;
  /** Código K-XXXX del proyecto (debe existir en localStorage). */
  codigoProyecto: string;
  /** Texto del encabezado, ej. nombre del cliente o proyecto. */
  subtitle: string;
  onSaved?: () => void;
};

export function PublicStatusEditorModal({
  open,
  onClose,
  role,
  codigoProyecto,
  subtitle,
  onSaved,
}: PublicStatusEditorModalProps) {
  void role;
  const modalRef = useRef<HTMLDivElement | null>(null);
  /** Data URLs enormes en `draft` bloquean React/Chrome (modal “en blanco”). Se guardan fuera del estado. */
  const baselineReceiptsRef = useRef<Record<keyof SeguimientoPagos, string>>({
    anticipo: "",
    segundoPago: "",
    liquidacion: "",
  });
  const pendingReceiptsRef = useRef<Partial<Record<keyof SeguimientoPagos, string>>>({});
  const [receiptTick, setReceiptTick] = useState(0);
  const [draft, setDraft] = useState<SeguimientoClienteProject | null>(null);
  /** Solo fallo al cargar desde localStorage (bloquea el formulario). */
  const [loadError, setLoadError] = useState<string | null>(null);
  /** Fallo al guardar: no debe usar `loadError` o el botón Guardar queda deshabilitado y no se puede reintentar. */
  const [saveError, setSaveError] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const [newFileType, setNewFileType] = useState("pdf");
  const [newFileSrc, setNewFileSrc] = useState<string | undefined>(undefined);
  const [mounted, setMounted] = useState(false);
  /** Texto en inputs de dinero: permite vacío mientras escribes (evita el 0 “pegado” de type=number). */
  const [inversionText, setInversionText] = useState("");
  const [pagoAmountText, setPagoAmountText] = useState({
    anticipo: "",
    segundoPago: "",
    liquidacion: "",
  });
  /** Mini confirmación verde tras guardar (unos segundos antes de cerrar). */
  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      if (saveSuccessTimerRef.current) {
        clearTimeout(saveSuccessTimerRef.current);
        saveSuccessTimerRef.current = null;
      }
    };
  }, []);

  useEscapeClose(open && !saveSuccessVisible && !isSaving, onClose);
  /** Sin focus trap aquí: Chrome + selector de archivos del SO deja la animación de Framer en opacity:0
   *  o el foco en un input sr-only y el panel parece “vacío” sin poder salir. Escape y Cerrar siguen disponibles. */

  const projectKey = `${seguimientoProjectStoragePrefix}${codigoProyecto}`;

  const reload = useCallback(() => {
    if (typeof window === "undefined" || !codigoProyecto.trim()) {
      setDraft(null);
      setLoadError("Código de proyecto inválido.");
      return;
    }
    try {
      const raw = window.localStorage.getItem(projectKey);
      if (!raw) {
        setDraft(null);
        setLoadError(
          "No hay datos de seguimiento guardados para este código. Debe existir un proyecto con cotización o levantamiento previo.",
        );
        return;
      }
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const merged = mergeSeguimientoFromStorage(parsed);
      const p = merged.pagos;
      /** Montos en tercios iguales a la inversión = reparto automático del cotizador; no prellenar el modal. */
      const legacyAutoSplit =
        merged.inversion > 0 && pagosMatchDefaultInversionSplit(merged.inversion, p);
      const pagosForForm: SeguimientoPagos = legacyAutoSplit
        ? {
            anticipo: { ...p.anticipo, amount: 0 },
            segundoPago: { ...p.segundoPago, amount: 0 },
            liquidacion: { ...p.liquidacion, amount: 0 },
          }
        : p;
      baselineReceiptsRef.current = {
        anticipo: pagosForForm.anticipo.receiptImage ?? "",
        segundoPago: pagosForForm.segundoPago.receiptImage ?? "",
        liquidacion: pagosForForm.liquidacion.receiptImage ?? "",
      };
      pendingReceiptsRef.current = {};
      setReceiptTick((t) => t + 1);
      /** Sincronizar montos ya guardados en inputs (si no, un nuevo guardado borraba anticipo con parseMoneyInput(""). */
      const pagoTextFromAmount = (amount: number) =>
        amount > 0 ? String(Math.max(0, Math.round(amount))) : "";
      setPagoAmountText({
        anticipo: pagoTextFromAmount(pagosForForm.anticipo.amount),
        segundoPago: pagoTextFromAmount(pagosForForm.segundoPago.amount),
        liquidacion: pagoTextFromAmount(pagosForForm.liquidacion.amount),
      });
      setDraft({
        ...merged,
        pagos: {
          /** `receiptImage` vacío en estado: los data URL grandes viven en baselineReceiptsRef. Montos/fechas sí del guardado. */
          anticipo: { ...pagosForForm.anticipo, receiptImage: "" },
          segundoPago: { ...pagosForForm.segundoPago, receiptImage: "" },
          liquidacion: { ...pagosForForm.liquidacion, receiptImage: "" },
        },
      });
      setInversionText(merged.inversion === 0 ? "" : String(merged.inversion));
      setLoadError(null);
      setSaveError(null);
    } catch {
      setDraft(null);
      setLoadError("No se pudo leer el proyecto.");
    }
  }, [projectKey, codigoProyecto]);

  useEffect(() => {
    if (open) reload();
  }, [open, reload]);

  const totalPagado = useMemo(() => {
    if (!draft) return 0;
    return (
      parseMoneyInput(pagoAmountText.anticipo) +
      parseMoneyInput(pagoAmountText.segundoPago) +
      parseMoneyInput(pagoAmountText.liquidacion)
    );
  }, [draft, pagoAmountText]);

  const restante = useMemo(() => Math.max(0, (draft?.inversion ?? 0) - totalPagado), [draft, totalPagado]);

  /** Combina montos/fechas del borrador con comprobantes en refs (nunca megabytes en estado React). */
  const effectivePagosFor = useCallback((d: SeguimientoClienteProject): SeguimientoPagos => {
    const keys: (keyof SeguimientoPagos)[] = ["anticipo", "segundoPago", "liquidacion"];
    const next: SeguimientoPagos = { ...d.pagos };
    for (const k of keys) {
      const ri =
        pendingReceiptsRef.current[k] ??
        baselineReceiptsRef.current[k] ??
        d.pagos[k].receiptImage ??
        "";
      next[k] = { ...d.pagos[k], receiptImage: ri };
    }
    return next;
  }, []);

  const updatePago = (key: keyof SeguimientoPagos, patch: Partial<SeguimientoPagos[keyof SeguimientoPagos]>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pagos: {
          ...prev.pagos,
          [key]: { ...prev.pagos[key], ...patch },
        },
      };
    });
  };

  const handleSave = useCallback(async () => {
    if (typeof window === "undefined" || !draft) {
      setSaveError("No hay datos cargados. Cierra el modal y ábrelo de nuevo.");
      return;
    }
    setSaveError(null);
    setIsSaving(true);
    try {
      const prevRaw = window.localStorage.getItem(projectKey);
      let baseParsed: Record<string, unknown>;
      try {
        baseParsed = prevRaw ? (JSON.parse(prevRaw) as Record<string, unknown>) : {};
      } catch {
        setSaveError("Los datos guardados están dañados. Recarga la página o contacta soporte.");
        return;
      }
      const baseMerged = mergeSeguimientoFromStorage(baseParsed);

      const draftForSave: SeguimientoClienteProject = {
        ...draft,
        inversion: parseMoneyInput(inversionText),
        pagos: {
          anticipo: {
            ...draft.pagos.anticipo,
            amount: parseMoneyInput(pagoAmountText.anticipo),
          },
          segundoPago: {
            ...draft.pagos.segundoPago,
            amount: parseMoneyInput(pagoAmountText.segundoPago),
          },
          liquidacion: {
            ...draft.pagos.liquidacion,
            amount: parseMoneyInput(pagoAmountText.liquidacion),
          },
        },
      };

      const next: Record<string, unknown> = {
        ...baseMerged,
        ...draftForSave,
        codigo: draftForSave.codigo,
        cliente: draftForSave.cliente,
        etapaActual: draftForSave.etapaActual as TimelineStep,
        archivos: draftForSave.archivos,
        pagos: effectivePagosFor(draftForSave),
      };

      let persisted: Record<string, unknown>;
      try {
        persisted = await persistSeguimientoRecordForLocalStorage(next, codigoProyecto);
      } catch (err) {
        console.error(err);
        setSaveError(
          "No se pudieron guardar los archivos adjuntos (comprobantes o PDFs demasiado pesados). Prueba reducir el tamaño o el número de páginas.",
        );
        return;
      }

      let serialized: string;
      try {
        serialized = JSON.stringify(persisted);
      } catch (err) {
        console.error(err);
        setSaveError("No se pudo serializar los datos. Revisa archivos o comprobantes muy grandes.");
        return;
      }
      try {
        window.localStorage.setItem(projectKey, serialized);
      } catch (e) {
        const name = e instanceof DOMException ? e.name : "";
        if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED") {
          setSaveError(
            "No hay espacio suficiente en el navegador (comprobantes o PDFs muy pesados). Elimina archivos grandes o usa otro navegador.",
          );
        } else {
          setSaveError("No se pudo guardar en el almacenamiento local. Intenta de nuevo.");
        }
        return;
      }
      onSaved?.();
      if (saveSuccessTimerRef.current) {
        clearTimeout(saveSuccessTimerRef.current);
      }
      setSaveSuccessVisible(true);
      saveSuccessTimerRef.current = setTimeout(() => {
        saveSuccessTimerRef.current = null;
        setSaveSuccessVisible(false);
        onClose();
      }, 2200);
    } catch (e) {
      console.error(e);
      setSaveError("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setIsSaving(false);
    }
  }, [
    draft,
    projectKey,
    inversionText,
    pagoAmountText,
    effectivePagosFor,
    onSaved,
    onClose,
  ]);

  const addArchivo = () => {
    if (!draft) return;
    const trimmed = newFileName.trim();
    const defaultName = newFileType === "jpg" ? "Imagen.jpg" : "Documento.pdf";
    const name = trimmed || defaultName;
    const item: ArchivoSeg = {
      id: `seg-${Date.now()}`,
      name,
      type: newFileType,
      ...(newFileSrc ? { src: newFileSrc } : {}),
    };
    setDraft((prev) =>
      prev
        ? { ...prev, archivos: [...(prev.archivos as ArchivoSeg[]), item] }
        : prev,
    );
    setNewFileName("");
    setNewFileSrc(undefined);
  };

  const removeArchivo = (id: string) => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            archivos: (prev.archivos as ArchivoSeg[]).filter((a) => a.id !== id),
          }
        : prev,
    );
  };

  if (!open || !mounted || typeof document === "undefined") return null;

  const modalTree = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4"
      style={{ isolation: "isolate" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saveSuccessVisible && !isSaving) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="public-status-editor-title"
        className={`flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl transition-opacity duration-300 ${saveSuccessVisible || isSaving ? "pointer-events-none opacity-50" : ""}`}
        style={{ color: "#111827" }}
        onClick={(e) => e.stopPropagation()}
      >
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!draft || loadError || saveSuccessVisible || isSaving) return;
            void handleSave();
          }}
        >
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-3">
          <h3 id="public-status-editor-title" className="text-lg font-semibold text-gray-900">
            Editar estatus público
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border border-gray-300 px-3 py-1 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
          <p className="mt-1 text-sm font-medium text-gray-800">{subtitle}</p>
          <p className="mt-2 text-sm text-gray-600">
            Código: <span className="font-mono font-semibold">{codigoProyecto}</span>
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Cambia el paso del timeline y los datos que ve el cliente en /seguimiento.
          </p>

          {loadError ? (
            <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              {loadError}
            </p>
          ) : null}
          {saveError ? (
            <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              {saveError}
            </p>
          ) : null}

          {draft && !loadError ? (
            <>
              <div className="mt-4">
                <label className="text-xs font-semibold text-secondary">
                  Paso actual (timeline)
                  <select
                    value={draft.etapaActual}
                    onChange={(e) =>
                      setDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              etapaActual: e.target.value as TimelineStep,
                            }
                          : prev,
                      )
                    }
                    className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                  >
                    {TIMELINE_STEPS.map((step) => (
                      <option key={step} value={step}>
                        {step}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-4">
                <label className="text-xs font-semibold text-secondary">
                  Inversión total (MXN)
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="0"
                    value={inversionText}
                    onChange={(e) => setInversionText(digitsOnly(e.target.value))}
                    onBlur={() => {
                      const n = parseMoneyInput(inversionText);
                      setInversionText(n === 0 ? "" : String(n));
                      setDraft((prev) => (prev ? { ...prev, inversion: n } : prev));
                    }}
                    className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none placeholder:text-secondary/50"
                  />
                </label>
                <p className="mt-1 text-[11px] text-secondary">
                  Viene del cotizador; ajústala si hace falta. Los montos por parcialidad se capturan abajo y no se
                  reparten solos.
                </p>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold text-secondary">
                  Estado del proyecto
                  <select
                    value={draft.estadoProyecto}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDraft((prev) => {
                        if (!prev) return prev;
                        const next = { ...prev, estadoProyecto: v };
                        if (v === "Completado/Entregado" && !String(prev.garantiaInicio ?? "").trim()) {
                          next.garantiaInicio = new Date().toISOString().slice(0, 10);
                        }
                        return next;
                      });
                    }}
                    className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                  >
                    <option value="En proceso">En proceso</option>
                    <option value="Prospecto">Prospecto</option>
                    <option value="Completado/Entregado">Completado/Entregado</option>
                  </select>
                </label>
                <label className="text-xs font-semibold text-secondary">
                  Inicio de garantía (entrega)
                  <input
                    type="date"
                    value={toInputDate(draft.garantiaInicio)}
                    onChange={(e) =>
                      setDraft((prev) =>
                        prev ? { ...prev, garantiaInicio: e.target.value || "" } : prev,
                      )
                    }
                    className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                  />
                  <p className="mt-1 text-[10px] text-gray-500">
                    Si pasas a «Completado/Entregado» sin fecha, se usa hoy; ajústala si hace falta.
                  </p>
                </label>
              </div>

              <div className="mt-5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                  Archivos visibles al cliente
                </p>
                {(draft.archivos as ArchivoSeg[]).length === 0 ? (
                  <p className="text-sm text-secondary">Sin archivos aún.</p>
                ) : (
                  (draft.archivos as ArchivoSeg[]).map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between gap-2 rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm"
                    >
                      <span className="truncate">{file.name}</span>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs uppercase text-secondary">{file.type}</span>
                        <button
                          type="button"
                          onClick={() => removeArchivo(file.id)}
                          className="text-xs font-semibold text-rose-600 hover:underline"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_100px]">
                <input
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="Nombre del archivo"
                  className="rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                />
                <select
                  value={newFileType}
                  onChange={(e) => {
                    setNewFileType(e.target.value);
                    setNewFileSrc(undefined);
                  }}
                  className="rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                >
                  <option value="pdf">PDF</option>
                  <option value="jpg">JPG</option>
                </select>
              </div>
              <label className="mt-2 block cursor-pointer text-xs text-gray-600">
                <span className="mb-1 block font-semibold">
                  {newFileType === "pdf" ? "Archivo PDF" : "Imagen JPG"}
                </span>
                <span className={filePickButtonClass}>
                  <input
                    type="file"
                    accept={newFileType === "pdf" ? "application/pdf,.pdf" : "image/*"}
                    tabIndex={-1}
                    className="sr-only"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) {
                        setNewFileSrc(undefined);
                        e.target.value = "";
                        return;
                      }
                      try {
                        setNewFileSrc(
                          newFileType === "jpg" ? await compressImageFileToJpegDataUrl(f) : await readFileAsDataUrl(f),
                        );
                        setNewFileName((prev) => (prev.trim() ? prev : f.name));
                      } catch {
                        setNewFileSrc(undefined);
                      } finally {
                        e.target.value = "";
                      }
                    }}
                  />
                  Elegir archivo en tu equipo
                </span>
              </label>
              <button
                type="button"
                onClick={addArchivo}
                className="mt-3 w-full rounded-2xl border border-primary/10 bg-white py-3 text-xs font-semibold text-secondary transition hover:border-primary/25 hover:bg-primary/[0.04]"
              >
                Añadir a la lista
              </button>
              <p className="mt-2 text-[11px] text-gray-500">
                elige un archivo para que el cliente pueda abrirlo en /seguimiento.
              </p>

              <div
                className="mt-6 rounded-2xl border border-primary/10 bg-white p-4"
                data-receipt-version={receiptTick}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                  Pagos del cliente
                </p>
                <p className="mt-2 text-sm text-secondary">
                  Los montos empiezan en blanco: escribe solo lo que registras. La inversión total viene de la cotización
                  formal arriba.
                </p>
                <div className="mt-4 space-y-4">
                  {(
                    [
                      { key: "anticipo" as const, label: "Anticipo" },
                      { key: "segundoPago" as const, label: "2do pago" },
                      { key: "liquidacion" as const, label: "Liquidación" },
                    ] as const
                  ).map((item) => (
                    <div
                      key={item.key}
                      className="rounded-xl border border-primary/5 bg-primary/[0.02] p-3"
                    >
                      <p className="text-xs font-semibold text-primary">{item.label}</p>
                      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                        <label className="text-[11px] font-semibold text-secondary">
                          Monto
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            placeholder="0"
                            value={pagoAmountText[item.key]}
                            onChange={(e) => {
                              setPagoAmountText((prev) => ({
                                ...prev,
                                [item.key]: digitsOnly(e.target.value),
                              }));
                            }}
                            onBlur={() => {
                              const n = parseMoneyInput(pagoAmountText[item.key]);
                              setPagoAmountText((prev) => ({
                                ...prev,
                                [item.key]: n === 0 ? "" : String(n),
                              }));
                              updatePago(item.key, { amount: n });
                            }}
                            className="mt-1 w-full rounded-xl border border-primary/10 bg-white px-3 py-2 text-sm outline-none placeholder:text-secondary/50"
                          />
                        </label>
                        <label className="text-[11px] font-semibold text-secondary">
                          Fecha de pago
                          <DateMaskInput
                            value={draft.pagos[item.key].date ?? ""}
                            onChangeValue={(date) => updatePago(item.key, { date })}
                            className="mt-1 rounded-xl border border-primary/10 bg-white px-3 py-2 text-sm outline-none placeholder:text-secondary/50"
                          />
                        </label>
                      </div>
                      <label className="mt-2 block cursor-pointer text-[11px] font-semibold text-secondary">
                        <span className="mb-1 block">Comprobante (foto o PDF)</span>
                        <span className={filePickButtonClass}>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            tabIndex={-1}
                            className="sr-only"
                            onChange={(e) => {
                              const input = e.target;
                              const f = input.files?.[0];
                              if (!f) {
                                input.value = "";
                                return;
                              }
                              void (async () => {
                                try {
                                  const dataUrl = await readReceiptOrPdfAsStoredDataUrl(f);
                                  pendingReceiptsRef.current[item.key] = dataUrl;
                                  setReceiptTick((t) => t + 1);
                                } catch {
                                  /* ignore */
                                } finally {
                                  input.value = "";
                                }
                              })();
                            }}
                          />
                          Elegir archivo
                        </span>
                      </label>
                      {(() => {
                        const src =
                          pendingReceiptsRef.current[item.key] ??
                          baselineReceiptsRef.current[item.key] ??
                          "";
                        return src.length > 2 ? (
                          <p className="mt-1 text-[10px] text-emerald-700">Comprobante cargado.</p>
                        ) : null;
                      })()}
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                  <span className="rounded-full bg-primary/5 px-3 py-1 text-secondary">
                    Inversión:{" "}
                    <span className="font-semibold text-primary">
                      {formatCurrency(draft.inversion)}
                    </span>
                  </span>
                  <span className="rounded-full bg-primary/5 px-3 py-1 text-secondary">
                    Suma pagos:{" "}
                    <span className="font-semibold text-primary">{formatCurrency(totalPagado)}</span>
                  </span>
                  <span className="rounded-full bg-accent/10 px-3 py-1 text-accent">
                    Restante: {formatCurrency(restante)}
                  </span>
                </div>
              </div>
            </>
          ) : null}
          </div>

          <div className="pointer-events-auto relative z-20 flex shrink-0 gap-3 border-t border-gray-100 bg-white px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl border border-primary/10 bg-white py-3 text-xs font-semibold text-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!draft || Boolean(loadError) || saveSuccessVisible || isSaving}
              className="w-full rounded-2xl bg-accent py-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(
    <>
      {modalTree}
      <AnimatePresence>
        {saveSuccessVisible ? (
          <motion.div
            key="public-status-saved-toast"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 20, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="pointer-events-none fixed bottom-10 left-1/2 z-[10001] flex w-[min(92vw,340px)] -translate-x-1/2 justify-center px-3"
          >
            <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 shadow-lg shadow-emerald-900/15">
              <CheckCircle2 className="h-7 w-7 shrink-0 text-emerald-600" aria-hidden strokeWidth={2.25} />
              <span className="text-sm font-semibold leading-tight text-emerald-900">
                Cambios guardados correctamente
              </span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>,
    document.body,
  );
}
