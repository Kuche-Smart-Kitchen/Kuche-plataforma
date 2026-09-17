import { env } from "@/lib/env";

export interface CloudinaryDirectUploadResult {
  secureUrl: string;
  publicId: string;
  resourceType: string;
  format?: string;
  bytes: number;
  originalFilename?: string;
}

/** Sube un archivo directo del navegador a Cloudinary (unsigned preset), sin pasar por el backend/proxy. */
export async function subirArchivoDirectoACloudinary(
  file: File,
  folder = "kuche/archivos-cliente",
): Promise<CloudinaryDirectUploadResult> {
  const cloudName = env.cloudinaryCloudName;
  const uploadPreset = env.cloudinaryUploadPreset;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  if (folder) formData.append("folder", folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    const message = (data as { error?: { message?: string } } | null)?.error?.message;
    throw new Error(message || "No se pudo subir el archivo a Cloudinary.");
  }

  return {
    secureUrl: data.secure_url,
    publicId: data.public_id,
    resourceType: data.resource_type,
    format: data.format,
    bytes: data.bytes,
    originalFilename: data.original_filename,
  };
}
