import { subirArchivoDirectoACloudinary } from "@/lib/cloudinary-direct";

/** JPEG que se sube a Cloudinary. El PATCH solo guarda la URL. */
const IMAGE_JPEG_TARGET_CHARS = 35 * 1024;

export const ESTATUS_MEDIA_TOO_LARGE =
  "No se pudo subir el archivo. Si es un PDF, el preset de Cloudinary tiene que aceptar PDF.";

export function isRemoteMediaUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("indexeddb:")) return false;
  return /^https?:\/\//i.test(trimmed) || trimmed.startsWith("/");
}

function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return new Blob([dataUrl]);
  const meta = dataUrl.slice(5, comma);
  const mime = meta.replace(";base64", "") || "application/octet-stream";
  const payload = dataUrl.slice(comma + 1);
  if (meta.includes(";base64")) {
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }
  return new Blob([decodeURIComponent(payload)], { type: mime });
}

function compressImageDataUrl(dataUrl: string): Promise<string> {
  if (typeof document === "undefined") return Promise.resolve(dataUrl);
  if (dataUrl.startsWith("data:image/jpeg") && dataUrl.length <= IMAGE_JPEG_TARGET_CHARS) {
    return Promise.resolve(dataUrl);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width || 1;
        let height = img.naturalHeight || img.height || 1;
        const maxWidth = 1600;
        if (width > maxWidth) {
          height = Math.max(1, Math.round((height * maxWidth) / width));
          width = maxWidth;
        }
        const canvas = document.createElement("canvas");
        const paint = (w: number, h: number, quality: number) => {
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) return "";
          ctx.drawImage(img, 0, 0, w, h);
          return canvas.toDataURL("image/jpeg", quality);
        };
        let quality = 0.82;
        let jpeg = paint(width, height, quality);
        for (let attempt = 0; attempt < 8 && jpeg.length > IMAGE_JPEG_TARGET_CHARS && quality > 0.45; attempt += 1) {
          quality -= 0.07;
          jpeg = paint(width, height, quality);
        }
        if (jpeg.length > IMAGE_JPEG_TARGET_CHARS && width > 960) {
          const nextWidth = 960;
          const nextHeight = Math.max(1, Math.round((height * nextWidth) / width));
          jpeg = paint(nextWidth, nextHeight, 0.62);
        }
        resolve(jpeg && jpeg.length < dataUrl.length ? jpeg : jpeg || dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function uploadBlobToCloudinary(file: File): Promise<string> {
  const uploaded = await subirArchivoDirectoACloudinary(file, "kuche/seguimiento-publico");
  const url = uploaded.secureUrl?.trim();
  if (!url || !isRemoteMediaUrl(url)) {
    throw new Error("Cloudinary no devolvió una URL del archivo.");
  }
  return url;
}

async function uploadDataUrl(dataUrl: string, filename: string): Promise<string> {
  const blob = dataUrlToBlob(dataUrl);
  const type = blob.type || "application/octet-stream";
  const file = new File([blob], filename || "archivo", { type });
  return uploadBlobToCloudinary(file);
}

function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      let width = img.naturalWidth || img.width || 1;
      let height = img.naturalHeight || img.height || 1;
      const maxWidth = 1600;
      if (width > maxWidth) {
        height = Math.max(1, Math.round((height * maxWidth) / width));
        width = maxWidth;
      }
      const paint = (w: number, h: number, quality: number) => {
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return "";
        ctx.drawImage(img, 0, 0, w, h);
        return canvas.toDataURL("image/jpeg", quality);
      };
      let quality = 0.82;
      let jpeg = paint(width, height, quality);
      for (let attempt = 0; attempt < 8 && jpeg.length > IMAGE_JPEG_TARGET_CHARS && quality > 0.45; attempt += 1) {
        quality -= 0.07;
        jpeg = paint(width, height, quality);
      }
      if (jpeg.length > IMAGE_JPEG_TARGET_CHARS && width > 960) {
        const nextWidth = 960;
        const nextHeight = Math.max(1, Math.round((height * nextWidth) / width));
        jpeg = paint(nextWidth, nextHeight, 0.62);
      }
      if (!jpeg) {
        reject(new Error(ESTATUS_MEDIA_TOO_LARGE));
        return;
      }
      resolve(jpeg);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(ESTATUS_MEDIA_TOO_LARGE));
    };
    img.src = objectUrl;
  });
}

function jpegName(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "") || "imagen";
  return filename.toLowerCase().endsWith(".jpg") ? filename : `${base}.jpg`;
}

/**
 * Imagen, PDF y cualquier otro archivo quedan como URL https.
 * La imagen se comprime antes de subirse. El PATCH no lleva Base64.
 */
export async function prepareFileForSeguimiento(file: File): Promise<string> {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf && file.type.startsWith("image/") && typeof document !== "undefined") {
    const compressed = await compressImageFile(file);
    return uploadDataUrl(compressed, jpegName(file.name));
  }
  return uploadBlobToCloudinary(file);
}

/** URL remota se conserva. Un data URL se sube y se sustituye por su URL. */
export async function compactMediaForEstatus(value: string, filename: string): Promise<string> {
  const raw = value.trim();
  if (!raw || isRemoteMediaUrl(raw) || raw.startsWith("indexeddb:")) return raw;
  if (!raw.startsWith("data:")) return raw;

  if (raw.startsWith("data:image/")) {
    const compressed = await compressImageDataUrl(raw);
    return uploadDataUrl(compressed, jpegName(filename));
  }

  return uploadDataUrl(raw, filename || "documento.pdf");
}

async function slimArchivo(item: unknown, index: number): Promise<unknown> {
  if (!item || typeof item !== "object") return item;
  const row = { ...(item as Record<string, unknown>) };
  const name = String(row.nombre ?? row.name ?? `archivo-${index + 1}`);
  const url = typeof row.url === "string" ? row.url.trim() : "";
  const src = typeof row.src === "string" ? row.src.trim() : "";
  const remote = [url, src].find((candidate) => isRemoteMediaUrl(candidate));
  if (remote) {
    row.url = remote;
    row.src = remote;
    return row;
  }
  const raw = src || url;
  if (!raw || raw.startsWith("indexeddb:")) return row;
  const slim = await compactMediaForEstatus(raw, name);
  if (slim.startsWith("data:")) {
    throw new Error(ESTATUS_MEDIA_TOO_LARGE);
  }
  row.url = slim;
  row.src = slim;
  return row;
}

async function slimReceipt(value: unknown, filename: string): Promise<string> {
  if (typeof value !== "string" || !value.trim()) return typeof value === "string" ? value : "";
  return compactMediaForEstatus(value, filename);
}

/** Quita Base64 gigante de `archivos` y comprobantes antes del PATCH. */
export async function slimEstatusPublicoPayload(
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const next: Record<string, unknown> = { ...data };

  if (Array.isArray(data.archivos)) {
    next.archivos = await Promise.all(data.archivos.map((item, index) => slimArchivo(item, index)));
  }

  if (data.pagos && typeof data.pagos === "object" && !Array.isArray(data.pagos)) {
    const pagos = { ...(data.pagos as Record<string, unknown>) };
    for (const key of ["anticipo", "segundoPago", "liquidacion"] as const) {
      const row = pagos[key];
      if (!row || typeof row !== "object") continue;
      const pago = { ...(row as Record<string, unknown>) };
      pago.receiptImage = await slimReceipt(pago.receiptImage, `comprobante-${key}.jpg`);
      pagos[key] = pago;
    }
    next.pagos = pagos;
  }

  return next;
}
