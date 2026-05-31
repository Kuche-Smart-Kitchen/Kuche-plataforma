"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, X } from "lucide-react";

type ConfirmDialogVariant = "danger" | "warning" | "info";

type ConfirmDialogProps = {
  isOpen: boolean;
  variant?: ConfirmDialogVariant;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
};

const variantStyles: Record<
  ConfirmDialogVariant,
  {
    panel: string;
    title: string;
    text: string;
    iconWrap: string;
    icon: typeof AlertCircle;
    confirmButton: string;
    confirmRing: string;
  }
> = {
  danger: {
    panel: "border-rose-200 bg-gradient-to-br from-white via-rose-50/80 to-rose-50",
    title: "text-rose-950",
    text: "text-rose-900/85",
    iconWrap: "bg-rose-100 text-rose-600 ring-rose-200",
    icon: AlertTriangle,
    confirmButton: "bg-rose-600 text-white hover:bg-rose-700",
    confirmRing: "ring-rose-200",
  },
  warning: {
    panel: "border-amber-200 bg-gradient-to-br from-white via-amber-50/80 to-amber-50",
    title: "text-amber-950",
    text: "text-amber-900/85",
    iconWrap: "bg-amber-100 text-amber-600 ring-amber-200",
    icon: AlertTriangle,
    confirmButton: "bg-amber-600 text-white hover:bg-amber-700",
    confirmRing: "ring-amber-200",
  },
  info: {
    panel: "border-slate-200 bg-gradient-to-br from-white via-slate-50/80 to-slate-50",
    title: "text-slate-950",
    text: "text-slate-700",
    iconWrap: "bg-slate-100 text-slate-600 ring-slate-200",
    icon: CheckCircle2,
    confirmButton: "bg-[#8B1C1C] text-white hover:bg-[#741717]",
    confirmRing: "ring-slate-200",
  },
};

export function ConfirmDialog({
  isOpen,
  variant = "danger",
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  busy = false,
}: ConfirmDialogProps) {
  const styles = variantStyles[variant];
  const Icon = styles.icon;

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className={`w-full max-w-lg rounded-[1.75rem] border px-5 py-5 shadow-2xl ${styles.panel}`}
          >
            <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${styles.iconWrap}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p id="confirm-dialog-title" className={`text-lg font-semibold ${styles.title}`}>
                  {title}
                </p>
                <p className={`mt-1 text-sm leading-6 ${styles.text}`}>{message}</p>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className={`rounded-full p-1.5 transition hover:bg-black/5 ${styles.text}`}
                aria-label="Cerrar confirmación"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                disabled={busy}
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={busy}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${styles.confirmButton} ${styles.confirmRing}`}
              >
                <ArrowRight className="h-4 w-4" />
                {busy ? "Procesando..." : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
