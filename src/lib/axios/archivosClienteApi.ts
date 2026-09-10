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

export interface SubirArchivoClienteOpciones {
  tareasId?: string;
  relacionadoA?: "tarea" | "proyecto";
  relacionadoId?: string;
  nivel?: "preliminar" | "final";
}

export const subirArchivoCliente = async (
  file: File,
  clienteId: string,
  tipo: string,
  opciones: SubirArchivoClienteOpciones = {},
): Promise<ApiResponse<ClienteArchivo>> => {
  const normalizedClienteId = clienteId.trim();
  if (!normalizedClienteId) {
    return { success: false, message: "Falta el identificador del cliente para subir el archivo." };
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("tipo", tipo);
  formData.append("clienteId", normalizedClienteId);
  if (opciones.tareasId) formData.append("tareasId", opciones.tareasId);
  if (opciones.relacionadoA) formData.append("relacionadoA", opciones.relacionadoA);
  if (opciones.relacionadoId) formData.append("relacionadoId", opciones.relacionadoId);
  if (opciones.nivel) formData.append("nivel", opciones.nivel);

  try {
    const response = await axiosInstance.post<ApiResponse<ClienteArchivo> & { archivo?: ClienteArchivo }>(
      "/api/archivos/upload",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } } as never,
    );
    const payload = response.data;
    if (!payload.success) return payload;

    const archivo = (payload as { archivo?: ClienteArchivo }).archivo ?? (payload as { data?: ClienteArchivo }).data;
    if (!archivo) {
      return { success: false, message: payload.message || "El backend no devolvió el archivo subido." };
    }
    return { success: true, message: payload.message, data: archivo };
  } catch (error) {
    const axiosError = error as { response?: { data?: { message?: string } } };
    return {
      success: false,
      message:
        axiosError.response?.data?.message ||
        (error instanceof Error ? error.message : "No se pudo subir el archivo."),
    };
  }
};
