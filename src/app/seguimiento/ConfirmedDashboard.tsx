"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Bell, CheckCircle2 } from "lucide-react";
import type { CotizacionFormalData } from "@/lib/kanban";
import {
  openFormalPdfInNewTab,
  downloadFormalPdf,
  openPdfDataUrlOrUrlInNewTab,
} from "@/lib/pdf-preliminar";
import {
  isPagoRegistrado,
  TIMELINE_STEPS,
  type TimelineStep,
} from "@/lib/seguimiento-project";
import { SeguimientoArchivosSection } from "./SeguimientoArchivosSection";
import {
  isPdfDataUrl,
  resolveSeguimientoMediaRefForUi,
  SEGUIMIENTO_MEDIA_UNAVAILABLE_MSG,
} from "@/lib/seguimiento-storage-blobs";
import {
  formatCurrency,
  installments,
  getFormalesListFromProject,
  inversionPdfCtaPrimaryClass,
  inversionPdfCtaSecondaryClass,
  inversionPdfQuoteRowClass,
  filterArchivosForCliente,
  type SeguimientoProject,
} from "./lib";

type PaymentStepAlert = {
  step: string;
  label: string;
  status: "paid" | "pending";
  tooltip: string;
};

type Props = {
  project: SeguimientoProject;
  onOpenImage: (name: string, src: string) => void;
};

