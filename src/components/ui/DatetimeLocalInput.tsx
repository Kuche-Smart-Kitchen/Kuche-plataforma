"use client";

import { useRef, type ComponentProps } from "react";

type Props = Omit<ComponentProps<"input">, "type">;

function openDatetimePicker(el: HTMLInputElement | null) {
  if (!el) return;
  try {
    if (typeof el.showPicker === "function") {
      void el.showPicker();
      return;
    }
  } catch {
    // Algunos navegadores lanzan si no hay gesto de usuario o no está soportado
  }
  el.focus();
}

/**
 * datetime-local: en Chrome/Edge el clic suele abrir el calendario solo en el icono.
 * showPicker() al hacer clic en todo el campo mejora la UX.
 */
export function DatetimeLocalInput({ className = "", onClick, ...props }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const boxClass =
    "flex w-full cursor-pointer items-stretch rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none focus-within:ring-2 focus-within:ring-primary/20";
  const inputClass =
    "min-h-[1.25rem] min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0 text-sm outline-none [color-scheme:light]";

  return (
    <div
      role="presentation"
      className={`${boxClass} ${className}`.trim()}
      onClick={() => openDatetimePicker(inputRef.current)}
    >
      <input
        ref={inputRef}
        type="datetime-local"
        className={inputClass}
        onClick={(e) => {
          e.stopPropagation();
          openDatetimePicker(e.currentTarget);
          onClick?.(e);
        }}
        {...props}
      />
    </div>
  );
}
