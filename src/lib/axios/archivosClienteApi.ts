

import axiosInstance, { ApiResponse } from './axiosConfig';



export interface ClienteArchivo {
  _id: string;
  clienteId: string;
  tareasId?: string;
  tipo: 'levantamiento_detallado' | 'diseno' | 'cotizacion_formal' | 'hoja_taller' | 
        'recibo_1' | 'recibo_2' | 'recibo_3' | 'contrato' | 'fotos_proyecto' | string;
  nombre: string;
  url: string;
  key: string;
  provider: 'cloudinary' | 'dropbox' | 'local' | string;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
}

export interface PanelArchivosResponse {
  success: boolean;
  message: string;
  data: {
    total: number;
    porTipo: Record<string, ClienteArchivo[]>;
    archivos: ClienteArchivo[];
  };
}

const normalizeArchivosData = (data: unknown): ClienteArchivo[] => {
  if (Array.isArray(data)) {
    return data as ClienteArchivo[];
  }

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.archivos)) {
      return record.archivos as ClienteArchivo[];
    }
  }

  return [];
};

/* ========================================================================
   API FUNCTIONS
   ======================================================================== */

/**
 * Obtener todos los archivos de un cliente
 * @param clienteId - Código del cliente (6 chars)
 * @param tipo - Filtro opcional por tipo
 * @returns Promise con array de ClienteArchivo
 */
export const obtenerArchivosCliente = async (
  clienteId: string,
  tipo?: string
): Promise<ApiResponse<ClienteArchivo[]>> => {
  const url = tipo
    ? `/api/archivos/cliente/${clienteId}/tipo/${tipo}`
    : `/api/archivos/cliente/${clienteId}`;
  
  const response = await axiosInstance.get<ApiResponse<ClienteArchivo[]>>(url);
  const payload = response.data;
  if (!payload.success) return payload;

  return {
    ...payload,
    data: normalizeArchivosData(payload.data),
  };
};

/**
 * Obtener archivos de una tarea específica
 * @param tareaId - ID de la tarea
 * @returns Promise con array de ClienteArchivo
 */
export const obtenerArchivosTarea = async (
  tareaId: string
): Promise<ApiResponse<ClienteArchivo[]>> => {
  const response = await axiosInstance.get<ApiResponse<ClienteArchivo[]>>(
    `/api/archivos/tarea/${tareaId}`
  );
  const payload = response.data;
  if (!payload.success) return payload;

  return {
    ...payload,
    data: normalizeArchivosData(payload.data),
  };
};

/**
 * Obtener panel de archivos del cliente (agrupado por tipo)
 * @param codigoCliente - Código del cliente
 * @returns Promise con archivos agrupados por tipo
 */
export const obtenerPanelArchivos = async (
  codigoCliente: string
): Promise<ApiResponse<PanelArchivosResponse['data']>> => {
  const response = await axiosInstance.get<ApiResponse<PanelArchivosResponse['data']>>(
    `/api/archivos/panel/${codigoCliente}`
  );
  return response.data;
};

/**
 * Eliminar archivo por ID
 * @param archivoId - ID del documento ClienteArchivo
 * @returns Promise con respuesta de éxito
 */
export const eliminarArchivo = async (
  archivoId: string
): Promise<ApiResponse<null>> => {
  const response = await axiosInstance.delete<ApiResponse<null>>(
    `/api/archivos/${archivoId}`
  );
  return response.data;
};

/**
 * Eliminar múltiples archivos por ID
 * @param archivoIds - Array de IDs de documentos ClienteArchivo
 * @returns Promise con respuesta de éxito
 */
export const eliminarArchivosLote = async (
  archivoIds: string[]
): Promise<ApiResponse<{ eliminados: number }>> => {
  const response = await axiosInstance.post<ApiResponse<{ eliminados: number }>>(
    `/api/archivos/eliminar-lote`,
    { ids: archivoIds }
  );
  return response.data;
};
