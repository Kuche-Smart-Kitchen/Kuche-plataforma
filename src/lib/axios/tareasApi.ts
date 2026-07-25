import axiosInstance, { type ApiResponse } from "./axiosConfig";

export type EtapaTarea = "citas" | "disenos" | "cotizacion" | "contrato";

export const cambiarEtapa = async (
  id: string,
  etapa: EtapaTarea,
): Promise<ApiResponse<Record<string, unknown>>> => {
  const response = await axiosInstance.put<ApiResponse<Record<string, unknown>>>(`/api/tareas/${id}/etapa`, {
    etapa,
  });
  return response.data;
};

export const asignarTrabajadoresTarea = async (
  id: string,
  asignadoA: string[] | string,
): Promise<ApiResponse<Record<string, unknown>>> => {
  const response = await axiosInstance.put<ApiResponse<Record<string, unknown>>>(
    `/api/tareas/${id}/asignar-trabajadores`,
    { asignadoA },
  );
  return response.data;
};

export const actualizarTarea = async (
  id: string,
  data: Record<string, unknown>,
): Promise<ApiResponse<Record<string, unknown>>> => {
  const response = await axiosInstance.patch<ApiResponse<Record<string, unknown>>>(`/api/tareas/${id}`, data);
  return response.data;
};