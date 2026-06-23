import { useEffect } from "react";

/** Excluimos `input[type=file]`: suelen ir ocultos (`sr-only`); al cerrar el diálogo del SO el foco
 *  puede quedar ahí y el trap obliga a enfocarlos → scroll raro, modal “en blanco” o sensación de bloqueo. */
const focusableSelectors = [
  "a[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="file"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

export const useFocusTrap = (
  isOpen: boolean,
  containerRef: React.RefObject<HTMLElement | null>,
) => {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    const safeFocus = (el: HTMLElement) => {
      // Algunos navegadores hacen scroll de la ventana cuando se hace focus.
      // `preventScroll` evita el salto en pantallas donde el usuario ya estaba
      // scrolleando (como el tablero).
      try {
        (el as any).focus?.({ preventScroll: true });
      } catch {
        // Fallback: si el navegador no soporta preventScroll, al menos no rompemos.
        el.focus();
      }
    };

    const getFocusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors)).filter(
        (el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden"),
      );

    const focusFirst = () => {
      const focusables = getFocusable();
      if (focusables.length > 0) {
        safeFocus(focusables[0]);
      } else {
        safeFocus(container);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") {
        return;
      }

      const focusables = getFocusable();
      if (focusables.length === 0) {
        event.preventDefault();
        safeFocus(container);
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const isInside = active ? container.contains(active) : false;

      if (!isInside) {
        event.preventDefault();
        safeFocus(first);
        return;
      }

      if (event.shiftKey && active === first) {
        event.preventDefault();
        safeFocus(last);
        return;
      }

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        safeFocus(first);
      }
    };

    // Retrasamos el focus para dar tiempo a que el overlay/panel se pinte con `fixed/absolute`,
    // evitando que el foco dispare un scroll brusco de la ventana.
    const rafId = window.requestAnimationFrame(() => focusFirst());
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(rafId);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, containerRef]);
};
