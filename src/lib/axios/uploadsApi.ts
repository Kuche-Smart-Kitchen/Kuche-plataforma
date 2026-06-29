import axiosInstance from "./axiosConfig";

const DEFAULT_UPLOAD_ENDPOINT =
  process.env.NODE_ENV === "production"
    ? "https://backend-cocinas-inteligentes.vercel.app/api/archivos/upload"
    : "/api/archivos/upload";

export type UploadRelacionadoA = "tarea" | "proyecto" | "cotizacion" | "cliente";

export type UploadTipo =
  | "levantamiento_detallado"
  | "diseno"
  | "diseno_preliminar"
  | "diseno_final"
  | "render"
  | "modelo_3d"
  | "sketchup"
  | "cotizacion_formal"
  | "hoja_taller"
  | "recibo_1"
  | "recibo_2"
  | "recibo_3"
  | "recibo"
  | "recibo1"
  | "recibo2"
  | "recibo3"
  | "contrato"
  | "fotos_proyecto"
  | "foto_proyecto"
  | "fotosproyecto"
  | "otro";

export type UploadResponseInfo = {
  _id?: string;
  id?: string;
  nombre?: string;
  tipo?: string;
  url: string;
  key?: string;
  provider?: string;
  mimeType?: string;
  relacionadoA?: UploadRelacionadoA;
  relacionadoId?: string;
  clienteId?: string;
  tareasId?: string;
  createdAt?: string;
  warning?: string;
};

const readUploadEndpoint = () => {
  const value = process.env.NEXT_PUBLIC_FILE_UPLOAD_ENDPOINT;
  if (!value || value.trim().length === 0) return DEFAULT_UPLOAD_ENDPOINT;
  return value.trim();
};

const extractUrlFromUploadResponse = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;

  const directUrl = record.url;
  if (typeof directUrl === "string" && directUrl.trim().length > 0) {
    return directUrl.trim();
  }

  const data = record.data;
  if (data && typeof data === "object") {
    const dataRecord = data as Record<string, unknown>;
    const nestedUrl = dataRecord.url;
    if (typeof nestedUrl === "string" && nestedUrl.trim().length > 0) {
      return nestedUrl.trim();
    }

    const archivoUrl = dataRecord.archivoUrl;
    if (typeof archivoUrl === "string" && archivoUrl.trim().length > 0) {
      return archivoUrl.trim();
    }

    const fileUrl = dataRecord.fileUrl;
    if (typeof fileUrl === "string" && fileUrl.trim().length > 0) {
      return fileUrl.trim();
    }
  }

  const archivoUrl = record.archivoUrl;
  if (typeof archivoUrl === "string" && archivoUrl.trim().length > 0) {
    return archivoUrl.trim();
  }

  const fileUrl = record.fileUrl;
  if (typeof fileUrl === "string" && fileUrl.trim().length > 0) {
    return fileUrl.trim();
  }

  return null;
};

const extractUploadInfo = (payload: unknown): UploadResponseInfo | null => {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  const data = record.data && typeof record.data === "object" ? (record.data as Record<string, unknown>) : record;

  const url = extractUrlFromUploadResponse(payload);
  if (!url) return null;

  return {
    _id: typeof data._id === "string" ? data._id : undefined,
    id: typeof data.id === "string" ? data.id : undefined,
    nombre: typeof data.nombre === "string" ? data.nombre : undefined,
    tipo: typeof data.tipo === "string" ? data.tipo : undefined,
    url,
    key: typeof data.key === "string" ? data.key : undefined,
    provider: typeof data.provider === "string" ? data.provider : undefined,
    mimeType: typeof data.mimeType === "string" ? data.mimeType : undefined,
    relacionadoA: data.relacionadoA === "tarea" || data.relacionadoA === "proyecto" || data.relacionadoA === "cotizacion"
      || data.relacionadoA === "cliente"
      ? data.relacionadoA
      : undefined,
    relacionadoId: typeof data.relacionadoId === "string" ? data.relacionadoId : undefined,
    clienteId: typeof data.clienteId === "string" ? data.clienteId : undefined,
    tareasId: typeof data.tareasId === "string" ? data.tareasId : undefined,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : undefined,
    warning: typeof record.warning === "string" ? record.warning : typeof data.warning === "string" ? data.warning : undefined,
  };
};

