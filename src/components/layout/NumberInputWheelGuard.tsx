"use client";

import { useEffect } from "react";

/**
 * Evita que la rueda del ratón cambie el valor de inputs `type="number"` **sin** bloquear el scroll
 * de la página o del modal.
 *
 * Antes se usaba `preventDefault()` en un listener global `wheel` (`passive: false`), lo que anulaba
 * el desplazamiento natural de todo el documento mientras el foco estaba en un número. Aquí, al
 * detectar la rueda con un número enfocado, solo se hace `blur()` y el evento sigue en modo pasivo,
 * de modo que el navegador puede desplazar el contenedor con scroll.
 */
export default function NumberInputWheelGuard() {
  useEffect(() => {
    const onWheel = () => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement && el.type === "number") {
        el.blur();
      }
    };
    document.addEventListener("wheel", onWheel, { passive: true, capture: true });
    return () => document.removeEventListener("wheel", onWheel, { capture: true });
  }, []);
  return null;
}
