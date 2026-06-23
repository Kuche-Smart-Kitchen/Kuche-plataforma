"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";

const arrowButtonClassDark =
  "flex h-full min-h-[2.75rem] w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-zinc-800 text-zinc-100 shadow-sm transition hover:bg-zinc-700 disabled:pointer-events-none disabled:opacity-25 sm:min-h-[3rem] sm:w-10";

const arrowButtonClassLight =
  "flex h-full min-h-[2.75rem] w-9 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-white text-primary shadow-sm transition hover:bg-primary/[0.06] disabled:pointer-events-none disabled:opacity-25 sm:min-h-[3rem] sm:w-10";

export type HorizontalScrollStripProps = {
  children: ReactNode;
  /** Clases del contenedor con overflow-x (p. ej. fila flex del catálogo). Debe incluir `flex`, `overflow-x-auto`, `min-w-0`, `flex-1`. */
  scrollClassName: string;
  /** Ref al nodo scrollable (p. ej. para «Ver todos» con scrollWidth). */
  scrollContainerRef?: Ref<HTMLDivElement | null>;
  className?: string;
  /** Flechas oscuras (carruseles zinc) o claras (showroom sobre fondo claro). */
  variant?: "dark" | "light";
};

function parseGapPx(el: HTMLElement): number {
  const g = getComputedStyle(el).gap || getComputedStyle(el).columnGap;
  if (!g || g === "normal") return 12;
  const n = Number.parseFloat(g);
  return Number.isFinite(n) ? n : 12;
}

export default function HorizontalScrollStrip({
  children,
  scrollClassName,
  scrollContainerRef,
  className = "",
  variant = "dark",
}: HorizontalScrollStripProps) {
  const arrowButtonClass = variant === "light" ? arrowButtonClassLight : arrowButtonClassDark;
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const setRefs = useCallback(
    (el: HTMLDivElement | null) => {
      innerRef.current = el;
      if (!scrollContainerRef) return;
      if (typeof scrollContainerRef === "function") {
        scrollContainerRef(el);
      } else {
        scrollContainerRef.current = el;
      }
    },
    [scrollContainerRef],
  );

  const updateEdges = useCallback(() => {
    const el = innerRef.current;
    if (!el) {
      setAtStart(true);
      setAtEnd(true);
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = Math.max(0, scrollWidth - clientWidth);
    if (maxScroll <= 2) {
      setAtStart(true);
      setAtEnd(true);
      return;
    }
    setAtStart(scrollLeft <= 2);
    setAtEnd(scrollLeft >= maxScroll - 2);
  }, []);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    updateEdges();
    el.addEventListener("scroll", updateEdges, { passive: true });
    const ro = new ResizeObserver(() => updateEdges());
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      ro.disconnect();
    };
  }, [updateEdges, children]);

  const scrollByStep = (dir: -1 | 1) => {
    const el = innerRef.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    const step = first ? first.getBoundingClientRect().width + parseGapPx(el) : el.clientWidth * 0.85;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <div className={`flex w-full items-stretch gap-1 sm:gap-2 ${className}`}>
      <button
        type="button"
        aria-label="Desplazar catálogo a la izquierda"
        className={arrowButtonClass}
        disabled={atStart}
        onClick={() => scrollByStep(-1)}
      >
        <ChevronLeft className="h-5 w-5 shrink-0" strokeWidth={2.25} />
      </button>
      <div ref={setRefs} className={scrollClassName}>
        {children}
      </div>
      <button
        type="button"
        aria-label="Desplazar catálogo a la derecha"
        className={arrowButtonClass}
        disabled={atEnd}
        onClick={() => scrollByStep(1)}
      >
        <ChevronRight className="h-5 w-5 shrink-0" strokeWidth={2.25} />
      </button>
    </div>
  );
}
