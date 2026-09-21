"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { ItemCatalogo } from "@/lib/levantamiento-catalog";
import {
  LIGHTING_CATALOG_OBJECT_POSITION,
  lightingLevantamientoImageCandidates,
} from "@/lib/levantamiento-catalog";

type Props = {
  item: ItemCatalogo;
  className?: string;
  alt?: string;
};

/** Default `contain` para detalle; en carrusel el padre pasa `cover` para tiles uniformes. */
export default function LightingTypeImage({
  item,
  className = "absolute inset-0 z-0 box-border h-full w-full object-contain object-center p-2 sm:p-3",
  alt,
}: Props) {
  const candidates = useMemo(() => lightingLevantamientoImageCandidates(item), [item]);
  const [index, setIndex] = useState(0);
  const stopRef = useRef(false);

  useEffect(() => {
    setIndex(0);
    stopRef.current = false;
  }, [item.id]);

  const max = Math.max(0, candidates.length - 1);
  const safeIndex = Math.min(index, max);
  const src = candidates[safeIndex] ?? candidates[0];
  const objectPosition = LIGHTING_CATALOG_OBJECT_POSITION[item.id];

  return (
    <img
      key={`${item.id}-${safeIndex}`}
      src={src}
      alt={alt ?? item.label}
      className={className}
      style={objectPosition ? { objectPosition } : undefined}
      loading="lazy"
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
