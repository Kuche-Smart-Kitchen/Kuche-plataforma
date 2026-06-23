"use client";

import { useRef, type ComponentProps } from "react";

type Props = Omit<ComponentProps<"input">, "type">;

function openDatePicker(el: HTMLInputElement | null) {
  if (!el) return;
  try {
    if (typeof el.showPicker === "function") {
      void el.showPicker();
      return;
    }
  } catch {
    // ignore
  }
  el.focus();
}

/** type="date" con clic útil en todo el campo (showPicker donde exista). */
export function DateInput({ className = "", onClick, ...props }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const boxClass =
    "flex w-full cursor-pointer items-stretch rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none focus-within:ring-2 focus-within:ring-primary/20";
  const inputClass =
    "min-h-[1.25rem] min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0 text-sm outline-none [color-scheme:light]";

  return (
    <div
      role="presentation"
      className={`${boxClass} ${className}`.trim()}
      onClick={() => openDatePicker(inputRef.current)}
    >
      <input
        ref={inputRef}
        type="date"
        className={inputClass}
        onClick={(e) => {
          e.stopPropagation();
          openDatePicker(e.currentTarget);
          onClick?.(e);
        }}
        {...props}
      />
    </div>
  );
}
