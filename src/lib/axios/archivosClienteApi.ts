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
  nivel?: "preliminar" | "final";
  createdAt?: string;
  updatedAt?: string;
}

const normalizeClienteArchivo = (value: unknown): ClienteArchivo | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const url = String(record.url ?? record.secureUrl ?? record.sharedUrl ?? record.link ?? "").trim();
  if (!url) return null;

  return {
    _id: String(record._id ?? record.id ?? record.publicId ?? record.pathLower ?? url),
    clienteId: String(record.clienteId ?? record.clientId ?? ""),
    tareasId: String(record.tareasId ?? record.tareaId ?? record.taskId ?? "") || undefined,
    tipo: String(record.tipo ?? record.type ?? "otro"),
    nombre: String(record.nombre ?? record.name ?? record.fileName ?? "Archivo"),
    url,
    key: String(record.key ?? record.pathLower ?? record.path ?? "") || undefined,
    provider: String(record.provider ?? "") || undefined,
    mimeType: String(record.mimeType ?? record.mimetype ?? "") || undefined,
    nivel: record.nivel === "final" || record.level === "final"
      ? "final"
      : record.nivel === "preliminar" || record.level === "preliminar"
        ? "preliminar"
        : undefined,
    createdAt: String(record.createdAt ?? "") || undefined,
    updatedAt: String(record.updatedAt ?? "") || undefined,
  };
};

const normalizeArchivosData = (data: unknown, depth = 0): ClienteArchivo[] => {
  if (depth > 4) return [];
  if (Array.isArray(data)) {
    return data.map(normalizeClienteArchivo).filter((file): file is ClienteArchivo => file !== null);
  }
  if (!data || typeof data !== "object") return [];

  const record = data as Record<string, unknown>;
  const directFile = normalizeClienteArchivo(record.archivo ?? record.file ?? record);
  if (directFile) return [directFile];

  for (const key of ["archivos", "files", "items", "result", "results", "data"]) {
    const normalized = normalizeArchivosData(record[key], depth + 1);
    if (normalized.length > 0) return normalized;
  }
  return [];
};

const readRequestConfig = {
  skipAuthRedirect: true,
  skipNotFoundLog: true,
} as const;

const obtenerArchivosDesdeRutas = async (paths: string[]): Promise<ApiResponse<ClienteArchivo[]>> => {
  let lastMessage = "No se pudieron cargar los archivos";
  let receivedSuccessfulResponse = false;
  for (const path of paths) {
    try {
      const response = await axiosInstance.get<ApiResponse<ClienteArchivo[]>>(path, readRequestConfig as never);
      const payload = response.data;
      if (!payload.success) {
        lastMessage = payload.message || lastMessage;
        continue;
      }
      receivedSuccessfulResponse = true;
      const files = normalizeArchivosData(payload);
      if (files.length > 0) return { success: true, message: payload.message || "Archivos cargados", data: files };
    } catch (error) {
      const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
      lastMessage = axiosError.response?.data?.message || (error instanceof Error ? error.message : lastMessage);
      if (axiosError.response?.status && axiosError.response.status !== 404) break;
    }
  }
  if (receivedSuccessfulResponse) return { success: true, data: [], message: "No hay archivos registrados." };
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

export interface SubirDisenoDropboxOpciones {
  tareaId: string;
  clienteId: string;
  nivel: "preliminar" | "final";
}

/** Sube diseños al backend, que los almacena en Dropbox y registra su relación con tarea/cliente. */
export const subirDisenoDropbox = async (
  file: File,
  opciones: SubirDisenoDropboxOpciones,
): Promise<ApiResponse<ClienteArchivo>> => {
  const tareaId = opciones.tareaId.trim();
  const clienteId = opciones.clienteId.trim();
  if (!tareaId || !clienteId) {
    return { success: false, message: "Falta el ID de tarea o cliente para registrar el diseño." };
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("clienteId", clienteId);
  formData.append("tipo", "diseno");
  formData.append("nivel", opciones.nivel);

  try {
    const response = await axiosInstance.post<ApiResponse<Record<string, unknown>>>(
      `/api/tareas/${encodeURIComponent(tareaId)}/archivos/dropbox`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    if (!response.data.success) return response.data;

    const payload = response.data.data;
    const archivo = payload.archivo && typeof payload.archivo === "object"
      ? payload.archivo as Record<string, unknown>
      : payload.file && typeof payload.file === "object"
        ? payload.file as Record<string, unknown>
        : payload;
    const url = String(archivo.url ?? archivo.sharedUrl ?? archivo.link ?? "");
    if (!url) {
      return { success: false, message: "Dropbox guardó el diseño, pero backend no devolvió un enlace del archivo." };
    }

    return {
      success: true,
      message: response.data.message,
      data: {
        _id: String(archivo._id ?? archivo.id ?? archivo.pathLower ?? url),
        clienteId,
        tareasId: tareaId,
        tipo: "diseno",
        nombre: String(archivo.nombre ?? archivo.name ?? file.name),
        url,
        key: String(archivo.key ?? archivo.pathLower ?? archivo.path ?? ""),
        provider: "dropbox",
        mimeType: String(archivo.mimeType ?? file.type),
        nivel: opciones.nivel,
        createdAt: typeof archivo.createdAt === "string" ? archivo.createdAt : undefined,
      },
    };
  } catch (error) {
    const requestError = error as { response?: { data?: { message?: string } }; message?: string };
    return {
      success: false,
      message: requestError.response?.data?.message || requestError.message || "No se pudo subir el diseño a Dropbox.",
    };
  }
};

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
      nivel: opciones.nivel,
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
        nivel: opciones.nivel,
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
