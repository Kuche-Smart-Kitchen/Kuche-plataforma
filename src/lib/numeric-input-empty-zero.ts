/**
 * Campos numéricos en string: evita mostrar "0" pegado (p. ej. al teclear sobre type=number).
 * No oculta valores como 0.5 (hay un dígito distinto de cero en la cadena).
 */
export function emptyWhenZeroNumericString(s: string): string {
  if (s.trim() === "") return "";
  const n = Number.parseFloat(s);
  if (Number.isNaN(n) || n !== 0) return s;
  return /[1-9]/.test(s) ? s : "";
}

/** Enteros en string (semanas, etc.): mismo criterio que {@link emptyWhenZeroNumericString}. */
export function emptyWhenZeroIntString(s: string): string {
  if (s.trim() === "") return "";
  const n = Number.parseInt(s, 10);
  if (Number.isNaN(n) || n !== 0) return s;
  return /[1-9]/.test(s) ? s : "";
}
