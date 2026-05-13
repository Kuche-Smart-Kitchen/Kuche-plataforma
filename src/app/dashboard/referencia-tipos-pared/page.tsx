import Link from "next/link";
import { getWallMeasureFieldDefs, WALL_ITEMS, wallTypeImageSrc } from "@/lib/levantamiento-catalog";
import WallTypeImage from "@/components/levantamiento/WallTypeImage";

export default function ReferenciaTiposParedPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-primary">
      <div className="mx-auto max-w-5xl space-y-8">
        <header>
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">Levantamiento</p>
          <h1 className="mt-2 text-3xl font-semibold">Referencias visuales · Tipos de pared</h1>
          <p className="mt-3 max-w-2xl text-sm text-secondary">
            Aquí ves los mismos dibujos de referencia que en el levantamiento detallado: sirven para saber{" "}
            <span className="font-medium text-primary">qué medir</span> y cómo se etiquetan las cotas en el croquis (A,
            B, C…). Cada tipo de pared pide un conjunto distinto de medidas en{" "}
            <span className="font-medium text-primary">metros</span>; el listado exacto va en cada tarjeta de abajo.
          </p>
          <Link
            href="/dashboard/Levantamiento-detallado"
            className="mt-4 inline-block text-sm font-semibold text-[#8B1C1C] underline-offset-2 hover:underline"
          >
            ← Volver al levantamiento detallado
          </Link>
        </header>

        <div className="grid gap-6 sm:grid-cols-2">
          {WALL_ITEMS.map((item) => {
            const medidas = getWallMeasureFieldDefs(item.id);
            return (
            <article
              key={item.id}
              className="overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow-lg backdrop-blur-md"
            >
              <div className="relative aspect-[4/3] bg-primary/5">
                <WallTypeImage item={item} />
              </div>
              <div className="space-y-2 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-secondary">Archivo esperado</p>
                <code className="block break-all rounded-xl bg-primary/5 px-3 py-2 text-xs text-primary">
                  public/images/levantamiento/paredes/{item.id}.jpg
                </code>
                <p className="text-sm font-semibold text-primary">{item.label}</p>
                <p className="text-xs text-secondary">
                  <span className="font-medium text-primary">id:</span> {item.id}
                </p>
                {item.hint ? <p className="text-xs text-secondary">{item.hint}</p> : null}
                <div className="rounded-xl border border-primary/10 bg-primary/[0.04] px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-secondary">
                    Medidas en formulario (m)
                  </p>
                  <ul className="mt-1.5 list-inside list-disc text-xs text-secondary">
                    {medidas.map((f) => (
                      <li key={f.key}>{f.label}</li>
                    ))}
                  </ul>
                </div>
                <p className="text-[11px] text-secondary">
                  URL servida:{" "}
                  <span className="break-all font-mono text-primary/80">{wallTypeImageSrc(item.id)}</span>
                </p>
              </div>
            </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
