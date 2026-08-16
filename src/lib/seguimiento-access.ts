/** Quita espacios, caracteres invisibles y unifica mayúsculas para comparar códigos. */
export function normalizePublicProjectCodeInput(raw: string): string {
  const stripped = raw
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, "");
  if (!stripped) return "";
  const upper = stripped.toUpperCase();
  if (upper.startsWith("K-")) return upper;
  if (upper.startsWith("K") && upper.length > 1) return `K-${upper.slice(1)}`;
  return `K-${upper}`;
}

/** Sin persistencia: no busca en localStorage ni reconstruye desde Kanban, siempre entrega `null`. */
export function resolveSeguimientoProjectByCode(
  _codeInput: string,
): Record<string, unknown> | null {
  return null;
}

