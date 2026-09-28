"use client";

import { useRef, useState } from "react";
import { FileText, UploadCloud, X } from "lucide-react";
import { subirArchivoCliente } from "@/lib/axios/archivosClienteApi";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import type { KanbanTask } from "@/lib/kanban";

export type ContratoUploadButtonProps = {
  task: KanbanTask;
  /** Se llama tras subir con éxito, para refrescar la lista de archivos del expediente. */
  onUploaded?: () => void;
};

/** Botón + modal para subir el contrato firmado directo a Cloudinary (mismo flujo que otros archivos del cliente). */
export function ContratoUploadButton({ task, onUploaded }: ContratoUploadButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const clienteId = task.codigoProyecto?.trim();
  const canUpload = Boolean(clienteId && task.id);

  useEscapeClose(isOpen && !isUploading, () => setIsOpen(false));

  const closeModal = () => {
    if (isUploading) return;
    setIsOpen(false);
    setFile(null);
    setError(null);
    setSuccess(false);
  };

  const handleUpload = async () => {
    if (!file || !clienteId) return;
    setIsUploading(true);
    setError(null);
    try {
      const result = await subirArchivoCliente(file, clienteId, "contrato", { tareasId: task.id });
      if (!result.success) {
        setError(result.message || "No se pudo subir el contrato.");
        return;
      }
      setSuccess(true);
      onUploaded?.();
      window.setTimeout(closeModal, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir el contrato.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={!canUpload}
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <FileText className="h-4 w-4" />
        Subir contrato
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
          onClick={closeModal}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="contrato-upload-title"
            className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 id="contrato-upload-title" className="text-lg font-semibold text-gray-900">
                Subir contrato firmado
              </h3>
              <button
                type="button"
                onClick={closeModal}
                disabled={isUploading}
                className="rounded-full border border-gray-200 p-1.5 text-secondary hover:bg-gray-100 disabled:opacity-60"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-sm text-secondary">
              Se sube directo a Cloudinary y queda disponible en los archivos del cliente.
            </p>

            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/25 bg-primary/[0.03] px-4 py-8 text-center text-sm text-secondary transition hover:border-primary/40">
              <UploadCloud className="h-5 w-5" />
              {file ? file.name : "Selecciona el PDF del contrato"}
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                onChange={(event) => {
                  setError(null);
                  setSuccess(false);
                  setFile(event.target.files?.[0] ?? null);
                }}
              />
            </label>

            {error ? (
              <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>
            ) : null}
            {success ? (
              <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                Contrato subido correctamente.
              </p>
            ) : null}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={isUploading}
                className="flex-1 rounded-2xl border border-primary/10 bg-white py-3 text-xs font-semibold text-secondary disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="flex-1 rounded-2xl bg-accent py-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUploading ? "Subiendo..." : "Subir"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
