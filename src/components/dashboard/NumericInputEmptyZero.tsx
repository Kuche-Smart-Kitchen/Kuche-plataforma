"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

export type NumericInputEmptyZeroProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> & {
  value: number;
  onValueChange: (value: number) => void;
  /** `int`: parseInt; `float`: parseFloat */
  parseAs?: "int" | "float";
};

/** Clase para el "0" tenue cuando el valor numérico está vacío (Cotizador Pro). */
export const numericZeroPlaceholderClass = "placeholder:text-secondary/50";

export const NumericInputEmptyZero = forwardRef<HTMLInputElement, NumericInputEmptyZeroProps>(
  function NumericInputEmptyZero(
    { value, onValueChange, parseAs = "int", placeholder = "0", className, ...rest },
    ref,
  ) {
    const mergedClassName = [numericZeroPlaceholderClass, className].filter(Boolean).join(" ");
    return (
      <input
        ref={ref}
        {...rest}
        className={mergedClassName}
        type="number"
        placeholder={placeholder}
        value={value === 0 ? "" : value}
        onChange={(e) => {
          const val = e.target.value;
          if (val === "") {
            onValueChange(0);
            return;
          }
          const parsed =
            parseAs === "float" ? Number.parseFloat(val) : Number.parseInt(val, 10);
          if (!Number.isNaN(parsed)) {
            onValueChange(parsed);
          }
        }}
      />
    );
  },
);
