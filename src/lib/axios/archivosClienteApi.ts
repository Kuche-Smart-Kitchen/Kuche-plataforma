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
    const candidates = [record.archivos, record.files, record.result, record.results, record.data];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate as ClienteArchivo[];
      }
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

  try {
    const response = await axiosInstance.get<ApiResponse<ClienteArchivo[]>>(url, publicRequestConfig as never);
    const payload = response.data;
    const normalizedData = normalizeArchivosData((payload as { data?: unknown }).data ?? payload);

    if (!payload.success) {
      return payload as ApiResponse<ClienteArchivo[]>;
    }

    return {
      success: true,
      message: payload.message || "Archivos cargados",
      data: normalizedData,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "No se pudieron cargar los archivos del cliente",
    };
  }
};
