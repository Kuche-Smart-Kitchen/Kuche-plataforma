import axiosInstance, { type ApiResponse } from "./axiosConfig";

export type EtapaTarea = "citas" | "disenos" | "cotizacion" | "contrato";

export const cambiarEtapa = async (
  id: string,
  etapa: EtapaTarea,
): Promise<ApiResponse<Record<string, unknown>>> => {
  const response = await axiosInstance.patch<ApiResponse<Record<string, unknown>>>(
    `/api/tareas/${id}/etapa`,
    { etapa },
  );
  return response.data;
};

export const asignarTrabajadoresTarea = async (
  id: string,
  asignadoA: string[] | string,
): Promise<ApiResponse<Record<string, unknown>>> => {
  const assigned = Array.isArray(asignadoA) ? asignadoA : [asignadoA];
  if (assigned.length === 0 || assigned.some((value) => !value.trim())) {
    throw new Error("La tarea debe tener al menos un trabajador asignado");
  }
  const response = await axiosInstance.patch<ApiResponse<Record<string, unknown>>>(
    `/api/tareas/${id}/asignar-trabajadores`,
    { asignadoA: assigned },
  );
  return response.data;
};

export const actualizarTarea = async (
  id: string,
  data: Record<string, unknown>,
): Promise<ApiResponse<Record<string, unknown>>> => {
  if (Object.keys(data).length === 0) {
    throw new Error("Debe enviarse al menos un campo para actualizar la tarea");
  }
  const response = await axiosInstance.patch<ApiResponse<Record<string, unknown>>>(
    `/api/tareas/${id}`,
    data,
  );
  return response.data;
};

export const crearTarea = async (
  data: Record<string, unknown>,
): Promise<ApiResponse<Record<string, unknown>>> => {
  const response = await axiosInstance.post<ApiResponse<Record<string, unknown>>>("/api/tareas", data);
  return response.data;
};

export interface ArchivoExternoPayload {
  nombre: string;
  url: string;
  tipo?: string;
  key?: string;
  provider?: "cloudinary" | "dropbox" | "local" | string;
  mimeType?: string;
  clienteId?: string;
}

/** Registra en la tarea archivo(s) ya subidos externamente (p. ej. directo a Cloudinary desde el navegador). */
export const agregarArchivosTarea = async (
  id: string,
  archivos: ArchivoExternoPayload[],
): Promise<ApiResponse<Record<string, unknown>>> => {
  if (archivos.length === 0) {
    throw new Error("Debe enviarse al menos un archivo");
  }
  const response = await axiosInstance.post<ApiResponse<Record<string, unknown>>>(
    `/api/tareas/${id}/archivos`,
    { archivos },
  );
  return response.data;
};