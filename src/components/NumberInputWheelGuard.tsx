"use client";

import { useEffect } from "react";

export default function NumberInputWheelGuard(): null {
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      try {
        const active = document.activeElement as HTMLElement | null;
        if (!active) return;
        if (active.tagName === "INPUT") {
          const input = active as HTMLInputElement;
          if (input.type === "number") {
            // blur the input to avoid changing value with mouse wheel
            input.blur();
            e.preventDefault();
          }
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel as EventListener);
  }, []);

  return null;
}