const GarantiaCountdown = ({ startDate }: { startDate: string }) => {
  const msInDay = 1000 * 60 * 60 * 24;
  const daysLeft = useMemo(() => {
    const timestamp = Date.parse(startDate);
    if (Number.isNaN(timestamp)) return null;
    const start = new Date(timestamp);
    const today = new Date();
    const daysPassed = Math.floor((today.getTime() - start.getTime()) / msInDay);
    return Math.max(0, 365 - daysPassed);
  }, [startDate]);

  if (daysLeft === null) {
    return (
      <div className="rounded-3xl border border-primary/10 bg-white p-6 text-sm text-secondary shadow-lg">
        Registra la fecha de inicio de garantia cuando el proyecto quede entregado para ver los dias
        restantes.
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-gradient-to-br from-accent/10 via-white to-white p-6 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">Garantia activa</p>
          <h3 className="mt-2 text-2xl font-semibold text-primary">
            Te quedan {daysLeft} dias de cobertura
          </h3>
          <p className="mt-2 text-sm text-secondary">
            Estamos contigo durante el primer ano despues de la entrega.
          </p>
        </div>
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-white shadow-lg">
          <span className="text-xl font-semibold">{daysLeft}</span>
        </div>
      </div>
    </div>
  );
};

const formatPayment = (payment: { amount: number; date?: string }) => {
  const formatted = formatCurrency(payment.amount);
  if (payment.date?.trim()) return `${formatted} | ${payment.date}`;
  if (payment.amount > 0) return `${formatted} | programado`;
  return formatted;
};

export function ConfirmedDashboard({ project, onOpenImage }: Props) {
  const pagos = project.pagos ?? {
    anticipo: { amount: 0, date: "", receiptLabel: "Ver recibo", receiptImage: "" },
    segundoPago: { amount: 0, date: "", receiptLabel: "Ver recibo", receiptImage: "" },
    liquidacion: { amount: 0, date: "", receiptLabel: "Ver recibo", receiptImage: "" },
  };

  const currentIndex = useMemo(
    () => Math.max(0, TIMELINE_STEPS.indexOf(project.etapaActual as TimelineStep)),
    [project.etapaActual],
  );

  const paymentByStep = useMemo(() => {
    const alerts: PaymentStepAlert[] = [
      {
        step: "Diseno Aprobado",
        label: "Anticipo",
        status: isPagoRegistrado(pagos.anticipo) ? "paid" : "pending",
        tooltip: isPagoRegistrado(pagos.anticipo)
          ? "Pago recibido. Gracias por impulsar tu proyecto."
          : "Pendiente: anticipo. Coordina con el equipo Kuche.",
      },
      {
        step: "Corte CNC",
        label: "2do pago",
        status: isPagoRegistrado(pagos.segundoPago) ? "paid" : "pending",
        tooltip: isPagoRegistrado(pagos.segundoPago)
          ? "Segundo pago registrado."
          : "Recordatorio: segundo pago. Tu proyecto sigue avanzando.",
      },
      {
        step: "Instalacion Final",
        label: "Liquidacion",
        status: isPagoRegistrado(pagos.liquidacion) ? "paid" : "pending",
        tooltip: isPagoRegistrado(pagos.liquidacion)
          ? "Liquidacion registrada."
          : "Recordatorio: liquidacion pendiente al cierre de obra.",
      },
    ];

    return alerts.reduce<Record<string, PaymentStepAlert>>((acc, item) => {
      acc[item.step] = item;
      return acc;
    }, {});
  }, [pagos]);

  const timelineProgressPct = useMemo(() => {
    const max = TIMELINE_STEPS.length - 1;
    if (max <= 0) return 0;
    return (currentIndex / max) * 100;
  }, [currentIndex]);

  const garantiaFechaValida =
    typeof project.garantiaInicio === "string"
    && project.garantiaInicio.trim().length > 0
    && !Number.isNaN(Date.parse(project.garantiaInicio));

  const totalPagado =
    (isPagoRegistrado(pagos.anticipo) ? pagos.anticipo.amount : 0)
    + (isPagoRegistrado(pagos.segundoPago) ? pagos.segundoPago.amount : 0)
    + (isPagoRegistrado(pagos.liquidacion) ? pagos.liquidacion.amount : 0);
  const restante = Math.max(0, (project.inversion ?? 0) - totalPagado);

  const formalesList = getFormalesListFromProject(project);
  const quoteButtonLabel = "Ver cotizacion formal";
  const quoteImageSrc = String(project.cotizacionFormalImage ?? "");
  const files = filterArchivosForCliente(project.archivos as unknown[] | undefined);
  const inversionValue = (project.inversion ?? 0) > 0 ? formatCurrency(project.inversion ?? 0) : "Por definir";

  const inversionPdfBlock = (() => {
    if (formalesList.length > 0) {
      return (
        <div className="mt-3 flex w-full flex-row flex-wrap items-center gap-2">
          {formalesList.map((data, idx) => {
            const filename = `cotizacion-formal-${(data.projectType || "proyecto").replace(/\s+/g, "-")}-${(project.cliente || "cliente").replace(/\s+/g, "-")}.pdf`;
            return (
              <div key={idx} className={inversionPdfQuoteRowClass}>
                <span className="whitespace-nowrap text-[11px] font-semibold text-primary">
                  {data.projectType}
                </span>
                <span className="text-[10px] font-semibold leading-tight text-secondary/80 sm:whitespace-nowrap">
                  Cotizacion formal
                </span>
                <button
                  type="button"
                  className={inversionPdfCtaPrimaryClass}
                  onClick={() => openFormalPdfInNewTab(data as CotizacionFormalData)}
                >
                  Ver PDF
                </button>
                <button
                  type="button"
                  className={inversionPdfCtaSecondaryClass}
                  onClick={() => downloadFormalPdf(data as CotizacionFormalData, filename)}
                >
                  Descargar
                </button>
              </div>
            );
          })}
        </div>
      );
    }

    if (quoteImageSrc.trim()) {
      return (
        <div className="mt-4 flex w-full justify-center">
          <button
            type="button"
            className={inversionPdfCtaPrimaryClass}
            onClick={async () => {
              const resolved = await resolveSeguimientoMediaRefForUi(quoteImageSrc);
              if ("missing" in resolved) {
                window.alert(SEGUIMIENTO_MEDIA_UNAVAILABLE_MSG);
                return;
              }
              if (isPdfDataUrl(resolved.url)) {
                openPdfDataUrlOrUrlInNewTab(resolved.url);
                return;
              }
              onOpenImage(quoteButtonLabel, resolved.url);
            }}
          >
            {quoteButtonLabel}
          </button>
        </div>
      );
    }

    return (
      <p className="mt-3 text-xs text-secondary">
        Cuando el equipo adjunte la vista previa, podras verla aqui.
      </p>
    );
  })();

  return (
    <>
      <section className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">Seguimiento</p>
          <h1 className="mt-2 text-3xl font-semibold">Proyecto Residencial {project.cliente}</h1>
        </div>

        <div className="grid items-start gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white bg-white p-6 shadow-lg">
            <p className="text-xs uppercase tracking-[0.2em] text-secondary">Inversion total</p>
            {inversionPdfBlock}
            <p className="mt-3 text-xl font-semibold text-primary">{inversionValue}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-secondary">
              <span className="rounded-full bg-primary/5 px-3 py-1">
                Pagado <span className="font-semibold text-primary">{formatCurrency(totalPagado)}</span>
              </span>
              <span className="rounded-full bg-accent/10 px-3 py-1 text-accent">
                Restante {formatCurrency(restante)}
              </span>
            </div>
          </div>
          <div className="rounded-3xl border border-white bg-white p-6 shadow-lg">
            <p className="text-xs uppercase tracking-[0.2em] text-secondary">Fecha inicio</p>
            <p className="mt-3 text-xl font-semibold text-primary">{project.fechaInicio}</p>
          </div>
          <div className="rounded-3xl border border-accent/40 bg-white p-6 shadow-lg">
            <p className="text-xs uppercase tracking-[0.2em] text-secondary">Entrega estimada</p>
            <p className="mt-3 text-xl font-semibold text-accent">{project.fechaEntrega}</p>
          </div>
        </div>

        {(project.inversion ?? 0) > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {installments.map((item) => {
              const payment = pagos[item.key];
              const hasRecibo =
                typeof payment.receiptImage === "string" && payment.receiptImage.trim().length > 2;
              return (
                <div
                  key={item.key}
                  className="rounded-2xl border border-primary/10 bg-white p-4 text-xs text-secondary"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-secondary">
                      {item.label}
                    </p>
                    <button
                      type="button"
                      disabled={!hasRecibo}
                      className={`rounded-full border px-3 py-1 text-[10px] font-semibold transition ${
                        hasRecibo
                          ? "border-primary/10 text-primary hover:border-accent hover:text-accent"
                          : "cursor-not-allowed border-primary/5 text-secondary/50"
                      }`}
                      onClick={async () => {
                        if (!hasRecibo) return;
                        const raw = payment.receiptImage as string;
                        const resolved = await resolveSeguimientoMediaRefForUi(raw);
                        if ("missing" in resolved) {
                          window.alert(SEGUIMIENTO_MEDIA_UNAVAILABLE_MSG);
                          return;
                        }
                        if (isPdfDataUrl(resolved.url)) {
                          openPdfDataUrlOrUrlInNewTab(resolved.url);
                          return;
                        }
                        onOpenImage(`${item.label} - Recibo`, resolved.url);
                      }}
                    >
                      {hasRecibo ? (payment.receiptLabel ?? "Ver recibo") : "Sin recibo"}
                    </button>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-primary">{formatPayment(payment)}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-primary/10 bg-white p-4 text-xs text-secondary">
            Aun no hay inversion registrada en tu proyecto.
          </div>
        )}

        <SeguimientoArchivosSection files={files} onOpenImage={onOpenImage} />
      </section>

      <section className="rounded-3xl bg-white p-8 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">Timeline</p>
            <h2 className="mt-2 text-2xl font-semibold">Progreso de tu cocina</h2>
          </div>
          <span className="rounded-full bg-accent/10 px-4 py-2 text-xs font-semibold text-accent">
            {project.etapaActual}
          </span>
        </div>
        <div className="mt-8">
          <div className="relative h-2 rounded-full bg-primary/10">
            <div
              className="absolute left-0 top-0 h-2 rounded-full bg-accent"
              style={{ width: `${timelineProgressPct}%` }}
            />
          </div>
          <div className="mt-6 grid grid-cols-5 gap-2 text-center text-xs text-secondary">
            {TIMELINE_STEPS.map((step, index) => {
              const isCompleted = index <= currentIndex;
              const isActive = index === currentIndex;
              const payment = paymentByStep[step];
              return (
                <div key={step} className="flex flex-col items-center gap-3">
                  <div className="relative flex h-5 w-5 items-center justify-center">
                    <span
                      className={`h-3 w-3 rounded-full ${isCompleted ? "bg-accent" : "bg-primary/20"}`}
                    />
                    {isActive ? (
                      <motion.span
                        className="absolute h-5 w-5 rounded-full border border-accent"
                        animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0, 0.8] }}
                        transition={{ duration: 1.6, repeat: Infinity }}
                      />
                    ) : null}
                  </div>
                  <span className={isActive ? "font-semibold text-primary" : ""}>{step}</span>
                  {payment ? (
                    <div
                      className={`group relative mt-1 flex items-center gap-2 rounded-full px-2 py-1 text-[10px] font-semibold ${
                        payment.status === "pending"
                          ? "animate-[pulse_3.5s_ease-in-out_infinite] bg-amber-50 text-amber-500"
                          : "bg-accent/10 text-accent"
                      }`}
                      aria-label={payment.tooltip}
                      title={payment.tooltip}
                    >
                      {payment.status === "pending" ? (
                        <Bell className="h-3.5 w-3.5" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      <span>{payment.label}</span>
                      {payment.status === "pending" ? (
                        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100">
                          {payment.tooltip}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {project.estadoProyecto === "Completado/Entregado" && garantiaFechaValida ? (
        <section>
          <GarantiaCountdown startDate={project.garantiaInicio as string} />
        </section>
      ) : null}
    </>
  );
}
