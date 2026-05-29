export const SEGUIMIENTO_MEDIA_UNAVAILABLE_MSG = "Archivo no disponible";

export async function resolveSeguimientoMediaRefForUi(
  ref: string
): Promise<{ url: string } | { missing: true }> {
  if (!ref || typeof ref !== "string") {
    return { missing: true };
  }

  if (ref.startsWith("http://") || ref.startsWith("https://") || ref.startsWith("data:")) {
    return { url: ref };
  }

  return { missing: true };
}

export function isPdfDataUrl(url: string): boolean {
  return url.startsWith("data:application/pdf");
}

export async function openPdfDataUrlOrUrlInNewTab(url: string): Promise<void> {
  window.open(url, "_blank");
}
