/**
 * Texto para PDF y datos guardados en `PreliminarData.date` / cotización formal.
 * Vacío si no hay ningún número de semanas válido (> 0).
 */
export function formatDeliveryWeeksLabel(minStr: string, maxStr: string): string {
  const min = Number.parseInt(minStr.trim(), 10);
  const max = Number.parseInt(maxStr.trim(), 10);
  const minOk = Number.isFinite(min) && min > 0;
  const maxOk = Number.isFinite(max) && max > 0;
  if (minOk && maxOk) {
    if (min === max) {
      return `${min} semanas aprox.`;
    }
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    return `${lo} a ${hi} semanas aprox.`;
  }
  if (minOk) {
    return `${min} semanas aprox.`;
  }
  if (maxOk) {
    return `${max} semanas aprox.`;
  }
  return "";
}

/**
 * Interpreta el texto guardado en cotización (p. ej. "8 a 12 semanas aprox.") para obtener un rango en semanas.
 */
export function parseDeliveryWeeksRangeFromLabel(label: string): { min: number; max: number } | null {
  const s = label.trim();
  if (!s || s === "—") return null;
  const rangeMatch = s.match(/(\d+)\s+a\s+(\d+)\s+semanas/i);
  if (rangeMatch) {
    const a = Number.parseInt(rangeMatch[1] ?? "", 10);
    const b = Number.parseInt(rangeMatch[2] ?? "", 10);
    if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0) {
      return { min: Math.min(a, b), max: Math.max(a, b) };
    }
  }
  const singleMatch = s.match(/(\d+)\s+semanas/i);
  if (singleMatch) {
    const n = Number.parseInt(singleMatch[1] ?? "", 10);
    if (n > 0) return { min: n, max: n };
  }
  return null;
}

function addCalendarDays(base: Date, days: number): Date {
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Fechas aproximadas de entrega contando desde la fecha de contrato (ISO) y el rango de semanas del cotizador.
 */
export function formatApproximateDeliveryWindowEs(
  contractIso: string,
  weeksMin: number,
  weeksMax: number,
): string {
  const base = new Date(`${contractIso}T12:00:00`);
  if (Number.isNaN(base.getTime())) return "";
  const lo = Math.min(weeksMin, weeksMax);
  const hi = Math.max(weeksMin, weeksMax);
  const from = addCalendarDays(base, lo * 7);
  const to = addCalendarDays(base, hi * 7);
  const fmt = (dt: Date) =>
    dt.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  if (lo === hi) {
    return `Aprox. el ${fmt(from)} (${lo} semana${lo !== 1 ? "s" : ""} después del contrato).`;
  }
  return `Del ${fmt(from)} al ${fmt(to)} (${lo} a ${hi} semanas después del contrato).`;
}
