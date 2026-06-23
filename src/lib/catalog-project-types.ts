/**
 * Tipos de proyecto alineados con las categorías principales del catálogo público (`/catalogo`).
 * Usados en levantamiento detallado y cotizador formal.
 */
export const CATALOG_PROJECT_TYPES = [
  "Cocinas",
  "Closets",
  "Baños",
  "Muebles a medida",
] as const;

export type CatalogProjectType = (typeof CATALOG_PROJECT_TYPES)[number];

/** Mapea valores antiguos (Cocina, TV Unit, etc.) a la etiqueta del catálogo. */
export function normalizeLegacyProjectTypeToCatalog(raw: string): string {
  const t = raw.trim();
  if (!t) return CATALOG_PROJECT_TYPES[0];
  if ((CATALOG_PROJECT_TYPES as readonly string[]).includes(t)) return t;
  const lower = t.toLowerCase();
  if (lower === "cocina" || lower === "cocinas") return "Cocinas";
  if (lower === "closet" || lower === "clóset" || lower === "closets") return "Closets";
  if (lower.includes("baño") || lower === "banos" || lower === "baños") return "Baños";
  if (lower === "tv unit" || lower.includes("tv")) return "Muebles a medida";
  if (lower.includes("mueble")) return "Muebles a medida";
  /** Texto libre (ej. comedor, consultorio): se conserva tal cual. */
  return t;
}

/** ¿Mostrar «¿Con isla?» en levantamiento? (acepta Cocina/Cocinas con mayúsculas variables). */
export function isCocinasProjectTypeForConIsla(value: string): boolean {
  const s = value.trim().toLowerCase();
  return s === "cocinas" || s === "cocina";
}
