"use client";

import React, { type ReactNode } from "react";

export interface DateMaskInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChangeValue: (value: string) => void;
  icon?: ReactNode;
}

/** Aplica máscara DD/MM/AAAA a partir de dígitos (máx. 8). */
export function formatDateMaskInput(raw: string): string {
  let cleanNumber = raw.replace(/\D/g, "");
  if (cleanNumber.length > 8) {
    cleanNumber = cleanNumber.slice(0, 8);
  }

  let formattedDate = "";
  if (cleanNumber.length > 0) {
    formattedDate += cleanNumber.slice(0, 2);
  }
  if (cleanNumber.length > 2) {
    formattedDate += "/" + cleanNumber.slice(2, 4);
  }
  if (cleanNumber.length > 4) {
    formattedDate += "/" + cleanNumber.slice(4, 8);
  }

  return formattedDate;
}

export default function DateMaskInput({
  value,
  onChangeValue,
  icon,
  className = "",
  placeholder = "DD/MM/AAAA",
  maxLength = 10,
  autoComplete = "off",
  ...props
}: DateMaskInputProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeValue(formatDateMaskInput(e.target.value));
  };

  return (
    <div className="relative flex w-full items-center">
      <input
        {...props}
        type="text"
        inputMode="numeric"
        autoComplete={autoComplete}
        placeholder={placeholder}
        maxLength={maxLength}
        value={value}
        onChange={handleInputChange}
        className={`w-full transition-all duration-300 ${className}`.trim()}
      />
      {icon ? (
        <div className="pointer-events-none absolute right-4 text-secondary/50">{icon}</div>
      ) : null}
    </div>
  );
}
