import axios from "axios";
import axiosInstance, { type ApiResponse } from "./axiosConfig";
import { agregarArchivosTarea } from "./tareasApi";
import { subirArchivoDirectoACloudinary } from "@/lib/cloudinary-direct";

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
        return candidate
          .map((value) => {
            if (!value || typeof value !== "object") return null;
            const record = value as Record<string, unknown>;
            const id = String(record._id ?? record.id ?? record.publicId ?? "");
            const url = String(record.url ?? record.secureUrl ?? "");
            if (!url) return null;
            return {
              ...record,
              _id: id || url,
              nombre: String(record.nombre ?? record.name ?? "Archivo"),
              url,
              clienteId: String(record.clienteId ?? ""),
              tipo: String(record.tipo ?? "otro"),
            } as ClienteArchivo;
          })
          .filter((value): value is ClienteArchivo => value !== null);
      }
    }
  }

  return [];
};

const readRequestConfig = {
  skipAuthRedirect: true,
  skipNotFoundLog: true,
} as const;

const obtenerArchivosDesdeRutas = async (paths: string[]): Promise<ApiResponse<ClienteArchivo[]>> => {
  let lastMessage = "No se pudieron cargar los archivos";
  for (const path of paths) {
    try {
      const response = await axiosInstance.get<ApiResponse<ClienteArchivo[]>>(path, readRequestConfig as never);
      const payload = response.data;
      if (!payload.success) {
        lastMessage = payload.message || lastMessage;
        continue;
      }
      return {
        success: true,
        message: payload.message || "Archivos cargados",
        data: normalizeArchivosData(payload),
      };
    } catch (error) {
      const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
      lastMessage = axiosError.response?.data?.message || (error instanceof Error ? error.message : lastMessage);
      if (axiosError.response?.status && axiosError.response.status !== 404) break;
    }
  }
  return { success: false, message: lastMessage };
};

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

  const encodedId = encodeURIComponent(normalizedId);
  const suffix = tipo ? `/tipo/${encodeURIComponent(tipo)}` : "";
  return obtenerArchivosDesdeRutas([
    `/api/archivos/cliente/${encodedId}${suffix}`,
    `/api/archivos/clientes/${encodedId}${suffix}`,
  ]);
};

export const obtenerArchivosTarea = async (tareaId: string): Promise<ApiResponse<ClienteArchivo[]>> => {
  const normalizedId = tareaId.trim();
  if (!normalizedId) return { success: true, data: [], message: "Tarea sin identificador" };
  return obtenerArchivosDesdeRutas([`/api/archivos/tarea/${encodeURIComponent(normalizedId)}`]);
};

export const obtenerArchivosPanel = async (codigo: string): Promise<ApiResponse<ClienteArchivo[]>> => {
  const normalizedCode = codigo.trim();
  if (!normalizedCode) return { success: true, data: [], message: "Proyecto sin código" };
  return obtenerArchivosDesdeRutas([`/api/archivos/panel/${encodeURIComponent(normalizedCode)}`]);
};

export interface SubirArchivoClienteOpciones {
  tareasId?: string;
  relacionadoA?: "tarea" | "proyecto";
  relacionadoId?: string;
  nivel?: "preliminar" | "final";
}

/**
 * Sube el archivo directo del navegador a Cloudinary (sin pasar por el backend/proxy, evitando
 * el límite de payload de la función serverless) y luego registra la URL resultante en la tarea.
 */
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

  const tareasId = opciones.tareasId?.trim();
  if (!tareasId) {
    return { success: false, message: "Falta el identificador de la tarea para registrar el archivo." };
  }

  try {
    const uploaded = await subirArchivoDirectoACloudinary(file);

    const archivo: ClienteArchivo = {
      _id: uploaded.publicId,
      clienteId: normalizedClienteId,
      tareasId,
      tipo,
      nombre: file.name,
      url: uploaded.secureUrl,
      key: `cloudinary:${uploaded.publicId}`,
      provider: "cloudinary",
      mimeType: file.type,
    };

    const registro = await agregarArchivosTarea(tareasId, [
      {
        nombre: archivo.nombre,
        url: archivo.url,
        tipo,
        key: archivo.key,
        provider: "cloudinary",
        mimeType: archivo.mimeType,
        clienteId: normalizedClienteId,
      },
    ]);

    if (!registro.success) {
      return {
        success: false,
        message: registro.message || "El archivo se subió a Cloudinary, pero no se pudo registrar en la tarea.",
      };
    }

    return { success: true, message: registro.message, data: archivo };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 413) {
      return {
        success: false,
        message: "El archivo es demasiado grande para registrarse en el servidor.",
      };
    }
    const axiosError = error as { response?: { data?: { message?: string } } };
    return {
      success: false,
      message:
        axiosError.response?.data?.message ||
        (error instanceof Error ? error.message : "No se pudo subir el archivo."),
    };
  }
};
