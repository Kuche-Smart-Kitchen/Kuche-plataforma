"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

import { useEscapeClose } from "@/hooks/useEscapeClose";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useSeguimientoAuth } from "@/contexts/SeguimientoAuthContext";

import { ConfirmedDashboard } from "./ConfirmedDashboard";
import { ProspectDashboard } from "./ProspectDashboard";

export default function SeguimientoPage() {
  const { proyecto, codigo, setCodigo, error, isLoading, isBlocked, login } =
    useSeguimientoAuth();

  const selectedImageRef = useRef<null | { name: string; src: string }>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [showImage, setShowImage] = useState(false);

  useEscapeClose(showImage, () => setShowImage(false));
  useFocusTrap(showImage, modalRef);

  const openImage = (name: string, src: string) => {
    selectedImageRef.current = { name, src };
    setShowImage(true);
  };

  const closeImage = () => {
    selectedImageRef.current = null;
    setShowImage(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(codigo);
  };

  if (proyecto) {
    return (
      <main className="min-h-screen bg-background text-primary">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-10"
          >
            {proyecto.isProspect ? (
              <ProspectDashboard project={proyecto} onOpenImage={openImage} />
            ) : (
              <ConfirmedDashboard project={proyecto} onOpenImage={openImage} />
            )}
          </motion.div>
        </div>
        {showImage && selectedImageRef.current ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div
              ref={modalRef}
              tabIndex={-1}
              className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-primary">
                  {selectedImageRef.current.name}
                </h3>
                <button
                  className="rounded-full border border-primary/10 px-3 py-1 text-xs font-semibold text-primary transition hover:border-accent hover:text-accent"
                  onClick={closeImage}
                >
                  Cerrar
                </button>
              </div>
              <div className="mt-4 overflow-hidden rounded-2xl bg-primary/5">
                <img
                  src={selectedImageRef.current.src}
                  alt={selectedImageRef.current.name}
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          </div>
        ) : null}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-primary">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex min-h-[70vh] items-center justify-center"
        >
          <div className="w-full max-w-lg rounded-3xl bg-white p-10 shadow-xl">
            <h1 className="text-2xl font-semibold">Rastrea tu Proyecto Kuche</h1>
            <p className="mt-2 text-sm text-secondary">
              Ingresa tu codigo unico para ver el avance.
            </p>
            <form onSubmit={handleSubmit}>
              <label className="mt-6 block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                Codigo de Proyecto
                <input
                  value={codigo}
                  onChange={(e) => {
                    setCodigo(e.target.value);
                  }}
                  placeholder="K-8821"
                  disabled={isLoading || isBlocked}
                  className="mt-3 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none disabled:opacity-50"
                />
              </label>
              {error && <p className="mt-3 text-xs font-semibold text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={isLoading || isBlocked}
                className="mt-6 w-full rounded-2xl bg-accent py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Ver Progreso
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
