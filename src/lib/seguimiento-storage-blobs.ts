/**
 * Utilidades para gestionar referencias de media en seguimiento de clientes
 * Resuelve URLs, Data URLs, y rutas de almacenamiento
 */

export const SEGUIMIENTO_MEDIA_UNAVAILABLE_MSG =
  "No se pudo cargar el archivo. Por favor, intenta de nuevo más tarde.";

/**
 * Detecta si una URL es un Data URL (base64 encoded)
 */
export function isPdfDataUrl(url: string): boolean {
  return url.startsWith("data:application/pdf") || url.startsWith("data:text/plain");
}

/**
 * Resuelve una referencia de media para uso en UI
 * Puede ser URL pública, Data URL, o referencia de storage
 */
export async function resolveSeguimientoMediaRefForUi(
  ref: string,
): Promise<{ url: string } | { missing: boolean }> {
  if (!ref || typeof ref !== "string" || ref.trim().length === 0) {
    return { missing: true };
  }

  const trimmed = ref.trim();

  // Si ya es una URL directa (http/https), retornar como está
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return { url: trimmed };
  }

  // Si es un Data URL, retornar como está
  if (trimmed.startsWith("data:")) {
    return { url: trimmed };
  }

  // Si es una ruta de blob storage (simular)
  // En producción, aquí iría la lógica para obtener el URL firmado del storage
  if (trimmed.startsWith("blob:")) {
    // Placeholder: retornar como si fuera válido
    return { url: trimmed };
  }

  // Fallback: asumir que es una URL válida
  if (trimmed.length > 0) {
    return { url: trimmed };
  }

  return { missing: true };
}

/**
 * Resuelve URLs de PDF específicamente
 * Puede manejar URLs normales, Data URLs, o rutas de almacenamiento
 */
export async function resolvePdfUrlForUi(
  ref: string | undefined,
): Promise<string | null> {
  if (!ref) return null;

  const result = await resolveSeguimientoMediaRefForUi(ref);

  if ("missing" in result) {
    return null;
  }

  return result.url;
}

/**
 * Obtiene una URL firmada para un recurso de seguimiento
 * Usado para acceso seguro a archivos privados del cliente
 */
export async function getSeguimientoSignedUrl(
  resourceKey: string,
): Promise<string | null> {
  try {
    // En producción, esto llamaría a un endpoint que genera URLs firmadas
    // Por ahora, asumir que resourceKey es ya una URL válida
    if (resourceKey.startsWith("http") || resourceKey.startsWith("data:")) {
      return resourceKey;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Valida que un URL sea accesible (sin realizar HEAD request pesado)
 * Principalmente para validación local
 */
export function isValidSeguimientoUrl(url: string): boolean {
  if (!url) return false;

  try {
    // Validar URL format
    new URL(url);
    return true;
  } catch {
    // Validar Data URL
    if (url.startsWith("data:")) {
      return url.includes(",");
    }
    // Validar blob URL
    if (url.startsWith("blob:")) {
      return true;
    }
    return false;
  }
}

/**
 * Tipo de respuesta para resolución de media
 */
export type ResolveSeguimientoMediaResult =
  | { url: string; type: "http" | "https" | "data" | "blob" | "local" }
  | { missing: true };

/**
 * Versión con tipo de respuesta completa
 */
export async function resolveSeguimientoMediaRefWithType(
  ref: string,
): Promise<ResolveSeguimientoMediaResult> {
  if (!ref || typeof ref !== "string" || ref.trim().length === 0) {
    return { missing: true };
  }

  const trimmed = ref.trim();

  if (trimmed.startsWith("https://")) {
    return { url: trimmed, type: "https" };
  }
  if (trimmed.startsWith("http://")) {
    return { url: trimmed, type: "http" };
  }
  if (trimmed.startsWith("data:")) {
    return { url: trimmed, type: "data" };
  }
  if (trimmed.startsWith("blob:")) {
    return { url: trimmed, type: "blob" };
  }

  // Fallback
  if (trimmed.length > 0) {
    return { url: trimmed, type: "local" };
  }

  return { missing: true };
}