const dataUrlToFile = (dataUrl: string, filename: string): File => {
  const [header, base64] = dataUrl.split(",");
  const mimeTypeMatch = header?.match(/data:([^;]+);base64/);
  const mimeType = mimeTypeMatch?.[1] ?? "application/octet-stream";
  const binary = atob(base64 ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new File([bytes], filename, { type: mimeType });
};

type UploadFileMetadata = {
  tipo?: UploadTipo;
  nivel?: "preliminar" | "final";
  relacionadoA?: UploadRelacionadoA;
  relacionadoId?: string;
  clienteId?: string;
  tareasId?: string;
};

export const subirArchivoConMetadata = async (
  file: File,
  metadata: UploadFileMetadata = {},
): Promise<UploadResponseInfo> => {
  const endpoint = readUploadEndpoint();
  const formData = new FormData();
  formData.append("file", file);

  if (metadata.tipo) formData.append("tipo", metadata.tipo);
  if (metadata.nivel) formData.append("nivel", metadata.nivel);
  if (metadata.relacionadoA) formData.append("relacionadoA", metadata.relacionadoA);
  if (metadata.relacionadoId) formData.append("relacionadoId", metadata.relacionadoId);
  if (metadata.clienteId) formData.append("clienteId", metadata.clienteId);
  if (metadata.tareasId) formData.append("tareasId", metadata.tareasId);

  try {
    const response = await axiosInstance.post(endpoint, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    const uploadInfo = extractUploadInfo(response.data);
    if (!uploadInfo) {
      console.error("respuesta sin URL:", response.data);
      throw new Error(
        "El backend de upload no devolvio una URL valida.",
      );
    }

    return uploadInfo;
  } catch (error) {
    const maybeAxios = error as { response?: { status?: number } };
    if (maybeAxios.response?.status === 404) {
      throw new Error(
        `Endpoint de upload no encontrado (${endpoint}). Configura NEXT_PUBLIC_FILE_UPLOAD_ENDPOINT con la ruta real del backend y reinicia el frontend.`,
      );
    }
    throw error;
  }
};

export const subirPdfGeneradoConMetadata = async (
  dataUrl: string,
  filename: string,
  metadata: UploadFileMetadata = {},
): Promise<UploadResponseInfo> => {
  const file = dataUrlToFile(dataUrl, filename);
  return subirArchivoConMetadata(file, metadata);
};

export const subirArchivoYObtenerUrl = async (file: File): Promise<string> => {
  const uploadInfo = await subirArchivoConMetadata(file);
  return uploadInfo.url;
};

/**
 * Subir múltiples archivos con metadata común
 * Útil para fotos_proyecto y otros tipos multi-archivo
 * @param files - Array de archivos
 * @param metadata - Metadata compartida para todos
 * @returns Promise con array de UploadResponseInfo
 */
export const subirMultiplesArchivosConMetadata = async (
  files: File[],
  metadata: UploadFileMetadata = {},
): Promise<UploadResponseInfo[]> => {
  const endpoint = readUploadEndpoint();
  const uploadPromises = files.map(async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    if (metadata.tipo) formData.append("tipo", metadata.tipo);
    if (metadata.nivel) formData.append("nivel", metadata.nivel);
    if (metadata.relacionadoA) formData.append("relacionadoA", metadata.relacionadoA);
    if (metadata.relacionadoId) formData.append("relacionadoId", metadata.relacionadoId);
    if (metadata.clienteId) formData.append("clienteId", metadata.clienteId);
    if (metadata.tareasId) formData.append("tareasId", metadata.tareasId);

    try {
      const response = await axiosInstance.post(endpoint, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const uploadInfo = extractUploadInfo(response.data);
      if (!uploadInfo) {
        console.error("[subirMultiplesArchivosConMetadata] respuesta sin URL para:", file.name, response.data);
        throw new Error(
          `No se pudo procesar el upload de ${file.name}. El backend no devolvio una URL valida.`,
        );
      }

      return uploadInfo;
    } catch (error) {
      const maybeAxios = error as { response?: { status?: number } };
      if (maybeAxios.response?.status === 404) {
        throw new Error(
          `Endpoint de upload no encontrado (${endpoint}). Configura NEXT_PUBLIC_FILE_UPLOAD_ENDPOINT con la ruta real del backend.`,
        );
      }
      throw error;
    }
  });

  return Promise.all(uploadPromises);
};
