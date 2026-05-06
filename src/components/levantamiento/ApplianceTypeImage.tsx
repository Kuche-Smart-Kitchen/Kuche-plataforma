"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { ItemCatalogo } from "@/lib/levantamiento-catalog";
import { applianceLevantamientoImageCandidates } from "@/lib/levantamiento-catalog";

type Props = {
  item: ItemCatalogo;
  className?: string;
  alt?: string;
};

/**
 * Por defecto: `object-contain` para vistas donde importa ver el aparato completo.
 * En carruseles del levantamiento se pasa `className` con `object-cover` para miniaturas alineadas.
 */
export default function ApplianceTypeImage({
  item,
  className = "absolute inset-0 z-0 box-border h-full w-full object-contain object-center p-2 sm:p-3",
  alt,
}: Props) {
  const candidates = useMemo(() => applianceLevantamientoImageCandidates(item), [item]);
  const [index, setIndex] = useState(0);
  const stopRef = useRef(false);

  useEffect(() => {
    setIndex(0);
    stopRef.current = false;
  }, [item.id]);

  const max = Math.max(0, candidates.length - 1);
  const safeIndex = Math.min(index, max);
  const src = candidates[safeIndex] ?? candidates[0];

  return (
    // key fuerza recarga al cambiar candidato tras error
    <img
      key={`${item.id}-${safeIndex}`}
      src={src}
      alt={alt ?? item.label}
      className={className}
      loading="eager"
      decoding="async"
      onError={() => {
        if (stopRef.current) return;
        setIndex((prev) => {
          if (prev >= max) {
            stopRef.current = true;
            return prev;
          }
          return prev + 1;
        });
      }}
    />
  );
}
