"use client";

import { SeguimientoArchivosSection } from "./SeguimientoArchivosSection";
import { formatCurrency, type SeguimientoProject } from "./lib";

type Props = {
  project: SeguimientoProject;
  onOpenImage: (name: string, src: string) => void;
};

export function ProspectDashboard({ project, onOpenImage }: Props) {
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

      <SeguimientoArchivosSection files={project.archivos} onOpenImage={onOpenImage} />

      <div className="rounded-3xl border border-accent/25 bg-gradient-to-br from-accent/10 via-white to-white p-8 shadow-lg">
        <p className="text-sm leading-relaxed text-secondary">
          <span className="font-semibold text-primary">A la espera de confirmacion.</span> Una vez
          que apruebes tu proyecto, podras ver el progreso, pagos y garantia.
        </p>
      </div>
    </section>
  );
}
