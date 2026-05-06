import { Loader2 } from "lucide-react";

type SegmentLoadingProps = {
  title?: string;
  subtitle?: string;
};

export function SegmentLoading({
  title = "Cargando",
  subtitle = "",
}: SegmentLoadingProps) {
  return (
    <div className="flex min-h-[55vh] items-center justify-center px-4 text-secondary">
      <div className="inline-flex items-center gap-3 rounded-full border border-primary/10 bg-white px-4 py-2 text-sm font-semibold shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-accent" />
        {title}
      </div>
      {subtitle ? <span className="sr-only">{subtitle}</span> : null}
    </div>
  );
}
