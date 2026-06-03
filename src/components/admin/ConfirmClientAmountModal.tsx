"use client";

import { useEffect, useMemo, useState } from "react";

type ConfirmClientAmountModalProps = {
  isOpen: boolean;
  taskLabel: string;
  initialAmount?: number;
  isSaving?: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => Promise<void> | void;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(value || 0)));

export function ConfirmClientAmountModal({
  isOpen,
  taskLabel,
  initialAmount,
  isSaving,
  onClose,
  onConfirm,
}: ConfirmClientAmountModalProps) {
  const [amountInput, setAmountInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const initial = typeof initialAmount === "number" && Number.isFinite(initialAmount) && initialAmount > 0
      ? String(Math.round(initialAmount))
      : "";
    setAmountInput(initial);
    setError(null);
  }, [initialAmount, isOpen]);

  const parsedAmount = useMemo(() => {
    const sanitized = amountInput.replace(/[^0-9]/g, "");
    return sanitized ? Number(sanitized) : 0;
  }, [amountInput]);

  if (!isOpen) return null;

  const submit = async () => {
    setError(null);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Ingresa un monto total valido mayor a 0.");
      return;
    }

    await onConfirm(Math.round(parsedAmount));
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">Confirmar cliente</p>
        <h3 className="mt-2 text-xl font-semibold text-gray-900">Registrar total del proyecto</h3>
        <p className="mt-2 text-sm text-secondary">Proyecto: {taskLabel}</p>

        <label className="mt-5 block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
          Monto total (MXN)
          <input
            type="text"
            inputMode="numeric"
            value={amountInput}
            onChange={(event) => setAmountInput(event.target.value)}
            placeholder="Ej. 250000"
            className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
          />
        </label>

        <div className="mt-4 rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 text-xs text-secondary">
          <p>Total a registrar: <span className="font-semibold text-primary">{formatCurrency(parsedAmount)}</span></p>
          <p className="mt-1">Este valor se usara en seguimiento para pagos y saldo restante.</p>
        </div>

        {error ? (
          <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">{error}</p>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-primary/10 bg-white px-5 py-2 text-xs font-semibold text-secondary"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={Boolean(isSaving)}
            className="rounded-2xl bg-emerald-700 px-5 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            Confirmar cliente
          </button>
        </div>
      </div>
    </div>
  );
}
