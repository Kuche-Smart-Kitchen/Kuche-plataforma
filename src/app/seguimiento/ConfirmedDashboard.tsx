"use client";

import { SeguimientoArchivosSection } from "./SeguimientoArchivosSection";
import { formatCurrency, type SeguimientoProject } from "./lib";

type Props = {
  project: SeguimientoProject;
  onOpenImage: (name: string, src: string) => void;
};

export function ConfirmedDashboard({ project, onOpenImage }: Props) {
  const pagos = project.pagos || { anticipo: {}, segundoPago: {}, liquidacion: {} };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-secondary">Seguimiento</p>
        <h1 className="mt-2 text-3xl font-semibold">Proyecto {project.cliente}</h1>
      </div>

      <div className="rounded-3xl border border-white bg-white p-6 shadow-lg">
        <p className="text-xs uppercase tracking-[0.2em] text-secondary">Inversion Total</p>
        <p className="mt-3 text-xl font-semibold text-primary">
          {project.inversion > 0 ? formatCurrency(project.inversion) : "Por definir"}
        </p>
      </div>

      <div className="rounded-3xl border border-white bg-white p-6 shadow-lg">
        <p className="text-xs uppercase tracking-[0.2em] text-secondary">Etapa Actual</p>
        <p className="mt-3 text-lg font-semibold text-primary">{project.etapaActual || "Por definir"}</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Estado de Pagos</h2>
        {[
          { label: "Anticipo", pago: pagos.anticipo },
          { label: "2do Pago", pago: pagos.segundoPago },
          { label: "Liquidacion", pago: pagos.liquidacion },
        ].map(({ label, pago }) => (
          <div key={label} className="rounded-lg border border-primary/10 p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{label}</span>
              <span className="text-sm">
                {pago?.amount ? formatCurrency(pago.amount) : "Por definir"}
              </span>
            </div>
            {pago?.date && <p className="text-xs text-secondary mt-2">Fecha: {pago.date}</p>}
            {!pago?.date && <p className="text-xs text-orange-600 mt-2">Pendiente</p>}
          </div>
        ))}
      </div>

      {project.garantiaInicio && (
        <div className="rounded-3xl border border-accent/25 bg-gradient-to-br from-accent/10 via-white to-white p-8 shadow-lg">
          <p className="text-sm text-secondary">
            <span className="font-semibold text-primary">Garantia:</span> A partir del{" "}
            {project.garantiaInicio}
          </p>
        </div>
      )}

      <SeguimientoArchivosSection files={project.archivos} onOpenImage={onOpenImage} />
    </section>
  );
}
