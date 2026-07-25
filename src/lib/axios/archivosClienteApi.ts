import axiosInstance, { type ApiResponse } from "./axiosConfig";

export interface ClienteArchivo {
  _id: string;
  clienteId: string;
  tareasId?: string;
  tipo:
    | "levantamiento_detallado"
    | "diseno"
    | "cotizacion_formal"
    | "hoja_taller"
    | "recibo_1"
    | "recibo_2"
    | "recibo_3"
    | "contrato"
    | "fotos_proyecto"
    | string;
  nombre: string;
  url: string;
  key?: string;
  provider?: "cloudinary" | "dropbox" | "local" | string;
  mimeType?: string;
  createdAt?: string;
  updatedAt?: string;
}

const normalizeArchivosData = (data: unknown): ClienteArchivo[] => {
  if (Array.isArray(data)) {
    return data as ClienteArchivo[];
  }

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.archivos)) {
      return record.archivos as ClienteArchivo[];
    }
  }

  return [];
};

const publicRequestConfig = {
  skipAuthToken: true,
  skipAuthRedirect: true,
  skipNotFoundLog: true,
} as const;

export const obtenerArchivosCliente = async (
  clienteId: string,
  tipo?: string,
): Promise<ApiResponse<ClienteArchivo[]>> => {
  const normalizedId = clienteId.trim();
  if (!normalizedId) {
    return {
      success: true,
      data: [],
      message: "Cliente sin identificador; se omite consulta de archivos.",
    };
  }

  const url = tipo
    ? `/api/archivos/cliente/${encodeURIComponent(normalizedId)}/tipo/${encodeURIComponent(tipo)}`
    : `/api/archivos/cliente/${encodeURIComponent(normalizedId)}`;

  const response = await axiosInstance.get<ApiResponse<ClienteArchivo[]>>(url, publicRequestConfig as never);
  const payload = response.data;
  if (!payload.success) return payload;

  return {
    ...payload,
    data: normalizeArchivosData(payload.data),
  };
};
