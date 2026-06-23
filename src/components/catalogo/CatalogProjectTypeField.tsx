"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { LayoutList } from "lucide-react";
import { CATALOG_PROJECT_TYPES } from "@/lib/catalog-project-types";

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Clases del `<input>` (fondo, borde). */
  inputClassName?: string;
  /** Contenedor del input + botón (p. ej. `mt-1.5 flex gap-1`). */
  innerRowClassName?: string;
  /** Clases del botón del catálogo. */
  buttonClassName?: string;
  hint?: ReactNode;
};

/**
 * Texto libre + botón que abre la lista **completa** del catálogo (no filtrada por lo escrito).
 * Sustituye a `<datalist>`, que en el navegador solo sugiere coincidencias parciales.
 */
export function CatalogProjectTypeField({
  id,
  value,
  onChange,
  placeholder = "Escribe o elige una categoría…",
  inputClassName = "w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none",
  innerRowClassName = "mt-2 flex gap-1.5",
  buttonClassName = "flex shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-white px-3 text-secondary shadow-sm transition hover:border-primary/30 hover:bg-primary/[0.04]",
  hint,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <div className={innerRowClassName}>
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`min-w-0 flex-1 ${inputClassName}`}
          autoComplete="off"
        />
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label="Ver todas las categorías del catálogo"
          title="Ver todas las categorías"
          onClick={() => setOpen((o) => !o)}
          className={buttonClassName}
        >
          <LayoutList className={`h-4 w-4 ${open ? "text-accent" : ""}`} aria-hidden />
        </button>
      </div>
      {open ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-60 overflow-auto rounded-2xl border border-primary/15 bg-white py-1 shadow-lg"
        >
          <p className="border-b border-primary/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-secondary">
            Categorías del catálogo
          </p>
          {CATALOG_PROJECT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              role="option"
              aria-selected={value === t}
              className="w-full px-4 py-2.5 text-left text-sm text-primary transition hover:bg-primary/[0.06]"
              onClick={() => {
                onChange(t);
                setOpen(false);
              }}
            >
              {t}
            </button>
          ))}
        </div>
      ) : null}
      {hint ? <div className="mt-1">{hint}</div> : null}
    </div>
  );
}
