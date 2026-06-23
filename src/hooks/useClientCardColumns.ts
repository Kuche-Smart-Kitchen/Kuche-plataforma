"use client";

import { useEffect, useState } from "react";

/**
 * Número de columnas para tarjetas de clientes, alineado con Tailwind (md: 768px, lg: 1024px).
 * - maxColumns 3: 1 / 2 (md) / 3 (lg) — usado en admin confirmados, inactivos, en proceso.
 *   Al partir tarjetas, usar siempre este número de columnas (no min con la cantidad de ítems),
 *   para que una sola tarjeta conserve el mismo ancho que en vistas con más tarjetas.
 * - maxColumns 2: 1 / 2 (md+) — usado en dashboard clientes en proceso.
 */
export function useClientCardColumns(maxColumns: 2 | 3 = 3): number {
  const [cols, setCols] = useState(1);

  useEffect(() => {
    const mqLg = window.matchMedia("(min-width: 1024px)");
    const mqMd = window.matchMedia("(min-width: 768px)");

    const update = () => {
      if (maxColumns === 3) {
        if (mqLg.matches) setCols(3);
        else if (mqMd.matches) setCols(2);
        else setCols(1);
      } else {
        if (mqMd.matches) setCols(2);
        else setCols(1);
      }
    };

    update();
    mqMd.addEventListener("change", update);
    mqLg.addEventListener("change", update);
    return () => {
      mqMd.removeEventListener("change", update);
      mqLg.removeEventListener("change", update);
    };
  }, [maxColumns]);

  return cols;
}
