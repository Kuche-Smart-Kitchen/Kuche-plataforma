import type { SeguimientoProject } from "./lib";

export type SeguimientoArchivosProps = {
  files: SeguimientoProject["archivos"] | undefined;
  onOpenImage: (name: string, src: string) => void;
};

export function SeguimientoArchivosSection({ files, onOpenImage }: SeguimientoArchivosProps) {
  if (!files || files.length === 0) {
    return null;
  }

  const validFiles = files.filter((f: any) => f && f.name);

  if (validFiles.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Archivos del Proyecto</h2>
      <div className="grid gap-2">
        {validFiles.map((file: any, idx: number) => (
          <div key={idx} className="rounded-lg border border-primary/10 p-4 text-sm">
            {file.name}
          </div>
        ))}
      </div>
    </section>
  );
}
